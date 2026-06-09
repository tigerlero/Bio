import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { AudioManager } from '../systems/AudioManager';
import { Minimap } from '../utils/Minimap';

interface Zone3D { name: string; x: number; z: number; w: number; h: number; color: number; }

const ZONES: Zone3D[] = [
  { name: 'Home', x: 600, z: 600, w: 400, h: 400, color: 0x3a6a3a },
  { name: 'Projects', x: 200, z: 100, w: 600, h: 500, color: 0x2a4a7a },
  { name: 'Jobs', x: 1000, z: 200, w: 600, h: 500, color: 0x7a4a2a },
  { name: 'Skills', x: 1100, z: 800, w: 500, h: 400, color: 0x6a2a7a },
  { name: 'Education', x: 900, z: 1100, w: 500, h: 240, color: 0x7a6a2a },
];

export class Overworld {
  public scene: THREE.Scene;
  public player: Player;
  public npcs: NPC[] = [];
  public camera: THREE.PerspectiveCamera;
  private currentZone = '';
  private zoneLabelEl: HTMLElement;
  private interactPromptEl: HTMLElement;
  private zoneLabelTimer: number | null = null;
  private cameraAngle = 0;
  private cameraDist = 200;
  private cameraHeight = 120;
  private isOrbiting = false;
  private lastMX = 0;
  private targetLookAt = new THREE.Vector3();
  private minimap: Minimap;
  private dayTime = 0;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;

  constructor(
    public renderer: THREE.WebGLRenderer,
    private onSceneChange: (key: string) => void,
    private dialogue: any,
    private modal: any,
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2a1a);
    this.scene.fog = new THREE.Fog(0x1a2a1a, 600, 1200);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera.position.set(900, 300, 1000);
    this.camera.lookAt(900, 0, 700);

    this.zoneLabelEl = document.getElementById('zone-label')!;
    this.interactPromptEl = document.getElementById('interact-prompt')!;

    this.buildWorld();
    this.player = new Player(this.scene, 900, 700);
    this.player.worldMinX = 20;
    this.player.worldMaxX = 1780;
    this.player.worldMinZ = 20;
    this.player.worldMaxZ = 1380;
    this.spawnNPCs();

    this.minimap = new Minimap();
    this.minimap.setZones(ZONES);

    this.renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 2) { this.isOrbiting = true; this.lastMX = e.clientX; }
    });
    this.renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isOrbiting) {
        const dx = e.clientX - this.lastMX;
        this.cameraAngle -= dx * 0.005;
        this.lastMX = e.clientX;
      }
    });
    this.renderer.domElement.addEventListener('mouseup', () => { this.isOrbiting = false; });
    this.renderer.domElement.addEventListener('contextmenu', (e: Event) => e.preventDefault());

    this.ambientLight = this.scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight;
    this.dirLight = this.scene.children.find(c => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    this.hemiLight = this.scene.children.find(c => c instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
  }

  private buildWorld(): void {
    const groundGeo = new THREE.PlaneGeometry(1800, 1400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(900, 0, 700);
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (const z of ZONES) {
      const zoneGeo = new THREE.PlaneGeometry(z.w - 4, z.h - 4);
      const zoneMat = new THREE.MeshStandardMaterial({ color: z.color, transparent: true, opacity: 0.15, roughness: 0.8 });
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(z.x + z.w / 2, 0.5, z.z + z.h / 2);
      this.scene.add(zoneMesh);

      const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.h));
      const borderMat = new THREE.LineBasicMaterial({ color: z.color, transparent: true, opacity: 0.4 });
      const border = new THREE.LineSegments(borderGeo, borderMat);
      border.rotation.x = -Math.PI / 2;
      border.position.set(z.x + z.w / 2, 0.6, z.z + z.h / 2);
      this.scene.add(border);

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 256, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(z.name, 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(z.x + z.w / 2, 8, z.z + 8);
      sprite.scale.set(40, 8, 1);
      this.scene.add(sprite);
    }

    const wallMat = new THREE.MeshBasicMaterial({ visible: false });
    const wallGeoH = new THREE.BoxGeometry(1800, 20, 2);
    const wallGeoV = new THREE.BoxGeometry(2, 20, 1400);
    const walls = [
      { geo: wallGeoH, x: 900, z: -1 }, { geo: wallGeoH, x: 900, z: 1401 },
      { geo: wallGeoV, x: -1, z: 700 }, { geo: wallGeoV, x: 1801, z: 700 },
    ];
    for (const w of walls) {
      const wall = new THREE.Mesh(w.geo, wallMat);
      wall.position.set(w.x, 10, w.z);
      this.scene.add(wall);
    }

    const treePositions = [
      [50,50],[80,120],[150,300],[200,500],[700,50],[750,80],[1100,50],[1150,80],
      [50,1100],[120,1150],[50,1300],[150,1350],[1700,50],[1750,120],[1700,1300],[1750,1350],
      [1600,600],[1650,800],[900,50],[950,50],[50,700],[100,750],
      [1700,700],[1750,750],[900,1350],[950,1350],
    ];
    for (const [tx, tz] of treePositions) {
      const t = this.createTree(tx, tz);
      this.scene.add(t);
    }

    const ambient = new THREE.AmbientLight(0x446644, 0.4);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffeedd, 1);
    dir.position.set(400, 400, 400);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 10;
    dir.shadow.camera.far = 800;
    dir.shadow.camera.left = -800;
    dir.shadow.camera.right = 800;
    dir.shadow.camera.top = 800;
    dir.shadow.camera.bottom = -800;
    this.scene.add(dir);
    const hemi = new THREE.HemisphereLight(0x88bbff, 0x446644, 0.3);
    this.scene.add(hemi);
  }

  private createTree(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4, 18, 6),
      new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 }),
    );
    trunk.position.y = 9;
    trunk.castShadow = true;
    g.add(trunk);
    const fol = new THREE.Mesh(
      new THREE.SphereGeometry(14, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.8 }),
    );
    fol.position.y = 22;
    fol.castShadow = true;
    fol.scale.y = 0.8;
    g.add(fol);
    const fol2 = new THREE.Mesh(
      new THREE.SphereGeometry(10, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.8 }),
    );
    fol2.position.set(4, 26, 3);
    fol2.castShadow = true;
    g.add(fol2);
    g.position.set(x, 0, z);
    return g;
  }

  private spawnNPCs(): void {
    const bio = getBio();
    const jobLogoMap: Record<string, string> = { 'Valmore-Neogen': 'valmore', 'ExpressTransfers': 'expresstransfers', 'Evalion-SHL': 'evalion', 'Newdeal Real Estates': 'newdeal', 'Datawise': 'datawise' };

    for (let i = 0; i < bio.projects.length; i++) {
      const p = bio.projects[i];
      this.npcs.push(new NPC(this.scene, p.position.x, p.position.y, 0x4488aa, p.title, `project_${p.id}`, 'project', p, i < 3 ? 60 : 0));
    }

    for (let i = 0; i < bio.jobs.length; i++) {
      const j = bio.jobs[i];
      this.npcs.push(new NPC(this.scene, j.position.x, j.position.y, 0xaa7744, j.company, `job_${j.id}`, 'job', j, i < 2 ? 50 : 0, jobLogoMap[j.company]));
    }

    for (const edu of bio.education) {
      this.npcs.push(new NPC(this.scene, edu.position.x, edu.position.y, 0xccaa44, edu.degree, `education_${edu.id}`, 'education', edu));
    }
  }

  update(dt: number): void {
    if (!this.player) return;

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.player.update(dt, camDir);

    const target = new THREE.Vector3(this.player.x, 12, this.player.z);
    const idealPos = new THREE.Vector3(
      target.x + Math.sin(this.cameraAngle) * this.cameraDist,
      target.y + this.cameraHeight,
      target.z + Math.cos(this.cameraAngle) * this.cameraDist,
    );
    this.camera.position.lerp(idealPos, 0.05);
    this.camera.lookAt(target);

    for (const npc of this.npcs) {
      npc.update(this.camera, this.renderer);
    }

    this.checkZone();

    if (this.player.isInteractPressed()) {
      this.player.consumeInteract();
      this.checkInteraction();
    }

    this.minimap.update(this.player.x, this.player.z);

    this.dayTime += dt * 2;
    const dayPhase = Math.sin(this.dayTime * Math.PI / 180);
    const normDay = (dayPhase + 1) / 2;
    if (this.ambientLight) this.ambientLight.intensity = 0.1 + normDay * 0.35;
    if (this.dirLight) this.dirLight.intensity = 0.2 + normDay * 0.8;
    if (this.hemiLight) this.hemiLight.intensity = 0.1 + normDay * 0.25;
    const bgBrightness = 0.1 + normDay * 0.15;
    this.scene.background = new THREE.Color(bgBrightness * 0.3, bgBrightness * 0.4, bgBrightness * 0.2);
  }

  private checkZone(): void {
    const px = this.player.x;
    const pz = this.player.z;
    for (const zone of ZONES) {
      if (px >= zone.x && px <= zone.x + zone.w && pz >= zone.z && pz <= zone.z + zone.h) {
        if (this.currentZone !== zone.name) {
          this.currentZone = zone.name;
          this.showZoneLabel(zone.name);
          AudioManager.get().playSfx('zoneEnter');
        }
        return;
      }
    }
    this.currentZone = '';
  }

  private showZoneLabel(name: string): void {
    this.zoneLabelEl.textContent = name;
    this.zoneLabelEl.style.opacity = '1';
    if (this.zoneLabelTimer !== null) clearTimeout(this.zoneLabelTimer);
    this.zoneLabelTimer = window.setTimeout(() => {
      this.zoneLabelEl.style.opacity = '0';
    }, 1500);
  }

  private checkInteraction(): void {
    const sceneMap: Record<string, string> = {
      Skills: 'SkillGardenScene',
      Projects: 'ProjectParkScene',
      Jobs: 'JobDistrictScene',
      Education: 'EducationCampusScene',
    };

    let closest: NPC | null = null;
    let minDist = 50;
    for (const npc of this.npcs) {
      const dx = this.player.x - npc.mesh.position.x;
      const dz = this.player.z - npc.mesh.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) { minDist = d; closest = npc; }
    }

    if (closest) {
      this.interactWithNPC(closest);
      return;
    }

    if (sceneMap[this.currentZone]) {
      AudioManager.get().stopBgm(0.3);
      this.cleanupNPCs();
      this.onSceneChange(sceneMap[this.currentZone]);
    }
  }

  private interactWithNPC(npc: NPC): void {
    AudioManager.get().playSfx('interact');
    npc.markVisited();
    const type = npc.type;
    const data = npc.data;
    let html = '';
    if (type === 'project') {
      html = `# ${data.title}\n${data.description}\n\nTech: ${data.tech.join(', ')}\n\nLink: ${data.link}`;
    } else if (type === 'job') {
      html = `# ${data.company}\n${data.role} | ${data.period}\n\n${data.highlights.map((h: string) => `• ${h}`).join('\n')}`;
    } else if (type === 'education') {
      html = `# ${data.degree}\n${data.school} — ${data.year}\n\n${data.description || ''}`;
    }
    const greeting = `Hello! Let me tell you about this ${type}...`;
    this.dialogue.show([greeting], npc.npcName, null, () => {
      this.modal.show(html);
    });
  }

  private cleanupNPCs(): void {
    for (const npc of this.npcs) npc.destroy();
    this.npcs = [];
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    this.minimap.destroy();
    for (const npc of this.npcs) npc.destroy();
    this.npcs = [];
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
  }
}
