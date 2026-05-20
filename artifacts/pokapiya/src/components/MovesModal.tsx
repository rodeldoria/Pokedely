import type { TrainerState } from '../game/save';
import { FIELD_MOVES, teacherFor } from '../game/moves';
import { displayName } from '../data/pokedex';

interface Props {
  state: TrainerState;
  onClose: () => void;
}

export default function MovesModal({ state, onClose }: Props) {
  const unlocked = FIELD_MOVES.filter(m => m.unlocked(state));
  const locked = FIELD_MOVES.filter(m => !m.unlocked(state));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,6,2,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1005 0%, #0d0a04 100%)',
        border: '3px solid #7c5a2a', borderRadius: '20px',
        padding: '28px', maxWidth: '720px', width: '92vw',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(255,213,74,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h2 style={{ color: '#ffd54a', fontSize: '26px', margin: 0 }}>📚 Moves Addie Knows</h2>
          <p style={{ color: '#9d7a3a', margin: '6px 0 0', fontSize: 13 }}>
            Each Pokémon teaches a move. Catch more types to learn more moves!
          </p>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 6px' }}>
          {unlocked.length === 0 && (
            <div style={{ color: '#9d7a3a', fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
              You haven't learned any moves yet. Catch a Pokémon to learn its move!
            </div>
          )}

          {unlocked.map(move => {
            const teacher = teacherFor(state, move.id);
            return (
              <MoveCard key={move.id} move={move} teacher={teacher} locked={false} />
            );
          })}

          {locked.length > 0 && (
            <div style={{ color: '#5a3e1e', fontSize: 12, marginTop: 16, marginBottom: 4, paddingLeft: 4 }}>
              🔒 Not learned yet — catch one of these types:
            </div>
          )}
          {locked.map(move => (
            <MoveCard key={move.id} move={move} teacher={null} locked={true} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: '#d63946', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 32px',
              fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
            }}
          >
            Close (ESC / M)
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveCard({
  move,
  teacher,
  locked,
}: {
  move: typeof FIELD_MOVES[number];
  teacher: { id: number; name: string } | null;
  locked: boolean;
}) {
  return (
    <div style={{
      background: locked ? 'rgba(255,255,255,0.03)' : 'rgba(74,222,128,0.08)',
      border: `2px solid ${locked ? '#3a2c10' : '#4ade80'}`,
      borderRadius: '12px', padding: '12px 14px',
      display: 'flex', gap: 12, alignItems: 'flex-start', opacity: locked ? 0.75 : 1,
    }}>
      <div style={{ fontSize: 32, flexShrink: 0 }}>{move.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: locked ? '#7a6438' : '#86efac', fontWeight: 'bold', fontSize: 16 }}>
          {move.name}
        </div>
        <div style={{ color: '#9d7a3a', fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
          {move.description}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#c4a56b', display: 'flex', alignItems: 'center', gap: 8 }}>
          {teacher ? (
            <>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teacher.id}.png`}
                alt={teacher.name}
                style={{ width: 28, height: 28, imageRendering: 'pixelated' }}
              />
              <span><b>{displayName(teacher)}</b> teaches this move.</span>
            </>
          ) : (
            <span>Catch a <b style={{ color: '#ffd54a' }}>{move.teacherType.toUpperCase()}</b>-type — try {move.teacherExamples.slice(0, 3).join(', ')}.</span>
          )}
        </div>
      </div>
    </div>
  );
}
