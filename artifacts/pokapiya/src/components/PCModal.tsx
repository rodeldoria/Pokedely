import { useState } from 'react';
import { byId, spriteUrl, displayName } from '../data/pokedex';
import { save, type TrainerState } from '../game/save';

interface Props {
  state: TrainerState;
  onChange: (s: TrainerState) => void;
  onClose: () => void;
}

type Selected = { source: 'team' | 'box'; index: number } | null;

export default function PCModal({ state, onChange, onClose }: Props) {
  const [sel, setSel] = useState<Selected>(null);

  function click(source: 'team' | 'box', index: number) {
    if (!sel) { setSel({ source, index }); return; }
    if (sel.source === source && sel.index === index) { setSel(null); return; }
    swap(sel, { source, index });
  }

  function swap(a: NonNullable<Selected>, b: NonNullable<Selected>) {
    const get = (s: NonNullable<Selected>) => s.source === 'team' ? state.team[s.index] : state.box[s.index];
    const set = (s: NonNullable<Selected>, v: typeof state.team[number] | undefined) => {
      if (s.source === 'team') {
        if (v) state.team[s.index] = v;
        else state.team.splice(s.index, 1);
      } else {
        if (v) state.box[s.index] = v;
        else state.box.splice(s.index, 1);
      }
    };
    const va = get(a), vb = get(b);
    if (a.source === b.source) {
      // reorder
      const arr = a.source === 'team' ? state.team : state.box;
      [arr[a.index], arr[b.index]] = [arr[b.index], arr[a.index]];
    } else {
      // cross-storage move
      if (vb) set(a, vb); else set(a, undefined as any);
      if (va) set(b, va); else set(b, undefined as any);
    }
    setSel(null);
    save(state);
    onChange({ ...state });
  }

  function moveToBox(index: number) {
    if (state.team.length <= 1) return;
    const [mon] = state.team.splice(index, 1);
    state.box.push(mon);
    setSel(null);
    save(state); onChange({ ...state });
  }
  function moveToTeam(index: number) {
    if (state.team.length >= 6) return;
    const [mon] = state.box.splice(index, 1);
    state.team.push(mon);
    setSel(null);
    save(state); onChange({ ...state });
  }
  function release(index: number) {
    if (!confirm('Release this Pokémon? It will be set free!')) return;
    state.box.splice(index, 1);
    setSel(null);
    save(state); onChange({ ...state });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(10,10,40,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #5a73c4 0%, #2a3a78 100%)',
        border: '4px solid #1a1f44', borderRadius: '20px',
        padding: '20px', maxWidth: '780px', width: '95vw', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>💾 Bill's PC — Pokémon Storage</h2>
          <button onClick={onClose} style={{
            background: '#1a1f44', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 14px', fontWeight: 'bold', cursor: 'pointer',
          }}>✕ Close</button>
        </div>
        <p style={{ color: '#cfd6f0', fontSize: '13px', margin: '0 0 14px' }}>
          Click two Pokémon to swap them. {sel && 'A Pokémon is selected — click another to swap.'}
        </p>

        {/* Team */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ color: '#ffd54a', fontWeight: 'bold', marginBottom: 8 }}>👥 Active Team ({state.team.length}/6)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const m = state.team[i];
              const isSel = sel?.source === 'team' && sel.index === i;
              return (
                <Slot key={i} mon={m} sel={isSel}
                  onClick={() => m && click('team', i)}
                  action={m && state.team.length > 1 ? () => moveToBox(i) : undefined}
                  actionLabel="→ Box" />
              );
            })}
          </div>
        </div>

        {/* Box */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, flex: 1, overflowY: 'auto' }}>
          <div style={{ color: '#a8d8ff', fontWeight: 'bold', marginBottom: 8 }}>📦 Box ({state.box.length})</div>
          {state.box.length === 0 ? (
            <div style={{ color: '#7d8fc0', textAlign: 'center', padding: 20 }}>
              No Pokémon in storage yet. Catch more than 6 and they'll come here!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
              {state.box.map((m, i) => {
                const isSel = sel?.source === 'box' && sel.index === i;
                return (
                  <Slot key={m.caughtAt + '-' + i} mon={m} sel={isSel}
                    onClick={() => click('box', i)}
                    action={state.team.length < 6 ? () => moveToTeam(i) : () => release(i)}
                    actionLabel={state.team.length < 6 ? '↑ Team' : '🕊 Release'} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Slot({ mon, sel, onClick, action, actionLabel }: {
  mon?: { id: number; name: string; types: string[] };
  sel: boolean;
  onClick: () => void;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div style={{
      background: mon ? (sel ? '#ffd54a' : '#fff') : 'rgba(255,255,255,0.05)',
      border: `2px solid ${sel ? '#fff' : mon ? '#7e95cb' : '#2a3a78'}`,
      borderRadius: 8, padding: '6px 4px',
      textAlign: 'center', minHeight: 100,
      cursor: mon ? 'pointer' : 'default',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
      transition: 'all 0.1s',
    }} onClick={onClick}>
      {mon ? (
        <>
          <img src={spriteUrl(mon.id)} alt={mon.name}
            style={{ width: 48, height: 48, imageRendering: 'pixelated' }} />
          <div style={{ color: '#1a1f44', fontSize: '11px', fontWeight: 'bold' }}>
            {displayName(mon)}
          </div>
          {action && actionLabel && (
            <button onClick={(e) => { e.stopPropagation(); action(); }} style={{
              background: '#2a3a78', color: '#fff', border: 'none',
              borderRadius: 4, padding: '2px 6px', fontSize: '10px',
              cursor: 'pointer', marginTop: 2, fontWeight: 'bold',
            }}>{actionLabel}</button>
          )}
        </>
      ) : (
        <span style={{ color: '#5a73c4', fontSize: 12, margin: 'auto' }}>— empty —</span>
      )}
    </div>
  );
}
