// Simple localStorage save layer for the trainer's progress.

const KEY = 'pokapiya.save.v1';

const empty = () => ({
  trainer: { name: 'Trainer', steps: 0 },
  team: [],      // active party, up to 6: { id, nickname, caughtAt }
  box:  [],      // overflow storage
  pokedex: {},   // id -> { seen: true, caught: bool, count }
  stats: { correct: 0, wrong: 0, caught: 0, encounters: 0 }
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset() {
  localStorage.removeItem(KEY);
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
