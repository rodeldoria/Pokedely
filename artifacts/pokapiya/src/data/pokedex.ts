export const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
export const SHINY_BASE  = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny';

export function spriteUrl(id: number, shiny = false) {
  return `${(shiny ? SHINY_BASE : SPRITE_BASE)}/${id}.png`;
}

export function backSpriteUrl(id: number) {
  return `${SPRITE_BASE}/back/${id}.png`;
}

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  rarity: number;
}

const KANTO: [number, string, string[], number][] = [
  [1,'Bulbasaur',['grass','poison'],2],[2,'Ivysaur',['grass','poison'],2],[3,'Venusaur',['grass','poison'],3],
  [4,'Charmander',['fire'],2],[5,'Charmeleon',['fire'],2],[6,'Charizard',['fire','flying'],3],
  [7,'Squirtle',['water'],2],[8,'Wartortle',['water'],2],[9,'Blastoise',['water'],3],
  [10,'Caterpie',['bug'],1],[11,'Metapod',['bug'],1],[12,'Butterfree',['bug','flying'],2],
  [13,'Weedle',['bug','poison'],1],[14,'Kakuna',['bug','poison'],1],[15,'Beedrill',['bug','poison'],2],
  [16,'Pidgey',['normal','flying'],1],[17,'Pidgeotto',['normal','flying'],2],[18,'Pidgeot',['normal','flying'],2],
  [19,'Rattata',['normal'],1],[20,'Raticate',['normal'],2],
  [21,'Spearow',['normal','flying'],1],[22,'Fearow',['normal','flying'],2],
  [23,'Ekans',['poison'],1],[24,'Arbok',['poison'],2],
  [25,'Pikachu',['electric'],2],[26,'Raichu',['electric'],3],
  [27,'Sandshrew',['ground'],1],[28,'Sandslash',['ground'],2],
  [29,'Nidoran-f',['poison'],1],[30,'Nidorina',['poison'],2],[31,'Nidoqueen',['poison','ground'],3],
  [32,'Nidoran-m',['poison'],1],[33,'Nidorino',['poison'],2],[34,'Nidoking',['poison','ground'],3],
  [35,'Clefairy',['fairy'],2],[36,'Clefable',['fairy'],3],
  [37,'Vulpix',['fire'],2],[38,'Ninetales',['fire'],3],
  [39,'Jigglypuff',['normal','fairy'],1],[40,'Wigglytuff',['normal','fairy'],2],
  [41,'Zubat',['poison','flying'],1],[42,'Golbat',['poison','flying'],2],
  [43,'Oddish',['grass','poison'],1],[44,'Gloom',['grass','poison'],2],[45,'Vileplume',['grass','poison'],3],
  [46,'Paras',['bug','grass'],1],[47,'Parasect',['bug','grass'],2],
  [48,'Venonat',['bug','poison'],1],[49,'Venomoth',['bug','poison'],2],
  [50,'Diglett',['ground'],1],[51,'Dugtrio',['ground'],2],
  [52,'Meowth',['normal'],1],[53,'Persian',['normal'],2],
  [54,'Psyduck',['water'],1],[55,'Golduck',['water'],2],
  [56,'Mankey',['fighting'],1],[57,'Primeape',['fighting'],2],
  [58,'Growlithe',['fire'],2],[59,'Arcanine',['fire'],3],
  [60,'Poliwag',['water'],1],[61,'Poliwhirl',['water'],2],[62,'Poliwrath',['water','fighting'],3],
  [63,'Abra',['psychic'],2],[64,'Kadabra',['psychic'],2],[65,'Alakazam',['psychic'],3],
  [66,'Machop',['fighting'],1],[67,'Machoke',['fighting'],2],[68,'Machamp',['fighting'],3],
  [69,'Bellsprout',['grass','poison'],1],[70,'Weepinbell',['grass','poison'],2],[71,'Victreebel',['grass','poison'],3],
  [72,'Tentacool',['water','poison'],1],[73,'Tentacruel',['water','poison'],2],
  [74,'Geodude',['rock','ground'],1],[75,'Graveler',['rock','ground'],2],[76,'Golem',['rock','ground'],3],
  [77,'Ponyta',['fire'],2],[78,'Rapidash',['fire'],3],
  [79,'Slowpoke',['water','psychic'],1],[80,'Slowbro',['water','psychic'],2],
  [81,'Magnemite',['electric','steel'],1],[82,'Magneton',['electric','steel'],2],
  [83,"Farfetch'd",['normal','flying'],2],
  [84,'Doduo',['normal','flying'],1],[85,'Dodrio',['normal','flying'],2],
  [86,'Seel',['water'],1],[87,'Dewgong',['water','ice'],2],
  [88,'Grimer',['poison'],1],[89,'Muk',['poison'],2],
  [90,'Shellder',['water'],1],[91,'Cloyster',['water','ice'],3],
  [92,'Gastly',['ghost','poison'],2],[93,'Haunter',['ghost','poison'],2],[94,'Gengar',['ghost','poison'],3],
  [95,'Onix',['rock','ground'],2],
  [96,'Drowzee',['psychic'],1],[97,'Hypno',['psychic'],2],
  [98,'Krabby',['water'],1],[99,'Kingler',['water'],2],
  [100,'Voltorb',['electric'],1],[101,'Electrode',['electric'],2],
  [102,'Exeggcute',['grass','psychic'],1],[103,'Exeggutor',['grass','psychic'],3],
  [104,'Cubone',['ground'],2],[105,'Marowak',['ground'],2],
  [106,'Hitmonlee',['fighting'],3],[107,'Hitmonchan',['fighting'],3],
  [108,'Lickitung',['normal'],2],
  [109,'Koffing',['poison'],1],[110,'Weezing',['poison'],2],
  [111,'Rhyhorn',['ground','rock'],2],[112,'Rhydon',['ground','rock'],3],
  [113,'Chansey',['normal'],3],
  [114,'Tangela',['grass'],2],
  [115,'Kangaskhan',['normal'],3],
  [116,'Horsea',['water'],1],[117,'Seadra',['water'],2],
  [118,'Goldeen',['water'],1],[119,'Seaking',['water'],2],
  [120,'Staryu',['water'],1],[121,'Starmie',['water','psychic'],3],
  [122,'Mr-mime',['psychic','fairy'],3],
  [123,'Scyther',['bug','flying'],3],
  [124,'Jynx',['ice','psychic'],3],
  [125,'Electabuzz',['electric'],3],
  [126,'Magmar',['fire'],3],
  [127,'Pinsir',['bug'],3],
  [128,'Tauros',['normal'],3],
  [129,'Magikarp',['water'],1],[130,'Gyarados',['water','flying'],3],
  [131,'Lapras',['water','ice'],3],
  [132,'Ditto',['normal'],3],
  [133,'Eevee',['normal'],2],
  [134,'Vaporeon',['water'],3],[135,'Jolteon',['electric'],3],[136,'Flareon',['fire'],3],
  [196,'Espeon',['psychic'],3],[197,'Umbreon',['dark'],3],
  [470,'Leafeon',['grass'],3],[471,'Glaceon',['ice'],3],[700,'Sylveon',['fairy'],3],
];

export function pickByType(...wantedTypes: string[]): Pokemon {
  const matches = KANTO.filter(p => p[2].some(t => wantedTypes.includes(t)));
  if (matches.length === 0) return pickRandom();
  const weights = matches.map(p => ({ tier: p[3], row: p }));
  const totalWeight = weights.reduce((s, w) => s + (w.tier === 1 ? 4 : w.tier === 2 ? 2 : 1), 0);
  let r = Math.random() * totalWeight;
  for (const w of weights) {
    r -= (w.tier === 1 ? 4 : w.tier === 2 ? 2 : 1);
    if (r <= 0) {
      const [id, name, types, rarity] = w.row;
      return { id, name, types, rarity };
    }
  }
  const [id, name, types, rarity] = matches[0];
  return { id, name, types, rarity };
}

export function byId(id: number): Pokemon | null {
  const row = KANTO.find(p => p[0] === id);
  if (!row) return null;
  return { id: row[0], name: row[1], types: row[2], rarity: row[3] };
}

// Classic early-Kanto Route 1 / Viridian Forest spawn table.
// Common: Pidgey, Rattata, Caterpie, Weedle. Uncommon: Pikachu, Nidoran, Bellsprout, Oddish.
// Rare cameos: Eevee, Clefairy, Jigglypuff, starters in the wild.
const EARLY_KANTO_SPAWNS: { id: number; weight: number }[] = [
  { id: 16, weight: 22 }, // Pidgey
  { id: 19, weight: 22 }, // Rattata
  { id: 10, weight: 16 }, // Caterpie
  { id: 13, weight: 16 }, // Weedle
  { id: 21, weight: 10 }, // Spearow
  { id: 25, weight: 6 },  // Pikachu (uncommon)
  { id: 29, weight: 5 },  // Nidoran-f
  { id: 32, weight: 5 },  // Nidoran-m
  { id: 43, weight: 5 },  // Oddish
  { id: 69, weight: 5 },  // Bellsprout
  { id: 39, weight: 3 },  // Jigglypuff
  { id: 35, weight: 3 },  // Clefairy
  { id: 133, weight: 2 }, // Eevee (rare)
  { id: 1,  weight: 1 },  // Bulbasaur (very rare)
  { id: 4,  weight: 1 },  // Charmander (very rare)
  { id: 7,  weight: 1 },  // Squirtle (very rare)
];

export function pickEarlyKanto(): Pokemon {
  const total = EARLY_KANTO_SPAWNS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EARLY_KANTO_SPAWNS) {
    r -= e.weight;
    if (r <= 0) return byId(e.id) || byId(16)!;
  }
  return byId(16)!;
}

// Biome-specific picker used by the multi-zone overworld.
export function pickForZone(zoneId: string): Pokemon {
  switch (zoneId) {
    case 'meadow':   return pickByType('bug', 'grass');
    case 'mountain': return pickByType('rock', 'ground', 'flying');
    case 'cave':     return pickByType('rock', 'ghost', 'poison');
    case 'town':
    default:         return pickEarlyKanto();
  }
}

export function pickRandom(): Pokemon {
  const weights = KANTO.map(p => ({ tier: p[3], row: p }));
  const totalWeight = weights.reduce((s, w) => s + (w.tier === 1 ? 5 : w.tier === 2 ? 2 : 1), 0);
  let r = Math.random() * totalWeight;
  for (const w of weights) {
    r -= (w.tier === 1 ? 5 : w.tier === 2 ? 2 : 1);
    if (r <= 0) {
      const [id, name, types, rarity] = w.row;
      return { id, name, types, rarity };
    }
  }
  return byId(1)!;
}

export function displayName(p: { name: string }): string {
  return p.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
