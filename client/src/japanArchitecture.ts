import * as THREE from 'three';

/**
 * Creates an authentic Tokyo Commercial Neon Building (Akihabara / Shinjuku style)
 * with ground floor Japanese storefront, vertical illuminated kanji signs,
 * HVAC AC compressor units, and rooftop water towers.
 */
export function createTokyoCommercialBuilding(x: number, z: number, heightTiers = 4, rotationY = 0): any {
  const building = new THREE.Group();
  building.name = 'TokyoCommercialBuilding';

  // Base materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#3d4449',
    roughness: 0.85,
    metalness: 0.1
  });

  const ceramicTileMat = new THREE.MeshStandardMaterial({
    color: '#8b959e',
    roughness: 0.65,
    metalness: 0.15
  });

  const darkGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#09131a',
    roughness: 0.08,
    metalness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.9
  });

  const hvacMetalMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.85,
    roughness: 0.35
  });

  const woodLatticeMat = new THREE.MeshStandardMaterial({
    color: '#451a03',
    roughness: 0.75
  });

  const neonRedMat = new THREE.MeshBasicMaterial({ color: '#ff2d55', toneMapped: false });
  const neonBlueMat = new THREE.MeshBasicMaterial({ color: '#00d2ff', toneMapped: false });
  const neonGoldMat = new THREE.MeshBasicMaterial({ color: '#ffcc00', toneMapped: false });

  const width = 16;
  const depth = 16;
  const floorHeight = 3.8;
  const totalHeight = heightTiers * floorHeight;

  // 1. Ground floor storefront (Izakaya / Ramen shop)
  const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(width, floorHeight, depth), ceramicTileMat);
  groundFloor.position.set(0, floorHeight / 2, 0);
  groundFloor.castShadow = true;
  groundFloor.receiveShadow = true;
  building.add(groundFloor);

  // Storefront wooden lattice entrance & noren banner
  const entrance = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 0.2), woodLatticeMat);
  entrance.position.set(0, 1.3, depth / 2 + 0.1);
  building.add(entrance);

  // Sliding glass door inside entrance
  const storeGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.4, 0.05), darkGlassMat);
  storeGlass.position.set(0, 1.3, depth / 2 + 0.05);
  building.add(storeGlass);

  // Red paper lantern (ちょうちん) hanging at entrance
  for (const side of [-1, 1]) {
    const chochin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: '#dc2626', emissive: '#ef4444', emissiveIntensity: 0.6 })
    );
    chochin.position.set(side * 2.8, 2.6, depth / 2 + 0.4);
    building.add(chochin);

    const chochinGlow = new THREE.PointLight('#ef4444', 1.2, 5, 2);
    chochinGlow.position.set(side * 2.8, 2.6, depth / 2 + 0.6);
    building.add(chochinGlow);
  }

  // 2. Upper commercial floors with ribbon window strips
  for (let floor = 1; floor < heightTiers; floor++) {
    const yCenter = floor * floorHeight + floorHeight / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, floorHeight, depth), concreteMat);
    body.position.set(0, yCenter, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    building.add(body);

    // Front ribbon window strip
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(width - 2.5, floorHeight - 1.2, 0.15), darkGlassMat);
    frontWindow.position.set(0, yCenter + 0.2, depth / 2 + 0.05);
    building.add(frontWindow);

    // AC compressor units (エアコン室外機) mounted on exterior walls
    for (const side of [-1, 1]) {
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.45), hvacMetalMat);
      acUnit.position.set(side * (width / 2 - 1.2), yCenter - 1.1, depth / 2 + 0.3);
      building.add(acUnit);
    }
  }

  // 3. Vertical Japanese Blade Sign (袖看板 - Sodekanban) with neon glow
  const signHeight = totalHeight * 0.72;
  const signWidth = 1.35;
  const signDepth = 0.35;
  const signGroup = new THREE.Group();

  const signBacking = new THREE.Mesh(
    new THREE.BoxGeometry(signWidth, signHeight, signDepth),
    new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.4, metalness: 0.6 })
  );
  signGroup.add(signBacking);

  // Vertical neon lighting accents
  const neonStripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, signHeight - 0.4, signDepth + 0.05), neonBlueMat);
  neonStripe.position.set(-signWidth / 2 + 0.18, 0, 0);
  signGroup.add(neonStripe);

  const neonFace = new THREE.Mesh(new THREE.BoxGeometry(signWidth - 0.5, signHeight - 0.8, signDepth + 0.02), neonGoldMat);
  neonFace.position.set(0.15, 0, 0);
  signGroup.add(neonFace);

  // Position sign jutting out from front facade
  signGroup.position.set(width / 2 + 0.4, totalHeight / 2 + 1.5, depth / 2 - 2.0);
  building.add(signGroup);

  const signLight = new THREE.PointLight('#00d2ff', 3.5, 14, 2);
  signLight.position.set(width / 2 + 1.2, totalHeight / 2 + 1.5, depth / 2 - 2.0);
  building.add(signLight);

  // 4. Rooftop elements: Japanese galvanized water tank & HVAC units
  const roofY = totalHeight;

  // Roof perimeter safety railing
  const railMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8, roughness: 0.4 });
  const railing = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 1.1, depth - 0.4), railMat);
  railing.position.set(0, roofY + 0.55, 0);
  building.add(railing);

  // Water tank (給水塔)
  const tankBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), hvacMetalMat);
  tankBase.position.set(-width / 4, roofY + 0.6, -depth / 4);
  building.add(tankBase);

  const tankCylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.8, 16), hvacMetalMat);
  tankCylinder.position.set(-width / 4, roofY + 2.6, -depth / 4);
  tankCylinder.castShadow = true;
  building.add(tankCylinder);

  // Large commercial rooftop HVAC chiller
  const hvacChiller = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 2.2), hvacMetalMat);
  hvacChiller.position.set(width / 4, roofY + 0.8, depth / 5);
  hvacChiller.castShadow = true;
  building.add(hvacChiller);

  // Rooftop communications mast / lightning rod
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 6.5, 8), hvacMetalMat);
  mast.position.set(0, roofY + 3.25, 0);
  building.add(mast);

  const beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), neonRedMat);
  beaconLight.position.set(0, roofY + 6.5, 0);
  building.add(beaconLight);

  building.position.set(x, 0, z);
  building.rotation.y = rotationY;
  return building;
}

/**
 * Creates an authentic Japanese Convenience Store (コンビニ - Konbini)
 * with horizontal tri-color illuminated fascia sign, full glass storefront,
 * and rooftop utilities.
 */
export function createJapaneseKonbini(x: number, z: number, rotationY = 0): any {
  const konbini = new THREE.Group();
  konbini.name = 'JapanKonbiniStore';

  const wallMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.55,
    metalness: 0.1
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b1622',
    roughness: 0.05,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    transparent: true,
    opacity: 0.72
  });

  const fasciaBlue = new THREE.MeshBasicMaterial({ color: '#0284c7', toneMapped: false });
  const fasciaWhite = new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false });
  const fasciaGreen = new THREE.MeshBasicMaterial({ color: '#16a34a', toneMapped: false });

  const width = 20;
  const height = 5.2;
  const depth = 14;

  // Main store structure
  const storeBody = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  storeBody.position.set(0, height / 2, 0);
  storeBody.castShadow = true;
  storeBody.receiveShadow = true;
  konbini.add(storeBody);

  // Full panoramic glass storefront
  const storeFrontGlass = new THREE.Mesh(new THREE.BoxGeometry(width - 2.8, height - 1.8, 0.15), glassMat);
  storeFrontGlass.position.set(0, (height - 1.8) / 2 + 0.3, depth / 2 + 0.05);
  konbini.add(storeFrontGlass);

  // Horizontal illuminated tri-color Konbini Fascia Banner across entire roof edge
  const bannerGroup = new THREE.Group();
  const stripeHeight = 0.38;
  const bannerWidth = width + 0.4;
  const bannerDepth = 0.4;

  const topStripe = new THREE.Mesh(new THREE.BoxGeometry(bannerWidth, stripeHeight, bannerDepth), fasciaBlue);
  topStripe.position.set(0, height - stripeHeight / 2, depth / 2 + 0.2);
  bannerGroup.add(topStripe);

  const midStripe = new THREE.Mesh(new THREE.BoxGeometry(bannerWidth, stripeHeight * 1.2, bannerDepth), fasciaWhite);
  midStripe.position.set(0, height - stripeHeight * 1.1, depth / 2 + 0.2);
  bannerGroup.add(midStripe);

  const bottomStripe = new THREE.Mesh(new THREE.BoxGeometry(bannerWidth, stripeHeight, bannerDepth), fasciaGreen);
  bottomStripe.position.set(0, height - stripeHeight * 2.2, depth / 2 + 0.2);
  bannerGroup.add(bottomStripe);

  konbini.add(bannerGroup);

  // Warm interior shop glow illuminating the street and sidewalk
  const shopGlow = new THREE.PointLight('#fef08a', 4.0, 18, 2);
  shopGlow.position.set(0, 3.2, depth / 2 + 2.5);
  konbini.add(shopGlow);

  // Rooftop AC compressors and vent ducts
  const roofAcMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.3 });
  for (let i = -1; i <= 1; i++) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.4), roofAcMat);
    ac.position.set(i * 5.5, height + 0.6, -depth / 4);
    ac.castShadow = true;
    konbini.add(ac);
  }

  konbini.position.set(x, 0, z);
  konbini.rotation.y = rotationY;
  return konbini;
}

/**
 * Creates a modern Tokyo Glass High-rise Tower (Shinjuku / Roppongi style)
 * with architectural floor plates, curtain wall glass, and rooftop helipad.
 */
export function createTokyoHighrise(x: number, z: number, height = 52, rotationY = 0): any {
  const tower = new THREE.Group();
  tower.name = 'TokyoModernHighrise';

  const curtainGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#0c1b29',
    metalness: 0.4,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 0.95
  });

  const structuralMullionMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.9,
    roughness: 0.25
  });

  const helipadMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.75
  });

  const width = 24;
  const depth = 24;

  // Main glass skyscraper volume
  const mainVolume = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), curtainGlassMat);
  mainVolume.position.set(0, height / 2, 0);
  mainVolume.castShadow = true;
  mainVolume.receiveShadow = true;
  tower.add(mainVolume);

  // Architectural horizontal mullions every 4 meters
  const floorCount = Math.floor(height / 4);
  for (let f = 1; f < floorCount; f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.4, depth + 0.3), structuralMullionMat);
    band.position.set(0, f * 4, 0);
    tower.add(band);
  }

  // Rooftop Helipad
  const helipadBase = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.4, 24), helipadMat);
  helipadBase.position.set(0, height + 0.2, 0);
  tower.add(helipadBase);

  // Helipad Yellow perimeter ring
  const helipadRing = new THREE.Mesh(
    new THREE.RingGeometry(7.2, 7.8, 24),
    new THREE.MeshBasicMaterial({ color: '#facc15', side: THREE.DoubleSide })
  );
  helipadRing.rotation.x = -Math.PI / 2;
  helipadRing.position.set(0, height + 0.42, 0);
  tower.add(helipadRing);

  // Rooftop aviation warning beacons
  for (const side of [-1, 1]) {
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#ef4444', toneMapped: false })
    );
    beacon.position.set(side * (width / 2 - 1.5), height + 1.2, side * (depth / 2 - 1.5));
    tower.add(beacon);
  }

  tower.position.set(x, 0, z);
  tower.rotation.y = rotationY;
  return tower;
}
