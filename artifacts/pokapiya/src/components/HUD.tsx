import { getLevel, xpToNextLevel, type TrainerState } from '../game/save';

interface Props {
  state: TrainerState;
  zoneName: string;
  onTeam: () => void;
  onPokedex: () => void;
  onQuests: () => void;
  onMoves: () => void;
  onCraft: () => void;
  onSave: () => void;
  toast: string;
}

export default function HUD({ state, zoneName, onTeam, onPokedex, onQuests, onMoves, onCraft, onSave, toast }: Props) {
  const total = state.stats.correct + state.stats.wrong;
  const acc = total > 0 ? Math.round((state.stats.correct / total) * 100) : 100;
  const level = getLevel(state);
  const { have, need } = xpToNextLevel(state);
  const progressInLevel = state.stats.correct - (level - 1) * 8;
  const xpPct = Math.min(100, (progressInLevel / 8) * 100);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'linear-gradient(180deg, rgba(30,20,10,0.95) 0%, rgba(30,20,10,0.7) 100%)',
        borderBottom: '2px solid #7c5a2a',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: '16px',
        fontFamily: '"Segoe UI", sans-serif', backdropFilter: 'blur(4px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: '#d63946', color: '#fff', borderRadius: '50%',
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '15px', border: '2px solid #ffd54a',
          }}>L{level}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '14px' }}>🌸 Addie</span>
            <div style={{ width: 80, height: 6, background: '#3a2c10', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', background: 'linear-gradient(90deg, #ffd54a, #4ade80)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          <Chip label="👥" value={`${state.team.length}/6`} />
          <Chip label="⭐" value={`${state.stats.caught}`} />
          <Chip label="🔴" value={`${state.inventory.pokeball}`} />
          <Chip label="🍓" value={`${state.inventory.berry}`} />
          <Chip label="🪙" value={`${state.inventory.coin || 0}`} />
          <Chip label="🧠" value={`${acc}%`} />
          <Chip label="📍" value={zoneName} />
          {state.inventory.cut > 0 && <Badge>✂️ Cut</Badge>}
          {state.inventory.rod > 0 && <Badge>🎣 Rod</Badge>}
        </div>

        <button onClick={onMoves} style={btnStyle('#16a34a')}>📚 Moves (M)</button>
        <button onClick={onCraft} style={btnStyle('#c2410c')}>🔨 Craft (C)</button>
        <button onClick={onQuests} style={btnStyle('#b85cff')}>📜 Quests (Q)</button>
        <button onClick={onPokedex} style={btnStyle('#5a73c4')}>📕 Pokédex (P)</button>
        <button onClick={onTeam} style={btnStyle('#d63946')}>👥 Team (T)</button>
        <button onClick={onSave} style={btnStyle('#2d8a52')}>💾 Save</button>
      </div>

      <div style={{
        position: 'fixed', bottom: 12, left: 12, zIndex: 100,
        background: 'rgba(20,14,4,0.85)', borderRadius: '10px',
        padding: '8px 12px', color: '#c4a56b', fontSize: '12px',
        border: '1px solid #5a3e1e', lineHeight: 1.5,
      }}>
        <div><b>WASD/Arrows</b> — Move</div>
        <div><b>F</b> — Cut tree / Fish at water</div>
        <div><b>Space</b> near a trainer — Battle</div>
        <div><b>T</b> Team · <b>P</b> Pokédex · <b>Q</b> Quests</div>
        <div><b>M</b> Moves · <b>C</b> Craft</div>
      </div>

      {state.team.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
        }}>
          <div style={{ color: '#ffd54a', fontSize: '11px', fontWeight: 'bold', marginBottom: 2 }}>
            YOUR TEAM
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {state.team.map((m, i) => (
              <div key={i} title={m.name} style={{
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

      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#ffe082', color: '#4a2e10',
          borderRadius: '12px', padding: '10px 20px',
          fontWeight: 'bold', fontSize: '16px',
          border: '2px solid #6e4b1f',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'fadeOut 2.5s ease-out forwards',
        }}>{toast}</div>
      )}

      <style>{`@keyframes fadeOut{0%{opacity:1}80%{opacity:1}100%{opacity:0}}`}</style>
    </>
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none',
  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
  fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap',
});

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', gap: 4, alignItems: 'center',
      background: 'rgba(255,212,74,0.12)', borderRadius: '6px',
      padding: '2px 8px', border: '1px solid rgba(255,212,74,0.2)',
    }}>
      <span style={{ fontSize: '13px' }}>{label}</span>
      <span style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '14px' }}>{value}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'rgba(74,222,128,0.15)', color: '#4ade80',
      border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6,
      padding: '2px 8px', fontSize: '12px', fontWeight: 'bold',
    }}>{children}</span>
  );
}
