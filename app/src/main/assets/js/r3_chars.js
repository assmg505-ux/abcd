// GUBS 3D renderer: outlined cartoon characters standing in the 3D world (player, squad, babies, pets, boss).
(function () {
  'use strict';
  const R3 = window.R3;
  if (!R3 || !R3.T) return;
  const T = R3.T, S = 40, GY = 600, TAU = Math.PI * 2, X = R3.X, Y = R3.Y;
  const M = R3.mesh, sph = R3.sph, box = R3.box, cone = R3.cone;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const scene = () => R3.scene();

  const texCache = new Map();
  const matCache = new Map();
  function texFor(key, factory) {
    let t = texCache.get(key);
    if (!t) {
      const cv = factory(key);
      t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
      texCache.set(key, t);
    }
    return t;
  }
  function matFor(key, factory) {
    let m = matCache.get(key);
    if (!m) { m = new T.SpriteMaterial({ map: texFor(key, factory), transparent: true, depthWrite: false, fog: false }); matCache.set(key, m); }
    return m;
  }

  let player, playerTex, shadowPool = [], ghosts = [], squadPool = [], babyMap = new Map(), petSprites = new Map(), bossGroup = null, bossKey = null;
  let inited = false;

  function init(g) {
    inited = true;
    // player sprite uses a live canvas painted by the game every frame
    playerTex = new T.CanvasTexture(g.playerCanvas); playerTex.colorSpace = T.SRGBColorSpace; playerTex.anisotropy = 4;
    player = new T.Sprite(new T.SpriteMaterial({ map: playerTex, transparent: true, depthWrite: false, fog: false }));
    player.center.set(0.5, 22 / 256);
    scene().add(player);
    for (let i = 0; i < 12; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: playerTex, transparent: true, depthWrite: false, fog: false, opacity: 0.4 }));
      s.center.set(0.5, 22 / 256); s.visible = false; scene().add(s); ghosts.push(s);
    }
    const sg = new T.CircleGeometry(0.9, 20);
    for (let i = 0; i < 8; i++) {
      const m = new T.Mesh(sg, new T.MeshBasicMaterial({ color: 0x1a0d26, transparent: true, opacity: 0.3, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 1; scene().add(m); shadowPool.push(m);
    }
  }

  const helpTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const x = c.getContext('2d');
    GU_rr(x, 6, 6, 116, 40, 14); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#2b1640'; x.stroke();
    x.beginPath(); x.moveTo(54, 46); x.lineTo(64, 60); x.lineTo(72, 46); x.fillStyle = '#fff'; x.fill();
    x.font = '900 26px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#2b1640'; x.fillText('HELP!', 64, 27);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();
  function GU_rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function squadSprite(i) {
    let s = squadPool[i];
    if (!s) { s = new T.Sprite(matFor('sq-init', () => { const c = document.createElement('canvas'); c.width = c.height = 4; return c; })); s.visible = false; scene().add(s); squadPool[i] = s; }
    return s;
  }

  function updateShadow(i, wx, surfY, py, w) {
    const m = shadowPool[i];
    if (surfY == null) { m.visible = false; return; }
    const h = Math.max(0, (surfY - py)) / S;   // height above the surface in metres
    const k = clamp(1 - h / 9, 0.25, 1);
    m.visible = true;
    m.position.set(X(wx), Y(surfY) + 0.05, 0);
    m.scale.set(w * k, w * k * 0.9, 1);
    m.material.opacity = 0.34 * k;
  }

  // ---------- boss (giant Grump King) ----------
  function buildBoss() {
    const r = new T.Group(), body = new T.Group();
    body.add(M(sph(2.4, 24, 18), '#c2415a', { outline: 0.14 }));
    body.add(M(sph(1.7, 18, 12), '#e8647a', { outline: 0, pos: [0, -0.5, 1.4], scale: [1, 0.8, 0.7] }));
    for (const s of [-1, 1]) {
      body.add(M(cone(0.5, 1.5, 7), '#8f2740', { outline: 0.08, pos: [s * 1.5, 2.2, 0], rot: [0, 0, -s * 0.5] }));
      body.add(M(sph(0.62, 14, 10), '#ffffff', { outline: 0.06, pos: [s * 0.85, 0.5, 2.0] }));
      body.add(M(sph(0.28, 10, 8), '#2b1640', { outline: 0, pos: [s * 0.78, 0.44, 2.5] }));
      body.add(M(box(1.3, 0.3, 0.3), '#2b1640', { outline: 0, pos: [s * 0.85, 1.4, 2.1], rot: [0, 0, s * 0.45] }));
    }
    body.add(M(box(1.4, 0.3, 0.3), '#2b1640', { outline: 0, pos: [0, -0.9, 2.3] }));
    const crown = new T.Group(); crown.position.set(0, 2.5, 0);
    crown.add(M(T.CylinderGeometry ? R3.cyl(1.1, 1.3, 0.6, 5) : null, '#ffd23f', { outline: 0.07 }));
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; crown.add(M(cone(0.25, 0.7, 4), '#ffd23f', { outline: 0.05, pos: [Math.cos(a) * 1.1, 0.6, Math.sin(a) * 1.1] })); }
    body.add(crown);
    const wings = [];
    for (const s of [-1, 1]) {
      const piv = new T.Group(); piv.position.set(s * 2.2, 0.4, 0);
      piv.add(M(sph(1, 14, 8), '#5a2a6e', { outline: 0.08, scale: [2.3, 0.22, 1.1], pos: [s * 2.2, 0, 0] }));
      body.add(piv); wings.push([piv, s]);
    }
    const weak = new T.Mesh(sph(0.7, 14, 10), new T.MeshBasicMaterial({ color: 0xffe14a })); weak.position.set(0, 2.9, 0.3); body.add(weak);
    r.add(body);
    return { root: r, body, wings, weak, crown };
  }

  R3.chars = {
    texFor, matFor,
    update(g, n) {
      if (!inited) init(g);
      const S1 = 3.2;
      // ----- player -----
      const p = g.player;
      playerTex.needsUpdate = true;
      player.visible = !!g.showPlayer;
      if (player.visible) {
        const sc = S1 * (p.scale || 1);
        player.scale.set(sc, sc, 1);
        player.position.set(X(g.px), Y(p.y), 0.02);
        player.material.opacity = 1;
      }
      updateShadow(0, g.px, g.shadowY, p.y, 1.1 * (p.scale || 1));
      // ghosts (dash afterimages)
      for (let i = 0; i < ghosts.length; i++) {
        const gh = g.ghosts[i], s = ghosts[i];
        if (!gh) { s.visible = false; continue; }
        s.visible = true; s.scale.set(S1 * 1.25 * (p.scale || 1), S1 * 0.9 * (p.scale || 1), 1);
        s.position.set(X(gh.x), Y(gh.y), 0.01); s.material.opacity = clamp(gh.life * 0.45, 0, 0.5);
      }
      // ----- squad -----
      const sl = g.squadList || [];
      for (let i = 0; i < sl.length; i++) {
        const q = sl[i], s = squadSprite(i);
        s.material = matFor(q.key, g.gubCanvas);
        const mini = q.mini, ss = mini ? 0.8 : 1.6;
        s.center.set(0.5, mini ? 4 / 64 : 10 / 128);
        s.scale.set(ss * (q.sc || 1), ss * (q.sc || 1), 1);
        s.position.set(X(q.x), Y(q.y - (q.bob || 0)), 0.0 - i * 0.002);
        s.visible = true;
        if (i < 6 && q.shadow != null) updateShadow(1 + i, q.x, q.shadow, q.y, 0.7);
      }
      for (let i = sl.length; i < squadPool.length; i++) if (squadPool[i]) squadPool[i].visible = false;
      for (let i = 1 + Math.min(6, sl.length); i < shadowPool.length; i++) shadowPool[i].visible = false;
      // ----- baby gubs on the field -----
      const lo = g.camX - 200, hi = g.camX + g.lw + 300, stamp = n;
      for (const b of g.babies) {
        if (b.taken || b.x < lo || b.x > hi) continue;
        let e = babyMap.get(b);
        if (!e) {
          const sp = new T.Sprite(matFor('baby:' + b.color, g.gubCanvas)); sp.center.set(0.5, 10 / 128); sp.scale.set(1.9, 1.9, 1);
          const hb = new T.Sprite(new T.SpriteMaterial({ map: helpTex, transparent: true, depthWrite: false, fog: false })); hb.scale.set(1.9, 0.95, 1);
          scene().add(sp); scene().add(hb); e = { sp, hb }; babyMap.set(b, e);
        }
        e.stamp = stamp;
        const bob = Math.abs(Math.sin(g.time * 6 + b.ph)) * 0.25;
        e.sp.position.set(X(b.x), Y(b.y) + bob, 0.03); e.hb.position.set(X(b.x), Y(b.y) + 2.3 + bob * 0.5, 0.04);
        e.sp.scale.y = 1.9 * (1 + bob * 0.2);
      }
      babyMap.forEach((e, b) => { if (e.stamp !== stamp) { scene().remove(e.sp); scene().remove(e.hb); babyMap.delete(b); } });
      // ----- pets -----
      const pets = g.pets || [];
      for (let i = 0; i < pets.length; i++) {
        const pt = pets[i];
        let sp = petSprites.get(pt.id);
        if (!sp) { sp = new T.Sprite(matFor('pet:' + pt.id, g.petCanvas)); sp.center.set(0.5, 0.1); scene().add(sp); petSprites.set(pt.id, sp); }
        sp.visible = true; sp.scale.set(1.8, 1.8, 1);
        sp.position.set(X(pt.x), Y(pt.y), 0.05);
      }
      petSprites.forEach((sp, id) => { if (!pets.some(p2 => p2.id === id)) sp.visible = false; });
      // ----- boss -----
      const bs = g.boss;
      if (bs) {
        if (!bossGroup) { bossGroup = buildBoss(); scene().add(bossGroup.root); }
        const bg = bossGroup;
        bg.root.visible = true;
        const sc = bs.s || 1;
        bg.root.scale.setScalar(sc);
        bg.root.position.set(X(bs.x), Y(bs.y), 0);
        const f = Math.sin(g.time * 14);
        bg.wings.forEach(w => { w[0].rotation.z = w[1] * f * 0.4; });
        bg.body.rotation.z = Math.sin(g.time * 2) * 0.05 + (bs.tilt || 0);
        bg.weak.visible = !!bs.weak && Math.floor(g.time * 8) % 2 === 0;
        bg.root.traverse(o => { if (o.isMesh && o.material && o.material.emissive !== undefined && !o.userData.outline) { /* flash */ } });
        const flash = bs.flash > 0 && Math.floor(g.time * 30) % 2 === 0;
        bg.root.children[0].children.forEach(c => { if (c.isMesh && c.material && c.material.color && c.material !== R3.outlineMat) { /* keep */ } });
        bg.root.visible = !(flash && bs.flashHide);
      } else if (bossGroup) bossGroup.root.visible = false;
    }
  };
})();
