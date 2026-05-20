// Simple localStorage save layer for the trainer's progress.

const KEY = 'pokapiya.save.v2';
const OLD_KEY = 'pokapiya.save.v1';

const empty = () => ({
  trainer: { name: 'Trainer', steps: 0 },
  team: [],
  box:  [],
  pokedex: {},
  stats: { correct: 0, wrong: 0, caught: 0, encounters: 0 },
  inventory: { pokeball: 5, berry: 0 },
  worldItems: {}, // 'x,y' -> true if already picked up
  visitedCenter: 0
});

export function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      const old = localStorage.getItem(OLD_KEY);
      if (old) raw = old;
    }
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed,
      stats: { ...empty().stats, ...(parsed.stats || {}) },
      inventory: { ...empty().inventory, ...(parsed.inventory || {}) },
      worldItems: parsed.worldItems || {}
    };
  } catch {
    return empty();
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(OLD_KEY);
  return empty();
}

export function recordEncounter(state, pokemon) {
  state.stats.encounters += 1;
  const entry = state.pokedex[pokemon.id] || { seen: false, caught: false, count: 0 };
  entry.seen = true;
  state.pokedex[pokemon.id] = entry;
  save(state);
}

export function recordCatch(state, pokemon) {
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

export function recordAnswer(state, correct) {
  if (correct) state.stats.correct += 1; else state.stats.wrong += 1;
  save(state);
}

export function takeItem(state, x, y, type) {
  const key = `${x},${y}`;
  if (state.worldItems[key]) return false;
  state.worldItems[key] = true;
  state.inventory[type] = (state.inventory[type] || 0) + 1;
  save(state);
  return true;
}

export function useBall(state) {
  if ((state.inventory.pokeball || 0) <= 0) return false;
  state.inventory.pokeball -= 1;
  save(state);
  return true;
}

export function useBerry(state) {
  if ((state.inventory.berry || 0) <= 0) return false;
  state.inventory.berry -= 1;
  save(state);
  return true;
}

export function healAtCenter(state) {
  state.visitedCenter += 1;
  state.inventory.pokeball += 3;
  state.inventory.berry   += 1;
  save(state);
}
