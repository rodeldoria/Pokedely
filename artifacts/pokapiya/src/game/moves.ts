// Pokémon-as-tools: each move is taught by Pokémon whose type matches.
// The player "knows" a move whenever a Pokémon of the right type is in their
// party. Slice 6 wires Cut/Plant/Smash into the field-action UI; Slice 7+
// will plug additional canvas hooks (right now Cut is already canvas-wired,
// the others surface only in the Moves modal as a teaching layer).

import type { TrainerState } from './save';

export interface FieldMove {
  id: string;
  name: string;
  emoji: string;
  description: string;
  teacherType: string;  // type that teaches this move
  teacherExamples: string[]; // a few species names for the kid
  unlocked: (state: TrainerState) => boolean;
}

function hasType(state: TrainerState, type: string): boolean {
  return state.team.some(m => m.types.includes(type));
}

export const FIELD_MOVES: FieldMove[] = [
  {
    id: 'cut',
    name: 'Cut',
    emoji: '✂️',
    description: 'Chop down trees blocking your path. Yields Lumber for crafting.',
    teacherType: 'bug',
    teacherExamples: ['Scyther', 'Pinsir', 'Beedrill', 'Butterfree'],
    unlocked: s => hasType(s, 'bug') || (s.inventory.cut || 0) > 0
  },
  {
    id: 'plant',
    name: 'Plant',
    emoji: '🌱',
    description: 'Plant a sapling on an empty tile. Comes back as a Berry tree!',
    teacherType: 'grass',
    teacherExamples: ['Bulbasaur', 'Oddish', 'Bellsprout', 'Tangela'],
    unlocked: s => hasType(s, 'grass')
  },
  {
    id: 'smash',
    name: 'Rock Smash',
    emoji: '💥',
    description: 'Smash boulders blocking the way. Yields Stone.',
    teacherType: 'fighting',
    teacherExamples: ['Machop', 'Hitmonlee', 'Hitmonchan', 'Mankey'],
    unlocked: s => hasType(s, 'fighting') || hasType(s, 'rock')
  },
  {
    id: 'water',
    name: 'Water',
    emoji: '💧',
    description: 'Water a dry seed to make it sprout faster, or fill a tiny pond.',
    teacherType: 'water',
    teacherExamples: ['Squirtle', 'Poliwag', 'Magikarp', 'Tentacool'],
    unlocked: s => hasType(s, 'water')
  },
  {
    id: 'spark',
    name: 'Spark',
    emoji: '⚡',
    description: 'Power up dim lamps and Poké Center machines. (Story use.)',
    teacherType: 'electric',
    teacherExamples: ['Pikachu', 'Voltorb', 'Magnemite', 'Electabuzz'],
    unlocked: s => hasType(s, 'electric')
  },
  {
    id: 'fly',
    name: 'Fly',
    emoji: '🪶',
    description: 'Scout the map from above. (Story use.)',
    teacherType: 'flying',
    teacherExamples: ['Pidgey', 'Spearow', 'Charizard', 'Dragonite'],
    unlocked: s => hasType(s, 'flying')
  }
];

// Pick the first unlocked teacher in the party for a given move, so the
// field-action UI can show "Scyther uses Cut!" with the right Pokémon.
export function teacherFor(state: TrainerState, moveId: string): { id: number; name: string } | null {
  const move = FIELD_MOVES.find(m => m.id === moveId);
  if (!move) return null;
  const member = state.team.find(m => m.types.includes(move.teacherType));
  if (!member) return null;
  return { id: member.id, name: member.name };
}
