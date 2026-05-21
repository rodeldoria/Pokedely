import { useEffect, useState } from 'react';
import { byId, spriteUrl, liveSpriteUrl, displayName } from '../data/pokedex';
import { fetchPokeInfo, getCachedPokeInfo, type PokeInfo } from '../data/pokeapi';
import type { TrainerState } from '../game/save';

interface Props {
  state: TrainerState;
  onClose: () => void;
}

type Filter = 'all' | 'seen' | 'caught';

export default function PokedexModal({ state, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<number | null>(null);

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
            const canOpen = !!isSeen;
            return (
              <div
                key={id}
                onClick={() => canOpen && setSelected(id)}
                style={{
                  background: isCaught ? '#fff' : isSeen ? '#f5e6c8' : '#ddc8a0',
                  borderRadius: 8, padding: '6px 4px', textAlign: 'center',
                  border: isCaught ? '2px solid #4ade80' : '2px solid #c9b58a',
                  position: 'relative',
                  cursor: canOpen ? 'pointer' : 'default',
                }}
              >
                <div style={{ color: '#7c5a2a', fontSize: '9px', fontWeight: 'bold' }}>
                  #{String(id).padStart(3, '0')}
                </div>
                {isSeen ? (
                  <img
                    src={liveSpriteUrl(id)}
                    alt={mon?.name || ''}
                    style={{
                      width: 64, height: 64,
                      imageRendering: 'pixelated', objectFit: 'contain',
                      filter: isCaught ? 'none' : 'brightness(0)',
                    }}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = spriteUrl(id);
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

      {selected !== null && (
        <DexDetail id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DexDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const mon = byId(id);
  const [info, setInfo] = useState<PokeInfo | null>(() => getCachedPokeInfo(id) ?? null);
  const [loading, setLoading] = useState(!info);

  useEffect(() => {
    let cancelled = false;
    if (!info) {
      setLoading(true);
      fetchPokeInfo(id).then(res => {
        if (!cancelled) {
          setInfo(res);
          setLoading(false);
        }
      });
    }
    return () => { cancelled = true; };
  }, [id, info]);

  const types = mon?.types ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff8e7',
          border: '4px solid #4a0a0e', borderRadius: 16,
          padding: 20, width: '95vw', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <img
            src={liveSpriteUrl(id)}
            alt={mon?.name || ''}
            style={{ width: 128, height: 128, flexShrink: 0, imageRendering: 'pixelated', objectFit: 'contain' }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null;
              img.src = spriteUrl(id);
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#7c5a2a', fontSize: 12, fontWeight: 'bold' }}>
              #{String(id).padStart(3, '0')}
            </div>
            <h3 style={{ margin: '2px 0 4px', color: '#3a2410', fontSize: 22 }}>
              {mon ? displayName(mon) : '???'}
            </h3>
            <div style={{ color: '#7c5a2a', fontSize: 12, fontStyle: 'italic', marginBottom: 6 }}>
              {info?.genus ?? (loading ? 'Loading…' : 'Pokémon')}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {types.map(t => (
                <span key={t} style={{
                  background: '#d63946', color: '#fff',
                  padding: '2px 8px', borderRadius: 10,
                  fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase',
                }}>{t}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#1a0a0a', color: '#fff', border: 'none',
            borderRadius: 8, padding: '4px 10px', fontWeight: 'bold', cursor: 'pointer', fontSize: 12,
          }}>✕</button>
        </div>

        <div style={{
          marginTop: 14, padding: 12, borderRadius: 10,
          background: '#fff', border: '2px solid #c9b58a',
          color: '#3a2410', fontSize: 14, lineHeight: 1.45, minHeight: 60,
        }}>
          {loading && !info && <span style={{ color: '#7c5a2a' }}>Looking it up in the Pokédex…</span>}
          {!loading && !info && (
            <span style={{ color: '#7c5a2a' }}>
              Couldn't reach the Pokédex network. Try again later!
            </span>
          )}
          {info && (info.flavor || <em>No description yet.</em>)}
        </div>

        {info && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <Stat label="Height" value={`${info.heightM.toFixed(1)} m`} />
              <Stat label="Weight" value={`${info.weightKg.toFixed(1)} kg`} />
              {info.habitat && <Stat label="Habitat" value={cap(info.habitat)} />}
              {info.color && <Stat label="Color" value={cap(info.color)} />}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ color: '#5a3e1e', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                BASE STATS
              </div>
              <Bar label="HP" value={info.stats.hp} color="#4ade80" />
              <Bar label="Attack" value={info.stats.attack} color="#f97316" />
              <Bar label="Defense" value={info.stats.defense} color="#60a5fa" />
              <Bar label="Speed" value={info.stats.speed} color="#facc15" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#fff', border: '2px solid #c9b58a', borderRadius: 8,
      padding: '6px 10px',
    }}>
      <div style={{ color: '#7c5a2a', fontSize: 10, fontWeight: 'bold' }}>{label.toUpperCase()}</div>
      <div style={{ color: '#3a2410', fontSize: 14, fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(4, Math.min(100, (value / 180) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div style={{ width: 56, color: '#5a3e1e', fontSize: 11, fontWeight: 'bold' }}>{label}</div>
      <div style={{ width: 32, color: '#3a2410', fontSize: 12, fontWeight: 'bold', textAlign: 'right' }}>
        {value}
      </div>
      <div style={{ flex: 1, height: 10, background: '#e6d3a8', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}
