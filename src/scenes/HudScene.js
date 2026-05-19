import Phaser from 'phaser';
import { load } from '../game/save.js';

// Always-on HUD. Refreshes on a timer (cheap), and on encounter exits.

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    const W = this.scale.width;

    // Animal Crossing HUD: cream strip with a rounded shadow line at the
    // bottom so it floats above the world map rather than slabbing it.
    this.bar = this.add.rectangle(0, 0, W, 38, 0xfff3d6, 0.95).setOrigin(0).setScrollFactor(0);
    this.add.rectangle(0, 38, W, 3, 0x6e4b1f, 0.55).setOrigin(0).setScrollFactor(0);

    this.title = this.add.text(14, 9, '', {
      fontSize: '14px', color: '#4a2e10', fontStyle: 'bold'
    }).setScrollFactor(0);
    this.hint = this.add.text(W - 14, 9, 'WASD/Arrows · T = team · ESC = flee', {
      fontSize: '12px', color: '#7d5a30', fontStyle: 'bold'
    }).setOrigin(1, 0).setScrollFactor(0);

    this.refresh();
    this.time.addEvent({ delay: 600, loop: true, callback: () => this.refresh() });
  }

  refresh() {
    const s = load();
    const total = s.stats.correct + s.stats.wrong;
    const acc = total > 0 ? Math.round((s.stats.correct / total) * 100) : 0;
    this.title.setText(
      `🌸 Addie's Adventure  ·  Team ${s.team.length}/6  ·  Caught ${s.stats.caught}  ·  🔴 ${s.inventory.pokeball}  ·  🍓 ${s.inventory.berry}  ·  STEM ${acc}%`
    );
  }
}
