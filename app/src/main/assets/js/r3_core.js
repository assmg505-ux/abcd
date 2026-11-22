// GUBS 3D renderer core: three.js toon-shaded world (outlines, haze, sunset sky, soft shadows).
(function () {
  'use strict';
  const T = window.THREE;
  const R3 = window.R3 = { ok: false, S: 40, GY: 600, H: 720 };
  if (!T) return;
  const S = 40, GY = 600, H = 720, TAU = Math.PI * 2, INK = 0x2b1640;
  const X = lx => lx / S, Y = ly => (GY - ly) / S;
  R3.X = X; R3.Y = Y; R3.T = T; R3.INK = INK;
  const FIELD_Y = -1.5;       // meadow level, below the runway
  R3.FIELD_Y = FIELD_Y;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  function hash(n) { let h = Math.imul(n | 0, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  R3.hash = hash;

  let renderer, scene, camera, hemi, sun, skyGroup, skyMat, starPts, sunSprite;
  let cw = 1, ch = 1, frameNo = 0;
  R3.frameNo = () => frameNo;
  R3.scene = () => scene; R3.camera = () => camera; R3.renderer = () => renderer;

  // ---------- toon gradient, materials, outlines ----------
  let gradMap = null;
  function makeGrad(steps) {
    const d = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) d[i] = Math.round(255 * (0.42 + 0.58 * i / (steps - 1)));
    const t = new T.DataTexture(d, steps, 1, T.RedFormat);
    t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }
  const matCache = new Map();
  R3.toon = function (color, opts) {
    const key = color + '|' + (opts ? JSON.stringify(opts, (k, v) => (v && v.isTexture) ? v.uuid : v) : '');
    let m = matCache.get(key);
    if (m) return m;
    const o = Object.assign({ color: new T.Color(color), gradientMap: gradMap }, opts || {});
    m = new T.MeshToonMaterial(o);
    matCache.set(key, m);
    return m;
  };
  const outlineMat = new T.MeshBasicMaterial({ color: INK, side: T.BackSide, fog: false });
  R3.outlineMat = outlineMat;
  R3.addOutline = function (mesh, t) {
    t = t == null ? 0.07 : t;
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    const sx = Math.max(0.001, bb.max.x - bb.min.x), sy = Math.max(0.001, bb.max.y - bb.min.y), sz = Math.max(0.001, bb.max.z - bb.min.z);
    const o = new T.Mesh(g, outlineMat);
    const kx = 1 + 2 * t / sx, ky = 1 + 2 * t / sy, kz = 1 + 2 * t / sz;
    o.scale.set(kx, ky, kz);
    const cx = (bb.max.x + bb.min.x) / 2, cy = (bb.max.y + bb.min.y) / 2, cz = (bb.max.z + bb.min.z) / 2;
    o.position.set(cx * (1 - kx), cy * (1 - ky), cz * (1 - kz));
    o.userData.outline = true;
    mesh.add(o);
    return mesh;
  };
  // convenience: toon mesh (+outline, shadows)
  R3.mesh = function (geo, color, o) {
    o = o || {};
    const mat = o.mat || R3.toon(color, o.map ? { map: o.map } : o.matOpts);
    const m = new T.Mesh(geo, mat);
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.scale) { if (typeof o.scale === 'number') m.scale.setScalar(o.scale); else m.scale.set(o.scale[0], o.scale[1], o.scale[2]); }
    if (o.outline !== 0) R3.addOutline(m, o.outline == null ? 0.07 : o.outline);
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
    return m;
  };
  const geoCache = new Map();
  R3.geo = function (key, make) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
  R3.box = (w, h, d) => R3.geo('b' + w + ',' + h + ',' + d, () => new T.BoxGeometry(w, h, d));
  R3.sph = (r, ws, hs) => R3.geo('s' + r + ',' + (ws || 20) + ',' + (hs || 14), () => new T.SphereGeometry(r, ws || 20, hs || 14));
  R3.cyl = (rt, rb, h, seg) => R3.geo('c' + rt + ',' + rb + ',' + h + ',' + (seg || 16), () => new T.CylinderGeometry(rt, rb, h, seg || 16));
  R3.cone = (r, h, seg) => R3.geo('n' + r + ',' + h + ',' + (seg || 12), () => new T.ConeGeometry(r, h, seg || 12));
  R3.ico = (r, d) => R3.geo('i' + r + ',' + (d || 0), () => new T.IcosahedronGeometry(r, d || 0));
  R3.oct = r => R3.geo('o' + r, () => new T.OctahedronGeometry(r, 0));
  R3.tor = (r, t, rs, ts) => R3.geo('t' + r + ',' + t + ',' + (rs || 10) + ',' + (ts || 20), () => new T.TorusGeometry(r, t, rs || 10, ts || 20));

  // ---------- painted textures (near-white so materials can tint them) ----------
  function mkTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = 4;
    return t;
  }
  R3.mkTex = mkTex;
  const TEX = {};
  function texGrass() {
    return TEX.grass || (TEX.grass = mkTex(256, 256, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0)'; c.fillRect(i * w / 8, 0, w / 8, h); }
      for (let i = 0; i < 700; i++) { const v = 215 + (hash(i) * 40) | 0; c.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.5)'; c.beginPath(); c.arc(hash(i + 9) * w, hash(i + 5) * h, 2 + hash(i + 3) * 6, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(0,0,0,0.13)'; c.lineWidth = 2; c.lineCap = 'round';
      for (let i = 0; i < 160; i++) { const x = hash(i + 100) * w, y = hash(i + 200) * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y - 8 - hash(i) * 6); c.stroke(); }
    }, 2, 1));
  }
  function texDirt() {
    return TEX.dirt || (TEX.dirt = mkTex(256, 128, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,0,0,0.16)';
      for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse(hash(i) * w, hash(i + 50) * h, 3 + hash(i + 7) * 7, 2 + hash(i + 8) * 4, 0, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 24; i++) { c.beginPath(); c.arc(hash(i + 300) * w, hash(i + 330) * h, 2 + hash(i + 9) * 4, 0, TAU); c.fill(); }
    }, 3, 1));
  }
  function texField() {
    return TEX.field || (TEX.field = mkTex(256, 256, (c, w, h) => {
      for (let i = 0; i < 8; i++) { const v = i % 2 ? 255 : 236; c.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; c.fillRect(0, i * h / 8, w, h / 8); }
      c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 2;
      for (let i = 0; i < 220; i++) { const x = hash(i) * w, y = hash(i + 77) * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y - 6); c.stroke(); }
    }, 30, 4));
  }
  R3.texBrick = function () {
    return TEX.brick || (TEX.brick = mkTex(128, 128, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(40,30,60,0.55)'; c.lineWidth = 4;
      for (let r = 0; r < 4; r++) {
        c.beginPath(); c.moveTo(0, r * 32); c.lineTo(w, r * 32); c.stroke();
        for (let k = 0; k < 2; k++) { const x = (k * 64 + (r % 2 ? 32 : 0)) % w; c.beginPath(); c.moveTo(x, r * 32); c.lineTo(x, r * 32 + 32); c.stroke(); }
      }
      for (let i = 0; i < 24; i++) { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(hash(i) * w, hash(i + 5) * h, 10, 6); }
    }, 1, 1));
  };
  R3.texWood = function () {
    return TEX.wood || (TEX.wood = mkTex(128, 128, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(70,40,10,0.5)'; c.lineWidth = 5;
      c.strokeRect(6, 6, w - 12, h - 12);
      c.beginPath(); c.moveTo(8, 8); c.lineTo(w - 8, h - 8); c.moveTo(w - 8, 8); c.lineTo(8, h - 8); c.stroke();
      c.strokeStyle = 'rgba(70,40,10,0.18)'; c.lineWidth = 2;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(10, 20 + i * 18); c.lineTo(w - 10, 24 + i * 18); c.stroke(); }
    }, 1, 1));
  };
  R3.texStone = function () {
    return TEX.stone || (TEX.stone = mkTex(128, 128, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(0,0,0,' + (0.05 + hash(i) * 0.1) + ')'; c.beginPath(); c.ellipse(hash(i + 1) * w, hash(i + 2) * h, 6 + hash(i) * 14, 4 + hash(i + 4) * 8, hash(i) * 3, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(30,20,50,0.35)'; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(hash(i + 9) * w, 0); c.lineTo(hash(i + 19) * w, h); c.stroke(); }
    }, 1, 1));
  };
  R3.glowTex = function (inner, outer) {
    const key = 'glow' + inner + outer;
    return TEX[key] || (TEX[key] = mkTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, inner || 'rgba(255,255,255,1)'); g.addColorStop(0.35, inner || 'rgba(255,255,255,0.5)'); g.addColorStop(1, outer || 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }, 1, 1));
  };

  // ---------- init ----------
  const ST = { biome: null, pal: null };
  const slabPool = [], voidPool = [];
  let fieldMesh, fieldMat, grassMat, capMat, dirtMat, voidMat, sunTarget;
  const camState = { x: 0, y: 0, shx: 0, shy: 0 };

  R3.init = function (canvas, quality) {
    let r;
    try { r = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { return false; }
    if (!r || !r.getContext()) return false;
    renderer = r;
    canvas.addEventListener('webglcontextlost', e => e.preventDefault(), false);
    renderer.setClearColor(0x9bd0ff, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0xffd9c0, 0.0065);
    camera = new T.PerspectiveCamera(34, 2, 0.5, 1200);
    camera.position.set(0, 8, 30);
    hemi = new T.HemisphereLight(0xcfe8ff, 0x8a6a4a, 1.25); scene.add(hemi);
    sun = new T.DirectionalLight(0xffe3b8, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 120;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    scene.add(sun); scene.add(sun.target);
    gradMap = makeGrad(4);

    // shared materials that get tinted per biome
    grassMat = R3.toon('#ffffff', { map: texGrass() });
    capMat = R3.toon('#ffffff', { map: texGrass() });
    dirtMat = R3.toon('#ffffff', { map: texDirt() });
    voidMat = new T.MeshBasicMaterial({ color: 0x120a22 });
    fieldMat = R3.toon('#ffffff', { map: texField() });

    buildSky();
    buildField();
    R3.setQuality(quality || 'high');
    R3.ok = true;
    return true;
  };

  R3.setQuality = function (q) {
    R3.quality = q;
    const hi = q !== 'low';
    if (renderer) { renderer.shadowMap.enabled = hi; renderer.shadowMap.needsUpdate = true; }
    if (sun) sun.castShadow = hi;
    outlineMat.visible = hi || true;
    R3.outlines = hi;
    outlineMat.visible = hi;
    if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1.25));
    if (cw > 1) R3.resize(cw, ch);
    // forget cached materials' compiled programs (shadow flags changed)
    matCache.forEach(m => { m.needsUpdate = true; });
  };

  R3.resize = function (w, h) {
    cw = w; ch = h;
    if (!renderer) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };

  // ---------- sky ----------
  function buildSky() {
    skyGroup = new T.Group(); skyGroup.renderOrder = -10;
    skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new T.Color('#74c8ff') }, bot: { value: new T.Color('#ffe3f3') }, mid: { value: new T.Color('#ffb0c8') },
        sunDir: { value: new T.Vector3(0.55, 0.2, -0.8).normalize() }, sunCol: { value: new T.Color('#fff3a8') }, sunPow: { value: 1 }
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 top; uniform vec3 bot; uniform vec3 mid; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunPow;',
        'varying vec3 vDir;',
        'void main(){',
        '  vec3 d = normalize(vDir);',
        '  float h = clamp(d.y, -0.3, 1.0);',
        '  float k = smoothstep(-0.02, 0.8, h);',
        '  vec3 c = mix(bot, mid, smoothstep(-0.1, 0.28, h));',
        '  c = mix(c, top, pow(k, 0.85));',
        '  float s = max(dot(d, normalize(sunDir)), 0.0);',
        '  c += sunCol * (pow(s, 10.0) * 0.38 + pow(s, 60.0) * 0.35) * sunPow;',
        '  c = mix(c, bot, exp(-abs(d.y) * 9.0) * 0.4);',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n')
    });
    const dome = new T.Mesh(new T.SphereGeometry(500, 32, 20), skyMat);
    dome.renderOrder = -10; dome.frustumCulled = false;
    skyGroup.add(dome);
    // stars
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = hash(i * 3 + 1) * TAU, ph = Math.acos(0.05 + hash(i * 3 + 2) * 0.95), r = 480;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3));
    starPts = new T.Points(sg, new T.PointsMaterial({ size: 2.4, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    starPts.renderOrder = -9; starPts.frustumCulled = false;
    skyGroup.add(starPts);
    // sun glow
    sunSprite = new T.Sprite(new T.SpriteMaterial({ map: R3.glowTex('rgba(255,250,210,1)', 'rgba(255,210,150,0)'), transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
    sunSprite.scale.set(150, 150, 1); sunSprite.renderOrder = -8;
    skyGroup.add(sunSprite);
    // god rays
    R3.rays = [];
    const rayTex = mkTex(64, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,240,200,0.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(w * 0.42, 0); c.lineTo(w * 0.58, 0); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    });
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(24 + i * 6, 260), new T.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.4, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
      m.renderOrder = -7; m.userData.i = i; skyGroup.add(m); R3.rays.push(m);
    }
    R3.skyGroup = skyGroup;
    scene.add(skyGroup);
  }

  // ---------- meadow field ----------
  function buildField() {
    fieldMesh = new T.Mesh(new T.PlaneGeometry(900, 260), fieldMat);
    fieldMesh.rotation.x = -Math.PI / 2;
    fieldMesh.receiveShadow = true;
    fieldMesh.position.y = FIELD_Y;
    scene.add(fieldMesh);
  }

  // ---------- track slabs (raised runway) ----------
  const SLAB = 12;
  function makeSlab() {
    const g = new T.Group();
    const cap = R3.mesh(R3.box(1, 0.55, 6.6), null, { mat: capMat, outline: 0 });
    cap.position.y = -0.275;
    const body = R3.mesh(R3.box(1, 4, 6.2), null, { mat: dirtMat, outline: 0 });
    body.position.y = -0.55 - 2;
    g.add(cap); g.add(body);
    g.userData.cap = cap; g.userData.body = body;
    scene.add(g);
    return g;
  }
  const edgePool = [];
  function makeEdge() {
    const g = new T.Group();
    const m = new T.Mesh(R3.box(1, 0.16, 0.16), R3.outlineMat.clone()); m.material.side = T.FrontSide; m.material.visible = true;
    const m2 = new T.Mesh(R3.box(1, 0.16, 0.16), R3.outlineMat.clone()); m2.material.side = T.FrontSide;
    g.add(m); g.userData.parts = [m];
    m.position.set(0, 0.0, 3.32);
    scene.add(g);
    return g;
  }
  function makeVoid() {
    const m = new T.Mesh(new T.PlaneGeometry(1, 6.4), voidMat);
    m.rotation.x = -Math.PI / 2; m.position.y = FIELD_Y + 0.04;
    scene.add(m);
    return m;
  }

  function updateTrack(g) {
    const camX3 = X(g.camX);
    const lo = camX3 - 8, hi = camX3 + X(g.lw) + 12;
    let si = 0, vi = 0, ei = 0;
    const segs = g.segs;
    // intersect segments with the visible window, split into tiles
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      const a = Math.max(X(s.x0), lo), b = Math.min(X(s.x1), hi);
      if (b - a < 0.05) continue;
      { let e = edgePool[ei]; if (!e) { e = makeEdge(); edgePool.push(e); } e.visible = true; e.scale.x = b - a; e.position.set((a + b) / 2, 0, 0); ei++; }
      // pit gap before this segment
      const prev = segs[k - 1];
      if (prev) {
        const ga = Math.max(X(prev.x1), lo), gb = Math.min(X(s.x0), hi);
        if (gb - ga > 0.05) {
          let v = voidPool[vi]; if (!v) { v = makeVoid(); voidPool.push(v); }
          v.visible = true; v.scale.x = gb - ga; v.position.x = (ga + gb) / 2; v.position.z = 0; vi++;
        }
      }
      let t0 = Math.floor(a / SLAB), t1 = Math.floor((b - 1e-6) / SLAB);
      for (let ti = t0; ti <= t1; ti++) {
        const ta = Math.max(a, ti * SLAB), tb = Math.min(b, (ti + 1) * SLAB);
        if (tb - ta < 0.02) continue;
        let sl = slabPool[si]; if (!sl) { sl = makeSlab(); slabPool.push(sl); }
        sl.visible = true;
        sl.scale.x = tb - ta; sl.position.set((ta + tb) / 2, 0, 0);
        si++;
        if (si > 60) break;
      }
    }
    for (let i = si; i < slabPool.length; i++) slabPool[i].visible = false;
    for (let i = vi; i < voidPool.length; i++) voidPool[i].visible = false;
    for (let i = ei; i < edgePool.length; i++) edgePool[i].visible = false;
    edgePool.forEach(e => { e.children.forEach(c => { c.material.visible = outlineMat.visible; }); });
  }

  // ---------- camera, light, palette ----------
  const tmpV = new T.Vector3();
  const colA = new T.Color(), colB = new T.Color();
  function updateCamera(g) {
    const tx = X(g.camX + g.lw * 0.5), ty = Y(g.camY + H * 0.5);
    const D = 30.5 / (g.zoom || 1);
    const yaw = -0.075, pitch = 0.17;
    camera.fov = 34;
    camera.position.set(tx + D * Math.sin(yaw) * Math.cos(pitch), ty + D * Math.sin(pitch), D * Math.cos(yaw) * Math.cos(pitch));
    camera.position.x += X(g.shakeX || 0) * 0.9; camera.position.y += -X(g.shakeY || 0) * 0.9;
    camera.lookAt(tx + X(g.shakeX || 0) * 0.9, ty - X(g.shakeY || 0) * 0.9, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    camState.x = tx; camState.y = ty;
    R3.camX3 = tx; R3.camY3 = ty;
    // sky follows the camera
    skyGroup.position.copy(camera.position);
  }

  R3.project = function (lx, ly, lz) {
    tmpV.set(X(lx), Y(ly), lz || 0).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    return { x: (tmpV.x * 0.5 + 0.5) * cw, y: (-tmpV.y * 0.5 + 0.5) * ch, z: tmpV.z };
  };

  function setCol(c, css) { c.set(css); return c; }

  function updateLighting(g) {
    const P = g.P, night = P.night || 0, sp = P.space || 0;
    const T3 = new T.Color(P.skyT), B3 = new T.Color(P.skyB);
    const mid = B3.clone().lerp(T3, 0.35);
    const u = skyMat.uniforms;
    u.top.value.copy(T3); u.bot.value.copy(B3); u.mid.value.copy(mid);
    u.sunCol.value.set(P.sun);
    u.sunPow.value = clamp(1 - sp * 1.6, 0, 1);
    sunSprite.material.color.set(P.sun);
    sunSprite.material.opacity = clamp(1 - sp * 1.6, 0, 1);
    sunSprite.visible = sunSprite.material.opacity > 0.02;
    const sd = u.sunDir.value;
    const sunH = g.sunH != null ? g.sunH : 0.2;
    sd.set(0.5, sunH, -0.85).normalize();
    sunSprite.position.copy(sd).multiplyScalar(470);
    // rays
    const rayA = clamp(1 - sp * 2.2, 0, 1) * (night > 0.5 ? 0.3 : 1);
    for (const m of R3.rays) {
      const i = m.userData.i;
      m.position.copy(sd).multiplyScalar(440);
      m.lookAt(0, 0, 0);
      m.rotateZ(-0.9 + i * 0.26);
      m.material.opacity = 0.34 * rayA * (0.65 + 0.35 * Math.sin(g.time * 0.6 + i * 1.7));
      m.visible = m.material.opacity > 0.01;
    }
    starPts.material.opacity = clamp(night * 1.0, 0, 1);
    starPts.visible = night > 0.02;
    // fog = horizon colour
    scene.fog.color.copy(B3).lerp(T3, 0.1);
    scene.fog.density = (g.fog != null ? g.fog : 0.0065) * (1 - sp * 0.85);
    renderer.setClearColor(B3, 1);
    // lights
    hemi.color.copy(T3).lerp(new T.Color('#ffffff'), 0.55);
    hemi.groundColor.set(P.dirt).multiplyScalar(0.8);
    hemi.intensity = 1.15 + night * 0.35;
    sun.color.set(P.sun).lerp(new T.Color('#fff2dd'), 0.4);
    sun.intensity = 2.5 * (1 - night * 0.45) * (1 - sp * 0.5);
    // sun position near the player so shadows stay in range
    sun.position.set(camState.x - 16, camState.y + 22, 20);
    sun.target.position.set(camState.x + 4, 0, 0);
    sun.target.updateMatrixWorld();
    // tint shared ground materials
    grassMat.color.set(P.grass); capMat.color.set(P.grass).multiplyScalar(1.22);
    dirtMat.color.set(P.dirt);
    fieldMat.color.set(P.mid).lerp(new T.Color(P.grass), 0.4).multiplyScalar(0.78);
    voidMat.color.set(g.voidCol || '#140a24');
  }

  R3.frame = function (g) {
    frameNo++;
    updateCamera(g);
    updateLighting(g);
    updateTrack(g);
    fieldMesh.position.x = camState.x;
    if (R3.world) R3.world.update(g, frameNo);
    if (R3.decor) R3.decor.update(g, frameNo);
    if (R3.chars) R3.chars.update(g, frameNo);
    renderer.render(scene, camera);
  };

  R3.capMat = () => capMat; R3.dirtMat = () => dirtMat; R3.texGrassPub = texGrass;
  R3.add = o => { scene.add(o); return o; };
  R3.remove = o => scene.remove(o);
  R3.getRenderer = () => renderer;
})();
