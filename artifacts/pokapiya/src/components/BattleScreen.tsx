import { useState, useEffect } from 'react';
import type { Pokemon } from '../data/pokedex';
import { displayName, spriteUrl } from '../data/pokedex';
import { questionFor } from '../data/stem';
import { recordAnswer, recordCatch, useBall, useBerry, getLevel } from '../game/save';
import type { TrainerState } from '../game/save';

interface Props {
  wild: Pokemon;
  state: TrainerState;
  onStateChange: (s: TrainerState) => void;
  onExit: (caught: boolean) => void;
  trainerName?: string;       // if it's a trainer battle
  trainerReward?: string;     // reward awarded on win
}

const TYPE_COLORS: Record<string, [string, string]> = {
  grass: ['#2d6a4f','#95d5b2'], fire: ['#7d1d00','#ff9f80'], water: ['#023e8a','#90e0ef'],
  electric: ['#7b5e00','#ffe566'], bug: ['#386641','#b5e48c'], normal: ['#555','#ddd'],
  psychic: ['#7b2d8b','#f0abfc'], poison: ['#5b2c82','#c084fc'], rock: ['#4a3c28','#c4a882'],
  ground: ['#7d4f00','#f4c97d'], flying: ['#164e74','#93c5fd'], ice: ['#0e4b6e','#bae6fd'],
  fighting: ['#7f1d1d','#fca5a5'], ghost: ['#3b0764','#d8b4fe'], dragon: ['#1e3a8a','#93c5fd'],
  dark: ['#1a1a1a','#9ca3af'], steel: ['#334155','#cbd5e1'], fairy: ['#7c1d5a','#fbcfe8'],
};

type Phase = 'appear' | 'question' | 'throwing' | 'result';

export default function BattleScreen({ wild, state, onStateChange, onExit, trainerName, trainerReward }: Props) {
  const level = getLevel(state);
  const [phase, setPhase] = useState<Phase>('appear');
  const [question, setQuestion] = useState(() => questionFor(wild, level));
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [berryBoost, setBerryBoost] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [shaking, setShaking] = useState(false);
  const [monVisible, setMonVisible] = useState(false);
  const [caught, setCaught] = useState(false);

  const [bg, text] = TYPE_COLORS[wild.types[0]] || TYPE_COLORS.normal;

  useEffect(() => {
    const t = setTimeout(() => setMonVisible(true), 100);
    const t2 = setTimeout(() => setPhase('question'), 800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleFlee(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [attemptsLeft]);

  function handleAnswer(idx: number) {
    if (phase !== 'question') return;
    const correct = idx === question.answerIndex;
    recordAnswer(state, correct);
    onStateChange({ ...state });

    if (correct) {
      setFeedback('🌟 Great answer, Addie! Throwing a Poké Ball…');
      setPhase('throwing');
      setTimeout(() => throwBall(), 700);
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
          setPhase('question');
        }, 1800);
      }
    }
  }

  function throwBall() {
    setShaking(true);
    if (!useBall(state)) {
      setFeedback('Out of Poké Balls! Visit the Pokémon Center!');
      setTimeout(() => handleFlee(), 1500);
      return;
    }
    onStateChange({ ...state });
    // Catch chance: scales DOWN with level (harder) and UP with berries
    const base = wild.rarity === 1 ? 0.85 : wild.rarity === 2 ? 0.65 : 0.45;
    const levelPenalty = Math.min(0.25, level * 0.015);
    const chance = Math.max(0.2, Math.min(0.97, base - levelPenalty + berryBoost));
    const didCatch = Math.random() < chance;
    setTimeout(() => {
      setShaking(false);
      if (didCatch) {
        recordCatch(state, wild);
        onStateChange({ ...state });
        setCaught(true);
        setFeedback(`🎉 Yay! ${displayName(wild)} joined your adventure!`);
        setPhase('result');
        setTimeout(() => onExit(true), 2200);
      } else {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);
        setFeedback(`Oh no! ${displayName(wild)} broke free! ${newAttempts > 0 ? 'Try again!' : ''}`);
        if (newAttempts <= 0 || state.inventory.pokeball <= 0) {
          setTimeout(() => handleFlee(), 1500);
        } else {
          setTimeout(() => {
            setQuestion(questionFor(wild, level));
            setFeedback('');
            setPhase('question');
          }, 1800);
        }
      }
    }, 1600);
  }

  function handleUseBerry() {
    if (phase !== 'question') return;
    if (!useBerry(state)) {
      setFeedback('No berries left! Visit the Pokémon Center.');
      return;
    }
    setBerryBoost(b => b + 0.22);
    onStateChange({ ...state });
    setFeedback('🍓 You gave it a Berry — it likes you more now!');
  }

  function handleFlee() {
    setPhase('result');
    if (!feedback.includes('Yay')) setFeedback(`${displayName(wild)} wandered off… maybe next time!`);
    setTimeout(() => onExit(false), 1200);
  }

  const rarityStars = '⭐'.repeat(wild.rarity);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: `linear-gradient(160deg, ${bg}ee 0%, #0a0a0a 100%)`,
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,248,230,0.12)', borderBottom: '2px solid rgba(255,220,100,0.3)',
        padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '22px' }}>
            {trainerName ? `${trainerName} sent out ${displayName(wild)}!` : `A wild ${displayName(wild)} appeared!`}
          </div>
          <div style={{ color: text, fontSize: '13px' }}>
            {wild.types.map(t => t.toUpperCase()).join(' · ')} · Rarity {rarityStars}
            &nbsp;·&nbsp; <span style={{ color: '#ffd54a' }}>Addie Lv. {level}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Chip icon="🔴" val={state.inventory.pokeball} label="Balls" />
          <Chip icon="🍓" val={state.inventory.berry} label="Berries" />
          <button onClick={handleFlee} style={runBtnStyle}>Run Away (ESC)</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '20px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <TrainerSprite />
          <div style={{ color: '#ffd54a', fontSize: '13px', fontWeight: 'bold' }}>Addie · Lv. {level}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {state.team.slice(0, 6).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80', border: '1px solid #1a3a1a',
              }} />
            ))}
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '48px', fontWeight: 'bold' }}>VS</div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 160, height: 160, position: 'relative',
            animation: shaking ? 'shake 0.15s infinite' : monVisible ? 'popIn 0.5s ease-out' : 'none',
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
          <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '18px', marginTop: 4 }}>
            {displayName(wild)}
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(20,14,4,0.92)', borderTop: '2px solid rgba(255,220,100,0.3)',
        padding: '16px 24px',
      }}>
        {feedback && (
          <div style={{
            textAlign: 'center', color: '#ffd54a', fontWeight: 'bold', fontSize: '16px',
            marginBottom: 12, background: 'rgba(255,213,74,0.1)',
            borderRadius: 10, padding: '8px 16px',
          }}>{feedback}</div>
        )}

        {phase === 'question' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ color: text, fontSize: '12px', fontWeight: 'bold' }}>
                {question.subject} · Lv. {level} question · (Tries: {attemptsLeft})
              </span>
            </div>
            <div style={{
              textAlign: 'center', color: '#fff8e1', fontSize: '20px', fontWeight: 'bold',
              marginBottom: 16, lineHeight: 1.4,
            }}>{question.prompt}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 700, margin: '0 auto' }}>
              {question.choices.map((choice, i) => (
                <button key={i} onClick={() => handleAnswer(i)} style={{
                  background: CHOICE_COLORS[i % 4],
                  border: `2px solid ${CHOICE_BORDERS[i % 4]}`,
                  borderRadius: 14, padding: '12px 20px',
                  fontWeight: 'bold', fontSize: '16px', color: '#1a0d00',
                  cursor: 'pointer', transition: 'filter 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>
                  {choice}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <button onClick={handleUseBerry} style={{
                background: '#f472b6', border: '2px solid #be185d',
                borderRadius: 10, padding: '8px 20px',
                fontWeight: 'bold', color: '#fff', cursor: 'pointer', fontSize: '14px',
              }}>🍓 Use a Berry (+catch chance)</button>
            </div>
          </>
        )}

        {phase === 'throwing' && (
          <div style={{ textAlign: 'center', color: '#ffd54a', fontSize: '20px', fontWeight: 'bold', padding: 20 }}>
            🔴 Poké Ball flying…
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      `}</style>
    </div>
  );
}

const CHOICE_COLORS = ['#8fd9b6', '#9ec9ef', '#ffb98a', '#d6b3f1'];
const CHOICE_BORDERS = ['#2d6a4f', '#1e4065', '#7d3a00', '#5b1a8a'];

const runBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)', color: '#ccc',
  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
  padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
};

function Chip({ icon, val, label }: { icon: string; val: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '18px' }}>{icon} {val}</div>
      <div style={{ color: '#8d7045', fontSize: '11px' }}>{label}</div>
    </div>
  );
}

function TrainerSprite() {
  return (
    <svg width="72" height="96" viewBox="0 0 36 48">
      <rect x="10" y="0" width="16" height="5" fill="#d63946" rx="2"/>
      <rect x="8" y="4" width="20" height="3" fill="#d63946" rx="1"/>
      <rect x="6" y="7" width="24" height="3" fill="#d63946"/>
      <rect x="9" y="3" width="18" height="6" fill="#1a0d00"/>
      <rect x="11" y="9" width="14" height="12" fill="#f3c6a5" rx="2"/>
      <rect x="13" y="13" width="3" height="3" fill="#111" rx="1"/>
      <rect x="20" y="13" width="3" height="3" fill="#111" rx="1"/>
      <path d="M14 20 Q18 23 22 20" stroke="#a0522d" strokeWidth="1.2" fill="none"/>
      <rect x="9" y="21" width="18" height="14" fill="#457b9d" rx="2"/>
      <rect x="9" y="32" width="18" height="3" fill="#ffd54a"/>
      <rect x="4" y="22" width="6" height="10" fill="#f3c6a5" rx="2"/>
      <rect x="26" y="22" width="6" height="10" fill="#f3c6a5" rx="2"/>
      <rect x="4" y="30" width="6" height="4" fill="#fff" rx="2"/>
      <rect x="26" y="30" width="6" height="4" fill="#fff" rx="2"/>
      <rect x="10" y="35" width="7" height="11" fill="#1a1a3e" rx="1"/>
      <rect x="19" y="35" width="7" height="11" fill="#1a1a3e" rx="1"/>
      <rect x="9" y="44" width="9" height="4" fill="#111" rx="2"/>
      <rect x="18" y="44" width="9" height="4" fill="#111" rx="2"/>
    </svg>
  );
}
