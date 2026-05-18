import Phaser from 'phaser';
import { spriteUrl, displayName } from '../data/pokedex.js';
import { questionFor } from '../data/stem.js';
import { recordAnswer, recordCatch, save } from '../game/save.js';

// A wild Pokemon encounter. The player answers a STEM question to throw a
// Poke Ball; a correct answer dramatically boosts catch chance. Up to three
// attempts before the Pokemon flees.

export default class EncounterScene extends Phaser.Scene {
  constructor() { super('Encounter'); }

  init(data) {
    this.wild = data.wild;
    this.state = data.state;
    this.attempts = 0;
    this.maxAttempts = 3;
    this.done = false;
  }

  preload() {
    const key = `mon-${this.wild.id}`;
    if (!this.textures.exists(key)) {
      this.load.image(key, spriteUrl(this.wild.id));
      // CORS-friendly endpoint. github raw is fine, but if it ever fails,
      // we'll just render a question mark placeholder.
      this.load.once('loaderror', () => {
        this.textures.addBase64(key, PLACEHOLDER_PNG);
      });
    }
  }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Battle backdrop.
    this.add.rectangle(0, 0, W, H, 0x0e1116, 0.86).setOrigin(0).setDepth(0);
    // Floor "platforms"
    this.add.ellipse(W * 0.7, H * 0.45, 280, 40, 0xa5723a, 0.55).setDepth(1);
    this.add.ellipse(W * 0.28, H * 0.78, 320, 50, 0xa5723a, 0.55).setDepth(1);

    // Pokemon sprite.
    const monKey = `mon-${this.wild.id}`;
    this.mon = this.add.image(W * 0.7, H * 0.4, monKey)
      .setScale(3)
      .setDepth(2);
    if (!this.textures.exists(monKey)) {
      this.add.text(W * 0.7, H * 0.4, '?', { fontSize: '96px', color: '#fff' }).setOrigin(0.5).setDepth(2);
    }

    // Tween entrance.
    this.mon.alpha = 0;
    this.tweens.add({ targets: this.mon, alpha: 1, scaleX: { from: 0.5, to: 3 }, scaleY: { from: 0.5, to: 3 }, duration: 400, ease: 'Back.Out' });

    // Trainer back (silhouette).
    this.add.rectangle(W * 0.28, H * 0.7, 80, 110, 0x1d3557, 1).setDepth(2);

    // Wild banner.
    const banner = this.add.rectangle(W / 2, 50, 540, 56, 0xffd54a, 1).setDepth(3);
    banner.setStrokeStyle(4, 0x111418);
    this.add.text(W / 2, 50, `A wild ${displayName(this.wild)} appeared!`,
      { fontSize: '24px', color: '#111418', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);

    const typeStr = this.wild.types.map(t => t.toUpperCase()).join(' / ');
    this.add.text(W / 2, 86, `Type: ${typeStr}  ·  Rarity: ${'★'.repeat(this.wild.rarity)}`,
      { fontSize: '16px', color: '#ffd54a' }).setOrigin(0.5).setDepth(4);

    // Question panel.
    this.questionPanel = this.add.container(W / 2, H - 200).setDepth(5);
    this.feedback = this.add.text(W / 2, H - 280, '', {
      fontSize: '20px', color: '#ffd54a', align: 'center', wordWrap: { width: W - 80 }
    }).setOrigin(0.5).setDepth(5);

    this.askQuestion();

    // ESC to flee.
    this.input.keyboard.on('keydown-ESC', () => this.flee('You ran away safely.'));
    this.runBtn = makeButton(this, W - 90, 50, 130, 40, 'Run (ESC)', 0xd63946)
      .on('pointerdown', () => this.flee('You ran away safely.'));
  }

  askQuestion() {
    this.questionPanel.removeAll(true);
    const W = this.scale.width;

    const q = questionFor(this.wild, this.attempts);
    this.currentQ = q;

    const bg = this.add.rectangle(0, 0, W - 80, 180, 0x1f2933, 0.95).setStrokeStyle(3, 0xffd54a);
    this.questionPanel.add(bg);

    this.questionPanel.add(this.add.text(0, -70, `${q.subject} — solve to throw a Poké Ball`, {
      fontSize: '14px', color: '#ffd54a'
    }).setOrigin(0.5));

    this.questionPanel.add(this.add.text(0, -42, q.prompt, {
      fontSize: '22px', color: '#f5f5f5', align: 'center', wordWrap: { width: W - 120 }
    }).setOrigin(0.5));

    // 2x2 choice grid.
    const choiceW = (W - 160) / 2, choiceH = 44;
    q.choices.forEach((label, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = -choiceW / 2 - 8 + col * (choiceW + 16);
      const y = 12 + row * (choiceH + 10);
      const btn = makeButton(this, x, y, choiceW, choiceH, label, 0x2a9d8f, true);
      btn.on('pointerdown', () => this.answer(i));
      this.questionPanel.add(btn.container);
    });

    this.feedback.setText(`Attempt ${this.attempts + 1} of ${this.maxAttempts}`);
  }

  answer(idx) {
    if (this.done) return;
    this.done = true;
    const correct = idx === this.currentQ.answerIndex;
    recordAnswer(this.state, correct);

    if (correct) {
      this.feedback.setText('✅ Correct! You toss a Poké Ball…');
      this.throwBall(true);
    } else {
      this.attempts += 1;
      const correctLabel = this.currentQ.choices[this.currentQ.answerIndex];
      this.feedback.setText(`❌ Not quite — the answer was "${correctLabel}". ${this.currentQ.hint || ''}`);
      this.time.delayedCall(1400, () => {
        if (this.attempts >= this.maxAttempts) {
          this.flee(`${displayName(this.wild)} got away!`);
        } else {
          this.done = false;
          this.askQuestion();
        }
      });
    }
  }

  throwBall(correct) {
    const W = this.scale.width, H = this.scale.height;
    const ball = this.add.image(W * 0.28, H * 0.7, 'pokeball').setScale(1.4).setDepth(6);
    this.tweens.add({
      targets: ball, x: this.mon.x, y: this.mon.y, duration: 600, ease: 'Quad.In',
      onComplete: () => {
        this.tweens.add({ targets: this.mon, alpha: 0, duration: 200 });
        // Catch chance: rarity-based with correctness boost.
        const base = { 1: 0.85, 2: 0.65, 3: 0.4 }[this.wild.rarity] || 0.5;
        const caught = correct && Math.random() < base;
        // Wiggle animation regardless.
        let wiggles = 0;
        const wiggle = () => {
          this.tweens.add({
            targets: ball, angle: { from: -15, to: 15 }, duration: 220, yoyo: true,
            onComplete: () => {
              wiggles += 1;
              if (wiggles < 3) wiggle();
              else this.resolveCatch(caught, ball);
            }
          });
        };
        wiggle();
      }
    });
  }

  resolveCatch(caught, ball) {
    if (caught) {
      recordCatch(this.state, this.wild);
      this.feedback.setText(`🎉 Gotcha! ${displayName(this.wild)} was caught!`);
      this.tweens.add({ targets: ball, scale: 1.8, alpha: 0, duration: 600, ease: 'Sine.Out',
        onComplete: () => this.time.delayedCall(700, () => this.exitTo()) });
    } else {
      this.feedback.setText(`Oh no! ${displayName(this.wild)} broke free!`);
      ball.destroy();
      this.tweens.add({ targets: this.mon, alpha: 1, duration: 300 });
      this.attempts += 1;
      this.time.delayedCall(900, () => {
        if (this.attempts >= this.maxAttempts) this.flee(`${displayName(this.wild)} ran away.`);
        else { this.done = false; this.askQuestion(); }
      });
    }
  }

  flee(message) {
    this.done = true;
    this.feedback.setText(message);
    save(this.state);
    this.time.delayedCall(900, () => this.exitTo());
  }

  exitTo() {
    this.scene.stop();
    this.scene.resume('World');
  }
}

function makeButton(scene, x, y, w, h, label, color) {
  const rect = scene.add.rectangle(0, 0, w, h, color, 1).setStrokeStyle(2, 0x111418);
  const txt  = scene.add.text(0, 0, label, {
    fontSize: '16px', color: '#fff', fontStyle: 'bold', align: 'center', wordWrap: { width: w - 16 }
  }).setOrigin(0.5);
  const c = scene.add.container(x, y, [rect, txt]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  const hoverColor = Phaser.Display.Color.IntegerToColor(color).brighten(15).color;
  c.on('pointerover', () => rect.setFillStyle(hoverColor));
  c.on('pointerout',  () => rect.setFillStyle(color));
  c.container = c; // backward-compatible field for older callers.
  return c;
}

// 1x1 transparent PNG fallback.
const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
