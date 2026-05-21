export type AvatarStyle =
  | 'pixel-art'
  | 'adventurer'
  | 'personas'
  | 'lorelei'
  | 'micah';

export const AVATAR_STYLES: AvatarStyle[] = [
  'pixel-art', 'adventurer', 'personas', 'lorelei', 'micah',
];

export const AVATAR_STYLE_LABEL: Record<AvatarStyle, string> = {
  'pixel-art': 'Pixel Art',
  'adventurer': 'Adventurer',
  'personas': 'Personas',
  'lorelei': 'Lorelei',
  'micah': 'Micah',
};

export interface AvatarOpts {
  style: AvatarStyle;
  seed: string;
  size?: number;
  flip?: boolean;
  background?: string;
}

export function avatarUrl({ style, seed, size, flip, background }: AvatarOpts): string {
  const params = new URLSearchParams();
  params.set('seed', seed);
  if (size) params.set('size', String(size));
  if (flip) params.set('flip', 'true');
  if (background) params.set('backgroundColor', background.replace('#', ''));
  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

const SUGGESTED_SEEDS = ['Addie', 'Sunny', 'Berry', 'Pixel', 'Hero', 'Star', 'Rainbow', 'Pumpkin'];
export const ROLL_SEEDS = SUGGESTED_SEEDS;

export function rollSeed(): string {
  const adj = ['Sparkly', 'Brave', 'Sunny', 'Cozy', 'Mighty', 'Wild', 'Lucky', 'Cheery'];
  const noun = ['Bear', 'Fox', 'Star', 'Berry', 'Comet', 'Dragon', 'Petal', 'Wave'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const k = Math.floor(Math.random() * 1000);
  return `${a}${n}${k}`;
}

export const DEFAULT_AVATAR = { style: 'pixel-art' as AvatarStyle, seed: 'Addie' };

// Tiny inline SVG fallback used when DiceBear is blocked/offline so the UI
// never shows a broken-image icon. Renders a friendly initial in a circle.
export function fallbackAvatarDataUri(seed: string, bg = '#ffd54a', fg = '#1a0d00'): string {
  const ch = (seed || '?').trim().charAt(0).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${bg}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, sans-serif" font-size="34" font-weight="bold" fill="${fg}">${ch}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
