import * as THREE from 'three';

// Two cheap touches added to every lit (standard/physical) material, so the whole campus gets them at once:
//  - contact shading: walls, kerbs, trunks and legs darken over their first metre above the ground, the way
//    real walls collect shade and dust where they meet it (vertical faces only);
//  - ground variation: large flat ground (courtyards, lawns, roads) gets a soft two-scale mottle in world
//    space, so a 60 m courtyard is no longer one flat colour.
// Both work from the world position and normal, so they need no textures or UVs and cost a few ALU ops.
const CONTACT = 0.55; // brightness at the foot of a wall
const REACH = 1.3; // metres over which it fades out
const MOTTLE = 0.36; // ground variation, peak to peak

let applied = false;

export function applySurfaceShading() {
  if (applied) return;
  applied = true;
  // ShaderLib copied the chunk strings when three loaded, so patch the standard and physical programs themselves
  const vert = THREE.ShaderLib.standard.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSfW;\nvarying vec3 vSfN;')
    .replace('#include <project_vertex>', /* glsl */`#include <project_vertex>
      vec4 sfW = vec4( transformed, 1.0 );
      vec3 sfN = objectNormal;
      #ifdef USE_INSTANCING
        sfW = instanceMatrix * sfW;
        sfN = mat3( instanceMatrix ) * sfN;
      #endif
      vSfW = ( modelMatrix * sfW ).xyz;
      vSfN = mat3( modelMatrix ) * sfN;`);
  const frag = THREE.ShaderLib.standard.fragmentShader
    .replace('#include <common>', /* glsl */`#include <common>
      varying vec3 vSfW;
      varying vec3 vSfN;
      float sfHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
      float sfNoise( vec2 p ) {
        vec2 i = floor( p ); vec2 f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( sfHash( i ), sfHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( sfHash( i + vec2( 0.0, 1.0 ) ), sfHash( i + vec2( 1.0 ) ), f.x ), f.y );
      }`)
    .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
      {
        vec3 sfn = normalize( vSfN );
        float wall = 1.0 - abs( sfn.y );
        diffuseColor.rgb *= mix( 1.0, mix( ${CONTACT.toFixed(2)}, 1.0, smoothstep( 0.0, ${REACH.toFixed(2)}, vSfW.y ) ), wall * wall );
        float ground = smoothstep( 0.6, 0.9, sfn.y ) * ( 1.0 - smoothstep( 0.3, 0.8, vSfW.y ) );
        float m = sfNoise( vSfW.xz * 0.09 ) * 0.65 + sfNoise( vSfW.xz * 0.47 + 17.0 ) * 0.35;
        diffuseColor.rgb *= mix( 1.0, 1.0 + ${MOTTLE.toFixed(2)} * ( m - 0.5 ), ground );
      }`);
  for (const k of ['standard', 'physical']) {
    THREE.ShaderLib[k].vertexShader = vert;
    THREE.ShaderLib[k].fragmentShader = frag;
  }
}
