// Hand-tuned procedural overworld. Returns a 2D grid of tile codes plus
// metadata about special locations (PokeCenter, signposts) so the WorldScene
// can place props on top.

export const TILE = {
  GRASS: 0,
  TALLGRASS: 1,
  TREE: 2,
  WATER: 3,
  PATH: 4,
  SAND: 5,
  FLOWER: 6,
  ROCK: 7
};

export const TILE_SIZE = 32;

const SOLID = new Set([TILE.TREE, TILE.WATER, TILE.ROCK]);
export const isSolid = code => SOLID.has(code);
export const isTallGrass = code => code === TILE.TALLGRASS;

export function generateMap(width = 48, height = 36, seed = 1) {
  // tiny seeded rng
  let s = seed >>> 0 || 1;
  const rng = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;

  const map = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.GRASS)
  );

  // Tree border with a little randomness for shape.
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

  // Lake in the upper left.
  splat(map, 7, 5, 6, 4, TILE.WATER, rng);
  ring(map, 7, 5, 6, 4, TILE.SAND);

  // Tall grass patches scattered.
  const patches = [
    [16, 8, 6, 4], [28, 6, 7, 5], [38, 10, 5, 6],
    [8,  20, 9, 4], [22, 22, 6, 5], [34, 24, 8, 6],
    [16, 30, 6, 3]
  ];
  for (const [x, y, w, h] of patches) splat(map, x, y, w, h, TILE.TALLGRASS, rng);

  // Crossroads of paths.
  const midY = Math.floor(height / 2);
  const midX = Math.floor(width / 2);
  for (let x = 2; x < width - 2; x++) map[midY][x] = TILE.PATH;
  for (let y = 2; y < height - 2; y++) map[y][midX] = TILE.PATH;

  // Sprinkle flowers and rocks for character.
  for (let i = 0; i < 60; i++) {
    const x = 2 + Math.floor(rng() * (width - 4));
    const y = 2 + Math.floor(rng() * (height - 4));
    if (map[y][x] === TILE.GRASS) map[y][x] = rng() < 0.7 ? TILE.FLOWER : TILE.ROCK;
  }

  // Sprinkle some inner trees as decoration but keep paths clear.
  for (let i = 0; i < 25; i++) {
    const x = 3 + Math.floor(rng() * (width - 6));
    const y = 3 + Math.floor(rng() * (height - 6));
    if (map[y][x] === TILE.GRASS && !nearPath(map, x, y, 2)) map[y][x] = TILE.TREE;
  }

  const features = {
    spawn: { x: midX, y: midY },
    pokeCenter: { x: midX, y: midY - 5 } // visual prop only in slice 1
  };

  return { map, width, height, features };
}

function splat(map, x, y, w, h, code, rng) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(map, nx, ny)) continue;
      // soft edges
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
