import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import type { Job } from '../data/bio';
import { AudioManager } from '../systems/AudioManager';
import { createPlayer, updatePlayerPosition, updatePlayerRotation } from '../utils/PlayerFactory';

const jobLogoMap: Record<string, string> = { 'Valmore-Neogen': 'valmore', 'ExpressTransfers': 'expresstransfers', 'Evalion-SHL': 'evalion', 'Newdeal Real Estates': 'newdeal', 'Datawise': 'datawise', 'Algorithmics': 'algorithmics' };

export class JobDistrictScene3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private px = 600; private pz = 600;
  private speed = 130;
  private keys: Record<string, boolean> = {};
  private jobs: { data: Job; mesh: THREE.Mesh; x: number; z: number }[] = [];
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
    this.scene.background = new THREE.Color(0x2a2a2a);
    this.scene.fog = new THREE.Fog(0x2a2a2a, 300, 700);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    this.labelEl = document.getElementById('interact-prompt')!;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 900), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(600, 0, 450);
    this.scene.add(ground);

    const bio = getBio();
    const cols = 3;
    const spacingX = 300;
    const spacingZ = 240;
    const startX = 250;

    this.jobs = [];
    bio.jobs.forEach((j, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * spacingX;
      const bz = 200 + row * spacingZ;

      const building = new THREE.Mesh(new THREE.BoxGeometry(55, 45, 45), new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.7 }));
      building.position.set(bx, 22.5, bz); building.castShadow = true;
      this.scene.add(building);

      const logoKey = jobLogoMap[j.company];
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 80;
      const ctx = canvas.getContext('2d')!;

      if (logoKey) {
        ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText(j.company, 128, 20);
      } else {
        ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText(j.company, 128, 20);
      }
      ctx.fillStyle = '#aaaaaa'; ctx.font = '11px monospace';
      ctx.fillText(j.role, 128, 42);
      ctx.fillStyle = '#888888'; ctx.font = '9px monospace';
      ctx.fillText(j.period, 128, 60);

      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.position.set(bx, 54, bz); sprite.scale.set(50, 14, 1);
      this.scene.add(sprite);

      this.jobs.push({ data: j, mesh: building, x: bx, z: bz });
    });

    const portal = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 2, 12), new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff8844, emissiveIntensity: 0.3 }));
    portal.position.set(600, 1, 830);
    this.scene.add(portal);

    this.player = createPlayer(this.scene, this.px, this.pz);

    this.scene.add(new THREE.AmbientLight(0x445555, 0.5));
    const dir = new THREE.DirectionalLight(0xffeedd, 0.8);
    dir.position.set(300, 400, 300); dir.castShadow = true;
    this.scene.add(dir);
    this.scene.add(new THREE.HemisphereLight(0x8888bb, 0x444444, 0.3));

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

    let near: Job | null = null;
    let nearPortal = false;
    for (const b of this.jobs) {
      if (dist(this.px, this.pz, b.x, b.z) < 50) { near = b.data; break; }
    }
    if (dist(this.px, this.pz, 600, 830) < 45) nearPortal = true;

    if (this.keys['e']) {
      this.keys['e'] = false;
      if (nearPortal) { this.returnHome(); return; }
      if (near) {
        AudioManager.get().playSfx('interact');
        this.dialogue.show([`${near.company} — ${near.role} (${near.period})`], 'Job', null, () => {
          this.modal.show(`# ${near.company}\n${near.role} | ${near.period}\n\n${near.highlights.map((h: string) => `• ${h}`).join('\n')}`);
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
