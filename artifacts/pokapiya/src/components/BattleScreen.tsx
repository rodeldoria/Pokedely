import { useState, useEffect, useRef, useMemo } from 'react';
import type { Pokemon } from '../data/pokedex';
import { displayName, spriteUrl, backSpriteUrl } from '../data/pokedex';
import { questionFor } from '../data/stem';
import { AddieSprite } from './AddieSprite';
import {
  recordAnswer, recordCatch, useBall, useBerry, getLevel,
  ensureMemberHp, memberMaxHp, xpToNextLevel,
} from '../game/save';
import type { TrainerState, PartyMember } from '../game/save';

interface Props {
  wild: Pokemon;
  state: TrainerState;
  onStateChange: (s: TrainerState) => void;
  onExit: (caught: boolean, defeatedTrainer: boolean) => void;
  trainerName?: string;
  trainerReward?: string;
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
  normal:   { name: 'Quick Attack', type: 'normal', power: 13, emoji: '💨' },
};

function getMoves(types: string[]): Move[] {
  const tackle: Move = { name: 'Tackle', type: 'normal', power: 12, emoji: '💥' };
  const t = types[0] || 'normal';
  const special = TYPE_MOVE[t] || TYPE_MOVE.normal;
  return [tackle, special];
}

// Simple effectiveness (kid-friendly subset)
const STRONG_VS: Record<string, string[]> = {
  fire: ['grass','bug','ice','steel'],
  water: ['fire','rock','ground'],
  grass: ['water','rock','ground'],
  electric: ['water','flying'],
  ice: ['grass','ground','flying','dragon'],
  fighting: ['normal','rock','ice','dark','steel'],
  rock: ['fire','flying','bug','ice'],
  psychic: ['fighting','poison'],
  bug: ['grass','psychic','dark'],
  ghost: ['psychic','ghost'],
  dragon: ['dragon'],
  dark: ['psychic','ghost'],
  steel: ['rock','ice','fairy'],
  fairy: ['fighting','dragon','dark'],
  ground: ['fire','electric','rock','steel'],
  flying: ['grass','fighting','bug'],
  poison: ['grass','fairy'],
};

function effectiveness(atk: string, defs: string[]): number {
  const strong = STRONG_VS[atk] || [];
  return defs.some(d => strong.includes(d)) ? 1.5 : 1;
}

function calcDamage(move: Move, defenderTypes: string[], level: number): number {
  const base = move.power + Math.floor(level * 0.6);
  const variance = Math.floor(Math.random() * 6) - 2; // -2..+3
  const eff = effectiveness(move.type, defenderTypes);
  return Math.max(2, Math.round((base + variance) * eff));
}

type Phase = 'sendOut' | 'appear' | 'menu' | 'fightMenu' | 'animating' | 'enemyTurn' | 'question' | 'throwing' | 'result';

export default function BattleScreen({ wild, state, onStateChange, onExit, trainerName, trainerReward }: Props) {
  const level = getLevel(state);
  const myMember: PartyMember | null = state.team[0] || null;
  if (myMember) ensureMemberHp(myMember, level);

  const wildMaxHp = useMemo(() => 40 + wild.rarity * 18 + level * 4, [wild, level]);
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
  const exited = useRef(false);

  const [bg, text] = TYPE_COLORS[wild.types[0]] || TYPE_COLORS.normal;
  const myMoves = useMemo(() => getMoves(myMember?.types || ['normal']), [myMember]);

  // Persist my Pokémon HP after every change
  function commitMyHp(newHp: number) {
    if (!myMember) return;
    myMember.hp = Math.max(0, Math.min(myMember.maxHp ?? memberMaxHp(myMember, level), newHp));
    setMyHpDisplay(myMember.hp);
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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleFlee(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
    setTimeout(() => setWildHurt(true), 150);
    setTimeout(() => {
      const newHp = Math.max(0, wildHp - dmg);
      setWildHp(newHp);
      const eff = effectiveness(m.type, wild.types);
      if (eff > 1) setFeedback("It's super effective!");
      else setFeedback('');
      if (newHp <= 0) {
        setTimeout(() => onWildFaint(), 700);
      } else {
        setTimeout(() => enemyTurn(), 900);
      }
    }, 450);
    setTimeout(() => setWildHurt(false), 850);
  }

  function enemyTurn() {
    if (!myMember) return;
    setPhase('enemyTurn');
    const wildMove = getMoves(wild.types)[Math.random() < 0.5 ? 0 : 1];
    setLog(`Wild ${displayName(wild)} used ${wildMove.name}! ${wildMove.emoji}`);
    setFeedback('');
    setTimeout(() => setMyHurt(true), 150);
    setTimeout(() => {
      const dmg = calcDamage(wildMove, myMember.types, Math.max(1, Math.floor(level * 0.8)));
      const newMyHp = Math.max(0, (myMember.hp ?? myMember.maxHp ?? 0) - dmg);
      commitMyHp(newMyHp);
      if (newMyHp <= 0) {
        setTimeout(() => onMyFaint(), 700);
      } else {
        setTimeout(() => { setPhase('menu'); setLog('What will you do?'); }, 700);
      }
    }, 450);
    setTimeout(() => setMyHurt(false), 850);
  }

  function onWildFaint() {
    if (trainerName) {
      setFeedback(`🏆 You beat ${trainerName}!`);
      setLog(`Wild ${displayName(wild)} fainted!`);
      setPhase('result');
      setTimeout(() => safeExit(false, true), 1800);
    } else {
      setFeedback(`${displayName(wild)} fainted! It ran away before you could catch it.`);
      setLog('');
      setPhase('result');
      setTimeout(() => safeExit(false, false), 1800);
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
    recordAnswer(state, correct);
    onStateChange({ ...state });

    if (correct) {
      setFeedback('🌟 Great answer, Addie! Throwing a Poké Ball…');
      setPhase('throwing');
      setTimeout(() => throwBall(true), 700);
    } else {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setFeedback(`So close! The answer was "${question.choices[question.answerIndex]}". ${question.hint || ''}`);
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
    // Catch chance: base by rarity, big bonus for low wild HP and right answer, small berry boost, scales DOWN by level
    const base = wild.rarity === 1 ? 0.55 : wild.rarity === 2 ? 0.40 : 0.25;
    const hpFactor = 1 - (wildHp / wildMaxHp);          // 0..1
    const hpBonus = hpFactor * 0.45;                     // up to +0.45
    const answerBonus = answeredRight ? 0.18 : 0;
    const levelPenalty = Math.min(0.2, level * 0.012);
    const chance = Math.max(0.18, Math.min(0.97, base + hpBonus + answerBonus + berryBoost - levelPenalty));
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
          animation: shaking ? 'shake 0.15s infinite' : wildHurt ? 'shake 0.12s 3' : monVisible ? 'popIn 0.5s ease-out' : 'none',
          filter: wildHurt ? 'brightness(1.6) hue-rotate(330deg)' : 'none',
        }}>
          <img src={spriteUrl(wild.id)} alt={displayName(wild)} style={{
            width: '100%', height: '100%', imageRendering: 'pixelated',
            opacity: monVisible ? (caught ? 0 : 1) : 0,
            transition: 'opacity 0.3s',
            filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.18))',
          }} />
          {caught && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '88px', animation: 'popIn 0.4s ease-out',
            }}>🔴</div>
          )}
        </div>

        {/* Player Pokémon (bottom-left) */}
        <div style={{
          position: 'absolute', left: '14%', bottom: '4%',
          width: 220, height: 220,
          animation: myHurt ? 'shake 0.12s 3' : 'none',
          filter: myHurt ? 'brightness(1.6) hue-rotate(330deg)' : 'none',
        }}>
          {myMember && (
            <img src={backSpriteUrl(myMember.id)} alt={myMember.name} style={{
              width: '100%', height: '100%', imageRendering: 'pixelated',
              filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.22))',
            }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = spriteUrl(myMember.id); }}/>
          )}
        </div>

        {/* Wild HP card (top-left) */}
        <RetroHpCard
          name={displayName(wild)} level={level} typeLabel={wildType} stars={rarityStars}
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

        {/* Run button (top-right) */}
        <button onClick={handleFlee} style={{
          position: 'absolute', top: 20, right: 28,
          background: '#d44a3a', color: '#fff',
          border: '3px solid #1d1f24', borderRadius: 8,
          padding: '8px 18px', fontWeight: 'bold', fontSize: 16,
          fontFamily: 'inherit', letterSpacing: '1px',
          cursor: 'pointer', boxShadow: '0 4px 0 #7a1f15',
        }}>Run ×</button>
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
        {phase === 'menu' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 1000, margin: '0 auto' }}>
            <RetroCard icon="⚔️" title="Fight" sub="Use a move" accent="#e85050" onClick={() => setPhase('fightMenu')} />
            <RetroCard icon="●" title="Catch" sub={trainerName ? 'Trainer Pokémon' : "Throw a ball"} accent="#e85050" onClick={openCatch} disabled={!!trainerName} />
            <RetroCard icon="🍓" title="Berry" sub={`×${state.inventory.berry} left`} accent="#ec5f9b" onClick={handleUseBerry} />
            <RetroCard icon="🏃" title="Run" sub="Flee battle" accent="#9ca3af" onClick={handleFlee} />
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
      `}</style>
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      <span style={{ display: 'none' }}>{trainerReward}{bg}{text}</span>
    </div>
  );
}

const CHOICE_BORDERS = ['#5ba36f', '#5b8aa3', '#a37a4a', '#8a5ba3'];

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

function SendOutIntro({ message, addieLevel, wild }: {
  message: string; addieLevel: number; wild: Pokemon;
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
          <img src={spriteUrl(wild.id)} alt={displayName(wild)} style={{
            width: 180, height: 180, imageRendering: 'pixelated',
            filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.35)) drop-shadow(0 6px 0 rgba(0,0,0,0.22))',
          }} />
          <div style={{ color: '#ffd54a', fontSize: 16, fontWeight: 'bold', marginTop: 6, letterSpacing: '1px' }}>
            {displayName(wild)}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
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
