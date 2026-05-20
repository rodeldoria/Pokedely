import { useState } from 'react';

interface Props {
  onDone: () => void;
}

const SCRIPT = [
  "Hello there! Welcome to the world of Pokémon!",
  "My name is Oak. People call me the POKÉMON PROFESSOR!",
  "This world is inhabited by creatures called Pokémon. For some people, Pokémon are pets. Others use them for battles.",
  "You, Addie, are about to step into a world full of dreams and adventures with Pokémon!",
  "But before you go, you'll need your very first partner. Pick one of these little friends — it'll travel with you everywhere.",
  "Use your Pokémon to battle wild ones. When they're worn out, throw a Poké Ball — and answer a smart question to make the catch!",
  "Your very own Pokémon legend is about to unfold! A world of dreams and adventures with Pokémon awaits! Let's go!",
];

export default function OakIntro({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const last = step >= SCRIPT.length - 1;
  const advance = () => last ? onDone() : setStep(s => s + 1);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'radial-gradient(ellipse at center, #2a1a4a 0%, #0a0518 80%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Segoe UI", sans-serif', padding: 20, cursor: 'pointer',
    }} onClick={advance}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 24,
        maxWidth: 760, width: '100%',
      }}>
        <OakSprite />
        <div style={{
          flex: 1, background: '#fffbe8', border: '4px solid #c9a96c',
          borderRadius: 18, padding: '22px 26px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          position: 'relative', minHeight: 140,
        }}>
          <div style={{
            position: 'absolute', top: 8, left: 18,
            color: '#8d5524', fontWeight: 'bold', fontSize: 13,
          }}>PROF. OAK</div>
          <div style={{
            color: '#3a2410', fontSize: 19, lineHeight: 1.45,
            fontWeight: 600, marginTop: 18,
          }}>
            {SCRIPT[step]}
          </div>
          <div style={{
            position: 'absolute', bottom: 8, right: 16,
            color: '#8d5524', fontSize: 13, fontWeight: 'bold',
            animation: 'oakblink 1s infinite',
          }}>
            {last ? '▶ START MY ADVENTURE' : '▶ Click to continue'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, color: '#c9a96c', fontSize: 12 }}>
        Step {step + 1} of {SCRIPT.length}
      </div>

      <style>{`
        @keyframes oakblink { 0%, 60% { opacity: 1; } 80% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

function OakSprite() {
  return (
    <svg width="160" height="220" viewBox="0 0 80 110" style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }}>
      <ellipse cx="40" cy="106" rx="22" ry="3" fill="rgba(0,0,0,0.4)"/>
      <rect x="22" y="62" width="36" height="40" fill="#f4f0e8" stroke="#3a2410" strokeWidth="1"/>
      <rect x="22" y="62" width="36" height="4" fill="#c9a96c"/>
      <rect x="32" y="68" width="16" height="32" fill="#7b9fd6" stroke="#3a2410" strokeWidth="0.8"/>
      <circle cx="40" cy="76" r="1.2" fill="#3a2410"/>
      <circle cx="40" cy="82" r="1.2" fill="#3a2410"/>
      <circle cx="40" cy="88" r="1.2" fill="#3a2410"/>
      <rect x="14" y="64" width="10" height="26" fill="#f4f0e8" stroke="#3a2410" strokeWidth="0.8"/>
      <rect x="56" y="64" width="10" height="26" fill="#f4f0e8" stroke="#3a2410" strokeWidth="0.8"/>
      <rect x="14" y="86" width="10" height="8" fill="#f3c6a5" stroke="#3a2410" strokeWidth="0.5"/>
      <rect x="56" y="86" width="10" height="8" fill="#f3c6a5" stroke="#3a2410" strokeWidth="0.5"/>
      <rect x="22" y="100" width="14" height="6" fill="#3a2a1a" stroke="#1a0d00" strokeWidth="0.5"/>
      <rect x="44" y="100" width="14" height="6" fill="#3a2a1a" stroke="#1a0d00" strokeWidth="0.5"/>
      <ellipse cx="40" cy="42" rx="16" ry="18" fill="#f3c6a5" stroke="#3a2410" strokeWidth="1"/>
      <path d="M24 36 Q40 22 56 36 Q54 30 40 26 Q26 30 24 36" fill="#e8e8e8" stroke="#3a2410" strokeWidth="0.8"/>
      <path d="M24 36 Q22 32 26 28" stroke="#e8e8e8" strokeWidth="3" fill="none"/>
      <path d="M56 36 Q58 32 54 28" stroke="#e8e8e8" strokeWidth="3" fill="none"/>
      <rect x="31" y="44" width="3" height="2" fill="#1a0d00" rx="1"/>
      <rect x="46" y="44" width="3" height="2" fill="#1a0d00" rx="1"/>
      <path d="M34 53 Q40 55 46 53" stroke="#1a0d00" strokeWidth="1" fill="none"/>
      <ellipse cx="40" cy="58" rx="6" ry="3" fill="#e8e8e8" stroke="#3a2410" strokeWidth="0.8"/>
    </svg>
  );
}
