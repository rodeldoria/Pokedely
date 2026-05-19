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

    // Animal Crossing palette: cream sky, peach ground, pastel mint accents.
    this.add.rectangle(0, 0, W, H, AC.sky, 1).setOrigin(0).setDepth(0);
    this.add.rectangle(0, H * 0.55, W, H * 0.45, AC.ground, 1).setOrigin(0).setDepth(0);
    // Soft pillowy "grass" mound shadows under the two combatants.
    this.add.ellipse(W * 0.7, H * 0.42, 280, 40, AC.shadow, 0.45).setDepth(1);
    this.add.ellipse(W * 0.28, H * 0.78, 320, 50, AC.shadow, 0.45).setDepth(1);

    const monKey = `mon-${this.wild.id}`;
    this.mon = this.add.image(W * 0.7, H * 0.38, monKey).setScale(3).setDepth(2);
    if (!this.textures.exists(monKey)) {
      this.add.text(W * 0.7, H * 0.38, '?', { fontSize: '96px', color: AC.ink }).setOrigin(0.5).setDepth(2);
    }
    this.mon.alpha = 0;
    this.tweens.add({ targets: this.mon, alpha: 1, scaleX: { from: 0.5, to: 3 }, scaleY: { from: 0.5, to: 3 }, duration: 400, ease: 'Back.Out' });

    // Cute rounded trainer placeholder (kept simple — sprite art comes later).
    const trainer = this.add.graphics().setDepth(2);
    trainer.fillStyle(AC.accentBlue, 1);
    trainer.fillRoundedRect(W * 0.28 - 40, H * 0.68 - 55, 80, 110, 18);
    trainer.fillStyle(AC.cream, 1);
    trainer.fillRoundedRect(W * 0.28 - 24, H * 0.68 - 38, 48, 28, 14);

    // Banner — rounded pastel speech-bubble style.
    this.drawRoundedPanel(W / 2, 56, 600, 72, AC.banner, AC.bannerStroke);
    this.add.text(W / 2, 44, `A wild ${displayName(this.wild)} appeared!`,
      { fontSize: '24px', color: AC.ink, fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
    const typeStr = this.wild.types.map(t => t.toUpperCase()).join(' · ');
    this.add.text(W / 2, 76, `${typeStr}  ·  Rarity ${'★'.repeat(this.wild.rarity)}`,
      { fontSize: '14px', color: AC.inkSoft, fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);

    // Inventory chip.
    this.drawRoundedPanel(110, H - 28, 200, 30, AC.chip, AC.bannerStroke, 20);
    this.invText = this.add.text(110, H - 28, '', {
      fontSize: '14px', color: AC.ink, fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.refreshInventory();

    // Berry button.
    this.berryBtn = makeButton(this, W - 110, H - 28, 170, 36, '🍓 Use a Berry', AC.pinkBtn);
    this.berryBtn.on('pointerdown', () => this.useBerry());

    // Question panel.
    this.questionPanel = this.add.container(W / 2, H - 220).setDepth(5);

    // Speech-bubble feedback strip.
    this.drawRoundedPanel(W / 2, H - 320, W - 80, 56, AC.cream, AC.bannerStroke, 22, 5);
    this.feedback = this.add.text(W / 2, H - 320, '', {
      fontSize: '18px', color: AC.ink, align: 'center', fontStyle: 'bold',
      wordWrap: { width: W - 120 }
    }).setOrigin(0.5).setDepth(6);

    this.askQuestion();

    this.input.keyboard.on('keydown-ESC', () => this.flee("That's okay — you can try again later!"));
    makeButton(this, W - 90, 56, 130, 36, 'Run (ESC)', AC.runBtn)
      .on('pointerdown', () => this.flee("That's okay — you can try again later!"));
  }

  drawRoundedPanel(cx, cy, w, h, fill, stroke, radius = 18, depth = 3) {
    const g = this.add.graphics().setDepth(depth);
    g.fillStyle(stroke, 1);
    g.fillRoundedRect(cx - w / 2 - 3, cy - h / 2 + 1, w + 6, h + 4, radius + 3);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, radius);
    return g;
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

    // Rounded card with a warm pastel fill. Drawn as a Graphics so we can
    // round the corners (Phaser's Rectangle is hard-edged).
    const g = this.add.graphics();
    g.fillStyle(AC.bannerStroke, 1);
    g.fillRoundedRect(-(W - 80) / 2 - 3, -114, W - 80 + 6, 232, 24);
    g.fillStyle(AC.card, 1);
    g.fillRoundedRect(-(W - 80) / 2, -112, W - 80, 228, 22);
    this.questionPanel.add(g);

    this.questionPanel.add(this.add.text(0, -96, `${q.subject} — answer to throw a Poké Ball`, {
      fontSize: '14px', color: AC.inkSoft, fontStyle: 'bold'
    }).setOrigin(0.5));

    this.questionPanel.add(this.add.text(0, -50, q.prompt, {
      fontSize: '22px', color: AC.ink, align: 'center', fontStyle: 'bold',
      wordWrap: { width: W - 120 }
    }).setOrigin(0.5));

    const choiceW = (W - 160) / 2, choiceH = 44;
    const choiceColors = [AC.mintBtn, AC.skyBtn, AC.peachBtn, AC.lilacBtn];
    q.choices.forEach((label, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = -choiceW / 2 - 8 + col * (choiceW + 16);
      const y = 30 + row * (choiceH + 10);
      const btn = makeButton(this, x, y, choiceW, choiceH, label, choiceColors[i % 4]);
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
      this.feedback.setText('🌟 Nice work, Addie! You toss a Poké Ball…');
      this.throwBall();
    } else {
      this.attemptsLeft -= 1;
      const correctLabel = this.currentQ.choices[this.currentQ.answerIndex];
      this.feedback.setText(`So close! The answer was "${correctLabel}". ${this.currentQ.hint || ''}`);
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
      this.feedback.setText(`🎉 Yay, Addie! ${displayName(this.wild)} joined your team!`);
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

// Animal Crossing-inspired palette: warm cream, peach, mint, soft pinks.
// Used across the encounter UI to swap the old neon dark theme.
const AC = {
  sky:          0xfff3d6,
  ground:       0xf6c884,
  shadow:       0x7b5832,
  cream:        0xfff8e7,
  card:         0xffe9c0,
  banner:       0xffe082,
  bannerStroke: 0x6e4b1f,
  chip:         0xfff1b8,
  ink:          0x4a2e10,
  inkSoft:      0x7d5a30,
  accentBlue:   0x6fb6d8,
  mintBtn:      0x8fd9b6,
  skyBtn:       0x9ec9ef,
  peachBtn:     0xffb98a,
  lilacBtn:     0xd6b3f1,
  pinkBtn:      0xf5a6c8,
  runBtn:       0xe88b8b
};

function makeButton(scene, x, y, w, h, label, color) {
  // Rounded pastel button with a darker outline for a stamped, AC-style feel.
  const stroke = scene.add.graphics();
  stroke.fillStyle(AC.bannerStroke, 1);
  stroke.fillRoundedRect(-w / 2 - 2, -h / 2 + 1, w + 4, h + 3, 14);
  const fill = scene.add.graphics();
  const draw = (c) => {
    fill.clear();
    fill.fillStyle(c, 1);
    fill.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    // Subtle inner highlight along the top for a glossy candy feel.
    fill.fillStyle(0xffffff, 0.35);
    fill.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.max(4, h * 0.28), 8);
  };
  draw(color);
  const txt = scene.add.text(0, 0, label, {
    fontSize: '16px', color: '#3a2510', fontStyle: 'bold', align: 'center',
    wordWrap: { width: w - 16 }
  }).setOrigin(0.5);
  const c = scene.add.container(x, y, [stroke, fill, txt]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  const hoverColor = Phaser.Display.Color.IntegerToColor(color).brighten(15).color;
  c.on('pointerover', () => draw(hoverColor));
  c.on('pointerout',  () => draw(color));
  return c;
}

const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
