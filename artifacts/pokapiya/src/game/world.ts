export const TILE = {
  GRASS: 0,
  TALLGRASS: 1,
  TREE: 2,
  WATER: 3,
  PATH: 4,
  SAND: 5,
  FLOWER: 6,
  ROCK: 7,
} as const;

export type TileCode = typeof TILE[keyof typeof TILE];

// Rocks are climbable mountains — only trees and water block the player.
const SOLID = new Set<TileCode>([TILE.TREE, TILE.WATER]);
export const isSolid = (code: TileCode | undefined) => code !== undefined && SOLID.has(code);
export const isTallGrass = (code: TileCode | undefined) => code === TILE.TALLGRASS;
export const isWater = (code: TileCode | undefined) => code === TILE.WATER;
export const isTree = (code: TileCode | undefined) => code === TILE.TREE;

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
  pokeCenter: { x: number; y: number };
  door: { x: number; y: number };
  items: Array<{ x: number; y: number; type: string }>;
  signs: Array<{ x: number; y: number; text: string }>;
  trainers: NPCTrainer[];
}

export interface WorldMap {
  map: TileCode[][];
  width: number;
  height: number;
  features: MapFeatures;
}

export function generateMap(width = 48, height = 36, seed = 7): WorldMap {
  let s = seed >>> 0 || 1;
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

  // Add some "cuttable trees" placed deliberately to block shortcuts
  // (just regular trees but in key locations)
  const cuttable = [
    [midX - 2, midY - 8], [midX + 2, midY + 8],
    [10, midY], [width - 12, midY], [midX, 6], [midX, height - 6],
  ];
  for (const [x, y] of cuttable) {
    if (map[y]?.[x] !== undefined) map[y][x] = TILE.TREE;
  }

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
    { x: midX + 2, y: midY - 1, text: '↑ MOUNTAIN' },
    { x: midX - 1, y: midY + 5, text: '↓ FLOWERS' },
  ];
  const trainers: NPCTrainer[] = [
    { id: 'hiker_joe',  name: 'Hiker Joe',  kind: 'hiker',  tx: width - 8, ty: 4,  pokemonId: 74,  greet: "Yo! Battle me, lil' trainer!", reward: 'cut' },
    { id: 'fisher_mac', name: 'Fisher Mac', kind: 'fisher', tx: 8,         ty: 30, pokemonId: 60,  greet: "Reel one in! Wanna battle?", reward: 'rod' },
    { id: 'camper_sue', name: 'Camper Sue', kind: 'camper', tx: 38,        ty: 22, pokemonId: 25,  greet: "My Pikachu is super strong!", reward: 'pokeballs' },
    { id: 'lass_lily',  name: 'Lass Lily',  kind: 'lass',   tx: 20,        ty: 14, pokemonId: 35,  greet: "Hi! Let's have a fairy battle!", reward: 'berries' },
  ];

  return {
    map, width, height,
    features: { spawn, pokeCenter: { x: pcX, y: pcY }, door: { x: doorX, y: doorY }, items, signs, trainers },
  };
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

// Check if the player is adjacent to a tree (for cut)
export function adjacentToTree(map: TileCode[][], px: number, py: number, cutTrees: Record<string, boolean>): { x: number; y: number } | null {
  const checks = [[0,-1],[0,1],[-1,0],[1,0]];
  const x = Math.floor(px), y = Math.floor(py);
  for (const [dx, dy] of checks) {
    const nx = x + dx, ny = y + dy;
    if (map[ny]?.[nx] === TILE.TREE && !cutTrees[`${nx},${ny}`]) return { x: nx, y: ny };
  }
  return null;
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
