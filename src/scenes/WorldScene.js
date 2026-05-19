import Phaser from 'phaser';
import { TILE, TILE_SIZE, generateMap, isSolid, isTallGrass } from '../game/world.js';
import { pickRandom, byId, spriteUrl } from '../data/pokedex.js';
import { load, save, recordEncounter, takeItem } from '../game/save.js';

// Decorative wild Pokemon that wander on top of the world for atmosphere.
// They aren't catchable directly — they bias the next tall-grass encounter
// toward themselves when the player is nearby.
const AMBIENT_MONS = [
  { x: 20, y: 10, id: 16  },  // Pidgey near the upper-left grass
  { x: 44, y: 14, id: 19  },  // Rattata up by the mountain
  { x: 12, y: 30, id: 10  },  // Caterpie in the flower meadow
  { x: 30, y: 23, id: 25  },  // Pikachu near the path
  { x: 50, y: 38, id: 129 },  // Magikarp by the beach
  { x: 36, y: 30, id: 13  },  // Weedle southeast
  { x: 8,  y: 18, id: 35  }   // Clefairy near the lake
];

// The overworld. Player walks on a grid using arrow keys / WASD. Stepping on
// tall grass tiles rolls for a wild encounter. Walking over item sprites
// picks them up. Walking onto the Poke Center door opens the InteriorScene.

export default class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init() {
    this.state = load();
    this.encounterCooldown = 0;
    this.lastTile = null;
    this.ambientSprites = [];
    this.biasedMon = null;
  }

  preload() {
    // Preload ambient Pokemon sprites so they appear immediately when the
    // world is drawn.
    for (const m of AMBIENT_MONS) {
      const key = `mon-${m.id}`;
      if (!this.textures.exists(key)) this.load.image(key, spriteUrl(m.id));
    }
  }

  create() {
    const { map, width, height, features } = generateMap(64, 48, 7);
    this.mapData = map; this.mapW = width; this.mapH = height;
    this.features = features;

    // Tile sprites. Always paint a (varied) grass base under everything so
    // there are no gaps. Pick a deterministic variant by hashing the coord.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const variant = (x * 7 + y * 13) % 4;
        const grassKey = variant === 0 ? 'tile-grass' : `tile-grass-${variant}`;
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, grassKey).setOrigin(0).setDepth(0);
        const code = map[y][x];
        if (code === TILE.GRASS) continue;
        const key = textureFor(code, x, y);
        if (!key) continue;
        const img = this.add.image(x * TILE_SIZE, y * TILE_SIZE, key).setOrigin(0);
        img.setDepth(code === TILE.TREE ? 5 : 1);
      }
    }

    // Poke Center building with a soft drop shadow.
    const pc = features.pokeCenter;
    this.add.ellipse(
      pc.x * TILE_SIZE + 32, pc.y * TILE_SIZE + 44, 110, 18, 0x000000, 0.25
    ).setDepth(5);
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

    // Items on the map — prefer real PokéAPI sprites, fall back to procedural.
    this.itemSprites = new Map();
    for (const it of features.items) {
      const key = `${it.x},${it.y}`;
      if (this.state.worldItems[key]) continue;
      const tex = textureForItem(it.type, this.textures);
      const sprite = this.add.image(
        it.x * TILE_SIZE + TILE_SIZE / 2,
        it.y * TILE_SIZE + TILE_SIZE / 2,
        tex
      ).setDepth(4).setScale(it.type === 'pokeball' ? 1.4 : 1.3);
      // Soft drop shadow under the item.
      const shadow = this.add.ellipse(sprite.x, sprite.y + 10, 18, 5, 0x000000, 0.3).setDepth(3);
      this.tweens.add({ targets: sprite, y: sprite.y - 4, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
      this.itemSprites.set(key, { sprite, shadow, item: it });
    }

    // Ambient wandering Pokemon — decorative.
    for (const m of AMBIENT_MONS) {
      const sprKey = `mon-${m.id}`;
      if (!this.textures.exists(sprKey)) continue;
      const px = m.x * TILE_SIZE + TILE_SIZE / 2;
      const py = m.y * TILE_SIZE + TILE_SIZE / 2;
      const shadow = this.add.ellipse(px, py + 10, 24, 6, 0x000000, 0.3).setDepth(3);
      const sprite = this.add.image(px, py, sprKey).setDepth(4).setScale(1.6);
      this.tweens.add({
        targets: sprite, y: sprite.y - 6, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.InOut'
      });
      this.ambientSprites.push({ sprite, shadow, mon: m });
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
    this.updateAmbientBias();

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
    for (const [key, { sprite, shadow, item }] of this.itemSprites) {
      if (Phaser.Math.Distance.Between(px, py, sprite.x, sprite.y) > 24) continue;
      takeItem(this.state, item.x, item.y, item.type);
      this.tweens.add({
        targets: sprite, y: sprite.y - 22, alpha: 0, scale: 1.8, duration: 400,
        onComplete: () => sprite.destroy()
      });
      if (shadow) {
        this.tweens.add({ targets: shadow, alpha: 0, duration: 300, onComplete: () => shadow.destroy() });
      }
      this.itemSprites.delete(key);
      const label = item.type === 'pokeball' ? 'Poké Ball' : 'Berry';
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

  updateAmbientBias() {
    // If the player is near an ambient Pokemon, bias the next encounter
    // toward it. This gives the kid a way to "hunt" for a specific Pokemon
    // by walking up to it on the map.
    this.biasedMon = null;
    const px = this.player.x, py = this.player.y;
    let closest = null, closestDist = 96;
    for (const a of this.ambientSprites) {
      const d = Phaser.Math.Distance.Between(px, py, a.sprite.x, a.sprite.y);
      if (d < closestDist) { closestDist = d; closest = a; }
    }
    if (closest) this.biasedMon = closest.mon.id;
  }

  triggerEncounter() {
    this.encounterCooldown = 1500;
    // 70% chance to use the biased ambient mon when one is nearby; otherwise
    // a random weighted pick from the whole Kanto bank.
    const wild = (this.biasedMon && Math.random() < 0.7)
      ? (byId(this.biasedMon) || pickRandom())
      : pickRandom();
    recordEncounter(this.state, wild);

    this.cameras.main.flash(220, 255, 255, 255);
    this.cameras.main.shake(180, 0.005);

    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.scene.launch('Encounter', { wild, state: this.state });
  }
}

function textureFor(code, x, y) {
  switch (code) {
    case TILE.TALLGRASS: return 'tile-tallgrass';
    case TILE.TREE:      return 'tile-tree';
    case TILE.WATER:     return 'tile-water';
    case TILE.PATH:      return 'tile-path';
    case TILE.SAND:      return 'tile-sand';
    case TILE.FLOWER: {
      const v = (x + y * 3) % 3;
      return v === 0 ? 'tile-flower' : `tile-flower-${v}`;
    }
    case TILE.ROCK:      return 'tile-rock';
    default: return null;
  }
}

function textureForItem(type, textures) {
  if (type === 'pokeball') {
    return textures.exists('item-pokeball') ? 'item-pokeball' : 'pokeball';
  }
  if (type === 'berry') {
    return textures.exists('item-oranberry') ? 'item-oranberry' : 'berry';
  }
  return 'pokeball';
}
