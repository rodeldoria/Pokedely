import Phaser from 'phaser';
import { spriteUrl, displayName } from '../data/pokedex.js';
import { questionFor } from '../data/stem.js';
import { recordAnswer, recordCatch, save, useBall, useBerry } from '../game/save.js';

// A wild Pokemon encounter. The kid solves a STEM question to throw a Poke
// Ball. Wrong answers are forgiving — they just bring up a fresh question.
// A Berry can be used to make the next throw extra-sticky.

export default class EncounterScene extends Phaser.Scene {
  constructor() { super('Encounter'); }

  init(data) {
    this.wild = data.wild;
    this.state = data.state;
    this.attemptsLeft = 5;
    this.berryBoost = 0;
    this.done = false;
  }

  preload() {
    const key = `mon-${this.wild.id}`;
    if (!this.textures.exists(key)) {
      this.load.image(key, spriteUrl(this.wild.id));
      this.load.once('loaderror', () => {
        this.textures.addBase64(key, PLACEHOLDER_PNG);
      });
    }
  }

  create() {
    const W = this.scale.width, H = this.scale.height;

    this.add.rectangle(0, 0, W, H, 0x0e1116, 0.86).setOrigin(0).setDepth(0);
    this.add.ellipse(W * 0.7, H * 0.42, 280, 40, 0xa5723a, 0.55).setDepth(1);
    this.add.ellipse(W * 0.28, H * 0.78, 320, 50, 0xa5723a, 0.55).setDepth(1);

    const monKey = `mon-${this.wild.id}`;
    this.mon = this.add.image(W * 0.7, H * 0.38, monKey).setScale(3).setDepth(2);
    if (!this.textures.exists(monKey)) {
      this.add.text(W * 0.7, H * 0.38, '?', { fontSize: '96px', color: '#fff' }).setOrigin(0.5).setDepth(2);
    }
    this.mon.alpha = 0;
    this.tweens.add({ targets: this.mon, alpha: 1, scaleX: { from: 0.5, to: 3 }, scaleY: { from: 0.5, to: 3 }, duration: 400, ease: 'Back.Out' });

    this.add.rectangle(W * 0.28, H * 0.68, 80, 110, 0x1d3557, 1).setDepth(2);

    // Banner.
    const banner = this.add.rectangle(W / 2, 46, 580, 56, 0xffd54a, 1).setDepth(3);
    banner.setStrokeStyle(4, 0x111418);
    this.add.text(W / 2, 46, `A wild ${displayName(this.wild)} appeared!`,
      { fontSize: '24px', color: '#111418', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
    const typeStr = this.wild.types.map(t => t.toUpperCase()).join(' / ');
    this.add.text(W / 2, 82, `Type: ${typeStr}  ·  Rarity: ${'★'.repeat(this.wild.rarity)}`,
      { fontSize: '15px', color: '#ffd54a' }).setOrigin(0.5).setDepth(4);

    // Inventory line.
    this.invText = this.add.text(20, H - 30, '', {
      fontSize: '14px', color: '#111418', backgroundColor: '#ffd54a', padding: { x: 8, y: 4 }, fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(20);
    this.refreshInventory();

    // Berry button.
    this.berryBtn = makeButton(this, W - 110, H - 50, 170, 36, '🍓 Use a Berry', 0x9d4edd);
    this.berryBtn.on('pointerdown', () => this.useBerry());

    // Question panel.
    this.questionPanel = this.add.container(W / 2, H - 220).setDepth(5);
    this.feedback = this.add.text(W / 2, H - 320, '', {
      fontSize: '20px', color: '#ffd54a', align: 'center', wordWrap: { width: W - 80 }
    }).setOrigin(0.5).setDepth(5);

    this.askQuestion();

    this.input.keyboard.on('keydown-ESC', () => this.flee('You ran away safely.'));
    makeButton(this, W - 90, 46, 130, 36, 'Run (ESC)', 0xd63946)
      .on('pointerdown', () => this.flee('You ran away safely.'));
  }

  refreshInventory() {
    const inv = this.state.inventory;
    this.invText.setText(`🔴 Poké Balls: ${inv.pokeball}   🍓 Berries: ${inv.berry}`);
  }

  askQuestion() {
    this.questionPanel.removeAll(true);
    const W = this.scale.width;

    const q = questionFor(this.wild, 0);
    this.currentQ = q;

    const bg = this.add.rectangle(0, 0, W - 80, 230, 0x1f2933, 0.95).setStrokeStyle(3, 0xffd54a);
    this.questionPanel.add(bg);

    this.questionPanel.add(this.add.text(0, -96, `${q.subject} — answer to throw a Poké Ball`, {
      fontSize: '14px', color: '#ffd54a'
    }).setOrigin(0.5));

    this.questionPanel.add(this.add.text(0, -50, q.prompt, {
      fontSize: '22px', color: '#f5f5f5', align: 'center', wordWrap: { width: W - 120 }
    }).setOrigin(0.5));

    const choiceW = (W - 160) / 2, choiceH = 44;
    q.choices.forEach((label, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = -choiceW / 2 - 8 + col * (choiceW + 16);
      const y = 30 + row * (choiceH + 10);
      const btn = makeButton(this, x, y, choiceW, choiceH, label, 0x2a9d8f);
      btn.on('pointerdown', () => this.answer(i));
      this.questionPanel.add(btn);
    });

    this.feedback.setText(`Tries left: ${this.attemptsLeft}`);
  }

  answer(idx) {
    if (this.done) return;
    this.done = true;
    const correct = idx === this.currentQ.answerIndex;
    recordAnswer(this.state, correct);

    if (correct) {
      this.feedback.setText('✅ Great job! You toss a Poké Ball…');
      this.throwBall();
    } else {
      this.attemptsLeft -= 1;
      const correctLabel = this.currentQ.choices[this.currentQ.answerIndex];
      this.feedback.setText(`Almost! The answer was "${correctLabel}". ${this.currentQ.hint || ''}`);
      this.time.delayedCall(1500, () => {
        if (this.attemptsLeft <= 0) {
          this.flee(`${displayName(this.wild)} got away — try again next time!`);
        } else {
          this.done = false;
          this.askQuestion();
        }
      });
    }
  }

  useBerry() {
    if (this.done) return;
    if (!useBerry(this.state)) {
      this.feedback.setText('No berries left! Visit the Poké Center.');
      return;
    }
    this.berryBoost += 0.25;
    this.refreshInventory();
    this.feedback.setText('🍓 You gave it a Berry — it likes you more now!');
  }

  throwBall() {
    if (!useBall(this.state)) {
      this.feedback.setText('Out of Poké Balls! Visit the Poké Center to restock.');
      this.time.delayedCall(1400, () => this.exitTo());
      return;
    }
    this.refreshInventory();

    const W = this.scale.width, H = this.scale.height;
    const ball = this.add.image(W * 0.28, H * 0.68, 'pokeball').setScale(1.4).setDepth(6);
    this.tweens.add({
      targets: ball, x: this.mon.x, y: this.mon.y, duration: 600, ease: 'Quad.In',
      onComplete: () => {
        this.tweens.add({ targets: this.mon, alpha: 0, duration: 200 });
        const base = { 1: 0.9, 2: 0.75, 3: 0.55 }[this.wild.rarity] || 0.7;
        const caught = Math.random() < Math.min(0.97, base + this.berryBoost);
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
        onComplete: () => this.time.delayedCall(900, () => this.exitTo()) });
    } else {
      this.feedback.setText(`Oh no! ${displayName(this.wild)} broke free!`);
      ball.destroy();
      this.tweens.add({ targets: this.mon, alpha: 1, duration: 300 });
      this.attemptsLeft -= 1;
      this.time.delayedCall(900, () => {
        if (this.attemptsLeft <= 0) this.flee(`${displayName(this.wild)} ran away.`);
        else if ((this.state.inventory.pokeball || 0) <= 0) this.flee('Out of Poké Balls!');
        else { this.done = false; this.askQuestion(); }
      });
    }
  }

  flee(message) {
    this.done = true;
    this.feedback.setText(message);
    save(this.state);
    this.time.delayedCall(1200, () => this.exitTo());
  }

  exitTo() {
    this.scene.stop();
    this.scene.resume('World');
    this.scene.get('World').events.emit('wake');
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
  return c;
}

const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
