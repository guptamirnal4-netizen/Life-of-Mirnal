// Feature flags. Flip one back to bring a hidden section back: nothing behind a flag is deleted.
// The start screen is the multiplayer paintball portal (js/portal/portal.js); entries switched on here appear under
// its main menu.
export const FEATURES = {
  // The School section (Sunrise Public School: "School Life", the school film shots and the School tab of
  // the 3D map). Hidden for now; its code, data and assets are kept as they are.
  school: false,
  // College Life at BITS Pilani (the first-year life sim: main.js startGame, its Continue / save button and the
  // Learning Journey). Hidden from the portal for the paintball MVP; all of its code stays.
  collegeLife: false,
  // Campus Free Roam as a main-screen entry. It always lives in Settings → "Campus Free Roam (optional experience)";
  // true also puts it under the portal's main menu.
  freeRoamOnPortal: false,
  // "The road ahead" list on the Year 1 complete panel: real internships and projects from the original author's
  // resume (ROADMAP in data/college.js). Personal, so hidden; the data stays in the file.
  resumeRoadmap: false,
  // The intro: false plays the 1:26 trailer video (media/, made by dev/make-trailer.mjs); true plays the live
  // in-engine film instead (js/cinematic/). ?film always plays the in-engine film.
  engineIntro: false,
};

// For tests and debugging only: ?features=collegeLife,school (or localStorage 'pwb-features' = "collegeLife")
// turns hidden sections back on for this browser. Nothing in the UI links here.
try {
  const on = new URLSearchParams(globalThis.location?.search || '').get('features') || globalThis.localStorage?.getItem('pwb-features') || '';
  for (const k of on.split(',').map((s) => s.trim())) if (k in FEATURES) FEATURES[k] = true;
} catch { /* no location or storage (Node, private mode) */ }
