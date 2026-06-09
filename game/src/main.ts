import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { OverworldScene } from './scenes/OverworldScene';
import { EducationCampusScene } from './scenes/EducationCampusScene';
import { ProjectParkScene } from './scenes/ProjectParkScene';
import { JobDistrictScene } from './scenes/JobDistrictScene';
import { SkillGardenScene } from './scenes/SkillGardenScene';
import { SnakeGameScene } from './scenes/SnakeGameScene';
import { ProjectMatchScene } from './scenes/ProjectMatchScene';
import { CampusQuizScene } from './scenes/CampusQuizScene';
import { FlappyJobScene } from './scenes/FlappyJobScene';
import { TetrisProjectScene } from './scenes/TetrisProjectScene';
import { BaseOpsScene } from './scenes/BaseOpsScene';
import { BugBreakerScene } from './scenes/BugBreakerScene';
import { PacmanScene } from './scenes/PacmanScene';
import { SettingsManager } from './systems/SettingsManager';

// Apply saved settings on load
SettingsManager.get();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#0a1a0a',
  render: {
    antialias: true,
    pixelArt: false,
    antialiasGL: true,
    transparent: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [BootScene, TitleScene, OverworldScene, EducationCampusScene, ProjectParkScene, JobDistrictScene, SkillGardenScene, SnakeGameScene, ProjectMatchScene, CampusQuizScene, FlappyJobScene, TetrisProjectScene, BaseOpsScene, BugBreakerScene, PacmanScene],
};

const game = new Phaser.Game(config);

// Set ARIA label on canvas
game.events.on('ready', () => {
  const canvas = document.querySelector('#game canvas');
  if (canvas) canvas.setAttribute('aria-label', 'Bio Explorer Game - 2D open world portfolio game. Use WASD or arrow keys to move, E to interact.');
});

window.addEventListener('resize', () => {
  game.scale.refresh();
});
