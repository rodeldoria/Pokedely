import { useState, useEffect, useRef, useMemo } from 'react';
import type { Pokemon } from '../data/pokedex';
import { displayName, spriteUrl, backSpriteUrl } from '../data/pokedex';
import { questionFor } from '../data/stem';
import {
  recordAnswer, recordCatch, useBall, useBerry, getLevel,
  ensureMemberHp, memberMaxHp,
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

type Phase = 'appear' | 'menu' | 'fightMenu' | 'animating' | 'enemyTurn' | 'question' | 'throwing' | 'result';

export default function BattleScreen({ wild, state, onStateChange, onExit, trainerName, trainerReward }: Props) {
  const level = getLevel(state);
  const myMember: PartyMember | null = state.team[0] || null;
  if (myMember) ensureMemberHp(myMember, level);

  const wildMaxHp = useMemo(() => 40 + wild.rarity * 18 + level * 4, [wild, level]);
  const [wildHp, setWildHp] = useState(wildMaxHp);
  const [myHpDisplay, setMyHpDisplay] = useState(myMember?.hp ?? 0);

  const [phase, setPhase] = useState<Phase>('appear');
  const [question, setQuestion] = useState(() => questionFor(wild, level));
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [berryBoost, setBerryBoost] = useState(0);
  const [log, setLog] = useState(trainerName ? `${trainerName} sent out ${displayName(wild)}!` : `A wild ${displayName(wild)} appeared!`);
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
    const t = setTimeout(() => setMonVisible(true), 100);
    const t2 = setTimeout(() => setPhase('menu'), 900);
    return () => { clearTimeout(t); clearTimeout(t2); };
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

  const rarityStars = '⭐'.repeat(wild.rarity);
  const wildHpPct = (wildHp / wildMaxHp) * 100;
  const myMaxHpVal = myMember?.maxHp ?? memberMaxHp(myMember ?? { id:0,name:'?',types:[],caughtAt:0 }, level);
  const myHpPct = myMember ? (myHpDisplay / myMaxHpVal) * 100 : 0;
  const wildHpColor = wildHpPct > 50 ? '#4ade80' : wildHpPct > 20 ? '#fbbf24' : '#ef4444';
  const myHpColor = myHpPct > 50 ? '#4ade80' : myHpPct > 20 ? '#fbbf24' : '#ef4444';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: `linear-gradient(160deg, ${bg}ee 0%, #0a0a0a 100%)`,
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,248,230,0.12)', borderBottom: '2px solid rgba(255,220,100,0.3)',
        padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '18px' }}>
            {trainerName ? `${trainerName} battle` : `Wild encounter!`}
          </div>
          <div style={{ color: text, fontSize: '12px' }}>
            {wild.types.map(t => t.toUpperCase()).join(' · ')} · Rarity {rarityStars}
            &nbsp;·&nbsp; <span style={{ color: '#ffd54a' }}>Addie Lv. {level}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Chip icon="🔴" val={state.inventory.pokeball} label="Balls" />
          <Chip icon="🍓" val={state.inventory.berry} label="Berries" />
          <button onClick={handleFlee} style={runBtnStyle}>Run (ESC)</button>
        </div>
      </div>

      {/* Arena */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '20px 40px', gap: 16 }}>
        {/* Player side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <HpBar name={myMember?.name || '—'} hp={myHpDisplay} max={myMaxHpVal} color={myHpColor} level={level} />
          <div style={{
            width: 160, height: 160, position: 'relative',
            animation: myHurt ? 'shake 0.12s 3' : 'none',
            filter: myHurt ? 'brightness(1.6) hue-rotate(330deg)' : 'none',
          }}>
            {myMember && (
              <img src={backSpriteUrl(myMember.id)} alt={myMember.name} style={{
                width: '100%', height: '100%', imageRendering: 'pixelated',
                filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.25))',
              }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = spriteUrl(myMember.id); }}/>
            )}
          </div>
        </div>

        {/* Wild side */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <HpBar name={displayName(wild)} hp={wildHp} max={wildMaxHp} color={wildHpColor} level={level} />
          <div style={{
            width: 160, height: 160, position: 'relative',
            animation: shaking ? 'shake 0.15s infinite' : wildHurt ? 'shake 0.12s 3' : monVisible ? 'popIn 0.5s ease-out' : 'none',
            filter: wildHurt ? 'brightness(1.6) hue-rotate(330deg)' : 'none',
          }}>
            <img src={spriteUrl(wild.id)} alt={displayName(wild)} style={{
              width: '100%', height: '100%', imageRendering: 'pixelated',
              filter: caught ? 'brightness(0)' : 'drop-shadow(0 0 16px rgba(255,255,255,0.3))',
              opacity: monVisible ? 1 : 0,
              transition: 'opacity 0.3s',
            }} />
            {caught && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '72px', animation: 'popIn 0.4s ease-out',
              }}>🔴</div>
            )}
          </div>
        </div>
      </div>

      {/* Action panel */}
      <div style={{
        background: 'rgba(20,14,4,0.92)', borderTop: '2px solid rgba(255,220,100,0.3)',
        padding: '14px 24px', minHeight: 200,
      }}>
        {log && (
          <div style={{
            textAlign: 'center', color: '#fff8e1', fontSize: 16, fontWeight: 'bold', marginBottom: 8,
          }}>{log}</div>
        )}
        {feedback && (
          <div style={{
            textAlign: 'center', color: '#ffd54a', fontWeight: 'bold', fontSize: 15,
            marginBottom: 10, background: 'rgba(255,213,74,0.1)',
            borderRadius: 10, padding: '6px 14px',
          }}>{feedback}</div>
        )}

        {phase === 'menu' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, maxWidth: 720, margin: '0 auto' }}>
            <ActionBtn color="#ef4444" onClick={() => setPhase('fightMenu')}>⚔️ Fight</ActionBtn>
            <ActionBtn color="#ec4899" onClick={openCatch} disabled={!!trainerName}>🔴 Catch</ActionBtn>
            <ActionBtn color="#f59e0b" onClick={handleUseBerry}>🍓 Berry</ActionBtn>
            <ActionBtn color="#6b7280" onClick={handleFlee}>🏃 Run</ActionBtn>
          </div>
        )}

        {phase === 'fightMenu' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 600, margin: '0 auto' }}>
              {myMoves.map(m => (
                <ActionBtn key={m.name} color={(TYPE_COLORS[m.type] || TYPE_COLORS.normal)[0]} onClick={() => pickMove(m)}>
                  {m.emoji} {m.name}
                </ActionBtn>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button onClick={() => setPhase('menu')} style={backBtnStyle}>← Back</button>
            </div>
          </div>
        )}

        {phase === 'question' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <span style={{ color: text, fontSize: 12, fontWeight: 'bold' }}>
                {question.subject} · Lv. {level} question · (Tries: {attemptsLeft})
              </span>
            </div>
            <div style={{
              textAlign: 'center', color: '#fff8e1', fontSize: 18, fontWeight: 'bold',
              marginBottom: 12, lineHeight: 1.4,
            }}>{question.prompt}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 700, margin: '0 auto' }}>
              {question.choices.map((choice, i) => (
                <button key={i} onClick={() => handleAnswer(i)} style={{
                  background: CHOICE_COLORS[i % 4],
                  border: `2px solid ${CHOICE_BORDERS[i % 4]}`,
                  borderRadius: 14, padding: '12px 20px',
                  fontWeight: 'bold', fontSize: 16, color: '#1a0d00',
                  cursor: 'pointer', transition: 'filter 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>
                  {choice}
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button onClick={() => { setPhase('menu'); setLog('What will you do?'); }} style={backBtnStyle}>← Back to menu</button>
            </div>
          </>
        )}

        {phase === 'throwing' && (
          <div style={{ textAlign: 'center', color: '#ffd54a', fontSize: 20, fontWeight: 'bold', padding: 20 }}>
            🔴 Poké Ball flying…
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      `}</style>
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      <span style={{ display: 'none' }}>{trainerReward}</span>
    </div>
  );
}

const CHOICE_COLORS = ['#8fd9b6', '#9ec9ef', '#ffb98a', '#d6b3f1'];
const CHOICE_BORDERS = ['#2d6a4f', '#1e4065', '#7d3a00', '#5b1a8a'];

const runBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)', color: '#ccc',
  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
  padding: '6px 14px', cursor: 'pointer', fontSize: 13,
};
const backBtnStyle: React.CSSProperties = {
  background: 'transparent', color: '#ffd54a',
  border: '1px solid rgba(255,213,74,0.4)', borderRadius: 8,
  padding: '4px 12px', cursor: 'pointer', fontSize: 12,
};

function Chip({ icon, val, label }: { icon: string; val: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: 18 }}>{icon} {val}</div>
      <div style={{ color: '#8d7045', fontSize: 11 }}>{label}</div>
    </div>
  );
}

function ActionBtn({ color, onClick, children, disabled }: {
  color: string; onClick: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#444' : color,
      border: `3px solid ${disabled ? '#222' : '#fff'}`,
      borderRadius: 14, padding: '14px 16px',
      fontWeight: 'bold', fontSize: 17, color: '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
      boxShadow: disabled ? 'none' : '0 4px 0 rgba(0,0,0,0.3)',
    }}>{children}</button>
  );
}

function HpBar({ name, hp, max, color, level }: { name: string; hp: number; max: number; color: string; level: number }) {
  const pct = Math.max(0, (hp / max) * 100);
  return (
    <div style={{
      background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,213,74,0.5)',
      borderRadius: 10, padding: '6px 10px', minWidth: 180,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff8e1', fontSize: 13, fontWeight: 'bold' }}>
        <span>{name}</span>
        <span style={{ color: '#ffd54a' }}>Lv {level}</span>
      </div>
      <div style={{ background: '#1a0d00', borderRadius: 6, height: 10, marginTop: 4, overflow: 'hidden', border: '1px solid #3a2410' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease-out',
        }} />
      </div>
      <div style={{ color: '#ffd54a', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
        {Math.ceil(hp)} / {max}
      </div>
    </div>
  );
}
