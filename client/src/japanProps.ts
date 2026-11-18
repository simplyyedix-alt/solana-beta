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

/**
 * Creates a traditional Japanese stone lantern (石灯籠 - Ishidōrō).
 */
export function createJapaneseLantern(x: number, z: number): any {
  const lantern = new THREE.Group();
  lantern.name = 'JapanStoneLantern';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#78716c',
    roughness: 0.92,
    metalness: 0.05
  });

  // Base (Kiso)
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), stoneMat);
  base.position.set(0, 0.15, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  lantern.add(base);

  // Pillar (Sao)
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.2, 8), stoneMat);
  pillar.position.set(0, 0.9, 0);
  pillar.castShadow = true;
  lantern.add(pillar);

  // Middle platform (Chūdai)
  const chudai = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), stoneMat);
  chudai.position.set(0, 1.55, 0);
  chudai.castShadow = true;
  lantern.add(chudai);

  // Light chamber (Hibukuro) with glowing rice-paper core
  const paperMat = new THREE.MeshStandardMaterial({
    color: '#ffedd5',
    emissive: '#f59e0b',
    emissiveIntensity: 0.8,
    roughness: 0.4
  });
  const lightChamber = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.52), paperMat);
  lightChamber.position.set(0, 1.9, 0);
  lantern.add(lightChamber);

  // Roof (Kasa) with flared hexagonal edges
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.4, 6), stoneMat);
  roof.position.set(0, 2.35, 0);
  roof.castShadow = true;
  lantern.add(roof);

  // Top finial (Hōju)
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), stoneMat);
  jewel.position.set(0, 2.6, 0);
  lantern.add(jewel);

  // Warm amber point light
  const warmLight = new THREE.PointLight('#f59e0b', 1.5, 7, 2);
  warmLight.position.set(0, 1.9, 0);
  lantern.add(warmLight);

  lantern.position.set(x, 0, z);
  return lantern;
}

/**
 * Creates an authentic Japanese overhead street directional sign (案内標識).
 */
export function createJapaneseRoadSign(x: number, z: number, rotationY = 0): any {
  const signGroup = new THREE.Group();
  signGroup.name = 'JapanRoadSign';

  const steelMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.45,
    metalness: 0.8
  });

  // Vertical steel post
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.5, 12), steelMat);
  pole.position.set(0, 2.75, 0);
  pole.castShadow = true;
  signGroup.add(pole);

  // Horizontal cantilever arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), steelMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(1.2, 5.1, 0);
  signGroup.add(arm);

  // Sign plate: iconic Japanese highway/city blue with white frame
  const signBoardMat = new THREE.MeshStandardMaterial({
    color: '#1d4ed8',
    roughness: 0.25,
    metalness: 0.1
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.06), signBoardMat);
  board.position.set(1.4, 4.6, 0);
  board.castShadow = true;
  signGroup.add(board);

  signGroup.position.set(x, 0, z);
  signGroup.rotation.y = rotationY;
  return signGroup;
}

/**
 * Creates an authentic Japanese roadside white steel guardrail (ガードレール).
 */
export function createJapaneseGuardRail(x: number, z: number, length = 8, rotationY = 0): any {
  const railGroup = new THREE.Group();
  railGroup.name = 'JapanGuardRail';

  const whiteSteel = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.35,
    metalness: 0.55
  });
  const reflectorMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    emissive: '#eab308',
    emissiveIntensity: 0.4,
    roughness: 0.2
  });

  // Horizontal dual beam guardrails
  const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(length, 0.28, 0.06), whiteSteel);
  upperBeam.position.set(length / 2, 0.72, 0);
  upperBeam.castShadow = true;
  upperBeam.receiveShadow = true;
  railGroup.add(upperBeam);

  const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(length, 0.22, 0.05), whiteSteel);
  lowerBeam.position.set(length / 2, 0.36, 0);
  lowerBeam.castShadow = true;
  lowerBeam.receiveShadow = true;
  railGroup.add(lowerBeam);

  // Vertical steel support posts every 2 meters
  const postCount = Math.floor(length / 2) + 1;
  for (let i = 0; i < postCount; i++) {
    const px = i * (length / (postCount - 1));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 12), whiteSteel);
    post.position.set(px, 0.47, 0);
    post.castShadow = true;
    railGroup.add(post);

    // Amber reflective cap on each post top
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 12), reflectorMat);
    cap.position.set(px, 0.96, 0);
    railGroup.add(cap);
  }

  railGroup.position.set(x, 0, z);
  railGroup.rotation.y = rotationY;
  return railGroup;
}

/**
 * Creates an authentic Japanese road construction / pedestrian traffic cone (カラーコーン).
 */
export function createJapaneseTrafficCone(x: number, z: number): any {
  const coneGroup = new THREE.Group();
  coneGroup.name = 'JapanTrafficCone';

  const coneMat = new THREE.MeshStandardMaterial({
    color: '#ea580c',
    roughness: 0.4,
    metalness: 0.1
  });
  const reflectiveWhite = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.2,
    metalness: 0.15
  });
  const rubberBaseMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.85
  });

  // Square base weight
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), rubberBaseMat);
  base.position.set(0, 0.02, 0);
  base.castShadow = true;
  coneGroup.add(base);

  // Main orange cone
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 16), coneMat);
  cone.position.set(0, 0.38, 0);
  cone.castShadow = true;
  coneGroup.add(cone);

  // White reflective band
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.16, 16), reflectiveWhite);
  stripe.position.set(0, 0.38, 0);
  coneGroup.add(stripe);

  coneGroup.position.set(x, 0, z);
  return coneGroup;
}
