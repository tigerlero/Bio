import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import type { Project } from '../data/bio';
import { AudioManager } from '../systems/AudioManager';
import { createPlayer, updatePlayerPosition, updatePlayerRotation } from '../utils/PlayerFactory';

export class ProjectParkScene3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private px = 400; private pz = 400;
  private speed = 80;
  private keys: Record<string, boolean> = {};
  private projects: { data: Project; mesh: THREE.Mesh; x: number; z: number }[] = [];
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
    this.scene.background = new THREE.Color(0x1a2a3a);
    this.scene.fog = new THREE.Fog(0x1a2a3a, 200, 500);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 800);
    this.labelEl = document.getElementById('interact-prompt')!;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 600), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(400, 0, 300);
    this.scene.add(ground);

    const bio = getBio();
    const cols = Math.min(3, bio.projects.length);
    const spacingX = 200;
    const spacingZ = 160;
    const startX = 200;
    const startZ = 200;

    this.projects = [];
    bio.projects.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * spacingX;
      const bz = startZ + row * spacingZ;

      const building = new THREE.Mesh(new THREE.BoxGeometry(40, 25, 30), new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.6 }));
      building.position.set(bx, 12.5, bz); building.castShadow = true;
      this.scene.add(building);

      const accent = new THREE.Mesh(new THREE.BoxGeometry(36, 3, 26), new THREE.MeshStandardMaterial({ color: 0x66bbdd, emissive: 0x4488aa, emissiveIntensity: 0.1 }));
      accent.position.set(bx, 22, bz);
      this.scene.add(accent);

      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 80;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#88ddff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText(p.title, 128, 18);
      ctx.fillStyle = '#6699aa'; ctx.font = '10px monospace';
      p.tech.forEach((t, ti) => { ctx.fillText(t, 128, 38 + ti * 14); });
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.position.set(bx, 36, bz); sprite.scale.set(40, 12, 1);
      this.scene.add(sprite);

      this.projects.push({ data: p, mesh: building, x: bx, z: bz });
    });

    const portal = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 2, 12), new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.3 }));
    portal.position.set(400, 1, 560);
    this.scene.add(portal);

    this.player = createPlayer(this.scene, this.px, this.pz);

    this.scene.add(new THREE.AmbientLight(0x446688, 0.5));
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

    let near: Project | null = null;
    let nearPortal = false;
    for (const b of this.projects) {
      if (dist(this.px, this.pz, b.x, b.z) < 40) { near = b.data; break; }
    }
    if (dist(this.px, this.pz, 400, 560) < 35) nearPortal = true;

    if (this.keys['e']) {
      this.keys['e'] = false;
      if (nearPortal) { this.returnHome(); return; }
      if (near) {
        AudioManager.get().playSfx('interact');
        this.dialogue.show([`${near.title}: ${near.tech.join(', ')}`], 'Project', null, () => {
          this.modal.show(`# ${near.title}\n${near.description}\n\nTech: ${near.tech.join(', ')}\n\nLink: ${near.link}`);
        });
      }
    }

    if (nearPortal || near) {
      this.labelEl.textContent = nearPortal ? 'Press E to return' : 'Press E for details';
      this.labelEl.style.display = 'block';
    } else { this.labelEl.style.display = 'none'; }
  }

  private returnHome(): void {
    this.labelEl.style.display = 'none';
    AudioManager.get().stopBgm(0.2);
    this.onReturn();
  }

  resize(w: number, h: number): void { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  destroy(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
  }
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function dist(x1: number, z1: number, x2: number, z2: number): number { return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2); }
