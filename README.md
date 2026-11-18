# Solara Bay — Field Test 03

Solara Bay is an original open-world action game concept. The client now boots directly into a full-screen, landscape field test with a short world-loading sequence, a third-person character, traffic, named districts and landmarks, enterable interiors, a live city map, and optional cloud saves through the existing Firebase project.

## What is playable today

- Explore the city with **WASD** or the arrow keys.
- Click inside the game to capture the mouse and look freely around the third-person camera. Press **Escape** once to release the cursor, then again to pause. Hold **Shift** to sprint, and press **Space** to jump or brake while driving.
- Press **E** beside the nearest car, building entrance, or pedestrian. The on-screen prompt names the action that will be used.
- Open the full city map by clicking the mini-map. Press **Escape** to pause or resume.
- Reach the gold objective beacon to complete a task and earn credits.
- Play locally without an account, or connect Google sign-in to sync progress.

The browser preview is a hardware-accelerated playtest, not the shipping game. It uses Three.js and WebGL 2, a high-fidelity adaptive render scale, 2048-pixel shadow maps, HDR tone mapping, layered asphalt/curb/crosswalk geometry, instanced street furniture, moving traffic, pedestrians, enterable modular interiors, and a time-of-day cycle. It deliberately avoids the earlier screen-space blur, bloom, and planar reflection passes because they added cost without making the procedural scene look realistic. It does not provide hardware ray tracing, DLSS, or authored AAA character and environment assets. The production target remains a native high-end PC release for Steam and the Epic Games Store; the native engine and production art pipeline are not installed in this workspace.

## Run the field test

Requirements: Node.js 18+ and npm.

```bash
cd client
npm install
npm run dev
```

## Optional Firebase account sync

Guest saves stay in this browser's local storage. To use the existing Firebase Authentication and Firestore project:

1. Configure the existing `VITE_FIREBASE_*` web app values in `client/.env.local`.
2. Enable Google sign-in in Firebase Authentication.
3. Deploy the updated `firestore.rules` rules.
4. Select **Connect account** in the game launcher.

Authenticated game progress is stored in a player-owned `game_saves/{uid}` document. The app never stores a service-role credential in the browser.

## Production direction

The linked clip is titled as a GTA VI gameplay concept. It is an art-direction reference. This field test is an original browser game prototype, not official GTA VI footage or a finished AAA game.

<!-- Trigger CI -->