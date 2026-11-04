import * as THREE from 'three';

export function makeLabel(text, { color = '#ffffff', bg = 'rgba(20,24,40,0.78)', size = 48, height = 0.5 } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + size;
  canvas.width = w;
  canvas.height = Math.ceil(size * 1.6);
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = bg;
  const r = size * 0.4;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, r);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sprite.scale.set((canvas.width / canvas.height) * height, height, 1);
  return sprite;
}

export function makeBoardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lines) => {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1f3b2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8b6b3e';
    ctx.lineWidth = 18;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f2f2e8';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? '600 52px "Comic Sans MS", system-ui' : '40px "Comic Sans MS", system-ui';
      ctx.fillText(line.slice(0, 44), 40, 40 + i * 70);
    });
    tex.needsUpdate = true;
  };
  draw(['Welcome!']);
  return { texture: tex, draw };
}
