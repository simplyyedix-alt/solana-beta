import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const JapanCity = {
  modelUrl: '/assets/models/japan/LittlestTokyo.glb'
};

export const RoadSegment = {
  modelUrl: '/assets/models/japan/road-segment.glb'
};

export function applyJapanIntegration(scene: any) {
  if (!scene) return;

  const loader = new GLTFLoader();

  // Load Tokyo GLTF model
  loader.load(
    JapanCity.modelUrl,
    (gltf: any) => {
      const model = gltf.scene;
      model.name = 'JapanTokyoModel';
      model.position.set(0, 0, 0);
      scene.add(model);
      console.log('Tokyo model loaded and added to scene');
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
      model.position.set(0, 0.05, 0);
      scene.add(model);
      console.log('Road segment model loaded and added to scene');
    },
    undefined,
    (err: any) => {
      console.warn('Road segment model load skipped:', err);
    }
  );
}

export const useJapanIntegration = applyJapanIntegration;
