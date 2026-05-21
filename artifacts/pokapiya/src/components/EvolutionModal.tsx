import { useState } from 'react';
import type { PendingEvolution } from '../game/evolution';

interface Props {
  pending: PendingEvolution;
  onEvolve: () => void;
  onCancel: () => void;
}

import { liveSpriteUrl, spriteUrl } from '../data/pokedex';

function sprite(id: number) {
  return liveSpriteUrl(id);
}

export default function EvolutionModal({ pending, onEvolve, onCancel }: Props) {
  const [phase, setPhase] = useState<'ask' | 'animating' | 'done'>('ask');

  const handleEvolve = () => {
    setPhase('animating');
    setTimeout(() => setPhase('done'), 1400);
    setTimeout(() => { onEvolve(); }, 2200);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(10,6,2,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1005 0%, #0d0a04 100%)',
        border: '3px solid #ffd54a', borderRadius: '20px',
        padding: '28px 32px', maxWidth: '480px', width: '92vw',
        textAlign: 'center',
        boxShadow: '0 0 80px rgba(255,213,74,0.35)',
      }}>
        {phase === 'ask' && (
          <>
            <h2 style={{ color: '#ffd54a', margin: '0 0 6px', fontSize: '24px' }}>
              ✨ What? {pending.beforeName} is evolving!
            </h2>
            <p style={{ color: '#c4a56b', margin: '0 0 18px', fontSize: '14px' }}>
              {pending.beforeName} wants to evolve into <b style={{ color: '#ffd54a' }}>{pending.afterName}</b>.
              Let it evolve?
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 18, margin: '12px 0 18px',
            }}>
              <SpriteCard id={pending.beforeId} name={pending.beforeName} />
              <div style={{ fontSize: 28, color: '#ffd54a' }}>→</div>
              <SpriteCard id={pending.afterId} name={pending.afterName} />
            </div>

            <p style={{
              color: '#9d7a3a', fontSize: '12px', margin: '0 0 16px',
              fontStyle: 'italic',
            }}>
              (No new moves are learned — your team keeps the same field moves.)
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleEvolve} style={btn('#4ade80', '#0d0a04')}>
                ✨ Evolve!
              </button>
              <button onClick={onCancel} style={btn('#7c5a2a', '#fff')}>
                Not now
              </button>
            </div>
          </>
        )}

        {phase === 'animating' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{
              fontSize: 18, color: '#ffd54a', fontWeight: 'bold', marginBottom: 20,
            }}>
              {pending.beforeName} is evolving...
            </div>
            <div style={{
              width: 140, height: 140, margin: '0 auto',
              borderRadius: 70,
              background: 'radial-gradient(circle, #fff 0%, #ffd54a 40%, transparent 70%)',
              animation: 'evoPulse 0.4s ease-in-out infinite alternate',
            }} />
            <style>{`
              @keyframes evoPulse {
                from { transform: scale(0.85); opacity: 0.7; }
                to   { transform: scale(1.15); opacity: 1;   }
              }
            `}</style>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 20, color: '#4ade80', fontWeight: 'bold', marginBottom: 14 }}>
              ✨ Congratulations!
            </div>
            <SpriteCard id={pending.afterId} name={pending.afterName} big />
            <div style={{ color: '#c4a56b', marginTop: 14, fontSize: 14 }}>
              {pending.beforeName} evolved into <b style={{ color: '#ffd54a' }}>{pending.afterName}</b>!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SpriteCard({ id, name, big }: { id: number; name: string; big?: boolean }) {
  const size = big ? 110 : 80;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: size + 16, height: size + 16,
        borderRadius: 14, padding: 8,
        background: 'rgba(255,213,74,0.10)',
        border: '2px solid #7c5a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={sprite(id)} alt={name}
          style={{ width: size, height: size, imageRendering: 'pixelated', objectFit: 'contain' }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.onerror = null;
            img.src = spriteUrl(id);
          }} />
      </div>
      <div style={{ color: '#ffd54a', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
        {name}
      </div>
    </div>
  );
}

function btn(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, color, border: 'none',
    borderRadius: 12, padding: '12px 22px',
    fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
  };
}
