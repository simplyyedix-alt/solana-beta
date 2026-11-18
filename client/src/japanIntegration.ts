// Japan map integration using a free glTF model of Tokyo and simple placeholder geometry
import { useEffect } from 'react';
import { JapanCity } from '@/assets/models/japan/japan_city.js';
import { RoadSegment } from '@/assets/models/japan/road_segment.js';

export const useJapanIntegration = (scene: any) =>
  useEffect(() => {
    if (!scene) return;
    // Load the Tokyo glTF model and add to the scene
    const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
    const loader = new GLTFLoader();
    loader.load(JapanCity.modelUrl, gltf => {
      scene.add(gltf.scene);
      console.log('Tokyo model loaded and added to scene');
    }, undefined, err => {
      console.error('Failed to load Tokyo model:', err);
    });

    // ----- Load free road segment model -----
    loader.load(RoadSegment.modelUrl, roadGltf => {
      scene.add(roadGltf.scene);
      console.log('Road segment model loaded and added to scene');
    }, undefined, err => {
      console.error('Failed to load road segment model:', err);
    });

    // ----- Simple placeholder tree -----
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x228B22 })
    );
    foliage.position.y = 1.25;
    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(foliage);
    tree.position.set(5, 0, 5);
    scene.add(tree);
    console.log('Added placeholder tree');
  }, [scene]);
