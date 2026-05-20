import type { TrainerReward } from './save';

export const TILE = {
  GRASS: 0,
  TALLGRASS: 1,
  TREE: 2,
  WATER: 3,
  PATH: 4,
  FLOWER: 5,
  ROCK: 6,
  PC_WALL: 7,
  PC_DOOR: 8,
  SAND: 9,
} as const;

export type TileCode = (typeof TILE)[keyof typeof TILE];

export const SOLID = new Set<TileCode>([TILE.TREE, TILE.WATER, TILE.ROCK, TILE.PC_WALL]);
export const isSolid = (t: TileCode) => SOLID.has(t);
export const isTallGrass = (t: TileCode) => t === TILE.TALLGRASS;
export const isPokeCenter = (t: TileCode) => t === TILE.PC_DOOR;

export interface MobileTrainer {
  id: string;
  name: string;
  tx: number;
  ty: number;
  pokemonId: number;
  greet: string;
  reward: TrainerReward;
  emoji: string;
}

// Compact 11x16 hand-built map. Mirrors web flow: trainers w/ rewards,
// a Pokémon Center, tall grass patches, water, trees, sand.
//
// Symbols used while authoring:  .=grass  ,=flower  T=tree  R=rock
//   G=tallgrass  W=water  S=sand  P=path  H=PC wall  D=PC door
const RAW: string[] = [
  'TTTTTTTTTTT',
  'T..,...GGGT',
  'T.GG.P.GGGT',
  'T.GG.P...HT',
  'T....PHHHHT',
  'T.,..PDHHHT',
  'T....P....T',
  'TTTTPPPPPPT',
  'T.GGP.....T',
  'T.GGP.,...T',
  'T...P.....T',
  'T...P.,GGGT',
  'TRRRP..GGGT',
  'TRRSP.....T',
  'TWWSS.....T',
  'TTTTTTTTTTT',
];

function parse(): TileCode[][] {
  const map: TileCode[][] = [];
  for (const row of RAW) {
    const out: TileCode[] = [];
    for (const ch of row) {
      switch (ch) {
        case '.': out.push(TILE.GRASS); break;
        case ',': out.push(TILE.FLOWER); break;
        case 'T': out.push(TILE.TREE); break;
        case 'R': out.push(TILE.ROCK); break;
        case 'G': out.push(TILE.TALLGRASS); break;
        case 'W': out.push(TILE.WATER); break;
        case 'S': out.push(TILE.SAND); break;
        case 'P': out.push(TILE.PATH); break;
        case 'H': out.push(TILE.PC_WALL); break;
        case 'D': out.push(TILE.PC_DOOR); break;
        default: out.push(TILE.GRASS);
      }
    }
    map.push(out);
  }
  return map;
}

export const WORLD_MAP: TileCode[][] = parse();
export const WORLD_W = WORLD_MAP[0].length;
export const WORLD_H = WORLD_MAP.length;

export const TRAINERS: MobileTrainer[] = [
  { id: 'hiker_joe',  name: 'Hiker Joe',  tx: 2,  ty: 12, pokemonId: 74, greet: "Yo! Battle me, lil' trainer!",     reward: 'cut',       emoji: '🥾' },
  { id: 'fisher_mac', name: 'Fisher Mac', tx: 5,  ty: 14, pokemonId: 60, greet: 'Reel one in! Wanna battle?',        reward: 'rod',       emoji: '🎣' },
  { id: 'camper_sue', name: 'Camper Sue', tx: 8,  ty: 11, pokemonId: 25, greet: 'My Pikachu is super strong!',       reward: 'pokeballs', emoji: '⛺' },
  { id: 'lass_lily',  name: 'Lass Lily',  tx: 8,  ty: 2,  pokemonId: 35, greet: "Hi! Let's have a fairy battle!",    reward: 'berries',   emoji: '🌸' },
];

export function tileAt(x: number, y: number): TileCode | undefined {
  return WORLD_MAP[y]?.[x];
}

export function trainerAt(x: number, y: number): MobileTrainer | undefined {
  return TRAINERS.find((t) => t.tx === x && t.ty === y);
}

export function adjacentTrainer(
  x: number,
  y: number,
  defeated: Record<string, boolean>,
): MobileTrainer | undefined {
  const checks = [
    [0, 0], [0, -1], [0, 1], [-1, 0], [1, 0],
  ];
  for (const [dx, dy] of checks) {
    const t = trainerAt(x + dx, y + dy);
    if (t && !defeated[t.id]) return t;
  }
  return undefined;
}
