// Loads the Whole Campus collision export and the Campus Royale registries in the browser (the same files the
// server loads), checks the hash, and attaches them to the CAMPUS arena so client-side prediction steps exactly the
// server's movement. ~1 MB gzip, fetched once, in the background, when the paintball mode opens.
import { decodeGeometry, hashBytes } from '../geometry.js';
import { CAMPUS } from '../arena.js';

let pending = null;
const url = (f) => new URL(`../data/${f}`, import.meta.url);

async function gunzip(buf) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack the campus map (no DecompressionStream).');
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function loadCampusGeo() {
  if (CAMPUS.geo) return Promise.resolve(CAMPUS.geo);
  if (pending) return pending;
  pending = (async () => {
    const [header, gz, spots] = await Promise.all([
      fetch(url('campus-collision.json')).then((r) => { if (!r.ok) throw new Error(`campus map header: HTTP ${r.status}`); return r.json(); }),
      fetch(url('campus-collision.bin')).then((r) => { if (!r.ok) throw new Error(`campus map: HTTP ${r.status}`); return r.arrayBuffer(); }),
      fetch(url('royale-spots.json')).then((r) => { if (!r.ok) throw new Error(`landing spots: HTTP ${r.status}`); return r.json(); }),
    ]);
    const bytes = await gunzip(gz);
    const hash = hashBytes(bytes);
    if (hash !== header.hash) throw new Error(`campus map does not match its header (${hash} vs ${header.hash})`);
    const geo = decodeGeometry(bytes, header);
    CAMPUS.attach(geo, spots);
    return geo;
  })();
  pending.catch(() => { pending = null; });
  return pending;
}
