import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import WorldScene from './scenes/WorldScene.js';
import EncounterScene from './scenes/EncounterScene.js';
import TeamScene from './scenes/TeamScene.js';
import HudScene from './scenes/HudScene.js';
import InteriorScene from './scenes/InteriorScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  pixelArt: true,
  backgroundColor: '#7cc25e',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, WorldScene, HudScene, EncounterScene, TeamScene, InteriorScene]
};

new Phaser.Game(config);

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('splash')?.classList.add('hidden'), 900);
});
