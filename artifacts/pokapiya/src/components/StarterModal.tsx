import { useState } from 'react';
import { STARTERS, type Starter } from '../data/starters';
import { recordCatch, save, type TrainerState } from '../game/save';
import { spriteUrl } from '../data/pokedex';

interface Props {
  state: TrainerState;
  onPick: (newState: TrainerState) => void;
}

export default function StarterModal({ state, onPick }: Props) {
  const [hover, setHover] = useState<Starter | null>(STARTERS[0]);
  const [confirming, setConfirming] = useState<Starter | null>(null);

  function pick(s: Starter) {
    if (confirming?.id !== s.id) { setConfirming(s); return; }
    recordCatch(state, { id: s.id, name: s.name, types: [s.type], rarity: 2 });
    state.starterChosen = true;
    state.inventory.pokeball += 5;
    state.inventory.berry += 2;
    save(state);
    onPick({ ...state });
  }

  const show = confirming || hover || STARTERS[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(180deg, #fef4d6 0%, #ffe0e9 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px', overflow: 'auto',
      fontFamily: '"Segoe UI", sans-serif',
    }}>
      <h1 style={{
        color: '#5a3e1e', fontSize: '36px', margin: '12px 0 4px',
        textShadow: '0 2px 0 rgba(255,255,255,0.6)',
      }}>
        🌸 Welcome to Pokapiya, Addie! 🌸
      </h1>
      <p style={{ color: '#7c5a2a', fontSize: '18px', margin: '0 0 18px', fontWeight: 'bold' }}>
        Pick your very first Pokémon friend!
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '8px',
        maxWidth: '960px', width: '95%', marginBottom: '20px',
      }}>
        {STARTERS.map(s => (
          <button
            key={s.id}
            onMouseEnter={() => setHover(s)}
            onClick={() => pick(s)}
            style={{
              background: confirming?.id === s.id ? s.color : '#fff',
              border: `4px solid ${show?.id === s.id ? s.color : '#e2c69a'}`,
              borderRadius: '16px', padding: '8px', cursor: 'pointer',
              transition: 'all 0.15s', transform: show?.id === s.id ? 'translateY(-6px) scale(1.05)' : 'none',
              boxShadow: show?.id === s.id ? `0 8px 16px ${s.color}66` : '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <img
              src={spriteUrl(s.id)}
              alt={s.name}
              style={{ width: 64, height: 64, imageRendering: 'pixelated', display: 'block', margin: 'auto' }}
            />
            <div style={{
              color: confirming?.id === s.id ? '#fff' : '#5a3e1e',
              fontWeight: 'bold', fontSize: '12px', marginTop: '2px',
            }}>{s.name}</div>
          </button>
        ))}
      </div>

      {/* Big preview */}
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '20px 30px',
        border: `4px solid ${show.color}`,
        maxWidth: '560px', width: '92%', textAlign: 'center',
        boxShadow: `0 10px 30px ${show.color}33`,
      }}>
        <img
          src={spriteUrl(show.id)}
          alt={show.name}
          style={{ width: 160, height: 160, imageRendering: 'pixelated' }}
        />
        <h2 style={{ color: show.color, margin: '4px 0' }}>{show.name}</h2>
        <div style={{ color: '#7c5a2a', fontSize: '14px', marginBottom: 4 }}>
          Type: <span style={{ color: show.color, fontWeight: 'bold' }}>{show.type.toUpperCase()}</span>
        </div>
        <p style={{ color: '#5a3e1e', fontSize: '15px', margin: '8px 0 16px' }}>{show.description}</p>

        {confirming?.id === show.id ? (
          <button onClick={() => pick(show)} style={{
            background: show.color, color: '#fff', border: 'none',
            borderRadius: '12px', padding: '14px 32px', fontWeight: 'bold',
            fontSize: '18px', cursor: 'pointer',
            boxShadow: `0 6px 12px ${show.color}66`,
          }}>
            Yes! Pick {show.name}! 🎉
          </button>
        ) : (
          <button onClick={() => setConfirming(show)} style={{
            background: '#fff', color: show.color,
            border: `3px solid ${show.color}`,
            borderRadius: '12px', padding: '14px 32px', fontWeight: 'bold',
            fontSize: '18px', cursor: 'pointer',
          }}>
            Choose {show.name}
          </button>
        )}
      </div>

      <p style={{ color: '#7c5a2a', fontSize: '13px', marginTop: 16, opacity: 0.7 }}>
        You'll also start with 5 Poké Balls and 2 Berries.<br/>
        Find trainers around the world to win the Fishing Rod, Cut HM, and more!
      </p>
    </div>
  );
}
