// Cloud-save sync for Pokapiya. The game keeps using localStorage as the
// fast path (so play feels instant even offline), and mirrors writes up to
// the API server (which persists to Postgres) on a short debounce so a
// closed tab / cleared browser / different device still has Addie's catches.

import type { TrainerState } from './save';

const PLAYER_ID = 'addie';
const API_BASE = '/api';

export type CloudStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'offline';

type Listener = (s: CloudStatus) => void;
let status: CloudStatus = 'idle';
const listeners = new Set<Listener>();

function setStatus(next: CloudStatus) {
  status = next;
  for (const l of listeners) l(status);
}

export function getCloudStatus(): CloudStatus { return status; }
export function subscribeCloudStatus(l: Listener): () => void {
  listeners.add(l);
  l(status);
  return () => listeners.delete(l);
}

// ── Load ──────────────────────────────────────────────────────────────────
// Returns the cloud copy of the trainer state if one exists; otherwise null.
export async function loadCloudSave(): Promise<TrainerState | null> {
  try {
    setStatus('syncing');
    const res = await fetch(`${API_BASE}/save/${PLAYER_ID}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) { setStatus('idle'); return null; }
    if (!res.ok) { setStatus('error'); return null; }
    const body = await res.json();
    setStatus('saved');
    return (body?.state ?? null) as TrainerState | null;
  } catch {
    setStatus('offline');
    return null;
  }
}

// ── Save (debounced) ──────────────────────────────────────────────────────
let pending: TrainerState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
const DEBOUNCE_MS = 1200;

async function flush() {
  if (inFlight) return;
  const snapshot = pending;
  if (!snapshot) return;
  pending = null;
  inFlight = true;
  setStatus('syncing');
  try {
    const res = await fetch(`${API_BASE}/save/${PLAYER_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: snapshot }),
    });
    setStatus(res.ok ? 'saved' : 'error');
  } catch {
    setStatus('offline');
  } finally {
    inFlight = false;
    // If more saves arrived while we were flushing, drain them.
    if (pending) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    }
  }
}

export function queueCloudSave(state: TrainerState) {
  // Take a structured snapshot so later in-place mutations don't leak in.
  try { pending = JSON.parse(JSON.stringify(state)); } catch { pending = state; }
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
}

// Force-flush on page unload so we don't lose the last catch.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (pending) {
      try {
        const blob = new Blob([JSON.stringify({ state: pending })], { type: 'application/json' });
        navigator.sendBeacon?.(`${API_BASE}/save/${PLAYER_ID}`, blob);
        pending = null;
      } catch {}
    }
  });
}
