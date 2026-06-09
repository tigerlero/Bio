import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';
import { createPlayer, updatePlayerPosition, updatePlayerRotation } from '../utils/PlayerFactory';

const CAT_COLORS: Record<string, number> = {
  'Frontend': 0x44ccff, 'Backend': 0x44ff88, 'Databases': 0xff4488,
  'DevOps': 0xff8844, 'Languages': 0xff44ff, 'Game Dev': 0xffaa44, 'AI/ML': 0xaa44ff,
};

const CAT_ICON_FILE: Record<string, string> = {
  'Frontend': 'icons/frontend.svg', 'Backend': 'icons/backend.svg', 'Databases': 'icons/databases.svg',
  'DevOps': 'icons/devops.svg', 'Languages': 'icons/languages.svg', 'Game Dev': 'icons/gamedev.svg', 'AI/ML': 'icons/aiml.svg',
};

interface SkillCrystal { category: string; skills: string[]; mesh: THREE.Mesh; sprite: THREE.Sprite; x: number; z: number; }

export class SkillGardenScene3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private px = 600; private pz = 600;
  private speed = 130;
  private keys: Record<string, boolean> = {};
  private crystals: SkillCrystal[] = [];
  private onReturn: () => void;
  private dialogue: any;
  private modal: any;
  private labelEl: HTMLElement;
  private lastDir = 0;
  private cameraAngle = 0;
  private isOrbiting = false;
  private lastMX = 0;

  constructor(renderer: THREE.WebGLRenderer, onReturn: () => void, dialogue: any, modal: any) {
    this.renderer = renderer;
    this.onReturn = onReturn;
    this.dialogue = dialogue;
    this.modal = modal;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2a1a);
    this.scene.fog = new THREE.Fog(0x1a2a1a, 300, 700);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    this.labelEl = document.getElementById('interact-prompt')!;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 900), new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(600, 0, 450);
    this.scene.add(ground);

    const categories = Object.entries(getBio().skills);
    const catCount = categories.length;
    const centerX = 600;
    const centerZ = 350;
    const radius = 250;

    const texLoader = new THREE.TextureLoader();
    this.crystals = [];
    categories.forEach(([cat, skills], i) => {
      const angle = (Math.PI * 2 / catCount) * i - Math.PI / 2;
      const cx = centerX + Math.cos(angle) * radius;
      const cz = centerZ + Math.sin(angle) * radius;
      const color = CAT_COLORS[cat] || 0x88aaff;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 10, 5, 8), new THREE.MeshStandardMaterial({ color: 0x444444 }));
      base.position.set(cx, 2.5, cz);
      this.scene.add(base);

      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(10, 26, 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.3 }),
      );
      crystal.position.set(cx, 20, cz); crystal.castShadow = true;
      this.scene.add(crystal);

      // Category icon sprite
      const iconFile = CAT_ICON_FILE[cat] || 'icons/frontend.svg';
      const iconTex = texLoader.load(iconFile);
      const iconSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, transparent: true, depthTest: false }));
      iconSprite.position.set(cx, 42, cz);
      iconSprite.scale.set(28, 28, 1);
      this.scene.add(iconSprite);

      // Category name label
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 40;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText(cat, 128, 22);
      ctx.fillStyle = '#aaaaaa'; ctx.font = '9px monospace';
      ctx.fillText(skills.slice(0, 4).join(', '), 128, 36);
      const tex = new THREE.CanvasTexture(canvas);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      labelSprite.position.set(cx, 58, cz); labelSprite.scale.set(40, 8, 1);
      this.scene.add(labelSprite);

      this.crystals.push({ category: cat, skills, mesh: crystal, sprite: iconSprite, x: cx, z: cz });
    });

    const portal = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 2, 12), new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x44ff88, emissiveIntensity: 0.3 }));
    portal.position.set(600, 1, 830);
    this.scene.add(portal);

    this.player = createPlayer(this.scene, this.px, this.pz);

    this.scene.add(new THREE.AmbientLight(0x446644, 0.5));
    const dir = new THREE.DirectionalLight(0xffeedd, 0.8);
    dir.position.set(300, 400, 300); dir.castShadow = true;
    this.scene.add(dir);
    this.scene.add(new THREE.HemisphereLight(0x88bbff, 0x446644, 0.3));

    this.renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 2) { this.isOrbiting = true; this.lastMX = e.clientX; } });
    this.renderer.domElement.addEventListener('mousemove', (e) => { if (this.isOrbiting) { this.cameraAngle -= (e.clientX - this.lastMX) * 0.005; this.lastMX = e.clientX; } });
    this.renderer.domElement.addEventListener('mouseup', () => { this.isOrbiting = false; });
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') this.returnHome(); });
    document.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  update(dt: number): void {
    let vx = 0, vz = 0;
    const forward = new THREE.Vector3(-Math.sin(this.cameraAngle), 0, -Math.cos(this.cameraAngle));
    const right = new THREE.Vector3(Math.cos(this.cameraAngle), 0, -Math.sin(this.cameraAngle));

    if (this.keys['w']) { vx += forward.x; vz += forward.z; }
    if (this.keys['s']) { vx -= forward.x; vz -= forward.z; }
    if (this.keys['a']) { vx -= right.x; vz -= right.z; }
    if (this.keys['d']) { vx += right.x; vz += right.z; }
    if (vx !== 0 || vz !== 0) {
      const len = Math.sqrt(vx * vx + vz * vz);
      vx /= len; vz /= len;
      this.px += vx * this.speed * dt; this.pz += vz * this.speed * dt;
      this.px = clamp(this.px, 30, 1170); this.pz = clamp(this.pz, 30, 870);
      updatePlayerPosition(this.player, this.px, this.pz);
      this.lastDir = Math.atan2(vx, vz);
    }
    updatePlayerRotation(this.player, this.lastDir, dt);

    const target = new THREE.Vector3(this.px, 12, this.pz);
    const ideal = new THREE.Vector3(this.px + Math.sin(this.cameraAngle) * 150, 80, this.pz + Math.cos(this.cameraAngle) * 150);
    this.camera.position.lerp(ideal, 0.05);
    this.camera.lookAt(target);

    let near: SkillCrystal | null = null;
    let nearPortal = false;
    for (const c of this.crystals) {
      if (dist(this.px, this.pz, c.x, c.z) < 50) { near = c; break; }
    }
    if (dist(this.px, this.pz, 600, 830) < 45) nearPortal = true;

    if (this.keys['e']) {
      this.keys['e'] = false;
      if (nearPortal) { this.returnHome(); return; }
      if (near) {
        AudioManager.get().playSfx('interact');
        this.dialogue.show([`${near.category}: ${near.skills.join(', ')}`], 'Skills', null, () => {
          this.modal.show(`# ${near.category}\n\n${near.skills.join(', ')}`);
        });
      }
    }

    if (nearPortal || near) {
      this.labelEl.textContent = nearPortal ? 'Press E to return' : 'Press E for details';
      this.labelEl.style.display = 'block';
    } else { this.labelEl.style.display = 'none'; }
  }

  private returnHome(): void { this.labelEl.style.display = 'none'; AudioManager.get().stopBgm(0.2); this.onReturn(); }
  resize(w: number, h: number): void { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  destroy(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
  }
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function dist(x1: number, z1: number, x2: number, z2: number): number { return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2); }
