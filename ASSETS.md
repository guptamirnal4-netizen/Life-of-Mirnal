# Asset manifest

Every third-party file the game ships, and the rules for adding new ones. Update this file in the same commit
that adds, replaces or removes an asset.

## Rules for new assets

- Prefer GLB/glTF for models and KTX2/WebP for textures. Optimise before committing (for example with
  glTF Transform: `dedup`, `prune`, `resize`, `draco`/`meshopt`, `etc1s`/`uastc`).
- Check the licence first. Prefer CC0 (Poly Haven, ambientCG). Never commit an asset with an unclear licence.
- Textures: 1024 px is the default ceiling; 2048 px only for large surfaces seen up close. No duplicates.
- Fill in every column below: source URL, licence, file size, texture resolution, and how it was optimised.

## Shipped files

| File | What | Source | Licence | Size | Resolution | Optimisation |
|---|---|---|---|---|---|---|
| `vendor/three/three.module.js` | Three.js r160 | https://github.com/mrdoob/three.js (npm `three@0.160.0`) | MIT (`vendor/three/LICENSE`) | 1.27 MB | n/a | unminified ES module, served gzipped by Vercel |
| `vendor/three/addons/objects/Sky.js` | Sky shader | Three.js r160 examples | MIT | 6.8 KB | n/a | none needed |
| `vendor/three/addons/utils/BufferGeometryUtils.js` | `mergeGeometries` | Three.js r160 examples | MIT | 31.9 KB | n/a | none needed |
| `vendor/three/addons/postprocessing/` (EffectComposer, Pass, RenderPass, ShaderPass, UnrealBloomPass, MaskPass, OutputPass) and `vendor/three/addons/shaders/` (CopyShader, LuminosityHighPassShader, OutputShader) | Post-processing chain: colour grade and bloom | Three.js r160 examples (npm `three@0.160.0`, `examples/jsm/`) | MIT | 30 KB together | n/a | copied unchanged |
| `audio/jana-gana-mana.ogg` | National Anthem, instrumental (U.S. Navy Band) | https://commons.wikimedia.org/wiki/File:Jana_Gana_Mana_instrumental.ogg | Public domain (see `audio/ATTRIBUTION.md`) | 1.08 MB | n/a | Ogg Vorbis as published |
| `data/bits-campus.js` | Campus roads, paths and building footprints | © OpenStreetMap contributors, plus footprints traced from aerial imagery | ODbL 1.0 (OSM data) | 146 KB | n/a | coordinates rounded to 0.1 m |

## Textures and models

There are no image, HDR or model files. Every texture is drawn at runtime on a canvas, and every model is
built from Three.js primitives in code:

| Where | Textures | Resolution |
|---|---|---|
| `js/world/textures.js` | plaster, brick, tiles, terrazzo, wood, grass, paving, concrete, boards and similar | 512 × 512 each |
| `js/world/bits-world.js` | facades (hostel, academic, heritage, library, SAC, mess, …), roofs, Rotunda paving, signs | 64 × 8 to 1024 × 1024 |
| `js/world/hostel.js` | corridor doors, arches and grilles, room plates (atlas), posters, notices, TV, vending machine, bed sheets, curtains | 64 × 36 to 2048 × 768 (atlas of 251 room plates) |
| `js/world/labels.js` | name tags and blackboard | per label |

Anisotropic filtering is set by the graphics quality profile (`js/graphics/GraphicsConfig.js`): 2× on Low
up to 16× on Ultra (the M4 GPU's maximum is 16×).
