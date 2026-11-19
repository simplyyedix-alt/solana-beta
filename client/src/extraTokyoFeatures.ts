// extraTokyoFeatures.ts – adds fun extra geometry (river, bridges, random tall boxes)
import * as THREE from 'three';

/**
 * Adds a simple river (blue plane) and a few crazy bridges / tall boxes.
 * Call after the main Tokyo tiles are loaded.
 */
export const addExtraFeatures = (scene: THREE.Scene) => {
  // ---- River (a long thin plane) ----
  const riverGeom = new THREE.PlaneGeometry(2000, 200);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x3366ff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.0,
  });
  const river = new THREE.Mesh(riverGeom, riverMat);
  // Position the river at y=0.1 above ground, rotate to lie flat (plane defaults to XY)
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.1, -500); // adjust Z as you like
  scene.add(river);

  // ---- Crazy bridges (simple arch using two vertical posts and a top beam) ----
  const bridgeCount = 3;
  for (let i = 0; i < bridgeCount; i++) {
    const group = new THREE.Group();
    const postGeom = new THREE.CylinderGeometry(5, 5, 100, 8);
    const beamGeom = new THREE.BoxGeometry(200, 10, 20);
    const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

    const leftPost = new THREE.Mesh(postGeom, material);
    const rightPost = new THREE.Mesh(postGeom, material);
    const beam = new THREE.Mesh(beamGeom, material);

    leftPost.position.set(-100, 50, 0);
    rightPost.position.set(100, 50, 0);
    beam.position.set(0, 100, 0);

    group.add(leftPost, rightPost, beam);
    // spread bridges along the river
    group.position.set(-400 + i * 400, 0, -500);
    scene.add(group);
  }

  // ---- Random crazy buildings (tall boxes) ----
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
  for (let i = 0; i < 20; i++) {
    const width = 30 + Math.random() * 70;
    const depth = 30 + Math.random() * 70;
    const height = 100 + Math.random() * 300;
    const geom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geom, buildingMaterial);
    // random position around origin, avoid overlapping river area
    const x = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    if (Math.abs(z + 500) < 150) continue; // keep clear of river center line
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
  }

  console.log('✅ Added extra river, bridges, and crazy buildings');
};