import * as THREE from 'three';

export class Player {
  public mesh: THREE.Group;
  public x = 400;
  public z = 350;
  public speed = 140;
  public baseSpeed = 140;
  public coffeeBoostTimer = 0;
  public worldMinX = 20;
  public worldMaxX = 2580;
  public worldMinZ = 20;
  public worldMaxZ = 1980;
  private bodyParts: THREE.Mesh[] = [];
  private bodyY = 0;
  private bobDir = 1;
  private direction = new THREE.Vector3(0, 0, -1);
  private targetRotation = 0;
  private keys: Record<string, boolean> = {};
  private dustTimer = 0;

  constructor(private scene: THREE.Scene, spawnX: number, spawnZ: number) {
    this.x = spawnX;
    this.z = spawnZ;
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.castShadow = true;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x224488 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(6, 14, 8, 8), bodyMat);
    torso.position.y = 13;
    torso.castShadow = true;
    this.mesh.add(torso);
    torso.userData.baseY = 13;
    this.bodyParts.push(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), skinMat);
    head.position.y = 31;
    head.castShadow = true;
    this.mesh.add(head);

    const armGeo = new THREE.CylinderGeometry(1.5, 1.5, 14, 6);
    const lArm = new THREE.Mesh(armGeo, darkMat);
    lArm.position.set(-9, 18, 0);
    lArm.castShadow = true;
    this.mesh.add(lArm);
    lArm.userData.baseY = 18;
    this.bodyParts.push(lArm);

    const rArm = new THREE.Mesh(armGeo, darkMat);
    rArm.position.set(9, 18, 0);
    rArm.castShadow = true;
    this.mesh.add(rArm);
    rArm.userData.baseY = 18;
    this.bodyParts.push(rArm);

    const legGeo = new THREE.CylinderGeometry(2, 2, 12, 6);
    const lLeg = new THREE.Mesh(legGeo, darkMat);
    lLeg.position.set(-3, 6, 0);
    lLeg.castShadow = true;
    this.mesh.add(lLeg);
    lLeg.userData.baseY = 6;
    this.bodyParts.push(lLeg);

    const rLeg = new THREE.Mesh(legGeo, darkMat);
    rLeg.position.set(3, 6, 0);
    rLeg.castShadow = true;
    this.mesh.add(rLeg);
    rLeg.userData.baseY = 6;
    this.bodyParts.push(rLeg);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeGeo = new THREE.SphereGeometry(1.2, 6, 6);
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-2.5, 32, 4.5);
    this.mesh.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(2.5, 32, 4.5);
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
    if (this.coffeeBoostTimer > 0) {
      this.coffeeBoostTimer -= dt;
      this.speed = this.baseSpeed * 1.5;
    } else {
      this.speed = this.baseSpeed;
    }

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

      this.dustTimer += dt;
      if (this.dustTimer > 0.3) {
        this.dustTimer = 0;
        this.emitDust();
      }
    }

    this.bodyY += 0.03 * this.bobDir;
    if (Math.abs(this.bodyY) > 1.5) this.bobDir *= -1;
    const bob = this.bodyY * 0.25;
    for (const part of this.bodyParts) {
      part.position.y = (part.userData.baseY || 0) + bob;
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
