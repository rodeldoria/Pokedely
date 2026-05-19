import Phaser from 'phaser';
import { load } from '../game/save.js';

// Always-on HUD. Refreshes on a timer (cheap), and on encounter exits.

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    const W = this.scale.width;

    this.bar = this.add.rectangle(0, 0, W, 40, 0x111418, 0.7).setOrigin(0).setScrollFactor(0);
    this.title = this.add.text(12, 8, '', { fontSize: '14px', color: '#ffd54a', fontStyle: 'bold' })
      .setScrollFactor(0);
    this.hint = this.add.text(W - 12, 8, 'WASD/Arrows · T = team · ESC = flee', {
      fontSize: '12px', color: '#cfd3da'
    }).setOrigin(1, 0).setScrollFactor(0);

    this.refresh();
    this.time.addEvent({ delay: 600, loop: true, callback: () => this.refresh() });
  }

  refresh() {
    const s = load();
    const total = s.stats.correct + s.stats.wrong;
    const acc = total > 0 ? Math.round((s.stats.correct / total) * 100) : 0;
    this.title.setText(
      `Team ${s.team.length}/6  ·  Caught ${s.stats.caught}  ·  🔴 ${s.inventory.pokeball}  ·  🍓 ${s.inventory.berry}  ·  STEM ${acc}%`
    );
  }
}
