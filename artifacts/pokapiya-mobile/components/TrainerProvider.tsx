import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  TrainerState,
  emptyState,
  loadState,
  saveState,
  resetState,
} from '../game/save';

interface Ctx {
  state: TrainerState;
  ready: boolean;
  update: (mutator: (s: TrainerState) => void | TrainerState) => Promise<void>;
  replace: (next: TrainerState) => Promise<void>;
  reset: () => Promise<void>;
}

const TrainerCtx = createContext<Ctx | null>(null);

export function TrainerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TrainerState>(() => emptyState());
  const [ready, setReady] = useState(false);
  // Serialized write queue: every persistence operation chains on the previous one
  const writeChain = useRef<Promise<void>>(Promise.resolve());
  // Latest committed state (used by mutators to build the next snapshot deterministically)
  const latest = useRef<TrainerState>(state);

  useEffect(() => {
    (async () => {
      const loaded = await loadState();
      latest.current = loaded;
      setState(loaded);
      setReady(true);
    })();
  }, []);

  const enqueue = useCallback((produce: (current: TrainerState) => TrainerState): Promise<void> => {
    const job = writeChain.current.then(async () => {
      const next = produce(latest.current);
      latest.current = next;
      setState(next);
      await saveState(next);
    });
    // Swallow errors so one failure doesn't poison the chain
    writeChain.current = job.catch(() => {});
    return job;
  }, []);

  const replace = useCallback(
    (next: TrainerState) => enqueue(() => next),
    [enqueue],
  );

  const update = useCallback(
    (mutator: (s: TrainerState) => void | TrainerState) =>
      enqueue((current) => {
        const draft: TrainerState = JSON.parse(JSON.stringify(current));
        const maybe = mutator(draft);
        return (maybe ?? draft) as TrainerState;
      }),
    [enqueue],
  );

  const reset = useCallback(async () => {
    await enqueue(() => emptyState());
    // Also clear the persisted key
    await resetState();
  }, [enqueue]);

  return (
    <TrainerCtx.Provider value={{ state, ready, update, replace, reset }}>
      {children}
    </TrainerCtx.Provider>
  );
}

export function useTrainer(): Ctx {
  const ctx = useContext(TrainerCtx);
  if (!ctx) throw new Error('useTrainer must be used inside TrainerProvider');
  return ctx;
}
