import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NPCTrainer } from '../game/world';

type TrainerKind = NPCTrainer['kind'];

interface Props {
  kind: TrainerKind;
  size?: number;
  facing?: 'right' | 'left' | 'down';
  animate?: boolean;
}

// Polished chibi portraits for each trainer class used on the opponent
// side of the battle VS intro. Mirrors the `AddieSprite` API so swapping
// the two is a one-liner. Each portrait is authored at 100×140 user units.

const COMMON = {
  outline: '#1a0d00',
  skin: '#f7d4b3',
  skinShade: '#d9a47a',
  skinBlush: '#ffb4a8',
  shoe: '#231a10',
  shoeHi: '#4a3a22',
  eye: '#231a10',
  mouth: '#7a3324',
  white: '#ffffff',
  gold: '#ffd54a',
};

function Shadow() {
  return <ellipse cx="50" cy="135" rx="22" ry="4.5" fill="rgba(0,0,0,0.30)" />;
}

function Legs({ frame, color, shade }: { frame: 0 | 1; color: string; shade: string }) {
  const legL = frame === 0 ? 0 : -1;
  const legR = frame === 0 ? 0 : 1;
  const c = COMMON;
  return (
    <g>
      <path d={`M40 ${110 + legL} L40 128 L46 128 L46 ${110 + legL} Z`} fill={color} stroke={c.outline} strokeWidth="1.2" />
      <ellipse cx="43" cy="131" rx="5.5" ry="3" fill={c.shoe} stroke={c.outline} strokeWidth="1.2" />
      <ellipse cx="42" cy="130" rx="3" ry="1.2" fill={c.shoeHi} opacity="0.55" />
      <path d={`M54 ${110 + legR} L54 128 L60 128 L60 ${110 + legR} Z`} fill={color} stroke={c.outline} strokeWidth="1.2" />
      <ellipse cx="57" cy="131" rx="5.5" ry="3" fill={c.shoe} stroke={c.outline} strokeWidth="1.2" />
      <ellipse cx="56" cy="130" rx="3" ry="1.2" fill={c.shoeHi} opacity="0.55" />
      <line x1="43" y1={115 + legL * 0.5} x2="43" y2="126" stroke={shade} strokeWidth="0.6" opacity="0.5" />
      <line x1="57" y1={115 + legR * 0.5} x2="57" y2="126" stroke={shade} strokeWidth="0.6" opacity="0.5" />
    </g>
  );
}

function FaceBase({ children }: { children?: React.ReactNode }) {
  const c = COMMON;
  return (
    <g>
      <rect x="44" y="52" width="12" height="8" fill={c.skinShade} stroke={c.outline} strokeWidth="1" />
      <ellipse cx="50" cy="38" rx="20" ry="20" fill={c.skin} stroke={c.outline} strokeWidth="1.5" />
      <path d="M34 44 Q50 58 66 44 Q66 52 50 56 Q34 52 34 44 Z" fill={c.skinShade} opacity="0.55" />
      <ellipse cx="38" cy="42" rx="3.2" ry="2" fill={c.skinBlush} opacity="0.75" />
      <ellipse cx="62" cy="42" rx="3.2" ry="2" fill={c.skinBlush} opacity="0.75" />
      {children}
    </g>
  );
}

function ChibiEyes() {
  const c = COMMON;
  return (
    <g>
      <ellipse cx="41" cy="38" rx="2.6" ry="3.4" fill="#fff" stroke={c.outline} strokeWidth="1" />
      <ellipse cx="59" cy="38" rx="2.6" ry="3.4" fill="#fff" stroke={c.outline} strokeWidth="1" />
      <ellipse cx="41.3" cy="39" rx="1.7" ry="2.4" fill={c.eye} />
      <ellipse cx="59.3" cy="39" rx="1.7" ry="2.4" fill={c.eye} />
      <circle cx="42" cy="38" r="0.7" fill="#fff" />
      <circle cx="60" cy="38" r="0.7" fill="#fff" />
    </g>
  );
}

// ─── HIKER ──────────────────────────────────────────────────────────
function Hiker({ frame }: { frame: 0 | 1 }) {
  const c = COMMON;
  const palette = {
    pants: '#5a3318', pantsShade: '#3a1f0c',
    vest: '#c8521e', vestShade: '#8a3410', vestHi: '#ef7a40',
    beanie: '#2d6a4f', beanieHi: '#52a378', beanieBand: '#ffd54a',
    pack: '#4a3a22', packShade: '#2a1f10',
    stache: '#3a2510',
  };
  return (
    <g>
      <Shadow />
      <Legs frame={frame} color={palette.pants} shade={palette.pantsShade} />
      {/* Backpack peeking */}
      <rect x="22" y="68" width="10" height="28" rx="3" fill={palette.pack} stroke={c.outline} strokeWidth="1.2" />
      <rect x="68" y="68" width="10" height="28" rx="3" fill={palette.pack} stroke={c.outline} strokeWidth="1.2" />
      <path d="M30 70 Q50 64 70 70 L70 78 Q50 72 30 78 Z" fill={palette.packShade} opacity="0.7" />
      {/* Vest */}
      <path d="M26 64 Q26 60 32 58 L46 56 Q50 55 54 56 L68 58 Q74 60 74 64 L76 98 L24 98 Z"
        fill={palette.vest} stroke={c.outline} strokeWidth="1.4" />
      <path d="M28 64 Q28 60 34 58 L42 57 L40 80 L26 80 Z" fill={palette.vestHi} opacity="0.55" />
      <rect x="46" y="58" width="8" height="40" fill={palette.vestShade} opacity="0.7" />
      {/* Buttons */}
      <circle cx="50" cy="68" r="1.4" fill={c.gold} stroke={c.outline} strokeWidth="0.5" />
      <circle cx="50" cy="78" r="1.4" fill={c.gold} stroke={c.outline} strokeWidth="0.5" />
      <circle cx="50" cy="88" r="1.4" fill={c.gold} stroke={c.outline} strokeWidth="0.5" />
      {/* Stocky arms */}
      <path d="M26 64 Q18 72 18 90 Q18 96 24 96 Q30 94 30 86 L31 70 Z"
        fill={palette.vest} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="22" cy="97" rx="5" ry="4" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <path d="M74 64 Q82 72 82 90 Q82 96 76 96 Q70 94 70 86 L69 70 Z"
        fill={palette.vest} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="78" cy="97" rx="5" ry="4" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <FaceBase>
        <ChibiEyes />
        {/* Big bushy mustache */}
        <path d="M36 46 Q42 50 50 48 Q58 50 64 46 Q60 54 50 53 Q40 54 36 46 Z"
          fill={palette.stache} stroke={c.outline} strokeWidth="1" />
      </FaceBase>
      {/* Beanie */}
      <path d="M28 28 Q28 8 50 8 Q72 8 72 28 L72 30 L28 30 Z"
        fill={palette.beanie} stroke={c.outline} strokeWidth="1.4" />
      <path d="M34 24 Q34 12 50 12 Q60 12 66 18 Q50 14 38 22 Z" fill={palette.beanieHi} opacity="0.7" />
      <rect x="28" y="28" width="44" height="4" fill={palette.beanieBand} stroke={c.outline} strokeWidth="0.8" />
      <circle cx="50" cy="6" r="3.5" fill={palette.beanieHi} stroke={c.outline} strokeWidth="1" />
    </g>
  );
}

// ─── FISHER ──────────────────────────────────────────────────────────
function Fisher({ frame }: { frame: 0 | 1 }) {
  const c = COMMON;
  const palette = {
    pants: '#1f3a5a', pantsShade: '#0e1f3a',
    coat: '#f1c14a', coatShade: '#a8821e', coatHi: '#ffe085',
    sweater: '#3a4d9c', sweaterHi: '#6a85d8',
    hat: '#f1c14a', hatBand: '#7a3324',
    rod: '#5a3318',
  };
  return (
    <g>
      <Shadow />
      <Legs frame={frame} color={palette.pants} shade={palette.pantsShade} />
      {/* Sweater base */}
      <path d="M30 64 Q30 60 34 58 L46 56 Q50 55 54 56 L66 58 Q70 60 70 64 L70 96 L30 96 Z"
        fill={palette.sweater} stroke={c.outline} strokeWidth="1.4" />
      <path d="M32 60 L46 58 L44 80 L32 80 Z" fill={palette.sweaterHi} opacity="0.45" />
      {/* Open yellow rain coat */}
      <path d="M22 62 Q24 58 30 58 L34 62 L34 100 L22 100 Z"
        fill={palette.coat} stroke={c.outline} strokeWidth="1.4" />
      <path d="M78 62 Q76 58 70 58 L66 62 L66 100 L78 100 Z"
        fill={palette.coat} stroke={c.outline} strokeWidth="1.4" />
      <path d="M22 62 Q24 58 30 58 L32 64 L24 70 Z" fill={palette.coatHi} opacity="0.6" />
      {/* Arms in coat sleeves */}
      <path d="M22 64 Q14 72 14 88 Q14 94 20 94 Q26 92 26 86 L27 70 Z"
        fill={palette.coat} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="18" cy="95" rx="4.5" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <path d="M78 64 Q86 72 86 88 Q86 94 80 94 Q74 92 74 86 L73 70 Z"
        fill={palette.coat} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="82" cy="95" rx="4.5" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      {/* Fishing rod over shoulder */}
      <line x1="82" y1="95" x2="96" y2="20" stroke={palette.rod} strokeWidth="2" strokeLinecap="round" />
      <line x1="96" y1="20" x2="92" y2="60" stroke={COMMON.white} strokeWidth="0.6" opacity="0.7" />
      <circle cx="92" cy="60" r="1.2" fill={c.gold} stroke={c.outline} strokeWidth="0.5" />
      <FaceBase>
        <ChibiEyes />
        <path d="M46 47 Q50 49 54 47" stroke={c.mouth} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </FaceBase>
      {/* Bucket hat */}
      <ellipse cx="50" cy="22" rx="26" ry="6" fill={palette.hat} stroke={c.outline} strokeWidth="1.4" />
      <path d="M30 22 Q30 8 50 8 Q70 8 70 22 Z" fill={palette.hat} stroke={c.outline} strokeWidth="1.4" />
      <rect x="30" y="20" width="40" height="3" fill={palette.hatBand} stroke={c.outline} strokeWidth="0.6" />
      <path d="M34 16 Q42 10 52 10 Q44 14 38 20 Z" fill={palette.coatHi} opacity="0.6" />
      {/* Hooks on band */}
      <circle cx="40" cy="21.5" r="0.9" fill={c.gold} />
      <circle cx="60" cy="21.5" r="0.9" fill={c.gold} />
    </g>
  );
}

// ─── CAMPER ──────────────────────────────────────────────────────────
function Camper({ frame }: { frame: 0 | 1 }) {
  const c = COMMON;
  const palette = {
    shorts: '#3a6a3a', shortsShade: '#1e3f1e',
    shirt: '#ef7a40', shirtShade: '#a8451a', shirtHi: '#ffa370',
    cap: '#2d6a4f', capHi: '#52a378',
    scarf: '#ffd54a', scarfShade: '#a8821e',
    hair: '#5a3318',
  };
  return (
    <g>
      <Shadow />
      <Legs frame={frame} color={palette.shorts} shade={palette.shortsShade} />
      {/* Knee socks */}
      <rect x="40" y="118" width="6" height="8" fill={COMMON.white} stroke={c.outline} strokeWidth="0.8" />
      <rect x="54" y="118" width="6" height="8" fill={COMMON.white} stroke={c.outline} strokeWidth="0.8" />
      {/* Shorts */}
      <path d="M30 92 L70 92 L72 112 L28 112 Z" fill={palette.shorts} stroke={c.outline} strokeWidth="1.4" />
      <line x1="50" y1="93" x2="50" y2="111" stroke={palette.shortsShade} strokeWidth="0.8" />
      {/* T-shirt */}
      <path d="M30 64 Q30 60 34 58 L46 56 Q50 55 54 56 L66 58 Q70 60 70 64 L72 96 L28 96 Z"
        fill={palette.shirt} stroke={c.outline} strokeWidth="1.4" />
      <path d="M32 60 L42 58 L40 80 L30 80 Z" fill={palette.shirtHi} opacity="0.5" />
      {/* Stripe */}
      <rect x="28" y="74" width="44" height="4" fill={palette.shirtShade} opacity="0.65" />
      {/* Arms */}
      <path d="M30 64 Q24 70 24 84 Q24 90 28 90 Q32 88 32 82 L33 70 Z"
        fill={palette.shirt} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="26" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <path d="M70 64 Q76 70 76 84 Q76 90 72 90 Q68 88 68 82 L67 70 Z"
        fill={palette.shirt} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="74" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      {/* Bandana scarf around neck */}
      <path d="M38 58 Q50 64 62 58 L64 64 Q50 70 36 64 Z"
        fill={palette.scarf} stroke={c.outline} strokeWidth="1.2" />
      <path d="M58 62 L70 70 L66 64 Z" fill={palette.scarfShade} stroke={c.outline} strokeWidth="1" />
      <FaceBase>
        {/* Side hair tufts */}
        <path d="M30 38 Q28 28 34 22 L36 32 Z" fill={palette.hair} stroke={c.outline} strokeWidth="1" />
        <path d="M70 38 Q72 28 66 22 L64 32 Z" fill={palette.hair} stroke={c.outline} strokeWidth="1" />
        <ChibiEyes />
        <path d="M46 47 Q50 50 54 47" stroke={c.mouth} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </FaceBase>
      {/* Bangs under cap */}
      <path d="M32 24 Q40 18 50 18 Q60 18 68 24 Q60 30 50 28 Q40 30 32 24 Z"
        fill={palette.hair} stroke={c.outline} strokeWidth="1.2" />
      {/* Cap */}
      <path d="M22 22 Q24 18 50 16 Q76 18 78 22 L78 26 L22 26 Z"
        fill={palette.cap} stroke={c.outline} strokeWidth="1.4" />
      <path d="M30 20 Q30 6 50 6 Q70 6 70 20 Z" fill={palette.cap} stroke={c.outline} strokeWidth="1.4" />
      <path d="M34 18 Q34 8 50 8 Q58 8 62 11 Q46 10 38 18 Z" fill={palette.capHi} opacity="0.7" />
      <circle cx="50" cy="14" r="2.8" fill={c.gold} stroke={c.outline} strokeWidth="1" />
    </g>
  );
}

// ─── BUG CATCHER ────────────────────────────────────────────────────
function Bug({ frame }: { frame: 0 | 1 }) {
  const c = COMMON;
  const palette = {
    shorts: '#7d4f00', shortsShade: '#4f3000',
    shirt: '#386641', shirtShade: '#1e3f1e', shirtHi: '#6aa86a',
    hat: '#f1c14a', hatHi: '#ffe085',
    net: '#c8c8c8', netHandle: '#5a3318', netMesh: '#ffffff',
    hair: '#3a2510',
  };
  return (
    <g>
      <Shadow />
      <Legs frame={frame} color={palette.shorts} shade={palette.shortsShade} />
      {/* Shorts */}
      <path d="M30 92 L70 92 L72 110 L28 110 Z" fill={palette.shorts} stroke={c.outline} strokeWidth="1.4" />
      <line x1="50" y1="93" x2="50" y2="109" stroke={palette.shortsShade} strokeWidth="0.8" />
      {/* Polo shirt */}
      <path d="M30 64 Q30 60 34 58 L46 56 Q50 55 54 56 L66 58 Q70 60 70 64 L72 96 L28 96 Z"
        fill={palette.shirt} stroke={c.outline} strokeWidth="1.4" />
      <path d="M32 60 L42 58 L40 80 L30 80 Z" fill={palette.shirtHi} opacity="0.45" />
      {/* Collar V */}
      <path d="M44 56 L50 64 L56 56 L54 56 L50 60 L46 56 Z" fill={palette.shirtShade} stroke={c.outline} strokeWidth="0.8" />
      {/* Arms */}
      <path d="M30 64 Q24 70 24 84 Q24 90 28 90 Q32 88 32 82 L33 70 Z"
        fill={palette.shirt} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="26" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <path d="M70 64 Q76 70 76 84 Q76 90 72 90 Q68 88 68 82 L67 70 Z"
        fill={palette.shirt} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="74" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      {/* Bug net behind */}
      <line x1="74" y1="92" x2="92" y2="20" stroke={palette.netHandle} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="92" cy="18" r="9" fill={palette.netMesh} fillOpacity="0.45" stroke={palette.net} strokeWidth="1.4" />
      <line x1="84" y1="14" x2="100" y2="22" stroke={palette.net} strokeWidth="0.5" opacity="0.7" />
      <line x1="86" y1="10" x2="98" y2="26" stroke={palette.net} strokeWidth="0.5" opacity="0.7" />
      <FaceBase>
        <ChibiEyes />
        <path d="M46 48 Q50 51 54 48" stroke={c.mouth} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </FaceBase>
      {/* Hair */}
      <path d="M30 28 Q30 14 50 12 Q70 14 70 28 L68 36 Q66 24 50 22 Q34 24 32 36 Z"
        fill={palette.hair} stroke={c.outline} strokeWidth="1.3" />
      {/* Straw hat */}
      <ellipse cx="50" cy="22" rx="28" ry="5" fill={palette.hat} stroke={c.outline} strokeWidth="1.4" />
      <path d="M32 22 Q32 8 50 8 Q68 8 68 22 Z" fill={palette.hat} stroke={c.outline} strokeWidth="1.4" />
      <path d="M36 18 Q44 10 54 10 Q46 14 40 20 Z" fill={palette.hatHi} opacity="0.7" />
      {/* Straw lines */}
      <line x1="34" y1="18" x2="40" y2="22" stroke={palette.hatHi} strokeWidth="0.4" opacity="0.7" />
      <line x1="50" y1="10" x2="50" y2="22" stroke={palette.hatHi} strokeWidth="0.4" opacity="0.7" />
      <line x1="66" y1="18" x2="60" y2="22" stroke={palette.hatHi} strokeWidth="0.4" opacity="0.7" />
    </g>
  );
}

// ─── LASS ────────────────────────────────────────────────────────────
function Lass({ frame }: { frame: 0 | 1 }) {
  const c = COMMON;
  const palette = {
    skirt: '#7c1d5a', skirtShade: '#4a0e36', skirtHi: '#c45a9c',
    blouse: '#fbcfe8', blouseShade: '#c08aa6', blouseHi: '#ffe0f0',
    sock: '#ffffff',
    hair: '#f1c14a', hairHi: '#ffe085', hairDk: '#a8821e',
    ribbon: '#ef4036',
  };
  return (
    <g>
      <Shadow />
      <Legs frame={frame} color={c.skin} shade={COMMON.skinShade} />
      {/* Knee socks */}
      <rect x="40" y="115" width="6" height="11" fill={palette.sock} stroke={c.outline} strokeWidth="0.8" />
      <rect x="54" y="115" width="6" height="11" fill={palette.sock} stroke={c.outline} strokeWidth="0.8" />
      {/* Skirt — fuller */}
      <path d="M28 90 L72 90 L78 116 L22 116 Z" fill={palette.skirt} stroke={c.outline} strokeWidth="1.4" />
      <path d="M28 90 L72 90 L74 98 L26 98 Z" fill={palette.skirtHi} opacity="0.55" />
      <path d="M22 116 L78 116 L74 119 L26 119 Z" fill={palette.skirtShade} />
      <line x1="38" y1="91" x2="34" y2="114" stroke={palette.skirtShade} strokeWidth="0.7" opacity="0.6" />
      <line x1="50" y1="91" x2="50" y2="114" stroke={palette.skirtShade} strokeWidth="0.7" opacity="0.6" />
      <line x1="62" y1="91" x2="66" y2="114" stroke={palette.skirtShade} strokeWidth="0.7" opacity="0.6" />
      {/* Blouse */}
      <path d="M28 64 Q28 60 32 58 L46 56 Q50 55 54 56 L68 58 Q72 60 72 64 L73 92 L27 92 Z"
        fill={palette.blouse} stroke={c.outline} strokeWidth="1.4" />
      <path d="M30 64 Q30 60 34 58 L42 57 L40 75 L29 75 Z" fill={palette.blouseHi} opacity="0.6" />
      {/* Ribbon at collar */}
      <path d="M44 58 L50 62 L56 58 L54 64 L46 64 Z" fill={palette.ribbon} stroke={c.outline} strokeWidth="1" />
      <circle cx="50" cy="62" r="1.8" fill={palette.ribbon} stroke={c.outline} strokeWidth="0.8" />
      {/* Arms */}
      <path d="M28 64 Q22 70 22 84 Q22 90 26 90 Q30 88 30 82 L31 70 Z"
        fill={palette.blouse} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="24" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      <path d="M72 64 Q78 70 78 84 Q78 90 74 90 Q70 88 70 82 L69 70 Z"
        fill={palette.blouse} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="76" cy="91" rx="4" ry="3.5" fill={c.skin} stroke={c.outline} strokeWidth="1.2" />
      {/* Pigtails */}
      <path d="M22 32 Q12 44 14 64 Q18 74 26 70 Q24 50 28 38 Z"
        fill={palette.hair} stroke={c.outline} strokeWidth="1.3" />
      <path d="M78 32 Q88 44 86 64 Q82 74 74 70 Q76 50 72 38 Z"
        fill={palette.hair} stroke={c.outline} strokeWidth="1.3" />
      <ellipse cx="22" cy="34" rx="3.5" ry="2.2" fill={palette.ribbon} stroke={c.outline} strokeWidth="1" />
      <ellipse cx="78" cy="34" rx="3.5" ry="2.2" fill={palette.ribbon} stroke={c.outline} strokeWidth="1" />
      <FaceBase>
        <ChibiEyes />
        <path d="M46 47 Q50 50 54 47" stroke={c.mouth} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </FaceBase>
      {/* Hair back & bangs */}
      <path d="M28 30 Q28 12 50 10 Q72 12 72 30 L70 44 Q68 30 50 28 Q32 30 30 44 Z"
        fill={palette.hair} stroke={c.outline} strokeWidth="1.3" />
      <path d="M32 24 Q40 14 50 14 Q60 14 68 24 Q66 30 58 26 Q55 30 50 28 Q45 30 42 26 Q34 30 32 24 Z"
        fill={palette.hair} stroke={c.outline} strokeWidth="1.2" />
      <path d="M36 20 Q42 16 48 18 L46 24 Q42 22 38 24 Z" fill={palette.hairHi} opacity="0.7" />
      <path d="M62 36 Q70 38 72 50" stroke={palette.hairDk} strokeWidth="0.8" fill="none" opacity="0.6" />
    </g>
  );
}

const KIND_RENDERERS: Record<TrainerKind, (props: { frame: 0 | 1 }) => React.JSX.Element> = {
  hiker: Hiker,
  fisher: Fisher,
  camper: Camper,
  bug: Bug,
  lass: Lass,
};

// ─── Canvas portrait rasterization ──────────────────────────────────
// The overworld canvas can't render React/SVG directly each frame, so we
// rasterize each trainer-class portrait once into an HTMLImageElement and
// cache it. Drawn in `GameCanvas.drawTrainerNPC`. Frame 0 is used (no
// per-frame mounts), facing right by default so it can be flipped via
// canvas transforms if needed.

const PORTRAIT_CACHE: Partial<Record<TrainerKind, HTMLImageElement>> = {};
const PORTRAIT_PENDING: Partial<Record<TrainerKind, Promise<HTMLImageElement>>> = {};

function portraitSvgMarkup(kind: TrainerKind): string {
  const Renderer = KIND_RENDERERS[kind];
  const inner = renderToStaticMarkup(<Renderer frame={0} />);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="100" height="140">${inner}</svg>`;
}

export function getTrainerPortrait(kind: TrainerKind): HTMLImageElement | null {
  return PORTRAIT_CACHE[kind] ?? null;
}

export function loadTrainerPortrait(kind: TrainerKind): Promise<HTMLImageElement> {
  const cached = PORTRAIT_CACHE[kind];
  if (cached) return Promise.resolve(cached);
  const pending = PORTRAIT_PENDING[kind];
  if (pending) return pending;
  const svg = portraitSvgMarkup(kind);
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => { PORTRAIT_CACHE[kind] = img; resolve(img); };
    img.onerror = e => reject(e);
    img.src = url;
  });
  PORTRAIT_PENDING[kind] = p;
  return p;
}

export function preloadAllTrainerPortraits(): void {
  (Object.keys(KIND_RENDERERS) as TrainerKind[]).forEach(k => { void loadTrainerPortrait(k); });
}

export function TrainerSprite({ kind, size = 160, facing = 'left', animate = true }: Props) {
  const [frame, setFrame] = useState<0 | 1>(0);

  useEffect(() => {
    if (!animate) { setFrame(0); return; }
    const id = window.setInterval(() => setFrame(f => (f === 0 ? 1 : 0)), 520);
    return () => window.clearInterval(id);
  }, [animate]);

  const Renderer = KIND_RENDERERS[kind];
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
      <Renderer frame={frame} />
    </svg>
  );
}
