import type { Pokemon } from '../data/pokedex';

export interface PartyMember {
  id: number;
  name: string;
  types: string[];
  caughtAt: number;
  hp?: number;
  maxHp?: number;
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
  inventory: { pokeball: number; berry: number; cut: number; rod: number };
  worldItems: Record<string, boolean>;
  cutTrees: Record<string, boolean>;
  defeatedTrainers: Record<string, boolean>;
  visitedCenter: number;
  starterChosen: boolean;
}

const KEY = 'pokapiya.save.v3';

const empty = (): TrainerState => ({
  trainer: { name: 'Addie', steps: 0 },
  team: [],
  box: [],
  pokedex: {},
  stats: { correct: 0, wrong: 0, caught: 0, encounters: 0 },
  inventory: { pokeball: 5, berry: 0, cut: 0, rod: 0 },
  worldItems: {},
  cutTrees: {},
  defeatedTrainers: {},
  visitedCenter: 0,
  starterChosen: false,
});

export function load(): TrainerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    const base = empty();
    return {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      inventory: { ...base.inventory, ...(parsed.inventory || {}) },
      worldItems: parsed.worldItems || {},
      cutTrees: parsed.cutTrees || {},
      defeatedTrainers: parsed.defeatedTrainers || {},
    };
  } catch {
    return empty();
  }
}

export function save(state: TrainerState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset(): TrainerState {
  localStorage.removeItem(KEY);
  return empty();
}

// Level = 1 + floor(correct/8). Capped at 20. Determines question difficulty.
export function getLevel(state: TrainerState): number {
  return Math.min(20, 1 + Math.floor(state.stats.correct / 8));
}

export function xpToNextLevel(state: TrainerState): { have: number; need: number } {
  const lvl = getLevel(state);
  const nextThreshold = lvl * 8;
  return { have: state.stats.correct, need: nextThreshold };
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
  const member: PartyMember = { id: pokemon.id, name: pokemon.name, types: pokemon.types, caughtAt: Date.now() };
  if (state.team.length < 6) state.team.push(member);
  else state.box.push(member);
  save(state);
}

export function recordAnswer(state: TrainerState, correct: boolean) {
  if (correct) state.stats.correct += 1; else state.stats.wrong += 1;
  save(state);
}

export function takeItem(state: TrainerState, x: number, y: number, type: string): boolean {
  const key = `${x},${y}`;
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

export function cutTree(state: TrainerState, x: number, y: number) {
  state.cutTrees[`${x},${y}`] = true;
  save(state);
}

export function defeatTrainer(state: TrainerState, id: string) {
  state.defeatedTrainers[id] = true;
  save(state);
}
