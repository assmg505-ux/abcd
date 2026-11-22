// GUBS 3D renderer: platforms, hazards, coins, power-ups, springs, wind.
(function () {
  'use strict';
  const R3 = window.R3;
  if (!R3 || !R3.T) return;
  const T = R3.T, S = 40, GY = 600, TAU = Math.PI * 2, X = R3.X, Y = R3.Y, hash = R3.hash;
  const GU = window.GubDraw;
  const M = R3.mesh, box = R3.box, sph = R3.sph, cyl = R3.cyl, cone = R3.cone, ico = R3.ico;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const scene = () => R3.scene();

  const maps = { plats: new Map(), obs: new Map(), pads: new Map(), winds: new Map(), powers: new Map() };

  function sync(map, list, stamp, lo, hi, build, upd, getX, getW) {
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.dead || o.taken) continue;
      const x = getX ? getX(o) : o.x, w = getW ? getW(o) : (o.w || 0);
      if (x > hi || x + w < lo) continue;
      let e = map.get(o);
      if (!e) {
        e = build(o);
        if (!e) continue;
        e.root.userData.e = 1;
        map.set(o, e); scene().add(e.root);
      }
      e.stamp = stamp;
      if (upd && e.upd) e.upd(o);
    }
    map.forEach((e, o) => { if (e.stamp !== stamp) { scene().remove(e.root); if (e.dispose) e.dispose(); map.delete(o); } });
  }

  // lumpy rock geometry (cached)
  function rockGeo(seed, detail) {
    return R3.geo('rock' + seed + detail, () => {
      const g = new T.IcosahedronGeometry(1, detail || 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = 0.82 + hash(Math.floor(p.getX(i) * 40) * 7 + Math.floor(p.getY(i) * 40) * 13 + Math.floor(p.getZ(i) * 40) * 29 + seed) * 0.36;
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  R3.rockGeo = rockGeo;

  function sawGeo() {
    return R3.geo('saw', () => {
      const sh = new T.Shape();
      for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, r = i % 2 ? 0.82 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
      sh.closePath();
      const g = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
      g.translate(0, 0, -0.15);
      return g;
    });
  }

  // ---------- platforms ----------
  const platW = o => o.w / S;
  function buildPlat(o) {
    const wExact = platW(o), w = Math.max(1.5, Math.round(wExact * 4) / 4), root = new T.Group();
    const alt = GY - o.y;
    let kind = 'grass', body;
    if (o.bounce) kind = 'bounce';
    else if (o.crumble) kind = 'crumble';
    else if (o.moving) kind = 'moving';
    else if (o.rail) kind = 'rail';
    else if (alt >= 3200) kind = 'rock';
    else if (alt >= 450) kind = 'cloud';
    const D = 3.8;
    if (kind === 'grass') {
      const cap = M(box(w, 0.45, D), null, { mat: R3.capMat(), outline: 0.06 });
      cap.position.set(0, -0.225, 0);
      const bd = M(box(w - 0.1, 0.55, D - 0.3), null, { mat: R3.dirtMat(), outline: 0.06 }); bd.position.set(0, -0.72, 0);
      const lump = M(cone(1, 1.6, 7), null, { mat: R3.dirtMat(), outline: 0.06 });
      lump.rotation.x = Math.PI; lump.scale.set(Math.max(0.6, w / 2.2), 1, 1.5); lump.position.set(0, -1.75, 0);
      root.add(cap, bd, lump);
    } else if (kind === 'cloud') {
      const n = Math.max(3, Math.round(w / 1.2));
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 0.5 : k / (n - 1), r = 0.7 + hash(k * 5 + (o.x | 0)) * 0.35;
        const p = M(sph(1, 14, 10), '#ffffff', { outline: 0.07, scale: [r, r * 0.8, r * 1.5], pos: [-w / 2 + 0.5 + t * (w - 1), -0.35 + (k % 2) * 0.12, (hash(k + 3) - 0.5) * 0.7] });
        root.add(p);
      }
      const base = M(box(w - 0.4, 0.5, 2.6), '#dbe9fb', { outline: 0, pos: [0, -0.5, 0] });
      root.add(base);
    } else if (kind === 'rock') {
      const rk = M(rockGeo(3 + ((o.x / S) | 0) % 5, 1), '#6b6f9a', { outline: 0.08, scale: [w / 2, 0.9, 1.9], pos: [0, -0.6, 0] });
      const top = M(box(w - 0.3, 0.18, 2.6), '#a8adde', { outline: 0, pos: [0, 0.05, 0] });
      const glow = new T.Mesh(box(w - 0.5, 0.06, 2.4), new T.MeshBasicMaterial({ color: 0x7cf2e6 })); glow.position.set(0, -1.2, 0);
      root.add(rk, top, glow);
      for (let k = 0; k < 2; k++) {
        const cr = M(R3.oct(0.35), '#7cf2e6', { outline: 0.05, scale: [0.7, 1.5, 0.7], pos: [-w / 3 + k * w * 0.55, 0.45, (k - 0.5) * 0.8] });
        cr.material = R3.toon('#7cf2e6', { emissive: new T.Color('#27b8c6'), emissiveIntensity: 0.6 });
        root.add(cr);
      }
    } else if (kind === 'bounce') {
      const pad = M(box(w, 0.4, D - 0.8), '#ff6fb1', { outline: 0.07, pos: [0, -0.2, 0] });
      root.add(pad);
      for (let k = 0; k < 6; k++) { const st = M(cone(0.2, 0.28, 3), '#ffe3f3', { outline: 0, pos: [-w / 2 + 0.7 + k * (w - 1.4) / 5, 0.04, 0.9 * (k % 2 ? 1 : -1)] }); root.add(st); }
      for (const f of [0.25, 0.5, 0.75]) {
        const sp = M(R3.tor(0.28, 0.07, 6, 12), '#3b2a52', { outline: 0, pos: [-w / 2 + w * f, -0.65, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 3] });
        root.add(sp);
      }
      body = pad;
    } else if (kind === 'crumble') {
      const st = M(box(w, 0.7, D - 1), '#b8905c', { outline: 0.06, pos: [0, -0.35, 0] }); st.material = R3.toon('#b8905c', { map: R3.texStone() });
      const top = M(box(w - 0.2, 0.14, D - 1.2), '#e0bb82', { outline: 0, pos: [0, 0.0, 0] });
      root.add(st, top);
    } else if (kind === 'moving') {
      const wd = M(box(w, 0.5, D - 1), '#c98f4a', { outline: 0.06, pos: [0, -0.25, 0] }); wd.material = R3.toon('#d49a52', { map: R3.texWood() });
      root.add(wd);
      for (const sx of [-1, 1]) {
        const gear = M(cyl(0.38, 0.38, 0.2, 10), '#8a92a8', { outline: 0.05, pos: [sx * (w / 2 - 0.5), -0.55, D / 2 - 0.5], rot: [Math.PI / 2, 0, 0] });
        gear.userData.spin = sx; root.add(gear);
      }
    } else if (kind === 'rail') {
      const rl = M(cyl(0.12, 0.12, w, 8), '#c3cadb', { outline: 0.06, rot: [0, 0, Math.PI / 2], pos: [0, 0.05, 0] });
      const rl2 = M(cyl(0.12, 0.12, w, 8), '#c3cadb', { outline: 0.06, rot: [0, 0, Math.PI / 2], pos: [0, 0.05, 0.7] });
      const rl3 = M(cyl(0.12, 0.12, w, 8), '#c3cadb', { outline: 0.06, rot: [0, 0, Math.PI / 2], pos: [0, 0.05, -0.7] });
      root.add(rl, rl2, rl3);
      for (let k = 0; k <= Math.floor(w / 3); k++) { const px = -w / 2 + 0.3 + k * 3; root.add(M(box(0.18, 0.5, 1.7), '#5a5478', { outline: 0.05, pos: [px, -0.25, 0] })); }
    }
    return { root, kind, upd(o) {
      const sq = Math.max(0, o.sq || 0);
      let ox = 0;
      if (kind === 'crumble' && o.cT > 0) ox = Math.sin(performance.now() * 0.07) * 0.06;
      root.position.set(X(o.x) + wExact / 2 + ox, Y(o.y), 0);
      root.scale.x = wExact / w;
      if (kind === 'bounce') root.scale.y = 1 - sq * 0.5;
      if (kind === 'moving') root.children.forEach(c => { if (c.userData.spin) c.rotation.z += 0.04 * c.userData.spin; });
    } };
  }

  // ---------- hazards ----------
  const cxOf = o => (o.x + o.w / 2) / S, byOf = o => (GY - (o.y + o.h)) / S, cyOf = o => (GY - (o.y + o.h / 2)) / S;
  const B = {};
  B.spike = o => {
    const r = new T.Group();
    for (const z of [-0.95, 0, 0.95]) r.add(M(cone(0.52, 1.1, 5), '#e6e9f2', { pos: [0, 0.55, z], outline: 0.07 }));
    return { root: r, upd(o) { r.position.set(cxOf(o), byOf(o), 0); } };
  };
  B.wall = o => {
    const h = o.h / S, r = new T.Group();
    const w = M(box(o.w / S, h, 2.6), '#9aa3b8', { outline: 0.07, pos: [0, h / 2, 0] }); w.material = R3.toon('#aab2c6', { map: R3.texBrick() });
    const cap = M(box(o.w / S + 0.35, 0.4, 3), '#c3cadb', { outline: 0.07, pos: [0, h + 0.1, 0] });
    r.add(w, cap);
    return { root: r, upd(o) { r.position.set(cxOf(o), byOf(o), 0); } };
  };
  B.crate = o => {
    const r = new T.Group();
    const c = M(box(1.6, 1.6, 1.6), '#e39d52', { outline: 0.07, pos: [0, 0.8, 0] }); c.material = R3.toon('#f0a85a', { map: R3.texWood() });
    r.add(c);
    return { root: r, upd(o) { r.position.set(cxOf(o), byOf(o), 0); } };
  };
  B.cannon = o => {
    const r = new T.Group();
    const base = M(box(1.7, 0.9, 1.5), '#4b4868', { outline: 0.07, pos: [0.15, 0.55, 0] });
    const barrel = M(cyl(0.42, 0.55, 1.5, 12), '#2f2c44', { outline: 0.07, rot: [0, 0, Math.PI / 2], pos: [-0.5, 0.95, 0] });
    const w1 = M(cyl(0.45, 0.45, 0.3, 14), '#8a8fa6', { outline: 0.06, rot: [Math.PI / 2, 0, 0], pos: [0.2, 0.45, 0.8] });
    const w2 = M(cyl(0.45, 0.45, 0.3, 14), '#8a8fa6', { outline: 0.06, rot: [Math.PI / 2, 0, 0], pos: [0.2, 0.45, -0.8] });
    r.add(base, barrel, w1, w2);
    return { root: r, upd(o) { r.position.set(cxOf(o), byOf(o), 0); barrel.position.x = -0.5 + Math.max(0, o.recoil || 0) * 0.4; } };
  };
  B.bullet = o => {
    const r = new T.Group();
    r.add(M(cyl(0.36, 0.36, 0.9, 12), '#2b2b3a', { outline: 0.06, rot: [0, 0, Math.PI / 2] }));
    r.add(M(sph(0.36, 12, 8), '#2b2b3a', { outline: 0.06, pos: [-0.45, 0, 0] }));
    const fl = M(cone(0.3, 0.9, 6), '#ffb03a', { outline: 0, rot: [0, 0, -Math.PI / 2], pos: [0.85, 0, 0], cast: false });
    fl.material = new T.MeshBasicMaterial({ color: 0xffb03a }); r.add(fl);
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); fl.scale.set(1 + Math.sin(performance.now() * 0.05) * 0.3, 1, 1); } };
  };
  B.grump = o => {
    const r = new T.Group(), body = new T.Group();
    body.add(M(sph(0.7, 18, 14), '#e8455f', { outline: 0.07 }));
    for (const s of [-1, 1]) {
      body.add(M(cone(0.16, 0.5, 6), '#c42f4a', { outline: 0.05, pos: [s * 0.38, 0.62, 0], rot: [0, 0, -s * 0.4] }));
      const eye = M(sph(0.2, 12, 8), '#ffffff', { outline: 0.04, pos: [s * 0.25, 0.14, 0.55] });
      const pup = M(sph(0.1, 8, 6), '#2b1640', { outline: 0, pos: [s * 0.27 - s * 0.03, 0.12, 0.7] });
      const brow = M(box(0.34, 0.09, 0.08), '#2b1640', { outline: 0, pos: [s * 0.25, 0.4, 0.62], rot: [0, 0, s * 0.45] });
      body.add(eye, pup, brow);
    }
    body.add(M(box(0.34, 0.08, 0.08), '#2b1640', { outline: 0, pos: [0, -0.2, 0.66] }));
    const wings = [];
    for (const s of [-1, 1]) {
      const piv = new T.Group(); piv.position.set(s * 0.6, 0.1, 0);
      const wing = M(sph(1, 12, 8), '#5a2a6e', { outline: 0.06, scale: [0.8, 0.12, 0.5], pos: [s * 0.8, 0, 0] });
      piv.add(wing); body.add(piv); wings.push([piv, s]);
    }
    r.add(body);
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); const f = Math.sin(performance.now() * 0.02 + o.t); wings.forEach(w => { w[0].rotation.z = w[1] * f * 0.7; }); body.rotation.z = Math.sin(performance.now() * 0.004 + o.t) * 0.1; } };
  };
  B.ufo = o => {
    const r = new T.Group();
    r.add(M(sph(1, 20, 10), '#8f92b8', { outline: 0.06, scale: [1.5, 0.38, 1.5] }));
    const dome = M(sph(0.7, 16, 10), '#9fe8ff', { outline: 0.05, pos: [0, 0.32, 0], scale: [1, 0.9, 1] });
    dome.material = R3.toon('#9fe8ff', { transparent: true, opacity: 0.85 }); r.add(dome);
    const lights = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const l = new T.Mesh(sph(0.11, 8, 6), new T.MeshBasicMaterial({ color: 0xffd84a })); l.position.set(Math.cos(a) * 1.25, -0.05, Math.sin(a) * 1.25); r.add(l); lights.push(l); }
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); r.rotation.y += 0.03; lights.forEach((l, i) => { l.material.color.set((Math.floor(performance.now() / 160) + i) % 2 ? 0xffd84a : 0xff6fb1); }); } };
  };
  B.rock = o => {
    const r = new T.Group();
    const m = M(rockGeo(o.seed || 1, 1), '#7c7aa6', { outline: 0.08, scale: 0.95 });
    r.add(m);
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); m.rotation.set(o.rot * 0.6, o.rot, o.rot * 0.3); } };
  };
  B.saw = o => {
    const r = new T.Group(), rad = o.r / S;
    const disc = M(sawGeo(), '#d4d9e6', { outline: 0.05, scale: [rad, rad, 1] });
    const hub = M(cyl(0.34 * rad, 0.34 * rad, 0.5, 12), '#8a92a8', { outline: 0.05, rot: [Math.PI / 2, 0, 0] });
    const dot = M(sph(0.14 * rad, 8, 6), '#ff4a5a', { outline: 0, pos: [0, 0, 0.3] });
    r.add(disc, hub, dot);
    return { root: r, upd(o) { r.position.set((o.x + o.r) / S, (GY - o.cy) / S, 0); disc.rotation.z = o.rot; } };
  };
  B.boulder = o => {
    const r = new T.Group();
    const m = M(rockGeo(7, 1), '#8d86a8', { outline: 0.08, scale: 1.45 });
    m.add(M(R3.oct(0.2), '#b4aed0', { outline: 0, pos: [-0.5, 0.7, 0.6] }));
    r.add(m);
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); m.rotation.z = o.rot; } };
  };
  function spiky(color, n, rad, len) {
    const g = new T.Group();
    g.add(M(sph(rad, 14, 10), color, { outline: 0.06 }));
    const gold = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = gold * i;
      const dir = new T.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      const c = M(cone(rad * 0.28, len, 5), '#8a8fa6', { outline: 0.05 });
      c.position.copy(dir).multiplyScalar(rad + len * 0.35);
      c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.add(c);
    }
    return g;
  }
  B.mine = o => {
    const r = new T.Group(), sp = spiky('#3b3050', 16, 0.5, 0.5), light = new T.Mesh(sph(0.16, 8, 6), new T.MeshBasicMaterial({ color: 0xff4a5a }));
    light.position.set(0, 0, 0.52); r.add(sp, light);
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); sp.rotation.y += 0.02; sp.rotation.z += 0.012; light.material.color.set(Math.sin(performance.now() * 0.008 + o.t) > 0 ? 0xff4a5a : 0x7a2030); } };
  };
  B.bouncer = o => {
    const r = new T.Group(), sp = spiky('#7dff9a', 14, 0.5, 0.45);
    const eyes = new T.Group();
    for (const s of [-1, 1]) { eyes.add(M(sph(0.15, 8, 6), '#ffffff', { outline: 0.03, pos: [s * 0.2, 0.08, 0.46] })); eyes.add(M(sph(0.07, 6, 5), '#2b1640', { outline: 0, pos: [s * 0.2, 0.06, 0.58] })); }
    r.add(sp, eyes);
    return { root: r, upd(o) { r.position.set(cxOf(o), cyOf(o), 0); sp.rotation.z += 0.04; sp.rotation.y += 0.025; } };
  };
  B.laser = o => {
    const r = new T.Group(), h = o.h / S;
    for (const yy of [0, h]) r.add(M(cyl(0.38, 0.5, 0.5, 10), '#5a5478', { outline: 0.06, pos: [0, yy, 0] }));
    const beamMat = new T.MeshBasicMaterial({ color: 0xff3b6b, transparent: true, opacity: 0.9, fog: false });
    const beam = new T.Mesh(box(0.16, h, 0.16), beamMat); beam.position.y = h / 2;
    const glow = new T.Mesh(R3.geo('lp' + o.h, () => new T.PlaneGeometry(1.3, h)), new T.MeshBasicMaterial({ map: R3.glowTex('rgba(255,70,110,0.9)', 'rgba(255,70,110,0)'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    glow.position.set(0, h / 2, 0.1);
    const wall = new T.Mesh(R3.geo('lw' + o.h, () => new T.PlaneGeometry(0.9, h)), new T.MeshBasicMaterial({ color: 0xff3b6b, transparent: true, opacity: 0.25, side: T.DoubleSide, fog: false }));
    wall.rotation.y = Math.PI / 2; wall.position.y = h / 2; wall.scale.x = 4.5;
    r.add(beam, glow, wall);
    return { root: r, upd(o) {
      r.position.set((o.x + o.w / 2) / S, (GY - (o.y + o.h)) / S, 0);
      const warn = o.warn && Math.floor(performance.now() / 40) % 2 === 0;
      beam.visible = o.on || warn; glow.visible = o.on; wall.visible = o.on;
      beamMat.opacity = o.on ? 0.95 : 0.5; beamMat.color.set(o.on ? 0xffffff : 0xff3b6b);
      beam.scale.x = o.on ? 1 : 0.4;
    } };
  };
  B.pend = o => {
    const r = new T.Group(), L = o.L / S;
    r.add(M(box(1.6, 0.8, 1.6), '#5a5478', { outline: 0.06, pos: [0, 0.2, 0] }));
    const arm = new T.Group(); r.add(arm);
    arm.add(M(cyl(0.07, 0.07, L, 6), '#b9bfd4', { outline: 0.05, pos: [0, -L / 2, 0] }));
    const mace = spiky('#c3cadb', 14, 0.7, 0.55); mace.position.y = -L; arm.add(mace);
    return { root: r, upd(o, g) {
      r.position.set(o.ax / S, (GY - o.ay) / S, 0);
      const a = o.A * Math.sin((R3.timeNow || 0) * o.om + o.ph);
      arm.rotation.z = -a; mace.rotation.z = a;
    } };
  };

  // ---------- springs & wind ----------
  function buildPad(o) {
    const r = new T.Group(), w = o.w / S;
    r.add(M(box(w, 0.25, 2.2), '#5a4a70', { outline: 0.06, pos: [0, 0.12, 0] }));
    const top = M(box(w - 0.4, 0.3, 2), '#ff4a5a', { outline: 0.06 }); r.add(top);
    const coils = [];
    for (const f of [0.25, 0.5, 0.75]) { const c = M(R3.tor(0.3, 0.07, 6, 12), '#3b2a52', { outline: 0, rot: [Math.PI / 2, 0, 0], scale: [1, 1, 2.5], pos: [-w / 2 + w * f, 0.5, 0] }); r.add(c); coils.push(c); }
    for (let k = 0; k < 3; k++) r.add(M(cone(0.22, 0.3, 3), '#ffd84a', { outline: 0, pos: [-w / 3 + k * w / 3, 0.0, 0.5] }));
    return { root: r, upd(o) {
      const sq = Math.max(0, o.sq || 0), hgt = 0.9 * (1 - sq * 0.7);
      r.position.set(X(o.x) + w / 2, Y(o.y), 0);
      top.position.y = 0.3 + hgt;
      coils.forEach(c => { c.scale.z = 2.5 * (hgt / 0.9); c.position.y = 0.25 + hgt / 2; });
    } };
  }
  const windTex = R3.mkTex(64, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.2, h * 0.72); c.lineTo(w * 0.5, h * 0.5); c.lineTo(w * 0.8, h * 0.72); c.stroke();
    c.beginPath(); c.moveTo(w * 0.2, h * 0.3); c.lineTo(w * 0.5, h * 0.08); c.lineTo(w * 0.8, h * 0.3); c.stroke();
  }, 1, 1);
  function buildWind(o) {
    const r = new T.Group(), w = Math.max(1, Math.round(o.w / S * 4) / 4), h = o.h / S;
    const tex = windTex.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(w / 2.2)), h / 5);
    const col = new T.Mesh(box(w, h, 5), new T.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.2, depthWrite: false, fog: false }));
    const chev = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
    chev.position.z = 0.3; r.add(col, chev);
    return { root: r, dispose() { tex.dispose(); }, upd(o) { r.position.set(X(o.x) + w / 2, Y(o.y) - h / 2, 0); tex.offset.y -= 0.02; } };
  }

  // ---------- power-ups ----------
  const iconCache = {};
  function iconTex(type) {
    if (iconCache[type]) return iconCache[type];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    GU.drawPowerIcon(x, type, 64, 64, 46);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    return (iconCache[type] = t);
  }
  function buildPower(o) {
    const r = new T.Group();
    const bub = new T.Mesh(sph(0.95, 20, 14), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
    const ring = new T.Mesh(R3.tor(0.98, 0.05, 6, 28), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    const icon = new T.Sprite(new T.SpriteMaterial({ map: iconTex(o.type), transparent: true, depthWrite: false, fog: false }));
    icon.scale.set(1.9, 1.9, 1);
    r.add(bub, ring, icon);
    return { root: r, upd(o) { r.position.set(o.x / S, (GY - o.y) / S + Math.sin(performance.now() * 0.003 + o.ph) * 0.25, 0); ring.rotation.x += 0.03; } };
  }

  // ---------- coins (instanced) ----------
  let coinMesh, coinOut;
  const dummy = new T.Object3D(); dummy.rotation.order = 'YXZ';
  const MAXC = 420;
  function ensureCoins() {
    if (coinMesh) return;
    const geo = new T.CylinderGeometry(0.36, 0.36, 0.12, 20), og = new T.CylinderGeometry(0.36, 0.36, 0.12, 20);
    coinMesh = new T.InstancedMesh(geo, R3.toon('#ffd23f', { emissive: new T.Color('#c28a00'), emissiveIntensity: 0.35 }), MAXC);
    coinOut = new T.InstancedMesh(og, R3.outlineMat, MAXC);
    coinMesh.frustumCulled = coinOut.frustumCulled = false;
    coinMesh.castShadow = true;
    scene().add(coinMesh); scene().add(coinOut);
  }
  function updateCoins(g) {
    ensureCoins();
    let n = 0;
    const lo = g.camX - 200, hi = g.camX + g.lw + 300, t = g.time;
    for (let i = 0; i < g.coins.length && n < MAXC; i++) {
      const c = g.coins[i];
      if (c.taken || c.x < lo || c.x > hi) continue;
      dummy.position.set(c.x / S, (GY - c.y) / S, 0);
      dummy.rotation.set(Math.PI / 2, t * 5 + c.t, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix(); coinMesh.setMatrixAt(n, dummy.matrix);
      dummy.scale.set(1.22, 1.9, 1.22); dummy.updateMatrix(); coinOut.setMatrixAt(n, dummy.matrix);
      n++;
    }
    coinMesh.count = coinOut.count = n;
    coinMesh.instanceMatrix.needsUpdate = coinOut.instanceMatrix.needsUpdate = true;
  }

  const BUILD = B;
  function buildObs(o) {
    const f = BUILD[o.type];
    if (!f) return null;
    return f(o);
  }

  R3.world = {
    update(g, n) {
      R3.timeNow = g.time;
      const lo = g.camX - 260, hi = g.camX + g.lw + 360;
      sync(maps.plats, g.plats, n, lo, hi, buildPlat, true);
      sync(maps.pads, g.pads, n, lo, hi, buildPad, true);
      sync(maps.winds, g.winds, n, lo, hi, buildWind, true);
      sync(maps.obs, g.obs, n, lo, hi, buildObs, true, o => o.x, o => o.w);
      sync(maps.powers, g.powers, n, lo, hi, buildPower, true, o => o.x - 40, () => 80);
      updateCoins(g);
    }
  };
  R3.iconTex = iconTex;
})();
