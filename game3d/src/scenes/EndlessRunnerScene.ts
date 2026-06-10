import * as THREE from 'three';
import { Player } from '../entities/Player';
import { AudioManager } from '../systems/AudioManager';

const LANES = [-22, 0, 22];
const SPAWN_Z = -200;
const DESPAWN_Z = 35;
const ROAD_W = 72;
const ROAD_L = 5000;
const BASE_SPEED = 18;
const MAX_SPEED = 70;
const ACCEL = 1.8;
const LANE_SWITCH_SPEED = 10;
const PLAYER_Z = 0;
const PLAYER_Y = 1;
const PLAYER_SCALE = 0.35;

const OBS_TYPES = ['bug', 'spaghetti', 'techdebt'] as const;
const COLL_TYPES = ['clean', 'tests', 'docs'] as const;

type ObsType = (typeof OBS_TYPES)[number];
type CollType = (typeof COLL_TYPES)[number];

interface ObsData {
  meshes: { mesh: THREE.Mesh; baseY: number }[];
  lane: number;
  z: number;
  type: ObsType;
  alive: boolean;
}

interface CollData {
  mesh: THREE.Mesh;
  lane: number;
  z: number;
  type: CollType;
  alive: boolean;
}

export class EndlessRunnerScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private onSceneChange: (key: string) => void;

  private playerGroup: THREE.Group;
  private currentLane = 1;
  private targetX = 0;
  private bobPhase = 0;

  private obstacles: ObsData[] = [];
  private collectibles: CollData[] = [];
  private particles: THREE.Points[] = [];

  private score = 0;
  private lives = 3;
  private speed = BASE_SPEED;
  private gameOver = false;
  private spawnTimer = 0;
  private spawnInterval = 2.2;
  private distance = 0;
  private laneCooldown = 0;
  private invincibleTimer = 0;
  private flashOn = false;

  private roadTex!: THREE.CanvasTexture;
  private roadMesh!: THREE.Mesh;
  private uiContainer!: HTMLDivElement;
  private scoreEl!: HTMLDivElement;
  private livesEl!: HTMLDivElement;
  private speedEl!: HTMLDivElement;
  private gameOverEl!: HTMLDivElement;
  private keys: Record<string, boolean> = {};
  private collectedEffects: { mesh: THREE.Mesh; life: number }[] = [];

  constructor(
    renderer: THREE.WebGLRenderer,
    onSceneChange: (key: string) => void,
  ) {
    this.renderer = renderer;
    this.onSceneChange = onSceneChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f23);
    this.scene.fog = new THREE.Fog(0x0f0f23, 60, 300);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 500);
    this.camera.position.set(0, 8, 22);
    this.camera.lookAt(0, 0, -20);

    this.buildLighting();
    this.buildRoad();
    this.buildDecor();
    this.playerGroup = Player.createVisualMesh(this.scene, 0, PLAYER_Z, PLAYER_SCALE);
    this.playerGroup.position.y = PLAYER_Y;
    this.playerGroup.rotation.y = Math.PI;
    this.buildUI();
    this.setupInput();
    AudioManager.get().playBgm('runner');
  }

  private buildLighting(): void {
    this.scene.add(new THREE.AmbientLight(0x334466, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(30, 50, 40);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 10;
    dir.shadow.camera.far = 300;
    dir.shadow.camera.left = -80;
    dir.shadow.camera.right = 80;
    dir.shadow.camera.top = 80;
    dir.shadow.camera.bottom = -80;
    this.scene.add(dir);
    const hemi = new THREE.HemisphereLight(0x4466aa, 0x223344, 0.3);
    this.scene.add(hemi);
  }

  private buildRoad(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = '#2a2a44';
    for (let y = 0; y < 512; y += 16) {
      ctx.fillRect(0, y, 256, 1);
    }

    const laneW = 256 / 3;
    ctx.strokeStyle = '#4a4a66';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    for (let i = 1; i < 3; i++) {
      const lx = Math.round(laneW * i);
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, 512);
      ctx.stroke();
    }

    ctx.strokeStyle = '#5566aa';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(2, 0, 4, 512);
    ctx.strokeRect(250, 0, 4, 512);

    this.roadTex = new THREE.CanvasTexture(canvas);
    this.roadTex.wrapS = THREE.RepeatWrapping;
    this.roadTex.wrapT = THREE.RepeatWrapping;
    this.roadTex.repeat.set(1, 30);

    const roadGeo = new THREE.PlaneGeometry(ROAD_W, ROAD_L);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.8,
      metalness: 0.2,
    });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0, -ROAD_L / 2 + 20);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334466, transparent: true, opacity: 0.4 });
    for (const wx of [-ROAD_W / 2 - 2, ROAD_W / 2 + 2]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 6, ROAD_L), wallMat);
      wall.position.set(wx, 3, -ROAD_L / 2 + 20);
      this.scene.add(wall);
    }

    const glowMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15 });
    for (const gx of [-ROAD_W / 2 - 1, ROAD_W / 2 + 1]) {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, ROAD_L), glowMat);
      glow.position.set(gx, 0.1, -ROAD_L / 2 + 20);
      this.scene.add(glow);
    }
  }

  private buildDecor(): void {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 600;
      if (i % 3 === 1) positions[i] = Math.random() * 200 + 20;
      if (i % 3 === 2) positions[i] = (Math.random() - 0.5) * 600 - 100;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x8888cc, size: 0.5, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(starGeo, starMat);
    stars.position.z = -30;
    this.scene.add(stars);

    for (let i = 0; i < 80; i++) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 2 + Math.random() * 6, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x2244aa, emissive: 0x1122aa, emissiveIntensity: 0.2 }),
      );
      const side = Math.random() > 0.5 ? 1 : -1;
      pillar.position.set(
        side * (ROAD_W / 2 + 4 + Math.random() * 10),
        1 + Math.random() * 3,
        -Math.random() * ROAD_L,
      );
      this.scene.add(pillar);
    }
  }

  private buildUI(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position:absolute;inset:0;pointer-events:none;font-family:monospace;z-index:10;
    `;

    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      position:absolute;top:20px;left:50%;transform:translateX(-50%);
      color:#44ff88;font-size:24px;font-weight:bold;text-shadow:0 0 10px #44ff8844;
    `;
    this.scoreEl.textContent = '0';
    this.uiContainer.appendChild(this.scoreEl);

    this.livesEl = document.createElement('div');
    this.livesEl.style.cssText = `
      position:absolute;top:20px;left:20px;color:#ff4444;font-size:20px;text-shadow:0 0 8px #ff444444;
    `;
    this.livesEl.textContent = '\u2764\uFE0F\u2764\uFE0F\u2764\uFE0F';
    this.uiContainer.appendChild(this.livesEl);

    this.speedEl = document.createElement('div');
    this.speedEl.style.cssText = `
      position:absolute;top:24px;right:20px;color:#8888cc;font-size:14px;text-shadow:0 0 6px #8888cc44;
    `;
    this.speedEl.textContent = 'SPD: 1x';
    this.uiContainer.appendChild(this.speedEl);

    const hintEl = document.createElement('div');
    hintEl.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      color:#667788;font-size:12px;text-shadow:0 0 6px #000;
    `;
    hintEl.textContent = '\u2190 \u2192 A/D Switch lanes  |  ESC Exit';
    this.uiContainer.appendChild(hintEl);

    this.gameOverEl = document.createElement('div');
    this.gameOverEl.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      color:#ff4444;font-size:36px;font-weight:bold;text-shadow:0 0 20px #ff444488;
      text-align:center;display:none;
    `;
    this.uiContainer.appendChild(this.gameOverEl);

    document.body.appendChild(this.uiContainer);
  }

  private setupInput(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.gameOver) {
          this.returnToWorld();
        } else {
          this.gameOver = true;
          this.endGame();
        }
        return;
      }
      this.keys[e.key.toLowerCase()] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  update(dt: number): void {
    if (this.gameOver) return;

    this.speed = Math.min(MAX_SPEED, this.speed + ACCEL * dt);
    this.distance += this.speed * dt;
    this.spawnInterval = Math.max(0.5, 2.2 - this.distance * 0.00005);
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.laneCooldown = Math.max(0, this.laneCooldown - dt);

    this.roadTex.offset.y -= this.speed * dt * 0.004;

    const moveKeys = this.keys['a'] || this.keys['arrowleft'] || this.keys['d'] || this.keys['arrowright'];
    if (moveKeys && this.laneCooldown <= 0) {
      if (this.keys['a'] || this.keys['arrowleft']) {
        this.currentLane = Math.max(0, this.currentLane - 1);
        this.laneCooldown = 0.15;
      } else {
        this.currentLane = Math.min(2, this.currentLane + 1);
        this.laneCooldown = 0.15;
      }
    }
    this.targetX = LANES[this.currentLane];

    const dx = this.targetX - this.playerGroup.position.x;
    this.playerGroup.position.x += dx * Math.min(1, LANE_SWITCH_SPEED * dt);
    this.playerGroup.position.x = Math.round(this.playerGroup.position.x * 100) / 100;

    this.bobPhase += dt * (this.speed * 0.06);
    const bob = Math.sin(this.bobPhase) * 0.6;
    this.playerGroup.position.y = PLAYER_Y + bob * 0.3;

    this.playerGroup.rotation.z = -dx * 0.04;

    const lean = (this.keys['a'] || this.keys['arrowleft'] ? -1 : 0) + (this.keys['d'] || this.keys['arrowright'] ? 1 : 0);
    this.playerGroup.rotation.z += (lean * 0.08 - this.playerGroup.rotation.z) * Math.min(1, 4 * dt);

    Player.animateLegs(this.playerGroup, this.bobPhase * 1.5);

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
      if (Math.random() < 0.35) this.spawnCollectible();
    }

    this.updateObstacles(dt);
    this.updateCollectibles(dt);
    this.updateEffects(dt);
    this.updateUI();

    this.camera.position.x += (this.playerGroup.position.x * 0.3 - this.camera.position.x) * 0.03;
    this.camera.lookAt(this.playerGroup.position.x * 0.3, 1, -20);

    if (this.flashOn) {
      this.flashOn = false;
      this.scene.background = new THREE.Color(0x0f0f23);
    }
  }

  private spawnObstacle(): void {
    const lane = Math.floor(Math.random() * 3);
    const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
    const x = LANES[lane];
    const z = SPAWN_Z + Math.random() * 30;

    const meshes: { mesh: THREE.Mesh; baseY: number }[] = [];

    if (type === 'bug') {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x66bb33, emissive: 0x338811, emissiveIntensity: 0.2 }),
      );
      body.position.set(0, 4, 0);
      body.castShadow = true;
      meshes.push({ mesh: body, baseY: 4 });

      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eyeL.position.set(-1.5, 5.5, 3);
      meshes.push({ mesh: eyeL, baseY: 5.5 });
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eyeR.position.set(1.5, 5.5, 3);
      meshes.push({ mesh: eyeR, baseY: 5.5 });
    } else if (type === 'spaghetti') {
      const knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(3, 1.2, 40, 6),
        new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xcc2222, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.1 }),
      );
      knot.position.set(0, 4, 0);
      knot.castShadow = true;
      meshes.push({ mesh: knot, baseY: 4 });
    } else {
      const stack = new THREE.Mesh(
        new THREE.BoxGeometry(5, 5, 5),
        new THREE.MeshStandardMaterial({ color: 0x9944cc, emissive: 0x6622aa, emissiveIntensity: 0.15 }),
      );
      stack.position.set(0, 4.5, 0);
      stack.castShadow = true;
      meshes.push({ mesh: stack, baseY: 4.5 });
    }

    const grp = new THREE.Group();
    for (const m of meshes) grp.add(m.mesh);
    grp.position.set(x, 0, z);
    this.scene.add(grp);

    this.obstacles.push({ meshes, lane, z, type, alive: true });
  }

  private spawnCollectible(): void {
    const lane = Math.floor(Math.random() * 3);
    const type = COLL_TYPES[Math.floor(Math.random() * COLL_TYPES.length)];
    const x = LANES[lane];
    const z = SPAWN_Z + Math.random() * 40;

    const colorMap: Record<CollType, number> = { clean: 0x44ff88, tests: 0x4488ff, docs: 0xffcc44 };
    const emissiveMap: Record<CollType, number> = { clean: 0x22ff66, tests: 0x2266ff, docs: 0xffaa22 };
    const color = colorMap[type];
    const emissive = emissiveMap[type];

    const geo = type === 'clean' ? new THREE.SphereGeometry(2.5, 8, 8)
      : type === 'tests' ? new THREE.BoxGeometry(3.5, 3.5, 3.5)
      : new THREE.OctahedronGeometry(3, 0);

    const mat = new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 4, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.collectibles.push({ mesh, lane, z, type, alive: true });
  }

  private updateObstacles(dt: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (!obs.alive) continue;

      obs.z += this.speed * dt;
      const grp = obs.meshes[0].mesh.parent;
      if (grp) {
        grp.position.z = obs.z;
        for (const m of obs.meshes) {
          m.mesh.position.y = m.baseY + Math.sin(this.bobPhase + i) * 0.3;
          if (obs.type === 'spaghetti') m.mesh.rotation.y += dt * 1.5;
          if (obs.type === 'techdebt') m.mesh.rotation.x += dt * 0.5;
        }
      }

      if (obs.z > DESPAWN_Z) {
        this.destroyObs(i);
        continue;
      }

      if (this.invincibleTimer <= 0) {
        const px = this.playerGroup.position.x;
        if (Math.abs(px - LANES[obs.lane]) < 8 && Math.abs(obs.z - PLAYER_Z) < 5) {
          this.hitObstacle();
          this.destroyObs(i);
        }
      }
    }
  }

  private updateCollectibles(dt: number): void {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (!c.alive) continue;

      c.z += this.speed * dt;
      c.mesh.position.z = c.z;
      c.mesh.position.y = 4 + Math.sin(this.bobPhase + i * 2) * 1.2;
      c.mesh.rotation.y += dt * 2;
      const mat = c.mesh.material as THREE.MeshStandardMaterial;
      const pulse = 0.7 + Math.sin(this.bobPhase * 2 + i) * 0.3;
      mat.opacity = pulse;
      mat.emissiveIntensity = 0.2 + pulse * 0.3;

      if (c.z > DESPAWN_Z) {
        c.mesh.parent?.remove(c.mesh);
        c.mesh.geometry.dispose();
        mat.dispose();
        this.collectibles.splice(i, 1);
        continue;
      }

      const px = this.playerGroup.position.x;
      if (Math.abs(px - LANES[c.lane]) < 10 && Math.abs(c.z - PLAYER_Z) < 5) {
        this.collect(c.type);
        c.alive = false;
        this.spawnCollectEffect(LANES[c.lane]);
        c.mesh.parent?.remove(c.mesh);
        c.mesh.geometry.dispose();
        mat.dispose();
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnCollectEffect(x: number): void {
    const geo = new THREE.SphereGeometry(1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 2, PLAYER_Z);
    this.scene.add(mesh);
    this.collectedEffects.push({ mesh, life: 0.4 });
  }

  private updateEffects(dt: number): void {
    for (let i = this.collectedEffects.length - 1; i >= 0; i--) {
      const e = this.collectedEffects[i];
      e.life -= dt;
      const s = 1 + (0.4 - e.life) * 8;
      e.mesh.scale.set(s, s, s);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, e.life / 0.4);
      e.mesh.position.y += dt * 6;
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        (e.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.collectedEffects.splice(i, 1);
      }
    }
  }

  private hitObstacle(): void {
    this.lives--;
    this.invincibleTimer = 1.5;
    this.flashOn = true;
    this.scene.background = new THREE.Color(0x441111);
    this.camera.position.z += 2;

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  private collect(type: CollType): void {
    const points = type === 'clean' ? 100 : type === 'tests' ? 50 : 75;
    this.score += points;
  }

  private destroyObs(i: number): void {
    const obs = this.obstacles[i];
    obs.alive = false;
    const grp = obs.meshes[0].mesh.parent;
    if (grp) {
      this.scene.remove(grp);
      for (const m of obs.meshes) {
        m.mesh.geometry.dispose();
        const mat = m.mesh.material;
        if (Array.isArray(mat)) mat.forEach(m2 => m2.dispose()); else mat.dispose();
      }
    }
    this.obstacles.splice(i, 1);
  }

  private endGame(): void {
    this.gameOver = true;
    this.gameOverEl.style.display = 'block';
    this.gameOverEl.innerHTML = `
      CODE SPRINT OVER<br>
      <span style="font-size:18px;color:#44ff88;">Score: ${this.score}</span><br>
      <span style="font-size:14px;color:#8888cc;">Distance: ${Math.floor(this.distance)}m</span><br>
      <span style="font-size:12px;color:#667788;margin-top:20px;display:block;">ESC to exit</span>
    `;
  }

  private updateUI(): void {
    this.scoreEl.textContent = `${this.score}`;
    const hearts = '\u2764\uFE0F'.repeat(Math.max(0, this.lives));
    const empty = '\u2661'.repeat(Math.max(0, 3 - this.lives));
    this.livesEl.textContent = hearts + empty;
    this.speedEl.textContent = `SPD: ${(this.speed / BASE_SPEED).toFixed(1)}x`;
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy(): void {
    for (const obs of this.obstacles) {
      const grp = obs.meshes[0].mesh.parent;
      if (grp) { this.scene.remove(grp); }
      for (const m of obs.meshes) {
        m.mesh.geometry.dispose();
        const mat = m.mesh.material;
        if (Array.isArray(mat)) mat.forEach(m2 => m2.dispose()); else mat.dispose();
      }
    }
    this.obstacles = [];
    for (const c of this.collectibles) {
      c.mesh.geometry.dispose();
      const mat = c.mesh.material;
      if (Array.isArray(mat)) mat.forEach(m2 => m2.dispose()); else mat.dispose();
    }
    this.collectibles = [];
    for (const p of this.particles) {
      p.geometry.dispose();
      const pmat = p.material;
      if (Array.isArray(pmat)) pmat.forEach(m2 => m2.dispose()); else pmat.dispose();
    }
    this.particles = [];
    for (const e of this.collectedEffects) {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      (e.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.collectedEffects = [];
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    if (this.uiContainer.parentNode) this.uiContainer.parentNode.removeChild(this.uiContainer);
  }

  private returnToWorld(): void {
    AudioManager.get().stopBgm(0.2);
    this.destroy();
    this.onSceneChange('OverworldScene');
  }
}
