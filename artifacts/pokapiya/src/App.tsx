import { useState, useRef, useEffect, useCallback } from 'react';
import GameCanvas, { type GameCanvasController } from './components/GameCanvas';
import BattleScreen from './components/BattleScreen';
import TeamModal from './components/TeamModal';
import PokeCenterModal from './components/PokeCenterModal';
import PokedexModal from './components/PokedexModal';
import PCModal from './components/PCModal';
import StarterModal from './components/StarterModal';
import OakIntro from './components/OakIntro';
import HUD from './components/HUD';
import { load, save, defeatTrainer, earnCoins, type TrainerState } from './game/save';
import QuestModal from './components/QuestModal';
import MovesModal from './components/MovesModal';
import CraftModal from './components/CraftModal';
import EvolutionModal from './components/EvolutionModal';
import { pendingEvolutions, evolveMember, declineEvolution, type PendingEvolution } from './game/evolution';
import type { Pokemon } from './data/pokedex';
import type { NPCTrainer } from './game/world';

type Screen = 'world' | 'battle' | 'team' | 'pokecenter' | 'pokedex' | 'pc' | 'starter' | 'oak' | 'quests' | 'moves' | 'craft';

const TRAINER_COIN_REWARD = 12;

const REWARD_LABELS: Record<string, string> = {
  cut: '✂️ Cut HM',
  rod: '🎣 Fishing Rod',
  pokeballs: '5× Poké Balls',
  berries: '3× Berries',
};

export default function App() {
  const stateRef = useRef<TrainerState>(load());
  const [, forceUpdate] = useState(0);
  const [screen, setScreen] = useState<Screen>(stateRef.current.starterChosen ? 'world' : 'oak');
  const [wildPokemon, setWildPokemon] = useState<Pokemon | null>(null);
  const [currentTrainer, setCurrentTrainer] = useState<NPCTrainer | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameRef = useRef<GameCanvasController | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const handleEncounter = useCallback((wild: Pokemon) => {
    setCurrentTrainer(null);
    setWildPokemon(wild);
    setScreen('battle');
  }, []);

  const handleTrainerEncounter = useCallback((wild: Pokemon, trainer: NPCTrainer) => {
    setCurrentTrainer(trainer);
    setWildPokemon(wild);
    setScreen('battle');
  }, []);

  const handlePokecenter = useCallback(() => {
    if (screen === 'world') setScreen('pokecenter');
  }, [screen]);

  const handleBattleExit = useCallback((caught: boolean, defeatedTrainer: boolean) => {
    if (defeatedTrainer && currentTrainer) {
      defeatTrainer(stateRef.current, currentTrainer.id);
      const reward = currentTrainer.reward;
      const inv = stateRef.current.inventory as Record<string, number>;
      if (reward === 'cut') inv.cut = 1;
      if (reward === 'rod') inv.rod = 1;
      if (reward === 'pokeballs') inv.pokeball = (inv.pokeball || 0) + 5;
      if (reward === 'berries') inv.berry = (inv.berry || 0) + 3;
      // Every trainer also drops Pokapiya coins — currency for the Workshop.
      earnCoins(stateRef.current, TRAINER_COIN_REWARD);
      save(stateRef.current);
      showToast(`🏆 You beat ${currentTrainer.name}! Got ${REWARD_LABELS[reward]} + 🪙${TRAINER_COIN_REWARD}!`);
    } else if (caught && wildPokemon) {
      showToast(`✨ ${wildPokemon.name} joined your team!`);
    }
    setCurrentTrainer(null);
    setScreen('world');
    forceUpdate(n => n + 1);
  }, [wildPokemon, currentTrainer, showToast]);

  const [evoPending, setEvoPending] = useState<PendingEvolution | null>(null);

  const handleStateChange = useCallback((newState: TrainerState) => {
    stateRef.current = newState;
    save(newState);
    forceUpdate(n => n + 1);
    // If any team member is ready to evolve, surface the first one as a modal.
    // The player explicitly confirms or declines — no automatic evolution and
    // no new moves are learned.
    const pend = pendingEvolutions(newState);
    if (pend.length > 0) setEvoPending(pend[0]);
  }, []);

  const handleEvolveConfirm = useCallback(() => {
    if (!evoPending) return;
    const evt = evolveMember(stateRef.current, evoPending.memberIndex);
    save(stateRef.current);
    setEvoPending(null);
    forceUpdate(n => n + 1);
    if (evt) showToast(`✨ ${evt.beforeName} evolved into ${evt.afterName}!`);
    // Chain into the next pending evolution, if any.
    setTimeout(() => {
      const next = pendingEvolutions(stateRef.current);
      if (next.length > 0) setEvoPending(next[0]);
    }, 200);
  }, [evoPending, showToast]);

  const handleEvolveCancel = useCallback(() => {
    if (!evoPending) return;
    declineEvolution(stateRef.current, evoPending.memberIndex);
    save(stateRef.current);
    setEvoPending(null);
    forceUpdate(n => n + 1);
    showToast(`${evoPending.beforeName} stayed the same.`);
  }, [evoPending, showToast]);

  const handlePokecenterClose = useCallback(() => {
    // Nudge the player off the door tile so the center doesn't immediately re-open.
    gameRef.current?.exitPokecenter();
    setScreen('world');
    showToast('All healed up! Got 3 Poké Balls + 1 Berry! 🌟');
    forceUpdate(n => n + 1);
  }, [showToast]);

  // Global keys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (screen === 'world') {
        if (k === 't') setScreen('team');
        if (k === 'p') setScreen('pokedex');
        if (k === 'q') setScreen('quests');
        if (k === 'm') setScreen('moves');
        if (k === 'c') setScreen('craft');
      } else if (k === 'escape') {
        if (screen === 'team' || screen === 'pokedex' || screen === 'pc' ||
            screen === 'quests' || screen === 'moves' || screen === 'craft') setScreen('world');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen]);

  const trainerState = stateRef.current;
  const zoneName = gameRef.current?.getZoneName() ?? 'Town';

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#1a1005', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <GameCanvas
        active={screen === 'world'}
        onEncounter={handleEncounter}
        onTrainerEncounter={handleTrainerEncounter}
        onPokecenter={handlePokecenter}
        onToast={showToast}
        stateRef={stateRef}
        controllerRef={gameRef}
      />

      {screen === 'world' && (
        <HUD
          state={trainerState}
          zoneName={zoneName}
          onTeam={() => setScreen('team')}
          onPokedex={() => setScreen('pokedex')}
          onQuests={() => setScreen('quests')}
          onMoves={() => setScreen('moves')}
          onCraft={() => setScreen('craft')}
          onSave={() => {
            save(trainerState);
            showToast('💾 Game saved!');
          }}
          toast={toast}
        />
      )}

      {screen === 'oak' && (
        <OakIntro onDone={() => setScreen('starter')} />
      )}

      {screen === 'starter' && (
        <StarterModal
          state={trainerState}
          onPick={(s) => {
            stateRef.current = s;
            setScreen('world');
            showToast('Welcome to your adventure! 🌟');
            forceUpdate(n => n + 1);
          }}
        />
      )}

      {screen === 'battle' && wildPokemon && (
        <BattleScreen
          wild={wildPokemon}
          state={trainerState}
          onStateChange={handleStateChange}
          onExit={handleBattleExit}
          trainerName={currentTrainer?.name}
          trainerReward={currentTrainer?.reward}
        />
      )}

      {screen === 'team' && (
        <TeamModal state={trainerState} onClose={() => setScreen('world')} />
      )}

      {screen === 'pokedex' && (
        <PokedexModal state={trainerState} onClose={() => setScreen('world')} />
      )}

      {screen === 'quests' && (
        <QuestModal state={trainerState} onClose={() => setScreen('world')} />
      )}

      {screen === 'moves' && (
        <MovesModal state={trainerState} onClose={() => setScreen('world')} />
      )}

      {screen === 'craft' && (
        <CraftModal state={trainerState} onChange={handleStateChange} onClose={() => setScreen('world')} />
      )}

      {screen === 'pc' && (
        <PCModal state={trainerState} onChange={handleStateChange} onClose={() => setScreen('pokecenter')} />
      )}

      {screen === 'pokecenter' && (
        <PokeCenterModal
          state={trainerState}
          onChange={handleStateChange}
          onClose={handlePokecenterClose}
          onPC={() => setScreen('pc')}
        />
      )}

      {evoPending && screen === 'world' && (
        <EvolutionModal
          pending={evoPending}
          onEvolve={handleEvolveConfirm}
          onCancel={handleEvolveCancel}
        />
      )}
    </div>
  );
}
