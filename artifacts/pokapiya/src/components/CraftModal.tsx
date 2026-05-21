import { useState } from 'react';
import type { TrainerState } from '../game/save';
import { craft } from '../game/save';

interface Props {
  state: TrainerState;
  onChange: (state: TrainerState) => void;
  onClose: () => void;
}

interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: string;
  reward: string;
}

const RECIPES: Recipe[] = [
  {
    id: 'fence',
    name: 'Wooden Fence',
    emoji: '🪵',
    description: 'A short wooden fence. Place it in the world (press B in the map).',
    cost: '2 🪵 Lumber',
    reward: '+1 🪵 Fence (place it!)',
  },
  {
    id: 'path',
    name: 'Stone Path Tile',
    emoji: '🪨',
    description: 'A polished stone path tile. Lay it down to make your own paths.',
    cost: '2 🪨 Stone',
    reward: '+1 🪨 Path tile (place it!)',
  },
  {
    id: 'berry-tree',
    name: 'Berry Tree',
    emoji: '🌳',
    description: 'A young berry tree to plant in the world.',
    cost: '1 🌱 Seed + 1 🪵 Lumber',
    reward: '+1 🌳 Berry Tree (plant it!)',
  },
  {
    id: 'house',
    name: 'Little House',
    emoji: '🏠',
    description: 'A cozy little house with a red roof. Build it anywhere on grass.',
    cost: '8 🪵 Lumber + 4 🪨 Stone + 1 ⚙️ Metal',
    reward: '+1 🏠 House (build it!)',
  },
];

const SHOP: Recipe[] = [
  {
    id: 'sell-berry',
    name: 'Sell a Berry',
    emoji: '🍓',
    description: 'Trade an extra berry for coins.',
    cost: '1 🍓',
    reward: '+5 🪙',
  },
  {
    id: 'buy-pokeball',
    name: 'Buy a Poké Ball',
    emoji: '🔴',
    description: 'Always handy in tall grass.',
    cost: '8 🪙',
    reward: '+1 🔴',
  },
  {
    id: 'buy-berry',
    name: 'Buy a Berry',
    emoji: '🍓',
    description: 'Boosts your next catch attempt.',
    cost: '5 🪙',
    reward: '+1 🍓',
  },
];

export default function CraftModal({ state, onChange, onClose }: Props) {
  const [flash, setFlash] = useState('');

  function tryRecipe(id: string) {
    if (craft(state, id)) {
      onChange({ ...state });
      setFlash(`✓ ${id.replace(/-/g, ' ')}`);
      setTimeout(() => setFlash(''), 1200);
    } else {
      setFlash(`✗ Not enough resources`);
      setTimeout(() => setFlash(''), 1500);
    }
  }

  const inv = state.inventory;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,6,2,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1005 0%, #0d0a04 100%)',
        border: '3px solid #7c5a2a', borderRadius: '20px',
        padding: '28px', maxWidth: '760px', width: '92vw',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(255,213,74,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <h2 style={{ color: '#ffd54a', fontSize: '26px', margin: 0 }}>🔨 Pokapiya Workshop</h2>
          <p style={{ color: '#9d7a3a', margin: '6px 0 0', fontSize: 13 }}>
            Craft furniture, trade berries for coins, and buy supplies.
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16,
          flexWrap: 'wrap', fontSize: 13,
        }}>
          <ResourceChip label="🪙 Coins" value={inv.coin || 0} />
          <ResourceChip label="🪵 Lumber" value={inv.lumber || 0} />
          <ResourceChip label="🪨 Stone" value={inv.stone || 0} />
          <ResourceChip label="⚙️ Metal" value={inv.metal || 0} />
          <ResourceChip label="💧 Water" value={inv.water || 0} />
          <ResourceChip label="🌱 Seed" value={inv.seed || 0} />
          <ResourceChip label="🍓 Berry" value={inv.berry || 0} />
          <ResourceChip label="🔴 Ball" value={inv.pokeball || 0} />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHeading>Craft</SectionHeading>
          {RECIPES.map(r => (
            <RecipeRow key={r.id} r={r} onUse={() => tryRecipe(r.id)} />
          ))}

          <SectionHeading>Trade with Nurse Joy</SectionHeading>
          {SHOP.map(r => (
            <RecipeRow key={r.id} r={r} onUse={() => tryRecipe(r.id)} />
          ))}
        </div>

        {flash && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#ffe082', color: '#4a2e10', borderRadius: 8,
            padding: '6px 14px', fontWeight: 'bold', fontSize: 14,
            border: '2px solid #6e4b1f',
          }}>{flash}</div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: '#d63946', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 32px',
              fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
            }}
          >
            Close (ESC / C)
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: '#ffd54a', fontSize: 14, fontWeight: 'bold',
      borderBottom: '1px solid #3a2c10', paddingBottom: 4, marginTop: 4,
    }}>{children}</div>
  );
}

function ResourceChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(255,213,74,0.12)', border: '1px solid #7c5a2a',
      borderRadius: 8, padding: '4px 10px',
      color: '#ffd54a', fontWeight: 'bold',
    }}>
      {label}: {value}
    </div>
  );
}

function RecipeRow({ r, onUse }: { r: Recipe; onUse: () => void }) {
  return (
    <div style={{
      background: 'rgba(255,213,74,0.05)', border: '2px solid #3a2c10',
      borderRadius: 12, padding: '10px 14px',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ fontSize: 28 }}>{r.emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: 14 }}>{r.name}</div>
        <div style={{ color: '#9d7a3a', fontSize: 12, marginTop: 2 }}>{r.description}</div>
        <div style={{ color: '#c4a56b', fontSize: 12, marginTop: 4 }}>
          Cost: <b>{r.cost}</b>  →  Reward: <b style={{ color: '#86efac' }}>{r.reward}</b>
        </div>
      </div>
      <button
        onClick={onUse}
        style={{
          background: '#2d8a52', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontWeight: 'bold', fontSize: 13,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Make
      </button>
    </div>
  );
}
