export const TILE = {
  GRASS: 0,
  TALLGRASS: 1,
  TREE: 2,
  WATER: 3,
  PATH: 4,
  SAND: 5,
  FLOWER: 6,
  ROCK: 7,
  WALL: 8,
} as const;

export type TileCode = typeof TILE[keyof typeof TILE];

// Rocks are climbable — only trees, water, and cave walls block the player.
const SOLID = new Set<TileCode>([TILE.TREE, TILE.WATER, TILE.WALL]);
export const isSolid = (code: TileCode | undefined) => code !== undefined && SOLID.has(code);
export const isTallGrass = (code: TileCode | undefined) => code === TILE.TALLGRASS;
export const isWater = (code: TileCode | undefined) => code === TILE.WATER;
export const isTree = (code: TileCode | undefined) => code === TILE.TREE;

export type ZoneId = 'town' | 'meadow' | 'mountain' | 'cave';
export type Side = 'n' | 's' | 'e' | 'w';

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  tint: string;
  background: string;
  // Biome types fed to pickByType; empty for town (which uses pickEarlyKanto).
  biomeTypes: string[];
  // Pool of ambient Pokémon IDs that wander the map.
  ambientIds: number[];
}

export const ZONES: Record<ZoneId, ZoneInfo> = {
  town: {
    id: 'town', name: 'Pokapiya Town', tint: '#ffd54a', background: '#87ceeb',
    biomeTypes: [],
    ambientIds: [16, 19, 10, 13, 25, 129, 133],
  },
  meadow: {
    id: 'meadow', name: 'Sunny Meadow', tint: '#9be37a', background: '#9ec9f0',
    biomeTypes: ['bug', 'grass'],
    ambientIds: [10, 13, 43, 69, 46, 48],
  },
  mountain: {
    id: 'mountain', name: 'Mountain Trail', tint: '#c89a6a', background: '#b9c7d9',
    biomeTypes: ['rock', 'ground', 'flying'],
    ambientIds: [74, 21, 27, 41, 95, 19],
  },
  cave: {
    id: 'cave', name: 'Rocky Cave', tint: '#a09cb4', background: '#1a1426',
    biomeTypes: ['rock', 'ghost', 'poison'],
    ambientIds: [41, 92, 23, 109, 74],
  },
};

export const ZONE_IDS: ZoneId[] = ['town', 'meadow', 'mountain', 'cave'];

export function oppositeSide(s: Side): Side {
  return s === 'n' ? 's' : s === 's' ? 'n' : s === 'e' ? 'w' : 'e';
}

export interface NPCTrainer {
  id: string;
  name: string;
  kind: 'hiker' | 'fisher' | 'camper' | 'bug' | 'lass';
  tx: number; ty: number;
  pokemonId: number;
  greet: string;
  reward: 'cut' | 'rod' | 'pokeballs' | 'berries';
}

export interface MapFeatures {
  spawn: { x: number; y: number };
  pokeCenter?: { x: number; y: number };
  door?: { x: number; y: number };
  items: Array<{ x: number; y: number; type: string }>;
  signs: Array<{ x: number; y: number; text: string }>;
  trainers: NPCTrainer[];
  // Where the player lands when entering from a given side.
  entries: Partial<Record<Side, { x: number; y: number }>>;
}

export interface ZoneExits {
  n?: ZoneId; s?: ZoneId; e?: ZoneId; w?: ZoneId;
}

export interface WorldMap {
  id: ZoneId;
  map: TileCode[][];
  width: number;
  height: number;
  features: MapFeatures;
  exits: ZoneExits;
}

export function generateZone(id: ZoneId): WorldMap {
  switch (id) {
    case 'meadow':   return generateMeadow();
    case 'mountain': return generateMountain();
    case 'cave':     return generateCave();
    case 'town':
    default:         return generateTown();
  }
}

// Back-compat for any caller still using the original generator name.
export function generateMap(_w = 48, _h = 36, _seed = 7): WorldMap {
  return generateTown();
}

// ─── TOWN ───────────────────────────────────────────────────────────────────
function generateTown(): WorldMap {
  const width = 48, height = 36;
  let s = 7;
  const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;

  const map: TileCode[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.GRASS)
  );

  for (let x = 0; x < width; x++) {
    map[0][x] = TILE.TREE;
    map[height - 1][x] = TILE.TREE;
    if (rng() < 0.3) map[1][x] = TILE.TREE;
    if (rng() < 0.3) map[height - 2][x] = TILE.TREE;
  }
  for (let y = 0; y < height; y++) {
    map[y][0] = TILE.TREE;
    map[y][width - 1] = TILE.TREE;
    if (rng() < 0.3) map[y][1] = TILE.TREE;
    if (rng() < 0.3) map[y][width - 2] = TILE.TREE;
  }

  splat(map, 5, 4, 6, 4, TILE.WATER, rng);
  ring(map, 5, 4, 6, 4, TILE.SAND);

  for (let y = height - 7; y < height - 1; y++)
    for (let x = width - 14; x < width - 2; x++)
      map[y][x] = y >= height - 4 ? TILE.WATER : TILE.SAND;

  for (let i = 0; i < 40; i++) {
    const x = width - 12 + Math.floor(rng() * 10);
    const y = 2 + Math.floor(rng() * 8);
    if (map[y]?.[x] === TILE.GRASS) map[y][x] = TILE.ROCK;
  }
  for (let x = width - 9; x < width - 3; x++) map[5][x] = TILE.PATH;

  for (let y = height - 11; y < height - 5; y++) {
    for (let x = 3; x < 12; x++) {
      if (map[y][x] === TILE.GRASS && rng() < 0.55) map[y][x] = TILE.FLOWER;
    }
  }

  const patches: [number, number, number, number][] = [
    [14, 6, 5, 3], [24, 5, 6, 4], [34, 9, 4, 5],
    [8, 17, 7, 3], [20, 17, 5, 4], [30, 20, 6, 5],
    [12, 26, 5, 3], [22, 28, 7, 3],
  ];
  for (const [x, y, w, h] of patches) splat(map, x, y, w, h, TILE.TALLGRASS, rng);

  const midY = Math.floor(height / 2);
  const midX = Math.floor(width / 2);
  for (let x = 2; x < width - 2; x++) map[midY][x] = TILE.PATH;
  for (let y = 2; y < height - 2; y++) map[y][midX] = TILE.PATH;

  for (let i = 0; i < 60; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    if (map[y][x] === TILE.GRASS) map[y][x] = rng() < 0.7 ? TILE.FLOWER : TILE.ROCK;
  }

  for (let i = 0; i < 25; i++) {
    const x = 3 + Math.floor(rng() * (width - 6));
    const y = 3 + Math.floor(rng() * (height - 6));
    if (map[y][x] === TILE.GRASS && !nearPath(map, x, y, 2)) map[y][x] = TILE.TREE;
  }

  const cuttable = [
    [midX - 2, midY - 8], [midX + 2, midY + 8],
    [10, midY], [width - 12, midY], [midX, 6], [midX, height - 6],
  ];
  for (const [x, y] of cuttable) {
    if (map[y]?.[x] !== undefined) map[y][x] = TILE.TREE;
  }

  // Carve N gap → Mountain Trail, S gap → Sunny Meadow.
  carveGap(map, 'n', midX);
  carveGap(map, 's', midX);

  const pcX = midX - 1, pcY = midY - 5;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const nx = pcX + dx, ny = pcY + dy;
      if (inBounds(map, nx, ny)) map[ny][nx] = TILE.PATH;
    }
  const doorX = pcX, doorY = pcY + 2;
  const spawn = { x: midX, y: midY };
  const items = [
    { x: midX + 5, y: midY, type: 'pokeball' },
    { x: midX - 6, y: midY + 2, type: 'pokeball' },
    { x: 5, y: midY + 6, type: 'berry' },
    { x: midX + 3, y: midY - 6, type: 'pokeball' },
    { x: width - 6, y: height - 8, type: 'berry' },
    { x: width - 10, y: 3, type: 'pokeball' },
    { x: 6, y: height - 5, type: 'berry' },
    { x: midX + 8, y: midY + 8, type: 'pokeball' },
    { x: 18, y: 6, type: 'pokeball' },
    { x: 32, y: 28, type: 'berry' },
  ];
  const signs = [
    { x: midX - 3, y: midY + 1, text: 'BEACH →' },
    { x: midX + 2, y: 4,        text: '↑ MOUNTAIN' },
    { x: midX + 2, y: height-5, text: '↓ MEADOW' },
  ];
  const trainers: NPCTrainer[] = [
    { id: 'hiker_joe',  name: 'Hiker Joe',  kind: 'hiker',  tx: width - 8, ty: 4,  pokemonId: 74,  greet: "Yo! Battle me, lil' trainer!", reward: 'cut' },
    { id: 'fisher_mac', name: 'Fisher Mac', kind: 'fisher', tx: 8,         ty: 30, pokemonId: 60,  greet: "Reel one in! Wanna battle?", reward: 'rod' },
    { id: 'camper_sue', name: 'Camper Sue', kind: 'camper', tx: 38,        ty: 22, pokemonId: 25,  greet: "My Pikachu is super strong!", reward: 'pokeballs' },
    { id: 'lass_lily',  name: 'Lass Lily',  kind: 'lass',   tx: 20,        ty: 14, pokemonId: 35,  greet: "Hi! Let's have a fairy battle!", reward: 'berries' },
  ];

  return {
    id: 'town',
    map, width, height,
    features: {
      spawn,
      pokeCenter: { x: pcX, y: pcY },
      door: { x: doorX, y: doorY },
      items, signs, trainers,
      entries: {
        n: { x: midX, y: 2 },
        s: { x: midX, y: height - 3 },
      },
    },
    exits: { n: 'mountain', s: 'meadow' },
  };
}

// ─── MEADOW ─────────────────────────────────────────────────────────────────
function generateMeadow(): WorldMap {
  const width = 44, height = 32;
  let s = 12345;
  const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const map: TileCode[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.GRASS)
  );

  for (let x = 0; x < width; x++) { map[0][x] = TILE.TREE; map[height - 1][x] = TILE.TREE; }
  for (let y = 0; y < height; y++) { map[y][0] = TILE.TREE; map[y][width - 1] = TILE.TREE; }

  const midX = Math.floor(width / 2);
  carveGap(map, 'n', midX);

  // Path from N entrance down through the meadow
  for (let y = 1; y < 10; y++) map[y][midX] = TILE.PATH;

  // Carpet of flowers
  for (let i = 0; i < 240; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    if (map[y][x] === TILE.GRASS) map[y][x] = TILE.FLOWER;
  }

  // Tall-grass patches for bug/grass encounters
  const patches: [number, number, number, number][] = [
    [4, 6, 6, 4], [22, 8, 8, 5], [34, 6, 6, 4],
    [8, 18, 6, 4], [24, 20, 8, 5], [34, 22, 6, 4],
    [14, 26, 6, 3],
  ];
  for (const [x, y, w, h] of patches) splat(map, x, y, w, h, TILE.TALLGRASS, rng);

  // Small pond
  splat(map, 28, 14, 5, 4, TILE.WATER, rng);
  ring(map, 28, 14, 5, 4, TILE.SAND);

  // Scatter trees inside (cosmetic obstacles)
  for (let i = 0; i < 18; i++) {
    const x = 3 + Math.floor(rng() * (width - 6));
    const y = 3 + Math.floor(rng() * (height - 6));
    if (map[y][x] === TILE.GRASS) map[y][x] = TILE.TREE;
  }

  return {
    id: 'meadow', map, width, height,
    features: {
      spawn: { x: midX, y: height - 4 },
      items: [
        { x: 6, y: 14, type: 'berry' },
        { x: 38, y: 26, type: 'berry' },
        { x: 26, y: 26, type: 'pokeball' },
      ],
      signs: [
        { x: midX + 2, y: 3,  text: '↑ TOWN' },
        { x: midX - 4, y: 12, text: 'MEADOW' },
      ],
      trainers: [],
      entries: { n: { x: midX, y: 2 } },
    },
    exits: { n: 'town' },
  };
}

// ─── MOUNTAIN TRAIL ─────────────────────────────────────────────────────────
function generateMountain(): WorldMap {
  const width = 44, height = 34;
  let s = 22222;
  const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const map: TileCode[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.GRASS)
  );

  for (let x = 0; x < width; x++) { map[0][x] = TILE.TREE; map[height - 1][x] = TILE.TREE; }
  for (let y = 0; y < height; y++) { map[y][0] = TILE.TREE; map[y][width - 1] = TILE.TREE; }

  const midX = Math.floor(width / 2);
  carveGap(map, 'n', midX);
  carveGap(map, 's', midX);

  // Winding central path
  for (let y = 1; y < height - 1; y++) map[y][midX] = TILE.PATH;
  for (let y = 8; y < 12; y++) map[y][midX + 1] = TILE.PATH;
  for (let y = 18; y < 22; y++) map[y][midX - 1] = TILE.PATH;

  // Rocks everywhere
  for (let i = 0; i < 140; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    if (map[y][x] === TILE.GRASS) map[y][x] = TILE.ROCK;
  }

  // Tall-grass patches (rock/ground/flying encounters)
  const patches: [number, number, number, number][] = [
    [4, 4, 6, 4], [30, 6, 7, 5], [6, 16, 6, 4],
    [32, 18, 6, 4], [16, 24, 6, 4], [28, 26, 6, 4],
  ];
  for (const [x, y, w, h] of patches) splat(map, x, y, w, h, TILE.TALLGRASS, rng);

  // Scatter trees as obstacles
  for (let i = 0; i < 22; i++) {
    const x = 3 + Math.floor(rng() * (width - 6));
    const y = 3 + Math.floor(rng() * (height - 6));
    if (map[y][x] === TILE.GRASS && !nearPath(map, x, y, 2)) map[y][x] = TILE.TREE;
  }

  return {
    id: 'mountain', map, width, height,
    features: {
      spawn: { x: midX, y: height - 4 },
      items: [
        { x: 6,  y: 6,  type: 'pokeball' },
        { x: 36, y: 14, type: 'berry' },
        { x: 12, y: 28, type: 'pokeball' },
      ],
      signs: [
        { x: midX + 2, y: height - 4, text: '↓ TOWN' },
        { x: midX + 2, y: 3,          text: '↑ CAVE' },
        { x: 8,        y: 14,         text: 'TRAIL' },
      ],
      trainers: [],
      entries: {
        s: { x: midX, y: height - 3 },
        n: { x: midX, y: 2 },
      },
    },
    exits: { s: 'town', n: 'cave' },
  };
}

// ─── ROCKY CAVE ─────────────────────────────────────────────────────────────
function generateCave(): WorldMap {
  const width = 38, height = 28;
  let s = 33333;
  const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  // Floor is PATH (dark stone in cave palette)
  const map: TileCode[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.PATH)
  );

  for (let x = 0; x < width; x++) { map[0][x] = TILE.WALL; map[height - 1][x] = TILE.WALL; }
  for (let y = 0; y < height; y++) { map[y][0] = TILE.WALL; map[y][width - 1] = TILE.WALL; }

  const midX = Math.floor(width / 2);
  // S gap back to mountain trail
  for (let dx = -1; dx <= 1; dx++) {
    map[height - 1][midX + dx] = TILE.PATH;
    map[height - 2][midX + dx] = TILE.PATH;
  }

  // Decorative rocks (walkable but visual texture)
  for (let i = 0; i < 90; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    if (map[y][x] === TILE.PATH && rng() < 0.55) map[y][x] = TILE.ROCK;
  }

  // Interior wall clusters
  for (let i = 0; i < 22; i++) {
    const x = 3 + Math.floor(rng() * (width - 6));
    const y = 3 + Math.floor(rng() * (height - 6));
    if (map[y][x] === TILE.PATH || map[y][x] === TILE.ROCK) {
      if (rng() < 0.7) map[y][x] = TILE.WALL;
    }
  }

  // Sparse tall-grass for cave encounters
  const patches: [number, number, number, number][] = [
    [6, 6, 5, 3], [22, 8, 5, 3], [10, 16, 5, 3], [24, 18, 5, 3],
  ];
  for (const [x, y, w, h] of patches) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const nx = x + dx, ny = y + dy;
      if (inBounds(map, nx, ny) && (map[ny][nx] === TILE.PATH || map[ny][nx] === TILE.ROCK)) {
        if (rng() < 0.7) map[ny][nx] = TILE.TALLGRASS;
      }
    }
  }

  // Ensure clear path from south entry inward
  for (let y = height - 3; y > height - 8; y--) map[y][midX] = TILE.PATH;

  return {
    id: 'cave', map, width, height,
    features: {
      spawn: { x: midX, y: height - 3 },
      items: [
        { x: 6,  y: 5,  type: 'pokeball' },
        { x: 30, y: 8,  type: 'berry' },
        { x: 18, y: 14, type: 'pokeball' },
      ],
      signs: [
        { x: midX + 2, y: height - 4, text: '↓ TRAIL' },
        { x: 8,        y: 10,         text: 'CAVE' },
      ],
      trainers: [],
      entries: { s: { x: midX, y: height - 3 } },
    },
    exits: { s: 'mountain' },
  };
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Carve a 3-tile-wide opening through a perimeter wall, plus 1 tile inset
// of path so the player can stand next to the edge without bouncing.
function carveGap(map: TileCode[][], side: Side, mid: number) {
  const height = map.length;
  const width = map[0].length;
  for (let d = -1; d <= 1; d++) {
    if (side === 'n') { map[0][mid + d] = TILE.PATH; map[1][mid + d] = TILE.PATH; }
    if (side === 's') { map[height - 1][mid + d] = TILE.PATH; map[height - 2][mid + d] = TILE.PATH; }
    if (side === 'w') { map[mid + d][0] = TILE.PATH; map[mid + d][1] = TILE.PATH; }
    if (side === 'e') { map[mid + d][width - 1] = TILE.PATH; map[mid + d][width - 2] = TILE.PATH; }
  }
}

// Check if the player is adjacent to a water tile (for fishing)
export function adjacentToWater(map: TileCode[][], px: number, py: number): { x: number; y: number } | null {
  const checks = [[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,1],[1,-1],[-1,-1]];
  const x = Math.floor(px), y = Math.floor(py);
  for (const [dx, dy] of checks) {
    const nx = x + dx, ny = y + dy;
    if (map[ny]?.[nx] === TILE.WATER) return { x: nx, y: ny };
  }
  return null;
}

// Check if the player is adjacent to a standing tree (for cut). cutTrees keys
// are zone-namespaced (`${zoneId}:${x},${y}`) and hold the epoch ms when the
// tree was chopped; the tree is "standing again" once enough time has passed
// (handled by isTreeStanding in save.ts — passed here as an isStanding helper
// so this module stays save-agnostic).
export function adjacentToTree(
  map: TileCode[][], px: number, py: number,
  isStanding: (key: string) => boolean, zoneId: ZoneId = 'town',
): { x: number; y: number } | null {
  const checks = [[0,-1],[0,1],[-1,0],[1,0]];
  const x = Math.floor(px), y = Math.floor(py);
  for (const [dx, dy] of checks) {
    const nx = x + dx, ny = y + dy;
    if (map[ny]?.[nx] === TILE.TREE && isStanding(`${zoneId}:${nx},${ny}`)) return { x: nx, y: ny };
  }
  return null;
}

// Check if the player is adjacent to an intact rock (for mining). Mirrors
// adjacentToTree — see comment above for the isIntact pattern.
export function adjacentToRock(
  map: TileCode[][], px: number, py: number,
  isIntact: (key: string) => boolean, zoneId: ZoneId = 'town',
): { x: number; y: number } | null {
  const checks = [[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,1],[1,-1],[-1,-1]];
  const x = Math.floor(px), y = Math.floor(py);
  for (const [dx, dy] of checks) {
    const nx = x + dx, ny = y + dy;
    if (map[ny]?.[nx] === TILE.ROCK && isIntact(`${zoneId}:${nx},${ny}`)) return { x: nx, y: ny };
  }
  return null;
}

export function tileKey(zoneId: ZoneId, x: number, y: number): string {
  return `${zoneId}:${x},${y}`;
}

function splat(map: TileCode[][], x: number, y: number, w: number, h: number, code: TileCode, rng: () => number) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(map, nx, ny)) continue;
      const edge = dx === 0 || dy === 0 || dx === w - 1 || dy === h - 1;
      if (edge && rng() < 0.4) continue;
      map[ny][nx] = code;
    }
  }
}

function ring(map: TileCode[][], x: number, y: number, w: number, h: number, code: TileCode) {
  for (let dx = -1; dx <= w; dx++) {
    set(map, x + dx, y - 1, code);
    set(map, x + dx, y + h, code);
  }
  for (let dy = -1; dy <= h; dy++) {
    set(map, x - 1, y + dy, code);
    set(map, x + w, y + dy, code);
  }
}

function set(map: TileCode[][], x: number, y: number, code: TileCode) {
  if (!inBounds(map, x, y)) return;
  if (map[y][x] === TILE.GRASS) map[y][x] = code;
}

function inBounds(map: TileCode[][], x: number, y: number) {
  return y >= 0 && y < map.length && x >= 0 && x < map[0].length;
}

function nearPath(map: TileCode[][], x: number, y: number, r: number) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (!inBounds(map, x + dx, y + dy)) continue;
      if (map[y + dy][x + dx] === TILE.PATH) return true;
    }
  return false;
}
