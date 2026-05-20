// Tiny PokéAPI client with localStorage caching, per their fair-use policy
// (https://pokeapi.co/docs/v2 — "Locally cache resources whenever you request them").
//
// We fetch each species/pokemon at most once per browser, store the trimmed
// payload under a versioned key, and serve subsequent reads from cache.

export interface PokeInfo {
  id: number;
  name: string;
  genus: string;
  flavor: string;
  heightM: number;
  weightKg: number;
  habitat: string | null;
  color: string | null;
  stats: { hp: number; attack: number; defense: number; speed: number };
  fetchedAt: number;
}

const CACHE_KEY = 'pokapiya.pokeapi.v1';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type Cache = Record<number, PokeInfo>;
const memory: Cache = loadCache();
const inflight = new Map<number, Promise<PokeInfo | null>>();

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Cache;
    const now = Date.now();
    for (const k of Object.keys(parsed)) {
      const v = parsed[Number(k)];
      if (!v || now - v.fetchedAt > TTL_MS) delete parsed[Number(k)];
    }
    return parsed;
  } catch {
    return {};
  }
}

function persist() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(memory)); } catch {}
}

function pickEnglish<T extends { language: { name: string } }>(arr: T[]): T | undefined {
  return arr.find(e => e.language.name === 'en');
}

function cleanFlavor(text: string): string {
  // PokéAPI flavor strings have stray form-feed / newline / soft-hyphen chars.
  return text.replace(/[\f\n\r\u00ad]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Synchronous getter — returns cached info if present, otherwise undefined.
export function getCachedPokeInfo(id: number): PokeInfo | undefined {
  return memory[id];
}

// Async getter — fetches + caches if not present. Returns null on error.
export async function fetchPokeInfo(id: number): Promise<PokeInfo | null> {
  if (memory[id]) return memory[id];
  if (inflight.has(id)) return inflight.get(id)!;

  const p = (async (): Promise<PokeInfo | null> => {
    try {
      const [speciesRes, monRes] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
      ]);
      if (!speciesRes.ok || !monRes.ok) return null;
      const species = await speciesRes.json();
      const mon = await monRes.json();

      const genera = (species.genera || []) as Array<{ language: { name: string }; genus: string }>;
      const flavors = (species.flavor_text_entries || []) as Array<{ language: { name: string }; flavor_text: string }>;
      const genus = pickEnglish(genera)?.genus ?? 'Pokémon';
      const flavorEntry = pickEnglish(flavors);
      const flavor = flavorEntry ? cleanFlavor(flavorEntry.flavor_text) : '';
      const heightM = (mon.height ?? 0) / 10;   // decimeters → meters
      const weightKg = (mon.weight ?? 0) / 10;  // hectograms → kilograms
      const statBy = (n: string) =>
        (mon.stats || []).find((s: { stat: { name: string }, base_stat: number }) => s.stat.name === n)?.base_stat ?? 0;

      const info: PokeInfo = {
        id,
        name: species.name,
        genus,
        flavor,
        heightM,
        weightKg,
        habitat: species.habitat?.name ?? null,
        color: species.color?.name ?? null,
        stats: {
          hp: statBy('hp'),
          attack: statBy('attack'),
          defense: statBy('defense'),
          speed: statBy('speed'),
        },
        fetchedAt: Date.now(),
      };
      memory[id] = info;
      persist();
      return info;
    } catch {
      return null;
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, p);
  return p;
}
