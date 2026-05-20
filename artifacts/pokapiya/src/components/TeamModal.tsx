import type { TrainerState } from '../game/save';
import { displayName, homeSpriteUrl, spriteUrl } from '../data/pokedex';

interface Props {
  state: TrainerState;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  grass:'#4ade80',fire:'#f97316',water:'#38bdf8',electric:'#facc15',
  bug:'#84cc16',normal:'#a8a29e',psychic:'#e879f9',poison:'#a855f7',
  rock:'#78716c',ground:'#d97706',flying:'#93c5fd',ice:'#67e8f9',
  fighting:'#ef4444',ghost:'#7c3aed',dragon:'#4f46e5',dark:'#6b7280',
  steel:'#94a3b8',fairy:'#f9a8d4',
};

export default function TeamModal({ state, onClose }: Props) {
  const total = state.stats.correct + state.stats.wrong;
  const acc = total > 0 ? Math.round((state.stats.correct / total) * 100) : 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,6,2,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1005 0%, #0d0a04 100%)',
        border: '3px solid #7c5a2a', borderRadius: '20px',
        padding: '32px', maxWidth: '760px', width: '90vw',
        boxShadow: '0 0 60px rgba(255,213,74,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ color: '#ffd54a', fontSize: '28px', margin: 0 }}>🌸 Addie's Team</h2>
          <p style={{ color: '#9d7a3a', margin: '8px 0 0' }}>
            Caught: {state.stats.caught} · STEM Accuracy: {acc}% · Box: {state.box.length}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const member = state.team[i];
            return (
              <div key={i} style={{
                background: member ? 'rgba(255,213,74,0.07)' : 'rgba(255,255,255,0.03)',
                border: `2px solid ${member ? '#7c5a2a' : '#2a2010'}`,
                borderRadius: '12px', padding: '12px',
                display: 'flex', gap: 10, alignItems: 'center',
                minHeight: '80px',
              }}>
                {member ? (
                  <>
                    <img
                      src={homeSpriteUrl(member.id)}
                      alt={member.name}
                      style={{ width: 64, height: 64 }}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.onerror = null;
                        img.src = spriteUrl(member.id);
                        img.style.imageRendering = 'pixelated';
                      }}
                    />
                    <div>
                      <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '15px' }}>
                        {displayName(member)}
                      </div>
                      <div style={{ color: '#6b5024', fontSize: '11px' }}>
                        #{String(member.id).padStart(3, '0')}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {member.types.map(t => (
                          <span key={t} style={{
                            background: TYPE_COLORS[t] || '#555',
                            color: '#000', fontSize: '10px', fontWeight: 'bold',
                            borderRadius: '4px', padding: '1px 5px',
                          }}>{t.toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#3a2c10', fontSize: '13px', margin: 'auto' }}>— empty —</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: '#d63946', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 32px',
              fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
            }}
          >
            Close (ESC / T)
          </button>
        </div>
      </div>
    </div>
  );
}
