// Hand-tuned procedural overworld. Returns a 2D grid of tile codes plus
// metadata about special locations (Poke Center door, item spawns).

export const TILE = {
  GRASS: 0,
  TALLGRASS: 1,
  TREE: 2,
  WATER: 3,
  PATH: 4,
  SAND: 5,
  FLOWER: 6,
  ROCK: 7,
  BRIDGE: 8
};

export const TILE_SIZE = 32;

const SOLID = new Set([TILE.TREE, TILE.WATER, TILE.ROCK]);
export const isSolid = code => SOLID.has(code);
export const isTallGrass = code => code === TILE.TALLGRASS;

export function generateMap(width = 64, height = 48, seed = 7) {
  let s = seed >>> 0 || 1;
  const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;

  const map = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.GRASS)
  );

  // Tree border with a little randomness.
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

  // ---- Zones ----
  // Lake in the upper-left.
  splat(map, 7, 5, 7, 5, TILE.WATER, rng);
  ring(map, 7, 5, 7, 5, TILE.SAND);

  // Beach zone bottom-right with a long sand strip and ocean below.
  for (let y = height - 8; y < height - 1; y++)
    for (let x = width - 18; x < width - 2; x++)
      map[y][x] = y >= height - 5 ? TILE.WATER : TILE.SAND;
  // Sand edge above the ocean.
  for (let x = width - 18; x < width - 2; x++) {
    if (map[height - 9]?.[x] === TILE.GRASS) map[height - 9][x] = TILE.SAND;
  }

  // Mountain / rocky zone upper-right.
  for (let i = 0; i < 60; i++) {
    const x = width - 16 + Math.floor(rng() * 14);
    const y = 2 + Math.floor(rng() * 10);
    if (map[y]?.[x] === TILE.GRASS) map[y][x] = TILE.ROCK;
  }
  // Path notch into the mountains.
  for (let x = width - 12; x < width - 4; x++) map[6][x] = TILE.PATH;

  // Flower meadow lower-left.
  for (let y = height - 14; y < height - 7; y++) {
    for (let x = 4; x < 16; x++) {
      if (map[y][x] === TILE.GRASS && rng() < 0.55) map[y][x] = TILE.FLOWER;
    }
  }

  // Tall grass patches scattered (encounters).
  const patches = [
    [18, 8, 6, 4], [32, 6, 7, 5], [44, 12, 5, 6],
    [10, 22, 9, 4], [26, 22, 6, 5], [40, 26, 8, 6],
    [16, 34, 6, 3], [30, 36, 8, 4]
  ];
  for (const [x, y, w, h] of patches) splat(map, x, y, w, h, TILE.TALLGRASS, rng);

  // Crossroads paths.
  const midY = Math.floor(height / 2);
  const midX = Math.floor(width / 2);
  for (let x = 2; x < width - 2; x++) map[midY][x] = TILE.PATH;
  for (let y = 2; y < height - 2; y++) map[y][midX] = TILE.PATH;

  // Sprinkle flowers + rocks for decoration.
  for (let i = 0; i < 80; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    if (map[y][x] === TILE.GRASS) map[y][x] = rng() < 0.7 ? TILE.FLOWER : TILE.ROCK;
  }

  // Inner trees but keep paths and door area clear.
  for (let i = 0; i < 35; i++) {
    const x = 3 + Math.floor(rng() * (width - 6));
    const y = 3 + Math.floor(rng() * (height - 6));
    if (map[y][x] === TILE.GRASS && !nearPath(map, x, y, 2)) map[y][x] = TILE.TREE;
  }

  // ---- Poke Center: place building footprint as grass clearing ----
  const pcX = midX - 1, pcY = midY - 6;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const nx = pcX + dx, ny = pcY + dy;
      if (inBounds(map, nx, ny)) map[ny][nx] = TILE.PATH;
    }
  // Door tile right in front of the center.
  const doorX = pcX, doorY = pcY + 2;

  // Spawn at the crossroads.
  const spawn = { x: midX, y: midY };

  // Fixed item spawns — visible and reachable.
  const items = [
    { x: midX + 6, y: midY,     type: 'pokeball' },
    { x: midX - 8, y: midY + 2, type: 'pokeball' },
    { x: 6,        y: midY + 8, type: 'berry' },
    { x: midX + 4, y: midY - 8, type: 'pokeball' },
    { x: width - 8, y: height - 10, type: 'berry' },
    { x: width - 14, y: 4,      type: 'pokeball' },
    { x: 8,         y: height - 6, type: 'berry' },
    { x: midX + 10, y: midY + 10, type: 'pokeball' }
  ];

  // Signposts (decorative).
  const signs = [
    { x: midX - 4, y: midY + 1, text: 'BEACH →' },
    { x: midX + 2, y: midY - 1, text: '↑ MOUNTAIN' },
    { x: midX - 1, y: midY + 6, text: '↓ FLOWERS' }
  ];

  return {
    map, width, height,
    features: {
      spawn,
      pokeCenter: { x: pcX, y: pcY },
      door: { x: doorX, y: doorY },
      items,
      signs
    }
  };
}

function splat(map, x, y, w, h, code, rng) {
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

function ring(map, x, y, w, h, code) {
  for (let dx = -1; dx <= w; dx++) {
    set(map, x + dx, y - 1, code);
    set(map, x + dx, y + h, code);
  }
  for (let dy = -1; dy <= h; dy++) {
    set(map, x - 1, y + dy, code);
    set(map, x + w, y + dy, code);
  }
}

function set(map, x, y, code) {
  if (!inBounds(map, x, y)) return;
  if (map[y][x] === TILE.GRASS) map[y][x] = code;
}

function inBounds(map, x, y) {
  return y >= 0 && y < map.length && x >= 0 && x < map[0].length;
}

function nearPath(map, x, y, r) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (!inBounds(map, x + dx, y + dy)) continue;
      if (map[y + dy][x + dx] === TILE.PATH) return true;
    }
  return false;
}
