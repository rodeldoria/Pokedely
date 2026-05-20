// STEM question delivery layer. Reads from the AI-authored bank in
// questions-generated.json and selects questions by category based on the
// wild Pokemon's primary type. Falls back to a procedural counting question
// if the bank is empty (it never should be).

import bank from './questions-generated.json' with { type: 'json' };

const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffleChoices(q) {
  // Shuffle the choice order so the answer index isn't memorisable.
  const indexed = q.choices.map((c, i) => ({ c, i }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const correctNew = indexed.findIndex(p => p.i === q.answerIndex);
  return {
    ...q,
    choices: indexed.map(p => p.c),
    answerIndex: correctNew
  };
}

// Pokemon type → preferred category. Rare Pokemon mix in a harder category.
// Friendly / kid-favorite types lean into the personalized "addie" bucket so
// Addie hears her own name during the cuter encounters.
const TYPE_TO_CATEGORY = {
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
  dark:   ['opposites','rhymes',     'alphabet']
};

const ALL_CATEGORIES = Object.keys(bank.categories);

export function questionFor(pokemon, difficultyBoost = 0) {
  const primary = pokemon?.types?.[0] || 'normal';
  const tier = (pokemon?.rarity || 1) + difficultyBoost;

  // Pick a category bucket weighted by the Pokemon's type.
  const candidates = TYPE_TO_CATEGORY[primary] || ['spelling', 'counting', 'math'];
  // Rare Pokemon (tier >= 3) occasionally bump to reading or math for a stretch.
  let categoryKey;
  if (tier >= 3 && Math.random() < 0.35) {
    categoryKey = pickOne(['reading', 'math', 'subtraction', 'alphabet']);
  } else {
    categoryKey = pickOne(candidates);
  }
  if (!bank.categories[categoryKey] || bank.categories[categoryKey].length === 0) {
    categoryKey = pickOne(ALL_CATEGORIES);
  }
  const q = pickOne(bank.categories[categoryKey]);
  return shuffleChoices(q);
}

export function totalQuestionCount() {
  return Object.values(bank.categories).reduce((s, arr) => s + arr.length, 0);
}

export function bankSource() {
  return {
    generated_by: bank.generated_by,
    count: totalQuestionCount(),
    categories: Object.keys(bank.categories).length
  };
}
