import type { Pokemon } from '../data/pokedex';

export interface TrainerState {
  trainer: { name: string; steps: number };
  team: Array<{ id: number; name: string; types: string[]; caughtAt: number }>;
  box: Array<{ id: number; name: string; types: string[]; caughtAt: number }>;
  pokedex: Record<number, { seen: boolean; caught: boolean; count: number }>;
  stats: { correct: number; wrong: number; caught: number; encounters: number };
  inventory: { pokeball: number; berry: number };
  worldItems: Record<string, boolean>;
  visitedCenter: number;
}

const KEY = 'pokapiya.save.v2';

const empty = (): TrainerState => ({
  trainer: { name: 'Addie', steps: 0 },
  team: [],
  box: [],
  pokedex: {},
  stats: { correct: 0, wrong: 0, caught: 0, encounters: 0 },
  inventory: { pokeball: 5, berry: 0 },
  worldItems: {},
  visitedCenter: 0,
});

export function load(): TrainerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      ...empty(),
      ...parsed,
      stats: { ...empty().stats, ...(parsed.stats || {}) },
      inventory: { ...empty().inventory, ...(parsed.inventory || {}) },
      worldItems: parsed.worldItems || {},
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
  entry.caught = true;
  entry.count = (entry.count || 0) + 1;
  state.pokedex[pokemon.id] = entry;
  const member = { id: pokemon.id, name: pokemon.name, types: pokemon.types, caughtAt: Date.now() };
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
  (state.inventory as Record<string, number>)[type] = ((state.inventory as Record<string, number>)[type] || 0) + 1;
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
  save(state);
}
