import { useState } from 'react';
import type { TrainerState } from '../game/save';
import { save } from '../game/save';
import { byId, spriteUrl, liveSpriteUrl, displayName } from '../data/pokedex';
import { AddieSprite } from './AddieSprite';

interface Props {
  state: TrainerState;
  houseKey: string;
  onChange: (s: TrainerState) => void;
  onClose: () => void;
}

// Cozy inside-the-house screen. Addie steps inside her own placed house;
// she can pick one of her party Pokémon to live there as a "roommate".
// The resident is remembered in state.houseResidents[houseKey] so the
// next time she enters that specific house she sees the same buddy.
export default function HouseInteriorModal({ state, houseKey, onChange, onClose }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const residentId = state.houseResidents[houseKey];
  const resident = residentId ? byId(residentId) : null;

  const assign = (id: number) => {
    state.houseResidents = { ...state.houseResidents, [houseKey]: id };
    save(state);
    onChange({ ...state });
    setPickerOpen(false);
  };

  const evict = () => {
    const next = { ...state.houseResidents };
    delete next[houseKey];
    state.houseResidents = next;
    save(state);
    onChange({ ...state });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(8,4,2,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #f6e2b8 0%, #d8b478 60%, #8b5a2b 100%)',
        border: '4px solid #6e4218', borderRadius: 18,
        width: '92vw', maxWidth: 520, padding: 22,
        boxShadow: '0 0 60px rgba(255,200,120,0.25)',
        color: '#3a2410',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#5a3010' }}>
            🏠 Inside the Cozy House
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6e4218' }}>
            Warm fireplace, soft rugs, and bowls of berries on the table.
          </p>
        </div>

        {/* Wooden-floor scene */}
        <div style={{
          position: 'relative', height: 220,
          background: 'repeating-linear-gradient(0deg, #b07a3e 0px, #b07a3e 24px, #9a6630 24px, #9a6630 26px)',
          borderRadius: 12, border: '3px solid #6e4218',
          overflow: 'hidden', marginBottom: 14,
        }}>
          {/* Back wall with window + picture */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 70,
            background: 'linear-gradient(180deg, #f0d8a8 0%, #e0c088 100%)',
            borderBottom: '3px solid #6e4218',
          }}>
            <div style={{
              position: 'absolute', top: 10, left: 30, width: 50, height: 40,
              background: '#9ed4ff', border: '3px solid #6e4218',
              boxShadow: 'inset 0 0 0 2px #d8b478',
            }} />
            <div style={{
              position: 'absolute', top: 14, right: 28, width: 40, height: 32,
              background: '#fff', border: '3px solid #6e4218',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>❤️</div>
          </div>

          {/* Fireplace */}
          <div style={{
            position: 'absolute', bottom: 14, left: 18, width: 56, height: 70,
            background: '#5a3010', border: '3px solid #3a2410',
            borderRadius: 4,
          }}>
            <div style={{
              position: 'absolute', bottom: 4, left: 6, right: 6, height: 30,
              background: 'radial-gradient(circle at 50% 80%, #ffd54a 0%, #ff7a3a 50%, transparent 80%)',
            }} />
          </div>

          {/* Table with berries */}
          <div style={{
            position: 'absolute', bottom: 14, right: 28, width: 70, height: 36,
          }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 8, width: 4, height: 18,
              background: '#5a3010',
            }} />
            <div style={{
              position: 'absolute', bottom: 0, right: 8, width: 4, height: 18,
              background: '#5a3010',
            }} />
            <div style={{
              position: 'absolute', bottom: 18, left: 0, right: 0, height: 8,
              background: '#8b5a2b', borderRadius: 2,
              border: '2px solid #5a3010',
            }} />
            <div style={{ position: 'absolute', bottom: 28, left: 14, fontSize: 14 }}>🍓</div>
            <div style={{ position: 'absolute', bottom: 28, left: 30, fontSize: 14 }}>🍓</div>
            <div style={{ position: 'absolute', bottom: 28, left: 46, fontSize: 14 }}>🍇</div>
          </div>

          {/* Addie */}
          <div style={{
            position: 'absolute', bottom: 10, left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <AddieSprite size={96} facing="down" animate />
          </div>

          {/* Resident Pokémon */}
          {resident && (
            <div style={{
              position: 'absolute', bottom: 14, right: 110,
            }}>
              <img
                src={liveSpriteUrl(resident.id)}
                alt={displayName(resident)}
                style={{
                  width: 72, height: 72, imageRendering: 'pixelated', objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.4))',
                }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = spriteUrl(resident.id);
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#3a2410', marginBottom: 6 }}>
            🐾 Roommate
          </div>
          {resident ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={liveSpriteUrl(resident.id)} alt="" style={{ width: 40, height: 40, imageRendering: 'pixelated', objectFit: 'contain' }}
                onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = spriteUrl(resident.id); }} />
              <div style={{ flex: 1 }}>
                <b>{displayName(resident)}</b> lives here and loves visits!
              </div>
              <button
                onClick={evict}
                style={{
                  background: '#a04040', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >Move out</button>
            </div>
          ) : (
            <button
              onClick={() => setPickerOpen(true)}
              disabled={state.team.length === 0}
              style={{
                background: state.team.length === 0 ? '#a89a6a' : '#2d8a52',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 'bold',
                cursor: state.team.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {state.team.length === 0 ? 'Catch a Pokémon first!' : '+ Move a Pokémon in'}
            </button>
          )}
        </div>

        {pickerOpen && (
          <div style={{
            background: 'rgba(58,36,16,0.96)', borderRadius: 10,
            padding: 10, marginBottom: 12,
          }}>
            <div style={{ color: '#ffd54a', fontSize: 12, marginBottom: 6, fontWeight: 'bold' }}>
              Which Pokémon should live here?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {state.team.map((m, i) => {
                const mon = byId(m.id);
                if (!mon) return null;
                return (
                  <button
                    key={i}
                    onClick={() => assign(m.id)}
                    style={{
                      background: '#5a3010', color: '#ffd54a',
                      border: '2px solid #8b5a2b', borderRadius: 8,
                      padding: '6px 10px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 'bold',
                    }}
                  >
                    <img src={liveSpriteUrl(m.id)} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated', objectFit: 'contain' }}
                      onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = spriteUrl(m.id); }} />
                    {displayName(mon)}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPickerOpen(false)}
              style={{
                marginTop: 8, background: 'transparent',
                color: '#ffd54a', border: '1px solid #8b5a2b',
                borderRadius: 6, padding: '4px 10px',
                fontSize: 11, cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: '#5a3010', color: '#ffd54a', border: '2px solid #3a2410',
              borderRadius: 12, padding: '10px 26px',
              fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
            }}
          >
            Step outside (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
