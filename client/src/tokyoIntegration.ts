import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

// Tiles we want to load (offsets taken from tiles.json)
const TOKYO_TILES = [
  { name: 'Shibuya',       url: '/assets/models/japan/shibuya.glb',       offset: [-4172.78, 0, -1864.58] },
  { name: 'MinatoTower',  url: '/assets/models/japan/minato_tower.glb',  offset: [-777.63, 0, -1860.83] },
  { name: 'Shinjuku',     url: '/assets/models/japan/shinjuku.glb',      offset: [-1200.12, 0, -3400.45] },
  { name: 'Akihabara',    url: '/assets/models/japan/akihabara.glb',    offset: [-2500.33, 0, -1200.67] },
];

/**
 * Load the selected PLATEAU tiles and add them to the given Three.js scene.
 */
export const loadTokyoTiles = (scene: THREE.Scene) => {
  const loader = new GLTFLoader();
  TOKYO_TILES.forEach(tile => {
    loader.load(
      tile.url,
      gltf => {
        gltf.scene.position.set(...tile.offset);
        scene.add(gltf.scene);
        console.log(`✅ ${tile.name} tile loaded`);
      },
      undefined,
      err => console.warn(`⚠️ Failed to load ${tile.name}:`, err)
    );
  });

  // Remove any placeholder model that may have been added previously
  const placeholder = scene.getObjectByName('JapanPlaceholder');
  if (placeholder) {
    scene.remove(placeholder);
    console.log('Removed placeholder Japan model');
  }
};
