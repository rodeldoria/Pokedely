interface Props {
  size?: number;
  facing?: 'right' | 'left' | 'down';
}

const PALETTE: Record<string, string> = {
  '.': 'transparent',
  K: '#1a0d00',
  R: '#e74c3c',
  r: '#a82e22',
  w: '#ffffff',
  s: '#f7d0b0',
  S: '#d4a17a',
  h: '#6b3e1f',
  H: '#8b5a2b',
  b: '#2a3a78',
  B: '#3a4d9c',
  p: '#ff8fb1',
  P: '#c95f85',
  y: '#ffd54a',
  k: '#231a10',
};

const ADDIE_DOWN = [
  '.....KKKKKK.....',
  '....KRRRRRRK....',
  '....KRwwwwRK....',
  '....KKKKKKKK....',
  '...hhssssssHh...',
  '..hhsssKsKshHh..',
  '..hhsssssssshH..',
  '..hhssSmmmSsshH.',
  '...hssssssssh...',
  '....HsssssH.....',
  '....KpppppK.....',
  '...KpwppwppK....',
  '...KppppppPK....',
  '...KppppppPK....',
  '...sKPPPPPKs....',
  '....KBBBBBK.....',
  '....KbbbbbK.....',
  '....Kbb.bbK.....',
  '....Kbb.bbK.....',
  '....kkk.kkk.....',
];

const ADDIE_RIGHT = [
  '.....KKKKK......',
  '....KRRRRRK.....',
  '....KRwwwRK.....',
  '....KKKKKKK.....',
  '....hhssssKK....',
  '...hHssssshh....',
  '...HssKsssHh....',
  '...Hssssss.hh...',
  '....smmmss..hh..',
  '....Kssss.......',
  '....KpppppK.....',
  '...KpwwppppK....',
  '..KppppppppK....',
  '..KppppppppK....',
  '...sKPPPPPKs....',
  '....KBBBBBK.....',
  '....KbbbbK......',
  '....Kbb.bK......',
  '....kkk.k.......',
  '....kk..kk......',
];

export function AddieSprite({ size = 160, facing = 'right' }: Props) {
  const art = facing === 'down' ? ADDIE_DOWN : ADDIE_RIGHT;
  const flip = facing === 'left';
  const cols = art[0].length;
  const rows = art.length;
  const px = size / cols;
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
      <span style={{ display: 'none' }}>{px}</span>
    </svg>
  );
}
