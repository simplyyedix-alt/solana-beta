import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const JapanCity = {
  modelUrl: '/assets/models/japan/LittlestTokyo.glb'
};

export const RoadSegment = {
  modelUrl: '/assets/models/japan/road-segment.glb'
};

let mixer: any = null;
let animClock: any = null;

export function applyJapanIntegration(scene: any) {
  if (!scene) return;

  const loader = new GLTFLoader();

  // Load Tokyo GLTF model
  loader.load(
    JapanCity.modelUrl,
    (gltf: any) => {
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
    },
    undefined,
    (err: any) => {
      console.warn('Note: Tokyo model load deferred or failed:', err);
    }
  );

  // Load Road Segment model if available
  loader.load(
    RoadSegment.modelUrl,
    (gltf: any) => {
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
    },
    undefined,
    (err: any) => {
      console.warn('Road segment model load skipped:', err);
    }
  );
}

export const useJapanIntegration = applyJapanIntegration;
