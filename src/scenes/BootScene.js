import Phaser from 'phaser';
import { TILE_SIZE } from '../game/world.js';

// Generate every starter texture procedurally. Slice 2 swaps these for
// Kenney/PokeAPI tile assets while keeping the same texture keys.

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Show a tiny progress bar in case Phaser needs to load anything later.
    const w = this.scale.width, h = this.scale.height;
    const bar = this.add.rectangle(w / 2, h / 2, 200, 8, 0xffd54a, 0.9).setOrigin(0.5);
    bar.scaleX = 0;
    this.load.on('progress', v => { bar.scaleX = v; });
    this.load.on('complete', () => bar.destroy());
  }

  create() {
    const S = TILE_SIZE;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // --- Tiles ---
    // Grass base
    drawGrass(g, S, 0x6bbd4c, 0x57a83c);   g.generateTexture('tile-grass', S, S); g.clear();
    // Tall grass
    drawTallGrass(g, S);                    g.generateTexture('tile-tallgrass', S, S); g.clear();
    // Tree
    drawTree(g, S);                         g.generateTexture('tile-tree', S, S); g.clear();
    // Water
    drawWater(g, S);                        g.generateTexture('tile-water', S, S); g.clear();
    // Path
    drawPath(g, S);                         g.generateTexture('tile-path', S, S); g.clear();
    // Sand
    drawSand(g, S);                         g.generateTexture('tile-sand', S, S); g.clear();
    // Flower
    drawGrass(g, S, 0x6bbd4c, 0x57a83c);
    g.fillStyle(0xffffff, 1); g.fillCircle(10, 10, 3);
    g.fillStyle(0xff77aa, 1); g.fillCircle(22, 18, 3);
    g.fillStyle(0xffe14a, 1); g.fillCircle(14, 24, 2);
    g.generateTexture('tile-flower', S, S); g.clear();
    // Rock
    drawGrass(g, S, 0x6bbd4c, 0x57a83c);
    g.fillStyle(0x8a8d92, 1); g.fillRoundedRect(8, 10, 16, 14, 6);
    g.fillStyle(0xacafb4, 1); g.fillRoundedRect(11, 12, 8, 5, 3);
    g.generateTexture('tile-rock', S, S); g.clear();

    // --- Player frames: 4 directions, 2 walk frames each. Size 18 x 26. ---
    const PW = 20, PH = 28;
    for (const dir of ['down', 'up', 'left', 'right']) {
      for (let frame = 0; frame < 2; frame++) {
        drawPlayer(g, PW, PH, dir, frame);
        g.generateTexture(`player-${dir}-${frame}`, PW, PH);
        g.clear();
      }
    }

    // --- Poke Ball ---
    drawPokeball(g, 24);
    g.generateTexture('pokeball', 24, 24); g.clear();

    // --- Berry ---
    drawBerry(g, 24);
    g.generateTexture('berry', 24, 24); g.clear();

    // --- Pokemon Center roof prop (32 x 48) ---
    drawPokeCenter(g);
    g.generateTexture('pokecenter', 96, 80); g.clear();

    // --- Sign ---
    drawSign(g);
    g.generateTexture('sign', 28, 32); g.clear();

    g.destroy();

    this.scene.start('World');
  }
}

function drawGrass(g, S, a, b) {
  g.fillStyle(a, 1); g.fillRect(0, 0, S, S);
  g.fillStyle(b, 1);
  for (let i = 0; i < 8; i++) {
    const x = (i * 7) % S, y = (i * 11) % S;
    g.fillRect(x, y, 2, 2);
  }
}

function drawTallGrass(g, S) {
  drawGrass(g, S, 0x4ea53a, 0x3d8c2e);
  g.fillStyle(0x6cc44c, 1);
  for (let i = 0; i < 14; i++) {
    const x = 2 + (i * 5) % (S - 4);
    const y = 4 + ((i * 7) % (S - 8));
    g.fillTriangle(x, y + 6, x + 2, y, x + 4, y + 6);
  }
  g.fillStyle(0x86d966, 1);
  for (let i = 0; i < 8; i++) {
    const x = 4 + (i * 9) % (S - 6);
    const y = 8 + ((i * 5) % (S - 10));
    g.fillTriangle(x, y + 4, x + 1, y, x + 2, y + 4);
  }
}

function drawTree(g, S) {
  drawGrass(g, S, 0x6bbd4c, 0x57a83c);
  // trunk
  g.fillStyle(0x6b4226, 1);
  g.fillRect(S / 2 - 3, S - 12, 6, 10);
  // canopy 3 puffs
  g.fillStyle(0x1f6a2a, 1);
  g.fillCircle(S / 2, S / 2 - 2, 11);
  g.fillCircle(S / 2 - 7, S / 2 + 3, 8);
  g.fillCircle(S / 2 + 7, S / 2 + 3, 8);
  g.fillStyle(0x2e8a3a, 1);
  g.fillCircle(S / 2 - 2, S / 2 - 4, 5);
  g.fillCircle(S / 2 + 3, S / 2 - 2, 4);
}

function drawWater(g, S) {
  g.fillStyle(0x3a8fd1, 1); g.fillRect(0, 0, S, S);
  g.fillStyle(0x5aaee8, 1);
  for (let i = 0; i < 4; i++) {
    const y = 5 + i * 7;
    g.fillRect(2, y, S - 4, 1);
  }
  g.fillStyle(0xc4e6ff, 0.7);
  g.fillRect(6, 6, 3, 1); g.fillRect(20, 18, 3, 1);
}

function drawPath(g, S) {
  g.fillStyle(0xd9b074, 1); g.fillRect(0, 0, S, S);
  g.fillStyle(0xc69a5c, 1);
  for (let i = 0; i < 6; i++) {
    const x = (i * 6) % S, y = (i * 9) % S;
    g.fillRect(x, y, 3, 2);
  }
}

function drawSand(g, S) {
  g.fillStyle(0xeed8a1, 1); g.fillRect(0, 0, S, S);
  g.fillStyle(0xd6c08a, 1);
  for (let i = 0; i < 6; i++) g.fillRect((i * 6) % S, (i * 9) % S, 2, 2);
}

function drawPlayer(g, W, H, dir, frame) {
  // Transparent background
  // Hair
  g.fillStyle(0x3b2614, 1);
  g.fillRect(W / 2 - 5, 1, 10, 6);
  // Face
  g.fillStyle(0xf3c6a5, 1);
  g.fillRect(W / 2 - 4, 5, 8, 6);
  // Eyes
  g.fillStyle(0x0e1116, 1);
  if (dir === 'down')  { g.fillRect(W / 2 - 3, 8, 2, 2); g.fillRect(W / 2 + 1, 8, 2, 2); }
  if (dir === 'up')    { /* back of head, no eyes */ }
  if (dir === 'left')  { g.fillRect(W / 2 - 3, 8, 2, 2); }
  if (dir === 'right') { g.fillRect(W / 2 + 1, 8, 2, 2); }
  // Cap
  g.fillStyle(0xd63946, 1);
  g.fillRect(W / 2 - 6, 0, 12, 3);
  g.fillRect(W / 2 - 4, -1, 8, 2);
  // Body (shirt)
  g.fillStyle(0x457b9d, 1);
  g.fillRect(W / 2 - 6, 11, 12, 9);
  g.fillStyle(0xffd54a, 1); // belt
  g.fillRect(W / 2 - 6, 18, 12, 2);
  // Arms
  g.fillStyle(0xf3c6a5, 1);
  g.fillRect(W / 2 - 7, 12, 2, 6);
  g.fillRect(W / 2 + 5, 12, 2, 6);
  // Legs with walk cycle offset
  g.fillStyle(0x2a2a3d, 1);
  if (frame === 0) {
    g.fillRect(W / 2 - 5, 20, 4, 6);
    g.fillRect(W / 2 + 1, 20, 4, 6);
  } else {
    g.fillRect(W / 2 - 5, 21, 4, 6);
    g.fillRect(W / 2 + 1, 19, 4, 6);
  }
  // Shoes
  g.fillStyle(0x111418, 1);
  g.fillRect(W / 2 - 5, 26, 4, 2);
  g.fillRect(W / 2 + 1, 26, 4, 2);
}

function drawPokeball(g, S) {
  // Whole white circle as base
  g.fillStyle(0xf2f2f2, 1);
  g.fillCircle(S / 2, S / 2, S / 2 - 1);
  // Top half red — clip by drawing a rect of red over top half.
  g.fillStyle(0xee3a3a, 1);
  g.fillRect(0, 0, S, S / 2);
  // Re-mask outside the circle with transparent by drawing 4 corners back to bg-clear.
  // Easier: redraw the circle clipped via fillCircle on top isn't possible; instead
  // build an off-screen mask by drawing the colored band + button on top.
  g.fillStyle(0x111418, 1);
  g.fillRect(0, S / 2 - 2, S, 4);
  // Outer ring (give some pop)
  g.lineStyle(2, 0x111418, 1);
  g.strokeCircle(S / 2, S / 2, S / 2 - 1);
  // Button
  g.fillStyle(0x111418, 1);
  g.fillCircle(S / 2, S / 2, 5);
  g.fillStyle(0xf2f2f2, 1);
  g.fillCircle(S / 2, S / 2, 3);
}

function drawBerry(g, S) {
  // Strawberry-style berry: red body, green leaves, tiny seeds.
  g.fillStyle(0xe23b3b, 1);
  g.fillCircle(S / 2, S / 2 + 2, S / 2 - 3);
  g.fillStyle(0xff5c5c, 1);
  g.fillCircle(S / 2 - 3, S / 2 - 1, 4);
  // Leaves
  g.fillStyle(0x3aa84a, 1);
  g.fillTriangle(S / 2 - 8, 6, S / 2, 2, S / 2, 8);
  g.fillTriangle(S / 2 + 8, 6, S / 2, 2, S / 2, 8);
  g.fillTriangle(S / 2 - 4, 4, S / 2 + 4, 4, S / 2, 10);
  // Seeds
  g.fillStyle(0xfff2a8, 1);
  g.fillRect(S / 2 - 4, S / 2 + 1, 2, 2);
  g.fillRect(S / 2 + 3, S / 2 + 4, 2, 2);
  g.fillRect(S / 2,     S / 2 + 7, 2, 2);
  g.fillRect(S / 2 - 5, S / 2 + 6, 2, 2);
}

function drawPokeCenter(g) {
  // Walls (creamy)
  g.fillStyle(0xf3e9c8, 1);
  g.fillRect(8, 28, 80, 50);
  // Door
  g.fillStyle(0x6cbef0, 1);
  g.fillRect(40, 52, 16, 26);
  // Roof (red dome)
  g.fillStyle(0xd63946, 1);
  g.fillRect(0, 18, 96, 14);
  g.fillTriangle(0, 18, 96, 18, 48, 0);
  // PokeBall on roof
  g.fillStyle(0xffffff, 1);
  g.fillCircle(48, 12, 6);
  g.fillStyle(0x111418, 1);
  g.fillCircle(48, 12, 2);
}

function drawSign(g) {
  g.fillStyle(0x6b4226, 1);
  g.fillRect(12, 18, 4, 14);
  g.fillStyle(0xe2b974, 1);
  g.fillRect(2, 4, 24, 16);
  g.fillStyle(0x6b4226, 1);
  g.fillRect(2, 4, 24, 2);
  g.fillRect(2, 18, 24, 2);
  g.fillStyle(0x111418, 1);
  g.fillRect(5, 9, 2, 2);
  g.fillRect(9, 9, 2, 2);
  g.fillRect(13, 9, 2, 2);
  g.fillRect(17, 9, 2, 2);
  g.fillRect(21, 9, 2, 2);
}
