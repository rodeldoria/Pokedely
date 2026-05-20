import { useEffect, useState } from 'react';

interface Props {
  size?: number;
  facing?: 'right' | 'left' | 'down';
  /** Set to true to play the idle bob; false freezes on frame 0. Default true. */
  animate?: boolean;
}

// Polished chibi illustration of Addie used for the battle VS intro and any
// future portrait slot. The overworld walking sprite still uses the small
// pixel sprites baked into `GameCanvas` — they read better at map scale.
//
// The SVG is authored at 100×140 user units so it scales cleanly to any
// `size` prop. Two frames swap the leg positions to give a subtle "ready
// stance" sway when `animate` is true.

const COLORS = {
  outline: '#1a0d00',
  hatRed: '#ef4036',
  hatRedDark: '#a8261a',
  hatRedLight: '#ff6e54',
  hatBand: '#ffffff',
  skin: '#f7d4b3',
  skinShade: '#d9a47a',
  skinBlush: '#ffb4a8',
  hair: '#5a3318',
  hairLight: '#8a5a2b',
  hairHi: '#b07a3a',
  shirt: '#ff8fb1',
  shirtShade: '#c95f85',
  shirtHi: '#ffc1d4',
  skirt: '#3a4d9c',
  skirtShade: '#222e6a',
  skirtHi: '#6a85d8',
  shoe: '#231a10',
  shoeHi: '#4a3a22',
  eye: '#231a10',
  mouth: '#7a3324',
  tie: '#ffd54a',
};

function Addie({ frame }: { frame: 0 | 1 }) {
  const c = COLORS;
  // Leg sway offsets by frame so the stance feels alive.
  const legL = frame === 0 ? 0 : -1;
  const legR = frame === 0 ? 0 : 1;
  return (
    <g>
      {/* Soft ground shadow */}
      <ellipse cx="50" cy="135" rx="22" ry="4.5" fill="rgba(0,0,0,0.30)" />

      {/* ── Legs ─────────────────────────────────────────────── */}
      {/* Left leg */}
      <path
        d={`M40 ${110 + legL} L40 128 L46 128 L46 ${110 + legL} Z`}
        fill={c.skin} stroke={c.outline} strokeWidth="1.2"
      />
      <ellipse cx="43" cy="131" rx="5.5" ry="3" fill={c.shoe} stroke={c.outline} strokeWidth="1.2" />
      <ellipse cx="42" cy="130" rx="3" ry="1.2" fill={c.shoeHi} opacity="0.55" />

      {/* Right leg */}
      <path
        d={`M54 ${110 + legR} L54 128 L60 128 L60 ${110 + legR} Z`}
        fill={c.skin} stroke={c.outline} strokeWidth="1.2"
      />
      <ellipse cx="57" cy="131" rx="5.5" ry="3" fill={c.shoe} stroke={c.outline} strokeWidth="1.2" />
      <ellipse cx="56" cy="130" rx="3" ry="1.2" fill={c.shoeHi} opacity="0.55" />

      {/* ── Skirt ────────────────────────────────────────────── */}
      <path
        d="M30 92 L70 92 L74 114 L26 114 Z"
        fill={c.skirt} stroke={c.outline} strokeWidth="1.4"
      />
      <path
        d="M30 92 L70 92 L72 100 L28 100 Z"
        fill={c.skirtHi} opacity="0.55"
      />
      <path
        d="M26 114 L74 114 L72 117 L28 117 Z"
        fill={c.skirtShade}
      />
      {/* Skirt pleats */}
      <line x1="40" y1="93" x2="38" y2="113" stroke={c.skirtShade} strokeWidth="0.8" opacity="0.6" />
      <line x1="50" y1="93" x2="50" y2="113" stroke={c.skirtShade} strokeWidth="0.8" opacity="0.6" />
      <line x1="60" y1="93" x2="62" y2="113" stroke={c.skirtShade} strokeWidth="0.8" opacity="0.6" />

      {/* ── Shirt ────────────────────────────────────────────── */}
      <path
        d="M28 64 Q28 60 32 58 L46 56 Q50 55 54 56 L68 58 Q72 60 72 64 L73 92 L27 92 Z"
        fill={c.shirt} stroke={c.outline} strokeWidth="1.4"
      />
      {/* Shirt highlight on left shoulder */}
      <path d="M30 64 Q30 60 34 58 L42 57 L40 75 L29 75 Z" fill={c.shirtHi} opacity="0.45" />
      {/* Belt */}
      <rect x="27" y="89" width="46" height="4" fill={c.shirtShade} stroke={c.outline} strokeWidth="0.8" />
      <rect x="46" y="89" width="8" height="4" fill={c.tie} stroke={c.outline} strokeWidth="0.8" />
      {/* Buttons */}
      <circle cx="50" cy="70" r="1.4" fill={c.tie} stroke={c.outline} strokeWidth="0.5" />
      <circle cx="50" cy="80" r="1.4" fill={c.tie} stroke={c.outline} strokeWidth="0.5" />

      {/* ── Arms ─────────────────────────────────────────────── */}
      <path d="M28 64 Q22 70 22 84 Q22 90 26 90 Q30 88 30 82 L31 70 Z"
        fill={c.shirt} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="24" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <path d="M72 64 Q78 70 78 84 Q78 90 74 90 Q70 88 70 82 L69 70 Z"
        fill={c.shirt} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="76" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />

      {/* ── Neck ─────────────────────────────────────────────── */}
      <rect x="44" y="52" width="12" height="8" fill={c.skinShade} stroke={c.outline} strokeWidth="1" />

      {/* ── Head ─────────────────────────────────────────────── */}
      {/* Head base */}
      <ellipse cx="50" cy="38" rx="20" ry="20" fill={c.skin} stroke={c.outline} strokeWidth="1.5" />
      {/* Chin shading */}
      <path d="M34 44 Q50 58 66 44 Q66 52 50 56 Q34 52 34 44 Z" fill={c.skinShade} opacity="0.55" />

      {/* Hair back (behind face) */}
      <path
        d="M28 34 Q28 14 50 12 Q72 14 72 34 L70 50 Q68 36 50 34 Q32 36 30 50 Z"
        fill={c.hair} stroke={c.outline} strokeWidth="1.4"
      />
      {/* Bangs / front fringe */}
      <path
        d="M32 26 Q40 16 50 16 Q60 16 68 26 Q66 32 58 28 Q55 32 50 30 Q45 32 42 28 Q34 32 32 26 Z"
        fill={c.hair} stroke={c.outline} strokeWidth="1.3"
      />
      <path d="M36 22 Q42 18 48 20 L46 26 Q42 24 38 26 Z" fill={c.hairHi} opacity="0.7" />

      {/* Ponytail on the right */}
      <path
        d="M70 28 Q86 32 84 50 Q82 64 72 56 Q72 44 70 38 Z"
        fill={c.hair} stroke={c.outline} strokeWidth="1.4"
      />
      <path d="M74 34 Q82 38 82 50" stroke={c.hairLight} strokeWidth="1.4" fill="none" opacity="0.8" />
      {/* Hair tie */}
      <ellipse cx="71" cy="34" rx="3.5" ry="2.2" fill={c.tie} stroke={c.outline} strokeWidth="1" />

      {/* ── Cap ──────────────────────────────────────────────── */}
      {/* Brim */}
      <path
        d="M22 20 Q24 16 50 14 Q76 16 78 20 L78 24 L22 24 Z"
        fill={c.hatRed} stroke={c.outline} strokeWidth="1.4"
      />
      <path d="M22 20 Q24 16 50 14 Q76 16 78 20 L74 21 Q50 18 26 21 Z" fill={c.hatRedLight} />
      {/* Crown */}
      <path
        d="M30 20 Q30 4 50 4 Q70 4 70 20 Z"
        fill={c.hatRed} stroke={c.outline} strokeWidth="1.4"
      />
      <path d="M34 18 Q34 6 50 6 Q56 6 60 9 Q44 8 38 18 Z" fill={c.hatRedLight} opacity="0.85" />
      {/* Hat band */}
      <rect x="22" y="20" width="56" height="3" fill={c.hatBand} stroke={c.outline} strokeWidth="0.8" />
      {/* Hat emblem (yellow ball) */}
      <circle cx="50" cy="14" r="3.5" fill={c.tie} stroke={c.outline} strokeWidth="1" />
      <circle cx="49" cy="13" r="1.2" fill="#fff" opacity="0.8" />
      {/* Hat shadow underneath onto forehead */}
      <path d="M30 24 Q50 26 70 24 L68 28 Q50 30 32 28 Z" fill={c.hatRedDark} opacity="0.45" />

      {/* ── Face ─────────────────────────────────────────────── */}
      {/* Blush */}
      <ellipse cx="38" cy="42" rx="3.2" ry="2" fill={c.skinBlush} opacity="0.75" />
      <ellipse cx="62" cy="42" rx="3.2" ry="2" fill={c.skinBlush} opacity="0.75" />
      {/* Eyes (big chibi style) */}
      <ellipse cx="41" cy="38" rx="2.6" ry="3.4" fill="#fff" stroke={c.outline} strokeWidth="1" />
      <ellipse cx="59" cy="38" rx="2.6" ry="3.4" fill="#fff" stroke={c.outline} strokeWidth="1" />
      <ellipse cx="41.3" cy="39" rx="1.7" ry="2.4" fill={c.eye} />
      <ellipse cx="59.3" cy="39" rx="1.7" ry="2.4" fill={c.eye} />
      <circle cx="42" cy="38" r="0.7" fill="#fff" />
      <circle cx="60" cy="38" r="0.7" fill="#fff" />
      {/* Mouth — gentle smile */}
      <path d="M46 47 Q50 50 54 47" stroke={c.mouth} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function AddieSprite({ size = 160, facing = 'right', animate = true }: Props) {
  const [frame, setFrame] = useState<0 | 1>(0);

  useEffect(() => {
    if (!animate) { setFrame(0); return; }
    const id = window.setInterval(() => setFrame(f => (f === 0 ? 1 : 0)), 520);
    return () => window.clearInterval(id);
  }, [animate]);

  // SVG canvas is 100w × 140h. `size` controls width.
  const w = size;
  const h = size * 1.4;
  const flip = facing === 'left';
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 140"
      style={{
        transform: flip ? 'scaleX(-1)' : 'none',
        filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.28))',
      }}
    >
      <Addie frame={frame} />
    </svg>
  );
}
