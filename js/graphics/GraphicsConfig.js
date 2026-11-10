import * as THREE from 'three';

// Renderer settings shared by every quality profile. Colour management is on by default in r160.
export const RENDERER_DEFAULTS = {
  outputColorSpace: THREE.SRGBColorSpace,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 0.56,
};

// Quality profiles. pixelRatioCap limits the device pixel ratio; maxPixels limits the total drawing-buffer
// size, so a full-screen Retina window does not render ~5.4 million pixels on High. Shadows come from the sun
// only (the indoor light never casts), over a square frustum of shadowSpan metres that follows the player.
export const PROFILES = {
  low: { label: 'Low', note: 'no shadows, fastest', pixelRatioCap: 1, maxPixels: 1.6e6, shadows: false, shadowMapSize: 1024, shadowType: 'pcf', shadowSpan: 60, anisotropy: 2 },
  medium: { label: 'Medium', note: 'sharp shadows nearby', pixelRatioCap: 1.25, maxPixels: 2.6e6, shadows: true, shadowMapSize: 1024, shadowType: 'pcf', shadowSpan: 60, anisotropy: 4 },
  high: { label: 'High', note: 'soft shadows, recommended', pixelRatioCap: 2, maxPixels: 3.7e6, shadows: true, shadowMapSize: 2048, shadowType: 'pcfsoft', shadowSpan: 76, anisotropy: 8 },
  ultra: { label: 'Ultra', note: 'full Retina, larger shadow area', pixelRatioCap: 2, maxPixels: 6.5e6, shadows: true, shadowMapSize: 4096, shadowType: 'pcfsoft', shadowSpan: 110, anisotropy: 16 },
};

export const PROFILE_ORDER = ['low', 'medium', 'high', 'ultra'];
export const DEFAULT_PROFILE = 'high';

export const SHADOW_TYPES = { pcf: THREE.PCFShadowMap, pcfsoft: THREE.PCFSoftShadowMap };

// The pixel ratio for a window: never above the device's, the profile's cap, or the pixel budget.
export function pixelRatioFor(profile, devicePixelRatio, width, height) {
  const budget = Math.sqrt(profile.maxPixels / Math.max(1, width * height));
  return Math.max(0.5, Math.min(devicePixelRatio, profile.pixelRatioCap, budget));
}

export const profileOf = (name) => PROFILES[name] || PROFILES[DEFAULT_PROFILE];
