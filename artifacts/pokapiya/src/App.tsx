import { useState, useRef, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import BattleScreen from './components/BattleScreen';
import TeamModal from './components/TeamModal';
import PokeCenterModal from './components/PokeCenterModal';
import HUD from './components/HUD';
import { load, save, type TrainerState } from './game/save';
import type { Pokemon } from './data/pokedex';

type Screen = 'world' | 'battle' | 'team' | 'pokecenter';

export default function App() {
  const stateRef = useRef<TrainerState>(load());
  const [, forceUpdate] = useState(0);
  const [screen, setScreen] = useState<Screen>('world');
  const [wildPokemon, setWildPokemon] = useState<Pokemon | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const handleEncounter = useCallback((wild: Pokemon) => {
    setWildPokemon(wild);
    setScreen('battle');
  }, []);

  const handlePokecenter = useCallback(() => {
    if (screen === 'world') setScreen('pokecenter');
  }, [screen]);

  const handleBattleExit = useCallback((caught: boolean) => {
    if (caught) showToast(`✨ ${wildPokemon ? wildPokemon.name : 'Pokémon'} joined your team!`);
    setScreen('world');
    forceUpdate(n => n + 1);
  }, [wildPokemon, showToast]);

  const handleTeam = useCallback(() => {
    setScreen(s => s === 'team' ? 'world' : 'team');
  }, []);

  const handlePokecenterClose = useCallback(() => {
    setScreen('world');
    showToast('All healed up! Got 3 Poké Balls + 1 Berry! 🌟');
    forceUpdate(n => n + 1);
  }, [showToast]);

  const handleStateChange = useCallback((newState: TrainerState) => {
    stateRef.current = newState;
    save(newState);
    forceUpdate(n => n + 1);
  }, []);

  // T key opens team
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'T' || e.key === 't') {
        if (screen === 'world') handleTeam();
        else if (screen === 'team') setScreen('world');
      }
      if (e.key === 'Escape' && screen === 'team') setScreen('world');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, handleTeam]);

  const trainerState = stateRef.current;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#1a1005', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* The canvas game always renders (but freezes input when not active) */}
      <GameCanvas
        active={screen === 'world'}
        onEncounter={handleEncounter}
        onPokecenter={handlePokecenter}
        onToast={showToast}
        stateRef={stateRef}
      />

      {/* HUD always visible when in world */}
      {screen === 'world' && (
        <HUD state={trainerState} onTeam={handleTeam} toast={toast} />
      )}

      {/* Battle overlay */}
      {screen === 'battle' && wildPokemon && (
        <BattleScreen
          wild={wildPokemon}
          state={trainerState}
          onStateChange={handleStateChange}
          onExit={handleBattleExit}
        />
      )}

      {/* Team overlay */}
      {screen === 'team' && (
        <TeamModal state={trainerState} onClose={() => setScreen('world')} />
      )}

      {/* Pokémon Center overlay */}
      {screen === 'pokecenter' && (
        <PokeCenterModal
          state={trainerState}
          onChange={handleStateChange}
          onClose={handlePokecenterClose}
        />
      )}
    </div>
  );
}
