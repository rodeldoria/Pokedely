import Phaser from 'phaser';
import { TILE, TILE_SIZE, generateMap, isSolid, isTallGrass } from '../game/world.js';
import { pickRandom } from '../data/pokedex.js';
import { load, save, recordEncounter, takeItem } from '../game/save.js';

// The overworld. Player walks on a grid using arrow keys / WASD. Stepping on
// tall grass tiles rolls for a wild encounter. Walking over item sprites
// picks them up. Walking onto the Poke Center door opens the InteriorScene.

export default class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init() {
    this.state = load();
    this.encounterCooldown = 0;
    this.lastTile = null;
  }

  create() {
    const { map, width, height, features } = generateMap(64, 48, 7);
    this.mapData = map; this.mapW = width; this.mapH = height;
    this.features = features;

    // Tile sprites. Always paint grass under everything so there are no gaps.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, 'tile-grass').setOrigin(0).setDepth(0);
        const code = map[y][x];
        if (code === TILE.GRASS) continue;
        const key = textureFor(code);
        if (!key) continue;
        const img = this.add.image(x * TILE_SIZE, y * TILE_SIZE, key).setOrigin(0);
        img.setDepth(code === TILE.TREE ? 5 : 1);
      }
    }

    // Poke Center building.
    const pc = features.pokeCenter;
    this.add.image(pc.x * TILE_SIZE - 16, pc.y * TILE_SIZE - 40, 'pokecenter').setOrigin(0).setDepth(6);
    // A glowing door marker so the kid sees where to walk.
    const door = features.door;
    this.doorTile = this.add.rectangle(
      door.x * TILE_SIZE + TILE_SIZE / 2,
      door.y * TILE_SIZE + TILE_SIZE / 2,
      24, 28, 0xffd54a, 0.5
    ).setDepth(6);
    this.tweens.add({ targets: this.doorTile, alpha: { from: 0.35, to: 0.75 }, yoyo: true, repeat: -1, duration: 700 });
    this.add.text(
      door.x * TILE_SIZE + TILE_SIZE / 2,
      door.y * TILE_SIZE - 10,
      '⬇ DOOR',
      { fontSize: '11px', color: '#ffd54a', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(7);

    // Signposts.
    for (const sgn of features.signs || []) {
      this.add.image(sgn.x * TILE_SIZE, sgn.y * TILE_SIZE, 'sign').setOrigin(0).setDepth(6);
      this.add.text(
        sgn.x * TILE_SIZE + 16,
        sgn.y * TILE_SIZE - 6,
        sgn.text,
        { fontSize: '10px', color: '#ffffff', backgroundColor: '#111418', padding: { x: 3, y: 1 } }
      ).setOrigin(0.5, 1).setDepth(7);
    }

    // Items on the map.
    this.itemSprites = new Map();
    for (const it of features.items) {
      const key = `${it.x},${it.y}`;
      if (this.state.worldItems[key]) continue;
      const tex = it.type === 'pokeball' ? 'pokeball' : 'berry';
      const sprite = this.add.image(
        it.x * TILE_SIZE + TILE_SIZE / 2,
        it.y * TILE_SIZE + TILE_SIZE / 2,
        tex
      ).setDepth(4).setScale(1.1);
      // Subtle bob.
      this.tweens.add({ targets: sprite, y: sprite.y - 3, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
      this.itemSprites.set(key, { sprite, item: it });
    }

    // Player.
    const sp = features.spawn;
    this.player = this.physics.add.sprite(sp.x * TILE_SIZE + 16, sp.y * TILE_SIZE + 16, 'player-down-0');
    this.player.setDepth(10);
    this.player.body.setSize(12, 8).setOffset(4, 18);

    // Walking animations.
    for (const dir of ['down', 'up', 'left', 'right']) {
      if (this.anims.exists(`walk-${dir}`)) continue;
      this.anims.create({
        key: `walk-${dir}`,
        frames: [{ key: `player-${dir}-0` }, { key: `player-${dir}-1` }],
        frameRate: 6, repeat: -1
      });
    }
    this.facing = 'down';

    // Camera.
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

    // HUD.
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    this.scene.bringToTop('Hud');

    // Coming back from a sub-scene: reload state in case inventory changed.
    this.events.on('resume', () => { this.state = load(); this.input.keyboard.resetKeys(); });
    this.events.on('wake',   () => { this.state = load(); this.input.keyboard.resetKeys(); });
    this.events.on('returned-from-center', () => {
      this.state = load();
      // Move the player a couple tiles south of the door so they don't
      // immediately re-enter the center.
      const door = this.features.door;
      this.player.setPosition((door.x + 0.5) * TILE_SIZE, (door.y + 2.2) * TILE_SIZE);
      this.facing = 'down';
      this.toast('Healed! +3 Poké Balls, +1 Berry');
    });

    // Toast text used for pickup feedback.
    this.toastText = this.add.text(this.scale.width / 2, this.scale.height - 70, '', {
      fontSize: '16px', color: '#111418', backgroundColor: '#ffd54a',
      padding: { x: 10, y: 6 }, fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);
  }

  toast(message) {
    this.toastText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1400, duration: 500 });
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
    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    this.player.setVelocity(vx, vy);

    if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? 'left' : (vx > 0 ? 'right' : this.facing);
    else if (vy !== 0)                this.facing = vy < 0 ? 'up'   : 'down';

    if (vx !== 0 || vy !== 0) {
      if (this.player.anims.currentAnim?.key !== `walk-${this.facing}`)
        this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      this.player.setTexture(`player-${this.facing}-0`);
    }

    this.resolveCollisions();
    this.checkItemPickup();
    this.checkDoor();

    // Encounter check on tall grass, throttled per-tile entry.
    this.encounterCooldown = Math.max(0, this.encounterCooldown - delta);
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor((this.player.y + 10) / TILE_SIZE);
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
    // Feet AABB: a thin rectangle at the bottom of the sprite. Width 14, height 8.
    const p = this.player;
    const bw = 14, bh = 8;
    const bx = p.x - bw / 2;
    const by = p.y + 6;
    const minTx = Math.floor(bx / TILE_SIZE);
    const maxTx = Math.floor((bx + bw - 1) / TILE_SIZE);
    const minTy = Math.floor(by / TILE_SIZE);
    const maxTy = Math.floor((by + bh - 1) / TILE_SIZE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isSolid(this.mapData[ty]?.[tx])) continue;
        const tileLeft = tx * TILE_SIZE, tileTop = ty * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE, tileBottom = tileTop + TILE_SIZE;
        // Recompute current AABB to avoid stale overlap math across multiple solids.
        const cbx = p.x - bw / 2, cby = p.y + 6;
        const overlapX = Math.min(cbx + bw - tileLeft, tileRight - cbx);
        const overlapY = Math.min(cby + bh - tileTop, tileBottom - cby);
        if (overlapX <= 0 || overlapY <= 0) continue;
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

  checkItemPickup() {
    if (this.itemSprites.size === 0) return;
    const px = this.player.x, py = this.player.y + 10;
    for (const [key, { sprite, item }] of this.itemSprites) {
      if (Phaser.Math.Distance.Between(px, py, sprite.x, sprite.y) > 24) continue;
      // Pick it up.
      takeItem(this.state, item.x, item.y, item.type);
      this.tweens.add({
        targets: sprite, y: sprite.y - 22, alpha: 0, scale: 1.5, duration: 400,
        onComplete: () => sprite.destroy()
      });
      this.itemSprites.delete(key);
      const label = item.type === 'pokeball' ? '🔴 Poké Ball' : '🍓 Berry';
      this.toast(`Found a ${label}!`);
    }
  }

  checkDoor() {
    const door = this.features.door;
    const dx = (door.x + 0.5) * TILE_SIZE - this.player.x;
    const dy = (door.y + 0.5) * TILE_SIZE - (this.player.y + 10);
    if (Math.hypot(dx, dy) < 18) {
      save(this.state);
      this.scene.pause();
      this.scene.launch('Interior');
    }
  }

  triggerEncounter() {
    this.encounterCooldown = 1500;
    const wild = pickRandom();
    recordEncounter(this.state, wild);

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
