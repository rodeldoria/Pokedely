import { useEffect, useRef, useCallback } from 'react';
import { TILE, generateMap, isSolid, isTallGrass, type TileCode, type WorldMap } from '../game/world';
import { spriteUrl, pickRandom, byId, type Pokemon } from '../data/pokedex';
import { load, save, recordEncounter, takeItem, type TrainerState } from '../game/save';

const TS = 32; // tile size in pixels
const CANVAS_W = 960;
const CANVAS_H = 640;
const SPEED = 3.5; // tiles per second
const JUMP_VEL = -9;
const GRAVITY = 22;

// Pokemon NPCs that wander the map
const AMBIENT = [
  { id: 25, sx: 20, sy: 10, greet: "Pika pika! ⚡" },
  { id: 1,  sx: 36, sy: 14, greet: "Bulba! Bulbasaur! 🌿" },
  { id: 7,  sx: 12, sy: 28, greet: "Squirtle squirt! 💧" },
  { id: 4,  sx: 42, sy: 8,  greet: "Char char! 🔥" },
  { id: 129,sx: 10, sy: 32, greet: "Karp karp! 🐟" },
  { id: 35, sx: 30, sy: 24, greet: "Cleffa! Clefairy! ✨" },
  { id: 39, sx: 16, sy: 20, greet: "Jigglypuff! 🎵" },
];

interface AmbientMon {
  id: number;
  x: number; y: number; // tile-space float
  vx: number; vy: number;
  wander: number; // timer until next direction change
  greet: string;
  img: HTMLImageElement | null;
  bobTimer: number;
}

interface ItemSprite {
  tx: number; ty: number; type: string;
  bobTimer: number;
}

interface GameState {
  worldMap: WorldMap;
  px: number; py: number; // player position (tile-space)
  pvx: number; pvy: number;
  pz: number; pvz: number; // jump height
  facing: 'up' | 'down' | 'left' | 'right';
  walkFrame: number;
  walkTimer: number;
  camX: number; camY: number;
  keys: Set<string>;
  mouse: { down: boolean; x: number };
  encounterCooldown: number;
  lastTileKey: string;
  ambientMons: AmbientMon[];
  items: ItemSprite[];
  images: Map<string, HTMLImageElement>;
  speech: { text: string; timer: number } | null;
  toast: { text: string; timer: number } | null;
  biasMonId: number | null;
  state: TrainerState;
  lastTime: number;
}

interface Props {
  active: boolean;
  onEncounter: (wild: Pokemon, biasId: number | null) => void;
  onPokecenter: () => void;
  onToast: (msg: string) => void;
  stateRef: React.MutableRefObject<TrainerState>;
}

export default function GameCanvas({ active, onEncounter, onPokecenter, onToast, stateRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);

  const loadImg = useCallback((url: string, gs: GameState, cb?: (img: HTMLImageElement) => void) => {
    if (gs.images.has(url)) { cb?.(gs.images.get(url)!); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { gs.images.set(url, img); cb?.(img); };
    img.onerror = () => {};
    img.src = url;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const worldMap = generateMap(48, 36, 7);
    const { spawn, items: mapItems } = worldMap.features;
    const trainerState = stateRef.current;

    const gs: GameState = {
      worldMap,
      px: spawn.x + 0.5, py: spawn.y + 0.5,
      pvx: 0, pvy: 0,
      pz: 0, pvz: 0,
      facing: 'down',
      walkFrame: 0, walkTimer: 0,
      camX: 0, camY: 0,
      keys: new Set(),
      mouse: { down: false, x: 0 },
      encounterCooldown: 0,
      lastTileKey: '',
      ambientMons: AMBIENT.map(a => ({
        id: a.id, x: a.sx + 0.5, y: a.sy + 0.5,
        vx: 0, vy: 0, wander: 0, greet: a.greet, img: null, bobTimer: Math.random() * Math.PI * 2,
      })),
      items: mapItems.map(it => ({ tx: it.x, ty: it.y, type: it.type, bobTimer: Math.random() * Math.PI * 2 })),
      images: new Map(),
      speech: null, toast: null,
      biasMonId: null,
      state: trainerState,
      lastTime: 0,
    };
    gsRef.current = gs;

    // Preload ambient Pokemon sprites
    for (const a of gs.ambientMons) {
      const url = spriteUrl(a.id);
      loadImg(url, gs, img => { a.img = img; });
    }
    // Preload item icons
    const POKEAPI_ITEMS = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
    loadImg(`${POKEAPI_ITEMS}/poke-ball.png`, gs);
    loadImg(`${POKEAPI_ITEMS}/oran-berry.png`, gs);

    const onKeyDown = (e: KeyboardEvent) => {
      gs.keys.add(e.key.toLowerCase());
      if (e.key === 'T' || e.key === 't') {
        // handled by App
      }
    };
    const onKeyUp = (e: KeyboardEvent) => gs.keys.delete(e.key.toLowerCase());
    const onMouseDown = (e: MouseEvent) => { gs.mouse.down = true; gs.mouse.x = e.clientX; };
    const onMouseUp = () => { gs.mouse.down = false; };
    const onMouseMove = (e: MouseEvent) => { if (gs.mouse.down) gs.mouse.x = e.clientX; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    // Scale canvas to fill viewport
    const resize = () => {
      const scaleX = window.innerWidth / CANVAS_W;
      const scaleY = window.innerHeight / CANVAS_H;
      const scale = Math.min(scaleX, scaleY);
      canvas.style.width = `${CANVAS_W * scale}px`;
      canvas.style.height = `${CANVAS_H * scale}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    // Game loop
    const loop = (time: number) => {
      if (!active) { rafRef.current = requestAnimationFrame(loop); return; }
      const dt = Math.min((time - gs.lastTime) / 1000, 0.05);
      gs.lastTime = time;
      if (dt > 0) {
        update(gs, dt, onEncounter, onPokecenter, stateRef);
        draw(canvas, gs);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame((t) => { gs.lastTime = t; rafRef.current = requestAnimationFrame(loop); });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Sync state
  useEffect(() => {
    if (gsRef.current) gsRef.current.state = stateRef.current;
  });

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block', margin: '0 auto', cursor: 'default', imageRendering: 'pixelated' }}
    />
  );
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
function update(
  gs: GameState, dt: number,
  onEncounter: Props['onEncounter'],
  onPokecenter: Props['onPokecenter'],
  stateRef: React.MutableRefObject<TrainerState>,
) {
  const { worldMap: { map, width, height, features } } = gs;
  const keys = gs.keys;

  // Player movement
  let mvx = 0, mvy = 0;
  if (keys.has('arrowleft') || keys.has('a'))  mvx -= 1;
  if (keys.has('arrowright') || keys.has('d')) mvx += 1;
  if (keys.has('arrowup') || keys.has('w'))    mvy -= 1;
  if (keys.has('arrowdown') || keys.has('s'))  mvy += 1;
  if (mvx !== 0 && mvy !== 0) { mvx *= 0.707; mvy *= 0.707; }

  const spd = SPEED * dt;
  let npx = gs.px + mvx * spd;
  let npy = gs.py + mvy * spd;

  // Jump
  if ((keys.has(' ') || keys.has('z')) && gs.pz === 0) {
    gs.pvz = JUMP_VEL;
  }
  gs.pvz += GRAVITY * dt;
  gs.pz = Math.min(0, gs.pz + gs.pvz * dt);
  if (gs.pz >= 0) { gs.pz = 0; gs.pvz = 0; }

  // Facing direction
  if (Math.abs(mvx) > Math.abs(mvy)) gs.facing = mvx < 0 ? 'left' : 'right';
  else if (mvy < 0) gs.facing = 'up';
  else if (mvy > 0) gs.facing = 'down';

  // Walk animation
  if (mvx !== 0 || mvy !== 0) {
    gs.walkTimer += dt;
    if (gs.walkTimer > 0.18) { gs.walkTimer = 0; gs.walkFrame = (gs.walkFrame + 1) % 2; }
  } else {
    gs.walkFrame = 0;
  }

  // Collision — player footprint: circle radius 0.3 centered at player
  const R = 0.3;
  if (isSolid(map[Math.floor(npy)]?.[Math.floor(npx)] as TileCode)) npx = gs.px;
  if (isSolid(map[Math.floor(npy)]?.[Math.floor(npx)] as TileCode)) npy = gs.py;
  // Bounds
  npx = Math.max(0.5, Math.min(width - 0.5, npx));
  npy = Math.max(0.5, Math.min(height - 0.5, npy));
  gs.px = npx; gs.py = npy;

  // Camera
  const targetCamX = gs.px * TS - CANVAS_W / 2;
  const targetCamY = gs.py * TS - CANVAS_H / 2;
  const clampedX = Math.max(0, Math.min(width * TS - CANVAS_W, targetCamX));
  const clampedY = Math.max(0, Math.min(height * TS - CANVAS_H, targetCamY));
  gs.camX += (clampedX - gs.camX) * Math.min(1, 8 * dt);
  gs.camY += (clampedY - gs.camY) * Math.min(1, 8 * dt);

  // Ambient mon wandering
  gs.biasMonId = null;
  for (const a of gs.ambientMons) {
    a.bobTimer += dt * 2;
    a.wander -= dt;
    if (a.wander <= 0) {
      a.wander = 1 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      a.vx = Math.cos(angle) * 0.8;
      a.vy = Math.sin(angle) * 0.8;
      if (Math.random() < 0.3) { a.vx = 0; a.vy = 0; }
    }
    const nax = a.x + a.vx * dt;
    const nay = a.y + a.vy * dt;
    if (!isSolid(map[Math.floor(nay)]?.[Math.floor(nax)] as TileCode)) {
      a.x = Math.max(1, Math.min(width - 2, nax));
      a.y = Math.max(1, Math.min(height - 2, nay));
    } else {
      a.vx = -a.vx; a.vy = -a.vy;
    }

    // Proximity to player → bias
    const dx = gs.px - a.x, dy = gs.py - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.8) gs.biasMonId = a.id;
  }

  // Speech bubble for nearest ambient mon
  let nearestDist = 999;
  let nearestMon: AmbientMon | null = null;
  for (const a of gs.ambientMons) {
    const dx = gs.px - a.x, dy = gs.py - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearestDist) { nearestDist = d; nearestMon = a; }
  }
  if (nearestDist < 2 && nearestMon) {
    const name = (byId(nearestMon.id)?.name || '').split('-').map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
    gs.speech = { text: `${name}: "${nearestMon.greet}"`, timer: 1 };
  } else if (gs.speech) {
    gs.speech.timer -= dt;
    if (gs.speech.timer <= 0) gs.speech = null;
  }

  // Encounter cooldown
  gs.encounterCooldown = Math.max(0, gs.encounterCooldown - dt);

  // Tile-based checks
  const tx = Math.floor(gs.px), ty = Math.floor(gs.py);
  const tileKey = `${tx},${ty}`;
  if (tileKey !== gs.lastTileKey) {
    gs.lastTileKey = tileKey;
    gs.state.trainer.steps += 1;
    if (gs.state.trainer.steps % 5 === 0) save(gs.state);

    if (isTallGrass(map[ty]?.[tx] as TileCode) && gs.encounterCooldown === 0) {
      if (Math.random() < 0.22) {
        gs.encounterCooldown = 1.8;
        const biasedId = gs.biasMonId;
        const wild = (biasedId && Math.random() < 0.7) ? (byId(biasedId) || pickRandom()) : pickRandom();
        recordEncounter(gs.state, wild);
        stateRef.current = gs.state;
        save(gs.state);
        onEncounter(wild, biasedId);
        return;
      }
    }
  }

  // Item pickups
  for (let i = gs.items.length - 1; i >= 0; i--) {
    const it = gs.items[i];
    const key = `${it.tx},${it.ty}`;
    if (gs.state.worldItems[key]) { gs.items.splice(i, 1); continue; }
    it.bobTimer += dt * 3;
    const dx = gs.px - (it.tx + 0.5), dy = gs.py - (it.ty + 0.5);
    if (Math.sqrt(dx * dx + dy * dy) < 0.7) {
      if (takeItem(gs.state, it.tx, it.ty, it.type)) {
        gs.items.splice(i, 1);
        stateRef.current = gs.state;
        const label = it.type === 'pokeball' ? 'Poké Ball' : 'Berry';
        gs.toast = { text: `Found a ${label}! 🎉`, timer: 2 };
      }
    }
  }

  // Toast timer
  if (gs.toast) { gs.toast.timer -= dt; if (gs.toast.timer <= 0) gs.toast = null; }

  // Door proximity
  const door = features.door;
  const ddx = gs.px - (door.x + 0.5), ddy = gs.py - (door.y + 0.5);
  if (Math.sqrt(ddx * ddx + ddy * ddy) < 0.7) {
    save(gs.state);
    stateRef.current = gs.state;
    onPokecenter();
  }
}

// ─── DRAW ────────────────────────────────────────────────────────────────────
function draw(canvas: HTMLCanvasElement, gs: GameState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { worldMap: { map, width, height, features }, camX, camY } = gs;

  // Sky background
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const startTX = Math.floor(camX / TS);
  const endTX = Math.min(width, startTX + Math.ceil(CANVAS_W / TS) + 2);
  const startTY = Math.floor(camY / TS);
  const endTY = Math.min(height, startTY + Math.ceil(CANVAS_H / TS) + 2);

  // Draw ground tiles
  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const code = map[ty]?.[tx];
      const sx = tx * TS - camX, sy = ty * TS - camY;
      drawTile(ctx, code as TileCode, sx, sy, tx, ty);
    }
  }

  // Draw Pokémon Center building
  drawPokecenter(ctx, features.pokeCenter.x * TS - camX, features.pokeCenter.y * TS - camY);

  // Draw signs
  for (const sgn of features.signs) {
    drawSign(ctx, sgn.x * TS - camX, sgn.y * TS - camY, sgn.text);
  }

  // Draw items (sort by y)
  for (const it of gs.items) {
    if (gs.state.worldItems[`${it.tx},${it.ty}`]) continue;
    const sx = (it.tx + 0.5) * TS - camX;
    const sy = (it.ty + 0.5) * TS - camY + Math.sin(it.bobTimer) * 3;
    drawItem(ctx, gs, it.type, sx, sy);
  }

  // Collect sprites + player + ambient mons, sort by Y for depth
  const sprites: Array<{ y: number; draw: () => void }> = [];

  // Ambient Pokémon
  for (const a of gs.ambientMons) {
    const sx = a.x * TS - camX;
    const sy = a.y * TS - camY + Math.sin(a.bobTimer) * 2;
    sprites.push({ y: a.y, draw: () => drawAmbientMon(ctx, gs, a, sx, sy) });
  }

  // Player
  const psx = gs.px * TS - camX;
  const psy = gs.py * TS - camY + gs.pz * 2;
  sprites.push({ y: gs.py, draw: () => drawPlayer(ctx, psx, psy, gs.facing, gs.walkFrame, gs.pvz !== 0 || gs.pz < 0) });

  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) s.draw();

  // Speech bubble
  if (gs.speech) {
    drawSpeechBubble(ctx, gs.speech.text, CANVAS_W / 2, CANVAS_H - 110);
  }

  // Toast
  if (gs.toast) {
    drawToast(ctx, gs.toast.text, CANVAS_W / 2, CANVAS_H - 75);
  }

  // Pokécenter door glow
  const door = features.door;
  const dsx = door.x * TS - camX, dsy = door.y * TS - camY;
  const pulse = 0.5 + Math.sin(Date.now() / 400) * 0.25;
  ctx.fillStyle = `rgba(255, 213, 74, ${pulse * 0.4})`;
  ctx.fillRect(dsx + 4, dsy + 2, TS - 8, TS - 4);
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 9px "Segoe UI"';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER', dsx + TS / 2, dsy - 2);
}

// ─── TILE DRAWING ─────────────────────────────────────────────────────────────
function drawTile(ctx: CanvasRenderingContext2D, code: TileCode, sx: number, sy: number, tx: number, ty: number) {
  // Always draw grass base
  const grassVar = (tx * 7 + ty * 13) % 4;
  ctx.fillStyle = grassVar === 0 ? '#6bbd4c' : grassVar === 1 ? '#70c252' : grassVar === 2 ? '#67b647' : '#6bbd4c';
  ctx.fillRect(sx, sy, TS, TS);
  // Tiny grass detail
  ctx.fillStyle = '#57a83c';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sx + (i * 7 + tx * 3) % (TS - 2), sy + (i * 11 + ty * 5) % (TS - 2), 2, 2);
  }

  if (code === TILE.GRASS) return;

  switch (code) {
    case TILE.TALLGRASS: drawTallGrass(ctx, sx, sy); break;
    case TILE.TREE: drawTree(ctx, sx, sy); break;
    case TILE.WATER: drawWater(ctx, sx, sy); break;
    case TILE.PATH: drawPath(ctx, sx, sy, tx, ty); break;
    case TILE.SAND: drawSand(ctx, sx, sy); break;
    case TILE.FLOWER: drawFlower(ctx, sx, sy, tx, ty); break;
    case TILE.ROCK: drawRock(ctx, sx, sy); break;
  }
}

function drawTallGrass(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#4ea53a';
  ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#6cc44c';
  for (let i = 0; i < 8; i++) {
    const x = sx + 2 + (i * 5) % (TS - 4);
    const y = sy + 4 + (i * 7) % (TS - 8);
    ctx.beginPath();
    ctx.moveTo(x, y + 7); ctx.lineTo(x + 2, y); ctx.lineTo(x + 4, y + 7);
    ctx.fillStyle = i % 2 === 0 ? '#6cc44c' : '#86d966';
    ctx.fill();
  }
}

function drawTree(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(sx + 16, sy + 29, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Trunk
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(sx + 13, sy + 18, 6, 12);
  ctx.fillStyle = '#4a2c19';
  ctx.fillRect(sx + 13, sy + 18, 2, 12);
  // Canopy layers
  ctx.fillStyle = '#174d20';
  ctx.beginPath(); ctx.arc(sx + 16, sy + 12, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 9, sy + 16, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 23, sy + 16, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2e8a3a';
  ctx.beginPath(); ctx.arc(sx + 14, sy + 10, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 20, sy + 12, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6dc25b';
  ctx.beginPath(); ctx.arc(sx + 13, sy + 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 18, sy + 9, 2, 0, Math.PI * 2); ctx.fill();
}

function drawWater(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#4aa3d9'; ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#6fc1ec';
  ctx.fillRect(sx, sy + 5, TS, 2);
  ctx.fillRect(sx, sy + 14, TS, 2);
  ctx.fillRect(sx, sy + 23, TS, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const t = Date.now() / 1000;
  ctx.fillRect(sx + 4 + Math.sin(t) * 2, sy + 6, 4, 1);
  ctx.fillRect(sx + 18 + Math.sin(t + 1) * 2, sy + 16, 4, 1);
}

function drawPath(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number) {
  ctx.fillStyle = '#d9b074'; ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#c69a5c';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(sx + (i * 7 + tx * 3) % (TS - 3), sy + (i * 11 + ty * 4) % (TS - 3), 3, 2);
  }
}

function drawSand(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#eed8a1'; ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#d6c08a';
  for (let i = 0; i < 4; i++) ctx.fillRect(sx + (i * 9) % (TS - 2), sy + (i * 7) % (TS - 2), 2, 2);
}

function drawFlower(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number) {
  const v = (tx + ty * 3) % 3;
  const c = v === 0 ? '#fff' : v === 1 ? '#ff77aa' : '#9b6cff';
  const c2 = v === 0 ? '#ff77aa' : v === 1 ? '#ffe14a' : '#ffe14a';
  ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(sx + 22, sy + 18, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(sx + 22, sy + 18, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx + 16, sy + 27, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6c7079';
  ctx.beginPath(); ctx.roundRect(sx + 8, sy + 10, 16, 14, 5); ctx.fill();
  ctx.fillStyle = '#8e9299';
  ctx.beginPath(); ctx.roundRect(sx + 11, sy + 12, 7, 5, 3); ctx.fill();
  ctx.fillStyle = '#acafb4';
  ctx.fillRect(sx + 13, sy + 14, 3, 2);
}

// ─── BUILDINGS ───────────────────────────────────────────────────────────────
function drawPokecenter(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  // Animal Crossing-style Pokémon Center
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx + 48, sy + 76, 50, 8, 0, 0, Math.PI * 2); ctx.fill();

  // Walls (cream)
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.roundRect(sx + 4, sy + 30, 88, 52, 6); ctx.fill();
  ctx.strokeStyle = '#ddd0b0'; ctx.lineWidth = 2; ctx.stroke();

  // Roof (red, Animal Crossing-style curved)
  ctx.fillStyle = '#d63946';
  ctx.beginPath();
  ctx.moveTo(sx, sy + 34);
  ctx.bezierCurveTo(sx, sy + 14, sx + 96, sy + 14, sx + 96, sy + 34);
  ctx.lineTo(sx + 96, sy + 38);
  ctx.lineTo(sx, sy + 38);
  ctx.closePath();
  ctx.fill();

  // Roof ridge
  ctx.fillStyle = '#b02030';
  ctx.fillRect(sx, sy + 32, 96, 6);

  // Pokéball on roof
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d63946';
  ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 7, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#333';
  ctx.beginPath(); ctx.moveTo(sx + 41, sy + 22); ctx.lineTo(sx + 55, sy + 22); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 2, 0, Math.PI * 2); ctx.fill();

  // Windows
  for (let i = 0; i < 2; i++) {
    const wx = sx + 12 + i * 50;
    ctx.fillStyle = '#b8e4f9'; ctx.fillRect(wx, sy + 38, 22, 18); // window
    ctx.strokeStyle = '#a0d4e4'; ctx.lineWidth = 1; ctx.strokeRect(wx, sy + 38, 22, 18);
    // Cross divider
    ctx.strokeStyle = '#90c4d4';
    ctx.beginPath(); ctx.moveTo(wx + 11, sy + 38); ctx.lineTo(wx + 11, sy + 56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, sy + 47); ctx.lineTo(wx + 22, sy + 47); ctx.stroke();
    // Flower boxes below window
    ctx.fillStyle = '#8b4513'; ctx.fillRect(wx - 2, sy + 56, 26, 5);
    const fc = ['#ff6b9d','#ffd54a','#9b59b6','#ff6b9d'];
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = fc[j];
      ctx.beginPath(); ctx.arc(wx + 3 + j * 6, sy + 56, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Door
  ctx.fillStyle = '#6cbef0';
  ctx.beginPath(); ctx.roundRect(sx + 37, sy + 55, 22, 27, [4, 4, 0, 0]); ctx.fill();
  ctx.strokeStyle = '#4a9ec0'; ctx.lineWidth = 1.5; ctx.stroke();

  // Cross on door
  ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx + 48, sy + 60); ctx.lineTo(sx + 48, sy + 75); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + 42, sy + 67); ctx.lineTo(sx + 54, sy + 67); ctx.stroke();

  // Sign
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.roundRect(sx + 22, sy + 14, 52, 14, 4); ctx.fill();
  ctx.strokeStyle = '#ddd0b0'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#d63946'; ctx.font = 'bold 9px "Segoe UI"'; ctx.textAlign = 'center';
  ctx.fillText('POKÉMON CENTER', sx + 48, sy + 24);
}

function drawSign(ctx: CanvasRenderingContext2D, sx: number, sy: number, text: string) {
  ctx.fillStyle = '#6b4226'; ctx.fillRect(sx + 12, sy + 16, 4, 16);
  ctx.fillStyle = '#e2b974'; ctx.beginPath(); ctx.roundRect(sx + 2, sy + 4, 28, 14, 3); ctx.fill();
  ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#4a2e10'; ctx.font = 'bold 8px "Segoe UI"'; ctx.textAlign = 'center';
  ctx.fillText(text, sx + 16, sy + 14);
}

function drawItem(ctx: CanvasRenderingContext2D, gs: GameState, type: string, sx: number, sy: number) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 11, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

  const POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';
  const url = type === 'pokeball' ? `${POKEAPI}/poke-ball.png` : `${POKEAPI}/oran-berry.png`;
  const img = gs.images.get(url);
  if (img) {
    ctx.drawImage(img, sx - 12, sy - 14, 24, 24);
  } else {
    // fallback
    if (type === 'pokeball') {
      ctx.fillStyle = '#ee3a3a'; ctx.beginPath(); ctx.arc(sx, sy, 10, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#e23b3b'; ctx.beginPath(); ctx.arc(sx, sy + 2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3aa84a'; ctx.beginPath();
      ctx.moveTo(sx - 8, sy - 4); ctx.lineTo(sx, sy - 8); ctx.lineTo(sx, sy - 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + 8, sy - 4); ctx.lineTo(sx, sy - 8); ctx.lineTo(sx, sy - 2); ctx.fill();
    }
  }
}

function drawAmbientMon(ctx: CanvasRenderingContext2D, gs: GameState, a: AmbientMon, sx: number, sy: number) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 12, 14, 5, 0, 0, Math.PI * 2); ctx.fill();

  if (a.img) {
    ctx.drawImage(a.img, sx - 20, sy - 22, 40, 40);
  } else {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── PLAYER ──────────────────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, sx: number, sy: number, facing: string, frame: number, jumping: boolean) {
  const W = 20, H = 28;
  const ox = sx - W / 2, oy = sy - H;
  const jOff = jumping ? -6 : 0;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save(); ctx.translate(0, jOff);

  // Hair
  ctx.fillStyle = '#1a0d00';
  ctx.fillRect(ox + 2, oy, W - 4, 7);
  // Cap (Ash-style red)
  ctx.fillStyle = '#d63946';
  ctx.fillRect(ox, oy, W, 4);
  ctx.fillRect(ox - 2, oy + 3, W + 4, 3); // brim
  // Face
  ctx.fillStyle = '#f3c6a5';
  ctx.fillRect(ox + 3, oy + 6, W - 6, 9);
  // Eyes
  ctx.fillStyle = '#1a0d00';
  if (facing !== 'up') {
    if (facing === 'right') ctx.fillRect(ox + 12, oy + 8, 3, 3);
    else if (facing === 'left') ctx.fillRect(ox + 5, oy + 8, 3, 3);
    else { ctx.fillRect(ox + 5, oy + 8, 3, 3); ctx.fillRect(ox + 12, oy + 8, 3, 3); }
  }
  // Body
  ctx.fillStyle = '#457b9d';
  ctx.fillRect(ox + 1, oy + 15, W - 2, 9);
  // Belt
  ctx.fillStyle = '#ffd54a'; ctx.fillRect(ox + 1, oy + 22, W - 2, 2);
  // Arms
  const armOff = facing === 'left' || facing === 'right' ? (frame === 0 ? 1 : -1) : 0;
  ctx.fillStyle = '#f3c6a5';
  ctx.fillRect(ox - 3, oy + 16 + armOff, 4, 7);
  ctx.fillRect(ox + W - 1, oy + 16 - armOff, 4, 7);
  // Gloves
  ctx.fillStyle = '#fff';
  ctx.fillRect(ox - 3, oy + 22, 4, 3);
  ctx.fillRect(ox + W - 1, oy + 22, 4, 3);
  // Legs with walk cycle
  ctx.fillStyle = '#1a1a3e';
  const lOff = frame === 0 ? 0 : 2;
  ctx.fillRect(ox + 3, oy + 24, 6, 7 + lOff);
  ctx.fillRect(ox + 11, oy + 24, 6, 7 - lOff);
  // Shoes
  ctx.fillStyle = '#111';
  ctx.fillRect(ox + 2, oy + 30 + lOff, 8, 3);
  ctx.fillRect(ox + 10, oy + 30 - lOff, 8, 3);

  ctx.restore();
}

// ─── UI ELEMENTS ─────────────────────────────────────────────────────────────
function drawSpeechBubble(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
  ctx.font = 'bold 14px "Segoe UI"';
  const tw = ctx.measureText(text).width;
  const bw = tw + 28, bh = 36;
  const bx = cx - bw / 2, by = cy - bh / 2;
  // Bubble
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
  ctx.strokeStyle = '#6e4b1f'; ctx.lineWidth = 2; ctx.stroke();
  // Tail
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.moveTo(cx - 6, by + bh); ctx.lineTo(cx + 6, by + bh); ctx.lineTo(cx, by + bh + 10); ctx.fill();
  // Text
  ctx.fillStyle = '#4a2e10';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.textBaseline = 'alphabetic';
}

function drawToast(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
  ctx.font = 'bold 16px "Segoe UI"';
  const tw = ctx.measureText(text).width;
  const bw = tw + 30, bh = 38;
  const bx = cx - bw / 2, by = cy - bh / 2;
  ctx.fillStyle = '#ffe082';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill();
  ctx.strokeStyle = '#6e4b1f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#4a2e10';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.textBaseline = 'alphabetic';
}
