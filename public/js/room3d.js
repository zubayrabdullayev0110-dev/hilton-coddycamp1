// =============================================================
//  3D xona generatori (Three.js) — har bir xona turi uchun
//  alohida interyer + "kino kamera" animatsiyasi (video effekti).
// =============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const THEMES = {
  warm:    { wall: 0x2a211b, floor: 0x5a3b26, accent: 0xd4a24c, fabric: 0xe9dcc5, light: 0xffc98a, sky: [0x0b1a3a, 0xff9a5a], size: [8, 7] },
  ocean:   { wall: 0x16232c, floor: 0x3b2f28, accent: 0x3fa7c9, fabric: 0xdfe8ee, light: 0xbfe3ff, sky: [0x041428, 0x2b6cb0], size: [9, 7.5] },
  emerald: { wall: 0x14231d, floor: 0x4a3526, accent: 0x2fbf86, fabric: 0xe8efe8, light: 0xd9ffe8, sky: [0x061a14, 0x2c7a5c], size: [10, 8] },
  sunset:  { wall: 0x2b1a1a, floor: 0x5b3a28, accent: 0xff7a59, fabric: 0xf3e3d8, light: 0xffb38a, sky: [0x2a0f2e, 0xff6b3d], size: [11, 9] },
  violet:  { wall: 0x1a1528, floor: 0x2c2433, accent: 0x9b6bff, fabric: 0xe6e0f5, light: 0xc6a8ff, sky: [0x0a0618, 0x6a3df0], size: [12, 9] },
  royal:   { wall: 0x1c1712, floor: 0x2a1d14, accent: 0xe8c063, fabric: 0xf5ecd8, light: 0xffe0a0, sky: [0x050b1e, 0xc9873a], size: [14, 11] },
};

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...opts });

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Kechki shahar osmoni teksturasi (oyna orqasida)
function cityTexture(theme) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#' + theme.sky[0].toString(16).padStart(6, '0'));
  grd.addColorStop(1, '#' + theme.sky[1].toString(16).padStart(6, '0'));
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  // yulduzlar
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; g.fillRect(Math.random() * 1024, Math.random() * 220, 2, 2); }
  // binolar
  let x = 0;
  while (x < 1024) {
    const w = 30 + Math.random() * 70, h = 120 + Math.random() * 260;
    g.fillStyle = `rgba(${8 + Math.random() * 10},${10 + Math.random() * 12},${20 + Math.random() * 20},1)`;
    g.fillRect(x, 512 - h, w, h);
    for (let wy = 512 - h + 8; wy < 500; wy += 12)
      for (let wx = x + 5; wx < x + w - 6; wx += 10)
        if (Math.random() > 0.55) { g.fillStyle = `rgba(255,${200 + Math.random() * 55},${120 + Math.random() * 80},${0.5 + Math.random() * 0.5})`; g.fillRect(wx, wy, 4, 6); }
    x += w + 4;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function woodTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const base = new THREE.Color(color);
  g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16; i++) {
    const y = i * 32;
    g.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`; g.fillRect(0, y, 512, 2);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 512, y + Math.random() * 30, 60 + Math.random() * 120, 1); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function lamp(parent, x, z, theme, h = 0.62) {
  const g = new THREE.Group();
  box(0.5, h, 0.5, std(0x1a1410, { roughness: 0.4 }), 0, h / 2, 0, g);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.32, 24, 1, true), new THREE.MeshStandardMaterial({ color: theme.fabric, emissive: theme.light, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  shade.position.y = h + 0.45; g.add(shade);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), std(theme.accent, { metalness: 0.9, roughness: 0.2 }));
  stem.position.y = h + 0.18; g.add(stem);
  const pl = new THREE.PointLight(theme.light, 6, 5, 2);
  pl.position.y = h + 0.45; g.add(pl);
  g.position.set(x, 0, z); parent.add(g);
}

function bed(parent, x, z, w, theme, rotY = 0) {
  const g = new THREE.Group();
  box(w, 0.4, 2.2, std(0x1b1512), 0, 0.2, 0, g);
  box(w - 0.1, 0.28, 2.1, std(theme.fabric, { roughness: 0.95 }), 0, 0.54, 0.02, g);
  box(w - 0.08, 0.06, 1.2, std(theme.accent, { roughness: 0.9 }), 0, 0.7, 0.45, g); // pled
  box(w + 0.3, 1.4, 0.15, std(theme.wall, { roughness: 0.9 }).clone(), 0, 0.9, -1.12, g).material.color.offsetHSL(0, 0, 0.08);
  const n = Math.max(2, Math.round(w / 0.8));
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, w / n - 0.4, 6, 12), std(0xffffff, { roughness: 1 }));
    p.rotation.z = Math.PI / 2; p.position.set(-w / 2 + (i + 0.5) * (w / n), 0.82, -0.8); p.castShadow = true; g.add(p);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  return g;
}

function sofa(parent, x, z, w, theme, rotY = 0) {
  const g = new THREE.Group();
  const m = std(theme.accent, { roughness: 0.85 });
  box(w, 0.45, 0.9, m, 0, 0.25, 0, g);
  box(w, 0.6, 0.2, m, 0, 0.6, -0.38, g);
  box(0.2, 0.55, 0.9, m, -w / 2 + 0.1, 0.4, 0, g);
  box(0.2, 0.55, 0.9, m, w / 2 - 0.1, 0.4, 0, g);
  g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
}

function plant(parent, x, z) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.45, 20), std(0xeeeeee, { roughness: 0.3 }));
  pot.position.set(x, 0.22, z); pot.castShadow = true; parent.add(pot);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22 + Math.random() * 0.1, 10, 10), std(0x2f6b3a, { roughness: 0.9 }));
    leaf.position.set(x + (Math.random() - 0.5) * 0.4, 0.75 + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.4);
    leaf.castShadow = true; parent.add(leaf);
  }
}

function chandelier(parent, x, y, z, theme) {
  const g = new THREE.Group();
  const gold = std(theme.accent, { metalness: 1, roughness: 0.15 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 12, 48), gold); ring.rotation.x = Math.PI / 2; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 12, 48), gold); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.35; g.add(ring2);
  const crystal = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: theme.light, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.05 });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 0.8 : 0.5;
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), crystal);
    c.position.set(Math.cos(a) * r, (i % 2 ? -0.15 : -0.5), Math.sin(a) * r); g.add(c);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), gold); rod.position.y = 0.6; g.add(rod);
  const pl = new THREE.PointLight(theme.light, 18, 12, 1.6); pl.position.y = -0.3; pl.castShadow = true; g.add(pl);
  g.position.set(x, y, z); parent.add(g);
  return g;
}

function tv(parent, x, y, z, rotY) {
  const g = new THREE.Group();
  box(2.2, 1.25, 0.06, std(0x050505, { roughness: 0.2, metalness: 0.6 }), 0, 0, 0, g);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.15), new THREE.MeshBasicMaterial({ color: 0x0c1a2f }));
  scr.position.z = 0.035; g.add(scr);
  g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  return scr;
}

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e6e1'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = `rgba(${200 + Math.random() * 40},${195 + Math.random() * 40},${190 + Math.random() * 40},1)`;
    g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Shkaf (garderob)
function wardrobe(parent, x, z, theme, w = 1.2, h = 2.3) {
  const g = new THREE.Group();
  box(w, h, 0.6, std(0x2b1d14, { roughness: 0.45 }), 0, h / 2, 0, g);
  const door = std(0x3d2a1c, { roughness: 0.3 });
  box(w / 2 - 0.03, h - 0.1, 0.02, door, -w / 4, h / 2, 0.31, g);
  box(w / 2 - 0.03, h - 0.1, 0.02, door, w / 4, h / 2, 0.31, g);
  const gold = std(theme.accent, { metalness: 1, roughness: 0.2 });
  box(0.03, 0.4, 0.04, gold, -0.06, h / 2, 0.34, g);
  box(0.03, 0.4, 0.04, gold, 0.06, h / 2, 0.34, g);
  box(w + 0.04, 0.05, 0.62, gold, 0, h + 0.02, 0, g);
  g.position.set(x, 0, z); parent.add(g);
}

// Hammom: vanna, hojatxona (unitaz), rakovina, oyna, shisha devorlar
function bathroom(parent, W, D, H, theme) {
  const x0 = -W / 2 + 0.05, z0 = -D / 2 + 0.05, bw = 2.0, bd = 2.4;
  const g = new THREE.Group();
  const white = std(0xffffff, { roughness: 0.12, metalness: 0.05 });
  const gold = std(theme.accent, { metalness: 1, roughness: 0.2 });
  const marble = std(0xf2eee8, { roughness: 0.2 });

  const tile = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), std(0xffffff, { map: tileTexture(), roughness: 0.15 }));
  tile.rotation.x = -Math.PI / 2; tile.position.set(x0 + bw / 2, 0.012, z0 + bd / 2); tile.receiveShadow = true; g.add(tile);
  box(bw, H * 0.75, 0.03, marble, x0 + bw / 2, H * 0.375, z0 + 0.02, g);
  box(0.03, H * 0.75, bd, marble, x0 + 0.02, H * 0.375, z0 + bd / 2, g);

  // shisha devorlar (eshik ochiq joyi bilan)
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  box(0.03, H - 0.1, bd, glass, x0 + bw, (H - 0.1) / 2, z0 + bd / 2, g).castShadow = false;
  box(bw - 0.8, H - 0.1, 0.03, glass, x0 + (bw - 0.8) / 2, (H - 0.1) / 2, z0 + bd, g).castShadow = false;
  box(0.05, 0.05, bd, gold, x0 + bw, H - 0.12, z0 + bd / 2, g);
  box(bw, 0.05, 0.05, gold, x0 + bw / 2, H - 0.12, z0 + bd, g);
  box(0.05, H - 0.1, 0.05, gold, x0 + bw, (H - 0.1) / 2, z0 + bd, g);
  box(0.05, H - 0.1, 0.05, gold, x0 + bw - 0.8, (H - 0.1) / 2, z0 + bd, g);

  // vanna
  const tL = 1.75, tD = 0.8, tx = x0 + 0.08 + tL / 2, tz = z0 + 0.08 + tD / 2, th = 0.55, wt = 0.08;
  box(tL, 0.1, tD, white, tx, 0.05, tz, g);
  box(tL, th, wt, white, tx, th / 2, tz - tD / 2 + wt / 2, g);
  box(tL, th, wt, white, tx, th / 2, tz + tD / 2 - wt / 2, g);
  box(wt, th, tD, white, tx - tL / 2 + wt / 2, th / 2, tz, g);
  box(wt, th, tD, white, tx + tL / 2 - wt / 2, th / 2, tz, g);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(tL - 2 * wt, tD - 2 * wt),
    new THREE.MeshStandardMaterial({ color: 0x7cc8ea, transparent: true, opacity: 0.85, roughness: 0.02, emissive: 0x0a3a55, emissiveIntensity: 0.5 }));
  water.rotation.x = -Math.PI / 2; water.position.set(tx, 0.42, tz); g.add(water);
  box(0.05, 0.3, 0.05, gold, tx, 0.7, z0 + 0.1, g);
  box(0.05, 0.05, 0.18, gold, tx, 0.84, z0 + 0.17, g);

  // rakovina + oyna
  const sz = z0 + 0.08 + tD + 0.38;
  box(0.5, 0.8, 0.55, std(0x24170f, { roughness: 0.4 }), x0 + 0.27, 0.4, sz, g);
  box(0.52, 0.06, 0.58, marble, x0 + 0.28, 0.83, sz, g);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.1, 28), white);
  basin.position.set(x0 + 0.3, 0.9, sz); g.add(basin);
  box(0.03, 0.18, 0.03, gold, x0 + 0.08, 0.95, sz, g);
  box(0.12, 0.03, 0.03, gold, x0 + 0.14, 1.03, sz, g);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), new THREE.MeshStandardMaterial({ color: 0xcfd8e0, metalness: 1, roughness: 0.04, emissive: 0x223344, emissiveIntensity: 0.3 }));
  mirror.position.set(x0 + 0.04, 1.55, sz); mirror.rotation.y = Math.PI / 2; g.add(mirror);
  box(0.02, 0.86, 0.61, gold, x0 + 0.035, 1.55, sz, g);

  // hojatxona (unitaz)
  const wz = z0 + bd - 0.5;
  box(0.2, 0.42, 0.42, white, x0 + 0.12, 0.62, wz, g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.38, 24), white);
  base.position.set(x0 + 0.42, 0.19, wz); base.castShadow = true; g.add(base);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.08, 28), white);
  bowl.scale.x = 1.3; bowl.position.set(x0 + 0.46, 0.42, wz); bowl.castShadow = true; g.add(bowl);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 28), std(0xf4f4f4, { roughness: 0.3 }));
  lid.scale.x = 1.3; lid.position.set(x0 + 0.46, 0.47, wz); g.add(lid);
  box(0.06, 0.03, 0.12, gold, x0 + 0.12, 0.85, wz, g);

  // sochiq
  box(0.04, 0.55, 0.4, std(theme.fabric, { roughness: 1 }), x0 + bw - 0.06, 1.1, z0 + 1.6, g);

  const pl = new THREE.PointLight(0xfff2dd, 5, 4, 2);
  pl.position.set(x0 + bw / 2, H - 0.4, z0 + bd / 2); g.add(pl);
  parent.add(g);
}

// Kichkina stol (marmar, oltin oyoq)
function sideTable(parent, x, z, theme) {
  const gold = std(theme.accent, { metalness: 1, roughness: 0.2 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 40), std(0xf3efe9, { roughness: 0.15 }));
  top.position.set(x, 0.56, z); top.castShadow = top.receiveShadow = true; parent.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.54, 16), gold);
  leg.position.set(x, 0.27, z); parent.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 32), gold);
  foot.position.set(x, 0.015, z); parent.add(foot);
  return 0.58; // stol usti balandligi
}

// Turkcha armudu choy stakan (likopcha bilan) + bug'
function turkishTea(parent, x, y, z, animated) {
  const g = new THREE.Group();
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.012, 32), std(0xb3121b, { roughness: 0.3 }));
  saucer.position.y = 0.006; g.add(saucer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.004, 8, 40), std(0xe8c063, { metalness: 1, roughness: 0.2 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.012; g.add(rim);
  const V = (r, h) => new THREE.Vector2(r, h);
  const glassProfile = [V(0, 0), V(0.028, 0), V(0.032, 0.012), V(0.026, 0.045), V(0.02, 0.066), V(0.025, 0.098), V(0.035, 0.13)];
  const glass = new THREE.Mesh(new THREE.LatheGeometry(glassProfile, 40),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.02, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 0.012; g.add(glass);
  const teaProfile = [V(0, 0.005), V(0.026, 0.006), V(0.03, 0.014), V(0.024, 0.045), V(0.018, 0.066), V(0.023, 0.1), V(0, 0.1)];
  const tea = new THREE.Mesh(new THREE.LatheGeometry(teaProfile, 40),
    new THREE.MeshStandardMaterial({ color: 0xa3300c, emissive: 0x4a0f00, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.92 }));
  tea.position.y = 0.012; g.add(tea);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0025, 8, 32), std(0xe8c063, { metalness: 1, roughness: 0.2 }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.078; g.add(band);
  // choy qoshiqcha
  const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.01), std(0xdddddd, { metalness: 1, roughness: 0.2 }));
  spoon.position.set(0.045, 0.016, 0.035); spoon.rotation.y = -0.6; g.add(spoon);
  // bug'
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), steamMat.clone());
    g.add(s);
    const ph = i / 4;
    animated.push({ obj: s, fn: (o, t) => {
      const k = (t * 0.35 + ph) % 1;
      o.position.set(Math.sin((t + i) * 2) * 0.012, 0.15 + k * 0.22, Math.cos((t + i) * 1.7) * 0.012);
      o.scale.setScalar(0.6 + k * 1.8);
      o.material.opacity = 0.28 * (1 - k);
    } });
  }
  g.scale.setScalar(1.4);
  g.position.set(x, y, z); parent.add(g);
}

/** Xona sahnasini quradi. */
export function buildRoom(themeKey, opts = {}) {
  const theme = THEMES[themeKey] || THEMES.warm;
  const [W, D] = theme.size;
  const H = themeKey === 'royal' ? 4.2 : 3.2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070b);
  scene.fog = new THREE.Fog(0x07070b, 18, 40);
  const animated = [];

  // Pol, devorlar, shift
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0xffffff, { map: woodTexture(theme.floor), roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = std(theme.wall, { roughness: 0.9 });
  box(W, H, 0.1, wallMat, 0, H / 2, -D / 2, scene);               // orqa devor
  box(0.1, H, D, wallMat, -W / 2, H / 2, 0, scene);               // chap devor
  box(W, 0.1, D, std(theme.wall, { roughness: 1 }), 0, H, 0, scene); // shift
  // o'ng devor — katta panorama oyna
  const win = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.6, H - 0.5), new THREE.MeshBasicMaterial({ map: cityTexture(theme) }));
  win.position.set(W / 2 - 0.02, H / 2 + 0.1, 0); win.rotation.y = -Math.PI / 2; scene.add(win);
  const frame = std(theme.accent, { metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i <= 4; i++) box(0.06, H - 0.5, 0.06, frame, W / 2 - 0.05, H / 2 + 0.1, -D / 2 + 0.3 + (i * (D - 0.6)) / 4, scene);
  box(0.08, 0.08, D - 0.6, frame, W / 2 - 0.05, 0.35, 0, scene);
  // pardalar
  const curtain = std(theme.fabric, { roughness: 1, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, H - 0.2, 12, 1), curtain);
    const pos = c.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 14) * 0.06);
    c.geometry.computeVertexNormals();
    c.position.set(W / 2 - 0.25, H / 2, s * (D / 2 - 0.6)); c.rotation.y = -Math.PI / 2; scene.add(c);
  }
  // devor panellari + LED chiziq
  for (let i = -2; i <= 2; i++) box(W / 6, H * 0.6, 0.04, std(theme.wall, { roughness: 0.7 }).clone(), i * (W / 5), H * 0.42, -D / 2 + 0.08, scene).material.color.offsetHSL(0, 0, 0.04);
  const led = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: theme.light }));
  led.position.set(0, H - 0.15, -D / 2 + 0.12); scene.add(led);
  // gilam
  const rug = new THREE.Mesh(new THREE.CircleGeometry(Math.min(W, D) * 0.28, 64), std(theme.fabric, { roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, D * 0.12); rug.receiveShadow = true; scene.add(rug);
  const rugRing = new THREE.Mesh(new THREE.RingGeometry(Math.min(W, D) * 0.25, Math.min(W, D) * 0.26, 64), new THREE.MeshBasicMaterial({ color: theme.accent }));
  rugRing.rotation.x = -Math.PI / 2; rugRing.position.set(0, 0.015, D * 0.12); scene.add(rugRing);

  // Mebel (xona turiga qarab)
  // Hammom (vanna + hojatxona) chap-orqa burchakda, shkaf o'ng-orqa burchakda — HAMMA xonalarda
  bathroom(scene, W, D, H, theme);
  wardrobe(scene, W / 2 - 1.05, -D / 2 + 0.42, theme);
  const bathEdge = -W / 2 + 2.05;
  const twin = themeKey === 'ocean';
  if (twin) {
    const b1 = bathEdge + 0.8 + 0.8;
    bed(scene, b1, -D / 2 + 1.3, 1.6, theme);
    lamp(scene, b1 + 1.15, -D / 2 + 0.5, theme);
    bed(scene, b1 + 2.3, -D / 2 + 1.3, 1.6, theme);
  } else {
    const bw = themeKey === 'royal' ? 2.8 : 2.2;
    const xb = themeKey === 'royal' ? 0 : bathEdge + 0.8 + bw / 2;
    bed(scene, xb, -D / 2 + 1.3, bw, theme);
    lamp(scene, xb - bw / 2 - 0.45, -D / 2 + 0.5, theme);
    lamp(scene, xb + bw / 2 + 0.45, -D / 2 + 0.5, theme);
  }
  if (themeKey === 'sunset') {
    bed(scene, -W / 2 + 1.2, D / 2 - 1.0, 1.1, theme, Math.PI / 2);
    bed(scene, -W / 2 + 1.2, D / 2 - 2.5, 1.1, theme, Math.PI / 2);
  }
  if (['emerald', 'sunset', 'violet'].includes(themeKey)) {
    sofa(scene, W * 0.18, D / 2 - 1.2, 2.6, theme, Math.PI);
    box(1.3, 0.35, 0.7, std(0x111111, { roughness: 0.15, metalness: 0.5 }), W * 0.18, 0.18, D / 2 - 2.4, scene); // kofe stoli
  }
  if (themeKey === 'violet') {
    // shaxsiy bar
    box(2.6, 1.1, 0.6, std(0x120e1c, { roughness: 0.2, metalness: 0.4 }), -W / 2 + 1.8, 0.55, D / 2 - 0.8, scene);
    const neon = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: theme.accent }));
    neon.position.set(-W / 2 + 1.8, 1.12, D / 2 - 0.5); scene.add(neon);
  }
  if (themeKey === 'royal') {
    animated.push({ obj: chandelier(scene, 0, H - 1.0, 0.5, theme), fn: (o, t) => (o.rotation.y = t * 0.15) });
    // ovqatlanish stoli + stullar
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 48), std(0x1a0f08, { roughness: 0.15, metalness: 0.3 }));
    tbl.position.set(W / 2 - 2.6, 0.78, D / 2 - 2.4); tbl.castShadow = true; scene.add(tbl);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.75), std(theme.accent, { metalness: 1, roughness: 0.2 }));
    leg.position.set(W / 2 - 2.6, 0.38, D / 2 - 2.4); scene.add(leg);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ch = new THREE.Group();
      box(0.45, 0.08, 0.45, std(theme.fabric), 0, 0.48, 0, ch);
      box(0.45, 0.6, 0.06, std(theme.accent, { metalness: 0.8, roughness: 0.3 }), 0, 0.8, -0.2, ch);
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.04, 0.46, 0.04, std(theme.accent, { metalness: 1 }), lx, 0.23, lz, ch);
      ch.position.set(W / 2 - 2.6 + Math.cos(a) * 1.5, 0, D / 2 - 2.4 + Math.sin(a) * 1.5);
      ch.lookAt(W / 2 - 2.6, 0, D / 2 - 2.4); ch.rotation.y += Math.PI;
      scene.add(ch);
    }
    // ustunlar (karavot yonida)
    for (const sx of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, H, 24), std(0xf1e9da, { roughness: 0.3 }));
      col.position.set(sx * 2.9, H / 2, -D / 2 + 0.5); col.castShadow = true; scene.add(col);
      box(0.7, 0.15, 0.7, std(theme.accent, { metalness: 1, roughness: 0.2 }), sx * 2.9, H - 0.08, -D / 2 + 0.5, scene);
    }
    // Panorama oyna oldida divan (oynaga qarab) + yonida kichik stol va 2 ta turkcha choy
    const sofaX = W / 2 - 1.8, sofaZ = -1.0;
    sofa(scene, sofaX, sofaZ, 2.6, theme, Math.PI / 2);
    for (const dz of [-0.7, 0.7]) box(0.12, 0.38, 0.45, std(theme.fabric, { roughness: 1 }), sofaX - 0.22, 0.62, sofaZ + dz, scene); // yostiqchalar
    const ty = sideTable(scene, sofaX, sofaZ - 1.75, theme);
    turkishTea(scene, sofaX - 0.1, ty, sofaZ - 1.82, animated);
    turkishTea(scene, sofaX + 0.11, ty, sofaZ - 1.66, animated);
  }
  const tvZ = themeKey === 'sunset' ? -0.3 : D * 0.1;
  const screen = tv(scene, -W / 2 + 0.1, 1.6, tvZ, Math.PI / 2);
  box(0.5, 0.5, 2.6, std(0x15100c, { roughness: 0.4 }), -W / 2 + 0.3, 0.25, tvZ, scene);
  plant(scene, W / 2 - 0.8, D / 2 - 0.8);
  if (!['violet', 'sunset'].includes(themeKey)) plant(scene, -W / 2 + 0.7, D / 2 - 0.7);

  // Chang zarralari (oltin "pyl") — kinematik effekt
  const pCount = 300;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) { pp[i * 3] = (Math.random() - 0.5) * W; pp[i * 3 + 1] = Math.random() * H; pp[i * 3 + 2] = (Math.random() - 0.5) * D; }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: theme.light, size: 0.025, transparent: true, opacity: 0.7 }));
  scene.add(dust);
  animated.push({ obj: dust, fn: (o, t) => { o.rotation.y = t * 0.02; o.position.y = Math.sin(t * 0.3) * 0.1; } });
  animated.push({ obj: screen, fn: (o, t) => o.material.color.setHSL((t * 0.03) % 1, 0.5, 0.15) });

  // Yorug'lik
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1008, 0.55));
  const moon = new THREE.DirectionalLight(theme.sky[1], 1.2);
  moon.position.set(W, H * 1.5, 2); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -W, right: W, top: D, bottom: -D });
  scene.add(moon);
  const ceil = new THREE.PointLight(theme.light, themeKey === 'royal' ? 6 : 12, 14, 1.5);
  ceil.position.set(0, H - 0.3, 0.5); scene.add(ceil);

  return { scene, theme, W, D, H, animated };
}

/** Sahnani canvasga chizadi va kino kamerasini aylantiradi. */
export class RoomViewer {
  constructor(canvas, { interactive = false } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    this.clock = new THREE.Clock();
    this.autoCam = true;
    this.running = false;
    if (interactive) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
      this.controls.addEventListener('start', () => { this.autoCam = false; this.onManual?.(); });
    }
    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
  }

  load(themeKey) {
    if (this.room) this.room.scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    this.room = buildRoom(themeKey);
    this.t0 = this.clock.getElapsedTime();
    this.resize();
    if (this.controls) {
      this.controls.minDistance = 1.5;
      this.controls.maxDistance = Math.max(this.room.W, this.room.D);
      this.controls.target.set(0, 1.1, 0);
    }
    this.autoCam = true;
    this.updateAutoCam(0);
  }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  updateAutoCam(t) {
    const { W, D, H } = this.room;
    // Kino trayektoriyasi: sekin aylanish + yaqinlashib-uzoqlashish
    const a = t * 0.12 + 0.6;
    const r = Math.min(W, D) * 0.42 + Math.sin(t * 0.25) * 0.5;
    this.camera.position.set(Math.cos(a) * r * 0.9, H * 0.48 + Math.sin(t * 0.18) * 0.35, Math.sin(a) * r * 0.75 + D * 0.08);
    this.camera.lookAt(Math.sin(t * 0.1) * 0.8, 1.0, -D * 0.12);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const t = this.clock.getElapsedTime() - this.t0;
      if (this.autoCam) this.updateAutoCam(t);
      else this.controls?.update();
      for (const a of this.room.animated) a.fn(a.obj, t);
      this.renderer.render(this.room.scene, this.camera);
    };
    loop();
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  setAuto(on) {
    this.autoCam = on;
    if (on) this.t0 = this.clock.getElapsedTime() - 0;
  }

  /** Karta uchun statik surat (data URL) */
  snapshot(themeKey, w = 640, h = 420) {
    this.load(themeKey);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.updateAutoCam(2.5);
    this.renderer.render(this.room.scene, this.camera);
    return this.canvas.toDataURL('image/jpeg', 0.85);
  }
}
