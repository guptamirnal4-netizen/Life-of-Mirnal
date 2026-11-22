// One volume control for every sound the game makes, without each sound source knowing about it:
//   music        <audio>/<video> elements playing a file (the film's score)
//   voice chat   <audio> elements playing a live stream (srcObject: the paintball voice chat)
//   effects      everything made with WebAudio (paintball pops and splats, the film's sound effects)
// Each element's own volume is kept and multiplied by the level for its kind; WebAudio sources that connect to a
// context's speakers go through one gain node per context instead. So the film (which another module owns and may
// replace) and the paintball client follow the Settings without any change to their code.
const levels = { music: 1, effects: 1, voice: 1 };
const requested = new WeakMap(); // element → the volume its own code asked for
const media = new Set(); // WeakRefs to elements seen
const buses = new Map(); // AudioDestinationNode → GainNode (WeakRef-free: one per AudioContext, there are few)
let installed = false;
let volumeDesc = null;

const kindOf = (el) => (el.srcObject ? 'voice' : 'music');
const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 1));

function apply(el) {
  const want = requested.has(el) ? requested.get(el) : 1;
  try { volumeDesc.set.call(el, clamp01(want * levels[kindOf(el)])); } catch { /* detached */ }
}
function track(el) {
  if (el.__pwbTracked) return;
  el.__pwbTracked = true;
  media.add(typeof WeakRef === 'function' ? new WeakRef(el) : { deref: () => el });
}

export function installAudioBus() {
  if (installed || typeof HTMLMediaElement === 'undefined') return;
  installed = true;
  volumeDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    configurable: true,
    get() { return requested.has(this) ? requested.get(this) : volumeDesc.get.call(this); },
    set(v) { requested.set(this, clamp01(v)); track(this); apply(this); },
  });
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) { track(this); apply(this); return play.apply(this, args); };
  if (typeof AudioNode === 'undefined' || typeof AudioDestinationNode === 'undefined') return;
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      let bus = buses.get(dest);
      if (!bus) {
        bus = dest.context.createGain();
        bus.gain.value = levels.effects;
        connect.call(bus, dest);
        buses.set(dest, bus);
      }
      dest = bus;
    }
    return connect.call(this, dest, ...rest);
  };
}

// { master, music, effects, voice } in 0..1, muted: everything silent.
export function setAudioLevels({ master = 1, music = 1, effects = 1, voice = 1, muted = false }) {
  const m = muted ? 0 : clamp01(master);
  Object.assign(levels, { music: m * clamp01(music), effects: m * clamp01(effects), voice: m * clamp01(voice) });
  for (const bus of buses.values()) bus.gain.value = levels.effects;
  for (const ref of [...media]) { const el = ref.deref(); if (el) apply(el); else media.delete(ref); }
}

// For tests: the levels, each WebAudio bus's gain and each media element's real volume.
export function audioDebug() {
  return {
    levels: { ...levels },
    buses: [...buses.values()].map((b) => b.gain.value),
    media: [...media].map((r) => r.deref()).filter(Boolean).map((el) => ({ kind: kindOf(el), requested: requested.has(el) ? requested.get(el) : 1, actual: volumeDesc.get.call(el) })),
  };
}
