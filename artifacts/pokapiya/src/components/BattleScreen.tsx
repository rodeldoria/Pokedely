import { useState, useEffect, useRef, useMemo } from 'react';
import type { Pokemon } from '../data/pokedex';
import { displayName, spriteUrl, backSpriteUrl, homeSpriteUrl, animatedSpriteUrl, hasAnimatedSprite, wildLevelFor } from '../data/pokedex';
import { questionFor, type Question } from '../data/stem';
import { AddieSprite } from './AddieSprite';
import { TrainerSprite } from './TrainerSprite';
import type { NPCTrainer } from '../game/world';
import {
  recordAnswer, recordCatch, useBall, useBerry, getLevel,
  ensureMemberHp, memberMaxHp, xpToNextLevel, grantXp,
} from '../game/save';
import type { TrainerState, PartyMember } from '../game/save';

interface Props {
  wild: Pokemon;
  state: TrainerState;
  onStateChange: (s: TrainerState) => void;
  onExit: (caught: boolean, defeatedTrainer: boolean) => void;
  trainerName?: string;
  trainerReward?: string;
  trainerKind?: NPCTrainer['kind'];
}

const TYPE_COLORS: Record<string, [string, string]> = {
  grass: ['#2d6a4f','#95d5b2'], fire: ['#7d1d00','#ff9f80'], water: ['#023e8a','#90e0ef'],
  electric: ['#7b5e00','#ffe566'], bug: ['#386641','#b5e48c'], normal: ['#555','#ddd'],
  psychic: ['#7b2d8b','#f0abfc'], poison: ['#5b2c82','#c084fc'], rock: ['#4a3c28','#c4a882'],
  ground: ['#7d4f00','#f4c97d'], flying: ['#164e74','#93c5fd'], ice: ['#0e4b6e','#bae6fd'],
  fighting: ['#7f1d1d','#fca5a5'], ghost: ['#3b0764','#d8b4fe'], dragon: ['#1e3a8a','#93c5fd'],
  dark: ['#1a1a1a','#9ca3af'], steel: ['#334155','#cbd5e1'], fairy: ['#7c1d5a','#fbcfe8'],
};

interface Move { name: string; type: string; power: number; emoji: string; }
const TYPE_MOVE: Record<string, Move> = {
  grass:    { name: 'Vine Whip',  type: 'grass',    power: 15, emoji: '🌿' },
  fire:     { name: 'Ember',      type: 'fire',     power: 16, emoji: '🔥' },
  water:    { name: 'Water Gun',  type: 'water',    power: 15, emoji: '💧' },
  electric: { name: 'Spark',      type: 'electric', power: 16, emoji: '⚡' },
  bug:      { name: 'Bug Bite',   type: 'bug',      power: 13, emoji: '🐛' },
  psychic:  { name: 'Confusion',  type: 'psychic',  power: 16, emoji: '🔮' },
  fairy:    { name: 'Fairy Wind', type: 'fairy',    power: 15, emoji: '✨' },
  dark:     { name: 'Bite',       type: 'dark',     power: 16, emoji: '🌑' },
  ice:      { name: 'Icy Wind',   type: 'ice',      power: 14, emoji: '❄️' },
  fighting: { name: 'Karate Chop',type: 'fighting', power: 16, emoji: '👊' },
  rock:     { name: 'Rock Throw', type: 'rock',     power: 14, emoji: '🪨' },
  ground:   { name: 'Mud Slap',   type: 'ground',   power: 13, emoji: '🟫' },
  flying:   { name: 'Gust',       type: 'flying',   power: 14, emoji: '🌬️' },
  ghost:    { name: 'Shadow Sneak', type: 'ghost',  power: 15, emoji: '👻' },
  poison:   { name: 'Poison Sting', type: 'poison', power: 13, emoji: '☠️' },
  steel:    { name: 'Metal Claw', type: 'steel',    power: 15, emoji: '⚙️' },
  dragon:   { name: 'Dragon Breath', type: 'dragon',power: 17, emoji: '🐉' },
  normal:   { name: 'Body Slam',  type: 'normal',   power: 15, emoji: '💢' },
};

// Second flavor move per type so single-type Pokémon still get a full 4-move
// set with some variety instead of two identical-feeling slots.
const TYPE_MOVE_2: Record<string, Move> = {
  grass:    { name: 'Razor Leaf',  type: 'grass',   power: 18, emoji: '🍃' },
  fire:     { name: 'Flame Wheel', type: 'fire',    power: 18, emoji: '🔥' },
  water:    { name: 'Bubble Beam', type: 'water',   power: 17, emoji: '🫧' },
  electric: { name: 'Thunder Shock', type: 'electric', power: 14, emoji: '⚡' },
  bug:      { name: 'String Shot', type: 'bug',     power: 10, emoji: '🕸️' },
  psychic:  { name: 'Psybeam',     type: 'psychic', power: 18, emoji: '🌀' },
  fairy:    { name: 'Draining Kiss', type: 'fairy', power: 14, emoji: '💖' },
  dark:     { name: 'Pursuit',     type: 'dark',    power: 14, emoji: '🌒' },
  ice:      { name: 'Powder Snow', type: 'ice',     power: 13, emoji: '🌨️' },
  fighting: { name: 'Low Kick',    type: 'fighting',power: 14, emoji: '🦵' },
  rock:     { name: 'Rollout',     type: 'rock',    power: 13, emoji: '⛰️' },
  ground:   { name: 'Sand Attack', type: 'ground',  power: 10, emoji: '🏖️' },
  flying:   { name: 'Wing Attack', type: 'flying',  power: 16, emoji: '🪽' },
  ghost:    { name: 'Lick',        type: 'ghost',   power: 12, emoji: '👅' },
  poison:   { name: 'Acid',        type: 'poison',  power: 15, emoji: '🧪' },
  steel:    { name: 'Iron Head',   type: 'steel',   power: 18, emoji: '🛡️' },
  dragon:   { name: 'Twister',     type: 'dragon',  power: 14, emoji: '🌪️' },
  normal:   { name: 'Double Slap', type: 'normal',  power: 12, emoji: '✋' },
};

const TACKLE: Move = { name: 'Tackle',       type: 'normal', power: 12, emoji: '💥' };
const QUICK:  Move = { name: 'Quick Attack', type: 'normal', power: 13, emoji: '💨' };

function getMoves(types: string[]): Move[] {
  const t1 = types[0] || 'normal';
  const t2 = types[1];
  const m1 = TYPE_MOVE[t1] || TYPE_MOVE.normal;
  const m2 = t2
    ? (TYPE_MOVE[t2] || TYPE_MOVE_2[t1] || TYPE_MOVE_2.normal)
    : (TYPE_MOVE_2[t1] || TYPE_MOVE_2.normal);
  return [TACKLE, m1, m2, QUICK];
}

// Full kid-friendly type chart. For each attacking type we list which
// defender types it's strong against (2×), weak against (0.5×), or has
// no effect on (0×). Dual-type defenders multiply per type, so 2×·2× = 4×
// super effective, 0.5×·0.5× = 0.25× really weak, and any 0× wins.
interface TypeMatchups { strong: string[]; weak: string[]; immune: string[]; }
const TYPE_CHART: Record<string, TypeMatchups> = {
  normal:   { strong: [],                                 weak: ['rock','steel'],                                        immune: ['ghost'] },
  fire:     { strong: ['grass','bug','ice','steel'],      weak: ['fire','water','rock','dragon'],                        immune: [] },
  water:    { strong: ['fire','rock','ground'],           weak: ['water','grass','dragon'],                              immune: [] },
  grass:    { strong: ['water','rock','ground'],          weak: ['fire','grass','poison','flying','bug','dragon','steel'], immune: [] },
  electric: { strong: ['water','flying'],                 weak: ['electric','grass','dragon'],                           immune: ['ground'] },
  ice:      { strong: ['grass','ground','flying','dragon'], weak: ['fire','water','ice','steel'],                        immune: [] },
  fighting: { strong: ['normal','rock','ice','dark','steel'], weak: ['flying','poison','bug','psychic','fairy'],          immune: ['ghost'] },
  poison:   { strong: ['grass','fairy'],                  weak: ['poison','ground','rock','ghost'],                      immune: ['steel'] },
  ground:   { strong: ['fire','electric','rock','steel','poison'], weak: ['grass','bug'],                                immune: ['flying'] },
  flying:   { strong: ['grass','fighting','bug'],         weak: ['electric','rock','steel'],                             immune: [] },
  psychic:  { strong: ['fighting','poison'],              weak: ['psychic','steel'],                                     immune: ['dark'] },
  bug:      { strong: ['grass','psychic','dark'],         weak: ['fire','fighting','poison','flying','ghost','steel','fairy'], immune: [] },
  rock:     { strong: ['fire','flying','bug','ice'],      weak: ['fighting','ground','steel'],                           immune: [] },
  ghost:    { strong: ['psychic','ghost'],                weak: ['dark'],                                                immune: ['normal'] },
  dragon:   { strong: ['dragon'],                         weak: ['steel'],                                               immune: ['fairy'] },
  dark:     { strong: ['psychic','ghost'],                weak: ['fighting','dark','fairy'],                             immune: [] },
  steel:    { strong: ['rock','ice','fairy'],             weak: ['fire','water','electric','steel'],                     immune: [] },
  fairy:    { strong: ['fighting','dragon','dark'],       weak: ['fire','poison','steel'],                               immune: [] },
};

function effectiveness(atk: string, defs: string[]): number {
  const m = TYPE_CHART[atk];
  if (!m) return 1;
  let mult = 1;
  for (const d of defs) {
    if (m.immune.includes(d)) return 0;
    if (m.strong.includes(d)) mult *= 2;
    else if (m.weak.includes(d)) mult *= 0.5;
  }
  return mult;
}

// Kid-friendly description for an effectiveness multiplier.
function effLabel(mult: number): { text: string; color: string } | null {
  if (mult === 0) return { text: "It had no effect…", color: '#9aa0a8' };
  if (mult >= 4)  return { text: "Whoa! 4× super effective! 💥", color: '#ffd54a' };
  if (mult >= 2)  return { text: "It's super effective! ⚡",     color: '#7dd87d' };
  if (mult <= 0.25) return { text: "It's barely scratching… (¼×)", color: '#bfc3cc' };
  if (mult <= 0.5)  return { text: "It's not very effective…",    color: '#bfc3cc' };
  return null;
}

function calcDamage(move: Move, defenderTypes: string[], level: number): number {
  const base = move.power + Math.floor(level * 0.6);
  const variance = Math.floor(Math.random() * 6) - 2; // -2..+3
  const eff = effectiveness(move.type, defenderTypes);
  // Floor of 1 only when the attack actually connects — zero effect means
  // zero damage so kids learn that immunity is real.
  if (eff === 0) return 0;
  return Math.max(2, Math.round((base + variance) * eff));
}

type Phase = 'sendOut' | 'appear' | 'menu' | 'fightMenu' | 'swapMenu' | 'animating' | 'enemyTurn' | 'question' | 'throwing' | 'result';

export default function BattleScreen({ wild, state, onStateChange, onExit, trainerName, trainerReward, trainerKind }: Props) {
  const level = getLevel(state);
  const myMember: PartyMember | null = state.team[0] || null;
  if (myMember) ensureMemberHp(myMember, level);

  // Wild Pokémon are kept slightly weaker than Addie's level so battles
  // feel fair. Trainer-owned mons stay at Addie's level so battles are still
  // a real challenge.
  const wildLevel = useMemo(
    () => trainerName ? level : wildLevelFor(level),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wild.id, trainerName, level],
  );

  const wildMaxHp = useMemo(() => 40 + wild.rarity * 18 + wildLevel * 4, [wild, wildLevel]);
  const [wildHp, setWildHp] = useState(wildMaxHp);
  const [myHpDisplay, setMyHpDisplay] = useState(myMember?.hp ?? 0);

  const [phase, setPhase] = useState<Phase>('sendOut');
  const [question, setQuestion] = useState(() => questionFor(wild, level));
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [berryBoost, setBerryBoost] = useState(0);
  const introMsg = trainerName ? `${trainerName} sent out ${displayName(wild)}!` : `A wild ${displayName(wild)} appeared!`;
  const [log, setLog] = useState(introMsg);
  const [feedback, setFeedback] = useState('');
  const [shaking, setShaking] = useState(false);
  const [wildHurt, setWildHurt] = useState(false);
  const [myHurt, setMyHurt] = useState(false);
  const [monVisible, setMonVisible] = useState(false);
  const [caught, setCaught] = useState(false);
  const [attacker, setAttacker] = useState<null | 'me' | 'wild'>(null);
  const [wildFainted, setWildFainted] = useState(false);
  const [myFainted, setMyFainted] = useState(false);
  // Post-battle reward callout — populated by onWildFaint, rendered as an
  // overlay during the 'result' phase so Addie can see the points she earned.
  const [reward, setReward] = useState<{
    xpGain: number; lvlBefore: number; lvlAfter: number; xpHave: number; xpNeed: number;
  } | null>(null);
  const exited = useRef(false);
  // Bumped whenever the active lead changes (e.g., swap) so queued
  // enemy-turn timers can no-op rather than hit the wrong Pokémon.
  const turnToken = useRef(0);

  const [bg, text] = TYPE_COLORS[wild.types[0]] || TYPE_COLORS.normal;
  const myMoves = useMemo(() => getMoves(myMember?.types || ['normal']), [myMember]);

  // Persist HP on whichever Pokémon is currently in the lead slot
  // (re-read at call time so swaps don't write to a stale closure).
  function commitMyHp(newHp: number) {
    const lead = state.team[0];
    if (!lead) return;
    ensureMemberHp(lead, level);
    lead.hp = Math.max(0, Math.min(lead.maxHp ?? memberMaxHp(lead, level), newHp));
    setMyHpDisplay(lead.hp);
    onStateChange({ ...state });
  }

  useEffect(() => {
    // sendOut intro (Addie vs opponent VS screen) → appear (Pokémon out) → menu
    const t1 = setTimeout(() => {
      setPhase('appear');
      setMonVisible(true);
      if (myMember) setLog(`Go, ${myMember.name}!`);
    }, 1800);
    const t2 = setTimeout(() => setPhase('menu'), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't let Escape during the result/celebration window override a
      // win — `safeExit` is first-call-wins, so flee would clobber the
      // trainer-defeated flag and skip rewards.
      if (e.key !== 'Escape') return;
      if (phase === 'result' || wildFainted || caught || myFainted) return;
      handleFlee();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, wildFainted, caught, myFainted]);

  function safeExit(caughtFlag: boolean, defeatedTrainer = false) {
    if (exited.current) return;
    exited.current = true;
    onExit(caughtFlag, defeatedTrainer);
  }

  function pickMove(m: Move) {
    if (phase !== 'fightMenu' && phase !== 'menu') return;
    setPhase('animating');
    setLog(`${myMember?.name} used ${m.name}! ${m.emoji}`);
    const dmg = calcDamage(m, wild.types, level);
    setAttacker('me');
    setTimeout(() => setWildHurt(true), 320);
    setTimeout(() => setAttacker(null), 520);
    setTimeout(() => {
      const newHp = Math.max(0, wildHp - dmg);
      setWildHp(newHp);
      const eff = effectiveness(m.type, wild.types);
      if (eff > 1) setFeedback("It's super effective!");
      else setFeedback('');
      if (newHp <= 0) {
        setWildHurt(false);
        setWildFainted(true);
        setTimeout(() => onWildFaint(), 1000);
      } else {
        setTimeout(() => enemyTurn(), 900);
      }
    }, 450);
    setTimeout(() => setWildHurt(false), 850);
  }

  function enemyTurn() {
    const token = turnToken.current;
    const lead0 = state.team[0];
    if (!lead0) return;
    setPhase('enemyTurn');
    const wildMoves = getMoves(wild.types);
    const wildMove = wildMoves[Math.floor(Math.random() * wildMoves.length)];
    setLog(`Wild ${displayName(wild)} used ${wildMove.name}! ${wildMove.emoji}`);
    setFeedback('');
    setAttacker('wild');
    setTimeout(() => setMyHurt(true), 320);
    setTimeout(() => setAttacker(null), 520);
    setTimeout(() => {
      // Re-read the lead at execution time and bail if a swap happened.
      if (turnToken.current !== token) return;
      const lead = state.team[0];
      if (!lead) return;
      ensureMemberHp(lead, level);
      const dmg = calcDamage(wildMove, lead.types, Math.max(1, Math.floor(wildLevel * 0.8)));
      const newMyHp = Math.max(0, (lead.hp ?? lead.maxHp ?? 0) - dmg);
      commitMyHp(newMyHp);
      if (newMyHp <= 0) {
        setMyHurt(false);
        setMyFainted(true);
        setTimeout(() => onMyFaint(), 1000);
      } else {
        setTimeout(() => { setPhase('menu'); setLog('What will you do?'); }, 700);
      }
    }, 450);
    setTimeout(() => setMyHurt(false), 850);
  }

  function onWildFaint() {
    // Grant XP for the win: trainers worth more than wilds.
    const lvlBefore = getLevel(state);
    const xpGain = trainerName ? 3 : 1 + Math.max(0, wild.rarity - 1);
    grantXp(state, xpGain);
    const lvlAfter = getLevel(state);
    const leveledUp = lvlAfter > lvlBefore;
    onStateChange({ ...state });
    const xpAfter = xpToNextLevel(state);
    setReward({ xpGain, lvlBefore, lvlAfter, xpHave: xpAfter.have, xpNeed: xpAfter.need });
    const lvlMsg = leveledUp ? ` ⭐ LEVEL UP! Now Lv.${lvlAfter}!` : ` (+${xpGain} XP)`;
    if (trainerName) {
      setFeedback(`🏆 You beat ${trainerName}!${lvlMsg}`);
      setLog(`Wild ${displayName(wild)} fainted!`);
      setPhase('result');
      setTimeout(() => safeExit(false, true), 2600);
    } else {
      setFeedback(`${displayName(wild)} fainted!${lvlMsg}`);
      setLog('');
      setPhase('result');
      setTimeout(() => safeExit(false, false), 2600);
    }
  }

  function onMyFaint() {
    setFeedback(`💫 ${myMember?.name} fainted! Hurry to the Pokémon Center!`);
    setLog('');
    setPhase('result');
    setTimeout(() => safeExit(false, false), 2000);
  }

  function openCatch() {
    if (trainerName) {
      setFeedback("You can't catch another trainer's Pokémon!");
      setTimeout(() => setFeedback(''), 1400);
      return;
    }
    setPhase('question');
    setLog('Throw a Poké Ball — answer the question to make it count!');
  }

  function handleAnswer(idx: number) {
    if (phase !== 'question') return;
    const correct = idx === question.answerIndex;
    resolveAnswer(correct);
  }

  // Spell-the-picture: Addie types the word. Case- and whitespace-insensitive.
  function handleSpellSubmit(typed: string) {
    if (phase !== 'question') return;
    const expected = (question.answer || question.choices[question.answerIndex] || '').trim().toUpperCase();
    const got = typed.trim().toUpperCase();
    resolveAnswer(got === expected);
  }

  function resolveAnswer(correct: boolean) {
    recordAnswer(state, correct);
    onStateChange({ ...state });

    if (correct) {
      setFeedback('🌟 Great answer, Addie! Throwing a Poké Ball…');
      setPhase('throwing');
      setTimeout(() => throwBall(true), 700);
    } else {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      const ans = question.answer || question.choices[question.answerIndex];
      setFeedback(`So close! The answer was "${ans}". ${question.hint || ''}`);
      if (newAttempts <= 0) {
        setTimeout(() => handleFlee(), 1500);
      } else {
        setTimeout(() => {
          setQuestion(questionFor(wild, level));
          setFeedback('');
          // Wild gets a free attack for the wrong answer
          enemyTurn();
        }, 1600);
      }
    }
  }

  function throwBall(answeredRight: boolean) {
    setShaking(true);
    if (!useBall(state)) {
      setFeedback('Out of Poké Balls! Visit the Pokémon Center!');
      setTimeout(() => handleFlee(), 1500);
      return;
    }
    onStateChange({ ...state });
    // Kid-friendly catch chance: high base by rarity, bonus for low wild HP and right answer.
    // Floor at 0.6 so a correct answer almost always catches a common Pokémon.
    const base = wild.rarity === 1 ? 0.80 : wild.rarity === 2 ? 0.60 : 0.45;
    const hpFactor = 1 - (wildHp / wildMaxHp);          // 0..1
    const hpBonus = hpFactor * 0.30;
    const answerBonus = answeredRight ? 0.20 : 0;
    const minWhenCorrect = answeredRight ? 0.6 : 0.25;
    const chance = Math.max(minWhenCorrect, Math.min(0.98, base + hpBonus + answerBonus + berryBoost));
    const didCatch = Math.random() < chance;
    setTimeout(() => {
      setShaking(false);
      if (didCatch) {
        recordCatch(state, wild);
        onStateChange({ ...state });
        setCaught(true);
        setFeedback(`🎉 Yay! ${displayName(wild)} joined your adventure!`);
        setPhase('result');
        setTimeout(() => safeExit(true, false), 2200);
      } else {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);
        setFeedback(`Oh no! ${displayName(wild)} broke free!`);
        if (newAttempts <= 0 || state.inventory.pokeball <= 0) {
          setTimeout(() => handleFlee(), 1500);
        } else {
          setTimeout(() => { setPhase('menu'); setFeedback(''); setLog('What will you do?'); }, 1500);
        }
      }
    }, 1600);
  }

  function handleUseBerry() {
    if (phase !== 'menu' && phase !== 'question') return;
    if (!useBerry(state)) {
      setFeedback('No berries left! Visit the Pokémon Center.');
      setTimeout(() => setFeedback(''), 1400);
      return;
    }
    setBerryBoost(b => b + 0.18);
    onStateChange({ ...state });
    setFeedback('🍓 You gave it a Berry — it likes you more now!');
    setTimeout(() => setFeedback(''), 1400);
  }

  // Source can be "team" (swap two roster spots) or "box" (pull from PC, demote lead to box).
  function pickSwap(source: 'team' | 'box', idx: number) {
    if (phase !== 'swapMenu' && phase !== 'menu') return;
    const pool = source === 'team' ? state.team : state.box;
    if (!pool[idx]) return;
    if (source === 'team' && idx === 0) return;
    const target = pool[idx];
    ensureMemberHp(target, level);
    if ((target.hp ?? 0) <= 0) {
      setFeedback(`${target.name} has no energy left!`);
      setTimeout(() => setFeedback(''), 1400);
      return;
    }
    if (source === 'team') {
      const newTeam = [...state.team];
      [newTeam[0], newTeam[idx]] = [newTeam[idx], newTeam[0]];
      state.team = newTeam;
    } else {
      // Pull from box into lead; previous lead goes into the box.
      const newBox = [...state.box];
      const newTeam = [...state.team];
      const previousLead = newTeam[0];
      newTeam[0] = newBox.splice(idx, 1)[0];
      if (previousLead) newBox.push(previousLead);
      state.team = newTeam;
      state.box = newBox;
    }
    turnToken.current += 1;
    onStateChange({ ...state });
    const newLead = state.team[0];
    setMyHpDisplay(newLead.hp ?? newLead.maxHp ?? 0);
    setLog(`Go, ${newLead.name}!`);
    setFeedback('');
    setPhase('enemyTurn');
    setTimeout(() => enemyTurn(), 700);
  }

  function handleFlee() {
    if (exited.current) return;
    setPhase('result');
    if (!feedback.includes('Yay')) setFeedback(`${displayName(wild)} wandered off… maybe next time!`);
    setTimeout(() => safeExit(false, false), 1200);
  }

  const rarityStars = '★'.repeat(wild.rarity);
  const wildHpPct = (wildHp / wildMaxHp) * 100;
  const myMaxHpVal = myMember?.maxHp ?? memberMaxHp(myMember ?? { id:0,name:'?',types:[],caughtAt:0 }, level);
  const wildHpColor = wildHpPct > 50 ? '#7dd87d' : wildHpPct > 20 ? '#f0c050' : '#e85050';
  const myHpPct = myMember ? (myHpDisplay / myMaxHpVal) * 100 : 0;
  const myHpColor = myHpPct > 50 ? '#7dd87d' : myHpPct > 20 ? '#f0c050' : '#e85050';
  const xp = xpToNextLevel(state);
  const myType = (myMember?.types[0] || 'normal').toUpperCase();
  const wildType = wild.types[0].toUpperCase();

  // Idle bob plays when nobody is mid-action so battlers feel alive between turns.
  const idleish = phase === 'menu' || phase === 'fightMenu' || phase === 'swapMenu' || phase === 'question';

  const wildAnim = shaking ? 'shake 0.15s infinite'
    : wildFainted ? 'faintFall 0.9s ease-in forwards'
    : wildHurt ? 'shake 0.12s 3'
    : attacker === 'wild' ? 'lungeWild 0.5s ease-out'
    : caught ? 'none'
    : idleish && monVisible ? 'idleBob 2.6s ease-in-out infinite'
    : monVisible ? 'popIn 0.5s ease-out'
    : 'none';

  const myAnim = myFainted ? 'faintFall 0.9s ease-in forwards'
    : myHurt ? 'shake 0.12s 3'
    : attacker === 'me' ? 'lungePlayer 0.5s ease-out'
    : idleish ? 'idleBob 2.6s ease-in-out 0.4s infinite'
    : 'none';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: '#1d1f24',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Courier New", ui-monospace, monospace',
      letterSpacing: '0.5px',
    }}>
      {phase === 'sendOut' && (
        <SendOutIntro
          message={introMsg}
          addieLevel={level}
          wild={wild}
          trainerName={trainerName}
          trainerKind={trainerKind}
        />
      )}
      {/* ── Grass arena ──────────────────────────────────── */}
      <div style={{
        position: 'relative', flex: '1 1 55%', minHeight: 280,
        background: 'linear-gradient(180deg, #b4e1ff 0%, #d8ecff 35%, #6cc06c 35%, #4ea84e 100%)',
        overflow: 'hidden', borderBottom: '4px solid #1d1f24',
      }}>
        {/* Grass decoration */}
        <GrassDecor />

        {/* Wild Pokémon (top-right) */}
        <div style={{
          position: 'absolute', right: '8%', top: '10%',
          width: 200, height: 200,
          transformOrigin: 'center bottom',
        }}>
          {/* Anchored ground shadow — pulses gently in sync with the breath
              so the silhouette feels planted instead of hovering. */}
          {monVisible && !caught && !wildFainted && (
            <div style={{
              position: 'absolute', left: '50%', bottom: 6,
              width: '62%', height: 16,
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 70%)',
              animation: idleish ? 'shadowPulse 2.6s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
            }} />
          )}
          <div style={{
            width: '100%', height: '100%',
            animation: wildAnim,
            transformOrigin: 'center bottom',
            filter: wildHurt ? 'brightness(1.6) hue-rotate(330deg)' : 'none',
          }}>
          <BattleSprite id={wild.id} alt={displayName(wild)} style={{
            width: '100%', height: '100%',
            opacity: monVisible ? (caught ? 0 : 1) : 0,
            transition: 'opacity 0.3s',
          }} />
          {caught && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '88px', animation: 'popIn 0.4s ease-out',
            }}>🔴</div>
          )}
          </div>
        </div>

        {/* Player Pokémon (bottom-left) */}
        <div style={{
          position: 'absolute', left: '14%', bottom: '4%',
          width: 220, height: 220,
          transformOrigin: 'center bottom',
        }}>
          {/* Anchored ground shadow — pulses in sync with the breath, offset
              by 0.4 s to match the player's idle so it doesn't lockstep with the wild. */}
          {myMember && !myFainted && (
            <div style={{
              position: 'absolute', left: '50%', bottom: 4,
              width: '66%', height: 18,
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0) 70%)',
              animation: idleish ? 'shadowPulse 2.6s ease-in-out 0.4s infinite' : 'none',
              pointerEvents: 'none',
            }} />
          )}
          <div style={{
            width: '100%', height: '100%',
            animation: myAnim,
            transformOrigin: 'center bottom',
            filter: myHurt ? 'brightness(1.6) hue-rotate(330deg)' : 'none',
          }}>
          {myMember && (
            <BattleSprite id={myMember.id} back alt={myMember.name} style={{
              width: '100%', height: '100%',
            }} />

          )}
          </div>
        </div>

        {/* Wild HP card (top-left) */}
        <RetroHpCard
          name={displayName(wild)} level={wildLevel} typeLabel={wildType} stars={rarityStars}
          hp={wildHp} max={wildMaxHp} color={wildHpColor}
          showHpNums showExp={false}
          style={{ position: 'absolute', left: 28, top: 22, minWidth: 280 }}
        />

        {/* Player HP card (mid-right) */}
        {myMember && (
          <RetroHpCard
            name={myMember.name} level={level} typeLabel={myType} stars=""
            hp={myHpDisplay} max={myMaxHpVal} color={myHpColor}
            showHpNums showExp xpHave={xp.have} xpNeed={xp.need}
            style={{ position: 'absolute', right: 28, bottom: '38%', minWidth: 280 }}
          />
        )}

        {/* Run button (top-right) — hidden once the battle has resolved so
            a late click can't override a win via first-call-wins safeExit. */}
        {phase !== 'result' && !wildFainted && !caught && !myFainted && (
          <button onClick={handleFlee} style={{
            position: 'absolute', top: 20, right: 28,
            background: '#d44a3a', color: '#fff',
            border: '3px solid #1d1f24', borderRadius: 8,
            padding: '8px 18px', fontWeight: 'bold', fontSize: 16,
            fontFamily: 'inherit', letterSpacing: '1px',
            cursor: 'pointer', boxShadow: '0 4px 0 #7a1f15',
          }}>Run ×</button>
        )}

        {/* ── Post-battle reward callout ──────────────────────
            Shows a big visible "+X EXP" panel after a win so Addie can
            celebrate the points she earned (the dialogue strip alone
            buried this). Hides itself if the battle was a loss/flee. */}
        {phase === 'result' && reward && !myFainted && !caught && (
          <RewardCallout
            xpGain={reward.xpGain}
            leveledUp={reward.lvlAfter > reward.lvlBefore}
            lvlAfter={reward.lvlAfter}
            xpHave={reward.xpHave}
            xpNeed={reward.xpNeed}
            trainerName={trainerName}
          />
        )}
      </div>

      {/* ── Dialogue strip ──────────────────────────────── */}
      <div style={{
        background: '#f1ebd6', borderTop: '4px solid #1d1f24', borderBottom: '4px solid #1d1f24',
        padding: '14px 28px', minHeight: 70,
        color: '#3a3528', fontWeight: 'bold', fontSize: 17,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
      }}>
        {log && <div style={{ opacity: 0.78 }}>{log}</div>}
        {feedback && <div style={{ color: '#7a2f1f' }}>▸ {feedback}</div>}
        {!log && !feedback && <div style={{ opacity: 0.5 }}>…</div>}
      </div>

      {/* ── Action panel ────────────────────────────────── */}
      <div style={{
        background: '#1d1f24', padding: '16px 24px', minHeight: 180,
      }}>
        {phase === 'menu' && (() => {
          // Anyone alive besides the current lead — team or box.
          const swapPartners =
            state.team.slice(1).filter(m => { ensureMemberHp(m, level); return (m.hp ?? 0) > 0; }).length +
            state.box.filter(m => { ensureMemberHp(m, level); return (m.hp ?? 0) > 0; }).length;
          const swapSub = swapPartners > 0
            ? `${swapPartners} ready`
            : (state.team.length + state.box.length) > 1 ? 'All fainted' : 'Catch more!';
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
              <RetroCard icon="⚔️" title="Fight" sub="Use a move" accent="#e85050" onClick={() => setPhase('fightMenu')} />
              <RetroCard icon="🔄" title="Swap" sub={swapSub} accent="#5ba36f" onClick={() => setPhase('swapMenu')} disabled={swapPartners === 0} />
              <RetroCard icon="●" title="Catch" sub={trainerName ? 'Trainer Pokémon' : "Throw a ball"} accent="#e85050" onClick={openCatch} disabled={!!trainerName} />
              <RetroCard icon="🍓" title="Berry" sub={`×${state.inventory.berry} left`} accent="#ec5f9b" onClick={handleUseBerry} />
              <RetroCard icon="🏃" title="Run" sub="Flee battle" accent="#9ca3af" onClick={handleFlee} />
            </div>
          );
        })()}

        {phase === 'swapMenu' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 10, color: '#f0c050', fontSize: 13, fontWeight: 'bold', letterSpacing: '1px' }}>
              CHOOSE A POKÉMON
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 900, margin: '0 auto' }}>
              {state.team.map((m, i) => {
                ensureMemberHp(m, level);
                const isActive = i === 0;
                const fainted = (m.hp ?? 0) <= 0;
                const max = m.maxHp ?? memberMaxHp(m, level);
                const pct = Math.max(0, ((m.hp ?? 0) / max) * 100);
                const c = pct > 50 ? '#7dd87d' : pct > 20 ? '#f0c050' : '#e85050';
                return (
                  <button key={`t${i}`} disabled={isActive || fainted} onClick={() => pickSwap('team', i)} style={{
                    background: '#2a2d33',
                    border: `2px solid ${isActive ? '#666' : fainted ? '#3a3d44' : '#5ba36f'}`,
                    borderRadius: 10, padding: '12px',
                    fontFamily: 'inherit', cursor: (isActive || fainted) ? 'not-allowed' : 'pointer',
                    opacity: (isActive || fainted) ? 0.45 : 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    color: '#f1ebd6',
                  }}>
                    <img src={homeSpriteUrl(m.id)} alt={m.name} style={{ width: 64, height: 64 }}
                      onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = spriteUrl(m.id); img.style.imageRendering = 'pixelated'; }} />
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{m.name}</div>
                    <div style={{ width: '100%', background: '#1a1d21', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, background: c, height: '100%', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9aa0a8' }}>
                      {isActive ? 'IN BATTLE' : fainted ? 'FAINTED' : `${m.hp}/${max} HP`}
                    </div>
                  </button>
                );
              })}
            </div>

            {state.box.length > 0 && (
              <>
                <div style={{ textAlign: 'center', margin: '14px 0 8px', color: '#90c4d8', fontSize: 12, fontWeight: 'bold', letterSpacing: '1px' }}>
                  FROM PC BOX (sends current Pokémon to box)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 900, margin: '0 auto' }}>
                  {state.box.map((m, i) => {
                    ensureMemberHp(m, level);
                    const fainted = (m.hp ?? 0) <= 0;
                    const max = m.maxHp ?? memberMaxHp(m, level);
                    const pct = Math.max(0, ((m.hp ?? 0) / max) * 100);
                    const c = pct > 50 ? '#7dd87d' : pct > 20 ? '#f0c050' : '#e85050';
                    return (
                      <button key={`b${i}`} disabled={fainted} onClick={() => pickSwap('box', i)} style={{
                        background: '#22272e',
                        border: `2px solid ${fainted ? '#3a3d44' : '#5b8aa3'}`,
                        borderRadius: 10, padding: '12px',
                        fontFamily: 'inherit', cursor: fainted ? 'not-allowed' : 'pointer',
                        opacity: fainted ? 0.45 : 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        color: '#f1ebd6',
                      }}>
                        <img src={homeSpriteUrl(m.id)} alt={m.name} style={{ width: 64, height: 64 }}
                          onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = spriteUrl(m.id); img.style.imageRendering = 'pixelated'; }} />
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{m.name}</div>
                        <div style={{ width: '100%', background: '#1a1d21', borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${pct}%`, background: c, height: '100%', borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#9aa0a8' }}>
                          {fainted ? 'FAINTED' : `${m.hp}/${max} HP`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => setPhase('menu')} style={backBtnStyle}>← Back</button>
            </div>
          </div>
        )}

        {phase === 'fightMenu' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 800, margin: '0 auto' }}>
              {myMoves.map(m => (
                <RetroCard
                  key={m.name}
                  icon={m.emoji}
                  title={m.name}
                  sub={`PWR ${m.power} · ${m.type.toUpperCase()}`}
                  accent={(TYPE_COLORS[m.type] || TYPE_COLORS.normal)[1]}
                  onClick={() => pickMove(m)}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => setPhase('menu')} style={backBtnStyle}>← Back</button>
            </div>
          </div>
        )}

        {phase === 'question' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 8, color: '#f0c050', fontSize: 13, fontWeight: 'bold', letterSpacing: '1px' }}>
              {question.subject.toUpperCase()} · LV {level} QUESTION · TRIES {attemptsLeft}
            </div>
            {question.kind === 'spell' ? (
              <SpellPicturePanel
                question={question}
                onSubmit={(typed) => handleSpellSubmit(typed)}
              />
            ) : (
              <>
                <div style={{
                  textAlign: 'center', color: '#f1ebd6', fontSize: 18, fontWeight: 'bold',
                  marginBottom: 14, lineHeight: 1.4,
                }}>{question.prompt}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 800, margin: '0 auto' }}>
                  {question.choices.map((choice, i) => (
                    <button key={i} onClick={() => handleAnswer(i)} style={{
                      background: '#2a2d33',
                      border: `2px solid ${CHOICE_BORDERS[i % 4]}`,
                      borderRadius: 10, padding: '14px 18px',
                      fontFamily: 'inherit', fontWeight: 'bold', fontSize: 16,
                      color: '#f1ebd6', cursor: 'pointer', transition: 'filter 0.1s',
                      letterSpacing: '0.5px',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#3a3d44')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#2a2d33')}>
                      {String.fromCharCode(65 + i)}. {choice}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button onClick={() => { setPhase('menu'); setLog('What will you do?'); }} style={backBtnStyle}>← Back to menu</button>
            </div>
          </>
        )}

        {phase === 'throwing' && (
          <div style={{ textAlign: 'center', color: '#f0c050', fontSize: 22, fontWeight: 'bold', padding: 24, letterSpacing: '2px' }}>
            ● POKÉ BALL THROWN…
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
        @keyframes idleBob {
          0%,100% { transform: scale(1, 1); }
          50%     { transform: scale(1.012, 0.985); }
        }
        @keyframes shadowPulse {
          0%,100% { transform: translateX(-50%) scale(1, 1);    opacity: 1; }
          50%     { transform: translateX(-50%) scale(1.08, 1); opacity: 0.82; }
        }
        @keyframes lungePlayer {
          0%   { transform: translate(0,0) scale(1); }
          45%  { transform: translate(110px,-90px) scale(1.08); }
          70%  { transform: translate(90px,-70px) scale(1.05); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes lungeWild {
          0%   { transform: translate(0,0) scale(1); }
          45%  { transform: translate(-110px,80px) scale(1.08); }
          70%  { transform: translate(-90px,65px) scale(1.05); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes faintFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; filter: brightness(1); }
          40%  { transform: translateY(-12px) rotate(15deg); opacity: 1; }
          100% { transform: translateY(80px) rotate(90deg); opacity: 0; filter: brightness(0.5) grayscale(0.7); }
        }
        @keyframes rewardPop {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          55%  { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
        }
        @keyframes xpFill {
          from { transform: scaleX(var(--xp-from, 0)); }
          to   { transform: scaleX(var(--xp-to, 1));   }
        }
        @keyframes sparkleSpin {
          from { transform: rotate(0deg);  }
          to   { transform: rotate(360deg);}
        }
      `}</style>
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      <span style={{ display: 'none' }}>{trainerReward}{bg}{text}</span>
    </div>
  );
}

const CHOICE_BORDERS = ['#5ba36f', '#5b8aa3', '#a37a4a', '#8a5ba3'];

// Spell-the-picture panel: shows an emoji "picture" and a typing input with
// one box per letter of the answer. Addie can type freely or click letters;
// Enter (or the Check button) submits.
function SpellPicturePanel({ question, onSubmit }: { question: Question; onSubmit: (typed: string) => void }) {
  const expected = (question.answer || question.choices[question.answerIndex] || '').toUpperCase();
  const letters = expected.length;
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-focus and clear input each time the question changes (e.g. after a wrong answer).
  useEffect(() => {
    setTyped('');
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [question]);

  const submit = () => {
    if (typed.trim().length === 0) return;
    onSubmit(typed);
  };

  // Visual letter boxes that mirror what's in the input.
  const boxes = Array.from({ length: letters }, (_, i) => typed[i]?.toUpperCase() || '');

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ color: '#f1ebd6', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        {question.prompt}
      </div>
      {/* Big emoji "picture" */}
      <div style={{
        fontSize: 140, lineHeight: 1,
        margin: '6px 0 10px',
        filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.35))',
      }}>{question.image || '❓'}</div>

      {/* Hint = number of letters */}
      <div style={{ color: '#90c4d8', fontSize: 13, fontWeight: 'bold', letterSpacing: '1px', marginBottom: 10 }}>
        {letters} {letters === 1 ? 'LETTER' : 'LETTERS'}
      </div>

      {/* Visual letter boxes */}
      <div
        style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14, cursor: 'text' }}
        onClick={() => inputRef.current?.focus()}
      >
        {boxes.map((ch, i) => (
          <div key={i} style={{
            width: 42, height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: ch ? '#2a3a2a' : '#22272e',
            border: `2px solid ${ch ? '#7dd87d' : '#5b8aa3'}`,
            borderRadius: 8,
            color: '#f1ebd6', fontSize: 26, fontWeight: 'bold',
            fontFamily: '"Courier New", monospace',
          }}>{ch}</div>
        ))}
      </div>

      {/* Hidden-ish text input drives the boxes. Kept visible so on-screen
          keyboards (mobile) still work; styled small + centered. */}
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={typed}
        maxLength={letters}
        onChange={(e) => {
          // Letters only, uppercase as she types.
          const cleaned = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, letters);
          setTyped(cleaned);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="type your answer"
        style={{
          width: 220, padding: '8px 12px',
          background: '#1a1d21', color: '#f1ebd6',
          border: '2px solid #5b8aa3', borderRadius: 8,
          fontFamily: '"Courier New", monospace',
          fontSize: 16, textAlign: 'center', letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={submit} disabled={typed.length === 0} style={{
          background: typed.length === 0 ? '#3a3d44' : '#5ba36f',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 22px', fontSize: 16, fontWeight: 'bold',
          fontFamily: '"Courier New", monospace', letterSpacing: '1px',
          cursor: typed.length === 0 ? 'not-allowed' : 'pointer',
        }}>✓ CHECK</button>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  background: 'transparent', color: '#f0c050',
  border: '1px solid rgba(240,192,80,0.4)', borderRadius: 6,
  padding: '5px 14px', cursor: 'pointer', fontSize: 12,
  fontFamily: '"Courier New", monospace', letterSpacing: '1px',
};

function RetroCard({ icon, title, sub, accent, onClick, disabled }: {
  icon: string; title: string; sub: string; accent: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: '#2a2d33',
      border: `2px solid ${disabled ? '#3a3d44' : accent}`,
      borderRadius: 10, padding: '16px 12px',
      fontFamily: '"Courier New", monospace', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      color: '#f1ebd6', transition: 'transform 0.08s, background 0.1s',
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = '#3a3d44')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = '#2a2d33')}
    >
      <div style={{ fontSize: 22, color: accent, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: '1px' }}>{title}</div>
      <div style={{ fontSize: 11, color: '#9aa0a8', letterSpacing: '1px' }}>{sub.toUpperCase()}</div>
    </button>
  );
}

function RetroHpCard({
  name, level, typeLabel, stars, hp, max, color,
  showHpNums, showExp, xpHave, xpNeed, style,
}: {
  name: string; level: number; typeLabel: string; stars: string;
  hp: number; max: number; color: string;
  showHpNums?: boolean; showExp?: boolean; xpHave?: number; xpNeed?: number;
  style?: React.CSSProperties;
}) {
  const pct = Math.max(0, (hp / max) * 100);
  const xpPct = showExp && xpNeed ? Math.max(0, Math.min(100, ((xpHave ?? 0) / xpNeed) * 100)) : 0;
  return (
    <div style={{
      background: 'rgba(20,22,28,0.92)',
      border: '3px solid #f0c050',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 0 rgba(0,0,0,0.3)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: '#f1ebd6', fontWeight: 'bold', fontSize: 18, letterSpacing: '1px' }}>{name}</span>
        <span style={{ color: '#bfc3cc', fontSize: 13 }}>Lv.{level}</span>
        {stars && <span style={{ color: '#f0c050', fontSize: 14, marginLeft: 'auto' }}>{stars}</span>}
      </div>
      <div style={{
        display: 'inline-block', marginTop: 6,
        background: '#3a3528', color: '#f1ebd6', fontSize: 11, fontWeight: 'bold',
        padding: '3px 10px', borderRadius: 4, letterSpacing: '1px',
        border: '1px solid #5a5340',
      }}>{typeLabel}</div>
      <div style={{
        background: '#0e0f12', borderRadius: 4, height: 8, marginTop: 8, overflow: 'hidden',
        border: '1px solid #3a3d44',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease-out',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, fontWeight: 'bold' }}>
        {showHpNums && (
          <span style={{ color: '#bfc3cc' }}>{Math.ceil(hp)}/{max} HP</span>
        )}
        {showExp && xpNeed && (
          <span style={{ color: '#7fb5ff' }}>EXP {xpHave}/{xpNeed}</span>
        )}
      </div>
      {showExp && xpNeed && (
        <div style={{
          background: '#0e0f12', borderRadius: 4, height: 5, marginTop: 2, overflow: 'hidden',
          border: '1px solid #3a3d44',
        }}>
          <div style={{ width: `${xpPct}%`, height: '100%', background: '#5b8aff', transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

function RewardCallout({
  xpGain, leveledUp, lvlAfter, xpHave, xpNeed, trainerName,
}: {
  xpGain: number; leveledUp: boolean; lvlAfter: number;
  xpHave: number; xpNeed: number; trainerName?: string;
}) {
  const xpPct = Math.max(0, Math.min(100, (xpHave / Math.max(1, xpNeed)) * 100));
  const title = leveledUp
    ? `LEVEL UP!  Lv. ${lvlAfter}`
    : trainerName
      ? `Victory!`
      : `You won!`;
  const titleColor = leveledUp ? '#ffe066' : '#ffd54a';
  const ringColor = leveledUp ? '#ffd54a' : '#7dd87d';
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'linear-gradient(160deg, rgba(20,12,4,0.96) 0%, rgba(10,6,2,0.96) 100%)',
      border: `4px solid ${ringColor}`,
      borderRadius: 20,
      padding: '20px 36px 22px',
      minWidth: 320,
      textAlign: 'center',
      boxShadow: `0 0 60px ${leveledUp ? 'rgba(255,213,74,0.55)' : 'rgba(125,216,125,0.45)'}, 0 8px 0 rgba(0,0,0,0.4)`,
      animation: 'rewardPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {leveledUp && (
        <div style={{
          position: 'absolute', inset: -18,
          background: 'radial-gradient(circle, rgba(255,213,74,0.18) 0%, transparent 65%)',
          borderRadius: '50%', pointerEvents: 'none',
          animation: 'sparkleSpin 8s linear infinite',
        }} />
      )}
      <div style={{
        color: titleColor, fontWeight: 'bold', fontSize: 22,
        letterSpacing: '2px', textShadow: '0 2px 0 rgba(0,0,0,0.5)',
      }}>
        {leveledUp ? '⭐ ' : '🏆 '}{title}{leveledUp ? ' ⭐' : ''}
      </div>
      <div style={{
        marginTop: 12,
        color: '#fff7d6', fontWeight: 'bold', fontSize: 40,
        letterSpacing: '1px', lineHeight: 1,
        textShadow: '0 3px 0 rgba(0,0,0,0.5)',
      }}>
        +{xpGain} <span style={{ fontSize: 22, color: '#9d7a3a' }}>EXP</span>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          color: '#bfc3cc', fontSize: 11, fontWeight: 'bold',
          letterSpacing: '1px', marginBottom: 4,
        }}>
          <span>EXP</span>
          <span>{xpHave} / {xpNeed}</span>
        </div>
        <div style={{
          background: '#0e0f12', borderRadius: 6, height: 12,
          border: '2px solid #3a3d44', overflow: 'hidden',
        }}>
          <div style={{
            width: `${xpPct}%`, height: '100%',
            background: leveledUp
              ? 'linear-gradient(90deg, #ffd54a, #ffe066, #ffd54a)'
              : 'linear-gradient(90deg, #5b8aff, #7dafff)',
            transition: 'width 0.8s ease-out',
            boxShadow: leveledUp ? '0 0 10px rgba(255,213,74,0.7)' : 'none',
          }} />
        </div>
      </div>
    </div>
  );
}

// One-line pre-battle taunt per trainer class. Shown in a speech bubble next
// to the trainer portrait on the VS intro so each class feels distinct.
const TRAINER_TAUNTS: Record<NPCTrainer['kind'], string> = {
  hiker:  "Off the trail, kiddo!",
  fisher: "Caught one — now I'll catch you!",
  camper: "S'more battles, please!",
  bug:    "My bugs bite back!",
  lass:   "Don't cry when you lose!",
};

function SendOutIntro({ message, addieLevel, wild, trainerName, trainerKind }: {
  message: string; addieLevel: number; wild: Pokemon;
  trainerName?: string; trainerKind?: NPCTrainer['kind'];
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'radial-gradient(ellipse at center, #6a2a5a 0%, #2a1428 80%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Courier New", monospace',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      {/* Banner */}
      <div style={{
        padding: '14px 24px',
        background: 'rgba(20,10,24,0.55)',
        borderBottom: '2px solid rgba(255,213,74,0.3)',
      }}>
        <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: 22, letterSpacing: '1px' }}>
          {message}
        </div>
        <div style={{ color: '#e0d4c0', fontSize: 12, marginTop: 4, letterSpacing: '1px' }}>
          {wild.types[0].toUpperCase()} · Rarity {'★'.repeat(wild.rarity)} · Addie Lv. {addieLevel}
        </div>
      </div>
      {/* VS arena */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0 60px', position: 'relative',
      }}>
        <div style={{ textAlign: 'center', animation: 'slideInLeft 0.5s ease-out' }}>
          <AddieSprite size={180} facing="right" />
          <div style={{ color: '#ffd54a', fontSize: 14, fontWeight: 'bold', marginTop: 6, letterSpacing: '1px' }}>
            Addie · Lv. {addieLevel}
          </div>
          <div style={{ color: '#7dd87d', fontSize: 18, marginTop: 2 }}>● ●</div>
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.55)', fontSize: 56, fontWeight: 'bold',
          letterSpacing: '4px', textShadow: '0 4px 0 rgba(0,0,0,0.4)',
          animation: 'popIn 0.4s ease-out 0.2s both',
        }}>VS</div>
        <div style={{ textAlign: 'center', animation: 'slideInRight 0.5s ease-out' }}>
          {trainerName && trainerKind ? (
            <>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{
                  position: 'absolute',
                  right: 'calc(100% + 12px)',
                  top: 18,
                  maxWidth: 200,
                  background: '#fff',
                  color: '#2a1428',
                  border: '2px solid #1a0d00',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: 14,
                  fontWeight: 'bold',
                  lineHeight: 1.25,
                  textAlign: 'left',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
                  whiteSpace: 'normal',
                  animation: 'tauntPop 0.35s ease-out 0.35s both',
                }}>
                  “{TRAINER_TAUNTS[trainerKind]}”
                  <span style={{
                    position: 'absolute',
                    right: -10,
                    top: 16,
                    width: 0, height: 0,
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderLeft: '10px solid #1a0d00',
                  }} />
                  <span style={{
                    position: 'absolute',
                    right: -7,
                    top: 18,
                    width: 0, height: 0,
                    borderTop: '6px solid transparent',
                    borderBottom: '6px solid transparent',
                    borderLeft: '8px solid #fff',
                  }} />
                </div>
                <TrainerSprite kind={trainerKind} size={180} facing="left" />
              </div>
              <div style={{ color: '#ffd54a', fontSize: 14, fontWeight: 'bold', marginTop: 6, letterSpacing: '1px' }}>
                {trainerName}
              </div>
              <div style={{ color: '#e0d4c0', fontSize: 12, marginTop: 2, letterSpacing: '1px' }}>
                sent out {displayName(wild)}
              </div>
            </>
          ) : (
            <>
              <BattleSprite id={wild.id} alt={displayName(wild)} style={{
                width: 180, height: 180,
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.35)) drop-shadow(0 6px 0 rgba(0,0,0,0.22))',
              }} />
              <div style={{ color: '#ffd54a', fontSize: 16, fontWeight: 'bold', marginTop: 6, letterSpacing: '1px' }}>
                {displayName(wild)}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tauntPop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

// Battle-area sprite with a graceful fallback chain so wild + player Pokémon
// idle-animate when possible:
//   front: animated Gen-5 GIF → HOME 3D render → pixel sprite
//   back:  animated Gen-5 back GIF → pixel back sprite → pixel front sprite
// Each stage advances on the previous img's onError. Skips the animated stage
// outright for ids past Gen-5 where no animated source exists.
function BattleSprite({
  id, back = false, alt, style, className,
}: {
  id: number; back?: boolean; alt: string;
  style?: React.CSSProperties; className?: string;
}) {
  const initial: 0 | 1 | 2 = hasAnimatedSprite(id) ? 0 : 1;
  const [stage, setStage] = useState<0 | 1 | 2>(initial);
  // Reset to the best available source whenever the species changes.
  useEffect(() => { setStage(hasAnimatedSprite(id) ? 0 : 1); }, [id]);

  let src: string;
  let pixelated: boolean;
  if (stage === 0) {
    src = animatedSpriteUrl(id, back);
    pixelated = true; // 96px source, scaled up
  } else if (stage === 1) {
    src = back ? backSpriteUrl(id) : homeSpriteUrl(id);
    pixelated = back; // HOME is hi-res; back pixel sprite stays crisp
  } else {
    src = spriteUrl(id);
    pixelated = true;
  }

  return (
    <img
      key={`${id}-${stage}`}
      src={src}
      alt={alt}
      className={className}
      style={{
        ...style,
        imageRendering: pixelated ? 'pixelated' : style?.imageRendering,
      }}
      onError={() => setStage((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}
    />
  );
}

function GrassDecor() {
  // Cute pixel grass + flowers + bg trees
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 1000 600">
      {/* Distant tree line */}
      {Array.from({ length: 22 }).map((_, i) => (
        <polygon key={i}
          points={`${30 + i * 45},220 ${42 + i * 45},195 ${54 + i * 45},220`}
          fill="#3a7a3a" opacity="0.75"
        />
      ))}
      {/* Flowers scattered */}
      {[[160,300,'#f7d24a'],[290,360,'#ff8fb1'],[420,330,'#f7d24a'],[560,380,'#ff8fb1'],[700,310,'#f7d24a'],[820,400,'#fff']].map(([x,y,c],i) => (
        <circle key={i} cx={x as number} cy={y as number} r="5" fill={c as string} stroke="#1d1f24" strokeWidth="1.5"/>
      ))}
      {/* Grass tufts */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = 20 + (i * 33) % 980;
        const y = 460 + ((i * 53) % 120);
        return (
          <g key={i}>
            <path d={`M${x},${y} l-4,-8 M${x},${y} l0,-10 M${x},${y} l4,-8`}
              stroke="#3d8b3d" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </g>
        );
      })}
    </svg>
  );
}
