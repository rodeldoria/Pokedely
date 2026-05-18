import Phaser from 'phaser';
import { spriteUrl, displayName } from '../data/pokedex.js';
import { load } from '../game/save.js';

// Modal team roster. Shows the trainer's active 6, the box overflow count,
// and STEM accuracy. Toggle with T from the world, close with ESC or button.

export default class TeamScene extends Phaser.Scene {
  constructor() { super('Team'); }

  preload() {
    const state = load();
    for (const m of state.team) {
      const key = `mon-${m.id}`;
      if (!this.textures.exists(key)) this.load.image(key, spriteUrl(m.id));
    }
    this.state = state;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x0e1116, 0.86).setOrigin(0).setInteractive();

    this.add.rectangle(W / 2, H / 2, W - 80, H - 80, 0x1f2933, 1)
      .setStrokeStyle(4, 0xffd54a);

    this.add.text(W / 2, 70, "Your Team", {
      fontSize: '32px', color: '#ffd54a', fontStyle: 'bold'
    }).setOrigin(0.5);

    const stats = this.state.stats;
    const total = stats.correct + stats.wrong;
    const acc = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    this.add.text(W / 2, 105, `Caught: ${stats.caught}  ·  STEM accuracy: ${acc}%  ·  Box: ${this.state.box.length}`,
      { fontSize: '16px', color: '#f5f5f5' }).setOrigin(0.5);

    // 6 slots, 3x2 grid.
    const slotW = 220, slotH = 150;
    const startX = W / 2 - slotW * 1.5 - 20;
    const startY = 150;
    for (let i = 0; i < 6; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = startX + col * (slotW + 20);
      const y = startY + row * (slotH + 20);
      this.drawSlot(x, y, slotW, slotH, this.state.team[i]);
    }

    const closeBtn = this.add.rectangle(W / 2, H - 90, 200, 50, 0xd63946)
      .setStrokeStyle(2, 0x111418)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H - 90, 'Close (ESC)', {
      fontSize: '18px', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => this.scene.stop());
    this.input.keyboard.on('keydown-ESC', () => this.scene.stop());
    this.input.keyboard.on('keydown-T',   () => this.scene.stop());
  }

  drawSlot(x, y, w, h, member) {
    this.add.rectangle(x, y, w, h, 0x2a3340).setOrigin(0).setStrokeStyle(2, 0x4d5a6c);
    if (!member) {
      this.add.text(x + w / 2, y + h / 2, '— empty —', {
        fontSize: '14px', color: '#6e7a8a'
      }).setOrigin(0.5);
      return;
    }
    const key = `mon-${member.id}`;
    if (this.textures.exists(key)) {
      this.add.image(x + 60, y + h / 2, key).setScale(2);
    } else {
      this.add.text(x + 60, y + h / 2, '?', { fontSize: '40px', color: '#fff' }).setOrigin(0.5);
    }
    this.add.text(x + 110, y + 18, displayName(member), {
      fontSize: '18px', color: '#ffd54a', fontStyle: 'bold'
    });
    this.add.text(x + 110, y + 44, `#${String(member.id).padStart(3, '0')}`, {
      fontSize: '12px', color: '#c0c4cb'
    });
    this.add.text(x + 110, y + 64, member.types.join(' / '), {
      fontSize: '12px', color: '#9ad6c9'
    });
  }
}
