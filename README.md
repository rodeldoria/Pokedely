# Pokapiya — a STEM Pokémon-style Adventure

A kid-friendly, Pokémon-inspired exploration game where catching a wild
Pokémon means solving a quick STEM question. Designed for elementary-school
players to practice **math, science, computer science, and earth-science
history** while collecting the first 150 Kanto Pokémon.

> Built slice by slice. This is **Slice 1**: walkable overworld, wild
> encounters in tall grass, math/science catch mechanic, and a team roster
> that persists across sessions.

## Quickstart

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Controls

| Key            | Action                                    |
| -------------- | ----------------------------------------- |
| Arrow keys / WASD | Walk                                   |
| T              | Open / close your team                    |
| ESC            | Flee an encounter, close the team panel   |

Step into the tall grass — there's a chance a wild Pokémon will appear.
Answer the STEM question to throw a Poké Ball. Get it right and your odds
of catching jump way up. Three wrong answers and the Pokémon runs off.

Your progress (team, Pokédex, STEM accuracy) is saved to `localStorage`,
so closing the tab won't lose progress.

## What's in Slice 1

- Procedurally generated 48 × 36 tile overworld (grass, tall grass, trees,
  water, paths, flowers, rocks, a Poké Center prop).
- Player sprite with 4-direction walking animation, smooth camera follow,
  collision against trees and water.
- Wild encounters in tall grass with PokéAPI sprites for all 150 Kanto
  Pokémon, weighted by rarity.
- Per-type STEM question bank:
  - **Math** — addition, subtraction, multiplication for Fighting types
    and rare Pokémon.
  - **Biology** — grass / bug / water / normal types ask plant, animal,
    and ecology questions.
  - **Science** — fire / electric / ice / steel types ask chemistry &
    physics.
  - **Computer Science** — psychic / ghost / dragon types ask logic,
    pattern, and loop questions.
  - **Earth & History** — rock / ground / flying types ask geology,
    oceans, fossils.
- Catch chance scales with rarity, boosted by correct answers.
- Team of 6 + Box overflow + Pokédex tracking.
- HUD with caught count, accuracy %, and step count.
- All player and tile art is generated procedurally in code — no asset
  fetching required to boot the game.

## Roadmap — the rest of the slices

- **Slice 2 — Tile assets.** Replace procedural tiles with a Kenney.nl
  CC0 RPG urban / nature pack for a richer Pokémon-BDSP overworld feel.
  Add tall grass shake animation on entry.
- **Slice 3 — Build & craft.** Inventory + hotbar. Chop trees for wood,
  mine rocks for stone, plant berries. Place blocks to build paths,
  fences, simple shelters. Minecraft-lite, top-down.
- **Slice 4 — Evolution biology.** Each captured Pokémon gains XP from
  solved questions. Evolutions trigger a "biology mini-lesson" explaining
  metamorphosis / life cycles using Caterpie → Butterfree, Magikarp →
  Gyarados, etc.
- **Slice 5 — History timelines.** Fossil dig site on the map. Drag-drop
  events on a geological timeline to revive Omanyte / Kabuto / Aerodactyl.
- **Slice 6 — Code Lab.** Drag-block puzzle (Scratch-style) where the
  player programs a Porygon to navigate a maze. Introduces sequences,
  loops, conditionals.
- **Slice 7 — Pokédex dashboard.** Real Pokédex viewer with PokéAPI
  details (height, weight, habitat, generation).
- **Slice 8 — Mobile controls.** On-screen D-pad and tap-to-walk.

## Architecture

```
src/
  main.js                  # Phaser config, scene wiring
  scenes/
    BootScene.js           # Generates all procedural textures
    WorldScene.js          # Overworld, movement, collisions, encounter trigger
    EncounterScene.js      # Wild Pokémon battle UI + STEM question + catch
    TeamScene.js           # Modal team roster + Pokédex stats
    HudScene.js            # Always-on HUD overlay
  data/
    pokedex.js             # First 150 Kanto Pokémon, sprite URL helpers
    stem.js                # Question banks by subject
  game/
    world.js               # Procedural map generator + tile constants
    save.js                # localStorage persistence layer
```

## Asset credits

- **Pokémon sprites** are loaded on demand from the public
  [PokeAPI sprites repository](https://github.com/PokeAPI/sprites). They
  remain © Nintendo / Game Freak / The Pokémon Company. Pokapiya is a
  personal, educational, non-commercial fan project.
- All tile art and the trainer sprite are drawn from scratch in code in
  `BootScene.js` (no third-party assets in the repo yet).
