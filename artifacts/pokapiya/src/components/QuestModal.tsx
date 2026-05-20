import type { TrainerState } from '../game/save';

interface Props {
  state: TrainerState;
  onClose: () => void;
}

interface Quest {
  id: string;
  label: string;
  detail: string;
  done: (s: TrainerState) => boolean;
  progress?: (s: TrainerState) => string;
}

function teamHasType(state: TrainerState, type: string): boolean {
  return state.team.some(m => m.types.includes(type)) ||
         state.box.some(m => m.types.includes(type));
}

function uniqueSeen(state: TrainerState): number {
  return Object.keys(state.pokedex).length;
}

const QUESTS: Quest[] = [
  {
    id: 'starter',
    label: 'Pick your starter Pokémon',
    detail: 'Choose between Bulbasaur, Charmander, and Squirtle to begin your adventure.',
    done: s => s.starterChosen
  },
  {
    id: 'first-catch',
    label: 'Catch your first wild Pokémon',
    detail: 'Walk through tall grass to find a wild Pokémon, then answer a question to throw a Poké Ball.',
    done: s => s.stats.caught >= 1,
    progress: s => `${Math.min(s.stats.caught, 1)} / 1`
  },
  {
    id: 'pokecenter',
    label: 'Visit the Poké Center',
    detail: 'Step onto the glowing door tile. Nurse Joy gives free Poké Balls and a Berry!',
    done: s => s.visitedCenter >= 1
  },
  {
    id: 'three-correct',
    label: 'Answer 3 STEM questions correctly',
    detail: 'Each correct answer gives you a chance to catch a Pokémon.',
    done: s => s.stats.correct >= 3,
    progress: s => `${Math.min(s.stats.correct, 3)} / 3`
  },
  {
    id: 'team-of-3',
    label: 'Build a team of 3 Pokémon',
    detail: 'Fill your team roster halfway.',
    done: s => s.team.length >= 3,
    progress: s => `${s.team.length} / 3`
  },
  {
    id: 'pokedex-10',
    label: 'See 10 different Pokémon',
    detail: 'Encounter wild Pokémon to fill in your Pokédex — catching not required, just seeing them counts!',
    done: s => uniqueSeen(s) >= 10,
    progress: s => `${uniqueSeen(s)} / 10`
  },
  {
    id: 'first-evolution',
    label: 'Evolve your first Pokémon',
    detail: 'Each Pokémon evolves after you answer enough STEM questions while it\'s on your team. Caterpie and Weedle evolve fastest!',
    done: s => s.team.some(m => m.id === 2 || m.id === 5 || m.id === 8 || m.id === 11 || m.id === 14 || m.id === 17 || m.id === 20 || m.id === 24 || m.id === 26 || m.id === 28 || m.id === 30 || m.id === 33 || m.id === 36 || m.id === 38 || m.id === 40 || m.id === 42 || m.id === 44 || m.id === 47 || m.id === 49 || m.id === 51 || m.id === 53 || m.id === 55 || m.id === 57 || m.id === 59 || m.id === 61 || m.id === 64 || m.id === 67 || m.id === 70 || m.id === 73 || m.id === 75 || m.id === 78 || m.id === 80 || m.id === 82 || m.id === 85 || m.id === 87 || m.id === 89 || m.id === 91 || m.id === 93 || m.id === 97 || m.id === 99 || m.id === 101 || m.id === 103 || m.id === 105 || m.id === 110 || m.id === 112 || m.id === 117 || m.id === 119 || m.id === 121 || m.id === 130 || m.id === 134 || m.id === 139 || m.id === 141 || m.id === 148)
  },
  {
    id: 'team-of-6',
    label: 'Fill your team (6 Pokémon)',
    detail: 'A full party of six! Extras go into your PC box.',
    done: s => s.team.length >= 6,
    progress: s => `${s.team.length} / 6`
  },
  {
    id: 'catch-water',
    label: 'Catch a Water-type Pokémon',
    detail: 'Try Squirtle, Magikarp, Poliwag, or Tentacool.',
    done: s => teamHasType(s, 'water')
  },
  {
    id: 'catch-fire',
    label: 'Catch a Fire-type Pokémon',
    detail: 'Try Charmander, Vulpix, Growlithe, or Ponyta.',
    done: s => teamHasType(s, 'fire')
  },
  {
    id: 'catch-electric',
    label: 'Catch an Electric-type Pokémon',
    detail: 'Pikachu, Voltorb, and Magnemite are electric!',
    done: s => teamHasType(s, 'electric')
  },
  {
    id: 'catch-bug',
    label: 'Catch a Bug-type Pokémon',
    detail: 'Caterpie and Weedle are easy first bug catches.',
    done: s => teamHasType(s, 'bug')
  },
  {
    id: 'twenty-correct',
    label: 'Answer 20 STEM questions correctly',
    detail: 'Practice makes perfect — math, spelling, science, and more!',
    done: s => s.stats.correct >= 20,
    progress: s => `${Math.min(s.stats.correct, 20)} / 20`
  },
  {
    id: 'fifty-correct',
    label: 'Answer 50 STEM questions correctly',
    detail: 'You\'re a real scholar now!',
    done: s => s.stats.correct >= 50,
    progress: s => `${Math.min(s.stats.correct, 50)} / 50`
  },
  {
    id: 'pokedex-25',
    label: 'See 25 different Pokémon',
    detail: 'Keep exploring tall grass to encounter new species.',
    done: s => uniqueSeen(s) >= 25,
    progress: s => `${uniqueSeen(s)} / 25`
  },
  {
    id: 'pokedex-50',
    label: 'See 50 different Pokémon',
    detail: 'A serious Pokédex! Halfway to a complete Kanto registry.',
    done: s => uniqueSeen(s) >= 50,
    progress: s => `${uniqueSeen(s)} / 50`
  },
  {
    id: 'beat-trainer',
    label: 'Defeat your first NPC trainer',
    detail: 'Trainers in the world will challenge you to a battle. Win to earn items and Pokapiya coins!',
    done: s => Object.keys(s.defeatedTrainers || {}).length >= 1
  },
  {
    id: 'first-coins',
    label: 'Earn your first 🪙 Pokapiya coins',
    detail: 'Defeat a trainer to get 12 coins, then visit the Workshop (press C) to spend them.',
    done: s => (s.inventory.coin || 0) >= 1
  },
  {
    id: 'learn-cut',
    label: 'Learn the Cut move',
    detail: 'Catch a Bug-type (Caterpie, Weedle, Scyther) — they teach Cut! Open the Moves panel (M) to see what you know.',
    done: s => s.team.some(m => m.types.includes('bug'))
  },
  {
    id: 'learn-plant',
    label: 'Learn the Plant move',
    detail: 'Catch a Grass-type (Bulbasaur, Oddish, Bellsprout). Bulbasaur is the official Pokopia gardener!',
    done: s => s.team.some(m => m.types.includes('grass'))
  },
  {
    id: 'learn-smash',
    label: 'Learn Rock Smash',
    detail: 'Catch a Fighting-type or Rock-type (Machop, Geodude, Onix). They smash boulders!',
    done: s => s.team.some(m => m.types.includes('fighting') || m.types.includes('rock'))
  },
  {
    id: 'three-moves',
    label: 'Learn 3 field moves',
    detail: 'Build a diverse team to teach Addie more moves.',
    done: s => {
      const types = new Set<string>();
      for (const member of s.team) for (const t of member.types) types.add(t);
      const moves = ['bug', 'grass', 'fighting', 'rock', 'water', 'electric', 'flying']
        .filter(t => types.has(t));
      // bug→cut, grass→plant, (fighting OR rock)→smash, water→water, electric→spark, flying→fly
      const learned = new Set<string>();
      for (const t of moves) {
        if (t === 'bug') learned.add('cut');
        if (t === 'grass') learned.add('plant');
        if (t === 'fighting' || t === 'rock') learned.add('smash');
        if (t === 'water') learned.add('water');
        if (t === 'electric') learned.add('spark');
        if (t === 'flying') learned.add('fly');
      }
      return learned.size >= 3;
    }
  },
  {
    id: 'craft-something',
    label: 'Make something in the Workshop',
    detail: 'Press C, then trade berries for coins or craft a fence/path/berry tree.',
    done: s => (s.inventory.coin || 0) >= 5 || (s.inventory.berry || 0) >= 3 // proxy: workshop activity
  },
  {
    id: 'fifty-coins',
    label: 'Save up 50 🪙 coins',
    detail: 'Beat lots of trainers and sell extras at the Workshop.',
    done: s => (s.inventory.coin || 0) >= 50,
    progress: s => `${Math.min(s.inventory.coin || 0, 50)} / 50`
  },
  {
    id: 'cut-tree',
    label: 'Get the Cut HM',
    detail: 'Beat the trainer guarding the Cut HM, then chop trees that block paths!',
    done: s => (s.inventory.cut || 0) >= 1
  },
  {
    id: 'pokedex-100',
    label: 'See 100 different Pokémon',
    detail: 'A true Pokémon Master in the making!',
    done: s => uniqueSeen(s) >= 100,
    progress: s => `${uniqueSeen(s)} / 100`
  },
  {
    id: 'master',
    label: 'Catch all 150 Pokémon',
    detail: 'The legendary goal — gotta catch \'em all!',
    done: s => Object.values(s.pokedex).filter(p => p.caught).length >= 150,
    progress: s => `${Object.values(s.pokedex).filter(p => p.caught).length} / 150`
  }
];

export default function QuestModal({ state, onClose }: Props) {
  const completed = QUESTS.filter(q => q.done(state)).length;
  const total = QUESTS.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(10,6,2,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1005 0%, #0d0a04 100%)',
        border: '3px solid #7c5a2a', borderRadius: '20px',
        padding: '28px', maxWidth: '780px', width: '92vw',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(255,213,74,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ color: '#ffd54a', fontSize: '28px', margin: 0 }}>📜 Addie's Quest Log</h2>
          <p style={{ color: '#9d7a3a', margin: '8px 0 0' }}>
            {completed} of {total} complete · {pct}%
          </p>
          <div style={{
            marginTop: 10, height: 10, borderRadius: 6, overflow: 'hidden',
            background: 'rgba(255,255,255,0.07)', border: '1px solid #3a2c10'
          }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: 'linear-gradient(90deg, #ffd54a, #ff8a4a)',
              transition: 'width 300ms ease'
            }} />
          </div>
        </div>

        <div style={{
          overflowY: 'auto', flex: 1,
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '4px 6px'
        }}>
          {QUESTS.map(q => {
            const done = q.done(state);
            const progress = q.progress?.(state);
            return (
              <div key={q.id} style={{
                background: done ? 'rgba(74,222,128,0.10)' : 'rgba(255,213,74,0.05)',
                border: `2px solid ${done ? '#4ade80' : '#3a2c10'}`,
                borderRadius: '12px', padding: '12px 14px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: 14,
                  background: done ? '#4ade80' : 'transparent',
                  border: `2px solid ${done ? '#4ade80' : '#7c5a2a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0d0a04', fontWeight: 'bold', fontSize: 18
                }}>
                  {done ? '✓' : ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: done ? '#86efac' : '#ffd54a',
                    fontWeight: 'bold', fontSize: '15px',
                    textDecoration: done ? 'line-through' : 'none',
                    opacity: done ? 0.85 : 1
                  }}>
                    {q.label}
                    {progress && !done && (
                      <span style={{ marginLeft: 10, color: '#9d7a3a', fontWeight: 'normal', fontSize: '12px' }}>
                        ({progress})
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#9d7a3a', fontSize: '12px', marginTop: 4, lineHeight: 1.4 }}>
                    {q.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              background: '#d63946', color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 32px',
              fontWeight: 'bold', fontSize: '16px', cursor: 'pointer',
            }}
          >
            Close (ESC / Q)
          </button>
        </div>
      </div>
    </div>
  );
}
