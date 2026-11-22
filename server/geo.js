// Loads the campus collision export (js/paintball/data/campus-collision.{json,bin}) into the shared CampusGeo and
// attaches it to the Campus Royale arena. Synchronous and once per process: ~1 MB gzip → ~4.6 MB of boxes plus a
// spatial grid. The registries of landing spots and supply spots come with it.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { decodeGeometry, hashBytes } from '../js/paintball/geometry.js';
import { CAMPUS } from '../js/paintball/arena.js';

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../js/paintball/data');
let loaded = null;

export function loadCampus({ dir = DATA } = {}) {
  if (loaded) return loaded;
  const t0 = performance.now();
  const header = JSON.parse(fs.readFileSync(path.join(dir, 'campus-collision.json'), 'utf8'));
  const bytes = new Uint8Array(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'campus-collision.bin'))));
  const hash = hashBytes(bytes);
  if (hash !== header.hash) throw new Error(`campus-collision.bin does not match its header (hash ${hash}, header ${header.hash}): re-run node dev/export-campus-collision.mjs`);
  const geo = decodeGeometry(bytes, header);
  const spots = JSON.parse(fs.readFileSync(path.join(dir, 'royale-spots.json'), 'utf8'));
  if (spots.geoHash !== header.hash) throw new Error('royale-spots.json was built for another campus export: re-run node dev/build-royale-spots.mjs');
  CAMPUS.attach(geo, spots);
  loaded = { geo, spots, ms: Math.round(performance.now() - t0) };
  return loaded;
}
