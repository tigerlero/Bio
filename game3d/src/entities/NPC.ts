import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem';

export class NPC {
  public mesh: THREE.Group;
  public npcName: string;
  public dataId: string;
  public data: any;
  public type: string;
  private labelEl: HTMLElement;
  private visitedEl: HTMLElement | null = null;
  private bodyY = 0;
  private bobDir = 1;
  private bobParts: THREE.Mesh[] = [];
  private walkPhase = 0;
  private pathOrigin: { x: number; z: number };
  private walkRange: number;
  private movingForward = true;
  private pathSpeed = 0.3;
  private visited = false;

  constructor(
    private scene: THREE.Scene,
    x: number, z: number,
    color: number,
    name: string,
    dataId: string,
    type: string,
    data: any,
    walkRange = 0,
    private logoKey?: string,
  ) {
    this.npcName = name;
    this.dataId = dataId;
    this.type = type;
    this.data = data;
    this.pathOrigin = { x, z };
    this.walkRange = walkRange;

    const visitedIds = SaveSystem.load<string[]>('visited_npcs', []);
    this.visited = visitedIds.includes(dataId);

    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);

    if (type === 'job') {
      const geo = new THREE.BoxGeometry(20, 30, 20);
      const mat = new THREE.MeshStandardMaterial({ color });
      const box = new THREE.Mesh(geo, mat);
      box.position.y = 15;
      box.castShadow = true;
      box.userData.baseY = 15;
      this.mesh.add(box);
      this.bobParts.push(box);
    } else {
      const bodyMat = new THREE.MeshStandardMaterial({ color });
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(5, 12, 8, 8), bodyMat);
      torso.position.y = 11;
      torso.castShadow = true;
      torso.userData.baseY = 11;
      this.mesh.add(torso);
      this.bobParts.push(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc88 }));
      head.position.y = 24;
      head.castShadow = true;
      head.userData.baseY = 24;
      this.mesh.add(head);
      this.bobParts.push(head);
    }

    const shadowGeo = new THREE.CircleGeometry(10, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.1;
    this.mesh.add(shadow);

    scene.add(this.mesh);

    this.labelEl = document.createElement('div');
    this.labelEl.style.cssText = 'position:absolute;color:#fff;font-family:monospace;font-size:11px;text-shadow:0 0 4px #000;pointer-events:none;text-align:center;';

    if (logoKey) {
      this.labelEl.innerHTML = `<img src="logos/${logoKey}.png" style="height:14px;display:block;margin:0 auto 2px;">${name}`;
    } else {
      this.labelEl.textContent = name;
    }
    this.labelEl.style.background = 'rgba(0,0,0,0.4)';
    this.labelEl.style.padding = '2px 6px';
    this.labelEl.style.borderRadius = '3px';
    this.labelEl.style.whiteSpace = 'nowrap';
    document.body.appendChild(this.labelEl);

    if (!this.visited) {
      this.visitedEl = document.createElement('div');
      this.visitedEl.textContent = 'NEW';
      this.visitedEl.style.cssText = 'position:absolute;color:#ffcc00;font-family:monospace;font-size:9px;font-weight:bold;pointer-events:none;text-shadow:0 0 4px #000;background:rgba(0,0,0,0.5);padding:1px 4px;border-radius:2px;';
      document.body.appendChild(this.visitedEl);
    }
  }

  markVisited(): void {
    if (this.visited) return;
    this.visited = true;
    if (this.visitedEl) { this.visitedEl.remove(); this.visitedEl = null; }
    const visitedIds = SaveSystem.load<string[]>('visited_npcs', []);
    if (!visitedIds.includes(this.dataId)) {
      visitedIds.push(this.dataId);
      SaveSystem.save('visited_npcs', visitedIds);
    }
  }

  getIsVisited(): boolean { return this.visited; }

  update(camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.bodyY += 0.02 * this.bobDir;
    if (Math.abs(this.bodyY) > 2) this.bobDir *= -1;
    const bob = this.bodyY * 0.2;
    for (const part of this.bobParts) {
      part.position.y = (part.userData.baseY || 0) + bob;
    }

    if (this.walkRange > 0) {
      this.walkPhase += 0.01;
      const dx = Math.sin(this.walkPhase) * this.walkRange;
      this.mesh.position.x = this.pathOrigin.x + dx;
      this.mesh.position.z = this.pathOrigin.z + Math.cos(this.walkPhase * 0.7) * this.walkRange * 0.5;
    }

    const pos = new THREE.Vector3();
    this.mesh.getWorldPosition(pos);
    pos.y += 30;
    pos.project(camera);
    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    const lx = `${(pos.x * 0.5 + 0.5) * w}px`;
    const ly = `${(-pos.y * 0.5 + 0.5) * h}px`;
    this.labelEl.style.left = lx;
    this.labelEl.style.top = ly;
    if (this.visitedEl) {
      this.visitedEl.style.left = lx;
      this.visitedEl.style.top = `${(-pos.y * 0.5 + 0.5) * h + 28}px`;
    }
  }

  destroy(): void {
    this.labelEl.remove();
    if (this.visitedEl) this.visitedEl.remove();
    this.scene.remove(this.mesh);
    this.mesh.traverse((c) => {
      if (c instanceof THREE.Mesh) { c.geometry.dispose(); if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose(); }
    });
  }
}
