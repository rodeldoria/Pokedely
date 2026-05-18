import Phaser from 'phaser';
import { TILE, TILE_SIZE, generateMap, isSolid, isTallGrass } from '../game/world.js';
import { pickRandom } from '../data/pokedex.js';
import { load, save, recordEncounter } from '../game/save.js';

// The overworld. Player walks on a grid using arrow keys / WASD. Stepping on
// tall grass tiles rolls for a wild encounter, which hands control to the
// EncounterScene.

export default class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init() {
    this.state = load();
    this.encounterCooldown = 0;
    this.lastTile = null;
  }

  create() {
    const { map, width, height, features } = generateMap(48, 36, 7);
    this.mapData = map; this.mapW = width; this.mapH = height;

    // Build the tile sprites. Cheaper than a tilemap for our size.
    const tileLayer = this.add.group();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const code = map[y][x];
        // Always paint a grass base under everything to avoid black gaps.
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, 'tile-grass').setOrigin(0).setDepth(0);

        if (code === TILE.GRASS) continue;
        const key = textureFor(code);
        if (!key) continue;
        const img = this.add.image(x * TILE_SIZE, y * TILE_SIZE, key).setOrigin(0);
        img.setDepth(code === TILE.TREE ? 5 : 1);
        tileLayer.add(img);
      }
    }

    // Decorate: Poke Center building on top of a path crossroads.
    const pc = features.pokeCenter;
    this.add.image(pc.x * TILE_SIZE - 16, pc.y * TILE_SIZE - 40, 'pokecenter').setOrigin(0).setDepth(6);
    this.add.image((pc.x + 3) * TILE_SIZE, (pc.y + 1) * TILE_SIZE, 'sign').setOrigin(0).setDepth(6);

    // Player.
    const sp = features.spawn;
    this.player = this.physics.add.sprite(sp.x * TILE_SIZE + 16, sp.y * TILE_SIZE + 16, 'player-down-0');
    this.player.setDepth(10);
    this.player.body.setSize(12, 10).setOffset(4, 16);

    // Walking animations.
    for (const dir of ['down', 'up', 'left', 'right']) {
      this.anims.create({
        key: `walk-${dir}`,
        frames: [{ key: `player-${dir}-0` }, { key: `player-${dir}-1` }],
        frameRate: 6, repeat: -1
      });
    }
    this.facing = 'down';

    // Camera follow + tight bounds.
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.physics.world.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);

    // Input.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.input.keyboard.on('keydown-T', () => this.scene.launch('Team'));

    // Launch the HUD overlay.
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');

    // When EncounterScene finishes, regain camera control here.
    this.events.on('wake', () => this.input.keyboard.resetKeys());

    this.scene.bringToTop('Hud');
  }

  update(time, delta) {
    if (!this.player) return;

    const speed = 130;
    let vx = 0, vy = 0;
    const c = this.cursors, w = this.wasd;
    if (c.left.isDown  || w.A.isDown) vx = -speed;
    if (c.right.isDown || w.D.isDown) vx =  speed;
    if (c.up.isDown    || w.W.isDown) vy = -speed;
    if (c.down.isDown  || w.S.isDown) vy =  speed;

    // No diagonal advantage.
    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    this.player.setVelocity(vx, vy);

    // Resolve facing & animation.
    if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? 'left' : (vx > 0 ? 'right' : this.facing);
    else if (vy !== 0)                this.facing = vy < 0 ? 'up'   : 'down';

    if (vx !== 0 || vy !== 0) {
      if (this.player.anims.currentAnim?.key !== `walk-${this.facing}`)
        this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      this.player.setTexture(`player-${this.facing}-0`);
    }

    // Block solid tiles via manual collision (sprites are decorative).
    this.resolveCollisions();

    // Encounter check on tall grass tiles, throttled per-tile.
    this.encounterCooldown = Math.max(0, this.encounterCooldown - delta);
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    const tileKey = `${tx},${ty}`;
    if (this.lastTile !== tileKey) {
      this.lastTile = tileKey;
      this.state.trainer.steps += 1;
      if (isTallGrass(this.mapData[ty]?.[tx]) && this.encounterCooldown === 0) {
        if (Math.random() < 0.22) this.triggerEncounter();
      }
      if (this.state.trainer.steps % 5 === 0) save(this.state);
    }
  }

  resolveCollisions() {
    // Simple AABB resolution against solid tiles around the player.
    const p = this.player;
    const bx = p.x - 6, by = p.y - 5, bw = 12, bh = 10;
    const minTx = Math.floor(bx / TILE_SIZE);
    const maxTx = Math.floor((bx + bw) / TILE_SIZE);
    const minTy = Math.floor(by / TILE_SIZE);
    const maxTy = Math.floor((by + bh) / TILE_SIZE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isSolid(this.mapData[ty]?.[tx])) continue;
        // overlap deltas
        const tileLeft = tx * TILE_SIZE, tileTop = ty * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE, tileBottom = tileTop + TILE_SIZE;
        const overlapX = Math.min(bx + bw - tileLeft, tileRight - bx);
        const overlapY = Math.min(by + bh - tileTop, tileBottom - by);
        if (overlapX < overlapY) {
          if (p.x < tileLeft + TILE_SIZE / 2) p.x -= overlapX; else p.x += overlapX;
          p.body.setVelocityX(0);
        } else {
          if (p.y < tileTop + TILE_SIZE / 2) p.y -= overlapY; else p.y += overlapY;
          p.body.setVelocityY(0);
        }
      }
    }
  }

  triggerEncounter() {
    this.encounterCooldown = 1500;
    const wild = pickRandom();
    recordEncounter(this.state, wild);

    // Brief screen shake + flash for drama.
    this.cameras.main.flash(220, 255, 255, 255);
    this.cameras.main.shake(180, 0.005);

    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.scene.launch('Encounter', { wild, state: this.state });
  }
}

function textureFor(code) {
  switch (code) {
    case TILE.TALLGRASS: return 'tile-tallgrass';
    case TILE.TREE:      return 'tile-tree';
    case TILE.WATER:     return 'tile-water';
    case TILE.PATH:      return 'tile-path';
    case TILE.SAND:      return 'tile-sand';
    case TILE.FLOWER:    return 'tile-flower';
    case TILE.ROCK:      return 'tile-rock';
    default: return null;
  }
}
