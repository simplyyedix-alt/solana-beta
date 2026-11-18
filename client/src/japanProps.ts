import * as THREE from 'three';

/**
 * Creates a Japanese Sakura (Cherry Blossom) tree with layered canopy clusters.
 */
export function createSakuraTree(x: number, z: number, scale = 1.0): any {
  const treeGroup = new THREE.Group();
  treeGroup.name = 'JapanSakuraTree';

  // Bark material
  const barkMat = new THREE.MeshStandardMaterial({
    color: '#422817',
    roughness: 0.88,
    metalness: 0.05
  });

  // Sakura blossom materials (two subtle shades for natural depth)
  const blossomMat1 = new THREE.MeshStandardMaterial({
    color: '#fbcfe8',
    roughness: 0.72,
    metalness: 0.02
  });
  const blossomMat2 = new THREE.MeshStandardMaterial({
    color: '#f472b6',
    roughness: 0.68,
    metalness: 0.02
  });

  // Main trunk
  const trunkGeo = new THREE.CylinderGeometry(0.32 * scale, 0.48 * scale, 5.2 * scale, 8);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.set(0, 2.6 * scale, 0);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);

  // Canopy blossom clusters
  const clusterPositions = [
    [0, 5.2, 0, 2.2, blossomMat1],
    [-1.2, 4.6, 0.8, 1.6, blossomMat2],
    [1.1, 4.8, -0.6, 1.7, blossomMat1],
    [0.7, 5.5, 0.9, 1.5, blossomMat2],
    [-0.6, 5.7, -0.8, 1.4, blossomMat1],
    [0, 6.2, 0, 1.3, blossomMat2]
  ] as const;

  for (const [cx, cy, cz, radius, mat] of clusterPositions) {
    const geo = new THREE.DodecahedronGeometry(radius * scale, 1);
    const cluster = new THREE.Mesh(geo, mat);
    cluster.position.set(cx * scale, cy * scale, cz * scale);
    cluster.castShadow = true;
    cluster.receiveShadow = true;
    treeGroup.add(cluster);
  }

  treeGroup.position.set(x, 0, z);
  return treeGroup;
}

/**
 * Creates an authentic Japanese roadside vending machine (自動販売機).
 */
export function createJapaneseVendingMachine(x: number, z: number, rotationY = 0): any {
  const machine = new THREE.Group();
  machine.name = 'JapanVendingMachine';

  // Body: classic Japanese bright red or deep blue casing
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    roughness: 0.35,
    metalness: 0.45
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.9), bodyMat);
  body.position.set(0, 1.15, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  machine.add(body);

  // Front illuminated display glass
  const displayMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    emissive: '#38bdf8',
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.2
  });
  const display = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.1, 0.05), displayMat);
  display.position.set(0, 1.35, 0.46);
  machine.add(display);

  // Dispenser flap / return tray at bottom
  const trayMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.6,
    metalness: 0.6
  });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.06), trayMat);
  tray.position.set(0, 0.35, 0.46);
  machine.add(tray);

  // Top header sign with warm ambient glow
  const headerMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#f8fafc',
    emissiveIntensity: 0.6,
    roughness: 0.2
  });
  const header = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.05), headerMat);
  header.position.set(0, 2.05, 0.46);
  machine.add(header);

  // Subtle ambient point light simulating nighttime beverage display glow
  const glow = new THREE.PointLight('#38bdf8', 1.8, 6, 2);
  glow.position.set(0, 1.35, 0.8);
  machine.add(glow);

  machine.position.set(x, 0, z);
  machine.rotation.y = rotationY;
  return machine;
}
