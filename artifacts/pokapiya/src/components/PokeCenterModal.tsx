import type { TrainerState } from '../game/save';
import { healAtCenter } from '../game/save';

interface Props {
  state: TrainerState;
  onChange: (s: TrainerState) => void;
  onClose: () => void;
  onPC: () => void;
}

export default function PokeCenterModal({ state, onChange, onClose, onPC }: Props) {
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
        background: 'linear-gradient(160deg, #fef4d6 0%, #ffe0e9 100%)',
        border: '4px solid #d63946', borderRadius: '20px',
        padding: '32px', maxWidth: '500px', width: '90vw',
        boxShadow: '0 0 60px rgba(214,57,70,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <NurseJoy />
        </div>

        <h2 style={{ color: '#d63946', fontSize: '26px', margin: '0 0 8px' }}>Pokémon Center</h2>
        <p style={{ color: '#7c5a2a', fontSize: '15px', margin: '0 0 16px', lineHeight: 1.5 }}>
          "Welcome, Addie! Need a heal? Or check the PC for stored Pokémon?"
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.7)', borderRadius: '12px',
          padding: '10px 16px', marginBottom: 16,
          display: 'flex', justifyContent: 'space-around',
        }}>
          <Stat label="🔴 Balls" v={state.inventory.pokeball} />
          <Stat label="🍓 Berries" v={state.inventory.berry} />
          <Stat label="📦 Box" v={state.box.length} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={handleHeal} style={{
            background: '#d63946', color: '#fff', border: 'none',
            borderRadius: '12px', padding: '12px 24px',
            fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(214,57,70,0.4)', flex: '1 1 140px',
          }}>
            ✨ Heal Team (+3 🔴 +1 🍓)
          </button>
          <button onClick={onPC} style={{
            background: '#5a73c4', color: '#fff', border: 'none',
            borderRadius: '12px', padding: '12px 24px',
            fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(90,115,196,0.4)', flex: '1 1 140px',
          }}>
            💾 Use PC (Box)
          </button>
          <button onClick={onClose} style={{
            background: 'rgba(0,0,0,0.06)', color: '#7c5a2a',
            border: '2px solid #ddc8a0',
            borderRadius: '12px', padding: '12px 24px',
            fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
            flex: '1 1 100px',
          }}>
            Leave
          </button>
        </div>

        {healed && (
          <p style={{ color: '#1f8a44', fontSize: '12px', marginTop: 14 }}>
            ✅ Visit anytime! Healing also restocks your supplies.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#d63946', fontSize: '20px', fontWeight: 'bold' }}>{v}</div>
      <div style={{ color: '#7c5a2a', fontSize: '11px' }}>{label}</div>
    </div>
  );
}

function NurseJoy() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100">
      <rect x="20" y="45" width="40" height="50" fill="#fff" rx="6" stroke="#d63946" strokeWidth="2"/>
      <rect x="28" y="45" width="24" height="10" fill="#d63946" rx="3"/>
      <circle cx="40" cy="34" r="16" fill="#f3c6a5"/>
      <circle cx="24" cy="26" r="10" fill="#ff7eb6"/>
      <circle cx="56" cy="26" r="10" fill="#ff7eb6"/>
      <rect x="24" y="18" width="32" height="10" fill="#ff7eb6" rx="4"/>
      <circle cx="34" cy="34" r="2.5" fill="#111"/>
      <circle cx="46" cy="34" r="2.5" fill="#111"/>
      <path d="M34 42 Q40 47 46 42" stroke="#111" strokeWidth="1.5" fill="none"/>
      <rect x="36" y="55" width="8" height="3" fill="#d63946"/>
      <rect x="38" y="52" width="3" height="9" fill="#d63946"/>
    </svg>
  );
}
