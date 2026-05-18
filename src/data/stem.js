// STEM question bank. Each Pokemon type maps to a subject. Each generator
// returns { prompt, choices: string[], answerIndex, hint } and is rolled at
// catch time so questions are fresh every encounter.

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffleChoices(correct, distractors) {
  const all = [correct, ...distractors];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return { choices: all.map(String), answerIndex: all.indexOf(correct) };
}

// --- MATH (psychic, fighting, dragon, ghost) ---
function mathAddition() {
  const a = rand(2, 19), b = rand(2, 19);
  const correct = a + b;
  const wrongs = [correct + rand(1, 3), correct - rand(1, 3), correct + rand(4, 8)];
  return { subject: 'Math', prompt: `What is ${a} + ${b}?`, hint: 'Add them together.', ...shuffleChoices(correct, wrongs) };
}
function mathSubtraction() {
  const a = rand(10, 30), b = rand(1, a - 1);
  const correct = a - b;
  const wrongs = [correct + 1, correct - 1, correct + rand(3, 6)];
  return { subject: 'Math', prompt: `What is ${a} - ${b}?`, hint: 'Count down.', ...shuffleChoices(correct, wrongs) };
}
function mathMultiplication() {
  const a = rand(2, 9), b = rand(2, 9);
  const correct = a * b;
  const wrongs = [a * (b + 1), a * (b - 1), correct + rand(2, 5)];
  return { subject: 'Math', prompt: `What is ${a} × ${b}?`, hint: 'Repeat addition.', ...shuffleChoices(correct, wrongs) };
}
const mathBank = [mathAddition, mathSubtraction, mathMultiplication];

// --- BIOLOGY / ECOLOGY (grass, bug, water, normal) ---
const bioQs = [
  {
    prompt: 'Which part of a plant makes food from sunlight?',
    correct: 'Leaves',
    wrongs: ['Roots', 'Flowers', 'Bark'],
    hint: 'It is green and uses photosynthesis.'
  },
  {
    prompt: 'What do butterflies start their life as?',
    correct: 'A caterpillar',
    wrongs: ['A frog', 'An egg of a bird', 'A worm'],
    hint: 'Think Caterpie → Butterfree.'
  },
  {
    prompt: 'Fish breathe water using…',
    correct: 'Gills',
    wrongs: ['Lungs', 'Skin only', 'Their tail'],
    hint: 'Magikarp has them on its head!'
  },
  {
    prompt: 'Which of these is a mammal?',
    correct: 'A whale',
    wrongs: ['A shark', 'A salmon', 'A jellyfish'],
    hint: 'Mammals breathe air and feed milk.'
  },
  {
    prompt: 'Bees help flowers by carrying…',
    correct: 'Pollen',
    wrongs: ['Sand', 'Soil', 'Sugar crystals'],
    hint: 'Sticky yellow stuff.'
  }
];

// --- CHEMISTRY / PHYSICS (fire, electric, ice, steel) ---
const sciQs = [
  { prompt: 'What state of matter is ice?', correct: 'Solid', wrongs: ['Liquid', 'Gas', 'Plasma'], hint: 'Hard and keeps its shape.' },
  { prompt: 'Lightning is a flash of…', correct: 'Electricity', wrongs: ['Sound', 'Water', 'Magnetism'], hint: 'Zapdos loves it.' },
  { prompt: 'What gas do we breathe in to live?', correct: 'Oxygen', wrongs: ['Helium', 'Nitrogen', 'Carbon dioxide'], hint: 'O₂.' },
  { prompt: 'Magnets attract which metal?', correct: 'Iron', wrongs: ['Gold', 'Copper', 'Aluminum'], hint: 'Magnemite!' },
  { prompt: 'Heat makes water turn into…', correct: 'Steam', wrongs: ['Ice', 'Salt', 'Air'], hint: 'A gas of water.' }
];

// --- COMPUTER SCIENCE (ghost, psychic, electric — pattern/logic) ---
const csQs = [
  {
    prompt: 'Continue the pattern: 2, 4, 6, 8, ?',
    correct: '10',
    wrongs: ['9', '12', '11'],
    hint: 'Add 2 each step.'
  },
  {
    prompt: 'Continue the pattern: ▲ ● ▲ ● ▲ ?',
    correct: '●',
    wrongs: ['▲', '■', '★'],
    hint: 'Alternating.'
  },
  {
    prompt: 'A loop that runs 3 times prints "hi". How many "hi"s appear?',
    correct: '3',
    wrongs: ['1', '6', '0'],
    hint: 'Once per iteration.'
  },
  {
    prompt: 'Which is a TRUE statement?',
    correct: '5 > 3',
    wrongs: ['5 < 3', '5 = 3', '3 > 5'],
    hint: 'The big mouth eats the bigger number.'
  }
];

// --- HISTORY / EARTH SCIENCE (rock, ground, fossil-ish) ---
const histQs = [
  { prompt: 'A T-Rex was a kind of…', correct: 'Dinosaur', wrongs: ['Mammal', 'Bird only', 'Fish'], hint: 'Aerodactyl is fossil-like!' },
  { prompt: 'Mountains are made of…', correct: 'Rock', wrongs: ['Cloud', 'Water', 'Sand only'], hint: 'Onix!' },
  { prompt: 'A fossil is the remains of…', correct: 'Ancient living things', wrongs: ['Old metal', 'New plants', 'Rain water'], hint: 'Kabuto came from one.' },
  { prompt: 'Earth has how many large oceans?', correct: '5', wrongs: ['1', '3', '7'], hint: 'Pacific, Atlantic, Indian, Arctic, Southern.' }
];

const staticToQ = q => {
  const { choices, answerIndex } = shuffleChoices(q.correct, q.wrongs);
  return { subject: q.subject || 'Science', prompt: q.prompt, choices, answerIndex, hint: q.hint };
};

const SUBJECT_BY_TYPE = {
  grass: 'bio', bug: 'bio', water: 'bio', normal: 'bio', poison: 'bio', fairy: 'bio',
  fire: 'sci', electric: 'sci', ice: 'sci', steel: 'sci',
  ghost: 'cs', psychic: 'cs', dragon: 'cs',
  rock: 'hist', ground: 'hist', flying: 'hist', fighting: 'math'
};

export function questionFor(pokemon, difficultyBoost = 0) {
  const primary = pokemon.types[0];
  const subject = SUBJECT_BY_TYPE[primary] || 'math';
  const tier = pokemon.rarity + difficultyBoost;

  if (subject === 'math' || tier >= 3) {
    // Rare Pokemon get a math problem regardless of subject mapping.
    const gen = tier >= 3 ? mathMultiplication : pickOne(mathBank);
    const q = gen();
    return { ...q, subject: subject === 'math' ? 'Math' : `Math (${primary})` };
  }
  if (subject === 'bio') return { ...staticToQ({ ...pickOne(bioQs), subject: 'Biology' }) };
  if (subject === 'sci') return { ...staticToQ({ ...pickOne(sciQs), subject: 'Science' }) };
  if (subject === 'cs')  return { ...staticToQ({ ...pickOne(csQs),  subject: 'Computer Science' }) };
  if (subject === 'hist')return { ...staticToQ({ ...pickOne(histQs),subject: 'Earth & History' }) };
  return mathAddition();
}
