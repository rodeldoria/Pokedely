import bank from './questions-generated.json';
import type { Pokemon } from './pokedex';

interface Question {
  prompt: string;
  choices: string[];
  answerIndex: number;
  subject: string;
  hint?: string;
}

interface Bank {
  generated_by: string;
  categories: Record<string, Question[]>;
}

const typedBank = bank as Bank;
const pickOne = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffleChoices(q: Question): Question {
  const indexed = q.choices.map((c, i) => ({ c, i }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const correctNew = indexed.findIndex(p => p.i === q.answerIndex);
  return { ...q, choices: indexed.map(p => p.c), answerIndex: correctNew };
}

const TYPE_TO_CATEGORY: Record<string, string[]> = {
  grass: ['animals', 'science', 'spelling', 'addie'],
  bug:   ['animals', 'spelling', 'counting'],
  water: ['animals', 'science', 'categorize'],
  fire:  ['colors',  'science', 'opposites'],
  electric: ['science', 'patterns', 'math', 'addie'],
  ice:    ['science', 'opposites', 'colors'],
  steel:  ['shapes',  'patterns', 'math'],
  rock:   ['shapes',  'science', 'categorize'],
  ground: ['science', 'shapes',  'counting'],
  flying: ['animals', 'patterns','reading'],
  fighting: ['math',  'subtraction', 'opposites'],
  poison: ['categorize', 'opposites', 'colors'],
  psychic: ['patterns', 'alphabet', 'reading'],
  ghost:  ['rhymes',   'alphabet',   'patterns'],
  dragon: ['math',     'subtraction','reading'],
  fairy:  ['rhymes',   'spelling',   'colors', 'addie'],
  normal: ['spelling', 'counting',   'animals', 'addie'],
  dark:   ['opposites','rhymes',     'alphabet'],
};

const ALL_CATEGORIES = Object.keys(typedBank.categories);

export function questionFor(pokemon: Pokemon, difficultyBoost = 0): Question {
  const primary = pokemon?.types?.[0] || 'normal';
  const tier = (pokemon?.rarity || 1) + difficultyBoost;
  const candidates = TYPE_TO_CATEGORY[primary] || ['spelling', 'counting', 'math'];
  let categoryKey: string;
  if (tier >= 3 && Math.random() < 0.35) {
    categoryKey = pickOne(['reading', 'math', 'subtraction', 'alphabet']);
  } else {
    categoryKey = pickOne(candidates);
  }
  if (!typedBank.categories[categoryKey] || typedBank.categories[categoryKey].length === 0) {
    categoryKey = pickOne(ALL_CATEGORIES);
  }
  const q = pickOne(typedBank.categories[categoryKey]);
  return shuffleChoices(q);
}
