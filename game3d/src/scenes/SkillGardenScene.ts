import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';
import { createPlayer, updatePlayerPosition, updatePlayerRotation } from '../utils/PlayerFactory';

const CAT_COLORS: Record<string, number> = {
  'Frontend': 0x44ccff, 'Backend': 0x44ff88, 'Databases': 0xff4488,
  'DevOps': 0xff8844, 'Languages': 0xff44ff, 'Game Dev': 0xffaa44, 'AI/ML': 0xaa44ff,
};

interface SkillCrystal { category: string; skills: string[]; mesh: THREE.Mesh; x: number; z: number; }

export class SkillGardenScene3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private px = 400; private pz = 400;
  private speed = 80;
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
    this.scene.fog = new THREE.Fog(0x1a2a1a, 200, 500);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 800);
    this.labelEl = document.getElementById('interact-prompt')!;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 600), new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(400, 0, 300);
    this.scene.add(ground);

    const categories = Object.entries(getBio().skills);
    const catCount = categories.length;
    const centerX = 400;
    const centerZ = 250;
    const radius = 160;

    this.crystals = [];
    categories.forEach(([cat, skills], i) => {
      const angle = (Math.PI * 2 / catCount) * i - Math.PI / 2;
      const cx = centerX + Math.cos(angle) * radius;
      const cz = centerZ + Math.sin(angle) * radius;
      const color = CAT_COLORS[cat] || 0x88aaff;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 4, 8), new THREE.MeshStandardMaterial({ color: 0x444444 }));
      base.position.set(cx, 2, cz);
      this.scene.add(base);

      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(8, 20, 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.3 }),
      );
      crystal.position.set(cx, 16, cz); crystal.castShadow = true;
      this.scene.add(crystal);

      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 60;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText(cat, 128, 20);
      ctx.fillStyle = '#aaaaaa'; ctx.font = '10px monospace';
      ctx.fillText(skills.slice(0, 4).join(', '), 128, 42);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.position.set(cx, 32, cz); sprite.scale.set(40, 8, 1);
      this.scene.add(sprite);

      this.crystals.push({ category: cat, skills, mesh: crystal, x: cx, z: cz });
    });

    const portal = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 2, 12), new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x44ff88, emissiveIntensity: 0.3 }));
    portal.position.set(400, 1, 560);
    this.scene.add(portal);

    this.player = createPlayer(this.scene, this.px, this.pz);

    this.scene.add(new THREE.AmbientLight(0x446644, 0.5));
    const dir = new THREE.DirectionalLight(0xffeedd, 0.8);
    dir.position.set(200, 300, 200); dir.castShadow = true;
    this.scene.add(dir);
    this.scene.add(new THREE.HemisphereLight(0x88bbff, 0x446644, 0.3));

    // Right-drag orbit
    this.renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 2) { this.isOrbiting = true; this.lastMX = e.clientX; } });
    this.renderer.domElement.addEventListener('mousemove', (e) => { if (this.isOrbiting) { this.cameraAngle -= (e.clientX - this.lastMX) * 0.005; this.lastMX = e.clientX; } });
    this.renderer.domElement.addEventListener('mouseup', () => { this.isOrbiting = false; });
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') this.returnHome(); });
    document.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  update(dt: number): void {
    let vx = 0, vz = 0;
    if (this.keys['w']) vz = -1;
    if (this.keys['s']) vz = 1;
    if (this.keys['a']) vx = -1;
    if (this.keys['d']) vx = 1;
    if (vx !== 0 || vz !== 0) {
      const len = Math.sqrt(vx * vx + vz * vz);
      vx /= len; vz /= len;
      this.px += vx * this.speed * dt; this.pz += vz * this.speed * dt;
      this.px = clamp(this.px, 20, 780); this.pz = clamp(this.pz, 20, 580);
      updatePlayerPosition(this.player, this.px, this.pz);
      this.lastDir = Math.atan2(vx, vz);
    }
    updatePlayerRotation(this.player, this.lastDir, dt);

    const target = new THREE.Vector3(this.px, 8, this.pz);
    const ideal = new THREE.Vector3(this.px + Math.sin(this.cameraAngle) * 100, 60, this.pz + Math.cos(this.cameraAngle) * 100);
    this.camera.position.lerp(ideal, 0.05);
    this.camera.lookAt(target);

    let near: SkillCrystal | null = null;
    let nearPortal = false;
    for (const c of this.crystals) {
      if (dist(this.px, this.pz, c.x, c.z) < 40) { near = c; break; }
    }
    if (dist(this.px, this.pz, 400, 560) < 35) nearPortal = true;

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
