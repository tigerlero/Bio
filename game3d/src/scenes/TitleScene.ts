import * as THREE from 'three';
import { Player } from '../entities/Player';

export class TitleScene3D {
  public scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  public getCamera(): THREE.PerspectiveCamera { return this.camera; }
  private renderer: THREE.WebGLRenderer;
  private started = false;
  private particles: { mesh: THREE.Mesh; vx: number; vy: number }[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private linkSprite: THREE.Sprite;
  private linkHovered = false;
  private playerMesh: THREE.Group;

  constructor(
    private renderer_: THREE.WebGLRenderer,
    private onStart: () => void,
  ) {
    this.renderer = renderer_;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1a0a);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 200);
    this.camera.position.set(0, 30, 80);
    this.camera.lookAt(0, 0, 0);

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Floating particles
    const pGeo = new THREE.SphereGeometry(0.3, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    for (let i = 0; i < 50; i++) {
      const m = new THREE.Mesh(pGeo, pMat);
      m.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20 - 10);
      this.scene.add(m);
      this.particles.push({ mesh: m, vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1 });
    }

    // Player mesh - same character as in Overworld
    this.playerMesh = Player.createVisualMesh(this.scene, 0, 20);
    this.playerMesh.rotation.y = Math.PI;

    // Title text
    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 512; titleCanvas.height = 80;
    const tctx = titleCanvas.getContext('2d')!;
    tctx.fillStyle = '#44ff88'; tctx.font = 'bold 40px monospace'; tctx.textAlign = 'center';
    tctx.fillText('✦ BIO EXPLORER 3D ✦', 256, 50);
    const titleTex = new THREE.CanvasTexture(titleCanvas);
    const titleSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: titleTex, transparent: true, depthTest: false }));
    titleSprite.position.set(0, 22, 0);
    titleSprite.scale.set(60, 9, 1);
    this.scene.add(titleSprite);

    const subCanvas = document.createElement('canvas');
    subCanvas.width = 400; subCanvas.height = 40;
    const sctx = subCanvas.getContext('2d')!;
    sctx.fillStyle = '#88ffbb'; sctx.font = '20px monospace'; sctx.textAlign = 'center';
    sctx.fillText('Panagiotis Efstathiadis', 200, 28);
    const subTex = new THREE.CanvasTexture(subCanvas);
    const subSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: subTex, transparent: true, depthTest: false }));
    subSprite.position.set(0, 12, 0);
    subSprite.scale.set(40, 4, 1);
    this.scene.add(subSprite);

    const promptCanvas = document.createElement('canvas');
    promptCanvas.width = 400; promptCanvas.height = 40;
    const pctx = promptCanvas.getContext('2d')!;
    pctx.fillStyle = '#ffffff'; pctx.font = '18px monospace'; pctx.textAlign = 'center';
    pctx.fillText(isMobile ? 'Tap to start' : 'Press ENTER or SPACE to start', 200, 28);
    const promptTex = new THREE.CanvasTexture(promptCanvas);
    const promptSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: promptTex, transparent: true, depthTest: false }));
    promptSprite.position.set(0, -24, 0);
    promptSprite.scale.set(40, 4, 1);
    this.scene.add(promptSprite);

    if (!isMobile) {
      const controlCanvas = document.createElement('canvas');
      controlCanvas.width = 400; controlCanvas.height = 40;
      const cctx = controlCanvas.getContext('2d')!;
      cctx.fillStyle = '#667766'; cctx.font = '12px monospace'; cctx.textAlign = 'center';
      cctx.fillText('WASD — Move  |  Right-drag — Orbit  |  E — Interact  |  ESC — Pause', 200, 20);
      const controlTex = new THREE.CanvasTexture(controlCanvas);
      const controlSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: controlTex, transparent: true, depthTest: false }));
      controlSprite.position.set(0, -32, 0);
      controlSprite.scale.set(50, 3, 1);
      this.scene.add(controlSprite);
    }

    // Web link (clickable)
    const linkCanvas = document.createElement('canvas');
    linkCanvas.width = 300; linkCanvas.height = 40;
    const lctx = linkCanvas.getContext('2d')!;
    lctx.fillStyle = '#4488aa'; lctx.font = '14px monospace'; lctx.textAlign = 'center';
    lctx.fillText('< Back to Website', 150, 24);
    const linkTex = new THREE.CanvasTexture(linkCanvas);
    this.linkSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: linkTex, transparent: true, depthTest: false }));
    this.linkSprite.position.set(0, isMobile ? -36 : -40, 0);
    this.linkSprite.scale.set(30, 3, 1);
    this.scene.add(this.linkSprite);

    // Ambient + directional light to illuminate player mesh
    this.scene.add(new THREE.AmbientLight(0x446644, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(20, 40, 60);
    this.scene.add(dirLight);

    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !this.started) {
        this.started = true;
        this.onStart();
      }
    });

    // Click/tap to start (or go back via link)
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (this.started) return;
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.mouse.x = (cx / window.innerWidth) * 2 - 1;
      this.mouse.y = -(cy / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children);
      for (const hit of intersects) {
        if (hit.object === this.linkSprite) {
          window.location.href = '../';
          return;
        }
      }
      this.started = true;
      this.onStart();
    };

    this.renderer.domElement.addEventListener('click', handleClick);
    this.renderer.domElement.addEventListener('touchstart', handleClick, { passive: true });

    // Hover effect for back link
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children);
      this.linkHovered = false;
      for (const hit of intersects) {
        if (hit.object === this.linkSprite) { this.linkHovered = true; break; }
      }
      this.renderer.domElement.style.cursor = this.linkHovered ? 'pointer' : 'default';
    });
  }

  update(_dt: number): void {
    for (const p of this.particles) {
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      if (Math.abs(p.mesh.position.x) > 30) p.vx *= -1;
      if (Math.abs(p.mesh.position.y) > 20) p.vy *= -1;
    }
    this.camera.position.x = Math.sin(Date.now() * 0.0003) * 5;
    this.camera.lookAt(0, 0, 0);

    // Gentle idle sway on player
    this.playerMesh.rotation.y = Math.PI + Math.sin(Date.now() * 0.0008) * 0.15;
    this.playerMesh.position.y = Math.sin(Date.now() * 0.002) * 0.5;

    // Link hover pulse
    if (this.linkHovered) {
      const s = 30 + Math.sin(Date.now() * 0.008) * 1.5;
      this.linkSprite.scale.set(s, 3 + s * 0.1, 1);
    } else {
      this.linkSprite.scale.set(30, 3, 1);
    }
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
