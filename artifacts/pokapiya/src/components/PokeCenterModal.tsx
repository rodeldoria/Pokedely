import type { TrainerState } from '../game/save';
import { healAtCenter } from '../game/save';

interface Props {
  state: TrainerState;
  onChange: (s: TrainerState) => void;
  onClose: () => void;
}

export default function PokeCenterModal({ state, onChange, onClose }: Props) {
  const healed = state.visitedCenter > 0;

  const handleHeal = () => {
    healAtCenter(state);
    onChange({ ...state });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,6,2,0.90)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a0a0a 0%, #0d0604 100%)',
        border: '3px solid #d63946', borderRadius: '20px',
        padding: '36px', maxWidth: '480px', width: '90vw',
        boxShadow: '0 0 60px rgba(214,57,70,0.2)',
        textAlign: 'center',
      }}>
        {/* Nurse Joy illustration */}
        <div style={{ fontSize: '64px', marginBottom: 8 }}>🏥</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <NurseJoy />
        </div>

        <h2 style={{ color: '#ffd54a', fontSize: '26px', margin: '0 0 8px' }}>Pokémon Center</h2>
        <p style={{ color: '#c4a56b', fontSize: '15px', margin: '0 0 20px', lineHeight: 1.6 }}>
          "Welcome! We restore your Pokémon to full health.<br />
          And you'll get 3 Poké Balls + 1 Berry!"
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
          padding: '12px 20px', marginBottom: 24,
          display: 'flex', justifyContent: 'center', gap: 24,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffd54a', fontSize: '22px', fontWeight: 'bold' }}>{state.inventory.pokeball}</div>
            <div style={{ color: '#8d7045', fontSize: '12px' }}>🔴 Poké Balls</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffd54a', fontSize: '22px', fontWeight: 'bold' }}>{state.inventory.berry}</div>
            <div style={{ color: '#8d7045', fontSize: '12px' }}>🍓 Berries</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={handleHeal}
            style={{
              background: '#d63946', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 28px',
              fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(214,57,70,0.4)',
            }}
          >
            ✨ Heal My Team!
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', color: '#c4a56b', border: '1px solid #5a3e1e',
              borderRadius: '12px', padding: '12px 24px',
              fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
            }}
          >
            Leave
          </button>
        </div>

        {healed && (
          <p style={{ color: '#4ade80', fontSize: '13px', marginTop: 16 }}>
            ✅ All healed up! Visit anytime for more supplies!
          </p>
        )}
      </div>
    </div>
  );
}

function NurseJoy() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100">
      {/* Body */}
      <rect x="20" y="45" width="40" height="50" fill="#fff" rx="6" stroke="#d63946" strokeWidth="2"/>
      {/* Collar */}
      <rect x="28" y="45" width="24" height="10" fill="#d63946" rx="3"/>
      {/* Head */}
      <circle cx="40" cy="34" r="16" fill="#f3c6a5"/>
      {/* Pink hair puffs */}
      <circle cx="24" cy="26" r="10" fill="#ff7eb6"/>
      <circle cx="56" cy="26" r="10" fill="#ff7eb6"/>
      <rect x="24" y="18" width="32" height="10" fill="#ff7eb6" rx="4"/>
      {/* Eyes */}
      <circle cx="34" cy="34" r="2.5" fill="#111"/>
      <circle cx="46" cy="34" r="2.5" fill="#111"/>
      {/* Smile */}
      <path d="M34 42 Q40 47 46 42" stroke="#111" strokeWidth="1.5" fill="none"/>
      {/* Cross on chest */}
      <rect x="36" y="55" width="8" height="3" fill="#d63946"/>
      <rect x="38" y="52" width="3" height="9" fill="#d63946"/>
    </svg>
  );
}
