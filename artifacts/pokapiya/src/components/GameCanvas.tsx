import { useEffect, useRef, useCallback } from 'react';
import { TILE, generateMap, isSolid, isTallGrass, isTree, adjacentToWater, adjacentToTree, type TileCode, type WorldMap, type NPCTrainer } from '../game/world';
import { spriteUrl, pickRandom, pickEarlyKanto, byId, pickByType, type Pokemon } from '../data/pokedex';
import { save, recordEncounter, takeItem, cutTree, type TrainerState } from '../game/save';

const TS = 32;
const CANVAS_W = 960;
const CANVAS_H = 640;
const SPEED = 3.5;
const JUMP_VEL = -9;
const GRAVITY = 22;

// Early-Kanto roaming Pokémon — Route 1 / Viridian Forest vibe
const AMBIENT = [
  { id: 16, sx: 20, sy: 10, greet: "Pidgey! 🪶" },
  { id: 19, sx: 36, sy: 14, greet: "Rattata rat! 🐭" },
  { id: 10, sx: 12, sy: 28, greet: "Caterpie! 🐛" },
  { id: 13, sx: 42, sy: 8,  greet: "Weedle! 🐝" },
  { id: 25, sx: 30, sy: 24, greet: "Pika pika! ⚡" },
  { id: 129,sx: 10, sy: 32, greet: "Karp karp! 🐟" },
  { id: 133,sx: 16, sy: 20, greet: "Eevee! 🦊" },
];

interface AmbientMon {
  id: number; x: number; y: number;
  vx: number; vy: number; wander: number;
  greet: string; img: HTMLImageElement | null; bobTimer: number;
}
interface ItemSprite { tx: number; ty: number; type: string; bobTimer: number; }
interface TrainerNPC extends NPCTrainer { img: HTMLImageElement | null; bobTimer: number; }

interface GameState {
  worldMap: WorldMap;
  px: number; py: number;
  pvx: number; pvy: number;
  pz: number; pvz: number;
  facing: 'up' | 'down' | 'left' | 'right';
  walkFrame: number; walkTimer: number;
  camX: number; camY: number;
  keys: Set<string>;
  fJustPressed: boolean;
  spaceJustPressed: boolean;
  encounterCooldown: number;
  lastTileKey: string;
  ambientMons: AmbientMon[];
  trainers: TrainerNPC[];
  items: ItemSprite[];
  images: Map<string, HTMLImageElement>;
  speech: { text: string; timer: number } | null;
  toast: { text: string; timer: number } | null;
  biasMonId: number | null;
  fishing: { active: boolean; timer: number } | null;
  state: TrainerState;
  lastTime: number;
  doorArmed: boolean;
}

export interface GameCanvasController {
  exitPokecenter: () => void;
}

interface Props {
  active: boolean;
  onEncounter: (wild: Pokemon, biasId: number | null) => void;
  onTrainerEncounter: (wild: Pokemon, trainer: NPCTrainer) => void;
  onPokecenter: () => void;
  onToast: (msg: string) => void;
  stateRef: React.MutableRefObject<TrainerState>;
  controllerRef?: React.MutableRefObject<GameCanvasController | null>;
}

export default function GameCanvas({ active, onEncounter, onTrainerEncounter, onPokecenter, onToast, stateRef, controllerRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(active);
  const callbacksRef = useRef({ onEncounter, onTrainerEncounter, onPokecenter, onToast });
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { callbacksRef.current = { onEncounter, onTrainerEncounter, onPokecenter, onToast }; });

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
    const { spawn, items: mapItems, trainers } = worldMap.features;
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
      fJustPressed: false, spaceJustPressed: false,
      encounterCooldown: 0,
      lastTileKey: '',
      ambientMons: AMBIENT.map(a => ({
        id: a.id, x: a.sx + 0.5, y: a.sy + 0.5,
        vx: 0, vy: 0, wander: 0, greet: a.greet, img: null, bobTimer: Math.random() * Math.PI * 2,
      })),
      trainers: trainers.map(t => ({ ...t, img: null, bobTimer: Math.random() * Math.PI * 2 })),
      items: mapItems.map(it => ({ tx: it.x, ty: it.y, type: it.type, bobTimer: Math.random() * Math.PI * 2 })),
      images: new Map(),
      speech: null, toast: null,
      biasMonId: null,
      fishing: null,
      state: trainerState,
      lastTime: 0,
      doorArmed: true,
    };
    gsRef.current = gs;

    for (const a of gs.ambientMons) loadImg(spriteUrl(a.id), gs, img => { a.img = img; });
    for (const t of gs.trainers) loadImg(spriteUrl(t.pokemonId), gs, img => { t.img = img; });

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!gs.keys.has(k)) {
        if (k === 'f') gs.fJustPressed = true;
        if (k === ' ' || k === 'enter') gs.spaceJustPressed = true;
      }
      gs.keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => gs.keys.delete(e.key.toLowerCase());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const resize = () => {
      const scaleX = window.innerWidth / CANVAS_W;
      const scaleY = window.innerHeight / CANVAS_H;
      const scale = Math.min(scaleX, scaleY);
      canvas.style.width = `${CANVAS_W * scale}px`;
      canvas.style.height = `${CANVAS_H * scale}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (time: number) => {
      if (!activeRef.current) {
        gs.lastTime = time;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min((time - gs.lastTime) / 1000, 0.05);
      gs.lastTime = time;
      if (dt > 0) {
        const cb = callbacksRef.current;
        update(gs, dt, cb.onEncounter, cb.onTrainerEncounter, cb.onPokecenter, cb.onToast, stateRef);
        draw(canvas, gs);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame((t) => { gs.lastTime = t; rafRef.current = requestAnimationFrame(loop); });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => { if (gsRef.current) gsRef.current.state = stateRef.current; });

  // Expose imperative controls so the Pokémon Center close handler can
  // nudge the player off the door tile (otherwise they'd have to walk
  // off manually before the door becomes interactable again).
  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      exitPokecenter: () => {
        const gs = gsRef.current;
        if (!gs) return;
        const door = gs.worldMap.features.door;
        const { map, width, height } = gs.worldMap;
        // Try south, then east/west/north — first non-solid wins.
        const candidates: Array<[number, number]> = [
          [door.x, door.y + 1],
          [door.x + 1, door.y],
          [door.x - 1, door.y],
          [door.x, door.y - 1],
        ];
        for (const [cx, cy] of candidates) {
          if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
          const t = map[cy]?.[cx];
          if (t !== undefined && !isSolid(t)) {
            gs.px = cx + 0.5;
            gs.py = cy + 0.5;
            gs.doorArmed = false; // require step-off before re-trigger
            return;
          }
        }
      },
    };
    return () => { if (controllerRef) controllerRef.current = null; };
  }, [controllerRef]);

  return (
    <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
      style={{ display: 'block', margin: '0 auto', cursor: 'default', imageRendering: 'pixelated' }} />
  );
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
function update(
  gs: GameState, dt: number,
  onEncounter: Props['onEncounter'],
  onTrainerEncounter: Props['onTrainerEncounter'],
  onPokecenter: Props['onPokecenter'],
  onToast: Props['onToast'],
  stateRef: React.MutableRefObject<TrainerState>,
) {
  const { worldMap: { map, width, height, features } } = gs;
  const keys = gs.keys;

  // If fishing, freeze movement & wait for nibble
  if (gs.fishing?.active) {
    gs.fishing.timer -= dt;
    if (gs.fishing.timer <= 0) {
      const got = Math.random() < 0.78;
      gs.fishing = null;
      if (got) {
        const wild = pickByType('water');
        recordEncounter(gs.state, wild);
        stateRef.current = gs.state;
        save(gs.state);
        onEncounter(wild, null);
      } else {
        gs.toast = { text: "Nothing bit… try again!", timer: 1.6 };
      }
    }
    gs.fJustPressed = false; gs.spaceJustPressed = false;
    return;
  }

  let mvx = 0, mvy = 0;
  if (keys.has('arrowleft') || keys.has('a'))  mvx -= 1;
  if (keys.has('arrowright') || keys.has('d')) mvx += 1;
  if (keys.has('arrowup') || keys.has('w'))    mvy -= 1;
  if (keys.has('arrowdown') || keys.has('s'))  mvy += 1;
  if (mvx !== 0 && mvy !== 0) { mvx *= 0.707; mvy *= 0.707; }

  const spd = SPEED * dt;
  let npx = gs.px + mvx * spd;
  let npy = gs.py + mvy * spd;

  if ((keys.has('z')) && gs.pz === 0) { gs.pvz = JUMP_VEL; }
  gs.pvz += GRAVITY * dt;
  gs.pz = Math.min(0, gs.pz + gs.pvz * dt);
  if (gs.pz >= 0) { gs.pz = 0; gs.pvz = 0; }

  if (Math.abs(mvx) > Math.abs(mvy)) gs.facing = mvx < 0 ? 'left' : 'right';
  else if (mvy < 0) gs.facing = 'up';
  else if (mvy > 0) gs.facing = 'down';

  if (mvx !== 0 || mvy !== 0) {
    gs.walkTimer += dt;
    if (gs.walkTimer > 0.18) { gs.walkTimer = 0; gs.walkFrame = (gs.walkFrame + 1) % 2; }
  } else { gs.walkFrame = 0; }

  // Collision — also treat cut trees as passable
  const collTile = (x: number, y: number) => {
    const t = map[Math.floor(y)]?.[Math.floor(x)] as TileCode;
    if (isTree(t) && gs.state.cutTrees[`${Math.floor(x)},${Math.floor(y)}`]) return false;
    return isSolid(t);
  };
  if (collTile(npx, gs.py)) npx = gs.px;
  if (collTile(npx, npy)) npy = gs.py;
  npx = Math.max(0.5, Math.min(width - 0.5, npx));
  npy = Math.max(0.5, Math.min(height - 0.5, npy));
  gs.px = npx; gs.py = npy;

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
      a.vx = Math.cos(angle) * 0.8; a.vy = Math.sin(angle) * 0.8;
      if (Math.random() < 0.3) { a.vx = 0; a.vy = 0; }
    }
    const nax = a.x + a.vx * dt, nay = a.y + a.vy * dt;
    if (!isSolid(map[Math.floor(nay)]?.[Math.floor(nax)] as TileCode)) {
      a.x = Math.max(1, Math.min(width - 2, nax));
      a.y = Math.max(1, Math.min(height - 2, nay));
    } else { a.vx = -a.vx; a.vy = -a.vy; }
    const dx = gs.px - a.x, dy = gs.py - a.y;
    if (Math.sqrt(dx * dx + dy * dy) < 1.8) gs.biasMonId = a.id;
  }
  for (const t of gs.trainers) t.bobTimer += dt * 2;

  // Nearest entity → speech
  let nearestDist = 999;
  let nearestSpeech: string | null = null;
  for (const a of gs.ambientMons) {
    const dx = gs.px - a.x, dy = gs.py - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearestDist) {
      nearestDist = d;
      const name = (byId(a.id)?.name || '').split('-').map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
      nearestSpeech = `${name}: "${a.greet}"`;
    }
  }
  for (const t of gs.trainers) {
    const dx = gs.px - (t.tx + 0.5), dy = gs.py - (t.ty + 0.5);
    const d = Math.sqrt(dx * dx + dy * dy);
    const defeated = !!gs.state.defeatedTrainers[t.id];
    if (d < nearestDist) {
      nearestDist = d;
      nearestSpeech = defeated
        ? `${t.name}: "Good battle! You're a great trainer!"`
        : `${t.name}: "${t.greet}" — Press SPACE!`;
    }
  }
  if (nearestDist < 2.2 && nearestSpeech) {
    gs.speech = { text: nearestSpeech, timer: 1 };
  } else if (gs.speech) {
    gs.speech.timer -= dt;
    if (gs.speech.timer <= 0) gs.speech = null;
  }

  gs.encounterCooldown = Math.max(0, gs.encounterCooldown - dt);

  // ── F-key actions: fish / cut ─────────────────────────────────────────
  if (gs.fJustPressed) {
    gs.fJustPressed = false;
    const tree = adjacentToTree(map, gs.px, gs.py, gs.state.cutTrees);
    const water = adjacentToWater(map, gs.px, gs.py);
    if (tree && gs.state.inventory.cut > 0) {
      cutTree(gs.state, tree.x, tree.y);
      stateRef.current = gs.state;
      gs.toast = { text: "✂️ Cut! The tree fell down!", timer: 1.8 };
      onToast("✂️ Cut! The tree fell down!");
    } else if (tree) {
      gs.toast = { text: "You need the Cut HM!", timer: 1.5 };
    } else if (water && gs.state.inventory.rod > 0) {
      gs.fishing = { active: true, timer: 1.4 + Math.random() * 1.2 };
      gs.toast = { text: "🎣 Cast your line… wait for a nibble!", timer: 2.5 };
    } else if (water) {
      gs.toast = { text: "You need a Fishing Rod!", timer: 1.5 };
    }
  }

  // ── Space: battle trainer ─────────────────────────────────────────────
  if (gs.spaceJustPressed) {
    gs.spaceJustPressed = false;
    for (const t of gs.trainers) {
      if (gs.state.defeatedTrainers[t.id]) continue;
      const dx = gs.px - (t.tx + 0.5), dy = gs.py - (t.ty + 0.5);
      if (Math.sqrt(dx * dx + dy * dy) < 1.8) {
        const mon = byId(t.pokemonId);
        if (mon) {
          recordEncounter(gs.state, mon);
          stateRef.current = gs.state;
          save(gs.state);
          onTrainerEncounter(mon, t);
          return;
        }
      }
    }
  }

  // Tile-based: tall grass random encounter
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
        const wild = (biasedId && Math.random() < 0.7) ? (byId(biasedId) || pickEarlyKanto()) : pickEarlyKanto();
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

  if (gs.toast) { gs.toast.timer -= dt; if (gs.toast.timer <= 0) gs.toast = null; }

  // Door proximity — must step off the door before it can fire again,
  // otherwise leaving the Pokémon Center immediately re-opens it.
  const door = features.door;
  const ddx = gs.px - (door.x + 0.5), ddy = gs.py - (door.y + 0.5);
  const onDoor = Math.sqrt(ddx * ddx + ddy * ddy) < 0.7;
  if (!onDoor) gs.doorArmed = true;
  if (onDoor && gs.doorArmed) {
    gs.doorArmed = false;
    save(gs.state); stateRef.current = gs.state;
    onPokecenter();
  }
}

// ─── DRAW ────────────────────────────────────────────────────────────────────
function draw(canvas: HTMLCanvasElement, gs: GameState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { worldMap: { map, width, height, features }, camX, camY } = gs;

  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const startTX = Math.floor(camX / TS);
  const endTX = Math.min(width, startTX + Math.ceil(CANVAS_W / TS) + 2);
  const startTY = Math.floor(camY / TS);
  const endTY = Math.min(height, startTY + Math.ceil(CANVAS_H / TS) + 2);

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const code = map[ty]?.[tx];
      const sx = tx * TS - camX, sy = ty * TS - camY;
      // Skip cut trees (they become grass)
      if (code === TILE.TREE && gs.state.cutTrees[`${tx},${ty}`]) {
        drawTile(ctx, TILE.GRASS, sx, sy, tx, ty);
        // Show stump
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(sx + 12, sy + 18, 8, 6);
        ctx.fillStyle = '#5a3e1e'; ctx.fillRect(sx + 14, sy + 19, 4, 4);
      } else {
        drawTile(ctx, code as TileCode, sx, sy, tx, ty);
      }
    }
  }

  drawPokecenter(ctx, features.pokeCenter.x * TS - camX, features.pokeCenter.y * TS - camY);

  for (const sgn of features.signs) drawSign(ctx, sgn.x * TS - camX, sgn.y * TS - camY, sgn.text);

  for (const it of gs.items) {
    if (gs.state.worldItems[`${it.tx},${it.ty}`]) continue;
    const sx = (it.tx + 0.5) * TS - camX;
    const sy = (it.ty + 0.5) * TS - camY + Math.sin(it.bobTimer) * 3;
    drawItem(ctx, gs, it.type, sx, sy);
  }

  const sprites: Array<{ y: number; draw: () => void }> = [];

  for (const a of gs.ambientMons) {
    const sx = a.x * TS - camX;
    const sy = a.y * TS - camY + Math.sin(a.bobTimer) * 2;
    sprites.push({ y: a.y, draw: () => drawAmbientMon(ctx, a, sx, sy) });
  }

  for (const t of gs.trainers) {
    const sx = (t.tx + 0.5) * TS - camX;
    const sy = (t.ty + 0.5) * TS - camY;
    const defeated = !!gs.state.defeatedTrainers[t.id];
    sprites.push({ y: t.ty + 0.5, draw: () => drawTrainerNPC(ctx, t, sx, sy, defeated) });
  }

  const psx = gs.px * TS - camX;
  const psy = gs.py * TS - camY + gs.pz * 2;
  sprites.push({ y: gs.py, draw: () => drawPlayer(ctx, psx, psy, gs.facing, gs.walkFrame) });

  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) s.draw();

  // Fishing rod animation
  if (gs.fishing?.active) {
    drawFishingLine(ctx, gs);
  }

  if (gs.speech) drawSpeechBubble(ctx, gs.speech.text, CANVAS_W / 2, CANVAS_H - 110);
  if (gs.toast) drawToast(ctx, gs.toast.text, CANVAS_W / 2, CANVAS_H - 75);

  // Door glow
  const door = features.door;
  const dsx = door.x * TS - camX, dsy = door.y * TS - camY;
  const pulse = 0.5 + Math.sin(Date.now() / 400) * 0.25;
  ctx.fillStyle = `rgba(255, 213, 74, ${pulse * 0.4})`;
  ctx.fillRect(dsx + 4, dsy + 2, TS - 8, TS - 4);
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 9px "Segoe UI"';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER', dsx + TS / 2, dsy - 2);

  // F-prompt: cut tree / fish indicator
  const tree = adjacentToTree(map, gs.px, gs.py, gs.state.cutTrees);
  const water = adjacentToWater(map, gs.px, gs.py);
  if (tree && !gs.fishing) {
    const fx = tree.x * TS - camX + TS / 2, fy = tree.y * TS - camY - 12;
    drawFPrompt(ctx, fx, fy, gs.state.inventory.cut > 0 ? "F: Cut ✂️" : "F: Need Cut HM");
  } else if (water && !gs.fishing) {
    const fx = water.x * TS - camX + TS / 2, fy = water.y * TS - camY - 12;
    drawFPrompt(ctx, fx, fy, gs.state.inventory.rod > 0 ? "F: Fish 🎣" : "F: Need Rod");
  }
}

// ─── TILE DRAWING ─────────────────────────────────────────────────────────────
function drawTile(ctx: CanvasRenderingContext2D, code: TileCode, sx: number, sy: number, tx: number, ty: number) {
  const grassVar = (tx * 7 + ty * 13) % 4;
  ctx.fillStyle = grassVar === 0 ? '#6bbd4c' : grassVar === 1 ? '#70c252' : grassVar === 2 ? '#67b647' : '#6bbd4c';
  ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#57a83c';
  for (let i = 0; i < 3; i++) ctx.fillRect(sx + (i * 7 + tx * 3) % (TS - 2), sy + (i * 11 + ty * 5) % (TS - 2), 2, 2);
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
  ctx.fillStyle = '#4ea53a'; ctx.fillRect(sx, sy, TS, TS);
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
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(sx + 16, sy + 29, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4226'; ctx.fillRect(sx + 13, sy + 18, 6, 12);
  ctx.fillStyle = '#4a2c19'; ctx.fillRect(sx + 13, sy + 18, 2, 12);
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
  ctx.fillRect(sx, sy + 5, TS, 2); ctx.fillRect(sx, sy + 14, TS, 2); ctx.fillRect(sx, sy + 23, TS, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const t = Date.now() / 1000;
  ctx.fillRect(sx + 4 + Math.sin(t) * 2, sy + 6, 4, 1);
  ctx.fillRect(sx + 18 + Math.sin(t + 1) * 2, sy + 16, 4, 1);
}
function drawPath(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number) {
  ctx.fillStyle = '#d9b074'; ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#c69a5c';
  for (let i = 0; i < 5; i++) ctx.fillRect(sx + (i * 7 + tx * 3) % (TS - 3), sy + (i * 11 + ty * 4) % (TS - 3), 3, 2);
}
function drawSand(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = '#eed8a1'; ctx.fillRect(sx, sy, TS, TS);
  ctx.fillStyle = '#d6c08a';
  for (let i = 0; i < 4; i++) ctx.fillRect(sx + (i * 9) % (TS - 2), sy + (i * 7) % (TS - 2), 2, 2);
}
function drawFlower(ctx: CanvasRenderingContext2D, sx: number, sy: number, tx: number, ty: number) {
  const v = (tx + ty * 3) % 3;
  const c = v === 0 ? '#fff' : v === 1 ? '#ff77aa' : '#9b6cff';
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(sx + 10, sy + 10, 1.5, 0, Math.PI * 2); ctx.fill();
}
function drawRock(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx + 16, sy + 27, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6c7079';
  ctx.beginPath(); ctx.roundRect(sx + 8, sy + 10, 16, 14, 5); ctx.fill();
  ctx.fillStyle = '#8e9299';
  ctx.beginPath(); ctx.roundRect(sx + 11, sy + 12, 7, 5, 3); ctx.fill();
}

// ─── BUILDINGS ───────────────────────────────────────────────────────────────
function drawPokecenter(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx + 48, sy + 76, 50, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.roundRect(sx + 4, sy + 30, 88, 52, 6); ctx.fill();
  ctx.strokeStyle = '#ddd0b0'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#d63946';
  ctx.beginPath();
  ctx.moveTo(sx, sy + 34);
  ctx.bezierCurveTo(sx, sy + 14, sx + 96, sy + 14, sx + 96, sy + 34);
  ctx.lineTo(sx + 96, sy + 38); ctx.lineTo(sx, sy + 38);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b02030'; ctx.fillRect(sx, sy + 32, 96, 6);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d63946'; ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 7, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + 41, sy + 22); ctx.lineTo(sx + 55, sy + 22); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx + 48, sy + 22, 2, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 2; i++) {
    const wx = sx + 12 + i * 50;
    ctx.fillStyle = '#b8e4f9'; ctx.fillRect(wx, sy + 38, 22, 18);
    ctx.strokeStyle = '#a0d4e4'; ctx.lineWidth = 1; ctx.strokeRect(wx, sy + 38, 22, 18);
    ctx.strokeStyle = '#90c4d4';
    ctx.beginPath(); ctx.moveTo(wx + 11, sy + 38); ctx.lineTo(wx + 11, sy + 56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, sy + 47); ctx.lineTo(wx + 22, sy + 47); ctx.stroke();
    ctx.fillStyle = '#8b4513'; ctx.fillRect(wx - 2, sy + 56, 26, 5);
    const fc = ['#ff6b9d','#ffd54a','#9b59b6','#ff6b9d'];
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = fc[j];
      ctx.beginPath(); ctx.arc(wx + 3 + j * 6, sy + 56, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = '#6cbef0';
  ctx.beginPath(); ctx.roundRect(sx + 37, sy + 55, 22, 27, [4, 4, 0, 0]); ctx.fill();
  ctx.strokeStyle = '#4a9ec0'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx + 48, sy + 62); ctx.lineTo(sx + 48, sy + 76); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + 42, sy + 68); ctx.lineTo(sx + 54, sy + 68); ctx.stroke();
}

function drawSign(ctx: CanvasRenderingContext2D, sx: number, sy: number, text: string) {
  ctx.fillStyle = '#6b4226'; ctx.fillRect(sx + 14, sy + 8, 4, 16);
  ctx.fillStyle = '#a0784e'; ctx.fillRect(sx + 4, sy + 6, 24, 14);
  ctx.fillStyle = '#fff8e1'; ctx.font = 'bold 8px "Segoe UI"';
  ctx.textAlign = 'center'; ctx.fillText(text, sx + 16, sy + 16);
}

function drawItem(ctx: CanvasRenderingContext2D, gs: GameState, type: string, sx: number, sy: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 8, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  const url = type === 'pokeball'
    ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
    : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.png';
  const img = gs.images.get(url);
  if (img) ctx.drawImage(img, sx - 12, sy - 14, 24, 24);
}

function drawAmbientMon(ctx: CanvasRenderingContext2D, a: AmbientMon, sx: number, sy: number) {
  // Shadow sits at the tile's foot anchor; sprite bottom lines up with the shadow
  // (previously the sprite's feet floated 4px above the shadow).
  const footY = sy + 14;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(sx, footY, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (a.img) ctx.drawImage(a.img, sx - 20, footY - 40, 40, 40);
}

// ─── PIXEL-ART PLAYER ────────────────────────────────────────────────────────
// 14×20 pixel sprites, scale 2 → 28×40 actual. Feet at (sx, sy).
const PLAYER_PALETTE: Record<string, string> = {
  K: '#1a0d00', // outline
  R: '#d63946', // red
  r: '#9c2632', // dark red
  w: '#ffffff',
  W: '#e8d8c8',
  s: '#f3c6a5', // skin
  S: '#d4a17a', // skin shadow
  h: '#6b3e1f', // hair
  H: '#8b5a2b', // hair highlight
  b: '#2a3a78', // jeans
  B: '#3a4d9c', // jeans highlight
  y: '#ffd54a',
  p: '#1a1a2e',
  m: '#a04444',
};

const PLAYER_DOWN_A = [
  '....KKKKKK....',
  '...KRRRRRRK...',
  '...KRwwwwRK...',
  '...KRwKKwRK...',
  '...KKKKKKKK...',
  '...HsssssssH..',
  '..HsssKsKsssH.',
  '..HsssssssssH.',
  '...sssssssss..',
  '...sSmmmmmSs..',
  '....sssssss...',
  '...KRRRRRRRK..',
  '..KRwwwwwwRK..',
  '..KRRRRRRRRK..',
  '..sKyyyyyKs...',
  '..sKBBBBBKs...',
  '...KbbbbbbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...pppppppp...',
];
const PLAYER_DOWN_B = [
  ...PLAYER_DOWN_A.slice(0, 16),
  '...Kbb..bbK...',
  '....b....b....',
  '....b....b....',
  '....p....p....',
];

const PLAYER_UP_A = [
  '....KKKKKK....',
  '...KRRRRRRK...',
  '...KRRRRRRK...',
  '...KKKKKKKK...',
  '...hhhhhhhh...',
  '..hHhhhhhhHh..',
  '..hhhhhhhhhh..',
  '..hhhhhhhhhh..',
  '...hhhhhhhh...',
  '....hhhhhh....',
  '....hhhhhh....',
  '...KRRRRRRRK..',
  '..KRRRRRRRRK..',
  '..KRRRRRRRRK..',
  '..sKRRRRRRKs..',
  '..sKyyyyyKs...',
  '...KbbbbbbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...pppppppp...',
];
const PLAYER_UP_B = [
  ...PLAYER_UP_A.slice(0, 16),
  '...Kbb..bbK...',
  '....b....b....',
  '....b....b....',
  '....p....p....',
];

const PLAYER_RIGHT_A = [
  '....KKKKK.....',
  '...KRRRRRK....',
  '...KRwwwRK....',
  '...KRwKwRK....',
  '...KKKKKKK....',
  '....sssshh....',
  '...Hssssshh...',
  '...HssKssh....',
  '...HssssshH...',
  '....smmms.....',
  '.....sssss....',
  '....KRRRRR....',
  '...KRwwRRRK...',
  '..KRRRRRRRK...',
  '..KRRRRRRsK...',
  '..KyyyyyysK...',
  '...KBBBBBK....',
  '....KbbbbK....',
  '....Kbb.bK....',
  '....pppppp....',
];
const PLAYER_RIGHT_B = [
  ...PLAYER_RIGHT_A.slice(0, 17),
  '....Kbbbb.....',
  '.....bbb......',
  '.....ppp......',
];

function mirrorArt(rows: string[]): string[] {
  return rows.map(r => r.split('').reverse().join(''));
}

function drawPixelArt(
  ctx: CanvasRenderingContext2D,
  art: string[],
  palette: Record<string, string>,
  px: number, py: number, scale: number,
) {
  for (let y = 0; y < art.length; y++) {
    const row = art[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const color = palette[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px + x * scale, py + y * scale, scale, scale);
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, sx: number, sy: number, facing: string, walkFrame: number) {
  // Shadow under feet
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

  let art: string[];
  if (facing === 'up') art = walkFrame === 0 ? PLAYER_UP_A : PLAYER_UP_B;
  else if (facing === 'left') art = walkFrame === 0 ? mirrorArt(PLAYER_RIGHT_A) : mirrorArt(PLAYER_RIGHT_B);
  else if (facing === 'right') art = walkFrame === 0 ? PLAYER_RIGHT_A : PLAYER_RIGHT_B;
  else art = walkFrame === 0 ? PLAYER_DOWN_A : PLAYER_DOWN_B;

  const scale = 2;
  const w = 14 * scale; // 28
  const h = 20 * scale; // 40
  drawPixelArt(ctx, art, PLAYER_PALETTE, sx - w / 2, sy - h + 2, scale);
}

// ─── PIXEL-ART NPC TRAINERS ──────────────────────────────────────────────────
const NPC_BASE_PALETTE: Record<string, string> = {
  K: '#1a0d00',
  s: '#f3c6a5', S: '#d4a17a',
  w: '#ffffff', y: '#ffd54a',
  p: '#1a1a2e',
};

const HIKER_PALETTE = { ...NPC_BASE_PALETTE, R: '#d63946', r: '#9c2632', h: '#3a2618', H: '#5a3e1e', b: '#5a3a1e', B: '#7d5530', G: '#2d4a2a', g: '#1f3a1c' };
const FISHER_PALETTE = { ...NPC_BASE_PALETTE, R: '#1a6b9d', r: '#0e3a5a', h: '#3a2618', H: '#5a3e1e', b: '#2a2a3e', B: '#3a3a5e' };
const CAMPER_PALETTE = { ...NPC_BASE_PALETTE, R: '#2d6a4f', r: '#1a3f2e', h: '#5a3e1e', H: '#7a5a3e', b: '#5a3a1e', B: '#7a5a3e' };
const LASS_PALETTE = { ...NPC_BASE_PALETTE, R: '#ff77aa', r: '#c14a7c', h: '#c19a2d', H: '#e6c860', b: '#7d2050', B: '#a04070' };

const NPC_HIKER = [
  '....hhhhhh....',
  '...hHHHHHHh...',  // brown bandana hat
  '...hhhhhhhh...',
  '....ssssss....',
  '...sssKsKss...',
  '...ssSsSSss...',
  '....smmmms....',
  '....KRRRRK....',  // red plaid shirt
  '...KRrRRrRK...',
  '...KRRrRRrK...',
  '...KRrRRrRK...',
  '..bKRRRRRRKb..',  // backpack straps
  '..bsKyyyKsb...',  // belt + pack
  '..bbKbbbKbb...',
  '...KBBBBBBK...',  // brown pants
  '...KbbbbbbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...pppppppp...',
];

const NPC_FISHER = [
  '..............',
  '....yyyyyyy...',  // yellow rain hat
  '..yyyyyyyyyyy.',  // wide brim
  '....ssssss....',
  '...sssKsKss...',
  '...sssSSSss...',
  '....smmmms....',
  '....KRRRRK....',  // blue overalls
  '...KRwwwwRK...',
  '...KyyRRyyK...',  // suspenders
  '..KKRRRRRRKK..',
  '..bKRRRRRRKb..',  // arms+rod
  '..bsKRRRRKsb..',
  '...KRRRRRRK...',
  '...KbbbbbbK...',  // dark pants
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...pppppppp...',
];

const NPC_CAMPER = [
  '..............',
  '....RRRRRR....',  // green cap
  '...RRRRRRRR...',
  '...KKKKKKKK...',  // brim
  '....ssssss....',
  '...sssKsKss...',
  '...ssSsSSss...',
  '....smmmms....',
  '...KRRRRRRK...',  // green shirt
  '..KRyyyyyyRK..',  // yellow stripe
  '..KRRRRRRRRK..',
  '..sKRRRRRRKs..',
  '..sKBBBBBKs...',  // tan shorts
  '...KbbbbbbK...',
  '...KbbbbbbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...Kbb..bbK...',
  '...pppppppp...',
];

const NPC_LASS = [
  '....HHHHHH....',  // blonde hair top
  '...HhhhhhhH...',
  '..Hhhhhhhhhh..',  // long sides
  '..HhssssshhH..',
  '..hsssKsKssh..',
  '..hsSssssSsh..',
  '..hhsmmmmsh...',
  '...KRRRRRRK...',  // pink dress top
  '..KRwwRRwwRK..',  // collar
  '..KRRRRRRRRK..',
  '..KRRRRRRRRK..',
  '..sKRRRRRRKs..',
  '..sKyyyyyKs...',  // yellow belt
  '..KRRRRRRRRK..',  // pink skirt
  '.KRRRRRRRRRRK.',
  '.KRRRRRRRRRRK.',
  '..ssssssss....',  // bare legs
  '..ssss..ss....',
  '..ssss..ss....',
  '...pp....pp...',
];

const NPC_PALETTES: Record<string, Record<string, string>> = {
  hiker: HIKER_PALETTE,
  fisher: FISHER_PALETTE,
  camper: CAMPER_PALETTE,
  lass: LASS_PALETTE,
  bug: CAMPER_PALETTE,
};
const NPC_ART: Record<string, string[]> = {
  hiker: NPC_HIKER,
  fisher: NPC_FISHER,
  camper: NPC_CAMPER,
  lass: NPC_LASS,
  bug: NPC_CAMPER,
};

function drawTrainerNPC(ctx: CanvasRenderingContext2D, t: TrainerNPC, sx: number, sy: number, defeated: boolean) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 16, 13, 4, 0, 0, Math.PI * 2); ctx.fill();

  const art = NPC_ART[t.kind] || NPC_CAMPER;
  const palette = NPC_PALETTES[t.kind] || CAMPER_PALETTE;
  const scale = 2;
  const w = 14 * scale, h = 20 * scale;
  drawPixelArt(ctx, art, palette, sx - w / 2, sy - h / 2 - 4, scale);

  // Fisher's rod
  if (t.kind === 'fisher') {
    ctx.strokeStyle = '#5a3e1e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx + 8, sy + 2); ctx.lineTo(sx + 22, sy - 18); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(sx + 22, sy - 18); ctx.lineTo(sx + 24, sy - 4); ctx.stroke();
    ctx.fillStyle = '#d63946'; ctx.beginPath(); ctx.arc(sx + 24, sy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Hiker's backpack hump
  if (t.kind === 'hiker') {
    ctx.fillStyle = '#5a3a1e';
    ctx.beginPath(); ctx.roundRect(sx - 14, sy - 8, 6, 14, 2); ctx.fill();
    ctx.strokeStyle = '#1a0d00'; ctx.lineWidth = 1; ctx.stroke();
  }

  if (defeated) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(sx, sy - 4, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4ade80'; ctx.font = 'bold 18px "Segoe UI"';
    ctx.textAlign = 'center'; ctx.fillText('✓', sx, sy + 1);
  } else {
    const bob = Math.sin(t.bobTimer * 2) * 2;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath(); ctx.arc(sx + 14, sy - 22 + bob, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0d00'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#d63946'; ctx.font = 'bold 10px "Segoe UI"';
    ctx.textAlign = 'center'; ctx.fillText('!', sx + 14, sy - 19 + bob);
  }
}

function drawFishingLine(ctx: CanvasRenderingContext2D, gs: GameState) {
  const psx = gs.px * TS - gs.camX;
  const psy = gs.py * TS - gs.camY;
  const water = adjacentToWater(gs.worldMap.map, gs.px, gs.py);
  if (!water) return;
  const wx = water.x * TS - gs.camX + TS / 2;
  const wy = water.y * TS - gs.camY + TS / 2;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(psx, psy - 18); ctx.lineTo(wx, wy); ctx.stroke();
  const bob = Math.sin(Date.now() / 100) * 2;
  ctx.fillStyle = '#d63946';
  ctx.beginPath(); ctx.arc(wx, wy + bob, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 14px "Segoe UI"';
  ctx.textAlign = 'center';
  ctx.fillText('🎣 …', psx, psy - 30);
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
  ctx.font = '14px "Segoe UI"';
  const w = Math.min(420, ctx.measureText(text).width + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy, w, 30, 8); ctx.fill();
  ctx.strokeStyle = '#5a3e1e'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 30); ctx.lineTo(cx, cy + 38); ctx.lineTo(cx + 6, cy + 30); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a0d00'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 15);
}

function drawToast(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number) {
  ctx.font = 'bold 16px "Segoe UI"';
  const w = ctx.measureText(text).width + 28;
  ctx.fillStyle = 'rgba(255,225,90,0.95)';
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy, w, 30, 10); ctx.fill();
  ctx.strokeStyle = '#6e4b1f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#4a2e10'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 15);
}

function drawFPrompt(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string) {
  ctx.font = 'bold 11px "Segoe UI"';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(20,14,4,0.95)';
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy, w, 18, 5); ctx.fill();
  ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#ffd54a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 9);
}
