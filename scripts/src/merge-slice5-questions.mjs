#!/usr/bin/env node
// One-shot script to merge the Slice-5 question categories into the existing
// questions-generated.json bank. Idempotent: re-running just overwrites the
// five new categories without touching the existing ones.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = resolve(__dirname, '../../artifacts/pokapiya/src/data/questions-generated.json');

const NEW_CATEGORIES = {
  multiplication: [
    { subject: 'Math', prompt: '2 × 2 = ?', choices: ['4', '3', '5', '6'], answerIndex: 0, hint: '2 groups of 2 — count them: 1, 2, 3, 4.' },
    { subject: 'Math', prompt: '2 × 3 = ?', choices: ['6', '5', '7', '8'], answerIndex: 0, hint: '2 groups of 3, or 3 + 3.' },
    { subject: 'Math', prompt: '3 × 3 = ?', choices: ['9', '6', '8', '12'], answerIndex: 0, hint: '3 + 3 + 3.' },
    { subject: 'Math', prompt: '2 × 4 = ?', choices: ['8', '6', '9', '10'], answerIndex: 0, hint: 'Double four.' },
    { subject: 'Math', prompt: '5 × 2 = ?', choices: ['10', '8', '12', '7'], answerIndex: 0, hint: 'Both hands of fingers!' },
    { subject: 'Math', prompt: '4 × 3 = ?', choices: ['12', '10', '14', '7'], answerIndex: 0, hint: '4 + 4 + 4.' },
    { subject: 'Math', prompt: '3 × 5 = ?', choices: ['15', '12', '18', '8'], answerIndex: 0, hint: '5 + 5 + 5.' },
    { subject: 'Math', prompt: '4 × 4 = ?', choices: ['16', '12', '20', '8'], answerIndex: 0, hint: '4 + 4 + 4 + 4.' },
    { subject: 'Math', prompt: '5 × 5 = ?', choices: ['25', '20', '30', '15'], answerIndex: 0, hint: 'A square of fives.' },
    { subject: 'Math', prompt: '6 × 2 = ?', choices: ['12', '10', '14', '8'], answerIndex: 0, hint: '6 + 6.' },
    { subject: 'Math', prompt: '🍎🍎🍎 groups of 2 = ? apples', choices: ['6', '5', '4', '8'], answerIndex: 0, hint: 'Three groups of two apples.' },
    { subject: 'Math', prompt: '🌸🌸 groups of 3 = ? flowers', choices: ['6', '5', '7', '4'], answerIndex: 0, hint: 'Two bunches, three flowers each.' },
    { subject: 'Math', prompt: 'What is 0 × 7?', choices: ['0', '7', '1', '70'], answerIndex: 0, hint: 'Zero groups of anything is zero!' },
    { subject: 'Math', prompt: 'What is 1 × 9?', choices: ['9', '1', '10', '8'], answerIndex: 0, hint: 'One group of nine is just nine.' },
    { subject: 'Math', prompt: '4 × 5 = ?', choices: ['20', '15', '24', '9'], answerIndex: 0, hint: '5 + 5 + 5 + 5.' }
  ],

  planets: [
    { subject: 'Space', prompt: 'What planet do we live on?', choices: ['Earth', 'Mars', 'Venus', 'Saturn'], answerIndex: 0, hint: 'The big blue one with oceans.' },
    { subject: 'Space', prompt: 'What is the BIGGEST planet in our solar system?', choices: ['Jupiter', 'Earth', 'Mars', 'Mercury'], answerIndex: 0, hint: 'It has a giant red storm spot.' },
    { subject: 'Space', prompt: 'What is the SMALLEST planet?', choices: ['Mercury', 'Earth', 'Saturn', 'Jupiter'], answerIndex: 0, hint: 'Closest to the Sun, named after a Roman god.' },
    { subject: 'Space', prompt: 'Which planet is famous for its RINGS?', choices: ['Saturn', 'Earth', 'Mars', 'Venus'], answerIndex: 0, hint: 'Beautiful icy rings around it.' },
    { subject: 'Space', prompt: 'Which planet is called the RED PLANET?', choices: ['Mars', 'Venus', 'Earth', 'Neptune'], answerIndex: 0, hint: 'Reddish because of rusty iron in the soil.' },
    { subject: 'Space', prompt: 'What is the star at the center of our solar system?', choices: ['The Sun', 'The Moon', 'Mars', 'Jupiter'], answerIndex: 0, hint: 'It gives us light during the day.' },
    { subject: 'Space', prompt: 'How many planets are in our solar system?', choices: ['8', '7', '9', '12'], answerIndex: 0, hint: 'After Pluto was reclassified, the answer changed.' },
    { subject: 'Space', prompt: 'What goes around the Earth?', choices: ['The Moon', 'The Sun', 'Mars', 'Jupiter'], answerIndex: 0, hint: 'Bright in the night sky.' },
    { subject: 'Space', prompt: 'How long does Earth take to go around the Sun?', choices: ['1 year', '1 day', '1 month', '100 years'], answerIndex: 0, hint: 'Birthdays come once each one of these.' },
    { subject: 'Space', prompt: 'What planet is right next to Earth, closer to the Sun?', choices: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answerIndex: 0, hint: 'Brightest planet in our sky.' },
    { subject: 'Space', prompt: 'A group of stars that makes a picture is called a…', choices: ['Constellation', 'Comet', 'Crater', 'Cloud'], answerIndex: 0, hint: 'Like the Big Dipper.' },
    { subject: 'Space', prompt: 'What do astronauts use to travel to space?', choices: ['Rocket', 'Train', 'Car', 'Boat'], answerIndex: 0, hint: 'It blasts off with a big flame.' },
    { subject: 'Space', prompt: 'Why does Earth have day and night?', choices: ['It spins', 'It melts', 'It shrinks', 'It hides'], answerIndex: 0, hint: 'Earth turns around once every 24 hours.' },
    { subject: 'Space', prompt: 'A space rock that falls to Earth is a…', choices: ['Meteor', 'Star', 'Planet', 'Cloud'], answerIndex: 0, hint: '"Shooting stars" are these.' }
  ],

  bugs: [
    { subject: 'Bugs', prompt: 'How many LEGS does an insect have?', choices: ['6', '8', '4', '10'], answerIndex: 0, hint: 'Three on each side.' },
    { subject: 'Bugs', prompt: 'How many LEGS does a SPIDER have?', choices: ['8', '6', '4', '10'], answerIndex: 0, hint: 'Spiders are not insects — they have two more legs.' },
    { subject: 'Bugs', prompt: 'A BUTTERFLY starts its life as a…', choices: ['Caterpillar', 'Bird', 'Tadpole', 'Worm'], answerIndex: 0, hint: 'Think Caterpie → Butterfree.' },
    { subject: 'Bugs', prompt: 'What do BEES make?', choices: ['Honey', 'Milk', 'Bread', 'Silk'], answerIndex: 0, hint: 'Sweet and golden.' },
    { subject: 'Bugs', prompt: 'Which bug GLOWS in the dark?', choices: ['Firefly', 'Ant', 'Spider', 'Mosquito'], answerIndex: 0, hint: 'It blinks light at night.' },
    { subject: 'Bugs', prompt: 'What part of a butterfly lets it FLY?', choices: ['Wings', 'Legs', 'Antennae', 'Tail'], answerIndex: 0, hint: 'Big colorful flat parts.' },
    { subject: 'Bugs', prompt: 'Ants live in a…', choices: ['Colony', 'Nest', 'Pond', 'Cave'], answerIndex: 0, hint: 'A big underground group home.' },
    { subject: 'Bugs', prompt: 'What do ladybugs eat?', choices: ['Aphids', 'Honey', 'Grass', 'Bees'], answerIndex: 0, hint: 'Tiny green bugs that munch on plants.' },
    { subject: 'Bugs', prompt: 'Which bug makes a WEB to catch food?', choices: ['Spider', 'Bee', 'Beetle', 'Worm'], answerIndex: 0, hint: 'It builds a sticky trap.' },
    { subject: 'Bugs', prompt: 'A caterpillar wraps itself in a…', choices: ['Cocoon / chrysalis', 'Web', 'Shell', 'Nest'], answerIndex: 0, hint: 'It rests inside before becoming a butterfly.' },
    { subject: 'Bugs', prompt: 'Which body part do bugs use to SMELL?', choices: ['Antennae', 'Eyes', 'Wings', 'Tail'], answerIndex: 0, hint: 'Two long feelers on the head.' },
    { subject: 'Bugs', prompt: 'Which insect is famous for making MUSIC at night?', choices: ['Cricket', 'Ant', 'Mosquito', 'Beetle'], answerIndex: 0, hint: 'Rubs its wings to chirp.' },
    { subject: 'Bugs', prompt: 'Bees help flowers by carrying…', choices: ['Pollen', 'Soil', 'Water', 'Salt'], answerIndex: 0, hint: 'Sticky yellow powder from petals.' }
  ],

  computer_science: [
    { subject: 'Computers', prompt: 'Which one do you TYPE on?', choices: ['Keyboard', 'Mouse', 'Screen', 'Speaker'], answerIndex: 0, hint: 'It has all the letters and numbers.' },
    { subject: 'Computers', prompt: 'Which one do you POINT and CLICK with?', choices: ['Mouse', 'Keyboard', 'Printer', 'Headphones'], answerIndex: 0, hint: 'It moves the arrow on screen.' },
    { subject: 'Computers', prompt: 'Where do you SEE pictures on a computer?', choices: ['The screen', 'The mouse', 'The keyboard', 'The plug'], answerIndex: 0, hint: 'It lights up with images.' },
    { subject: 'Computers', prompt: 'What is a list of steps a computer follows called?', choices: ['Algorithm', 'Antenna', 'Apple', 'Anchor'], answerIndex: 0, hint: 'Like a recipe for the computer.' },
    { subject: 'Computers', prompt: 'Continue the pattern: 1, 2, 3, 4, ?', choices: ['5', '4', '6', '10'], answerIndex: 0, hint: 'Counting by one.' },
    { subject: 'Computers', prompt: 'A LOOP that runs 3 times prints "hi". How many "hi"s appear?', choices: ['3', '1', '6', '0'], answerIndex: 0, hint: 'Once for each time the loop runs.' },
    { subject: 'Computers', prompt: 'What does a robot need to know what to do?', choices: ['Instructions', 'Food', 'Sleep', 'Songs'], answerIndex: 0, hint: 'Step-by-step orders.' },
    { subject: 'Computers', prompt: 'Computers only understand which 2 numbers?', choices: ['0 and 1', '1 and 2', '7 and 8', '4 and 5'], answerIndex: 0, hint: 'Off and on, like a light switch.' },
    { subject: 'Computers', prompt: 'Which is TRUE?', choices: ['5 > 3', '5 < 3', '5 = 3', '3 > 5'], answerIndex: 0, hint: 'Five is bigger than three.' },
    { subject: 'Computers', prompt: 'Which is TRUE?', choices: ['2 + 2 = 4', '2 + 2 = 5', '2 + 2 = 3', '2 + 2 = 0'], answerIndex: 0, hint: 'Use your fingers.' },
    { subject: 'Computers', prompt: 'If A → B → C → ?, what comes next?', choices: ['D', 'A', 'Z', 'B'], answerIndex: 0, hint: 'Letters in order.' },
    { subject: 'Computers', prompt: 'A BUG in a computer is…', choices: ['A mistake in the code', 'A real bug', 'Music', 'A picture'], answerIndex: 0, hint: 'It makes the program do the wrong thing.' },
    { subject: 'Computers', prompt: 'Which one is INPUT (something you give the computer)?', choices: ['Pressing a key', 'A picture on screen', 'Sound from speakers', 'A printed page'], answerIndex: 0, hint: 'You DO it to the computer.' }
  ],

  reading_stories: [
    { subject: 'Reading', prompt: 'Addie found a Pikachu in tall grass. It was tired and hungry. Addie gave it a berry.\n\nHow did Pikachu feel at first?', choices: ['Tired and hungry', 'Happy and full', 'Sleepy and warm', 'Scared and cold'], answerIndex: 0, hint: 'Read the second sentence again.' },
    { subject: 'Reading', prompt: 'Sam planted three trees: an apple, a pear, and a plum. The apple tree grew the fastest.\n\nWhich tree grew the fastest?', choices: ['The apple tree', 'The pear tree', 'The plum tree', 'The cherry tree'], answerIndex: 0, hint: 'Look at the last sentence.' },
    { subject: 'Reading', prompt: 'Mia walked to the lake. She fed two ducks and three swans. Then she walked home.\n\nHow many birds did Mia feed in total?', choices: ['5', '2', '3', '6'], answerIndex: 0, hint: '2 ducks + 3 swans.' },
    { subject: 'Reading', prompt: 'Leo opened his lunchbox. Inside were a sandwich, an apple, and a juice box. He drank the juice first.\n\nWhat did Leo drink?', choices: ['Juice', 'Milk', 'Water', 'Tea'], answerIndex: 0, hint: 'Look at the last sentence.' },
    { subject: 'Reading', prompt: 'The cat sat on the mat. The dog sat on the rug. The bird sat on the perch.\n\nWho sat on the mat?', choices: ['The cat', 'The dog', 'The bird', 'The mouse'], answerIndex: 0, hint: 'Read the first sentence.' },
    { subject: 'Reading', prompt: 'Addie chose Bulbasaur as her first Pokémon. It is a grass-type and likes the sun.\n\nWhat type is Bulbasaur?', choices: ['Grass', 'Fire', 'Water', 'Electric'], answerIndex: 0, hint: 'The second sentence says it.' },
    { subject: 'Reading', prompt: 'Ben and his sister built a snowman. They used a carrot for the nose and two coal pieces for the eyes.\n\nWhat did they use for the eyes?', choices: ['Two coal pieces', 'A carrot', 'Two buttons', 'A scarf'], answerIndex: 0, hint: 'Read the last sentence carefully.' },
    { subject: 'Reading', prompt: 'A bee landed on a yellow flower. It collected pollen and flew back to its hive.\n\nWhere did the bee fly back to?', choices: ['Its hive', 'Its nest', 'The pond', 'The tree'], answerIndex: 0, hint: 'Bees live in hives.' },
    { subject: 'Reading', prompt: 'Lily woke up early to feed her Eevee. She gave it berries and water. Then Eevee played with her ribbon.\n\nWhat did Eevee eat?', choices: ['Berries and water', 'Bread and milk', 'Apple and juice', 'Just water'], answerIndex: 0, hint: 'Second sentence.' },
    { subject: 'Reading', prompt: 'The little boat sailed across the pond. Two ducks swam next to it. A frog jumped on top.\n\nWhat jumped on the boat?', choices: ['A frog', 'A duck', 'A fish', 'A cat'], answerIndex: 0, hint: 'Look at the last sentence.' },
    { subject: 'Reading', prompt: 'Addie has 5 Poké Balls. She used 2 to catch a Pidgey. Now how many does she have?', choices: ['3', '5', '7', '2'], answerIndex: 0, hint: '5 minus 2.' },
    { subject: 'Reading', prompt: 'A red car drove down the hill. Then a blue car followed it. A green car came last.\n\nWhich car came LAST?', choices: ['The green car', 'The red car', 'The blue car', 'A yellow car'], answerIndex: 0, hint: 'Read the last sentence.' }
  ]
};

async function main() {
  const text = await readFile(BANK_PATH, 'utf8');
  const bank = JSON.parse(text);
  bank.categories = { ...bank.categories, ...NEW_CATEGORIES };
  await writeFile(BANK_PATH, JSON.stringify(bank, null, 2) + '\n');
  const counts = Object.entries(bank.categories).map(([k, v]) => `${k}=${v.length}`).join(' ');
  console.log(`Merged. Now: ${counts}`);
  const total = Object.values(bank.categories).reduce((s, arr) => s + arr.length, 0);
  console.log(`Total: ${total} questions across ${Object.keys(bank.categories).length} categories.`);
}

main().catch(e => { console.error(e); process.exit(1); });
