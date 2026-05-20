import Phaser from 'phaser';
import { load, save, healAtCenter } from '../game/save.js';
import { spriteUrl, displayName } from '../data/pokedex.js';

// Poke Center interior. Walk up to Nurse Joy and press SPACE to heal —
// gives 3 Poke Balls and 1 Berry. ESC or walk back out the door to leave.

export default class InteriorScene extends Phaser.Scene {
  constructor() { super('Interior'); }

  init() {
    this.state = load();
    this.healed = false;
  }

  preload() {
    for (const m of this.state.team) {
      const key = `mon-${m.id}`;
      if (!this.textures.exists(key)) this.load.image(key, spriteUrl(m.id));
    }
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const TS = 32;

    // Background floor — wood planks.
    this.add.rectangle(0, 0, W, H, 0xf3e9c8).setOrigin(0);

    // Carpet runner from door to counter.
    this.add.rectangle(W / 2, H / 2, 120, H - 80, 0xd63946, 1).setStrokeStyle(2, 0x8b1f2a);

    // Counter (long horizontal table near top).
    this.add.rectangle(W / 2, 170, 520, 70, 0xb07242).setStrokeStyle(3, 0x6b4226);
    this.add.rectangle(W / 2, 170, 520, 10, 0xc88a55).setOrigin(0.5, 0);

    // Nurse Joy (procedurally drawn).
    const nurse = this.add.container(W / 2, 130);
    // body
    nurse.add(this.add.rectangle(0, 0,  44, 60, 0xffffff).setStrokeStyle(2, 0xd63946));
    // collar
    nurse.add(this.add.rectangle(0, -22, 24, 10, 0xd63946));
    // head
    nurse.add(this.add.circle(0, -38, 14, 0xf3c6a5));
    // hair (pink puffs)
    nurse.add(this.add.circle(-12, -46, 8, 0xff7eb6));
    nurse.add(this.add.circle(12,  -46, 8, 0xff7eb6));
    nurse.add(this.add.rectangle(0, -50, 28, 10, 0xff7eb6));
    // cross on chest
    nurse.add(this.add.rectangle(0, -10, 14, 4, 0xd63946));
    nurse.add(this.add.rectangle(0, -10, 4, 14, 0xd63946));
    // eyes + smile
    nurse.add(this.add.circle(-5, -38, 1.5, 0x111418));
    nurse.add(this.add.circle( 5, -38, 1.5, 0x111418));
    nurse.add(this.add.arc(0, -33, 5, 0, 180, false, 0x111418).setStrokeStyle(2, 0x111418));

    // Healing machine to her right.
    this.add.rectangle(W / 2 + 160, 150, 90, 50, 0xdfe6ef).setStrokeStyle(2, 0x8c95a3);
    for (let i = 0; i < 6; i++) {
      const cx = W / 2 + 130 + (i % 3) * 25;
      const cy = 140 + Math.floor(i / 3) * 20;
      this.add.circle(cx, cy, 5, 0xff5e5e).setStrokeStyle(1, 0x8b1f2a);
    }

    // Some chairs to make it feel like a lobby.
    for (let i = 0; i < 4; i++) {
      const cx = 90 + i * 60;
      this.add.rectangle(cx, H - 130, 30, 30, 0x6cbef0).setStrokeStyle(2, 0x1d3557);
      this.add.rectangle(cx, H - 142, 30, 6, 0x1d3557);
    }
    for (let i = 0; i < 4; i++) {
      const cx = W - 90 - i * 60;
      this.add.rectangle(cx, H - 130, 30, 30, 0x6cbef0).setStrokeStyle(2, 0x1d3557);
      this.add.rectangle(cx, H - 142, 30, 6, 0x1d3557);
    }

    // Floor mat near door.
    this.add.rectangle(W / 2, H - 50, 80, 20, 0xffd54a).setStrokeStyle(2, 0x8b6f12);
    this.add.text(W / 2, H - 50, 'EXIT', { fontSize: '14px', color: '#111418', fontStyle: 'bold' }).setOrigin(0.5);

    // Player (use the same generated sprite). Place near the door, facing up.
    this.player = this.physics.add.sprite(W / 2, H - 90, 'player-up-0');
    this.player.setDepth(5);

    // Title banner.
    this.add.rectangle(W / 2, 40, 420, 50, 0xd63946).setStrokeStyle(3, 0x8b1f2a);
    this.add.text(W / 2, 40, 'Pokémon Center', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Speech bubble.
    this.speechBg = this.add.rectangle(W / 2, H - 200, W - 120, 90, 0xffffff, 0.96)
      .setStrokeStyle(3, 0xd63946);
    this.speech = this.add.text(W / 2, H - 200, defaultSpeech(this.state), {
      fontSize: '17px', color: '#111418', align: 'center', wordWrap: { width: W - 160 }
    }).setOrigin(0.5);

    // Inventory readout.
    const inv = this.state.inventory;
    this.inventoryText = this.add.text(20, H - 28,
      `🔴 Poké Balls: ${inv.pokeball}   🍓 Berries: ${inv.berry}   Team: ${this.state.team.length}/6`,
      { fontSize: '15px', color: '#111418', backgroundColor: '#ffd54a', padding: { x: 8, y: 4 } });

    // Team mini-portraits along the counter.
    this.renderTeamRow();

    // Input.
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.input.keyboard.on('keydown-SPACE', () => this.heal());
    this.input.keyboard.on('keydown-E',     () => this.exit());
    this.input.keyboard.on('keydown-ESC',   () => this.exit());

    this.add.text(W / 2, H - 18, 'SPACE: heal & restock   ·   E or ESC: leave',
      { fontSize: '13px', color: '#6e7a8a' }).setOrigin(0.5);
  }

  renderTeamRow() {
    const startX = this.scale.width / 2 - 110;
    for (let i = 0; i < Math.min(6, this.state.team.length); i++) {
      const m = this.state.team[i];
      const key = `mon-${m.id}`;
      if (this.textures.exists(key)) {
        this.add.image(startX + i * 40, 190, key).setScale(1.0);
      }
    }
  }

  heal() {
    if (this.healed) return;
    this.healed = true;
    healAtCenter(this.state);
    this.speech.setText('Nurse Joy: "Your Pokémon are all bright and healthy! Take some Poké Balls and a Berry too. ✨"');
    const inv = this.state.inventory;
    this.inventoryText.setText(
      `🔴 Poké Balls: ${inv.pokeball}   🍓 Berries: ${inv.berry}   Team: ${this.state.team.length}/6`
    );
    // Sparkles
    for (let i = 0; i < 12; i++) {
      const s = this.add.text(
        this.scale.width / 2 + (Math.random() - 0.5) * 200,
        160 + (Math.random() - 0.5) * 80,
        '✨', { fontSize: '20px' }).setOrigin(0.5);
      this.tweens.add({
        targets: s, alpha: 0, y: s.y - 30, duration: 900 + Math.random() * 600,
        onComplete: () => s.destroy()
      });
    }
  }

  update() {
    const speed = 130;
    let vx = 0, vy = 0;
    const c = this.cursors, w = this.wasd;
    if (c.left.isDown  || w.A.isDown) vx = -speed;
    if (c.right.isDown || w.D.isDown) vx =  speed;
    if (c.up.isDown    || w.W.isDown) vy = -speed;
    if (c.down.isDown  || w.S.isDown) vy =  speed;
    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }
    this.player.setVelocity(vx, vy);

    // Facing animation.
    let facing = 'down';
    if (Math.abs(vx) > Math.abs(vy)) facing = vx < 0 ? 'left' : (vx > 0 ? 'right' : 'down');
    else if (vy !== 0)               facing = vy < 0 ? 'up'   : 'down';
    if (vx !== 0 || vy !== 0) this.player.setTexture(`player-${facing}-0`);

    // Keep inside the room.
    const pad = 16, W = this.scale.width, H = this.scale.height;
    this.player.x = Phaser.Math.Clamp(this.player.x, pad, W - pad);
    this.player.y = Phaser.Math.Clamp(this.player.y, 220, H - pad);

    // Walk over the EXIT mat to leave.
    if (this.player.y > H - 60 && Math.abs(this.player.x - W / 2) < 40) {
      this.exit();
    }
  }

  exit() {
    if (this._exiting) return;
    this._exiting = true;
    this.scene.stop();
    this.scene.resume('World');
    this.scene.get('World').events.emit('returned-from-center');
  }
}

function defaultSpeech(state) {
  const caught = state.stats.caught;
  if (caught === 0) return 'Nurse Joy: "Welcome to the Poké Center! Press SPACE to get some Poké Balls so you can catch your first Pokémon."';
  return `Nurse Joy: "Welcome back, Trainer! You've caught ${caught} Pokémon so far. Press SPACE and I'll heal them up."`;
}
