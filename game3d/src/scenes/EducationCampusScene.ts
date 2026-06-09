import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import type { Education } from '../data/bio';
import { AudioManager } from '../systems/AudioManager';
import { createPlayer, updatePlayerPosition, updatePlayerRotation } from '../utils/PlayerFactory';

export class EducationCampusScene3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private px = 300; private pz = 600;
  private speed = 130;
  private keys: Record<string, boolean> = {};
  private buildings: { data: Education; mesh: THREE.Mesh; x: number; z: number }[] = [];
  private cameraAngle = 0;
  private onReturn: () => void;
  private dialogue: any;
  private modal: any;
  private labelEl: HTMLElement;
  private lastDir = 0;
  private isOrbiting = false;
  private lastMX = 0;

  constructor(
    private renderer_: THREE.WebGLRenderer,
    onReturn: () => void,
    dialogue: any,
    modal: any,
  ) {
    this.renderer = renderer_;
    this.onReturn = onReturn;
    this.dialogue = dialogue;
    this.modal = modal;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a3a1a);
    this.scene.fog = new THREE.Fog(0x1a3a1a, 300, 700);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
    this.labelEl = document.getElementById('interact-prompt')!;

    this.build();

    this.player = createPlayer(this.scene, this.px, this.pz);

    this.renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 2) { this.isOrbiting = true; this.lastMX = e.clientX; } });
    this.renderer.domElement.addEventListener('mousemove', (e) => { if (this.isOrbiting) { this.cameraAngle -= (e.clientX - this.lastMX) * 0.005; this.lastMX = e.clientX; } });
    this.renderer.domElement.addEventListener('mouseup', () => { this.isOrbiting = false; });
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') this.returnHome(); });
    document.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  private build(): void {
    const bio = getBio();

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 900), new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(600, 0, 450);
    this.scene.add(ground);

    this.buildings = [];
    bio.education.forEach((edu, i) => {
      const bx = 250 + i * 500;
      const bz = 300;

      const building = new THREE.Mesh(new THREE.BoxGeometry(60, 50, 60), new THREE.MeshStandardMaterial({ color: 0xcc8844, roughness: 0.7 }));
      building.position.set(bx, 25, bz); building.castShadow = true;
      this.scene.add(building);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(42, 18, 4), new THREE.MeshStandardMaterial({ color: 0xaa6633, roughness: 0.8 }));
      roof.position.set(bx, 50, bz); roof.rotation.y = Math.PI / 4; roof.castShadow = true;
      this.scene.add(roof);

      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffaa44'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText(edu.degree, 128, 18);
      ctx.fillStyle = '#cc8844'; ctx.font = '12px monospace';
      ctx.fillText(edu.school, 128, 38);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.position.set(bx, 66, bz); sprite.scale.set(50, 10, 1);
      this.scene.add(sprite);

      this.buildings.push({ data: edu, mesh: building, x: bx, z: bz });
    });

    const portal = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 2, 12), new THREE.MeshStandardMaterial({ color: 0x44cc44, emissive: 0x44cc44, emissiveIntensity: 0.3 }));
    portal.position.set(600, 1, 830);
    this.scene.add(portal);

    this.scene.add(new THREE.AmbientLight(0x446644, 0.5));
    const dir = new THREE.DirectionalLight(0xffeedd, 0.8);
    dir.position.set(300, 400, 300); dir.castShadow = true;
    this.scene.add(dir);
    this.scene.add(new THREE.HemisphereLight(0x88bbff, 0x446644, 0.3));
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
    const ideal = new THREE.Vector3(
      this.px + Math.sin(this.cameraAngle) * 150,
      80,
      this.pz + Math.cos(this.cameraAngle) * 150,
    );
    this.camera.position.lerp(ideal, 0.05);
    this.camera.lookAt(target);

    let nearBuilding: Education | null = null;
    let nearPortal = false;
    for (const b of this.buildings) {
      if (Math.sqrt((this.px - b.x) ** 2 + (this.pz - b.z) ** 2) < 50) { nearBuilding = b.data; break; }
    }
    if (Math.sqrt((this.px - 600) ** 2 + (this.pz - 830) ** 2) < 45) nearPortal = true;

    if (this.keys['e']) {
      this.keys['e'] = false;
      if (nearPortal) { this.returnHome(); return; }
      if (nearBuilding) {
        AudioManager.get().playSfx('interact');
        this.dialogue.show([`${nearBuilding.degree} at ${nearBuilding.school} (${nearBuilding.year})`], 'Education', null, () => {
          this.modal.show(`# ${nearBuilding.degree}\n${nearBuilding.school}\nClass of ${nearBuilding.year}\n${nearBuilding.description || ''}`);
        });
      }
    }

    if (nearPortal || nearBuilding) {
      this.labelEl.textContent = nearPortal ? 'Press E to return' : 'Press E for details';
      this.labelEl.style.display = 'block';
    } else { this.labelEl.style.display = 'none'; }
  }

  private returnHome(): void {
    this.labelEl.style.display = 'none';
    AudioManager.get().stopBgm(0.2);
    this.onReturn();
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
  }
}

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
