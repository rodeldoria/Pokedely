import { useState } from 'react';
import { byId, spriteUrl, displayName } from '../data/pokedex';
import type { TrainerState } from '../game/save';

interface Props {
  state: TrainerState;
  onClose: () => void;
}

type Filter = 'all' | 'seen' | 'caught';

export default function PokedexModal({ state, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const ALL_IDS = [
    ...Array.from({length: 136}, (_, i) => i + 1),
    196, 197, 470, 471, 700,
  ];

  const seen = Object.values(state.pokedex).filter(e => e.seen).length;
  const caught = Object.values(state.pokedex).filter(e => e.caught).length;

  const items = ALL_IDS.filter(id => {
    const entry = state.pokedex[id];
    if (filter === 'caught') return entry?.caught;
    if (filter === 'seen') return entry?.seen;
    return true;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,6,2,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #d63946 0%, #b02030 100%)',
        border: '4px solid #4a0a0e', borderRadius: '20px',
        padding: '20px', maxWidth: '920px', width: '95vw', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#6cbef0', border: '3px solid #fff',
              boxShadow: '0 0 12px rgba(108,190,240,0.8)',
            }} />
            <div>
              <h2 style={{ color: '#fff', fontSize: '26px', margin: 0 }}>POKÉDEX</h2>
              <div style={{ color: '#ffd54a', fontSize: '13px', fontWeight: 'bold' }}>
                Seen: {seen} · Caught: {caught} / {ALL_IDS.length}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'seen', 'caught'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? '#fff' : 'rgba(255,255,255,0.15)',
                color: filter === f ? '#d63946' : '#fff',
                border: 'none', borderRadius: 8,
                padding: '6px 14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
              }}>{f.toUpperCase()}</button>
            ))}
            <button onClick={onClose} style={{
              background: '#1a0a0a', color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
            }}>✕ Close</button>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          background: '#fff8e7', borderRadius: '12px', padding: '14px',
          overflowY: 'auto', flex: 1,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px',
        }}>
          {items.map(id => {
            const entry = state.pokedex[id];
            const mon = byId(id);
            const isCaught = entry?.caught;
            const isSeen = entry?.seen;
            return (
              <div key={id} style={{
                background: isCaught ? '#fff' : isSeen ? '#f5e6c8' : '#ddc8a0',
                borderRadius: 8, padding: '6px 4px', textAlign: 'center',
                border: isCaught ? '2px solid #4ade80' : '2px solid #c9b58a',
                position: 'relative',
              }}>
                <div style={{ color: '#7c5a2a', fontSize: '9px', fontWeight: 'bold' }}>
                  #{String(id).padStart(3, '0')}
                </div>
                {isSeen ? (
                  <img
                    src={spriteUrl(id)}
                    alt={mon?.name || ''}
                    style={{
                      width: 56, height: 56, imageRendering: 'pixelated',
                      filter: isCaught ? 'none' : 'brightness(0)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, margin: 'auto',
                    color: '#a08560', fontSize: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>?</div>
                )}
                <div style={{
                  color: '#5a3e1e', fontSize: '10px', fontWeight: 'bold', minHeight: '12px',
                }}>
                  {isSeen && mon ? displayName(mon) : '???'}
                </div>
                {isCaught && entry.count > 1 && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    background: '#4ade80', color: '#fff', borderRadius: 10,
                    padding: '0 5px', fontSize: '10px', fontWeight: 'bold',
                  }}>×{entry.count}</div>
                )}
                {isCaught && (
                  <div style={{ position: 'absolute', bottom: 18, left: 4, fontSize: '14px' }}>🔴</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
