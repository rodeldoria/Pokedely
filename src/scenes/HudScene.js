import Phaser from 'phaser';
import { load } from '../game/save.js';

// Always-on HUD. Lives over the WorldScene and refreshes on encounter exits.

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    const W = this.scale.width;

    this.bar = this.add.rectangle(0, 0, W, 40, 0x111418, 0.65).setOrigin(0).setScrollFactor(0);
    this.title = this.add.text(12, 8, '', { fontSize: '14px', color: '#ffd54a', fontStyle: 'bold' })
      .setScrollFactor(0);
    this.hint = this.add.text(W - 12, 8, 'WASD/Arrows to move · T for team · ESC to flee', {
      fontSize: '12px', color: '#cfd3da'
    }).setOrigin(1, 0).setScrollFactor(0);

    this.refresh();
    this.time.addEvent({ delay: 800, loop: true, callback: () => this.refresh() });
  }

  refresh() {
    const state = load();
    const total = state.stats.correct + state.stats.wrong;
    const acc = total > 0 ? Math.round((state.stats.correct / total) * 100) : 0;
    this.title.setText(
      `Team ${state.team.length}/6  ·  Caught ${state.stats.caught}  ·  STEM ${acc}%  ·  Steps ${state.trainer.steps}`
    );
  }
}
