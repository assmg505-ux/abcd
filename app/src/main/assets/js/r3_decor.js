// GUBS 3D renderer: biome scenery (10 kits), hazy hills, sky clouds, asteroids and planets.
(function () {
  'use strict';
  const R3 = window.R3;
  if (!R3 || !R3.T) return;
  const T = R3.T, S = 40, TAU = Math.PI * 2, X = R3.X, Y = R3.Y, hash = R3.hash;
  const FY = R3.FIELD_Y;
  const M = R3.mesh, box = R3.box, sph = R3.sph, cyl = R3.cyl, cone = R3.cone, ico = R3.ico, oct = R3.oct, tor = R3.tor;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function seeded(seed) { let a = (seed | 0) ^ 0x9e3779b9; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const add = (g, geo, color, pos, scale, rot, outline, o) => { const m = M(geo, color, Object.assign({ pos, scale, rot, outline }, o || {})); g.add(m); return m; };
  const puff = (g, color, x, y, z, r, ol) => add(g, sph(1, 16, 12), color, [x, y, z], [r, r * 0.92, r], null, ol == null ? 0.1 : ol);
  const emissive = (color, em, k) => R3.toon(color, { emissive: new T.Color(em), emissiveIntensity: k == null ? 0.8 : k });
  const glowMat = c => new T.MeshBasicMaterial({ color: c, fog: true });
  function tex(w, h, draw, rx, ry) { return R3.mkTex(w, h, draw, rx, ry); }
  const cachedTex = {};
  function ctex(key, w, h, draw) { return cachedTex[key] || (cachedTex[key] = tex(w, h, draw)); }

  // ================= prop builders =================
  const P = {};
  // ----- 0 candy meadow -----
  P.cottonTree = r => {
    const g = new T.Group(), h = 2.2 + r() * 1.2;
    add(g, cyl(0.22, 0.34, h, 8), '#8a5a3a', [0, h / 2, 0], null, null, 0.07);
    const cols = ['#ffb36b', '#ffc86b', '#ff9a6b', '#ffd98a', '#ffa86b'];
    for (let i = 0; i < 6; i++) puff(g, cols[(r() * cols.length) | 0], (r() - 0.5) * 2.2, h + 0.5 + r() * 1.5, (r() - 0.5) * 1.6, 0.95 + r() * 0.7);
    puff(g, '#ffd98a', 0, h + 1.6, 0, 1.3);
    return g;
  };
  P.pinkTree = r => {
    const g = new T.Group(), h = 2 + r();
    add(g, cyl(0.2, 0.3, h, 8), '#9a6a7a', [0, h / 2, 0], null, null, 0.07);
    const cols = ['#ff9ad0', '#ffb3de', '#ff86c4'];
    for (let i = 0; i < 6; i++) puff(g, cols[(r() * 3) | 0], (r() - 0.5) * 2, h + 0.4 + r() * 1.4, (r() - 0.5) * 1.4, 0.9 + r() * 0.6);
    return g;
  };
  const swirlTex = () => ctex('swirl', 128, 128, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ff6fb1'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < 90; i++) { const a = i * 0.28, rr = 4 + i * 0.62; c.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr); }
    c.stroke();
  });
  P.lolli = r => {
    const g = new T.Group(), h = 3 + r() * 1.6, col = ['#ff6fb1', '#5cc4ff', '#b07cff', '#ffd84a', '#5ee07a'][(r() * 5) | 0];
    add(g, cyl(0.1, 0.1, h, 8), '#ffffff', [0, h / 2, 0], null, null, 0.06);
    const disc = add(g, cyl(1.25, 1.25, 0.3, 24), '#ffffff', [0, h + 0.8, 0], null, [Math.PI / 2, 0, 0], 0.07);
    disc.material = R3.toon(col, { map: swirlTex() });
    return g;
  };
  P.gumdrop = r => {
    const g = new T.Group(), col = ['#ff9ad0', '#9ae6ff', '#ffe08a', '#b7f0a0'][(r() * 4) | 0], s = 1 + r() * 0.8;
    add(g, sph(1, 18, 12), col, [0, 0, 0], [1.6 * s, 1.5 * s, 1.6 * s], null, 0.09);
    for (let i = 0; i < 8; i++) { const a = r() * TAU; add(g, box(0.28, 0.1, 0.1), ['#fff', '#ff5f9a', '#5cc4ff'][i % 3], [Math.cos(a) * 1.1 * s, 0.9 * s + r() * 0.5 * s, Math.sin(a) * 1.1 * s], null, [0, a, r()], 0, { cast: false }); }
    return g;
  };
  P.flowers = r => {
    const g = new T.Group();
    for (let i = 0; i < 5; i++) {
      const x = (r() - 0.5) * 3, z = (r() - 0.5) * 2, h = 0.7 + r() * 0.7;
      add(g, cyl(0.04, 0.04, h, 5), '#3fae4a', [x, h / 2, z], null, null, 0, { cast: false });
      add(g, sph(1, 10, 8), ['#ff6fb1', '#ffd84a', '#ffffff', '#b07cff'][(r() * 4) | 0], [x, h + 0.1, z], [0.28, 0.22, 0.28], null, 0.06, { cast: false });
    }
    return g;
  };
  P.fence = r => {
    const g = new T.Group();
    for (let i = 0; i < 4; i++) add(g, box(0.18, 1.1, 0.18), '#e8d6b0', [i * 1.3 - 2, 0.55, 0], null, null, 0.05);
    add(g, box(4.2, 0.14, 0.1), '#e8d6b0', [0, 0.85, 0], null, null, 0.04); add(g, box(4.2, 0.14, 0.1), '#e8d6b0', [0, 0.45, 0], null, null, 0.04);
    return g;
  };
  P.candyCane = r => {
    const g = new T.Group();
    const t2 = ctex('cane', 64, 128, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff3b5c'; c.fillRect(0, i * 16, w, 16); } });
    const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0, 2.2, 0), new T.Vector3(0.1, 3.2, 0), new T.Vector3(0.8, 3.7, 0), new T.Vector3(1.4, 3.1, 0)]);
    const tg = R3.geo('canetube', () => new T.TubeGeometry(curve, 24, 0.22, 8, false));
    const m = new T.Mesh(tg, R3.toon('#ffffff', { map: t2 })); m.castShadow = true; g.add(m);
    return g;
  };
  P.tuft = r => {
    const g = new T.Group();
    for (let i = 0; i < 6; i++) add(g, cone(0.12, 0.7 + r() * 0.5, 4), '#4fc04a', [(r() - 0.5) * 1.2, 0.35, (r() - 0.5) * 0.8], null, [0, 0, (r() - 0.5) * 0.5], 0.03, { cast: false });
    return g;
  };
  P.bush = r => { const g = new T.Group(); const c = ['#5fd35f', '#7fe06a', '#4fc04a'][(r() * 3) | 0]; for (let i = 0; i < 3; i++) puff(g, c, (i - 1) * 0.9, 0.55, (r() - 0.5) * 0.4, 0.8 + r() * 0.3); return g; };

  // ----- 1 sunset dunes -----
  P.cactus = r => {
    const g = new T.Group(), h = 2.5 + r() * 1.5, c = '#4fae5a';
    add(g, cyl(0.42, 0.45, h, 10), c, [0, h / 2, 0], null, null, 0.07);
    add(g, sph(0.42, 10, 8), c, [0, h, 0], null, null, 0.07);
    for (const s of [-1, 1]) if (r() > 0.3) {
      const y = h * (0.4 + r() * 0.2);
      add(g, cyl(0.24, 0.24, 0.9, 8), c, [s * 0.65, y, 0], null, [0, 0, Math.PI / 2], 0.06);
      add(g, cyl(0.24, 0.24, 0.9 + r() * 0.6, 8), c, [s * 1.05, y + 0.5, 0], null, null, 0.06);
      add(g, sph(0.24, 8, 6), c, [s * 1.05, y + 0.95 + 0.3, 0], null, null, 0.06);
    }
    if (r() > 0.5) add(g, sph(0.16, 8, 6), '#ff6fb1', [0.2, h + 0.35, 0.3], null, null, 0.04);
    return g;
  };
  P.dune = r => { const g = new T.Group(); add(g, sph(1, 18, 10), ['#f2c56a', '#e8b25a', '#f7d27a'][(r() * 3) | 0], [0, 0, 0], [4 + r() * 3, 1.3 + r(), 2.4], null, 0.06, { cast: false }); return g; };
  P.rockPile = r => { const g = new T.Group(); for (let i = 0; i < 3; i++) add(g, R3.rockGeo ? R3.rockGeo(i + (r() * 9 | 0), 1) : ico(1, 1), ['#c98f5a', '#b57a48', '#d9a46a'][i], [(i - 1) * 1.2, 0.5 + i * 0.1, (r() - 0.5)], [0.9 + r() * 0.7, 0.7 + r() * 0.5, 0.9], [0, r() * 3, 0], 0.08); return g; };
  P.palm = r => {
    const g = new T.Group(), h = 3.4 + r() * 1.4, lean = (r() - 0.5) * 0.5;
    for (let i = 0; i < 5; i++) add(g, cyl(0.2 - i * 0.012, 0.24 - i * 0.012, h / 5, 8), '#b8905c', [lean * i * 0.35, h / 5 * (i + 0.5), 0], null, [0, 0, -lean * 0.25], 0.06);
    const tx = lean * 5 * 0.35;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(g, sph(1, 10, 6), '#3fae4a', [tx + Math.cos(a) * 1.2, h + 0.1, Math.sin(a) * 1.2], [1.5, 0.12, 0.45], [0, -a, 0.3], 0.06); }
    add(g, sph(0.22, 8, 6), '#7a5a30', [tx, h - 0.2, 0.2], null, null, 0.04);
    return g;
  };
  P.pyramid = r => { const g = new T.Group(); add(g, cone(3, 3.6, 4), '#e0b25a', [0, 1.8, 0], null, [0, Math.PI / 4, 0], 0.07); return g; };

  // ----- 2 neon night -----
  const winTex = col => ctex('win' + col, 64, 128, (c, w, h) => {
    c.fillStyle = '#1a1038'; c.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 6; y += 16) for (let x = 6; x < w - 6; x += 16) { c.fillStyle = hash(x * 7 + y * 13 + col.length) > 0.4 ? col : '#2a1a58'; c.fillRect(x, y, 9, 9); }
  });
  P.tower = r => {
    const g = new T.Group(), h = 5 + r() * 10, w = 2 + r() * 1.6, col = ['#2ef2ff', '#ff5fd2', '#ffd84a'][(r() * 3) | 0];
    const m = add(g, box(w, h, w), '#fff', [0, h / 2, 0], null, null, 0.07); m.material = new T.MeshBasicMaterial({ map: winTex(col) });
    m.material.map.repeat.set(1, h / 6);
    add(g, box(w + 0.2, 0.25, w + 0.2), col, [0, h + 0.1, 0], null, null, 0, { cast: false }).material = glowMat(col);
    if (r() > 0.5) add(g, cyl(0.05, 0.05, 1.5, 4), '#ff3b6b', [0, h + 0.9, 0], null, null, 0, { cast: false });
    return g;
  };
  P.neonRing = r => { const g = new T.Group(), col = ['#2ef2ff', '#ff5fd2', '#ffd84a'][(r() * 3) | 0]; const m = add(g, tor(1.6, 0.14, 8, 28), col, [0, 2.2, 0], null, null, 0, { cast: false }); m.material = glowMat(col); add(g, cyl(0.1, 0.1, 1, 6), '#3a2470', [0, 0.5, 0], null, null, 0.05); return g; };
  P.pylon = r => { const g = new T.Group(); add(g, cyl(0.2, 0.4, 5, 6), '#3a2470', [0, 2.5, 0], null, null, 0.06); add(g, sph(0.4, 10, 8), '#ff5fd2', [0, 5.2, 0], null, null, 0).material = glowMat('#ff5fd2'); return g; };
  P.skyline = r => { const g = new T.Group(); for (let i = 0; i < 5; i++) add(g, box(2 + r() * 2, 4 + r() * 8, 2), '#1f1150', [(i - 2) * 2.8, 3, 0], null, null, 0, { cast: false }); return g; };

  // ----- 3 frosty peaks -----
  P.pine = r => {
    const g = new T.Group(), s = 1 + r() * 0.5;
    add(g, cyl(0.2, 0.26, 1, 7), '#6b4a2a', [0, 0.5, 0], null, null, 0.06);
    for (let i = 0; i < 3; i++) { add(g, cone(1.5 * s - i * 0.35, 1.7, 8), '#3f7d6c', [0, 1.4 + i * 1.0, 0], null, null, 0.07); add(g, cone(1.0 * s - i * 0.25, 0.8, 8), '#ffffff', [0, 1.85 + i * 1.0, 0], null, null, 0.05, { cast: false }); }
    return g;
  };
  P.iceSpire = r => { const g = new T.Group(), h = 3 + r() * 3; const m = add(g, cone(0.9, h, 5), '#bfe8ff', [0, h / 2, 0], null, null, 0.07); m.material = emissive('#bfe8ff', '#6cc8ff', 0.35); add(g, cone(0.5, h * 0.6, 5), '#9fd8ff', [0.9, h * 0.3, 0.3], null, null, 0.06); return g; };
  P.snowman = r => {
    const g = new T.Group();
    add(g, sph(1, 14, 10), '#ffffff', [0, 0.8, 0], [0.9, 0.85, 0.9], null, 0.07); add(g, sph(1, 14, 10), '#ffffff', [0, 1.9, 0], [0.65, 0.62, 0.65], null, 0.07); add(g, sph(1, 14, 10), '#ffffff', [0, 2.8, 0], [0.45, 0.43, 0.45], null, 0.07);
    add(g, cone(0.08, 0.5, 6), '#ff8a4a', [0, 2.8, 0.5], null, [Math.PI / 2, 0, 0], 0.03); add(g, cyl(0.3, 0.3, 0.35, 8), '#3b2a52', [0, 3.4, 0], null, null, 0.05); add(g, cyl(0.5, 0.5, 0.06, 10), '#3b2a52', [0, 3.22, 0], null, null, 0.04);
    for (const s of [-1, 1]) add(g, cyl(0.03, 0.03, 1, 4), '#6b4a2a', [s * 0.85, 2.0, 0], null, [0, 0, -s * 1.0], 0, { cast: false });
    return g;
  };
  P.drift = r => { const g = new T.Group(); add(g, sph(1, 16, 8), '#ffffff', [0, 0, 0], [3 + r() * 2, 0.9, 2], null, 0.05, { cast: false }); return g; };

  // ----- 4 lava land -----
  P.volcano = r => {
    const g = new T.Group(), s = 1 + r() * 0.6;
    add(g, cone(3.4 * s, 4.4 * s, 9), '#3b1d1a', [0, 2.2 * s, 0], null, null, 0.08);
    const cr = add(g, cyl(1.0 * s, 1.0 * s, 0.2, 14), '#ff7a2e', [0, 4.35 * s, 0], null, null, 0, { cast: false }); cr.material = glowMat('#ff8a2e');
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); const st = add(g, box(0.28, 2.2 * s, 0.12), '#ff6a1a', [Math.cos(a) * 1.0 * s, 3.2 * s, Math.sin(a) * 1.0 * s + 1.4 * s], null, [0.25, a, 0.1], 0, { cast: false }); st.material = glowMat('#ff7a2e'); }
    return g;
  };
  P.lavaRock = r => { const g = new T.Group(); const m = add(g, R3.rockGeo ? R3.rockGeo((r() * 9) | 0, 1) : ico(1, 1), '#2a1512', [0, 0.8, 0], [1.2 + r() * 0.5, 1 + r() * 0.6, 1.1], [0, r() * 3, 0], 0.08); for (let i = 0; i < 3; i++) { const c = add(g, box(0.1, 0.6, 0.1), '#ff7a2e', [(r() - 0.5) * 1.2, 0.9, 0.9], null, [0, 0, r()], 0, { cast: false }); c.material = glowMat('#ff8a2e'); } return g; };
  P.charTree = r => { const g = new T.Group(), h = 3 + r() * 1.6; add(g, cyl(0.14, 0.3, h, 6), '#1d0f0c', [0, h / 2, 0], null, null, 0.06); for (let i = 0; i < 4; i++) { const a = r() * TAU; add(g, cyl(0.05, 0.1, 1.4, 5), '#1d0f0c', [Math.cos(a) * 0.5, h * (0.5 + i * 0.12), Math.sin(a) * 0.3], null, [0, 0, Math.cos(a) * 0.9], 0.04); } return g; };
  P.lavaPool = r => { const g = new T.Group(); const m = add(g, cyl(2 + r() * 1.5, 2.2, 0.15, 18), '#ff7a2e', [0, 0.05, 0], null, null, 0, { cast: false }); m.material = glowMat('#ff8a2e'); const rim = add(g, tor(2.4, 0.25, 6, 20), '#2a1512', [0, 0.1, 0], null, [Math.PI / 2, 0, 0], 0.05, { cast: false }); rim.scale.set(1.2, 1.2, 0.5); return g; };

  // ----- 5 haunted hollow -----
  P.deadTree = r => {
    const g = new T.Group(), h = 3 + r() * 2;
    add(g, cyl(0.2, 0.42, h, 7), '#2a2040', [0, h / 2, 0], null, [0, 0, (r() - 0.5) * 0.2], 0.07);
    for (let i = 0; i < 5; i++) { const s = r() > 0.5 ? 1 : -1; add(g, cyl(0.04, 0.12, 1.5 + r(), 5), '#2a2040', [s * 0.5, h * (0.45 + i * 0.1), 0], null, [0, 0, -s * (0.9 + r() * 0.5)], 0.04); }
    return g;
  };
  P.tomb = r => { const g = new T.Group(); add(g, box(1.3, 1.7, 0.5), '#8a8fb0', [0, 0.85, 0], null, null, 0.07); add(g, cyl(0.65, 0.65, 0.5, 14), '#8a8fb0', [0, 1.7, 0], null, [Math.PI / 2, 0, 0], 0.07); add(g, box(0.1, 0.7, 0.05), '#5a5f80', [0, 1.2, 0.28], null, null, 0, { cast: false }); add(g, box(0.5, 0.1, 0.05), '#5a5f80', [0, 1.35, 0.28], null, null, 0, { cast: false }); return g; };
  P.pumpkin = r => {
    const g = new T.Group();
    const body = add(g, sph(1, 14, 10), '#ff8a1a', [0, 0.8, 0], [1.2, 0.95, 1.1], null, 0.08);
    add(g, cyl(0.1, 0.14, 0.4, 5), '#3f7d3a', [0, 1.7, 0], null, null, 0.05);
    for (const s of [-1, 1]) { const e = add(g, cone(0.2, 0.34, 3), '#ffe14a', [s * 0.38, 1.0, 1.05], null, [Math.PI / 2 * 0, 0, 0], 0, { cast: false }); e.material = glowMat('#ffe14a'); }
    const m = add(g, box(0.7, 0.18, 0.1), '#ffe14a', [0, 0.55, 1.08], null, null, 0, { cast: false }); m.material = glowMat('#ffe14a');
    return g;
  };
  P.ghost = r => { const g = new T.Group(); add(g, sph(1, 14, 10), '#eaf6ff', [0, 2.2, 0], [0.7, 0.9, 0.6], null, 0.06, { cast: false }); add(g, cyl(0.7, 0.55, 1.0, 12), '#eaf6ff', [0, 1.4, 0], null, null, 0.06, { cast: false }); add(g, sph(0.12, 6, 5), '#2b1640', [-0.22, 2.3, 0.5], null, null, 0, { cast: false }); add(g, sph(0.12, 6, 5), '#2b1640', [0.22, 2.3, 0.5], null, null, 0, { cast: false }); return g; };
  P.moon = r => { const g = new T.Group(); const m = add(g, sph(1, 24, 16), '#f5e6a0', [0, 0, 0], [1, 1, 1], null, 0, { cast: false }); m.material = new T.MeshBasicMaterial({ color: 0xf5e6a0, fog: false }); return g; };

  // ----- 6 jungle ruins -----
  P.jungleTree = r => {
    const g = new T.Group(), h = 4 + r() * 3;
    add(g, cyl(0.3, 0.5, h, 8), '#6b4a2a', [0, h / 2, 0], null, null, 0.07);
    for (let i = 0; i < 5; i++) puff(g, ['#2f9e4a', '#3fae4a', '#4fc04a'][(r() * 3) | 0], (r() - 0.5) * 2.4, h + 0.2 + r() * 1.2, (r() - 0.5) * 1.6, 1.2 + r() * 0.8);
    return g;
  };
  P.pillar = r => { const g = new T.Group(), n = 3 + ((r() * 3) | 0); for (let i = 0; i < n; i++) add(g, cyl(0.7 - i * 0.02, 0.75, 0.9, 10), '#9aa38a', [0, 0.45 + i * 0.92, 0], null, [0, r() * 0.3, 0], 0.06).material = R3.toon('#a8b098', { map: R3.texStone() }); puff(g, '#3fae4a', 0, n * 0.92, 0.3, 0.5); return g; };
  P.fern = r => { const g = new T.Group(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; add(g, sph(1, 8, 6), '#3fae4a', [Math.cos(a) * 0.9, 0.7, Math.sin(a) * 0.9], [0.9, 0.12, 0.3], [0, -a, 0.6], 0.04, { cast: false }); } return g; };
  P.idol = r => { const g = new T.Group(); add(g, box(1.6, 2.4, 1.4), '#8a937a', [0, 1.2, 0], null, null, 0.07).material = R3.toon('#9aa38a', { map: R3.texStone() }); for (const s of [-1, 1]) add(g, sph(0.2, 8, 6), '#2b1640', [s * 0.35, 1.7, 0.72], null, null, 0, { cast: false }); add(g, box(0.7, 0.14, 0.1), '#2b1640', [0, 1.1, 0.72], null, null, 0, { cast: false }); return g; };

  // ----- 7 crystal gardens -----
  P.crystals = r => {
    const g = new T.Group(), cols = ['#ff7ad9', '#7cf2e6', '#b07cff', '#ffe08a'];
    for (let i = 0; i < 5; i++) { const c = cols[(r() * cols.length) | 0], h = 1.4 + r() * 3; const m = add(g, oct(0.8), c, [(i - 2) * 0.7, h * 0.5, (r() - 0.5) * 1.2], [0.55, h, 0.55], [0, r() * 3, (r() - 0.5) * 0.4], 0.07); m.material = emissive(c, c, 0.45); }
    return g;
  };
  P.shroom = r => { const g = new T.Group(), h = 1.4 + r() * 1.4, c = ['#ff6fb1', '#b07cff', '#5cc4ff'][(r() * 3) | 0]; add(g, cyl(0.25, 0.32, h, 8), '#f5e6d0', [0, h / 2, 0], null, null, 0.06); const cap = add(g, sph(1, 16, 10), c, [0, h, 0], [1.3, 0.8, 1.3], null, 0.08); for (let i = 0; i < 5; i++) { const a = r() * TAU; add(g, sph(0.12, 6, 5), '#fff', [Math.cos(a) * 0.8, h + 0.45, Math.sin(a) * 0.8], null, null, 0, { cast: false }); } return g; };
  P.orb = r => { const g = new T.Group(), c = ['#7cf2e6', '#ff7ad9', '#ffe08a'][(r() * 3) | 0]; const m = add(g, sph(0.55, 12, 10), c, [0, 2.5 + r() * 2, 0], null, null, 0, { cast: false }); m.material = glowMat(c); return g; };
  P.geode = r => { const g = new T.Group(); add(g, sph(1, 14, 8), '#4a3a8a', [0, 0.4, 0], [1.6, 0.9, 1.3], null, 0.07); for (let i = 0; i < 4; i++) { const m = add(g, oct(0.3), '#ff7ad9', [(i - 1.5) * 0.45, 1.0, (r() - 0.5) * 0.4], [0.6, 1.6, 0.6], [0, 0, (r() - 0.5) * 0.4], 0.05); m.material = emissive('#ff7ad9', '#ff7ad9', 0.5); } return g; };

  // ----- 8 toyland -----
  const letterTex = (col, ch) => ctex('let' + col + ch, 96, 96, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = '900 64px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + 4); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); });
  P.toyBlock = r => {
    const g = new T.Group(), n = 1 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) { const col = ['#ff6fb1', '#5cc4ff', '#ffd84a', '#5ee07a', '#b07cff'][(r() * 5) | 0], ch = 'GUBS!ABC'[(r() * 8) | 0]; const m = add(g, box(1.6, 1.6, 1.6), '#fff', [(r() - 0.5) * 0.5, 0.8 + i * 1.6, 0], null, [0, (r() - 0.5) * 0.5, 0], 0.07); m.material = R3.toon('#ffffff', { map: letterTex(col, ch) }); }
    return g;
  };
  P.balloon = r => { const g = new T.Group(), c = ['#ff6fb1', '#5cc4ff', '#ffd84a', '#5ee07a'][(r() * 4) | 0]; add(g, sph(1, 16, 12), c, [0, 4 + r(), 0], [0.9, 1.1, 0.9], null, 0.08); add(g, cyl(0.02, 0.02, 3.4, 4), '#ffffff', [0, 2.2, 0], null, null, 0, { cast: false }); return g; };
  P.spinTop = r => { const g = new T.Group(); add(g, cone(1.1, 1.8, 10), '#ff6fb1', [0, 0.9, 0], null, [Math.PI, 0, 0], 0.07); add(g, cyl(1.3, 1.3, 0.25, 14), '#ffd84a', [0, 1.8, 0], null, null, 0.07); add(g, cyl(0.12, 0.12, 0.8, 6), '#5cc4ff', [0, 2.3, 0], null, null, 0.05); return g; };
  P.rainbow = r => { const g = new T.Group(), cols = ['#ff5f5f', '#ff9a3c', '#ffd84a', '#5ee07a', '#5cc4ff', '#b07cff']; cols.forEach((c, i) => { const m = add(g, tor(4 - i * 0.28, 0.14, 6, 24), c, [0, 0, 0], null, null, 0, { cast: false }); m.geometry = R3.geo('rb' + i, () => new T.TorusGeometry(4 - i * 0.28, 0.14, 6, 24, Math.PI)); }); return g; };

  // ----- 9 coral reef -----
  P.coral = r => {
    const g = new T.Group(), c = ['#ff7a9a', '#ff9a5c', '#ffb3de'][(r() * 3) | 0];
    for (let i = 0; i < 4; i++) { const h = 1.2 + r() * 2, x = (i - 1.5) * 0.7; add(g, cyl(0.14, 0.24, h, 6), c, [x, h / 2, (r() - 0.5) * 0.5], null, [0, 0, (r() - 0.5) * 0.4], 0.06); add(g, sph(0.24, 8, 6), c, [x, h, (r() - 0.5) * 0.5], null, null, 0.05); }
    return g;
  };
  P.kelp = r => { const g = new T.Group(), h = 4 + r() * 3; for (let i = 0; i < 6; i++) add(g, sph(1, 8, 6), '#2f9e6a', [Math.sin(i * 0.9) * 0.3, i * h / 6 + 0.4, 0], [0.35, h / 11, 0.2], null, 0.04); return g; };
  P.shell = r => { const g = new T.Group(); add(g, sph(1, 12, 8), '#ffd0e0', [0, 0.6, 0], [1.1, 0.8, 0.9], [0, 0, 0], 0.07); add(g, cone(0.7, 1.1, 8), '#ffb3d0', [0.8, 0.6, 0], null, [0, 0, -Math.PI / 2], 0.06); return g; };
  P.jelly = r => { const g = new T.Group(), y = 3 + r() * 3; const d = add(g, sph(1, 14, 8), '#ff9ad0', [0, y, 0], [1.2, 0.9, 1.2], null, 0.06, { cast: false }); d.material = R3.toon('#ff9ad0', { transparent: true, opacity: 0.82 }); for (let i = 0; i < 5; i++) add(g, cyl(0.04, 0.03, 1.6, 4), '#ffb3de', [(i - 2) * 0.35, y - 1.2, 0], null, null, 0, { cast: false }); return g; };
  P.bubbles = r => { const g = new T.Group(); for (let i = 0; i < 6; i++) { const m = add(g, sph(1, 8, 6), '#ffffff', [(r() - 0.5) * 2, 1 + r() * 4, (r() - 0.5)], [0.2 + r() * 0.3, 0.2 + r() * 0.3, 0.2], null, 0, { cast: false }); m.material = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }); } return g; };

  // ----- distant hills (shape by biome) -----
  function hill(kind, col, r) {
    const g = new T.Group();
    let m;
    if (kind === 'jag') { m = add(g, cone(1.2, 1.6, 7), col, [0, 0.8, 0], [1, 1, 1], null, 0, { cast: false }); const cap = add(g, cone(0.55, 0.62, 7), '#ffffff', [0, 1.3, 0], null, null, 0, { cast: false }); }
    else if (kind === 'volc') { m = add(g, cone(1.3, 1.4, 9), col, [0, 0.7, 0], null, null, 0, { cast: false }); }
    else if (kind === 'tower') { for (let i = 0; i < 4; i++) add(g, box(0.4 + r() * 0.4, 1 + r() * 2.2, 0.4), col, [(i - 1.5) * 0.7, 0.8, 0], null, null, 0, { cast: false }); return g; }
    else { m = add(g, sph(1, 18, 10), col, [0, 0, 0], [1.9 + r() * 0.8, 0.8 + r() * 0.5, 1.2], null, 0, { cast: false }); }
    if (m) m.material = new T.MeshBasicMaterial({ color: new T.Color(col), fog: true });
    return g;
  }

  // ================= biome kits =================
  const KITS = [
    { near: ['cottonTree', 'lolli', 'flowers', 'fence', 'bush'], mid: ['cottonTree', 'gumdrop', 'lolli', 'candyCane', 'pinkTree'], far: ['cottonTree', 'gumdrop', 'pinkTree'], front: ['tuft', 'flowers'], hills: [['round', '#b7a4ff'], ['round', '#86df95']] },
    { near: ['cactus', 'rockPile', 'palm'], mid: ['cactus', 'dune', 'rockPile', 'palm'], far: ['dune', 'pyramid', 'cactus'], front: ['tuft', 'rockPile'], hills: [['round', '#e0736b'], ['round', '#f2b25c']] },
    { near: ['pylon', 'neonRing', 'tower'], mid: ['tower', 'neonRing', 'pylon'], far: ['tower', 'skyline'], front: ['tuft'], hills: [['tower', '#2c1660'], ['tower', '#1f1150']] },
    { near: ['pine', 'snowman', 'iceSpire', 'drift'], mid: ['pine', 'iceSpire', 'pine', 'drift'], far: ['pine', 'iceSpire'], front: ['drift', 'tuft'], hills: [['jag', '#bcd2ee'], ['jag', '#9ec0e6']] },
    { near: ['lavaRock', 'charTree', 'lavaPool'], mid: ['volcano', 'lavaRock', 'charTree', 'lavaPool'], far: ['volcano', 'lavaRock'], front: ['lavaRock'], hills: [['volc', '#4a1512'], ['volc', '#341010']] },
    { near: ['deadTree', 'tomb', 'pumpkin', 'ghost'], mid: ['deadTree', 'tomb', 'ghost', 'pumpkin'], far: ['deadTree', 'ghost'], front: ['pumpkin', 'tuft'], hills: [['round', '#3a2a5a'], ['jag', '#2b2146']] },
    { near: ['jungleTree', 'fern', 'pillar', 'idol'], mid: ['jungleTree', 'pillar', 'fern', 'idol'], far: ['jungleTree', 'jungleTree', 'pillar'], front: ['fern', 'tuft'], hills: [['round', '#2f9e4a'], ['round', '#7fd06a']] },
    { near: ['crystals', 'shroom', 'geode', 'orb'], mid: ['crystals', 'shroom', 'orb', 'geode'], far: ['crystals', 'shroom'], front: ['geode', 'tuft'], hills: [['jag', '#6a5cc8'], ['round', '#c070d8']] },
    { near: ['toyBlock', 'balloon', 'spinTop'], mid: ['toyBlock', 'balloon', 'rainbow', 'spinTop'], far: ['rainbow', 'balloon', 'toyBlock'], front: ['tuft', 'toyBlock'], hills: [['round', '#ff9ad0'], ['round', '#ffd84a']] },
    { near: ['coral', 'kelp', 'shell'], mid: ['coral', 'kelp', 'jelly', 'bubbles'], far: ['kelp', 'coral', 'jelly'], front: ['shell', 'tuft'], hills: [['round', '#1a8fb8'], ['round', '#2fc4c0']] }
  ];
  R3.KITS = KITS;
  const LAYERS = [
    { id: 'front', tile: 14, from: -22, to: 60, count: 1, chance: 0.55, zMin: 6.5, zMax: 9.5, sMin: 0.7, sMax: 1.1, cast: false, kitKey: 'front' },
    { id: 'near', tile: 10, from: -30, to: 66, count: 1, chance: 0.8, zMin: -6, zMax: -10, sMin: 0.7, sMax: 1.05, cast: true, kitKey: 'near' },
    { id: 'mid', tile: 12, from: -40, to: 76, count: 1, chance: 0.9, zMin: -13, zMax: -28, sMin: 1.0, sMax: 1.5, cast: true, kitKey: 'mid' },
    { id: 'far', tile: 22, from: -80, to: 120, count: 2, chance: 1, zMin: -36, zMax: -85, sMin: 2.2, sMax: 3.2, cast: false, kitKey: 'far' },
    { id: 'hill', tile: 70, from: -230, to: 280, count: 1, chance: 1, zMin: -160, zMax: -230, sMin: 20, sMax: 30, cast: false, kitKey: 'hill' }
  ];
  const tiles = new Map();
  let root;

  function biomeOf(g, xPx) { return ((Math.floor((xPx / S) / g.biomeLen) % g.biomeCount) + g.biomeCount) % g.biomeCount; }

  function buildTile(L, ti, g) {
    const grp = new T.Group();
    const bi = biomeOf(g, (ti * L.tile + L.tile / 2) * S);
    const kit = KITS[bi % KITS.length];
    const r = seeded(ti * 7919 + L.tile * 31 + bi * 104729);
    if (L.id === 'hill') {
      const hh = kit.hills[(r() * kit.hills.length) | 0];
      const h = hill(hh[0], hh[1], r);
      h.position.set((ti + 0.5) * L.tile + (r() - 0.5) * 20, FY, L.zMin + r() * (L.zMax - L.zMin));
      h.scale.setScalar(L.sMin + r() * (L.sMax - L.sMin));
      grp.add(h);
      return grp;
    }
    if (r() > L.chance) return grp;
    const list = kit[L.kitKey];
    for (let i = 0; i < L.count; i++) {
      const name = list[(r() * list.length) | 0];
      const b = P[name];
      if (!b) continue;
      const o = b(r);
      const s = L.sMin + r() * (L.sMax - L.sMin);
      o.scale.setScalar(s);
      o.rotation.y = (r() - 0.5) * 0.6;
      o.position.set(ti * L.tile + (i + r() * 0.8) * (L.tile / L.count), FY + (name === 'moon' ? 14 : 0), L.zMin + r() * (L.zMax - L.zMin));
      if (name === 'moon') o.scale.setScalar(6);
      o.traverse(m => { if (m.isMesh && !m.userData.outline) { m.castShadow = m.castShadow && L.cast && R3.quality !== 'low'; } });
      grp.add(o);
    }
    return grp;
  }

  // ---------- sky clouds, asteroids and planets ----------
  const cloudMap = new Map();
  function buildCloud(cx, cy) {
    const r = seeded(cx * 9176 + cy * 3331);
    const g = new T.Group(), n = 4 + ((r() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const m = M(sph(1, 12, 8), null, { mat: R3.toon(i % 3 === 0 ? '#fff0f6' : '#ffffff', { emissive: new T.Color('#ffffff'), emissiveIntensity: 0.6 }), outline: 0, cast: false, pos: [(i - n / 2) * 1.5 + (r() - 0.5), (r() - 0.3) * 0.9, (r() - 0.5) * 1.2], scale: [1.6 + r() * 1.2, 1.1 + r() * 0.8, 1.6 + r()] });
      g.add(m);
    }
    g.position.set(cx * 38 + r() * 20, cy * 13 + r() * 8, -8 - r() * 22);
    const s = 1 + r() * 1.3; g.scale.setScalar(s);
    return g;
  }
  const rockMap = new Map();
  function buildAsteroid(cx, cy) {
    const r = seeded(cx * 5521 + cy * 7727);
    const g = new T.Group();
    const m = M(R3.rockGeo ? R3.rockGeo((r() * 9) | 0, 1) : ico(1, 1), ['#6b6f9a', '#8a7fb0', '#9a8fb8'][(r() * 3) | 0], { outline: 0.07, cast: false });
    m.scale.set(1 + r() * 2.2, 0.8 + r() * 1.4, 1 + r() * 1.4);
    g.add(m);
    g.position.set(cx * 30 + r() * 20, cy * 11 + r() * 8, -6 - r() * 40);
    g.userData.spin = (r() - 0.5) * 0.4; g.userData.m = m;
    return g;
  }
  let planets = [];
  function buildPlanets() {
    const defs = [{ c1: '#ff8a6b', c2: '#c44a62', r: 34, p: [-160, 90, -300], ring: false }, { c1: '#6cc8ff', c2: '#3a6fc4', r: 26, p: [210, 150, -340], ring: true }, { c1: '#ffd84a', c2: '#d98a1a', r: 18, p: [20, 220, -380], ring: false }, { c1: '#b9a1ff', c2: '#6a4fd0', r: 44, p: [320, -40, -420], ring: false }];
    defs.forEach(d => {
      const g = new T.Group();
      const m = new T.Mesh(new T.SphereGeometry(d.r, 28, 18), R3.toon(d.c1, { emissive: new T.Color(d.c2), emissiveIntensity: 0.25 }));
      R3.addOutline(m, 1.2);
      g.add(m);
      if (d.ring) { const rg = new T.Mesh(new T.TorusGeometry(d.r * 1.6, d.r * 0.07, 4, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false })); rg.rotation.x = 1.2; rg.rotation.y = 0.3; g.add(rg); }
      g.userData.base = new T.Vector3(d.p[0], d.p[1], d.p[2]);
      m.material.fog = false;
      R3.skyGroup.add(g); planets.push(g);
    });
  }

  R3.decor = {
    update(g, n) {
      if (!root) { root = new T.Group(); R3.add(root); buildPlanets(); }
      const camX = g.camX / S, camY3 = R3.camY3 || 0;
      // ----- biome tiles -----
      const seen = new Set();
      for (const L of LAYERS) {
        const i0 = Math.floor((camX + L.from) / L.tile), i1 = Math.floor((camX + L.to) / L.tile);
        for (let ti = i0; ti <= i1; ti++) {
          const key = L.id + ':' + ti; seen.add(key);
          if (!tiles.has(key)) { const t = buildTile(L, ti, g); root.add(t); tiles.set(key, t); }
        }
      }
      tiles.forEach((t, key) => { if (!seen.has(key)) { root.remove(t); tiles.delete(key); } });
      // ----- clouds / asteroids by altitude -----
      const sp = g.P.space || 0;
      const cloudVis = clamp(1 - sp * 2.2, 0, 1);
      for (let cx = Math.floor((camX - 55) / 38); cx <= Math.floor((camX + 90) / 38); cx++) {
        for (let cy = Math.floor((camY3 - 16) / 13); cy <= Math.floor((camY3 + 16) / 13); cy++) {
          if (cy < 1) continue;
          const key = cx + ',' + cy;
          if (cy * 13 < 60 && cloudVis > 0.02 && hash(cx * 91 + cy * 17) > 0.45) {
            if (!cloudMap.has(key)) { const c = buildCloud(cx, cy); R3.add(c); cloudMap.set(key, c); }
          }
          if (cy * 13 > 55 && hash(cx * 53 + cy * 29) > 0.62) {
            if (!rockMap.has(key)) { const c = buildAsteroid(cx, cy); R3.add(c); rockMap.set(key, c); }
          }
        }
      }
      const inView = (k, gp) => { const o = gp.position; return Math.abs(o.x - camX) < 130 && Math.abs(o.y - camY3) < 40; };
      cloudMap.forEach((c, k) => { if (!inView(k, c)) { R3.remove(c); cloudMap.delete(k); } else c.visible = cloudVis > 0.02; });
      rockMap.forEach((c, k) => { if (!inView(k, c)) { R3.remove(c); rockMap.delete(k); } else c.userData.m.rotation.y += c.userData.spin * 0.016; });
      // ----- planets (space) -----
      const pa = clamp((sp - 0.15) * 2.2, 0, 1);
      planets.forEach((pl, i) => {
        pl.visible = pa > 0.02;
        pl.position.set(pl.userData.base.x - camX * (0.05 + i * 0.012) * 3, pl.userData.base.y - camY3 * (0.08 + i * 0.01) * 3, pl.userData.base.z);
        pl.rotation.y += 0.0008;
      });
      // fade biome props when in deep sky
      root.visible = (R3.camY3 || 0) < 42;
    }
  };
})();
