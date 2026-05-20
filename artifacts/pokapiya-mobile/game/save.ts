import AsyncStorage from '@react-native-async-storage/async-storage';
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

export type TrainerReward = 'cut' | 'rod' | 'pokeballs' | 'berries';

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
  oakSeen: boolean;
  playerPos: { x: number; y: number };
}

const KEY = 'pokapiya.mobile.save.v2';
export const SPAWN = { x: 5, y: 9 };

export const emptyState = (): TrainerState => ({
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
  oakSeen: false,
  playerPos: { ...SPAWN },
});

export async function loadState(): Promise<TrainerState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      inventory: { ...base.inventory, ...(parsed.inventory || {}) },
      worldItems: parsed.worldItems || {},
      cutTrees: parsed.cutTrees || {},
      defeatedTrainers: parsed.defeatedTrainers || {},
      playerPos: parsed.playerPos || { ...SPAWN },
    };
  } catch {
    return emptyState();
  }
}

export async function saveState(state: TrainerState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore write errors
  }
}

export async function resetState(): Promise<TrainerState> {
  await AsyncStorage.removeItem(KEY);
  return emptyState();
}

export function getLevel(state: TrainerState): number {
  return Math.min(20, 1 + Math.floor(state.stats.correct / 8));
}

export function xpToNextLevel(state: TrainerState): { have: number; need: number } {
  const lvl = getLevel(state);
  return { have: state.stats.correct, need: lvl * 8 };
}

export function recordEncounterMut(state: TrainerState, pokemon: Pokemon) {
  state.stats.encounters += 1;
  const entry = state.pokedex[pokemon.id] || { seen: false, caught: false, count: 0 };
  entry.seen = true;
  state.pokedex[pokemon.id] = entry;
}

export function recordCatchMut(state: TrainerState, pokemon: Pokemon) {
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
  };
  if (state.team.length < 6) state.team.push(member);
  else state.box.push(member);
}

export function recordAnswerMut(state: TrainerState, correct: boolean) {
  if (correct) state.stats.correct += 1;
  else state.stats.wrong += 1;
}

export function useBallMut(state: TrainerState): boolean {
  if ((state.inventory.pokeball || 0) <= 0) return false;
  state.inventory.pokeball -= 1;
  return true;
}

export function useBerryMut(state: TrainerState): boolean {
  if ((state.inventory.berry || 0) <= 0) return false;
  state.inventory.berry -= 1;
  return true;
}

export function healTeamMut(state: TrainerState) {
  const lvl = getLevel(state);
  for (const m of state.team) {
    m.maxHp = memberMaxHp(m, lvl);
    m.hp = m.maxHp;
  }
}

export function healAtCenterMut(state: TrainerState) {
  state.visitedCenter += 1;
  state.inventory.pokeball += 3;
  state.inventory.berry += 1;
  healTeamMut(state);
}

export function defeatTrainerMut(state: TrainerState, id: string) {
  state.defeatedTrainers[id] = true;
}

export const REWARD_LABELS: Record<TrainerReward, string> = {
  cut: '✂️ Cut HM',
  rod: '🎣 Fishing Rod',
  pokeballs: '5× Poké Balls',
  berries: '3× Berries',
};

export function awardRewardMut(state: TrainerState, reward: TrainerReward) {
  if (reward === 'cut') state.inventory.cut = 1;
  if (reward === 'rod') state.inventory.rod = 1;
  if (reward === 'pokeballs') state.inventory.pokeball += 5;
  if (reward === 'berries') state.inventory.berry += 3;
}
