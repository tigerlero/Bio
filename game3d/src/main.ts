import * as THREE from 'three';
import { SettingsManager } from './systems/SettingsManager';
import { AudioManager } from './systems/AudioManager';
import { SaveSystem } from './systems/SaveSystem';
import { DialogueSystem } from './systems/DialogueSystem';
import { ModalPanel } from './ui/ModalPanel';
import { PauseMenu } from './ui/PauseMenu';
import { Overworld } from './scenes/Overworld';
import { TitleScene3D } from './scenes/TitleScene';
import { EducationCampusScene3D } from './scenes/EducationCampusScene';
import { ProjectParkScene3D } from './scenes/ProjectParkScene';
import { JobDistrictScene3D } from './scenes/JobDistrictScene';
import { SkillGardenScene3D } from './scenes/SkillGardenScene';
import { EndlessRunnerScene } from './scenes/EndlessRunnerScene';
import { fadeIn, fadeOut } from './utils/Transitions';

SettingsManager.get();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game')!.appendChild(renderer.domElement);

const dialogue = new DialogueSystem();
const modal = new ModalPanel();
let paused = false;
let currentOverworld: Overworld | null = null;
let currentDetail: any = null;
let currentTitle: TitleScene3D | null = null;
let currentRunner: EndlessRunnerScene | null = null;
let pauseMenu: PauseMenu | null = null;
let firstScene = true;

async function startScene(key: string): Promise<void> {
  if (!firstScene) await fadeOut(250);
  firstScene = false;
  cleanupCurrent();

  if (key === 'TitleScene') {
    currentTitle = new TitleScene3D(renderer, () => {
      cleanupCurrent();
      startScene('OverworldScene');
    });
    pauseMenu = new PauseMenu(startScene);
  } else if (key === 'OverworldScene') {
    AudioManager.get().init();
    AudioManager.get().playBgm();
    const ow = new Overworld(renderer, startScene, dialogue, modal);
    currentOverworld = ow;
    pauseMenu = new PauseMenu(startScene);
  } else if (key === 'EducationCampusScene') {
    currentDetail = new EducationCampusScene3D(renderer, () => startScene('OverworldScene'), dialogue, modal);
  } else if (key === 'ProjectParkScene') {
    currentDetail = new ProjectParkScene3D(renderer, () => startScene('OverworldScene'), dialogue, modal);
  } else if (key === 'JobDistrictScene') {
    currentDetail = new JobDistrictScene3D(renderer, () => startScene('OverworldScene'), dialogue, modal);
  } else if (key === 'SkillGardenScene') {
    currentDetail = new SkillGardenScene3D(renderer, () => startScene('OverworldScene'), dialogue, modal);
  } else if (key === 'EndlessRunnerScene') {
    AudioManager.get().stopBgm(0.2);
    currentRunner = new EndlessRunnerScene(renderer, () => startScene('OverworldScene'));
  }
  await fadeIn(250);
}

function cleanupCurrent(): void {
  if (currentOverworld) { currentOverworld.destroy(); currentOverworld = null; }
  if (currentDetail) { currentDetail.destroy(); currentDetail = null; }
  if (currentTitle) { currentTitle.destroy(); currentTitle = null; }
  if (currentRunner) { currentRunner.destroy(); currentRunner = null; }
  if (pauseMenu) { pauseMenu.destroy(); pauseMenu = null; }
}

// Show loading screen briefly, then start
async function boot(): Promise<void> {
  const loadingEl = document.getElementById('loading-screen');
  if (loadingEl) loadingEl.style.display = 'flex';
  await new Promise(r => setTimeout(r, 400));
  if (loadingEl) loadingEl.style.display = 'none';
  startScene('TitleScene');
}

boot();

// ESC to toggle pause
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pauseMenu && (currentOverworld || currentTitle)) {
    if (!dialogue.getIsActive() && !modal.getIsOpen()) {
      if (pauseMenu.getIsOpen()) pauseMenu.close();
      else pauseMenu.open();
      paused = pauseMenu.getIsOpen();
    }
  }
});

// Animation loop
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (paused) {
    renderer.render((currentOverworld?.scene || currentRunner?.scene || currentDetail?.scene || currentTitle?.scene)!,
      (currentOverworld as any)?.camera || currentRunner?.camera || currentDetail?.camera || currentTitle?.getCamera());
    return;
  }

  if (currentTitle) {
    currentTitle.update(dt);
    renderer.render(currentTitle.scene, currentTitle.getCamera());
  } else if (currentOverworld) {
    currentOverworld.update(dt);
    renderer.render(currentOverworld.scene, (currentOverworld as any).camera);
  } else if (currentRunner) {
    currentRunner.update(dt);
    renderer.render(currentRunner.scene, currentRunner.camera);
  } else if (currentDetail) {
    currentDetail.update(dt);
    renderer.render(currentDetail.scene, currentDetail.camera);
  }
}

animate();

// Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  if (currentTitle) currentTitle.resize(w, h);
  if (currentOverworld) currentOverworld.resize(w, h);
  if (currentRunner) currentRunner.resize(w, h);
  if (currentDetail) currentDetail.resize(w, h);
});
