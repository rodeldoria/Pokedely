#!/usr/bin/env node
// Regenerate src/data/questions-generated.json by asking Claude Opus 4.7 to
// author fresh, unique kid-friendly questions per category.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... node scripts/generate-questions.mjs
//
// Optional flags:
//   --per-category 25     How many to author per category (default 20)
//   --out path/to.json    Where to write (default src/data/questions-generated.json)
//
// The script uses prompt caching on the (large) system prompt so generating
// many categories costs ~1.25x once and ~0.1x for each subsequent category.
// Each call uses adaptive thinking on Opus 4.7 for highest answer quality.

import Anthropic from '@anthropic-ai/sdk';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const args = parseArgs(process.argv.slice(2));
const PER_CATEGORY = Number(args['per-category'] ?? 20);
const OUT_PATH = resolve(REPO_ROOT, args.out ?? 'src/data/questions-generated.json');

const MODEL = 'claude-opus-4-7';

const CATEGORIES = [
  { key: 'spelling',    description: 'Sight-word spelling: prompt shows a single emoji picture, child picks which 3-5 letter word names it. Examples of words: CAT, SUN, DOG, FROG, STAR, FISH, BEE, TREE, BALL, CAKE, PIG, EGG, MOON, BIRD, APPLE.' },
  { key: 'counting',    description: 'Counting 1-10 by showing N copies of a repeated emoji (🍓⭐🌸🍎🐝🦋🐢🐠🍪🌟). The child picks the count.' },
  { key: 'math',        description: 'Simple addition with sums up to 10. Mix picture-based addition with emoji and pure-number addition.' },
  { key: 'subtraction', description: 'Simple subtraction with answers 0-9. Use small numbers a 6-year-old can do with fingers.' },
  { key: 'alphabet',    description: 'Letter recognition: "Which letter comes after X?", "Which letter comes before X?", "What letter does WORD start with?".' },
  { key: 'shapes',      description: 'Identify shapes: circle, triangle, square, star, heart, rectangle. Show the shape as an emoji and ask its name, or ask how many sides a named shape has.' },
  { key: 'colors',      description: 'Identify colors. Show a colored square emoji (🟥🟦🟩🟨🟧🟪) and ask the color, or ask the color of common objects (banana, grass, sky, sun).' },
  { key: 'animals',     description: 'Animal sounds (meow/woof/moo/quack/oink), habitats (water, sky, trees), baby names (kitten, puppy, tadpole, cub). Use emoji in the choices.' },
  { key: 'patterns',    description: 'ABAB patterns of emoji or numbers. Show 5 items in an alternating pattern and ask what comes next.' },
  { key: 'science',     description: 'Simple science: seasons, body parts, plant parts, planets vs moons, weather, states of water, day vs night.' },
  { key: 'reading',     description: 'A one-sentence story followed by a direct comprehension question. Keep words at a kindergarten / 1st-grade level.' },
  { key: 'rhymes',      description: 'Which word rhymes with X? Use simple CVC words.' },
  { key: 'opposites',   description: 'Opposites: hot/cold, big/small, up/down, day/night, fast/slow, happy/sad, open/closed, wet/dry, light/dark, full/empty.' },
  { key: 'categorize',  description: 'Which one is a fruit / animal / vehicle / flower / food? Or "which does not belong" with three same-category items and one outsider.' },
  { key: 'addie',       description: 'Personalized questions for the player named ADDIE. Use her name in every prompt. Mix simple addition/subtraction with picture clues, spelling her own name (A-D-D-I-E, two D\'s in the middle), counting things Addie sees, identifying her favorite colors (pink, yellow) and favorite Pokémon (Pikachu, Eevee), and tiny one-sentence stories about Addie\'s day. Keep it warm and friendly — Animal-Crossing tone.' }
];

const SYSTEM = `You are writing multiple-choice questions for a Pokémon-themed educational game played by a 6-year-old. The child is learning to read, count, recognize shapes/colors, and do simple math.

Rules:
1. Output is a JSON array of question objects. No prose, no markdown fences, no commentary.
2. Each object has exactly these fields:
   - "subject": short category label (e.g. "Spelling", "Math", "Counting")
   - "prompt": the question text shown to the child. May include emoji and \\n line breaks. Keep it under 80 characters.
   - "choices": array of 4 strings (or 3 if the category truly only has 3 distinct options). The first choice is NOT necessarily the correct one — they will be shuffled at runtime.
   - "answerIndex": integer 0-based index into "choices" pointing at the correct answer
   - "hint": a one-sentence gentle hint for after a wrong answer
3. Vocabulary stays at a kindergarten / 1st-grade level: 3-5 letter sight words, numbers 0-10 only.
4. No scary or dark content. No violence. No complex syntax.
5. Use real emoji glyphs where helpful (🐱🐶☀️🌙⭐🍎🐝🐢🦋⭕🔺🟦❤️🟥🟦🟩🟨🟧🟪🍪🌸🌼🐠🐦🌳⚽🍰🥚🚗🏠🦁🦒🐰🐮🦆🐔).
6. All four choices should look plausible to a 6-year-old. Distractors should not be obviously wrong (no "purple" as a distractor for "what color is a strawberry").
7. Make every question UNIQUE — different prompt, different correct answer where possible, different emoji. No two questions in the output should ask the same thing.

Return ONLY the JSON array. Start with [ and end with ].`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Set ANTHROPIC_API_KEY before running this script.');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const out = {
    version: 1,
    generated_by: MODEL,
    regenerate_with: 'node scripts/generate-questions.mjs',
    generated_at: new Date().toISOString(),
    categories: {}
  };

  for (const cat of CATEGORIES) {
    console.log(`→ ${cat.key} (asking for ${PER_CATEGORY})`);
    const items = await generateCategory(client, cat);
    out.categories[cat.key] = items;
    console.log(`  ✓ got ${items.length}`);
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${countAll(out)} questions to ${OUT_PATH}`);
}

async function generateCategory(client, cat) {
  const userPrompt = `Write ${PER_CATEGORY} multiple-choice questions for the "${cat.key}" category.

Category description: ${cat.description}

Return ONLY a JSON array of ${PER_CATEGORY} question objects. Each must have subject, prompt, choices, answerIndex, hint. Make every prompt distinct from the others in this batch.`;

  // Adaptive thinking + high effort for best answer quality on Opus 4.7.
  // Stream so we don't hit HTTP timeouts on the larger categories.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: [
      // Cache the (large) system prompt — every category call reuses it.
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }
    ],
    messages: [{ role: 'user', content: userPrompt }]
  });

  const final = await stream.finalMessage();
  const text = final.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse model output as JSON:', err.message);
    console.error(text.slice(0, 500));
    throw err;
  }
  if (!Array.isArray(parsed)) throw new Error(`Expected array, got ${typeof parsed}`);
  return parsed.filter(validate);
}

function validate(q) {
  return q && typeof q.subject === 'string'
    && typeof q.prompt === 'string'
    && Array.isArray(q.choices)
    && q.choices.length >= 3
    && Number.isInteger(q.answerIndex)
    && q.answerIndex >= 0
    && q.answerIndex < q.choices.length;
}

function countAll(out) {
  return Object.values(out.categories).reduce((s, arr) => s + arr.length, 0);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[key] = next; i++; }
      else out[key] = true;
    }
  }
  return out;
}

main().catch(err => { console.error(err); process.exit(1); });
