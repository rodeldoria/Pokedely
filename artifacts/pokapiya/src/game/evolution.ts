// Kanto evolution chains. `from` → `to` triggers when the Pokémon's owner has
// answered `correctNeeded` STEM questions since the Pokémon was caught.
// Stage 2 → 3 thresholds are higher than 1 → 2, matching the spirit of
// Pokémon's level-based evolution without exposing per-mon XP yet.

import type { PartyMember, TrainerState } from './save';
import { byId } from '../data/pokedex';

interface Evo {
  from: number;
  to: number;
  correctNeeded: number;
}

// Hand-keyed Kanto evolution chains.
// First-stage → second-stage thresholds: 6-10 correct answers since catch.
// Second-stage → third-stage thresholds: 16-22 correct.
export const EVO_CHAINS: Evo[] = [
  // Starters
  { from: 1,   to: 2,   correctNeeded: 6  },  // Bulbasaur → Ivysaur
  { from: 2,   to: 3,   correctNeeded: 18 },  // Ivysaur → Venusaur
  { from: 4,   to: 5,   correctNeeded: 6  },  // Charmander → Charmeleon
  { from: 5,   to: 6,   correctNeeded: 18 },  // Charmeleon → Charizard
  { from: 7,   to: 8,   correctNeeded: 6  },  // Squirtle → Wartortle
  { from: 8,   to: 9,   correctNeeded: 18 },  // Wartortle → Blastoise

  // Bug lines (faster — these evolve quickly in canon)
  { from: 10,  to: 11,  correctNeeded: 3  },  // Caterpie → Metapod
  { from: 11,  to: 12,  correctNeeded: 5  },  // Metapod → Butterfree
  { from: 13,  to: 14,  correctNeeded: 3  },  // Weedle → Kakuna
  { from: 14,  to: 15,  correctNeeded: 5  },  // Kakuna → Beedrill

  // Birds
  { from: 16,  to: 17,  correctNeeded: 7  },  // Pidgey → Pidgeotto
  { from: 17,  to: 18,  correctNeeded: 18 },  // Pidgeotto → Pidgeot
  { from: 21,  to: 22,  correctNeeded: 8  },  // Spearow → Fearow

  // Rats
  { from: 19,  to: 20,  correctNeeded: 8  },  // Rattata → Raticate

  // Common encounter lines
  { from: 23,  to: 24,  correctNeeded: 10 },  // Ekans → Arbok
  { from: 25,  to: 26,  correctNeeded: 12 },  // Pikachu → Raichu (thunder stone in canon — XP-based here)
  { from: 27,  to: 28,  correctNeeded: 10 },  // Sandshrew → Sandslash
  { from: 29,  to: 30,  correctNeeded: 8  },  // Nidoran-f → Nidorina
  { from: 30,  to: 31,  correctNeeded: 20 },  // Nidorina → Nidoqueen
  { from: 32,  to: 33,  correctNeeded: 8  },  // Nidoran-m → Nidorino
  { from: 33,  to: 34,  correctNeeded: 20 },  // Nidorino → Nidoking
  { from: 35,  to: 36,  correctNeeded: 14 },  // Clefairy → Clefable
  { from: 37,  to: 38,  correctNeeded: 14 },  // Vulpix → Ninetales
  { from: 39,  to: 40,  correctNeeded: 14 },  // Jigglypuff → Wigglytuff
  { from: 41,  to: 42,  correctNeeded: 9  },  // Zubat → Golbat
  { from: 43,  to: 44,  correctNeeded: 8  },  // Oddish → Gloom
  { from: 44,  to: 45,  correctNeeded: 20 },  // Gloom → Vileplume
  { from: 46,  to: 47,  correctNeeded: 10 },  // Paras → Parasect
  { from: 48,  to: 49,  correctNeeded: 10 },  // Venonat → Venomoth
  { from: 50,  to: 51,  correctNeeded: 12 },  // Diglett → Dugtrio
  { from: 52,  to: 53,  correctNeeded: 10 },  // Meowth → Persian
  { from: 54,  to: 55,  correctNeeded: 12 },  // Psyduck → Golduck
  { from: 56,  to: 57,  correctNeeded: 12 },  // Mankey → Primeape
  { from: 58,  to: 59,  correctNeeded: 14 },  // Growlithe → Arcanine
  { from: 60,  to: 61,  correctNeeded: 10 },  // Poliwag → Poliwhirl
  { from: 61,  to: 62,  correctNeeded: 20 },  // Poliwhirl → Poliwrath
  { from: 63,  to: 64,  correctNeeded: 8  },  // Abra → Kadabra
  { from: 64,  to: 65,  correctNeeded: 18 },  // Kadabra → Alakazam
  { from: 66,  to: 67,  correctNeeded: 10 },  // Machop → Machoke
  { from: 67,  to: 68,  correctNeeded: 20 },  // Machoke → Machamp
  { from: 69,  to: 70,  correctNeeded: 8  },  // Bellsprout → Weepinbell
  { from: 70,  to: 71,  correctNeeded: 20 },  // Weepinbell → Victreebel
  { from: 72,  to: 73,  correctNeeded: 12 },  // Tentacool → Tentacruel
  { from: 74,  to: 75,  correctNeeded: 10 },  // Geodude → Graveler
  { from: 75,  to: 76,  correctNeeded: 20 },  // Graveler → Golem
  { from: 77,  to: 78,  correctNeeded: 12 },  // Ponyta → Rapidash
  { from: 79,  to: 80,  correctNeeded: 14 },  // Slowpoke → Slowbro
  { from: 81,  to: 82,  correctNeeded: 12 },  // Magnemite → Magneton
  { from: 84,  to: 85,  correctNeeded: 10 },  // Doduo → Dodrio
  { from: 86,  to: 87,  correctNeeded: 14 },  // Seel → Dewgong
  { from: 88,  to: 89,  correctNeeded: 12 },  // Grimer → Muk
  { from: 90,  to: 91,  correctNeeded: 14 },  // Shellder → Cloyster
  { from: 92,  to: 93,  correctNeeded: 10 },  // Gastly → Haunter
  { from: 93,  to: 94,  correctNeeded: 20 },  // Haunter → Gengar
  { from: 96,  to: 97,  correctNeeded: 12 },  // Drowzee → Hypno
  { from: 98,  to: 99,  correctNeeded: 12 },  // Krabby → Kingler
  { from: 100, to: 101, correctNeeded: 12 },  // Voltorb → Electrode
  { from: 102, to: 103, correctNeeded: 14 },  // Exeggcute → Exeggutor
  { from: 104, to: 105, correctNeeded: 14 },  // Cubone → Marowak
  { from: 109, to: 110, correctNeeded: 12 },  // Koffing → Weezing
  { from: 111, to: 112, correctNeeded: 16 },  // Rhyhorn → Rhydon
  { from: 116, to: 117, correctNeeded: 12 },  // Horsea → Seadra
  { from: 118, to: 119, correctNeeded: 12 },  // Goldeen → Seaking
  { from: 120, to: 121, correctNeeded: 14 },  // Staryu → Starmie
  { from: 129, to: 130, correctNeeded: 16 },  // Magikarp → Gyarados
  { from: 133, to: 134, correctNeeded: 12 },  // Eevee → Vaporeon (water/random — we pick Vaporeon)
  { from: 138, to: 139, correctNeeded: 16 },  // Omanyte → Omastar
  { from: 140, to: 141, correctNeeded: 16 },  // Kabuto → Kabutops
  { from: 147, to: 148, correctNeeded: 12 },  // Dratini → Dragonair
  { from: 148, to: 149, correctNeeded: 22 }   // Dragonair → Dragonite
];

const EVO_BY_FROM = new Map<number, Evo>(EVO_CHAINS.map(e => [e.from, e]));

export function evolutionFor(id: number): Evo | undefined {
  return EVO_BY_FROM.get(id);
}

// Check every team member; evolve any whose owner has answered enough STEM
// questions since the catch. Returns an array of {beforeName, afterName} for
// the caller to surface as a toast / modal.
export interface EvolutionEvent {
  beforeId: number;
  beforeName: string;
  afterId: number;
  afterName: string;
}

export function checkEvolutions(state: TrainerState): EvolutionEvent[] {
  const events: EvolutionEvent[] = [];
  for (const member of state.team) {
    const evolved = tryEvolveMember(member, state);
    if (evolved) events.push(evolved);
  }
  return events;
}

function tryEvolveMember(member: PartyMember, state: TrainerState): EvolutionEvent | null {
  const evo = EVO_BY_FROM.get(member.id);
  if (!evo) return null;

  // correctAtCatch is only stored on members caught after the slice-5 update.
  // Older saves can still evolve — they just need `correctNeeded` total
  // correct answers from now (counted from the slice-5 boot).
  const baseline = member.correctAtCatch ?? 0;
  const since = state.stats.correct - baseline;
  if (since < evo.correctNeeded) return null;

  const target = byId(evo.to);
  if (!target) return null;

  const beforeName = member.name;
  member.id = target.id;
  member.name = target.name;
  member.types = target.types;
  // Reset baseline so the next stage requires its own correctNeeded progress.
  member.correctAtCatch = state.stats.correct;

  return {
    beforeId: evo.from,
    beforeName,
    afterId: target.id,
    afterName: target.name
  };
}
