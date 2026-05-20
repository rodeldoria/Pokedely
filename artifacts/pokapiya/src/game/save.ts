import type { Pokemon } from '../data/pokedex';
import { ZONE_IDS, type ZoneId } from './world';

export interface PartyMember {
  id: number;
  name: string;
  types: string[];
  caughtAt: number;
  hp?: number;
  maxHp?: number;
  // Trainer's stats.correct at the time this Pokémon was caught. Used to
  // measure XP progress toward evolution (see game/evolution.ts).
  correctAtCatch?: number;
}

export function memberMaxHp(_m: PartyMember, trainerLevel: number): number {
  return 50 + trainerLevel * 6;
}

export function ensureMemberHp(m: PartyMember, trainerLevel: number) {
  const max = memberMaxHp(m, trainerLevel);
  if (typeof m.maxHp !== 'number') m.maxHp = max;
  if (typeof m.hp !== 'number') m.hp = m.maxHp;
}

export function healTeam(state: TrainerState) {
  const lvl = getLevel(state);
  for (const m of state.team) {
    m.maxHp = memberMaxHp(m, lvl);
    m.hp = m.maxHp;
  }
  save(state);
}

export interface TrainerState {
  trainer: { name: string; steps: number };
  team: PartyMember[];
  box: PartyMember[];
  pokedex: Record<number, { seen: boolean; caught: boolean; count: number }>;
  stats: { correct: number; wrong: number; caught: number; encounters: number };
  inventory: { pokeball: number; berry: number; cut: number; rod: number; coin: number; lumber: number; stone: number; seed: number };
  // Tile-scoped maps. Keys are namespaced as `${zoneId}:${x},${y}` so the
  // same coordinates in different zones don't collide.
  worldItems: Record<string, boolean>;
  cutTrees: Record<string, boolean>;
  defeatedTrainers: Record<string, boolean>;
  visitedCenter: number;
  starterChosen: boolean;
  currentZone: ZoneId;
}

const KEY = 'pokapiya.save.v4';
const LEGACY_KEY_V3 = 'pokapiya.save.v3';

const empty = (): TrainerState => ({
  trainer: { name: 'Addie', steps: 0 },
  team: [],
  box: [],
  pokedex: {},
  stats: { correct: 0, wrong: 0, caught: 0, encounters: 0 },
  inventory: { pokeball: 5, berry: 0, cut: 0, rod: 0, coin: 0, lumber: 0, stone: 0, seed: 0 },
  worldItems: {},
  cutTrees: {},
  defeatedTrainers: {},
  visitedCenter: 0,
  starterChosen: false,
  currentZone: 'town',
});

// Migration: rewrite legacy unprefixed `x,y` tile keys to `town:x,y`.
function migrateTileKeys(rec: Record<string, boolean> | undefined): Record<string, boolean> {
  if (!rec) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (k.includes(':')) out[k] = v;
    else out[`town:${k}`] = v;
  }
  return out;
}

export function load(): TrainerState {
  try {
    let raw = localStorage.getItem(KEY);
    let migratedFromV3 = false;
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEY_V3);
      migratedFromV3 = !!raw;
    }
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    const base = empty();
    const merged: TrainerState = {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      inventory: { ...base.inventory, ...(parsed.inventory || {}) },
      worldItems: migrateTileKeys(parsed.worldItems),
      cutTrees: migrateTileKeys(parsed.cutTrees),
      defeatedTrainers: parsed.defeatedTrainers || {},
      currentZone: ZONE_IDS.includes(parsed.currentZone) ? (parsed.currentZone as ZoneId) : 'town',
    };
    if (migratedFromV3) {
      // Persist the migrated state under the v4 key so we don't redo this.
      save(merged);
      try { localStorage.removeItem(LEGACY_KEY_V3); } catch {}
    }
    return merged;
  } catch {
    return empty();
  }
}

export function save(state: TrainerState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset(): TrainerState {
  localStorage.removeItem(KEY);
  try { localStorage.removeItem(LEGACY_KEY_V3); } catch {}
  return empty();
}

// XP per level (smaller = faster leveling for a 6 year old)
const XP_PER_LEVEL = 4;

// Level = 1 + floor(xp/XP_PER_LEVEL). Capped at 20.
export function getLevel(state: TrainerState): number {
  return Math.min(20, 1 + Math.floor(state.stats.correct / XP_PER_LEVEL));
}

export function xpToNextLevel(state: TrainerState): { have: number; need: number } {
  const lvl = getLevel(state);
  const nextThreshold = lvl * XP_PER_LEVEL;
  return { have: state.stats.correct, need: nextThreshold };
}

// Grant XP (used for battle wins and catches, not just questions).
export function grantXp(state: TrainerState, amount: number) {
  state.stats.correct += amount;
  save(state);
}

export function recordEncounter(state: TrainerState, pokemon: Pokemon) {
  state.stats.encounters += 1;
  const entry = state.pokedex[pokemon.id] || { seen: false, caught: false, count: 0 };
  entry.seen = true;
  state.pokedex[pokemon.id] = entry;
  save(state);
}

export function recordCatch(state: TrainerState, pokemon: Pokemon) {
  state.stats.caught += 1;
  const entry = state.pokedex[pokemon.id] || { seen: true, caught: false, count: 0 };
  entry.seen = true;
  entry.caught = true;
  entry.count = (entry.count || 0) + 1;
  state.pokedex[pokemon.id] = entry;
  const member: PartyMember = {
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types,
    caughtAt: Date.now(),
    correctAtCatch: state.stats.correct
  };
  if (state.team.length < 6) state.team.push(member);
  else state.box.push(member);
  save(state);
}

export function recordAnswer(state: TrainerState, correct: boolean) {
  if (correct) state.stats.correct += 1; else state.stats.wrong += 1;
  save(state);
}

export function takeItem(state: TrainerState, zoneId: ZoneId, x: number, y: number, type: string): boolean {
  const key = `${zoneId}:${x},${y}`;
  if (state.worldItems[key]) return false;
  state.worldItems[key] = true;
  const inv = state.inventory as Record<string, number>;
  inv[type] = (inv[type] || 0) + 1;
  save(state);
  return true;
}

export function useBall(state: TrainerState): boolean {
  if ((state.inventory.pokeball || 0) <= 0) return false;
  state.inventory.pokeball -= 1;
  save(state);
  return true;
}

export function useBerry(state: TrainerState): boolean {
  if ((state.inventory.berry || 0) <= 0) return false;
  state.inventory.berry -= 1;
  save(state);
  return true;
}

export function healAtCenter(state: TrainerState) {
  state.visitedCenter += 1;
  state.inventory.pokeball += 3;
  state.inventory.berry += 1;
  healTeam(state);
  save(state);
}

export function cutTree(state: TrainerState, zoneId: ZoneId, x: number, y: number) {
  state.cutTrees[`${zoneId}:${x},${y}`] = true;
  save(state);
}

export function setZone(state: TrainerState, zoneId: ZoneId) {
  state.currentZone = zoneId;
  save(state);
}

export function defeatTrainer(state: TrainerState, id: string) {
  state.defeatedTrainers[id] = true;
  save(state);
}

export function earnCoins(state: TrainerState, n: number) {
  state.inventory.coin = (state.inventory.coin || 0) + n;
  save(state);
}

export function spendCoins(state: TrainerState, n: number): boolean {
  if ((state.inventory.coin || 0) < n) return false;
  state.inventory.coin -= n;
  save(state);
  return true;
}

export function craft(state: TrainerState, recipeId: string): boolean {
  const inv = state.inventory;
  switch (recipeId) {
    case 'fence':
      if (inv.lumber < 2) return false;
      inv.lumber -= 2;
      inv.coin += 3;
      save(state);
      return true;
    case 'path':
      if (inv.stone < 2) return false;
      inv.stone -= 2;
      inv.coin += 3;
      save(state);
      return true;
    case 'berry-tree':
      if (inv.seed < 1 || inv.lumber < 1) return false;
      inv.seed -= 1;
      inv.lumber -= 1;
      inv.berry += 2;
      save(state);
      return true;
    case 'sell-berry':
      if (inv.berry < 1) return false;
      inv.berry -= 1;
      inv.coin += 5;
      save(state);
      return true;
    case 'buy-pokeball':
      if (inv.coin < 8) return false;
      inv.coin -= 8;
      inv.pokeball += 1;
      save(state);
      return true;
    case 'buy-berry':
      if (inv.coin < 5) return false;
      inv.coin -= 5;
      inv.berry += 1;
      save(state);
      return true;
    default:
      return false;
  }
}
