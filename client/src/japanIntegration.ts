// Japan map and building integration
import { JapanBuilding } from "../assets/buildings/japan/tokyo_tower.js";
import * as THREE from "three";

export const applyJapanIntegration = (scene: any) => {
  if (!scene) return;
  // Load placeholder map text (you can replace with real data later)
  fetch("/assets/maps/japan_map.txt")
    .then(r => r.text())
    .then(mapText => {
      console.log("Japan map loaded", mapText);

      // ---- Visual placeholder for the map ----
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshBasicMaterial({ color: 0x88aa88, side: THREE.DoubleSide })
      );
      plane.rotation.x = -Math.PI / 2; // lay flat on the ground
      scene.add(plane);

      // ---- Add the placeholder building ----
      if (scene.addBuilding) {
        scene.addBuilding(JapanBuilding);
      } else if (scene.add) {
        // Dynamically import GLTFLoader only when we need it
        import("three/examples/jsm/loaders/GLTFLoader")
          .then(({ GLTFLoader }) => {
            const loader = new GLTFLoader();
            loader.load(JapanBuilding.modelUrl, gltf => {
              scene.add(gltf.scene);
            });
          })
          .catch(err => console.error("Failed to load GLTFLoader:", err));
      }
    })
    .catch(err => console.error("Failed to load Japan map:", err));
};