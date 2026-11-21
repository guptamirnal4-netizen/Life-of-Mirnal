// Paintball players as the game's NPC models: character base, outfit colours, paintball mask, accessory and
// paintball blaster. Used for remote players, the local third-person body and the lobby's live preview.
import * as THREE from 'three';
import { NPC } from '../../world/npcs.js';
import { equip, mask } from '../models.js';
import { CHARACTERS } from '../looks.js';

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });

function accessory(npc, id, colour) {
  if (npc.pbAcc) { npc.pbAcc.parent?.remove(npc.pbAcc); npc.pbAcc = null; }
  if (!id || id === 'none') return;
  const g = new THREE.Group(); g.name = `pb-acc:${id}`;
  if (id === 'cap') {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(colour)); top.position.y = 0.1; g.add(top);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 16, 1, false, -Math.PI / 2, Math.PI), mat(colour)); brim.position.set(0, 0.105, 0.09); g.add(brim);
    npc.head.add(g);
  } else if (id === 'headband') {
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.018, 6, 24), mat(colour)); b.rotation.x = Math.PI / 2; b.position.y = 0.13; g.add(b); npc.head.add(g);
  } else if (id === 'scarf') {
    const s = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 20), mat(colour)); s.rotation.x = Math.PI / 2; s.position.y = -0.14; g.add(s);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.02), mat(colour)); tail.position.set(0.05, -0.22, 0.08); g.add(tail);
    npc.head.add(g);
  } else if (id === 'backpack') {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.12), mat(colour)); p.position.set(0, 1.18 * (npc.scale || 1), -0.17); g.add(p);
    npc.group.add(g);
  }
  npc.pbAcc = g;
}

// look: { nickname, character, outfit, pants, mask, accessory, equip }; maskColour overrides (team colour).
export function makeAvatar(scene, look, { id = 'pb', maskColour = null, showName = true } = {}) {
  const c = CHARACTERS[look.character] || CHARACTERS[0];
  const npc = new NPC(scene, { id, name: look.nickname || 'Player', role: 'student', color: look.outfit, pants: look.pants, height: c.height, skinIndex: c.skinIndex, gender: c.gender, hair: c.hair, outfit: 'formal' });
  npc.tag.visible = showName;
  npc.gait = 'run';
  npc.pbLook = lookKey(look, maskColour);
  mask(npc, maskColour || look.mask);
  accessory(npc, look.accessory, look.mask);
  equip(npc, look.equip || 'standard');
  return npc;
}
export const lookKey = (l, m) => [l.nickname, l.character, l.outfit, l.pants, l.mask, l.accessory, m].join('|');

// NPC geometry and materials are shared caches: only take the model out of the scene.
export function disposeAvatar(npc) { npc.dispose(); }
