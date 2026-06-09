import * as THREE from 'three';

export function createPlayer(scene: THREE.Scene, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x224488 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(6, 14, 8, 8), bodyMat);
  torso.position.y = 13; torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), skinMat);
  head.position.y = 31; head.castShadow = true;
  g.add(head);

  const armGeo = new THREE.CylinderGeometry(1.5, 1.5, 14, 6);
  const lArm = new THREE.Mesh(armGeo, darkMat);
  lArm.position.set(-9, 18, 0); lArm.castShadow = true;
  g.add(lArm);
  const rArm = new THREE.Mesh(armGeo, darkMat);
  rArm.position.set(9, 18, 0); rArm.castShadow = true;
  g.add(rArm);

  const legGeo = new THREE.CylinderGeometry(2, 2, 12, 6);
  const lLeg = new THREE.Mesh(legGeo, darkMat);
  lLeg.position.set(-3, 6, 0); lLeg.castShadow = true;
  g.add(lLeg);
  const rLeg = new THREE.Mesh(legGeo, darkMat);
  rLeg.position.set(3, 6, 0); rLeg.castShadow = true;
  g.add(rLeg);

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
