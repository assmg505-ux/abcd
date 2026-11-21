// GUBBIES — WE ARE GUBBIES!
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');

  // ---------- world constants (logical units; world is always H tall) ----------
  const H = 720, GY = 600, METER = 40;
  const GRAV = 3300, JUMP_V = 1150, DJUMP_V = 1020;
  const DASH_COST = 50, MAX_SQUAD = 10, REVIVE_COST = 150;
  const INK = '#2b1640';
  const FONT = 'system-ui, -apple-system, Roboto, sans-serif';

  let dpr = 1, sc = 1, lw = 1280, safeL = 0, safeR = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    sc = h / H; lw = w / sc;
    const cs = getComputedStyle($('safe'));
    safeL = (parseFloat(cs.paddingLeft) || 0) / sc;
    safeR = (parseFloat(cs.paddingRight) || 0) / sc;
  }
  window.addEventListener('resize', resize);
  resize();
  const PX = () => Math.max(220, lw * 0.26) + safeL * 0.5;

  // ---------- utils ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => Math.floor(n).toLocaleString('en-US');
  function hash(n) {
    let h = Math.imul(n | 0, 374761393);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const hexRgb = h => [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  const mixRgb = (a, b, t) => 'rgb(' + ((a[0] + (b[0] - a[0]) * t) | 0) + ',' + ((a[1] + (b[1] - a[1]) * t) | 0) + ',' + ((a[2] + (b[2] - a[2]) * t) | 0) + ')';
  function weighted(opts) {
    let s = 0; for (const o of opts) s += o[1];
    let r = Math.random() * s;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts[0][0];
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  // ---------- save ----------
  const SAVE_KEY = 'gubbies-save-v1';
  const defaultSave = () => ({
    coins: 0, best: 0, skin: 'gub', owned: ['gub'], missions: [], missionLevel: 0, tutorial: false,
    stats: { runs: 0, coins: 0, meters: 0, stomps: 0, crates: 0, rescued: 0, dashes: 0, powerups: 0 },
    settings: { music: true, sfx: true, haptics: true }
  });
  function loadSave() {
    const d = defaultSave();
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === 'object') {
        return Object.assign(d, s, {
          stats: Object.assign(d.stats, s.stats || {}),
          settings: Object.assign(d.settings, s.settings || {})
        });
      }
    } catch (e) {}
    return d;
  }
  let save = loadSave();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

  function buzz(ms) {
    if (!save.settings.haptics) return;
    try {
      if (window.GubbiesNative && window.GubbiesNative.vibrate) window.GubbiesNative.vibrate(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  // ---------- skins ----------
  const SKINS = [
    { id: 'gub', name: 'Gub', price: 0, body: '#5ee07a', acc: null },
    { id: 'bubble', name: 'Bubblegum', price: 150, body: '#ff8fc8', acc: 'bow' },
    { id: 'sky', name: 'Sky Gub', price: 300, body: '#6cc8ff', acc: 'cap' },
    { id: 'sunny', name: 'Sunny', price: 600, body: '#ffd84a', acc: 'flower' },
    { id: 'grape', name: 'Grape', price: 1000, body: '#b07cff', acc: 'antenna' },
    { id: 'ninja', name: 'Ninja Gub', price: 1600, body: '#4a4e66', acc: 'headband' },
    { id: 'robo', name: 'Robo Gub', price: 2500, body: '#c9d3e0', acc: 'visor' },
    { id: 'king', name: 'King Gub', price: 4000, body: '#ff7a4a', acc: 'crown' },
    { id: 'golden', name: 'Golden Gub', price: 8000, body: '#ffcf3d', acc: 'halo', sparkle: true }
  ];
  const BABY_COLORS = ['#5ee07a', '#ff8fc8', '#6cc8ff', '#ffd84a', '#b07cff', '#ff8a4a', '#7cf2e6'];
  const skin = () => SKINS.find(s => s.id === save.skin) || SKINS[0];

  // ---------- biomes ----------
  const BIOMES = [
    { name: 'CANDY MEADOW', skyT: '#74c8ff', skyB: '#ffe3f3', far: '#b7a4ff', mid: '#86df95', grass: '#5fd35f', dirt: '#b9784a', dirtDot: '#9a5f36', sun: '#fff3a8', amb: 'petal', night: 0 },
    { name: 'SUNSET DUNES', skyT: '#ff8f5a', skyB: '#ffe1a3', far: '#e0736b', mid: '#f2b25c', grass: '#f7d27a', dirt: '#d18b4a', dirtDot: '#b06d32', sun: '#fff0b0', amb: 'sand', night: 0 },
    { name: 'NEON NIGHT', skyT: '#120a35', skyB: '#5a1f80', far: '#2c1660', mid: '#1f1150', grass: '#2ef2ff', dirt: '#28175a', dirtDot: '#3a2470', sun: '#ff5fd2', amb: 'star', night: 1 },
    { name: 'FROSTY PEAKS', skyT: '#8fd0ff', skyB: '#eef8ff', far: '#bcd2ee', mid: '#e3eefc', grass: '#ffffff', dirt: '#8fb4d9', dirtDot: '#7499bf', sun: '#ffffff', amb: 'snow', night: 0 },
    { name: 'LAVA LAND', skyT: '#2a0a0a', skyB: '#a3301a', far: '#4a1512', mid: '#341010', grass: '#ff7a2e', dirt: '#3b1610', dirtDot: '#5a2016', sun: '#ffb03a', amb: 'ember', night: 1 }
  ];
  const PKEYS = ['skyT', 'skyB', 'far', 'mid', 'grass', 'dirt', 'dirtDot', 'sun'];
  BIOMES.forEach(b => PKEYS.forEach(k => { b['_' + k] = hexRgb(b[k]); }));
  const BIOME_LEN = 700;
  const P = {};
  function computePalette() {
    const m = state === 'menu' ? (time * 22) % (BIOME_LEN * BIOMES.length) : meters;
    const seg = Math.floor(m / BIOME_LEN), i = seg % BIOMES.length, j = (i + 1) % BIOMES.length;
    const into = m - seg * BIOME_LEN, t = clamp((into - (BIOME_LEN - 45)) / 45, 0, 1);
    const a = BIOMES[i], b = BIOMES[j];
    for (const k of PKEYS) P[k] = mixRgb(a['_' + k], b['_' + k], t);
    const cur = t < 0.5 ? a : b;
    P.amb = cur.amb; P.idx = t < 0.5 ? i : j; P.night = lerp(a.night, b.night, t);
  }

  // ---------- missions ----------
  const MT = [
    { id: 'coins', run: true, stat: 'coins', vals: [25, 50, 90, 150, 240], txt: n => 'Collect ' + n + ' coins in one run' },
    { id: 'meters', run: true, stat: 'meters', vals: [250, 500, 900, 1500, 2400], txt: n => 'Run ' + fmt(n) + 'm in one run' },
    { id: 'rescue', run: true, stat: 'rescued', vals: [2, 4, 7, 10, 14], txt: n => 'Rescue ' + n + ' Gubbies in one run' },
    { id: 'squad', run: true, stat: 'maxSquad', vals: [3, 4, 6, 8, 10], txt: n => 'Have ' + n + ' Gubbies in your squad' },
    { id: 'dashes', run: true, stat: 'dashes', vals: [3, 5, 8, 12, 18], txt: n => 'Dash ' + n + ' times in one run' },
    { id: 'score', run: true, stat: 'score', vals: [1500, 4000, 9000, 18000, 35000], txt: n => 'Score ' + fmt(n) + ' in one run' },
    { id: 'combo', run: true, stat: 'bestCombo', vals: [3, 5, 7, 10, 14], txt: n => 'Get a x' + n + ' combo' },
    { id: 'stomps', run: false, stat: 'stomps', vals: [5, 12, 25, 45, 70], txt: n => 'Stomp ' + n + ' Grumps' },
    { id: 'crates', run: false, stat: 'crates', vals: [8, 20, 40, 70, 110], txt: n => 'Smash ' + n + ' crates' },
    { id: 'powerups', run: false, stat: 'powerups', vals: [3, 7, 12, 20, 30], txt: n => 'Grab ' + n + ' power-ups' }
  ];
  const REWARDS = [60, 110, 180, 280, 450];
  const missionDef = m => MT.find(t => t.id === m.id);
  function newMission(exclude) {
    const pool = MT.filter(m => !exclude.includes(m.id));
    const d = pick(pool), tier = Math.min(4, Math.floor(save.missionLevel / 3));
    return { id: d.id, tier, target: d.vals[tier], base: d.run ? 0 : (save.stats[d.stat] || 0), prog: 0, done: false };
  }
  function ensureMissions() {
    if (!Array.isArray(save.missions)) save.missions = [];
    save.missions = save.missions.filter(m => missionDef(m));
    while (save.missions.length < 3) save.missions.push(newMission(save.missions.map(m => m.id)));
  }
  function missionProgress(m) {
    const d = missionDef(m);
    if (d.run) return Math.max(m.prog, run ? (run[d.stat] || 0) : 0);
    return (save.stats[d.stat] || 0) - m.base;
  }
  function checkMissions() {
    for (const m of save.missions) {
      if (m.done) continue;
      const d = missionDef(m), p = missionProgress(m);
      if (d.run) m.prog = p;
      if (p >= m.target) {
        m.done = true;
        const rw = REWARDS[m.tier];
        save.coins += rw; save.missionLevel++;
        if (run) run.missionsDone.push({ text: d.txt(m.target), reward: rw });
        if (state === 'play') { screenPop('MISSION COMPLETE! +' + rw, '#7dff9a', 34); Sound.sfx('mission'); buzz(40); }
      }
    }
  }

  // ---------- state ----------
  let state = 'menu';
  let time = 0, camX = 0, speed = 460, meters = 0, score = 0;
  let freezeT = 0, shakeT = 0, shakeDur = 1, shakeMag = 0, dieT = 0;
  let segs = [], obs = [], plats = [], coins = [], babies = [], powers = [], parts = [], pops = [], squad = [], hist = [], tutHints = [];
  let genX = 0, tutQueue = [], hint = null, banner = null, lastBiome = 0;
  let combo = 0, comboT = 0, coinStreak = 0, coinStreakT = 0, missionT = 0;
  let run = null, player = null, revived = false, downHeld = false;
  let autopilot = false, autoHoldT = 0, autoDownT = 0;

  function newPlayer() {
    return {
      y: GY, vy: 0, prevY: GY, onGround: true, coyote: 0, jumpBuf: 0, jumps: 0, holding: false, holdT: 0,
      slideT: 0, slam: false, dashT: 0, energy: 100, invuln: 0, shield: false,
      magnetT: 0, megaT: 0, doubleT: 0, scale: 1, spin: 0, sq: 0, sqv: 0, blinkT: 2, ouchT: 0,
      ghosts: [], ghostT: 0, hopT: 1
    };
  }

  // ---------- terrain ----------
  const lastSeg = () => segs[segs.length - 1];
  function extendGround(x) { const s = lastSeg(); if (x > s.x1) s.x1 = x; }
  function makePit(x, w) { extendGround(x); lastSeg().x1 = x; segs.push({ x0: x + w, x1: x + w }); }
  function overGround(a, b) {
    for (const s of segs) if (s.x0 < b && s.x1 > a) return true;
    return false;
  }

  // ---------- entity helpers ----------
  function addObs(type, x, y, w, h, extra) {
    const o = Object.assign({ type, x, y, w, h, dead: false, t: Math.random() * 10 }, extra || {});
    obs.push(o); return o;
  }
  const addSpike = (x, y) => addObs('spike', x, (y || GY) - 44, 42, 44);
  const addCrate = (x, y) => addObs('crate', x, y - 64, 64, 64);
  const addGrump = (x, cy, low) => addObs('grump', x, cy - 25, 60, 50, { baseY: cy - 25, amp: low ? 4 : 18, vx: -rnd(70, 130) });
  const addSaw = (x, cy, r, amp) => addObs('saw', x, cy - r, r * 2, r * 2, { r, cy, baseCy: cy, amp: amp || 0, rot: 0 });
  const addBaby = (x, y) => babies.push({ x, y, color: pick(BABY_COLORS), ph: Math.random() * 6, taken: false });
  const addPlat = (x, y, w) => plats.push({ x, y, w });
  function addPower(x, y) {
    powers.push({ x, y, type: weighted([['magnet', 3], ['shield', 3], ['double', 2], ['mega', 1.2]]), ph: Math.random() * 6, taken: false });
  }
  function coinArc(x0, x1, peak, n) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      coins.push({ x: lerp(x0, x1, t), y: GY - 50 - Math.sin(t * Math.PI) * peak, t: Math.random() * 6 });
    }
  }
  function coinLine(x0, y, n, gap) {
    for (let i = 0; i < n; i++) coins.push({ x: x0 + i * (gap || 44), y, t: i * 0.4 });
  }
  function tutHint(x, text) { tutHints.push({ x, text, shown: false }); }

  // ---------- level generation ----------
  function ensureGen() { while (genX < camX + lw + 700) genPattern(); }

  function genPattern() {
    const D = clamp(meters / 2500, 0, 1);
    const sp = Math.max(speed, 460);
    const x = genX + sp * rnd(0.6, 0.9) * (1 - D * 0.25);
    extendGround(x);
    let w;
    if (tutQueue.length) {
      w = genTutorial(tutQueue.shift(), x);
    } else {
      const opts = [
        ['spikes', 3], ['wall', 2], ['crates', 2.2], ['grump', 2 + D * 2], ['pit', 1.4 + D * 2],
        ['plats', 1.6], ['saw', D > 0.15 ? 1.2 + D * 1.5 : 0], ['coins', 1.4], ['combo', D > 0.3 ? 2.4 * D : 0],
        ['baby', squad.length < 3 ? 1.7 : squad.length < 6 ? 0.9 : 0.4], ['power', 0.6]
      ];
      w = runPattern(weighted(opts), x, D, sp);
    }
    genX = x + w;
    extendGround(genX);
  }

  function genTutorial(kind, x) {
    switch (kind) {
      case 'spike': addSpike(x); coinArc(x - 100, x + 140, 175, 6); tutHint(x, 'TAP anywhere to JUMP! Hold for higher'); return 42;
      case 'crate': addCrate(x, GY); addCrate(x, GY - 64); tutHint(x, 'Press DASH to smash right through!'); return 64;
      case 'grump': addGrump(x, GY - 50, true); coinLine(x - 120, GY - 28, 6, 40); tutHint(x, 'Hold SLIDE to duck - or JUMP on Grumps!'); return 60;
      case 'baby': addBaby(x, GY); tutHint(x, 'Grab baby Gubbies! They protect you & multiply score'); return 40;
      case 'pit': makePit(x, 170); coinArc(x - 50, x + 220, 200, 7); tutHint(x, 'Jump the gaps! Tap again in the air to DOUBLE JUMP'); return 170;
      case 'slam': for (let i = 0; i < 3; i++) addCrate(x + i * 64, GY); tutHint(x - 120, 'Jump, then press SLIDE in the air to SLAM!'); return 192;
    }
    return 40;
  }

  function runPattern(kind, x, D, sp) {
    switch (kind) {
      case 'spikes': {
        const n = rint(1, D < 0.25 ? 2 : 3);
        for (let i = 0; i < n; i++) addSpike(x + i * 42);
        coinArc(x - 100, x + n * 42 + 100, 175, 5 + n);
        return n * 42;
      }
      case 'wall': {
        const h = rint(84, 104 + Math.floor(D * 36));
        addObs('wall', x, GY - h, 62, h);
        if (Math.random() < 0.35) addBaby(x + 31, GY - h); else coinLine(x + 31, GY - h - 44, 1);
        return 62;
      }
      case 'crates': {
        if (Math.random() < 0.55) {
          const n = rint(1, 3);
          for (let i = 0; i < n; i++) addCrate(x + i * 64, GY);
          coinLine(x + 10, GY - 120, n * 2, 30);
          return n * 64;
        }
        addCrate(x, GY); addCrate(x, GY - 64); coinLine(x + 32, GY - 175, 1);
        return 64;
      }
      case 'grump': {
        if (D > 0.3 && Math.random() < 0.35) { addGrump(x, GY - 185, false); coinLine(x - 60, GY - 40, 5, 40); }
        else { addGrump(x, GY - 50, true); coinLine(x - 120, GY - 28, 6, 40); }
        return 60;
      }
      case 'pit': {
        const w = clamp(rnd(130, 170 + D * 190), 120, sp * 0.5);
        makePit(x, w);
        coinArc(x - 50, x + w + 50, 200, 7);
        if (w > 240 && Math.random() < 0.5) addPlat(x + w / 2 - 70, GY - 130, 140);
        return w;
      }
      case 'plats': {
        const n = rint(2, 3);
        let cx = x, firstW = 0;
        for (let i = 0; i < n; i++) {
          const y = i % 2 === 0 ? GY - 150 : GY - 255, w = rint(150, 200);
          if (i === 0) firstW = w;
          addPlat(cx, y, w);
          coinLine(cx + 25, y - 40, Math.floor(w / 45), 40);
          if (i === n - 1 && Math.random() < 0.45) addBaby(cx + w - 40, y);
          cx += w + rint(90, 140);
        }
        if (D > 0.25) { const k = Math.floor((firstW - 40) / 42); for (let i = 0; i < k; i++) addSpike(x + 20 + i * 42); }
        return cx - x;
      }
      case 'saw': {
        if (D > 0.45 && Math.random() < 0.45) { addSaw(x, GY - 130, 34, 85); return 68; }
        addSaw(x, GY - 6, 38, 0);
        coinArc(x - 90, x + 166, 185, 6);
        return 76;
      }
      case 'coins': {
        const n = rint(8, 12);
        for (let i = 0; i < n; i++) coins.push({ x: x + i * 42, y: GY - 70 - Math.sin(i * 0.7) * 55, t: i * 0.4 });
        return n * 42;
      }
      case 'baby': {
        if (D > 0.1 && Math.random() < 0.4) { addSpike(x); addBaby(x + 190, GY); return 210; }
        addBaby(x, GY);
        return 40;
      }
      case 'power': {
        addPower(x, GY - 150);
        return 60;
      }
      case 'combo': {
        const c = rint(0, 3);
        if (c === 0) {
          addSpike(x);
          const x2 = x + 42 + sp * rnd(0.75, 0.95);
          extendGround(x2); addSpike(x2); addSpike(x2 + 42);
          return x2 + 84 - x;
        }
        if (c === 1) {
          for (let i = 0; i < 3; i++) addCrate(x + i * 64, GY);
          addGrump(x + 96, GY - 205, false);
          return 192;
        }
        if (c === 2) {
          const w = clamp(rnd(130, 200), 120, sp * 0.45);
          makePit(x, w); coinArc(x - 50, x + w + 50, 200, 7);
          const gx = x + w + sp * 0.7;
          extendGround(gx); addGrump(gx, GY - 50, true);
          return gx + 60 - x;
        }
        const h = rint(84, 110);
        addObs('wall', x, GY - h, 62, h);
        const sx = x + 62 + sp * 0.55;
        extendGround(sx); addSpike(sx); addSpike(sx + 42);
        return sx + 84 - x;
      }
    }
    return 40;
  }

  // ---------- particles & pops ----------
  function addPart(o) { if (parts.length > 450) parts.shift(); parts.push(o); }
  function burst(x, y, color, n, spd, size, shape) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(spd * 0.3, spd);
      addPart({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life: rnd(0.4, 0.9), max: 0.9, size: rnd(size * 0.6, size), color, g: 1400, shape: shape || 'circle', rot: rnd(0, 6) });
    }
  }
  function dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      addPart({ x: x + rnd(-14, 14), y: y - 4, vx: rnd(-160, -20), vy: rnd(-140, -30), life: rnd(0.3, 0.55), max: 0.55, size: rnd(6, 12), color: 'rgba(255,255,255,0.8)', g: 200, shape: 'circle' });
    }
  }
  function ring(x, y, color, r) { addPart({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: r, color, g: 0, shape: 'ring' }); }
  function screenPop(text, color, size) {
    const sp = pops.filter(p => p.screen);
    if (sp.length >= 3) pops.splice(pops.indexOf(sp[0]), 1);
    pops.push({ text, color: color || '#fff', size: size || 44, t: 0, dur: 1.4, screen: true });
  }
  function worldPop(text, x, y, color, size) {
    pops.push({ text, x, y, color: color || '#fff', size: size || 28, t: 0, dur: 0.9, screen: false });
  }
  function shake(d, m) { if (shakeT <= 0 || m >= shakeMag) { shakeMag = m; shakeDur = d; } shakeT = Math.max(shakeT, d); }

  // ---------- run lifecycle ----------
  function startRun() {
    Sound.init();
    segs = [{ x0: -3000, x1: 900 }];
    obs = []; plats = []; coins = []; babies = []; powers = []; parts = []; pops = []; squad = []; hist = []; tutHints = [];
    camX = 0; speed = 460; meters = 0; score = 0; freezeT = 0; shakeT = 0;
    genX = 900; combo = 0; comboT = 0; coinStreak = 0; revived = false; hint = null; banner = null; lastBiome = 0; downHeld = false;
    player = newPlayer();
    run = { coins: 0, meters: 0, rescued: 0, dashes: 0, score: 0, maxSquad: 0, bestCombo: 0, missionsDone: [], banked: { coins: 0, meters: 0 }, newBest: false };
    tutQueue = save.tutorial ? [] : ['spike', 'crate', 'grump', 'baby', 'pit', 'slam'];
    save.stats.runs++;
    ensureMissions();
    state = 'play';
    showScreen(null);
    Sound.music('game');
    banner = { text: BIOMES[0].name, sub: 'GO GO GUBBY!', t: 0 };
  }

  function enterMenu() {
    state = 'menu';
    segs = [{ x0: -1e12, x1: 1e12 }];
    obs = []; plats = []; coins = []; babies = []; powers = []; parts = []; pops = []; hist = []; tutHints = [];
    player = newPlayer();
    squad = [];
    for (let i = 0; i < 6; i++) squad.push({ color: BABY_COLORS[i % BABY_COLORS.length], ph: i * 1.3 });
    banner = null; hint = null;
    updateMenuStats();
    showScreen('menu');
    Sound.music('menu');
  }

  function bankRun() {
    const dc = run.coins - run.banked.coins;
    save.coins += dc; save.stats.coins += dc;
    const m = Math.floor(meters);
    save.stats.meters += m - run.banked.meters;
    run.banked = { coins: run.coins, meters: m };
    run.score = Math.floor(score); run.meters = m;
    if (run.score > save.best) { save.best = run.score; run.newBest = true; }
    if (!tutQueue.length) save.tutorial = true;
    checkMissions();
    persist();
  }

  function die() {
    if (state !== 'play') return;
    state = 'dying'; dieT = 0;
    const p = player, px = camX + PX();
    shake(0.5, 16); freezeT = 0.1; buzz(180);
    Sound.sfx('die'); Sound.music(null);
    burst(px, p.y - 24, skin().body, 30, 800, 14);
    burst(px, p.y - 24, '#ffffff', 10, 600, 8);
    ring(px, p.y - 24, '#ffffff', 90);
  }

  function finishRun() {
    bankRun();
    state = 'over';
    $('goTitle').textContent = pick(['SPLAT!', 'SQUISHED!', 'GUB DOWN!', 'BONK!', 'OOF!']);
    $('goBest').style.display = run.newBest ? '' : 'none';
    $('goBestVal').textContent = fmt(save.best);
    $('goDist').textContent = fmt(meters) + 'm';
    $('goCoins').textContent = fmt(run.coins);
    $('goSaved').textContent = run.rescued;
    $('goCombo').textContent = 'x' + run.bestCombo;
    const gm = $('goMissions'); gm.innerHTML = '';
    for (const md of run.missionsDone) {
      const d = document.createElement('div');
      d.innerHTML = '<span></span><b><span class="coin"></span> +' + md.reward + '</b>';
      d.firstChild.textContent = 'DONE: ' + md.text;
      gm.appendChild(d);
    }
    run.missionsDone = [];
    save.missions = save.missions.filter(m => !m.done); ensureMissions(); persist();
    const rb = $('btnRevive');
    $('reviveCost').textContent = REVIVE_COST;
    rb.style.display = revived ? 'none' : '';
    rb.classList.toggle('locked', save.coins < REVIVE_COST);
    countUp($('goScore'), run.score);
    showScreen('over');
    Sound.music('menu');
  }

  function countUp(el, target) {
    const t0 = performance.now(), dur = 900;
    function stepFn(now) {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && state === 'over') requestAnimationFrame(stepFn); else el.textContent = fmt(target);
    }
    requestAnimationFrame(stepFn);
  }

  function revive() {
    if (revived || save.coins < REVIVE_COST) { Sound.sfx('deny'); shakeEl($('btnRevive')); return; }
    save.coins -= REVIVE_COST; persist();
    revived = true;
    obs = obs.filter(o => o.x > camX + lw + 300 || o.x + o.w < camX);
    segs.unshift({ x0: camX - 300, x1: camX + lw + 400 });
    genX = Math.max(genX, camX + lw + 400);
    extendGround(genX);
    const p = player;
    p.y = GY - 260; p.vy = 0; p.invuln = 2.5; p.dashT = 0; p.slam = false; p.ouchT = 0; p.shield = true;
    state = 'play'; showScreen(null); Sound.music('game'); Sound.sfx('revive');
    screenPop('SECOND CHANCE!', '#7dff9a', 50);
  }

  function pauseGame() {
    if (state !== 'play') return;
    state = 'paused'; showScreen('pause'); Sound.music(null);
    downHeld = false; if (player) player.holding = false;
  }
  function resumeGame() {
    if (state !== 'paused') return;
    state = 'play'; showScreen(null); Sound.music('game');
  }

  // ---------- player actions ----------
  function pressJump() { if (state !== 'play') return; player.jumpBuf = 0.13; player.holding = true; }
  function releaseJump() { if (player) player.holding = false; }

  function doJump(kind) {
    const p = player, px = camX + PX();
    p.dashT = 0;
    if (kind === 1) {
      p.vy = -JUMP_V; p.jumps = 1; p.sq = 0.3; Sound.sfx('jump'); dust(px, p.y, 5);
    } else {
      p.vy = -DJUMP_V; p.jumps = 2; p.spin = 1; p.sq = 0.25; Sound.sfx('djump');
      ring(px, p.y - 20, 'rgba(255,255,255,0.9)', 50);
    }
    p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.holdT = 0; p.slideT = 0; p.slam = false;
    buzz(8);
  }

  function doDash() {
    const p = player;
    if (state !== 'play' || p.dashT > 0) return;
    if (p.energy < DASH_COST) { Sound.sfx('deny'); return; }
    p.energy -= DASH_COST; p.dashT = 0.34; p.slam = false; p.slideT = 0; p.vy = 0;
    run.dashes++; save.stats.dashes++;
    Sound.sfx('dash'); buzz(25); shake(0.15, 5);
  }

  function pressDown() {
    if (state !== 'play') return;
    const p = player; downHeld = true;
    if (p.onGround) {
      if (p.slideT <= 0) { Sound.sfx('slide'); dust(camX + PX(), p.y, 4); }
      p.slideT = 0.55;
    } else if (!p.slam) {
      p.slam = true; p.dashT = 0; p.vy = Math.max(p.vy, 1400); p.sq = 0.35;
      Sound.sfx('whoosh');
    }
  }
  function releaseDown() { downHeld = false; }

  function addCombo(x, y) {
    combo++; comboT = 2.4;
    run.bestCombo = Math.max(run.bestCombo, combo);
    const words = { 2: 'NICE!', 3: 'SWEET!', 4: 'GREAT!', 5: 'GUBTASTIC!', 7: 'SUPER GUB!', 10: 'UNSTOPPABLE!', 15: 'GUB GOD!' };
    if (words[combo]) { screenPop(words[combo], pick(['#ffd84a', '#ff8fc8', '#7cf2e6', '#7dff9a']), 52); Sound.sfx('combo', combo); }
    const pts = 50 * combo * (1 + squad.length);
    score += pts;
    worldPop('+' + fmt(pts), x, y, '#fff', 28);
  }

  function smash(o, why) {
    if (o.dead) return;
    o.dead = true;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    if (o.type === 'crate') {
      burst(cx, cy, '#e09a4f', 14, 520, 12, 'square');
      burst(cx, cy, '#a8632b', 6, 400, 9, 'square');
      run.coins += 3; save.stats.crates++;
      worldPop('+3', cx, cy - 30, '#ffd84a', 26);
    } else if (o.type === 'grump') {
      burst(cx, cy, '#e8455f', 16, 600, 12);
      save.stats.stomps++;
    } else {
      burst(cx, cy, '#cfd5e2', 12, 500, 10, 'square');
    }
    Sound.sfx('smash'); buzz(15);
    if (why !== 'mega') shake(0.12, 6);
    freezeT = Math.max(freezeT, 0.035);
    addCombo(cx, o.y - 20);
  }

  function stomp(o) {
    const p = player;
    smash(o, 'stomp');
    Sound.sfx('stomp');
    p.vy = p.holding ? -1180 : -920; p.jumps = 1; p.onGround = false; p.slam = false; p.sq = 0.3;
    ring(o.x + o.w / 2, o.y, '#ffffff', 60);
  }

  function slamImpact(px) {
    const p = player;
    shake(0.28, 13); Sound.sfx('slam'); buzz(45);
    ring(px, p.y, 'rgba(255,255,255,0.95)', 170);
    dust(px, p.y, 12);
    for (const o of obs) {
      if (o.dead || (o.type !== 'crate' && o.type !== 'grump')) continue;
      if (o.x + o.w > px - 200 && o.x < px + 260 && o.y + o.h > GY - 170) smash(o, 'slam');
    }
    p.sq = -0.4;
  }

  function hurt() {
    const p = player, px = camX + PX();
    if (p.invuln > 0 || p.dashT > 0 || p.megaT > 0) return;
    if (p.shield) {
      p.shield = false; p.invuln = 1.1;
      Sound.sfx('shield'); shake(0.2, 8); buzz(50);
      burst(px, p.y - 30, '#9fe8ff', 18, 600, 9);
      screenPop('SHIELD POP!', '#9fe8ff', 40);
      return;
    }
    if (squad.length) {
      const g = squad.pop();
      p.invuln = 1.4; p.ouchT = 0.6;
      addPart({ x: px - 30, y: p.y - 20, vx: -rnd(200, 400), vy: -900, life: 1.2, max: 1.2, size: 30, color: g.color, g: 1800, shape: 'gub', rot: 0 });
      Sound.sfx('hurt'); shake(0.3, 11); buzz(70); freezeT = 0.08;
      screenPop(squad.length ? 'OUCH! -1 GUBBY' : 'LAST CHANCE!', '#ff8f8f', 40);
      combo = 0;
      return;
    }
    die();
  }

  function pitFall() {
    const p = player, px = camX + PX();
    if (p.shield || squad.length) {
      if (p.shield) p.shield = false;
      else {
        const g = squad.pop();
        addPart({ x: px, y: GY + 20, vx: rnd(-100, 100), vy: 400, life: 1, max: 1, size: 30, color: g.color, g: 1800, shape: 'gub', rot: 0 });
      }
      p.y = GY + 70; p.vy = -1750; p.jumps = 1; p.invuln = 1.4; p.slam = false; p.dashT = 0;
      Sound.sfx('djump'); shake(0.25, 10); buzz(60);
      screenPop('GUBBY BOOST!', '#7cf2e6', 44);
      ring(px, GY, '#ffffff', 80);
      return;
    }
    die();
  }

  function rescue(b, px) {
    b.taken = true;
    if (squad.length < MAX_SQUAD) {
      squad.push({ color: b.color, ph: Math.random() * 6 });
      worldPop('+1 GUBBY!', b.x, b.y - 70, '#7dff9a', 30);
    } else {
      score += 250 * (1 + squad.length);
      worldPop('SQUAD FULL +' + fmt(250 * (1 + squad.length)), b.x, b.y - 70, '#ffd84a', 26);
    }
    run.rescued++; save.stats.rescued++;
    run.maxSquad = Math.max(run.maxSquad, squad.length);
    Sound.sfx('rescue'); buzz(20);
    burst(b.x, b.y - 20, '#ff8fc8', 10, 380, 9, 'heart');
    if (squad.length === 5) screenPop('GUB SQUAD x6!', '#ffd84a', 44);
  }

  function collectPower(pw, px) {
    pw.taken = true;
    const p = player;
    run.powerups = (run.powerups || 0) + 1; save.stats.powerups++;
    Sound.sfx('power'); buzz(30);
    burst(pw.x, pw.y, '#ffffff', 16, 500, 9, 'star');
    const names = { magnet: 'COIN MAGNET!', shield: 'BUBBLE SHIELD!', double: 'DOUBLE COINS!', mega: 'MEGA GUB!' };
    screenPop(names[pw.type], '#ffd84a', 46);
    if (pw.type === 'magnet') p.magnetT = 9;
    else if (pw.type === 'shield') p.shield = true;
    else if (pw.type === 'double') p.doubleT = 10;
    else if (pw.type === 'mega') { p.megaT = 6; shake(0.3, 10); }
  }

  // ---------- update ----------
  function update(dt) {
    time += dt;
    updateAmbient(dt);
    if (shakeT > 0) shakeT -= dt;
    if (state === 'menu') { updateMenu(dt); updateParts(dt); return; }
    if (state === 'paused' || state === 'over') return;
    if (freezeT > 0) { freezeT -= dt; return; }
    if (state === 'dying') {
      dieT += dt;
      camX += speed * 0.15 * dt;
      updateParts(dt); updatePops(dt);
      if (dieT > 1.2) finishRun();
      return;
    }
    updatePlay(dt);
    if (state === 'play' || state === 'dying') { updateParts(dt); updatePops(dt); }
  }

  function updateMenu(dt) {
    camX += 300 * dt;
    const p = player;
    p.hopT -= dt;
    if (p.onGround && p.hopT <= 0) { p.vy = -rnd(750, 1150); p.onGround = false; p.hopT = rnd(0.5, 1.6); p.sq = 0.3; if (Math.random() < 0.3) p.spin = 1; }
    p.vy += GRAV * dt; p.y += p.vy * dt;
    if (p.y >= GY) { if (!p.onGround) p.sq = -0.25; p.y = GY; p.vy = 0; p.onGround = true; }
    springs(p, dt);
    hist.push({ t: time, y: p.y });
    while (hist.length && hist[0].t < time - 1.5) hist.shift();
  }

  function springs(p, dt) {
    p.sqv += (-p.sq * 260 - p.sqv * 14) * dt;
    p.sq += p.sqv * dt;
    p.blinkT -= dt;
    if (p.blinkT < -0.12) p.blinkT = rnd(1.5, 4);
    if (p.spin > 0) { p.spin -= dt / 0.4; if (p.spin < 0) p.spin = 0; }
  }

  function surfaceUnder(px, prevB, newB, half) {
    let best = null;
    for (const o of obs) {
      if (o.dead || o.type !== 'wall') continue;
      if (px + half > o.x + 4 && px - half < o.x + o.w - 4 && prevB <= o.y + 2 && newB >= o.y) {
        if (best === null || o.y < best) best = o.y;
      }
    }
    for (const pl of plats) {
      if (px + half > pl.x && px - half < pl.x + pl.w && prevB <= pl.y + 2 && newB >= pl.y) {
        if (best === null || pl.y < best) best = pl.y;
      }
    }
    if (newB >= GY && prevB <= GY + 6 && overGround(px - half * 0.6, px + half * 0.6)) {
      if (best === null || GY < best) best = GY;
    }
    return best;
  }

  function hitbox(o) {
    switch (o.type) {
      case 'spike': return { x: o.x + 10, y: o.y + 12, w: o.w - 20, h: o.h - 12 };
      case 'saw': return { x: o.x + 9, y: o.y + 9, w: o.w - 18, h: o.h - 18 };
      case 'grump': return { x: o.x + 6, y: o.y + 6, w: o.w - 12, h: o.h - 12 };
      case 'crate': return { x: o.x + 2, y: o.y + 2, w: o.w - 4, h: o.h - 4 };
      default: return o;
    }
  }

  function updatePlay(dt) {
    const p = player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.ouchT = Math.max(0, p.ouchT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    p.doubleT = Math.max(0, p.doubleT - dt);
    if (p.megaT > 0) { p.megaT -= dt; if (p.megaT <= 0) { p.megaT = 0; p.invuln = Math.max(p.invuln, 1); } }
    p.scale = lerp(p.scale, p.megaT > 0 ? 1.7 : 1, Math.min(1, dt * 8));
    p.energy = Math.min(100, p.energy + 7 * dt);
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.slideT = Math.max(0, p.slideT - dt);
    if (downHeld && p.onGround) p.slideT = Math.max(p.slideT, 0.08);
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (coinStreakT > 0) { coinStreakT -= dt; if (coinStreakT <= 0) coinStreak = 0; }

    // speed & camera
    speed = 460 + 560 * (1 - Math.exp(-meters / 2200));
    Sound.setIntensity(clamp((speed - 460) / 560, 0, 1));
    const v = speed * (p.dashT > 0 ? 2.3 : 1) * (p.megaT > 0 ? 1.25 : 1);
    const dx = v * dt;
    camX += dx;
    const dm = dx / METER;
    meters += dm;
    score += dm * (1 + squad.length);
    run.score = Math.floor(score); run.meters = Math.floor(meters);
    ensureGen();
    const px = camX + PX();

    if (autopilot) autoPlay(px, dt);

    // jumping
    if (p.jumpBuf > 0) {
      if (p.onGround || p.coyote > 0) doJump(1);
      else if (p.jumps < 2) doJump(2);
    }

    // vertical motion
    const prevY = p.y;
    p.prevY = prevY;
    if (p.dashT > 0) {
      p.dashT -= dt; p.vy = 0;
      if (p.dashT <= 0) p.invuln = Math.max(p.invuln, 0.25);
      p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostT = 0.03; p.ghosts.push({ x: px, y: p.y, life: 1 }); }
    } else {
      let g = GRAV;
      if (p.vy < 0 && p.holding && p.holdT < 0.3) g *= 0.42;
      else if (p.vy > 0) g *= 1.12;
      p.holdT += dt;
      p.vy += g * dt;
      if (p.slam) p.vy = Math.max(p.vy, 2200);
      if (p.vy > 2400) p.vy = 2400;
      p.y += p.vy * dt;
    }
    for (const gh of p.ghosts) gh.life -= dt * 4;
    p.ghosts = p.ghosts.filter(gh => gh.life > 0);

    // landing
    let landed = false;
    if (p.vy >= 0) {
      const top = surfaceUnder(px, prevY, p.y, 18 * p.scale);
      if (top !== null) {
        const impact = p.vy;
        p.y = top;
        if (!p.onGround) {
          if (p.slam) slamImpact(px);
          else if (impact > 900) { p.sq = -0.28; dust(px, top, 6); }
          else p.sq = -0.15;
          if (p.megaT > 0) shake(0.15, 7);
        }
        p.vy = 0; p.onGround = true; p.jumps = 0; p.coyote = 0.1; p.slam = false; p.spin = 0;
        landed = true;
      }
    }
    if (!landed) { p.onGround = false; p.coyote = Math.max(0, p.coyote - dt); }

    if (p.y > GY + 90) { pitFall(); if (state !== 'play') return; }

    // obstacle collisions
    const sliding = p.slideT > 0 && p.onGround;
    const pw = 40 * p.scale, ph = (sliding ? 26 : 48) * p.scale;
    const hx = px - pw / 2 + 6, hy = p.y - ph + 6, hw = pw - 12, hh = ph - 8;
    const falling = p.vy > 0 || landed;
    for (const o of obs) {
      if (o.dead || o.x > px + 300 || o.x + o.w < px - 200) continue;
      const b = hitbox(o);
      if (!(hx < b.x + b.w && hx + hw > b.x && hy < b.y + b.h && hy + hh > b.y)) continue;
      const breakable = o.type === 'crate' || o.type === 'grump';
      if (p.megaT > 0) { smash(o, 'mega'); continue; }
      if (p.dashT > 0) { if (breakable) smash(o, 'dash'); continue; }
      if (breakable && falling && prevY <= o.y + 18) { stomp(o); continue; }
      hurt();
      if (state !== 'play') return;
    }

    // coins
    const pcy = p.y - ph / 2, cr = 30 * p.scale + 16;
    for (const c of coins) {
      if (c.taken) continue;
      let ddx = c.x - px, ddy = c.y - pcy;
      if (p.magnetT > 0 && ddx < 420 && ddx > -120 && Math.abs(ddy) < 420) c.mag = true;
      if (c.mag) {
        const k = Math.min(1, dt * 11);
        c.x += (px - c.x) * k; c.y += (pcy - c.y) * k;
        ddx = c.x - px; ddy = c.y - pcy;
      }
      if (ddx * ddx + ddy * ddy < cr * cr) {
        c.taken = true;
        const val = p.doubleT > 0 ? 2 : 1;
        run.coins += val; p.energy = Math.min(100, p.energy + 3);
        coinStreak++; coinStreakT = 0.45;
        Sound.sfx('coin', coinStreak);
        addPart({ x: c.x, y: c.y, vx: 0, vy: -60, life: 0.3, max: 0.3, size: 22, color: '#fff6b0', g: 0, shape: 'ring' });
      }
    }

    // babies & powerups
    for (const b of babies) {
      if (!b.taken && Math.abs(b.x - px) < 40 * p.scale && Math.abs((b.y - 18) - pcy) < 52 * p.scale) rescue(b, px);
    }
    for (const pwr of powers) {
      if (!pwr.taken && Math.abs(pwr.x - px) < 52 * p.scale && Math.abs(pwr.y + Math.sin(time * 3 + pwr.ph) * 10 - pcy) < 60 * p.scale) collectPower(pwr, px);
    }

    // move hazards
    for (const o of obs) {
      if (o.type === 'grump') { o.x += o.vx * dt; o.y = o.baseY + Math.sin(time * 3 + o.t) * o.amp; }
      else if (o.type === 'saw') { o.rot += dt * 9; if (o.amp) o.cy = o.baseCy + Math.sin(time * 2.4 + o.t) * o.amp; o.y = o.cy - o.r; }
    }

    // cleanup
    const left = camX - 300;
    obs = obs.filter(o => !o.dead && o.x + o.w > left);
    coins = coins.filter(c => !c.taken && c.x > left);
    babies = babies.filter(b => !b.taken && b.x > left);
    powers = powers.filter(q => !q.taken && q.x > left);
    plats = plats.filter(q => q.x + q.w > left);
    while (segs.length > 1 && segs[0].x1 < camX - 600) segs.shift();

    // feel
    springs(p, dt);
    hist.push({ t: time, y: p.y });
    while (hist.length && hist[0].t < time - 1.5) hist.shift();
    if (skin().sparkle && Math.random() < dt * 14) {
      addPart({ x: px + rnd(-26, 26), y: p.y - rnd(0, 50), vx: rnd(-30, 30), vy: -rnd(20, 80), life: 0.6, max: 0.6, size: 7, color: '#fff6b0', g: 0, shape: 'star', rot: 0 });
    }
    if (p.megaT > 0 && Math.random() < dt * 30) {
      addPart({ x: px - 30, y: p.y - rnd(10, 80), vx: -rnd(200, 400), vy: rnd(-40, 40), life: 0.4, max: 0.4, size: 8, color: '#7dff9a', g: 0, shape: 'star', rot: 0 });
    }

    // biome banner
    const bi = Math.floor(meters / BIOME_LEN);
    if (bi !== lastBiome) {
      lastBiome = bi;
      banner = { text: BIOMES[bi % BIOMES.length].name, sub: 'ZONE ' + (bi + 1), t: 0 };
      Sound.sfx('mission');
    }
    if (banner) { banner.t += dt; if (banner.t > 2.4) banner = null; }

    // tutorial hints
    for (const th of tutHints) {
      if (!th.shown && th.x - px < lw * 0.6) { th.shown = true; hint = { text: th.text, t: 0 }; }
    }
    if (hint) { hint.t += dt; if (hint.t > 3.2) hint = null; }

    missionT -= dt;
    if (missionT <= 0) { missionT = 0.5; checkMissions(); }
  }

  function updateParts(dt) {
    for (const q of parts) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.life -= dt;
      if (q.shape === 'gub' || q.shape === 'square' || q.shape === 'star') q.rot += dt * 8;
    }
    parts = parts.filter(q => q.life > 0);
  }
  function updatePops(dt) {
    for (const q of pops) { q.t += dt; if (!q.screen) q.y -= 60 * dt; }
    pops = pops.filter(q => q.t < q.dur);
  }

  // ---------- ambient particles (screen space) ----------
  const amb = [];
  for (let i = 0; i < 46; i++) amb.push({ x: Math.random() * 2000, y: Math.random() * H, s: rnd(0.6, 1.4), ph: Math.random() * 6 });
  function updateAmbient(dt) {
    const type = P.amb || 'petal';
    for (const a of amb) {
      if (type === 'petal') { a.x -= (60 + 40 * a.s) * dt; a.y += 40 * a.s * dt; }
      else if (type === 'sand') { a.x -= 420 * a.s * dt; a.y += Math.sin(time * 2 + a.ph) * 20 * dt; }
      else if (type === 'snow') { a.x -= 50 * dt; a.y += 70 * a.s * dt; a.x += Math.sin(time * 1.5 + a.ph) * 30 * dt; }
      else if (type === 'ember') { a.x -= 40 * dt; a.y -= 70 * a.s * dt; }
      if (a.x < -20) a.x += lw + 40;
      if (a.y > H + 10) a.y -= H + 20;
      if (a.y < -10) a.y += H + 20;
    }
  }

  // ---------- autopilot (debug / attract testing) ----------
  function autoPlay(px, dt) {
    const p = player;
    autoHoldT -= dt; autoDownT -= dt;
    if (autoHoldT <= 0 && p.holding) p.holding = false;
    let threat = null, td = 1e9;
    for (const o of obs) {
      if (o.dead) continue;
      const d = o.x - (px + 20);
      if (d > -10 && d < speed * 0.32 && d < td) { td = d; threat = o; }
    }
    if (threat) {
      if (threat.type === 'grump' && threat.baseY > GY - 120) { if (td < speed * 0.22) autoDownT = 0.25; }
      else if (threat.type === 'grump') { /* high grump: stay low */ }
      else if ((threat.type === 'crate' || threat.type === 'saw') && p.energy >= DASH_COST && td < speed * 0.14) doDash();
      else if (p.onGround && td < speed * 0.2) { pressJump(); autoHoldT = threat.type === 'wall' ? 0.25 : 0.12; }
    }
    const ahead = px + speed * 0.12;
    if (p.onGround && !overGround(ahead, ahead + 30)) { pressJump(); autoHoldT = 0.3; }
    if (!p.onGround && p.vy > 200 && !overGround(px - 10, px + 60) && p.jumps < 2) { pressJump(); autoHoldT = 0.3; }
    downHeld = autoDownT > 0;
    if (downHeld && p.onGround) p.slideT = Math.max(p.slideT, 0.1);
  }

  // =====================================================================
  //                              DRAWING
  // =====================================================================
  function drawGubby(c, x, y, size, o) {
    const w = size * (o.sx || 1), h = size * 0.92 * (o.sy || 1);
    c.save();
    c.translate(x, y);
    if (o.rot) { c.translate(0, -h * 0.45); c.rotate(o.rot); c.translate(0, h * 0.45); }
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    const lwid = Math.max(2, size * 0.075);
    const body = () => {
      c.beginPath();
      c.moveTo(-w * 0.5, -h * 0.22);
      c.bezierCurveTo(-w * 0.52, -h * 1.12, w * 0.52, -h * 1.12, w * 0.5, -h * 0.22);
      c.bezierCurveTo(w * 0.5, -h * 0.02, w * 0.36, 0, w * 0.2, 0);
      c.lineTo(-w * 0.2, 0);
      c.bezierCurveTo(-w * 0.36, 0, -w * 0.5, -h * 0.02, -w * 0.5, -h * 0.22);
      c.closePath();
    };
    if (o.acc === 'halo') {
      c.strokeStyle = '#ffe66b'; c.lineWidth = size * 0.07;
      c.beginPath(); c.ellipse(0, -h * 1.02, w * 0.3, h * 0.08, 0, 0, Math.PI * 2); c.stroke();
    }
    body();
    c.fillStyle = o.body; c.fill();
    c.save(); body(); c.clip();
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.beginPath(); c.ellipse(w * 0.1, h * 0.05, w * 0.62, h * 0.3, 0, 0, Math.PI * 2); c.fill();
    if (o.acc === 'headband') {
      c.fillStyle = '#ff3b3b'; c.fillRect(-w, -h * 0.82, w * 2, h * 0.13);
    }
    c.restore();
    c.lineWidth = lwid; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round';
    body(); c.stroke();
    if (o.acc === 'headband') {
      c.strokeStyle = '#ff3b3b'; c.lineWidth = size * 0.07;
      const wv = Math.sin(time * 14) * size * 0.06;
      c.beginPath(); c.moveTo(-w * 0.45, -h * 0.76); c.quadraticCurveTo(-w * 0.7, -h * 0.7 + wv, -w * 0.85, -h * 0.55 - wv); c.stroke();
    }
    // shine
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(-w * 0.22, -h * 0.72, w * 0.1, h * 0.065, -0.6, 0, Math.PI * 2); c.fill();

    // eyes
    const ex = w * 0.17, ey = -h * 0.55, er = size * 0.135, fwd = w * 0.06;
    const lx = clamp(o.lookX == null ? 0.4 : o.lookX, -1, 1) * er * 0.42, ly = clamp(o.lookY || 0, -1, 1) * er * 0.42;
    c.strokeStyle = INK;
    for (const s of [-1, 1]) {
      const cx = s * ex + fwd;
      if (o.blink) {
        c.lineWidth = lwid * 0.9;
        c.beginPath(); c.moveTo(cx - er * 0.8, ey); c.quadraticCurveTo(cx, ey + er * 0.55, cx + er * 0.8, ey); c.stroke();
        continue;
      }
      c.beginPath(); c.ellipse(cx, ey, er * 0.85, er, 0, 0, Math.PI * 2);
      c.fillStyle = '#fff'; c.fill(); c.lineWidth = lwid * 0.7; c.stroke();
      if (o.mouth === 'ouch') {
        c.lineWidth = lwid * 0.8; c.beginPath();
        c.moveTo(cx - er * 0.4, ey - er * 0.4); c.lineTo(cx + er * 0.4, ey + er * 0.4);
        c.moveTo(cx + er * 0.4, ey - er * 0.4); c.lineTo(cx - er * 0.4, ey + er * 0.4); c.stroke();
      } else {
        c.fillStyle = INK; c.beginPath(); c.arc(cx + lx, ey + ly, er * 0.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + lx + er * 0.18, ey + ly - er * 0.2, er * 0.17, 0, Math.PI * 2); c.fill();
      }
    }
    if (o.acc === 'visor') {
      rr(c, -w * 0.32 + fwd, ey - er * 0.7, w * 0.64, er * 1.4, er * 0.6);
      c.fillStyle = 'rgba(70,235,255,0.72)'; c.fill(); c.lineWidth = lwid * 0.8; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-w * 0.2 + fwd, ey - er * 0.45, w * 0.12, er * 0.25);
    }
    // cheeks
    c.fillStyle = 'rgba(255,90,140,0.4)';
    c.beginPath(); c.ellipse(-w * 0.27 + fwd, -h * 0.37, w * 0.075, h * 0.045, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(w * 0.33 + fwd * 0.3, -h * 0.37, w * 0.075, h * 0.045, 0, 0, Math.PI * 2); c.fill();
    // mouth
    const mx = fwd + w * 0.03, my = -h * 0.33;
    c.lineWidth = lwid * 0.85;
    const m = o.mouth || 'smile';
    if (m === 'smile') { c.beginPath(); c.arc(mx, my - size * 0.04, size * 0.085, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    else if (m === 'open' || m === 'grin') {
      c.beginPath();
      if (m === 'grin') c.arc(mx, my - size * 0.03, size * 0.1, 0, Math.PI);
      else c.ellipse(mx, my, size * 0.07, size * 0.065, 0, 0, Math.PI * 2);
      c.closePath(); c.fillStyle = INK; c.fill();
      c.fillStyle = '#ff6f91'; c.beginPath(); c.ellipse(mx, my + size * 0.03, size * 0.04, size * 0.025, 0, 0, Math.PI * 2); c.fill();
    }
    else if (m === 'o') { c.fillStyle = INK; c.beginPath(); c.arc(mx, my, size * 0.04, 0, Math.PI * 2); c.fill(); }
    else if (m === 'ouch') {
      c.beginPath(); c.moveTo(mx - size * 0.09, my); c.lineTo(mx - size * 0.03, my - size * 0.03);
      c.lineTo(mx + size * 0.03, my); c.lineTo(mx + size * 0.09, my - size * 0.03); c.stroke();
    }

    // accessories
    c.lineWidth = lwid * 0.8;
    const top = -h * 0.86;
    switch (o.acc) {
      case 'bow': {
        c.fillStyle = '#ff4f8b';
        const bx = w * 0.2, by = top + h * 0.02;
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - w * 0.2, by - h * 0.14); c.lineTo(bx - w * 0.2, by + h * 0.12); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + w * 0.2, by - h * 0.14); c.lineTo(bx + w * 0.2, by + h * 0.12); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.arc(bx, by, w * 0.05, 0, Math.PI * 2); c.fill(); c.stroke();
        break;
      }
      case 'cap': {
        c.fillStyle = '#ff4f4f';
        c.beginPath(); c.ellipse(0, top + h * 0.1, w * 0.36, h * 0.2, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(w * 0.32, top + h * 0.1, w * 0.22, h * 0.045, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, top - h * 0.03, w * 0.07, 0, Math.PI * 2); c.fill();
        break;
      }
      case 'flower': {
        const fx = -w * 0.15, fy = top + h * 0.02;
        c.fillStyle = '#fff';
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2 + time;
          c.beginPath(); c.arc(fx + Math.cos(a) * w * 0.09, fy + Math.sin(a) * w * 0.09, w * 0.07, 0, Math.PI * 2); c.fill(); c.stroke();
        }
        c.fillStyle = '#ff8a4a'; c.beginPath(); c.arc(fx, fy, w * 0.065, 0, Math.PI * 2); c.fill(); c.stroke();
        break;
      }
      case 'antenna': {
        c.beginPath(); c.moveTo(0, top + h * 0.02); c.quadraticCurveTo(w * 0.05, top - h * 0.2, w * 0.12 + Math.sin(time * 6) * w * 0.04, top - h * 0.3); c.stroke();
        c.fillStyle = '#ffe14a'; c.beginPath(); c.arc(w * 0.12 + Math.sin(time * 6) * w * 0.04, top - h * 0.3, w * 0.08, 0, Math.PI * 2); c.fill(); c.stroke();
        break;
      }
      case 'crown': {
        c.fillStyle = '#ffd23f';
        const cw = w * 0.5, cb = top + h * 0.06;
        c.beginPath();
        c.moveTo(-cw / 2, cb); c.lineTo(-cw / 2, cb - h * 0.2); c.lineTo(-cw / 4, cb - h * 0.08); c.lineTo(0, cb - h * 0.25);
        c.lineTo(cw / 4, cb - h * 0.08); c.lineTo(cw / 2, cb - h * 0.2); c.lineTo(cw / 2, cb); c.closePath();
        c.fill(); c.stroke();
        c.fillStyle = '#ff4f8b'; c.beginPath(); c.arc(0, cb - h * 0.06, w * 0.04, 0, Math.PI * 2); c.fill();
        break;
      }
    }
    c.restore();
  }

  function drawCoin(c, x, y, r, ph) {
    const k = Math.max(0.18, Math.abs(Math.cos(ph)));
    c.lineWidth = 3; c.strokeStyle = INK;
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.ellipse(x, y, r * k, r, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#f2a900';
    c.beginPath(); c.ellipse(x, y, r * k * 0.55, r * 0.55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.ellipse(x - r * k * 0.35, y - r * 0.4, r * k * 0.18, r * 0.18, 0, 0, Math.PI * 2); c.fill();
  }

  function bolt(c, x, y, s) {
    c.beginPath();
    c.moveTo(x + 0.12 * s, y - 0.5 * s); c.lineTo(x - 0.3 * s, y + 0.08 * s); c.lineTo(x - 0.02 * s, y + 0.08 * s);
    c.lineTo(x - 0.12 * s, y + 0.5 * s); c.lineTo(x + 0.3 * s, y - 0.1 * s); c.lineTo(x + 0.02 * s, y - 0.1 * s);
    c.closePath();
  }

  function drawPowerIcon(c, type, x, y, r) {
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK;
    if (type === 'magnet') {
      c.lineWidth = r * 0.44; c.beginPath(); c.arc(x, y - r * 0.05, r * 0.4, Math.PI, 0, true);
      c.lineTo(x + r * 0.4, y - r * 0.5); c.moveTo(x - r * 0.4, y - r * 0.05); c.lineTo(x - r * 0.4, y - r * 0.5); c.stroke();
      c.lineWidth = r * 0.26; c.strokeStyle = '#ff4a5a'; c.beginPath(); c.arc(x, y - r * 0.05, r * 0.4, Math.PI, 0, true); c.stroke();
      c.strokeStyle = '#e8ecf5'; c.beginPath(); c.moveTo(x - r * 0.4, y - r * 0.3); c.lineTo(x - r * 0.4, y - r * 0.5); c.moveTo(x + r * 0.4, y - r * 0.3); c.lineTo(x + r * 0.4, y - r * 0.5); c.stroke();
    } else if (type === 'shield') {
      c.beginPath(); c.moveTo(x, y - r * 0.6); c.lineTo(x + r * 0.5, y - r * 0.38); c.quadraticCurveTo(x + r * 0.48, y + r * 0.3, x, y + r * 0.6);
      c.quadraticCurveTo(x - r * 0.48, y + r * 0.3, x - r * 0.5, y - r * 0.38); c.closePath();
      c.fillStyle = '#5cc4ff'; c.fill(); c.lineWidth = r * 0.12; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(x - r * 0.15, y - r * 0.2, r * 0.1, r * 0.2, 0.3, 0, Math.PI * 2); c.fill();
    } else if (type === 'double') {
      c.font = '900 ' + Math.round(r * 0.9) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = r * 0.2; c.strokeText('x2', x, y + r * 0.04); c.fillStyle = '#ffd23f'; c.fillText('x2', x, y + r * 0.04);
    } else {
      c.beginPath(); c.moveTo(x, y - r * 0.62); c.lineTo(x + r * 0.5, y); c.lineTo(x + r * 0.2, y); c.lineTo(x + r * 0.2, y + r * 0.55);
      c.lineTo(x - r * 0.2, y + r * 0.55); c.lineTo(x - r * 0.2, y); c.lineTo(x - r * 0.5, y); c.closePath();
      c.fillStyle = '#5ee07a'; c.fill(); c.lineWidth = r * 0.12; c.stroke();
    }
  }

  function oText(txt, x, y, size, fill, align, alpha) {
    ctx.font = '900 ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(4, size * 0.22); ctx.strokeStyle = INK; ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill; ctx.fillText(txt, x, y);
    ctx.globalAlpha = 1;
  }

  // ---------- background ----------
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, P.skyT); g.addColorStop(1, P.skyB);
    ctx.fillStyle = g; ctx.fillRect(-40, -40, lw + 80, GY + 60);
    if (P.night > 0) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) {
        const x = hash(i * 7 + 1) * lw, y = hash(i * 13 + 5) * GY * 0.75;
        ctx.globalAlpha = P.night * (0.35 + 0.65 * Math.abs(Math.sin(time * 1.7 + i)));
        const s = 1.5 + hash(i * 3) * 2.5; ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
    }
    const sx = lw * 0.74, sy = 175;
    const glow = ctx.createRadialGradient(sx, sy, 40, sx, sy, 170);
    glow.addColorStop(0, 'rgba(255,255,255,0.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(sx - 180, sy - 180, 360, 360);
    ctx.fillStyle = P.sun; ctx.beginPath(); ctx.arc(sx, sy, 66, 0, Math.PI * 2); ctx.fill();
    if (P.idx === 2 || P.idx === 4) {
      ctx.fillStyle = P.skyB;
      for (let i = 0; i < 5; i++) ctx.fillRect(sx - 70, sy + 8 + i * 12, 140, 3 + i);
    }
    if (P.night < 1) {
      ctx.globalAlpha = (1 - P.night) * 0.92; ctx.fillStyle = '#fff';
      const span = lw + 600;
      for (let i = 0; i < 6; i++) {
        const x = (((hash(i + 50) * span - camX * 0.05 - time * 10) % span) + span) % span - 300;
        const y = 70 + hash(i + 90) * 200, s = 40 + hash(i + 3) * 45;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.55, 0, 7); ctx.arc(x + s * 0.6, y - s * 0.3, s * 0.65, 0, 7);
        ctx.arc(x + s * 1.3, y, s * 0.5, 0, 7); ctx.rect(x, y - 2, s * 1.3, s * 0.5);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function farY(wx) { return GY - 150 - 70 * Math.sin(wx * 0.004) - 40 * Math.sin(wx * 0.011 + 1.3) - 20 * Math.sin(wx * 0.023); }
  function midY(wx) { return GY - 55 - 35 * Math.sin(wx * 0.008) - 20 * Math.sin(wx * 0.017 + 2); }

  function drawHills() {
    let off = camX * 0.12;
    ctx.fillStyle = P.far; ctx.beginPath(); ctx.moveTo(-20, GY);
    for (let x = -20; x <= lw + 40; x += 30) ctx.lineTo(x, farY(x + off));
    ctx.lineTo(lw + 40, GY); ctx.closePath(); ctx.fill();
    if (P.idx === 3) {
      // snow caps: whiten only the parts of the far range above the snow line
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(-20, 0, lw + 60, GY - 215);
      ctx.restore();
    }
    off = camX * 0.35;
    const span = 260, start = Math.floor(off / span) - 1;
    for (let k = start; k < start + lw / span + 3; k++) {
      if (hash(k * 3 + 11) < 0.4) continue;
      const wx = k * span + hash(k) * 120, x = wx - off;
      drawDeco(P.idx, x, midY(wx) + 8, 0.7 + hash(k * 5) * 0.6, k);
    }
    ctx.fillStyle = P.mid; ctx.beginPath(); ctx.moveTo(-20, GY);
    for (let x = -20; x <= lw + 40; x += 24) ctx.lineTo(x, midY(x + off));
    ctx.lineTo(lw + 40, GY); ctx.closePath(); ctx.fill();
  }

  function drawDeco(idx, x, y, s, k) {
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(43,22,64,0.5)';
    if (idx === 0) {
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 3 * s, y - 80 * s, 6 * s, 80 * s);
      ctx.fillStyle = pick2(k, ['#ff8fc8', '#ffd84a', '#b07cff', '#7cf2e6']);
      ctx.beginPath(); ctx.arc(x, y - 92 * s, 26 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.arc(x, y - 92 * s, 14 * s, 0, Math.PI * 1.5); ctx.stroke();
    } else if (idx === 1) {
      ctx.fillStyle = '#4fae5a';
      rr(ctx, x - 12 * s, y - 90 * s, 24 * s, 90 * s, 12 * s); ctx.fill(); ctx.stroke();
      rr(ctx, x - 34 * s, y - 64 * s, 14 * s, 34 * s, 7 * s); ctx.fill(); ctx.stroke();
      rr(ctx, x + 20 * s, y - 74 * s, 14 * s, 30 * s, 7 * s); ctx.fill(); ctx.stroke();
    } else if (idx === 2) {
      const bw = 60 * s, bh = (90 + hash(k * 9) * 110) * s;
      ctx.fillStyle = '#1a0d40'; ctx.fillRect(x - bw / 2, y - bh, bw, bh);
      ctx.strokeStyle = pick2(k, ['#2ef2ff', '#ff5fd2', '#ffd84a']); ctx.lineWidth = 2;
      ctx.strokeRect(x - bw / 2, y - bh, bw, bh);
      ctx.fillStyle = ctx.strokeStyle;
      for (let r = 0; r < bh / (22 * s) - 1; r++) for (let cI = 0; cI < 3; cI++) {
        if (hash(k * 31 + r * 7 + cI) < 0.45) ctx.fillRect(x - bw / 2 + 8 * s + cI * 17 * s, y - bh + 10 * s + r * 22 * s, 8 * s, 8 * s);
      }
    } else if (idx === 3) {
      ctx.fillStyle = '#3f7d8c';
      for (let i = 0; i < 3; i++) {
        const ty = y - 30 * s - i * 32 * s, tw = (44 - i * 10) * s;
        ctx.beginPath(); ctx.moveTo(x - tw, ty + 10 * s); ctx.lineTo(x, ty - 40 * s); ctx.lineTo(x + tw, ty + 10 * s); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 112 * s); ctx.lineTo(x, y - 136 * s); ctx.lineTo(x + 12 * s, y - 112 * s); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#1d0a08';
      ctx.beginPath(); ctx.moveTo(x - 40 * s, y); ctx.lineTo(x - 12 * s, y - 100 * s); ctx.lineTo(x + 8 * s, y - 60 * s); ctx.lineTo(x + 40 * s, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff7a2e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 90 * s); ctx.lineTo(x - 6 * s, y - 50 * s); ctx.lineTo(x - 14 * s, y - 20 * s); ctx.stroke();
    }
  }
  const pick2 = (k, a) => a[Math.floor(hash(k * 17 + 3) * a.length)];

  function drawGround() {
    ctx.fillStyle = '#1a0d26';
    ctx.fillRect(camX - 60, GY - 2, lw + 120, H - GY + 60);
    for (const s of segs) {
      const x0 = Math.max(s.x0, camX - 60), x1 = Math.min(s.x1, camX + lw + 60);
      if (x1 <= x0) continue;
      ctx.fillStyle = P.dirt; ctx.fillRect(x0, GY, x1 - x0, H - GY + 40);
      ctx.fillStyle = P.dirtDot;
      for (let k = Math.floor(x0 / 70); k * 70 < x1; k++) {
        const ddx = k * 70 + hash(k) * 40;
        if (ddx < x0 + 10 || ddx > x1 - 10) continue;
        ctx.beginPath(); ctx.arc(ddx, GY + 42 + hash(k * 7) * 70, 4 + hash(k * 3) * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = P.grass; ctx.fillRect(x0, GY - 4, x1 - x0, 16);
      for (let k = Math.floor(x0 / 28); k * 28 < x1; k++) {
        const bx = k * 28 + 14;
        if (bx < x0 + 8 || bx > x1 - 8) continue;
        ctx.beginPath(); ctx.arc(bx, GY + 11, 11, 0, Math.PI); ctx.fill();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(x0, GY - 4); ctx.lineTo(x1, GY - 4);
      if (s.x0 > camX - 60) { ctx.moveTo(s.x0, GY - 4); ctx.lineTo(s.x0, H + 30); }
      if (s.x1 < camX + lw + 60) { ctx.moveTo(s.x1, GY - 4); ctx.lineTo(s.x1, H + 30); }
      ctx.stroke();
    }
  }

  function drawPlat(pl) {
    rr(ctx, pl.x, pl.y - 4, pl.w, 30, 12);
    ctx.fillStyle = P.dirt; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    rr(ctx, pl.x, pl.y - 4, pl.w, 13, 6);
    ctx.fillStyle = P.grass; ctx.fill(); ctx.stroke();
  }

  function drawObs(o) {
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    if (o.type === 'spike') {
      ctx.fillStyle = '#e6e9f2';
      ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w / 2, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a9afc4';
      ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x + o.w / 2, o.y + o.h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w / 2, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.stroke();
    } else if (o.type === 'wall') {
      ctx.fillStyle = '#9aa3b8'; ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = 'rgba(43,22,64,0.35)'; ctx.lineWidth = 3;
      for (let r = 0, yy = o.y + 26; yy < o.y + o.h; yy += 26, r++) {
        ctx.beginPath(); ctx.moveTo(o.x, yy); ctx.lineTo(o.x + o.w, yy);
        const bx = o.x + (r % 2 ? o.w * 0.33 : o.w * 0.66); ctx.moveTo(bx, yy); ctx.lineTo(bx, yy + 26 > o.y + o.h ? o.y + o.h : yy + 26);
        ctx.stroke();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(o.x, o.y, o.w, o.h);
      rr(ctx, o.x - 6, o.y - 10, o.w + 12, 16, 6); ctx.fillStyle = '#c3cadb'; ctx.fill(); ctx.stroke();
    } else if (o.type === 'crate') {
      ctx.fillStyle = '#e39d52'; ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#a8632b'; ctx.lineWidth = 5;
      ctx.strokeRect(o.x + 7, o.y + 7, o.w - 14, o.h - 14);
      ctx.beginPath(); ctx.moveTo(o.x + 9, o.y + 9); ctx.lineTo(o.x + o.w - 9, o.y + o.h - 9); ctx.moveTo(o.x + o.w - 9, o.y + 9); ctx.lineTo(o.x + 9, o.y + o.h - 9); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 5);
    } else if (o.type === 'grump') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2, flap = Math.sin(time * 20 + o.t);
      ctx.fillStyle = '#5a2a6e';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(cx + s * 14, cy - 4);
        ctx.lineTo(cx + s * 46, cy - 14 - flap * 16); ctx.lineTo(cx + s * 36, cy + 2); ctx.lineTo(cx + s * 44, cy + 8 - flap * 6); ctx.lineTo(cx + s * 14, cy + 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#e8455f';
      ctx.beginPath(); ctx.ellipse(cx, cy, 26, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c42f4a';
      ctx.beginPath(); ctx.moveTo(cx - 14, cy - 18); ctx.lineTo(cx - 8, cy - 30); ctx.lineTo(cx - 2, cy - 21); ctx.lineTo(cx + 5, cy - 32); ctx.lineTo(cx + 10, cy - 19); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + s * 9 - 3, cy - 4, 7, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx + s * 9 - 6, cy - 3, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + s * 3 - 3, cy - 10); ctx.lineTo(cx + s * 16 - 3, cy - 15); ctx.stroke();
      }
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx - 3, cy + 12, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (o.type === 'saw') {
      const cx = o.x + o.r, cy = o.cy, r = o.r;
      if (o.amp) {
        ctx.strokeStyle = 'rgba(43,22,64,0.35)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx, o.baseCy - o.amp - r); ctx.lineTo(cx, o.baseCy + o.amp + r); ctx.stroke();
      }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot);
      ctx.fillStyle = '#d4d9e6'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, rad = i % 2 ? r * 0.8 : r;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a92a8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawWorld() {
    const px = camX + PX();
    ctx.save();
    ctx.translate(-camX, 0);
    drawGround();
    for (const pl of plats) if (pl.x < camX + lw + 50 && pl.x + pl.w > camX - 50) drawPlat(pl);
    for (const c of coins) if (c.x > camX - 40 && c.x < camX + lw + 40) drawCoin(ctx, c.x, c.y, 14, time * 5 + c.t);
    for (const pwr of powers) {
      if (pwr.x < camX - 60 || pwr.x > camX + lw + 60) continue;
      const y = pwr.y + Math.sin(time * 3 + pwr.ph) * 10, r = 30 + Math.sin(time * 6) * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pwr.x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      drawPowerIcon(ctx, pwr.type, pwr.x, y, r);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(pwr.x - r * 0.45, y - r * 0.45, 6, 4, -0.7, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of babies) {
      if (b.x < camX - 60 || b.x > camX + lw + 60) continue;
      const bob = Math.abs(Math.sin(time * 6 + b.ph)) * 10;
      drawGubby(ctx, b.x, b.y - bob, 34, { body: b.color, mouth: 'open', lookX: -0.7, sy: 1 + bob * 0.01 });
      const ty = b.y - 70 - bob * 0.5;
      rr(ctx, b.x - 34, ty - 14, 68, 26, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '900 16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('HELP!', b.x, ty);
    }
    for (const o of obs) if (o.x < camX + lw + 80 && o.x + o.w > camX - 80) drawObs(o);
    drawSquad(px);
    drawPlayer(px);
    drawParts();
    for (const q of pops) {
      if (q.screen) continue;
      const a = 1 - Math.max(0, (q.t - q.dur * 0.6) / (q.dur * 0.4));
      oText(q.text, q.x, q.y, q.size, q.color, 'center', a);
    }
    ctx.restore();
  }

  function drawSquad(px) {
    if (!player) return;
    for (let i = squad.length - 1; i >= 0; i--) {
      const f = squad[i], delay = (i + 1) * 0.075;
      let hy = player.y;
      for (let k = hist.length - 1; k >= 0; k--) { if (hist[k].t <= time - delay) { hy = hist[k].y; break; } }
      const fx = px - (i + 1) * 30 * player.scale - 22;
      const onG = hy >= GY - 1;
      const bob = onG ? Math.abs(Math.sin(time * 14 + f.ph)) * 6 : 0;
      if (onG && state !== 'dying') {
        ctx.fillStyle = 'rgba(20,10,40,0.2)'; ctx.beginPath(); ctx.ellipse(fx, GY + 2, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      drawGubby(ctx, fx, hy - bob, 30, { body: f.color, mouth: onG ? 'smile' : 'open', lookX: 0.8, lookY: onG ? 0 : -0.5, blink: Math.sin(time * 0.9 + f.ph * 3) > 0.985 });
    }
  }

  function drawPlayer(px) {
    const p = player;
    if (!p || state === 'dying' || state === 'over') return;
    const sk = skin(), size = 56 * p.scale;
    if (p.y <= GY + 1 && overGround(px - 10, px + 10)) {
      const k = clamp(1 - (GY - p.y) / 420, 0.3, 1);
      ctx.fillStyle = 'rgba(20,10,40,0.25)'; ctx.beginPath(); ctx.ellipse(px, GY + 2, 26 * p.scale * k, 6 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of p.ghosts) drawGubby(ctx, g.x, g.y, size, { body: sk.body, alpha: g.life * 0.45, sx: 1.25, sy: 0.85, mouth: 'grin' });
    let sx = 1 - p.sq * 0.55, sy = 1 + p.sq;
    if (!p.onGround) { const st = clamp(Math.abs(p.vy) / 9000, 0, 0.12); sy += st; sx -= st * 0.6; }
    if (p.slideT > 0 && p.onGround) { sx = 1.42; sy = 0.56; }
    if (p.dashT > 0) { sx = 1.3; sy = 0.82; }
    const flick = p.invuln > 0 && p.megaT <= 0 && Math.floor(time * 16) % 2 === 0;
    const mouth = p.ouchT > 0 ? 'ouch' : (p.dashT > 0 || p.megaT > 0) ? 'grin' : p.slam ? 'o' : (!p.onGround && p.vy < -200) ? 'open' : (!p.onGround && p.vy > 700) ? 'o' : 'smile';
    if (p.megaT > 0) {
      ctx.fillStyle = 'rgba(125,255,154,0.25)';
      ctx.beginPath(); ctx.arc(px, p.y - size * 0.42, size * 0.75 + Math.sin(time * 20) * 4, 0, Math.PI * 2); ctx.fill();
    }
    drawGubby(ctx, px, p.y, size, {
      body: sk.body, acc: sk.acc, sx, sy, rot: p.spin > 0 ? (1 - p.spin) * Math.PI * 2 : 0,
      alpha: flick ? 0.35 : 1, mouth, blink: p.blinkT < 0 && p.ouchT <= 0, lookX: 0.7, lookY: clamp(p.vy / 1200, -0.8, 0.8)
    });
    if (p.shield) {
      const r = 44 * p.scale + Math.sin(time * 5) * 2, cy = p.y - 26 * p.scale * sy;
      ctx.fillStyle = 'rgba(120,230,255,0.18)'; ctx.strokeStyle = 'rgba(160,240,255,0.95)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(px, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(px, cy, r - 8, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    }
  }

  function drawParts() {
    for (const q of parts) {
      const a = clamp(q.life / (q.max * 0.6), 0, 1);
      ctx.globalAlpha = a;
      if (q.shape === 'ring') {
        const k = 1 - q.life / q.max;
        ctx.strokeStyle = q.color; ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.3 + k), 0, Math.PI * 2); ctx.stroke();
      } else if (q.shape === 'gub') {
        ctx.globalAlpha = 1;
        drawGubby(ctx, q.x, q.y, q.size, { body: q.color, mouth: 'ouch', rot: q.rot });
      } else if (q.shape === 'square') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.fillStyle = q.color; ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
        ctx.restore();
      } else if (q.shape === 'star') {
        ctx.fillStyle = q.color; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? q.size * 0.4 : q.size; const an = i / 8 * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (q.shape === 'heart') {
        const s = q.size * 0.6; ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.moveTo(q.x, q.y + s);
        ctx.bezierCurveTo(q.x - s * 2, q.y - s * 0.5, q.x - s * 0.6, q.y - s * 1.8, q.x, q.y - s * 0.6);
        ctx.bezierCurveTo(q.x + s * 0.6, q.y - s * 1.8, q.x + s * 2, q.y - s * 0.5, q.x, q.y + s);
        ctx.fill();
      } else {
        ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size / 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawAmbient() {
    const type = P.amb;
    if (type === 'star') return;
    for (const a of amb) {
      if (type === 'petal') {
        ctx.fillStyle = 'rgba(255,170,210,0.85)';
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(time * a.s + a.ph);
        ctx.beginPath(); ctx.ellipse(0, 0, 6 * a.s, 3.5 * a.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else if (type === 'sand') {
        ctx.fillStyle = 'rgba(255,235,190,0.55)'; ctx.fillRect(a.x, a.y, 14 * a.s, 2);
      } else if (type === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(a.x, a.y, 3 * a.s, 0, Math.PI * 2); ctx.fill();
      } else if (type === 'ember') {
        ctx.fillStyle = 'rgba(255,' + (120 + ((a.ph * 40) | 0)) + ',40,' + (0.5 + 0.5 * Math.sin(time * 5 + a.ph)) + ')';
        ctx.fillRect(a.x, a.y, 4 * a.s, 4 * a.s);
      }
    }
  }

  // ---------- HUD ----------
  function btnLayout() {
    return {
      dash: { x: lw - 122 - safeR, y: H - 118, r: 72 },
      down: { x: lw - 290 - safeR, y: H - 92, r: 58 },
      pause: { x: lw - 50 - safeR, y: 50, r: 32 }
    };
  }

  function drawHUD() {
    const p = player, L = 26 + safeL, B = btnLayout();
    oText(fmt(score), L, 50, 48, '#fff');
    oText(fmt(meters) + ' m', L, 94, 24, '#fff5c2');

    // power-up timers
    let yy = 136;
    const timers = [['magnet', p.magnetT, 9], ['double', p.doubleT, 10], ['mega', p.megaT, 6]];
    for (const [type, t, max] of timers) {
      if (t <= 0) continue;
      drawPowerIcon(ctx, type, L + 16, yy, 22);
      rr(ctx, L + 40, yy - 8, 110, 16, 8); ctx.fillStyle = 'rgba(43,22,64,0.5)'; ctx.fill();
      rr(ctx, L + 40, yy - 8, 110 * (t / max), 16, 8); ctx.fillStyle = '#ffd84a'; ctx.fill();
      yy += 40;
    }
    if (p.shield) { drawPowerIcon(ctx, 'shield', L + 16, yy, 22); yy += 40; }

    // multiplier + squad
    const n = squad.length;
    if (n > 0) {
      const pulse = 1 + Math.max(0, Math.sin(time * 8)) * 0.04;
      oText('x' + (n + 1), lw / 2, 46, Math.round(46 * pulse), '#ffd84a', 'center');
      for (let i = 0; i < n; i++) {
        const x = lw / 2 - (n - 1) * 12 + i * 24;
        ctx.fillStyle = squad[i].color; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, 88, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    if (combo >= 2) oText('COMBO x' + combo, lw / 2, n ? 124 : 50, 26, '#7cf2e6', 'center', clamp(comboT, 0, 1));

    // coins + pause
    drawCoin(ctx, B.pause.x - 170, 50, 17, time * 3);
    oText(fmt(run.coins), B.pause.x - 146, 52, 34, '#ffd84a');
    ctx.fillStyle = 'rgba(255,247,234,0.92)'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(B.pause.x, B.pause.y, B.pause.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(B.pause.x - 11, B.pause.y - 12, 8, 24); ctx.fillRect(B.pause.x + 3, B.pause.y - 12, 8, 24);

    // DASH button
    const d = B.dash, ready = p.energy >= DASH_COST;
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = ready ? '#ffd84a' : 'rgba(255,255,255,0.35)'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.energy / 100));
    ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = ready ? '#fff' : '#ffd84a'; ctx.lineWidth = 6; ctx.stroke();
    ctx.lineCap = 'butt';
    bolt(ctx, d.x, d.y - 8, 54); ctx.fillStyle = ready ? '#fff' : 'rgba(255,255,255,0.7)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.globalAlpha = 1;
    oText('DASH', d.x, d.y + 40, 20, '#fff', 'center');

    // DOWN button
    const dn = B.down, pressed = downHeld;
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(dn.x, dn.y, dn.r, 0, Math.PI * 2);
    ctx.fillStyle = pressed ? '#7cf2e6' : 'rgba(255,255,255,0.35)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.lineWidth = 4;
    for (const o of [-14, 4]) {
      ctx.beginPath(); ctx.moveTo(dn.x - 20, dn.y + o - 8); ctx.lineTo(dn.x, dn.y + o + 8); ctx.lineTo(dn.x + 20, dn.y + o - 8); ctx.lineTo(dn.x + 20, dn.y + o - 16); ctx.lineTo(dn.x, dn.y + o); ctx.lineTo(dn.x - 20, dn.y + o - 16); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    oText(p.onGround ? 'SLIDE' : 'SLAM', dn.x, dn.y + 34, 18, '#fff', 'center');
  }

  function drawOverlays() {
    const sp = pops.filter(q => q.screen);
    sp.forEach((q, i) => {
      const k = easeOutBack(Math.min(1, q.t / 0.25));
      const a = 1 - Math.max(0, (q.t - q.dur * 0.7) / (q.dur * 0.3));
      ctx.save(); ctx.translate(lw / 2, 210 + i * 58); ctx.scale(k, k);
      oText(q.text, 0, 0, q.size, q.color, 'center', a);
      ctx.restore();
    });
    if (banner && state === 'play') {
      const k = easeOutBack(Math.min(1, banner.t / 0.35)), a = 1 - Math.max(0, (banner.t - 1.8) / 0.6);
      ctx.save(); ctx.translate(lw / 2, 330); ctx.scale(k, k);
      oText(banner.sub, 0, -46, 26, '#fff5c2', 'center', a);
      oText(banner.text, 0, 6, 64, '#fff', 'center', a);
      ctx.restore();
    }
    if (hint && state === 'play') {
      const a = Math.min(1, hint.t * 4) * (1 - Math.max(0, (hint.t - 2.8) / 0.4));
      ctx.font = '900 30px ' + FONT;
      const tw = ctx.measureText(hint.text).width + 60;
      ctx.globalAlpha = a;
      rr(ctx, lw / 2 - tw / 2, 150, tw, 56, 20); ctx.fillStyle = '#fff7ea'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hint.text, lw / 2, 179);
      ctx.globalAlpha = 1;
    }
    if (player && player.dashT > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const y = Math.random() * H, x = Math.random() * lw, l = rnd(80, 220);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y); ctx.stroke();
      }
    }
  }

  function draw() {
    computePalette();
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    ctx.save();
    if (shakeT > 0) { const m = shakeMag * clamp(shakeT / shakeDur, 0, 1); ctx.translate(rnd(-m, m), rnd(-m, m)); }
    drawSky();
    drawHills();
    drawAmbient();
    drawWorld();
    ctx.restore();
    if (state === 'play' || state === 'dying' || state === 'paused') drawHUD();
    drawOverlays();
  }

  // ---------- main loop ----------
  let last = 0;
  function frame(now) {
    let dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 1 / 30);
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  // =====================================================================
  //                         INPUT
  // =====================================================================
  const pointers = new Map();
  const d2 = (x, y, b) => (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y);
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.init();
    if (state !== 'play') return;
    const x = e.clientX / sc, y = e.clientY / sc, B = btnLayout();
    if (d2(x, y, B.pause) < Math.pow(B.pause.r * 1.5, 2)) { pauseGame(); return; }
    let role = 'jump';
    if (d2(x, y, B.dash) < Math.pow(B.dash.r * 1.3, 2)) role = 'dash';
    else if (d2(x, y, B.down) < Math.pow(B.down.r * 1.3, 2)) role = 'down';
    pointers.set(e.pointerId, { role, x0: x, y0: y, sw: false });
    if (role === 'jump') pressJump(); else if (role === 'dash') doDash(); else pressDown();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', e => {
    const q = pointers.get(e.pointerId);
    if (!q || q.role !== 'jump' || q.sw || state !== 'play') return;
    const x = e.clientX / sc, y = e.clientY / sc;
    if (y - q.y0 > 70) { q.sw = true; pressDown(); q.role = 'down'; }
    else if (x - q.x0 > 90) { q.sw = true; doDash(); }
  });
  function endPointer(e) {
    const q = pointers.get(e.pointerId);
    if (!q) return;
    pointers.delete(e.pointerId);
    let jumpHeld = false, downStill = false;
    pointers.forEach(o => { if (o.role === 'jump') jumpHeld = true; if (o.role === 'down') downStill = true; });
    if (q.role === 'jump' && !jumpHeld) releaseJump();
    if (q.role === 'down' && !downStill) releaseDown();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  document.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    Sound.init();
    const k = e.code;
    if (state === 'play') {
      if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); pressJump(); }
      else if (k === 'ArrowRight' || k === 'KeyD' || k === 'ShiftLeft' || k === 'ShiftRight') { e.preventDefault(); doDash(); }
      else if (k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); pressDown(); }
      else if (k === 'Escape' || k === 'KeyP') pauseGame();
    } else if (state === 'paused' && (k === 'Escape' || k === 'KeyP')) resumeGame();
    else if ((state === 'menu' || state === 'over') && (k === 'Enter' || k === 'Space')) { e.preventDefault(); startRun(); }
  });
  window.addEventListener('keyup', e => {
    const k = e.code;
    if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') releaseJump();
    if (k === 'ArrowDown' || k === 'KeyS') releaseDown();
  });

  function appPause() { if (state === 'play') pauseGame(); Sound.suspend(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) appPause(); else Sound.resume(); });
  window.gubPause = appPause;
  window.gubResume = () => Sound.resume();

  // =====================================================================
  //                         DOM MENUS
  // =====================================================================
  const SCREENS = ['menu', 'shop', 'missions', 'settings', 'pause', 'over'];
  function showScreen(id) { for (const s of SCREENS) $(s).classList.toggle('show', s === id); }
  function shakeEl(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function updateMenuStats() {
    $('menuBest').textContent = fmt(save.best);
    $('menuCoins').textContent = fmt(save.coins);
  }
  function click() { Sound.init(); Sound.sfx('click'); buzz(10); }

  // logo letters
  const LOGO_COLORS = ['#5ee07a', '#ff8fc8', '#ffd84a', '#6cc8ff', '#b07cff', '#ff8a4a', '#7cf2e6'];
  'GUBBIES'.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.setProperty('--c', LOGO_COLORS[i]);
    s.style.setProperty('--i', i);
    s.style.setProperty('--r', (i % 2 ? 4 : -4) + 'deg');
    $('logo').appendChild(s);
  });

  $('btnPlay').addEventListener('click', () => { click(); startRun(); });
  $('btnShop').addEventListener('click', () => { click(); renderShop(); showScreen('shop'); });
  $('btnMissions').addEventListener('click', () => { click(); renderMissions(); showScreen('missions'); });
  $('btnSettings').addEventListener('click', () => { click(); renderSettings(); showScreen('settings'); });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { click(); updateMenuStats(); showScreen('menu'); }));
  $('btnResume').addEventListener('click', () => { click(); resumeGame(); });
  $('btnRestart').addEventListener('click', () => { click(); bankRun(); startRun(); });
  $('btnHome').addEventListener('click', () => { click(); bankRun(); enterMenu(); });
  $('btnAgain').addEventListener('click', () => { click(); startRun(); });
  $('btnOverHome').addEventListener('click', () => { click(); enterMenu(); });
  $('btnRevive').addEventListener('click', () => { Sound.init(); revive(); });
  $('btnTutorial').addEventListener('click', () => { click(); save.tutorial = false; persist(); startRun(); });

  function renderShop() {
    const g = $('shopGrid'); g.innerHTML = '';
    $('shopCoins').textContent = fmt(save.coins);
    for (const sk of SKINS) {
      const owned = save.owned.includes(sk.id), eq = save.skin === sk.id;
      const card = document.createElement('div');
      card.className = 'card' + (eq ? ' equipped' : '');
      const cv = document.createElement('canvas');
      cv.width = 240; cv.height = 200;
      const c2 = cv.getContext('2d');
      c2.scale(2, 2);
      drawGubby(c2, 60, 92, 74, { body: sk.body, acc: sk.acc, mouth: eq ? 'grin' : 'smile', lookX: 0.2 });
      if (!owned) { c2.fillStyle = 'rgba(255,247,234,0.25)'; c2.fillRect(0, 0, 120, 100); }
      const name = document.createElement('div'); name.className = 'cname'; name.textContent = sk.name;
      const b = document.createElement('button');
      b.className = 'btn small ' + (eq ? 'ghost' : owned ? 'green' : 'yellow');
      if (eq) b.textContent = 'EQUIPPED';
      else if (owned) b.textContent = 'EQUIP';
      else { b.innerHTML = '<span class="coin"></span>'; b.appendChild(document.createTextNode(fmt(sk.price))); }
      if (!owned && save.coins < sk.price) b.classList.add('locked');
      b.addEventListener('click', () => {
        Sound.init();
        if (eq) return;
        if (owned) { save.skin = sk.id; persist(); Sound.sfx('click'); renderShop(); }
        else if (save.coins >= sk.price) {
          save.coins -= sk.price; save.owned.push(sk.id); save.skin = sk.id; persist();
          Sound.sfx('buy'); buzz(30); renderShop(); updateMenuStats();
        } else { Sound.sfx('deny'); shakeEl(b); }
      });
      card.append(cv, name, b);
      g.appendChild(card);
    }
  }

  function renderMissions() {
    ensureMissions();
    $('mLevel').textContent = Math.floor(save.missionLevel / 3) + 1;
    const list = $('mList'); list.innerHTML = '';
    for (const m of save.missions) {
      const d = missionDef(m), prog = clamp(missionProgress(m), 0, m.target);
      const row = document.createElement('div'); row.className = 'mrow' + (m.done ? ' done' : '');
      const left = document.createElement('div'); left.className = 'mtext';
      left.textContent = d.txt(m.target) + '  (' + fmt(prog) + '/' + fmt(m.target) + ')';
      const bar = document.createElement('div'); bar.className = 'bar';
      const fill = document.createElement('i'); fill.style.width = (prog / m.target * 100) + '%';
      bar.appendChild(fill); left.appendChild(bar);
      const rw = document.createElement('div'); rw.className = 'reward';
      rw.innerHTML = '<span class="coin"></span>' + REWARDS[m.tier];
      row.append(left, rw);
      list.appendChild(row);
    }
  }

  function renderSettings() {
    document.querySelectorAll('[data-set]').forEach(b => {
      const k = b.dataset.set, on = save.settings[k];
      b.classList.toggle('off', !on);
      b.textContent = b.dataset.label + (on ? ' ON' : ' OFF');
    });
  }
  document.querySelectorAll('[data-set]').forEach(b => {
    b.dataset.label = b.textContent.trim();
    b.addEventListener('click', () => {
      const k = b.dataset.set;
      save.settings[k] = !save.settings[k];
      applySettings(); persist(); click();
      b.textContent = b.dataset.label + (save.settings[k] ? ' ON' : ' OFF');
      b.classList.toggle('off', !save.settings[k]);
    });
  });
  function applySettings() { Sound.setMusic(save.settings.music); Sound.setSfx(save.settings.sfx); }

  // first touch unlocks audio
  const unlock = () => { Sound.init(); applySettings(); };
  document.addEventListener('pointerdown', unlock, { capture: true });

  // ---------- debug / test hooks ----------
  window.__gub = {
    get state() { return state; },
    get meters() { return meters; },
    get score() { return score; },
    get squad() { return squad.length; },
    get save() { return save; },
    set autopilot(v) { autopilot = !!v; },
    start: startRun,
    give(c) { save.coins += c; persist(); updateMenuStats(); },
    spawnBabies(n) { for (let i = 0; i < n; i++) addBaby(camX + PX() + 200 + i * 60, GY); },
    power(type) { collectPower({ x: camX + PX(), y: GY - 100, type }, 0); },
    warp(m) { meters = m; lastBiome = Math.floor(m / BIOME_LEN); }
  };

  // ---------- boot ----------
  applySettings();
  ensureMissions();
  computePalette();
  enterMenu();
  requestAnimationFrame(frame);
})();
