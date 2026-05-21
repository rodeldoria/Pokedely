import bank from './questions-generated.json';
import type { Pokemon } from './pokedex';

export interface Question {
  prompt: string;
  choices: string[];
  answerIndex: number;
  subject: string;
  hint?: string;
  // 'choice' (default) shows multiple-choice buttons. 'spell' shows a picture
  // (emoji) and Addie types the answer. 'fraction' shows a pie chart with
  // `fractionNum` slices of `fractionDen` shaded, then uses the normal
  // multiple-choice UI for picking the matching fraction (e.g. "1/4").
  // For 'spell', `answer` is the expected word (case-insensitive); `image`
  // is the emoji to display. `choices` should be a single-element array
  // `[answer]` so existing feedback like "the answer was …" still works.
  kind?: 'choice' | 'spell' | 'fraction';
  image?: string;
  answer?: string;
  fractionNum?: number;
  fractionDen?: number;
}

interface Bank {
  generated_by: string;
  categories: Record<string, Question[]>;
}

const typedBank = bank as Bank;
const pickOne = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffleChoices(q: Question): Question {
  // Don't shuffle "spell the picture" questions — they only have one answer
  // and we'd lose nothing, but it also keeps the JSON authoring trivial.
  if (q.kind === 'spell') return q;
  const indexed = q.choices.map((c, i) => ({ c, i }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const correctNew = indexed.findIndex(p => p.i === q.answerIndex);
  return { ...q, choices: indexed.map(p => p.c), answerIndex: correctNew };
}

// Categories sorted by approximate difficulty. Slice 5 added second-grade
// material — multiplication, planets, bugs, computer_science, and
// reading-with-stories — so MEDIUM and HARD got pulled in to match.
const EASY = ['colors', 'shapes', 'counting', 'animals', 'opposites', 'addie', 'family', 'spell_picture'];
const MEDIUM = [
  'spelling', 'alphabet', 'rhymes', 'patterns', 'categorize', 'science',
  'bugs', 'planets', 'fractions'
];
const HARD = [
  'math', 'subtraction', 'reading',
  'multiplication', 'computer_science', 'reading_stories', 'fractions'
];

// 'family' is intentionally added to nearly every type so the safety
// questions (home address, parents' phone numbers, full names, what to
// do when lost) come up regularly no matter what wild Pokémon Addie
// is battling. These are real-world safety facts she needs to know.
const TYPE_TO_CATEGORY: Record<string, string[]> = {
  grass:   ['animals','science','spelling','addie','bugs','family','spell_picture','fractions'],
  bug:     ['animals','spelling','counting','bugs','science','family','spell_picture'],
  water:   ['animals','science','categorize','reading_stories','family','spell_picture','fractions'],
  fire:    ['colors','science','opposites','planets','family','spell_picture','fractions'],
  electric:['science','patterns','math','addie','computer_science','multiplication','family','fractions'],
  ice:     ['science','opposites','colors','planets','family','spell_picture','fractions'],
  steel:   ['shapes','patterns','math','computer_science','multiplication','family','fractions'],
  rock:    ['shapes','science','categorize','planets','family','fractions'],
  ground:  ['science','shapes','counting','bugs','family','spell_picture','fractions'],
  flying:  ['animals','patterns','reading','reading_stories','family','spell_picture'],
  fighting:['math','subtraction','opposites','multiplication','family','fractions'],
  poison:  ['categorize','opposites','colors','bugs','family','spell_picture'],
  psychic: ['patterns','alphabet','reading','computer_science','reading_stories','family','fractions'],
  ghost:   ['rhymes','alphabet','patterns','computer_science','family','fractions'],
  dragon:  ['math','subtraction','reading','multiplication','reading_stories','family','fractions'],
  fairy:   ['rhymes','spelling','colors','addie','family','spell_picture'],
  normal:  ['spelling','counting','animals','addie','reading_stories','family','spell_picture','fractions'],
  dark:    ['opposites','rhymes','alphabet','computer_science','family','fractions'],
};

const ALL_CATEGORIES = Object.keys(typedBank.categories);

// level: 1 (easiest, age 5-6) up to 20 (hardest)
// At low levels, only easy categories. As level rises, medium and hard categories unlock.
export function questionFor(pokemon: Pokemon, level = 1): Question {
  const primary = pokemon?.types?.[0] || 'normal';
  let typed = TYPE_TO_CATEGORY[primary] || ['spelling','counting','math'];

  // Filter by difficulty unlocked at this level. Curve tightened so the game
  // ramps up sooner — MEDIUM at Lv 2, HARD at Lv 5 — and biases harder
  // categories more aggressively once they're unlocked.
  let allowedDifficulty: string[];
  if (level <= 1) allowedDifficulty = EASY;
  else if (level <= 4) allowedDifficulty = [...EASY, ...MEDIUM];
  else allowedDifficulty = [...EASY, ...MEDIUM, ...HARD];

  // 60% chance use a type-matched category that's also in allowed; else any allowed
  const typedAllowed = typed.filter(c => allowedDifficulty.includes(c));
  let pool: string[];
  if (typedAllowed.length > 0 && Math.random() < 0.6) {
    pool = typedAllowed;
  } else {
    pool = allowedDifficulty;
  }

  // For mid/hard levels, bias toward harder categories (kicks in earlier now).
  if (level >= 3) {
    const harder = pool.filter(c => MEDIUM.includes(c) || HARD.includes(c));
    if (harder.length && Math.random() < 0.65) pool = harder;
  }
  if (level >= 7) {
    const hardest = pool.filter(c => HARD.includes(c));
    if (hardest.length && Math.random() < 0.55) pool = hardest;
  }

  let categoryKey = pickOne(pool);
  if (!typedBank.categories[categoryKey] || typedBank.categories[categoryKey].length === 0) {
    categoryKey = pickOne(ALL_CATEGORIES);
  }
  const q = pickOne(typedBank.categories[categoryKey]);
  return shuffleChoices(q);
}
