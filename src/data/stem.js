// STEM question bank tuned for a 6-year-old: spelling sight words, counting
// with pictures, alphabet, simple addition, shapes, colors, animal sounds,
// and patterns. Rare Pokemon (rarity 3) occasionally pull a slightly harder
// question.

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMC(correct, distractors) {
  const wrongs = shuffle(distractors).slice(0, 3);
  const all = shuffle([correct, ...wrongs]);
  return { choices: all.map(String), answerIndex: all.indexOf(correct) };
}

// ---- Sight words: see a picture, pick the word ----
const SIGHT_WORDS = [
  { word: 'CAT', emoji: '🐱', wrongs: ['BAT', 'COT', 'CUT'] },
  { word: 'DOG', emoji: '🐶', wrongs: ['LOG', 'DIG', 'COG'] },
  { word: 'SUN', emoji: '☀️', wrongs: ['FUN', 'BUN', 'NUN'] },
  { word: 'BEE', emoji: '🐝', wrongs: ['BAY', 'BUS', 'BIG'] },
  { word: 'FROG', emoji: '🐸', wrongs: ['FOG', 'FROM', 'FORK'] },
  { word: 'FISH', emoji: '🐟', wrongs: ['DISH', 'WISH', 'FIST'] },
  { word: 'STAR', emoji: '⭐', wrongs: ['STIR', 'STOP', 'SCAR'] },
  { word: 'BIRD', emoji: '🐦', wrongs: ['BURN', 'BARN', 'BIG'] },
  { word: 'TREE', emoji: '🌳', wrongs: ['THREE', 'FREE', 'TRIP'] },
  { word: 'BALL', emoji: '⚽', wrongs: ['BELL', 'BULL', 'BLOW'] },
  { word: 'CAKE', emoji: '🍰', wrongs: ['CAVE', 'CARE', 'LAKE'] },
  { word: 'PIG',  emoji: '🐷', wrongs: ['BIG', 'PIE', 'PIN'] },
  { word: 'EGG',  emoji: '🥚', wrongs: ['EAR', 'EYE', 'END'] },
  { word: 'APPLE', emoji: '🍎', wrongs: ['ANGEL', 'AMBER', 'ABLE'] },
  { word: 'MOON', emoji: '🌙', wrongs: ['NOON', 'MOOD', 'MOAN'] }
];

function spellingQ() {
  const w = pickOne(SIGHT_WORDS);
  return {
    subject: 'Spelling',
    prompt: `Which word names this picture?\n\n${w.emoji}`,
    hint: 'Sound it out together.',
    ...makeMC(w.word, w.wrongs)
  };
}

// ---- Counting with emoji ----
function countingQ() {
  const n = rand(1, 8);
  const e = pickOne(['🍓', '⭐', '🌸', '🍎', '🐝', '🦋', '🐢', '🐠', '🍪']);
  return {
    subject: 'Counting',
    prompt: `How many do you see?\n\n${e.repeat(n)}`,
    hint: 'Touch each one as you count.',
    ...makeMC(n, [n + 1, Math.max(0, n - 1), n + 2])
  };
}

// ---- Small addition with pictures ----
function addPicturesQ() {
  const a = rand(1, 4), b = rand(1, 4);
  const e = pickOne(['🍎', '⭐', '🐝', '🌸', '🍰']);
  return {
    subject: 'Math',
    prompt: `${e.repeat(a)}   +   ${e.repeat(b)}   =   ?`,
    hint: 'Count them all together.',
    ...makeMC(a + b, [a + b + 1, Math.max(0, a + b - 1), a + b + 2])
  };
}

// ---- Letter sequence ----
function alphabetQ() {
  const idx = rand(0, 22);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const correct = letters[idx + 1];
  const wrongs = [letters[idx], letters[idx + 2], letters[idx + 3]].filter(Boolean);
  return {
    subject: 'Letters',
    prompt: `Which letter comes RIGHT AFTER "${letters[idx]}"?`,
    hint: 'Sing the alphabet song.',
    ...makeMC(correct, wrongs)
  };
}

// ---- Shapes ----
const SHAPES = [
  { name: 'Circle',   emoji: '⭕' },
  { name: 'Triangle', emoji: '🔺' },
  { name: 'Square',   emoji: '🟦' },
  { name: 'Star',     emoji: '⭐' },
  { name: 'Heart',    emoji: '❤️' }
];

function shapesQ() {
  const s = pickOne(SHAPES);
  const wrongs = SHAPES.filter(x => x.name !== s.name).map(x => x.name);
  return {
    subject: 'Shapes',
    prompt: `What shape is this?\n\n${s.emoji}`,
    hint: 'Look at the outline.',
    ...makeMC(s.name, wrongs)
  };
}

// ---- Colors ----
const COLORS = [
  { name: 'Red',    emoji: '🟥' },
  { name: 'Blue',   emoji: '🟦' },
  { name: 'Green',  emoji: '🟩' },
  { name: 'Yellow', emoji: '🟨' },
  { name: 'Orange', emoji: '🟧' },
  { name: 'Purple', emoji: '🟪' }
];

function colorsQ() {
  const c = pickOne(COLORS);
  const wrongs = COLORS.filter(x => x.name !== c.name).map(x => x.name);
  return {
    subject: 'Colors',
    prompt: `What color is this?\n\n${c.emoji}`,
    hint: 'Name the color you see.',
    ...makeMC(c.name, wrongs)
  };
}

// ---- Animal facts & sounds ----
const ANIMALS = [
  { q: 'Which animal says "MEOW"?',   correct: '🐱 Cat',    wrongs: ['🐶 Dog', '🐮 Cow', '🦆 Duck'] },
  { q: 'Which animal says "WOOF"?',   correct: '🐶 Dog',    wrongs: ['🐱 Cat', '🐝 Bee', '🐸 Frog'] },
  { q: 'Which animal says "MOO"?',    correct: '🐮 Cow',    wrongs: ['🐔 Hen', '🐶 Dog', '🐍 Snake'] },
  { q: 'Which animal says "QUACK"?',  correct: '🦆 Duck',   wrongs: ['🐠 Fish', '🐝 Bee', '🐺 Wolf'] },
  { q: 'Which animal lives in water?',correct: '🐟 Fish',   wrongs: ['🦁 Lion', '🐦 Bird', '🐝 Bee'] },
  { q: 'Which animal can fly?',       correct: '🐦 Bird',   wrongs: ['🐟 Fish', '🐢 Turtle', '🐍 Snake'] },
  { q: 'Which is a baby cat?',        correct: '🐱 Kitten', wrongs: ['🐶 Puppy', '🐤 Chick', '🐢 Hatchling'] },
  { q: 'Which one is fuzzy?',         correct: '🐻 Bear',   wrongs: ['🐟 Fish', '🐍 Snake', '🐢 Turtle'] }
];

function animalsQ() {
  const a = pickOne(ANIMALS);
  return {
    subject: 'Nature',
    prompt: a.q,
    hint: 'Think about each animal.',
    ...makeMC(a.correct, a.wrongs)
  };
}

// ---- Pattern recognition ----
const PAIRS = [['🔴', '🟡'], ['⭐', '❤️'], ['🟦', '🟩'], ['🌸', '🌼'], ['🐱', '🐶']];

function patternQ() {
  const [a, b] = pickOne(PAIRS);
  const seq = [a, b, a, b, a];
  const others = ['⭐', '❤️', '🔴', '🟦'].filter(x => x !== a && x !== b);
  return {
    subject: 'Patterns',
    prompt: `What comes NEXT in the pattern?\n\n${seq.join(' ')}   ?`,
    hint: 'Two shapes that take turns.',
    ...makeMC(b, [a, ...others])
  };
}

// ---- Same / different ----
function sameDifferentQ() {
  const e = pickOne(['🌸', '🍎', '⭐', '🐝']);
  const odd = pickOne(['🦋', '🍪', '🐢', '🌙'].filter(x => x !== e));
  const group = shuffle([e, e, e, odd]);
  const answerIdx = group.indexOf(odd);
  const letters = ['A', 'B', 'C', 'D'];
  return {
    subject: 'Same & Different',
    prompt: `Which one does NOT belong?\n\n  A: ${group[0]}     B: ${group[1]}     C: ${group[2]}     D: ${group[3]}`,
    hint: 'Three are the same. Find the different one.',
    choices: letters,
    answerIndex: answerIdx
  };
}

const EASY_BANK = [
  spellingQ, countingQ, addPicturesQ, alphabetQ,
  shapesQ, colorsQ, animalsQ, patternQ, sameDifferentQ
];

// ---- Slightly harder for rare Pokemon ----
const SPELL_LETTERS = [
  { word: 'CAT', letters: ['T', 'C', 'A'], wrongs: ['TAC', 'ACT', 'CTA'] },
  { word: 'DOG', letters: ['O', 'G', 'D'], wrongs: ['GOD', 'GDO', 'DGO'] },
  { word: 'SUN', letters: ['N', 'S', 'U'], wrongs: ['NUS', 'USN', 'SNU'] },
  { word: 'STAR',letters: ['T', 'S', 'R', 'A'], wrongs: ['TARS', 'RATS', 'ARTS'] },
  { word: 'FISH',letters: ['I', 'F', 'H', 'S'], wrongs: ['SHIF', 'FIHS', 'HISH'] }
];

function spellLettersQ() {
  const w = pickOne(SPELL_LETTERS);
  return {
    subject: 'Spelling',
    prompt: `Put the letters in order. Letters given: ${w.letters.join(', ')}`,
    hint: 'Picture the word in your head.',
    ...makeMC(w.word, w.wrongs)
  };
}

function biggerAddQ() {
  const a = rand(2, 6), b = rand(2, 6);
  return {
    subject: 'Math',
    prompt: `${a} + ${b} = ?`,
    hint: 'Start from the bigger number and count up.',
    ...makeMC(a + b, [a + b + 1, Math.max(0, a + b - 1), a + b + 2])
  };
}

const HARDER_BANK = [spellLettersQ, biggerAddQ];

export function questionFor(pokemon, difficultyBoost = 0) {
  const tier = (pokemon?.rarity || 1) + difficultyBoost;
  const useHard = tier >= 3 && Math.random() < 0.4;
  const gen = useHard ? pickOne(HARDER_BANK) : pickOne(EASY_BANK);
  return gen();
}
