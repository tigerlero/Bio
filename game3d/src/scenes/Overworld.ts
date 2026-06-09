import * as THREE from 'three';
import { getBio } from '../data/bioLoader';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { AudioManager } from '../systems/AudioManager';
import { Minimap } from '../utils/Minimap';

interface Zone3D { name: string; x: number; z: number; w: number; h: number; color: number; }

interface CoffeeShop3D { name: string; x: number; z: number; tagline: string; }
const COFFEE_SHOPS: CoffeeShop3D[] = [
  { name: 'Central Perk ☕', x: 950, z: 700, tagline: 'Where everybody knows your code!' },
  { name: 'Code Brew ☕', x: 1750, z: 700, tagline: 'Brewing the perfect espresso!' },
  { name: 'Study Bean ☕', x: 950, z: 1250, tagline: 'Fuel for your algorithms!' },
];

const ZONES: Zone3D[] = [
  { name: 'Home', x: 1050, z: 750, w: 500, h: 400, color: 0x3a6a3a },
  { name: 'Projects', x: 100, z: 100, w: 700, h: 550, color: 0x2a4a7a },
  { name: 'Jobs', x: 1800, z: 100, w: 700, h: 550, color: 0x7a4a2a },
  { name: 'Education', x: 100, z: 1350, w: 700, h: 550, color: 0x7a6a2a },
  { name: 'Skills', x: 1800, z: 1350, w: 700, h: 550, color: 0x6a2a7a },
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
    this.player = new Player(this.scene, 1300, 950);
    this.player.worldMinX = 20;
    this.player.worldMaxX = 2580;
    this.player.worldMinZ = 20;
    this.player.worldMaxZ = 1980;
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
    const groundGeo = new THREE.PlaneGeometry(2600, 2000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(1300, 0, 1000);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Street network (wide paths between zones)
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x7a6a4a, roughness: 1, transparent: true, opacity: 0.45 });
    // Main horizontal street
    const hr = new THREE.Mesh(new THREE.PlaneGeometry(2600, 48), streetMat);
    hr.rotation.x = -Math.PI / 2; hr.position.set(1300, 0.2, 712); this.scene.add(hr);
    // Bottom horizontal street
    const hr2 = new THREE.Mesh(new THREE.PlaneGeometry(2600, 48), streetMat);
    hr2.rotation.x = -Math.PI / 2; hr2.position.set(1300, 0.2, 1336); this.scene.add(hr2);
    // Left vertical street
    const vl = new THREE.Mesh(new THREE.PlaneGeometry(48, 2000), streetMat);
    vl.rotation.x = -Math.PI / 2; vl.position.set(862, 0.2, 1000); this.scene.add(vl);
    // Right vertical street
    const vr = new THREE.Mesh(new THREE.PlaneGeometry(48, 2000), streetMat);
    vr.rotation.x = -Math.PI / 2; vr.position.set(1738, 0.2, 1000); this.scene.add(vr);

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

    // Coffee shop zone markers (small colored squares)
    const coffeeColors = [0x6f4e37, 0x8b5e3c, 0xa0522d];
    for (let i = 0; i < COFFEE_SHOPS.length; i++) {
      const cs = COFFEE_SHOPS[i];
      const cMat = new THREE.MeshStandardMaterial({ color: coffeeColors[i], transparent: true, opacity: 0.3, roughness: 0.8 });
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), cMat);
      cMesh.rotation.x = -Math.PI / 2;
      cMesh.position.set(cs.x, 0.3, cs.z);
      this.scene.add(cMesh);
      const cupCanvas = document.createElement('canvas');
      cupCanvas.width = 128; cupCanvas.height = 64;
      const ctx2 = cupCanvas.getContext('2d')!;
      ctx2.fillStyle = 'rgba(0,0,0,0)'; ctx2.fillRect(0, 0, 128, 64);
      ctx2.fillStyle = '#eebb88'; ctx2.font = '32px monospace'; ctx2.textAlign = 'center';
      ctx2.fillText('☕ ' + cs.name.replace(' ☕',''), 64, 40);
      const cupTex = new THREE.CanvasTexture(cupCanvas);
      const cupSpriteMat = new THREE.SpriteMaterial({ map: cupTex, transparent: true, depthTest: false });
      const cupSprite = new THREE.Sprite(cupSpriteMat);
      cupSprite.position.set(cs.x, 10, cs.z);
      cupSprite.scale.set(30, 12, 1);
      this.scene.add(cupSprite);
    }

    const wallMat = new THREE.MeshBasicMaterial({ visible: false });
    const wallGeoH = new THREE.BoxGeometry(2600, 20, 2);
    const wallGeoV = new THREE.BoxGeometry(2, 20, 2000);
    const walls = [
      { geo: wallGeoH, x: 1300, z: -1 }, { geo: wallGeoH, x: 1300, z: 2001 },
      { geo: wallGeoV, x: -1, z: 1000 }, { geo: wallGeoV, x: 2601, z: 1000 },
    ];
    for (const w of walls) {
      const wall = new THREE.Mesh(w.geo, wallMat);
      wall.position.set(w.x, 10, w.z);
      this.scene.add(wall);
    }

    const treePositions = [
      [50,50],[80,120],[150,300],[200,500],[450,50],[500,80],[550,50],
      [850,80],[850,120],[900,50],[1100,50],[1150,80],[1200,50],
      [1400,100],[1450,300],[1500,500],[1550,200],[1600,100],
      [1800,50],[1850,80],[1900,50],[1950,120],[2000,50],
      [2150,80],[2200,50],[2300,120],[2400,50],[2500,80],
      [50,650],[100,680],[150,620],[200,660],[250,640],
      [2350,650],[2400,680],[2450,620],[2500,660],
      [50,1380],[100,1420],[150,1360],[200,1400],
      [2350,1380],[2400,1420],[2450,1360],[2500,1400],
      [50,1800],[80,1850],[150,1900],[200,1950],[450,1920],
      [850,1850],[900,1900],[1100,1950],[1150,1880],
      [1400,1920],[1450,1900],[1500,1850],[1550,1950],
      [1800,1800],[1850,1880],[1900,1920],[1950,1900],
      [2150,1950],[2200,1880],[2300,1850],[2400,1900],[2500,1920],
      [1100,1200],[1150,1250],[1200,1180],[1250,1220],
      [1100,1350],[1150,1380],[1200,1330],[1250,1370],
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

    // Coffee shops
    for (const cs of COFFEE_SHOPS) {
      const fake: any = {
        id: `coffee_${cs.name.replace(/[^a-z]/gi, '_').toLowerCase()}`,
        degree: '☕ Freddo Espresso',
        company: cs.name,
        role: 'Barista',
        period: 'Always open',
        highlights: [cs.tagline],
        position: { x: cs.x, y: cs.z },
      };
      this.npcs.push(new NPC(this.scene, cs.x, cs.z, 0x6f4e37, cs.name, `coffee_${cs.name}`, 'coffee', fake));
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
    if (type === 'coffee') {
      this.dialogue.show([
        `☕ Welcome to ${npc.npcName}!`,
        'Fresh freddo espresso — €2.50',
        'Press E to buy ☕',
      ], npc.npcName, null, () => {
        this.dialogue.show([
          '☕ Enjoy your freddo espresso!',
          'You feel energized and ready to code!',
          '+50% speed boost for 10 seconds!',
        ], npc.npcName, null, () => {
          this.player.coffeeBoostTimer = 10;
        });
      });
      return;
    }
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
