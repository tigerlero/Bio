import * as THREE from 'three';

export class Player {
  public mesh: THREE.Group;
  public x = 400;
  public z = 350;
  public speed = 80;
  public worldMinX = 10;
  public worldMaxX = 890;
  public worldMinZ = 10;
  public worldMaxZ = 690;
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private direction = new THREE.Vector3(0, 0, -1);
  private targetRotation = 0;
  private keys: Record<string, boolean> = {};
  private dustParticles: THREE.Points | null = null;
  private dustTimer = 0;

  constructor(private scene: THREE.Scene, spawnX: number, spawnZ: number) {
    this.x = spawnX;
    this.z = spawnZ;
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.castShadow = true;

    const bodyGeo = new THREE.CylinderGeometry(6, 7, 16, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 8;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    const headGeo = new THREE.SphereGeometry(5, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 20;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeGeo = new THREE.SphereGeometry(1.2, 6, 6);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-2.5, 20.5, 4.5);
    this.mesh.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(2.5, 20.5, 4.5);
    this.mesh.add(rEye);

    const shadowGeo = new THREE.CircleGeometry(8, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.1;
    this.mesh.add(shadow);

    document.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  isInteractPressed(): boolean {
    return this.keys['e'] || false;
  }

  consumeInteract(): void {
    this.keys['e'] = false;
  }

  update(dt: number, cameraDir: THREE.Vector3): boolean {
    let vx = 0;
    let vz = 0;

    const forward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys['w'] || this.keys['arrowup']) { vx += forward.x; vz += forward.z; }
    if (this.keys['s'] || this.keys['arrowdown']) { vx -= forward.x; vz -= forward.z; }
    if (this.keys['a'] || this.keys['arrowleft']) { vx -= right.x; vz -= right.z; }
    if (this.keys['d'] || this.keys['arrowright']) { vx += right.x; vz += right.z; }

    const moving = vx !== 0 || vz !== 0;
    if (moving) {
      const len = Math.sqrt(vx * vx + vz * vz);
      vx /= len;
      vz /= len;
      this.x += vx * this.speed * dt;
      this.z += vz * this.speed * dt;
      this.x = Math.max(this.worldMinX, Math.min(this.worldMaxX, this.x));
      this.z = Math.max(this.worldMinZ, Math.min(this.worldMaxZ, this.z));
      this.targetRotation = Math.atan2(vx, vz);

      // Footstep dust
      this.dustTimer += dt;
      if (this.dustTimer > 0.3) {
        this.dustTimer = 0;
        this.emitDust();
      }
    }

    let diff = this.targetRotation - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, dt * 8);

    this.mesh.position.set(this.x, 0, this.z);
    return moving;
  }

  private emitDust(): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    for (let i = 0; i < 3; i++) {
      positions[i * 3] = this.x + (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = 0.2;
      positions[i * 3 + 2] = this.z + (Math.random() - 0.5) * 6;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x887766, transparent: true, opacity: 0.3, size: 1.5 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    let life = 0.4;
    const fade = setInterval(() => {
      life -= 0.05;
      mat.opacity = Math.max(0, life * 0.75);
      if (life <= 0) { clearInterval(fade); this.scene.remove(points); geo.dispose(); mat.dispose(); }
    }, 50);
  }

  getWorldPos(): THREE.Vector3 {
    return new THREE.Vector3(this.x, 0, this.z);
  }
}
