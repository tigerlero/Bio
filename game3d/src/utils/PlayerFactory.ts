import * as THREE from 'three';

export function createPlayer(scene: THREE.Scene, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 16, 8), new THREE.MeshStandardMaterial({ color: 0x3366cc }));
  body.position.y = 8; body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc88 }));
  head.position.y = 20; head.castShadow = true;
  g.add(head);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(8, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.1;
  g.add(shadow);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

export function updatePlayerPosition(player: THREE.Group, x: number, z: number): void {
  player.position.set(x, 0, z);
}

export function updatePlayerRotation(player: THREE.Group, targetDir: number, dt: number): void {
  let diff = targetDir - player.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  player.rotation.y += diff * Math.min(1, dt * 8);
}
