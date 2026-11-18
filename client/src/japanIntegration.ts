import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSakuraTree, createJapaneseVendingMachine } from './japanProps';

export const JapanCity = {
  modelUrl: '/assets/models/japan/LittlestTokyo.glb'
};

export const RoadSegment = {
  modelUrl: '/assets/models/japan/road-segment.glb'
};

let mixer: any = null;
let animClock: any = null;

export function applyJapanIntegration(scene: any, onStatus?: (status: string) => void) {
  if (!scene) return;

  const loader = new GLTFLoader();

  // Load Tokyo GLTF model
  loader.load(
    JapanCity.modelUrl,
    (gltf: any) => {
      try {
        const model = gltf.scene;
        model.name = 'JapanTokyoModel';
        // Scale Tokyo model for scene scale
        model.scale.set(0.02, 0.02, 0.02);
        // Position model near the player starting area
        model.position.set(0, 0, 0);

        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        console.log('Japan Tokyo model loaded and added to scene');
        onStatus?.('Tokyo model loaded');

        // Play model animations (train, lights, etc.)
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip: any) => {
            mixer.clipAction(clip).play();
          });
          if (!animClock) {
            animClock = new THREE.Clock();
            const loop = () => {
              requestAnimationFrame(loop);
              if (mixer && animClock) {
                const delta = animClock.getDelta();
                mixer.update(delta);
              }
            };
            loop();
          }
        }
      } catch (err) {
        console.error('Error attaching Tokyo model to scene:', err);
      }
    },
    (xhr: any) => {
      if (xhr.lengthComputable && xhr.total > 0) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        onStatus?.(`Loading Tokyo model: ${percent}%`);
      }
    },
    (err: any) => {
      console.warn('Note: Tokyo model load deferred or failed:', err);
      onStatus?.('Tokyo model load deferred');
    }
  );

  // Load Road Segment model if available
  loader.load(
    RoadSegment.modelUrl,
    (gltf: any) => {
      try {
        const model = gltf.scene;
        model.name = 'JapanRoadSegment';
        model.position.set(0, 0.02, 0);
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.receiveShadow = true;
          }
        });
        scene.add(model);
        console.log('Japan road segment loaded and added to scene');
      } catch (err) {
        console.error('Error attaching road segment to scene:', err);
      }
    },
    undefined,
    (err: any) => {
      console.warn('Road segment model load skipped:', err);
    }
  );

  // Add Japanese Sakura (cherry blossom) trees along the walkway
  try {
    const sakuraTrees = [
      createSakuraTree(-8, -6, 1.05),
      createSakuraTree(-8, 8, 0.95),
      createSakuraTree(10, -7, 1.1),
      createSakuraTree(10, 9, 1.0)
    ];
    for (const tree of sakuraTrees) {
      scene.add(tree);
    }

    // Add Japanese roadside vending machines (自動販売機) with illumination
    const machine1 = createJapaneseVendingMachine(-4.2, -2.5, Math.PI / 2);
    const machine2 = createJapaneseVendingMachine(-4.2, -4.0, Math.PI / 2);
    scene.add(machine1);
    scene.add(machine2);
  } catch (err) {
    console.error('Error creating Japan environment props:', err);
  }
}

export const useJapanIntegration = applyJapanIntegration;
