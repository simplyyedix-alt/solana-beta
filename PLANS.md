# AAA Expansion Roadmap for Solara Bay

## Vision
Transform the current block‑style prototype into a full‑blown AAA open‑world experience (≈100 GB) inspired by **GTA 5**, **GTA 6**, and a **Japan** setting. The goal is to deliver high‑fidelity graphics, extensive customization, and performance options suitable for modern hardware.

---

## High‑Level Milestones

| Phase | Description | Target Outcomes | Approx. Duration |
|-------|-------------|-----------------|------------------|
| **1️⃣ Pre‑Production** | Concept art, design documents, tech spikes, pipeline setup. | Detailed GDD, technical specs, asset pipelines, prototype of core systems. | 3‑4 months |
| **2️⃣ Core Engine Upgrade** | Migrate from the current lightweight engine to a AAA‑ready engine (e.g., Unreal 5.2). Implement streaming world, LOD, Nanite, and virtual shadow maps. | Stable build capable of rendering a 10 km² open world at 4K/60 FPS (high preset). | 6‑8 months |
| **3️⃣ World Building – GTA‑Style** | Create the “Los Solara” metropolis (GTA 5‑style) and the “Neo‑Tokyo” district (Japan). Populate with streets, landmarks, traffic AI, pedestrians, and dynamic weather. | Fully navigable city + district, 10 k+ unique assets. | 8‑10 months |
| **4️⃣ Gameplay Systems** | Vehicle physics, combat, mission framework, UI/UX, AI behavior, economy. | Robust gameplay loop, mission editor, mod‑friendly APIs. | 6‑9 months |
| **5️⃣ Art & Audio Polish** | High‑poly models, PBR textures, hair/fur, volumetric fog, sound design, orchestral score. | Photo‑realistic visual fidelity, immersive audio. | 5‑7 months |
| **6️⃣ Quality‑Settings Engine** | Implement a settings menu with:
- Texture quality (Low/Medium/High/Ultra)
- Shadow quality (Off/Low/Medium/High)
- Anti‑aliasing (FXAA/TAA/MSAA)
- Resolution scaling & DLSS/FSR
- FPS caps (30/60/120/Unlimited)
- GPU/CPU workload throttling
| Users can tailor performance/visuals to their hardware. | 3 months |
| **7️⃣ Optimization & Testing** | Profiling, memory budgeting, streaming optimizations, platform QA (PC, next‑gen consoles). | Stable 100 GB build with <2 % frame‑time spikes, <8 GB RAM usage on high preset. | 4‑5 months |
| **8️⃣ Release & Post‑Launch** | Marketing, DLC pipeline, live‑ops tooling, telemetry. | Launch on Steam, Epic, and console stores; roadmap for post‑launch content. | 2‑3 months |

**Total Estimated Time:** **~38‑45 months** (~3 – 4 years) for a fully polished AAA title.

---

## Feature Checklist (AAA Requirements)
- **Open‑World Streaming**: World regions load/unload seamlessly.
- **Nanite & Lumen (or equivalent)**: Automatic LOD, real‑time global illumination.
- **Dynamic Weather & Day‑Night Cycle** with volumetric clouds.
- **Vehicle System**: Physics‑based handling, damage model, customization.
- **AI System**: Pedestrian crowds, traffic, law enforcement, enemy AI.
- **Mission Framework**: Branching narratives, side‑quests, mission editor.
- **Multiplayer/Co‑op (optional)**: Dedicated servers, netcode, matchmaking.
- **Extensive Settings UI** as described above.
- **Modding Support**: Asset pipelines, script hooks, documentation.

---

## Resource Requirements
- **Team**: 80‑100 people (engineers, artists, designers, QA, producers).
- **Budget**: $150‑200 M (typical AAA scope).
- **Hardware**: Development clusters with high‑end GPUs (RTX 4090+), CI pipeline with GPU‑enabled runners.
- **Tools**: Unreal Engine, Perforce/Git LFS, Maya/Blender, Substance, Wwise, Jira/Confluence.

---

## Immediate Next Steps
1. **Create a Design Doc (GDD)** – outline core gameplay loops, story, and world layout.
2. **Set up a dedicated AAA branch** (`aaa-dev`) in the repo.
3. **Integrate Unreal Engine** – add `.uproject` and necessary build scripts.
4. **Create a CI pipeline for large assets** (Git LFS, artifact caching).
5. **Kick‑off Phase 1** – schedule concept art sprints and tech spikes.

---

*This roadmap is a living document; adjust dates and milestones as you gather more data during development.*

---

**Repository Links**
- [PLANS.md](file:///D:/github/Solara-Bay-Claude-Handoff/PLANS.md)

- Added placeholder Tokyo Tower asset for Japan map (auto‑commit).