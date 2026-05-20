import type { TrainerState } from '../game/save';

interface Props {
  state: TrainerState;
  onTeam: () => void;
  toast: string;
}

const typeColors: Record<string, string> = {
  grass: '#4ade80', fire: '#f97316', water: '#38bdf8', electric: '#facc15',
  bug: '#84cc16', normal: '#a8a29e', psychic: '#e879f9', poison: '#a855f7',
  rock: '#78716c', ground: '#d97706', flying: '#93c5fd', ice: '#67e8f9',
  fighting: '#ef4444', ghost: '#7c3aed', dragon: '#4f46e5', dark: '#292524',
  steel: '#94a3b8', fairy: '#f9a8d4',
};

export default function HUD({ state, onTeam, toast }: Props) {
  const total = state.stats.correct + state.stats.wrong;
  const acc = total > 0 ? Math.round((state.stats.correct / total) * 100) : 100;

  return (
    <>
      {/* Top HUD bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'linear-gradient(180deg, rgba(30,20,10,0.95) 0%, rgba(30,20,10,0.7) 100%)',
        borderBottom: '2px solid #7c5a2a',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: '20px',
        fontFamily: '"Segoe UI", sans-serif',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '16px' }}>
          🌸 Addie's Adventure
        </span>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
          <Chip label="👥 Team" value={`${state.team.length}/6`} />
          <Chip label="⭐ Caught" value={`${state.stats.caught}`} />
          <Chip label="🔴 Balls" value={`${state.inventory.pokeball}`} />
          <Chip label="🍓 Berries" value={`${state.inventory.berry}`} />
          <Chip label="🧠 STEM" value={`${acc}%`} />
        </div>
        <button
          onClick={onTeam}
          style={{
            background: '#d63946', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '14px',
          }}
        >
          Team (T)
        </button>
      </div>

      {/* Controls hint bottom left */}
      <div style={{
        position: 'fixed', bottom: 12, left: 12, zIndex: 100,
        background: 'rgba(20,14,4,0.8)', borderRadius: '10px',
        padding: '8px 12px', color: '#c4a56b', fontSize: '12px',
        border: '1px solid #5a3e1e',
      }}>
        <div>WASD / Arrows — Move</div>
        <div>Mouse drag — Rotate camera</div>
        <div>Space — Jump &nbsp; T — Team</div>
      </div>

      {/* Team preview — bottom right */}
      {state.team.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
        }}>
          <div style={{ color: '#ffd54a', fontSize: '11px', fontWeight: 'bold', marginBottom: 2 }}>YOUR TEAM</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {state.team.map((m) => (
              <div key={m.caughtAt} title={m.name} style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'rgba(20,14,4,0.9)', border: '2px solid #7c5a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png`}
                  alt={m.name}
                  style={{ width: 36, height: 36, imageRendering: 'pixelated' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#ffe082', color: '#4a2e10',
          borderRadius: '12px', padding: '10px 20px',
          fontWeight: 'bold', fontSize: '16px',
          border: '2px solid #6e4b1f',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'fadeOut 1.8s ease-out forwards',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }
      `}</style>
    </>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', gap: 4, alignItems: 'center',
      background: 'rgba(255,212,74,0.12)', borderRadius: '6px',
      padding: '2px 8px', border: '1px solid rgba(255,212,74,0.2)',
    }}>
      <span style={{ color: '#8d7045', fontSize: '12px' }}>{label}</span>
      <span style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '14px' }}>{value}</span>
    </div>
  );
}
