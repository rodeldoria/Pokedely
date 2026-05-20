import { useEffect, useState } from 'react';

interface Props {
  size?: number;
  facing?: 'right' | 'left' | 'down';
  /** Set to true to play the idle bob; false freezes on frame 0. Default true. */
  animate?: boolean;
}

const PALETTE: Record<string, string> = {
  '.': 'transparent',
  K: '#1a0d00',   // outline / shoes
  R: '#e74c3c',   // hat red
  r: '#a82e22',   // hat shadow
  w: '#ffffff',   // hat band / sock
  s: '#f7d0b0',   // skin light
  S: '#d4a17a',   // skin shadow
  h: '#6b3e1f',   // hair
  H: '#8b5a2b',   // hair highlight
  b: '#2a3a78',   // skirt shadow
  B: '#3a4d9c',   // skirt
  p: '#ff8fb1',   // shirt
  P: '#c95f85',   // shirt shadow
  y: '#ffd54a',   // hair tie
  k: '#231a10',   // shoe shadow
  m: '#000000',   // eyes/mouth
};

// 18×24 grid. Outline-first, then fills.
// DOWN, frame 0 (left foot forward).
const ADDIE_DOWN_0 = [
  '......KKKK........',
  '.....KRRRRK.......',
  '....KRRRRRRK......',
  '....KRwwwwRK......',
  '....KKKKKKKK......',
  '....KhhssssHh.....',
  '...HhsssKsKshhy...',  // ponytail tip on the right
  '....hssssssshh....',
  '....hssSmmmSsh....',
  '.....hsssssh......',
  '......hsssh.......',
  '....KppppppK......',
  '...KpwppppwpK.....',
  '..KppppppppppK....',
  '..KppppppppppK....',
  '...sKPPPPPPKs.....',
  '....KBBBBBBK......',
  '....KbbbbbbK......',
  '....Kbb..bbK......',
  '....Kbb..bbK......',
  '....KK....KK......',
  '....kk....kk......',
  '....kkk..kkk......',
  '....kKK..KKk......',
];

// DOWN, frame 1 (right foot forward) — only the legs swap.
const ADDIE_DOWN_1 = [
  '......KKKK........',
  '.....KRRRRK.......',
  '....KRRRRRRK......',
  '....KRwwwwRK......',
  '....KKKKKKKK......',
  '....KhhssssHh.....',
  '...HhsssKsKshhy...',
  '....hssssssshh....',
  '....hssSmmmSsh....',
  '.....hsssssh......',
  '......hsssh.......',
  '....KppppppK......',
  '...KpwppppwpK.....',
  '..KppppppppppK....',
  '..KppppppppppK....',
  '...sKPPPPPPKs.....',
  '....KBBBBBBK......',
  '....KbbbbbbK......',
  '....Kbb..bbK......',
  '....Kbb..bbK......',
  '....KKK..KKK......',
  '....kkkk.kkkk.....',
  '.....kkk..kk......',
  '......KK..KK......',
];

// RIGHT, frame 0.
const ADDIE_RIGHT_0 = [
  '......KKKK........',
  '.....KRRRRK.......',
  '....KRRRRRRK......',
  '....KRwwwwRK......',
  '....KKKKKKKK......',
  '....hhssssKK......',
  '...HhssssshhyH....',
  '...HssKsssHhh.....',
  '...Hssss..mhh.....',
  '....smmmS.........',
  '....Ksssss........',
  '....KpppppK.......',
  '...KpwwppppK......',
  '..KpppppppppK.....',
  '..KpppppppppK.....',
  '...sKPPPPPKss.....',
  '....KBBBBBBK......',
  '....KbbbbbK.......',
  '....Kbb..bK.......',
  '....Kbb..bK.......',
  '.....KK..KK.......',
  '.....kk..kk.......',
  '.....kkk.kkk......',
  '.....kKK.KKk......',
];

// RIGHT, frame 1.
const ADDIE_RIGHT_1 = [
  '......KKKK........',
  '.....KRRRRK.......',
  '....KRRRRRRK......',
  '....KRwwwwRK......',
  '....KKKKKKKK......',
  '....hhssssKK......',
  '...HhssssshhyH....',
  '...HssKsssHhh.....',
  '...Hssss..mhh.....',
  '....smmmS.........',
  '....Ksssss........',
  '....KpppppK.......',
  '...KpwwppppK......',
  '..KpppppppppK.....',
  '..KpppppppppK.....',
  '...sKPPPPPKss.....',
  '....KBBBBBBK......',
  '....KbbbbbK.......',
  '....Kbb..bK.......',
  '....Kbb..bK.......',
  '....KKK..KK.......',
  '....kkkk.kk.......',
  '.....kkk..kk......',
  '......KK..KK......',
];

const FRAMES = {
  down:  [ADDIE_DOWN_0, ADDIE_DOWN_1],
  right: [ADDIE_RIGHT_0, ADDIE_RIGHT_1],
} as const;

export function AddieSprite({ size = 160, facing = 'right', animate = true }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate) { setFrame(0); return; }
    const id = window.setInterval(() => setFrame(f => 1 - f), 420);
    return () => window.clearInterval(id);
  }, [animate]);

  const key = facing === 'down' ? 'down' : 'right';
  const art = FRAMES[key][frame];
  const flip = facing === 'left';
  const cols = art[0].length;
  const rows = art.length;
  return (
    <svg
      width={size}
      height={size * (rows / cols)}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      style={{
        transform: flip ? 'scaleX(-1)' : 'none',
        filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.22))',
        imageRendering: 'pixelated',
      }}
    >
      {art.map((row, y) =>
        row.split('').map((ch, x) => {
          const c = PALETTE[ch];
          if (!c || c === 'transparent') return null;
          return <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} />;
        })
      )}
      <ellipse cx={cols / 2} cy={rows - 0.4} rx={cols * 0.28} ry={0.5} fill="rgba(0,0,0,0.28)" />
    </svg>
  );
}
