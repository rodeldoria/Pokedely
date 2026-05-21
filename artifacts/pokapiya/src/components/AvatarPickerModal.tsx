import { useState } from 'react';
import {
  avatarUrl, AVATAR_STYLES, AVATAR_STYLE_LABEL, ROLL_SEEDS, rollSeed,
  fallbackAvatarDataUri,
  type AvatarStyle,
} from '../data/avatar';
import { DEFAULT_AVATAR } from '../data/avatar';

const onAvatarError = (seed: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = fallbackAvatarDataUri(seed);
};

function shuffledSeeds(): string[] {
  const pool = [...ROLL_SEEDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Sprinkle in a few fresh random seeds so each roll truly feels new.
  return [...pool.slice(0, 8), rollSeed(), rollSeed(), rollSeed(), rollSeed()];
}

interface Props {
  current: { style: AvatarStyle; seed: string };
  onSave: (next: { style: AvatarStyle; seed: string }) => void;
  onClose: () => void;
}

export default function AvatarPickerModal({ current, onSave, onClose }: Props) {
  const [style, setStyle] = useState<AvatarStyle>(current.style || DEFAULT_AVATAR.style);
  const [seed, setSeed] = useState<string>(current.seed || DEFAULT_AVATAR.seed);
  const [quickSeeds, setQuickSeeds] = useState<string[]>(() => ROLL_SEEDS.slice(0, 12));

  const handleRoll = () => {
    const next = shuffledSeeds();
    setQuickSeeds(next);
    setSeed(next[0]);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(10,6,2,0.9)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1005 0%, #0d0a04 100%)',
        border: '3px solid #7c5a2a', borderRadius: 20,
        padding: 28, width: 'min(720px, 92vw)',
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 0 60px rgba(255,213,74,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#ffd54a', fontSize: 26, margin: 0 }}>🎨 Choose Your Look</h2>
          <p style={{ color: '#9d7a3a', margin: '6px 0 0', fontSize: 13 }}>
            Pick a style, then a face — or roll for something new!
          </p>
        </div>

        {/* Big preview */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 18, marginBottom: 14,
        }}>
          <img
            src={avatarUrl({ style, seed, size: 160 })}
            alt="Your avatar"
            onError={onAvatarError(seed)}
            style={{
              width: 140, height: 140, borderRadius: 18,
              background: '#fff7e0', border: '3px solid #ffd54a',
              imageRendering: style === 'pixel-art' ? 'pixelated' : 'auto',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#ffd54a', fontWeight: 'bold' }}>
              Style: {AVATAR_STYLE_LABEL[style]}
            </div>
            <div style={{ color: '#c4a56b', fontSize: 12, wordBreak: 'break-all' }}>
              seed: {seed}
            </div>
            <button
              onClick={handleRoll}
              style={{
                background: '#b85cff', color: '#fff', border: 'none',
                borderRadius: 10, padding: '8px 14px', fontWeight: 'bold',
                cursor: 'pointer', fontSize: 14,
              }}
            >🎲 Roll new face</button>
          </div>
        </div>

        {/* Style picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>
            STYLE
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATAR_STYLES.map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                style={{
                  background: s === style ? '#ffd54a' : 'rgba(255,213,74,0.08)',
                  color: s === style ? '#1a0d00' : '#ffd54a',
                  border: `2px solid ${s === style ? '#ffd54a' : '#7c5a2a'}`,
                  borderRadius: 10, padding: '8px 12px',
                  fontWeight: 'bold', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <img
                  src={avatarUrl({ style: s, seed, size: 32 })}
                  alt={s}
                  onError={onAvatarError(seed)}
                  style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: '#fff7e0',
                    imageRendering: s === 'pixel-art' ? 'pixelated' : 'auto',
                  }}
                />
                {AVATAR_STYLE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Suggested seeds */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>
            QUICK FACES
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))',
            gap: 8,
          }}>
            {quickSeeds.map(s => (
              <button
                key={s}
                onClick={() => setSeed(s)}
                title={s}
                style={{
                  background: s === seed ? 'rgba(255,213,74,0.22)' : 'rgba(255,213,74,0.06)',
                  border: `2px solid ${s === seed ? '#ffd54a' : '#5a3e1e'}`,
                  borderRadius: 10, padding: 6, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <img
                  src={avatarUrl({ style, seed: s, size: 56 })}
                  alt={s}
                  onError={onAvatarError(s)}
                  style={{
                    width: 56, height: 56, borderRadius: 8, background: '#fff7e0',
                    imageRendering: style === 'pixel-art' ? 'pixelated' : 'auto',
                  }}
                />
                <span style={{ color: '#c4a56b', fontSize: 10 }}>{s}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: '#3a2c10', color: '#ffd54a', border: '2px solid #7c5a2a',
              borderRadius: 12, padding: '10px 24px',
              fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={() => onSave({ style, seed })}
            style={{
              background: '#2d8a52', color: '#fff', border: 'none',
              borderRadius: 12, padding: '10px 28px',
              fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
            }}
          >✓ Use this one</button>
        </div>
      </div>
    </div>
  );
}
