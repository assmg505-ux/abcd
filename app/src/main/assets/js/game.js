// GUBS — WE ARE GUBS!
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const GD = window.GD, GU = window.GubDraw;
  const { drawGubby, drawMiniGub, drawCoin, drawPowerIcon, drawAbilityIcon, rr, starPath, INK } = GU;
  const FONT = 'system-ui, -apple-system, Roboto, sans-serif';
  const TAU = Math.PI * 2;

  // ---------- world constants (logical units; the view is always H tall) ----------
  const H = 720, GY = 600, METER = 40, ALT_U = 25;
  const GRAV = 3300, JUMP_V = 1150, JUMP2_V = 1020, PAD_V = 2150, REVIVE_COST = 150;

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

  // ---------- utils (generation uses RNG so the daily run can be seeded) ----------
  let RNG = Math.random;
  const rnd = (a, b) => a + RNG() * (b - a);
  const rint = (a, b) => Math.floor(a + RNG() * (b - a + 1));
  const pick = a => a[Math.floor(RNG() * a.length)];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = n => Math.floor(n).toLocaleString('en-US');
  function hash(n) {
    let h = Math.imul(n | 0, 374761393);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dateStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  const hexRgb = h => [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  const mixA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgbS = a => 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')';
  function weighted(opts) {
    let s = 0; for (const o of opts) s += o[1];
    let r = RNG() * s;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts[0][0];
  }
  const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  // ---------- save ----------
  const SAVE_KEY = 'gubbies-save-v1'; // kept so existing progress carries over
  const defaultSave = () => ({
    coins: 0, best: 0, bests: {}, mode: 'classic',
    skin: 'gub', owned: ['gub'], trail: 'none', trails: ['none'], aura: 'none', auras: ['none'],
    ability: 'bubble', abilities: ['bubble'], upg: {},
    missions: [], missionLevel: 0, tutorial: false,
    shopDay: null, gift: { last: '', streak: 0 }, dailyDone: '',
    stats: { runs: 0, coins: 0, meters: 0, stomps: 0, crates: 0, rescued: 0, dashes: 0, powerups: 0, maxAlt: 0, maxSquad: 0 },
    settings: { music: true, sfx: true, haptics: true, scheme: 'buttons', layout: 'right', btnSize: 1, btnPos: null }
  });
  function loadSave() {
    const d = defaultSave();
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === 'object') {
        Object.assign(d, s);
        const dd = defaultSave();
        d.stats = Object.assign(dd.stats, s.stats || {});
        d.settings = Object.assign(dd.settings, s.settings || {});
        d.gift = Object.assign(dd.gift, s.gift || {});
        d.upg = Object.assign({}, s.upg || {});
        d.bests = Object.assign({}, s.bests || {});
        for (const k of ['owned', 'trails', 'auras', 'abilities', 'missions']) if (!Array.isArray(d[k])) d[k] = dd[k];
        if (!d.owned.includes('gub')) d.owned.push('gub');
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

  // ---------- upgrades / equipment ----------
  const lv = id => save.upg[id] || 0;
  const maxJumps = () => 1 + lv('multi');
  const springMul = () => 1 + 0.07 * lv('spring');
  const glideCap = () => [0, 640, 470, 330][lv('glide')];
  const dashCost = () => [50, 45, 40, 35, 30, 25][lv('dash')];
  const dashRegen = () => [7, 8, 9.5, 11, 13, 15][lv('dash')];
  const magnetPassive = () => lv('magnet') * 70;
  const powerMul = () => 1 + 0.2 * lv('power');
  const coinMul = () => 1 + 0.1 * lv('coin');
  const headStart = () => [0, 1, 2, 4, 6, 10][lv('head')];
  const luckyMul = () => [1, 1.25, 1.5, 1.8][lv('lucky')];
  const slamMul = () => [1, 1.3, 1.6, 2.0][lv('slam')];
  const cdrMul = () => 1 - 0.1 * lv('cdr');
  const skinDef = () => GD.SKINS.find(s => s.id === save.skin) || GD.SKINS[0];
  const trailDef = () => GD.TRAILS.find(s => s.id === save.trail) || GD.TRAILS[0];
  const auraDef = () => GD.AURAS.find(s => s.id === save.aura) || GD.AURAS[0];
  const abilDef = () => GD.ABILITIES.find(s => s.id === save.ability) || GD.ABILITIES[0];
  const skinOpts = (sk, t) => ({ body: sk.body, pat: sk.pat, pc: sk.pc, acc: sk.acc, t: t || 0 });
  const modeDef = id => GD.MODES.find(m => m.id === id) || GD.MODES[0];
  const bestKey = m => m === 'daily' ? 'daily:' + dateStr() : m;
  const getBest = m => m === 'classic' ? Math.max(save.best || 0, save.bests.classic || 0) : (save.bests[bestKey(m)] || 0);

  const BABY_COLORS = ['#5ee07a', '#ff8fc8', '#6cc8ff', '#ffd84a', '#b07cff', '#ff8a4a', '#7cf2e6'];

  // ---------- biomes (ground levels) ----------
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
  const STRAT = { T: [14, 42, 110], B: [63, 134, 214] };
  const SPACE = { T: [3, 2, 12], B: [26, 13, 61] };
  const DEEP = { T: [22, 4, 40], B: [74, 18, 96] };
  const P = {};
  let skyAlt = 0;
  function computePalette() {
    const m = (state === 'menu' || state === 'layout') ? (time * 22) % (BIOME_LEN * BIOMES.length) : meters;
    const seg = Math.floor(m / BIOME_LEN), i = seg % BIOMES.length, j = (i + 1) % BIOMES.length;
    const into = m - seg * BIOME_LEN, t = clamp((into - (BIOME_LEN - 45)) / 45, 0, 1);
    const a = BIOMES[i], b = BIOMES[j];
    for (const k of PKEYS) P[k] = rgbS(mixA(a['_' + k], b['_' + k], t));
    let T = mixA(a._skyT, b._skyT, t), B = mixA(a._skyB, b._skyB, t);
    const st = clamp((skyAlt - 350) / 1800, 0, 1), sp = clamp((skyAlt - 2200) / 2300, 0, 1), dp = clamp((skyAlt - 6000) / 3500, 0, 1);
    T = mixA(T, STRAT.T, st); B = mixA(B, STRAT.B, st);
    T = mixA(T, SPACE.T, sp); B = mixA(B, SPACE.B, sp);
    T = mixA(T, DEEP.T, dp); B = mixA(B, DEEP.B, dp);
    P.skyT = rgbS(T); P.skyB = rgbS(B);
    P.space = sp; P.deep = dp;
    const cur = t < 0.5 ? a : b;
    P.amb = skyAlt > 900 ? 'none' : cur.amb; P.idx = t < 0.5 ? i : j;
    P.night = Math.max(lerp(a.night, b.night, t), sp);
  }

  // ---------- missions ----------
  const MT = [
    { id: 'coins', run: true, stat: 'coins', vals: [25, 50, 90, 150, 240], txt: n => 'Collect ' + n + ' coins in one run' },
    { id: 'meters', run: true, stat: 'meters', vals: [250, 500, 900, 1500, 2400], txt: n => 'Run ' + fmt(n) + 'm in one run' },
    { id: 'rescue', run: true, stat: 'rescued', vals: [2, 4, 7, 10, 14], txt: n => 'Rescue ' + n + ' Gubs in one run' },
    { id: 'squad', run: true, stat: 'maxSquad', vals: [3, 5, 8, 12, 20], txt: n => 'Have ' + n + ' Gubs in your squad' },
    { id: 'dashes', run: true, stat: 'dashes', vals: [3, 5, 8, 12, 18], txt: n => 'Dash ' + n + ' times in one run' },
    { id: 'score', run: true, stat: 'score', vals: [1500, 4000, 9000, 18000, 35000], txt: n => 'Score ' + fmt(n) + ' in one run' },
    { id: 'combo', run: true, stat: 'bestCombo', vals: [3, 5, 7, 10, 14], txt: n => 'Get a x' + n + ' combo' },
    { id: 'alt', run: true, stat: 'maxAlt', vals: [15, 40, 90, 160, 300], txt: n => 'Climb to ' + n + 'm altitude' },
    { id: 'stomps', run: false, stat: 'stomps', vals: [5, 12, 25, 45, 70], txt: n => 'Stomp ' + n + ' Grumps' },
    { id: 'crates', run: false, stat: 'crates', vals: [8, 20, 40, 70, 110], txt: n => 'Smash ' + n + ' crates' },
    { id: 'powerups', run: false, stat: 'powerups', vals: [3, 7, 12, 20, 30], txt: n => 'Grab ' + n + ' power-ups' }
  ];
  const REWARDS = [60, 110, 180, 280, 450];
  const missionDef = m => MT.find(t => t.id === m.id);
  function newMission(exclude) {
    const pool = MT.filter(m => !exclude.includes(m.id));
    const d = pool[Math.floor(Math.random() * pool.length)], tier = Math.min(4, Math.floor(save.missionLevel / 3));
    return { id: d.id, tier, target: d.vals[tier], base: d.run ? 0 : (save.stats[d.stat] || 0), prog: 0, done: false };
  }
  function ensureMissions() {
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
  let state = 'menu', mode = 'classic';
  let time = 0, camX = 0, camY = 0, speed = 460, meters = 0, score = 0;
  let freezeT = 0, shakeT = 0, shakeDur = 1, shakeMag = 0, dieT = 0;
  let segs = [], obs = [], plats = [], coins = [], babies = [], powers = [], pads = [], winds = [], parts = [], pops = [], squad = [], hist = [], tutHints = [];
  let genX = 0, tutQueue = [], hint = null, banner = null, lastBiome = 0, genRng = Math.random, skyS = null, skyPlateau = 0, noAscentUntil = 0;
  let combo = 0, comboT = 0, coinStreak = 0, coinStreakT = 0, missionT = 0, coinAcc = 0;
  let run = null, player = null, revived = false, downHeld = false;
  let autopilot = false, autoHoldT = 0, autoDownT = 0, debugHover = null;
  let lastHit = '', abilCd = 0, abilMax = 1, slowT = 0, timeLeft = 60, zoneMax = 0, trailAcc = 0, trailSeq = 0, auraT = 0;

  const swipeMode = () => save.settings.scheme === 'swipe';
  const spaceFac = y => clamp((GY - y - 3000) / 1500, 0, 1);

  function newPlayer() {
    return {
      y: GY, vy: 0, prevY: GY, onGround: true, coyote: 0, jumpBuf: 0, jumps: 0, holding: false, holdT: 0,
      slideT: 0, slam: false, dashT: 0, energy: 100, invuln: 0, shield: false, shieldRegen: 0,
      magnetT: 0, megaT: 0, doubleT: 0, rocketT: 0, phaseT: 0, scale: 1, spin: 0, sq: 0, sqv: 0, blinkT: 2, ouchT: 0,
      ghosts: [], ghostT: 0, hopT: 1, padCd: 0
    };
  }

  // ---------- terrain ----------
  const lastSeg = () => segs[segs.length - 1];
  function extendGround(x) { const s = lastSeg(); if (s && x > s.x1) s.x1 = x; }
  function makePit(x, w) { extendGround(x); lastSeg().x1 = x; segs.push({ x0: x + w, x1: x + w }); }
  function overGround(a, b) {
    for (const s of segs) if (s.x0 < b && s.x1 > a) return true;
    return false;
  }

  // ---------- entities ----------
  function addObs(type, x, y, w, h, extra) {
    const o = Object.assign({ type, x, y, w, h, dead: false, t: RNG() * 10 }, extra || {});
    obs.push(o); return o;
  }
  const addSpike = (x, y) => addObs('spike', x, (y || GY) - 44, 42, 44);
  const addCrate = (x, y) => addObs('crate', x, y - 64, 64, 64);
  const addGrump = (x, cy, low) => addObs('grump', x, cy - 25, 60, 50, { baseY: cy - 25, amp: low ? 4 : 18, vx: -rnd(70, 130) });
  const addUfo = (x, cy) => addObs('ufo', x, cy - 22, 74, 44, { baseY: cy - 22, amp: 16, vx: -rnd(40, 90) });
  const addRock = (x, cy) => addObs('rock', x, cy - 32, 64, 64, { cy, amp: 0, rot: 0, vx: -rnd(20, 60), seed: rint(0, 99) });
  const addSaw = (x, cy, r, amp) => addObs('saw', x, cy - r, r * 2, r * 2, { r, cy, baseCy: cy, amp: amp || 0, rot: 0 });
  const addBaby = (x, y) => babies.push({ x, y, color: pick(BABY_COLORS), ph: RNG() * 6, taken: false });
  const addPlat = (x, y, w, bounce) => { const p = { x, y, w, bounce: !!bounce }; plats.push(p); return p; };
  const addPad = (x, y) => pads.push({ x, y, w: 130, sq: 0 });
  function addPower(x, y, alt) {
    const rocketW = mode === 'sky' ? 1.6 : (meters > 150 ? 0.8 : 0.2);
    powers.push({ x, y, type: weighted([['magnet', 3], ['shield', 3], ['double', 2], ['mega', 1.2], ['rocket', rocketW]]), ph: RNG() * 6, taken: false });
  }
  function coinArc(x0, x1, peak, n) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      coins.push({ x: lerp(x0, x1, t), y: GY - 50 - Math.sin(t * Math.PI) * peak, t: RNG() * 6 });
    }
  }
  function coinLine(x0, y, n, gap) { for (let i = 0; i < n; i++) coins.push({ x: x0 + i * (gap || 44), y, t: i * 0.4 }); }
  function coinsBetween(x0, y0, x1, y1, n, peak) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      coins.push({ x: lerp(x0, x1, t), y: lerp(y0, y1, t) - Math.sin(t * Math.PI) * peak, t: i * 0.3 });
    }
  }
  function tutHint(x, ground, swipe) { tutHints.push({ x, text: swipeMode() ? swipe : ground, shown: false }); }

  // ---------- level generation ----------
  function ensureGen() {
    const prev = RNG; RNG = genRng;
    try { while (genX < camX + lw + 900) { if (mode === 'sky') genSkyChunk(); else genPattern(); } }
    finally { RNG = prev; }
  }

  function flightTime(V, h, y) {
    const g = GRAV * (1 - 0.4 * spaceFac(y)) * 1.06;
    const disc = V * V - 2 * g * h;
    return disc < 0 ? 0.8 : (V + Math.sqrt(disc)) / g;
  }
  function padRange(y) {
    const g = GRAV * (1 - 0.4 * spaceFac(y)), peak = PAD_V * PAD_V / (2 * g);
    return [peak * 0.5, peak * 0.76];
  }

  function decorPlat(P, prev, gap, phase) {
    const alt = GY - P.y, D = clamp(meters / 2500, 0, 1);
    if (!P.bounce && RNG() < 0.75) coinLine(P.x + 30, P.y - 46, Math.max(2, Math.floor((P.w - 50) / 46)), 46);
    if (!P.bounce && RNG() < 0.16 * luckyMul()) addBaby(P.x + P.w * 0.75, P.y);
    if (!P.bounce && RNG() < (phase === 'plateau' ? 0.14 : 0.05)) addPower(P.x + P.w * 0.5, P.y - 120, alt);
    if (!P.bounce && P.w > 250 && phase !== 'up' && D > 0.1 && RNG() < 0.3) addSpike(P.x + P.w * 0.5 - 21, P.y);
    if (prev && RNG() < 0.1 + D * 0.22 + (mode === 'sky' ? 0.08 : 0)) {
      const gx = prev.x + prev.w + gap * 0.5, gy = Math.min(prev.y, P.y) - 95;
      if (alt > 3200) { if (RNG() < 0.5) addUfo(gx, gy); else addRock(gx, gy); }
      else addGrump(gx, gy, false);
    }
  }

  // one more element of an airborne route; S.cur is the last platform
  function chainStep(S, sp, phase) {
    const cur = S.cur, r = RNG();
    let kind = 'plat';
    if (phase === 'up') { if (r < 0.17) kind = 'bounce'; else if (r < 0.27) kind = 'wind'; }
    if (kind === 'bounce') {
      const gap = sp * rnd(0.18, 0.3), bw = sp * rnd(0.4, 0.5) + 110;
      const b = addPlat(cur.x + cur.w + gap, Math.min(GY - 110, cur.y + rnd(-40, 20)), bw, true);
      const pr = padRange(b.y), hgt = rnd(pr[0], pr[1]), tt = flightTime(PAD_V, hgt, b.y - hgt);
      const w = rnd(300, 360);
      const T = { x: Math.max(b.x + bw * 0.5 + sp * tt - w * 0.5, b.x + bw + 30), y: b.y - hgt, w, bounce: false };
      plats.push(T);
      coinsBetween(b.x + bw * 0.5, b.y - 60, T.x + w * 0.3, T.y - 60, 6, 120);
      decorPlat(T, null, 0, phase); S.cur = T; return;
    }
    if (kind === 'wind') {
      const ww = sp * 0.5, wx = cur.x + cur.w + sp * 0.12, colH = 480;
      winds.push({ x: wx, y: cur.y - colH + 40, w: ww, h: colH });
      const T = addPlat(wx + ww + sp * 0.1, cur.y - rnd(300, 360), rnd(210, 270), false);
      for (let i = 0; i < 6; i++) coins.push({ x: wx + ww / 2, y: cur.y - 50 - i * 55, t: i * 0.3 });
      decorPlat(T, null, 0, phase); S.cur = T; return;
    }
    const gap = sp * rnd(0.2, 0.34);
    let dy;
    if (phase === 'up') dy = mode === 'sky' ? (RNG() < 0.8 ? -rnd(85, 145) : rnd(-60, 60)) : -rnd(85, 145);
    else if (phase === 'down') dy = rnd(70, 130);
    else dy = rnd(-75, 75);
    const ny = Math.min(cur.y + dy, GY - 110);
    const w = sp * rnd(0.36, 0.52) + 90;
    const Pl = addPlat(cur.x + cur.w + gap, ny, w, false);
    decorPlat(Pl, cur, gap, phase);
    S.cur = Pl;
  }

  function genAscent(x0, sp) {
    const goal = clamp(rnd(520, 640 + meters * 2.2) * (RNG() < 0.2 ? 1.7 : 1), 520, 12000);
    const S = { cur: null, topY: GY - goal };
    addPad(x0, GY);
    const pr = padRange(GY), h = rnd(pr[0], pr[1]), tt = flightTime(PAD_V, h, GY - h);
    const T = addPlat(x0 + 20 + sp * tt - 160, GY - h, 320, false);
    coinsBetween(x0 + 40, GY - 60, T.x + 60, T.y - 60, 6, 140);
    decorPlat(T, null, 0, 'up'); S.cur = T;
    let guard = 0;
    while (S.cur.y > S.topY && guard++ < 90) chainStep(S, sp, 'up');
    const pl = rint(2, 5); for (let i = 0; i < pl; i++) chainStep(S, sp, 'plateau');
    guard = 0;
    while (S.cur.y < GY - 190 && guard++ < 90) chainStep(S, sp, 'down');
    return S.cur.x + S.cur.w + 260 - x0;
  }

  function genSkyChunk() {
    const sp = Math.max(speed, 460) * 1.06;
    if (!skyS) {
      const x0 = 640;
      addPad(x0, GY);
      const pr = padRange(GY), h = rnd(pr[0], pr[1]), tt = flightTime(PAD_V, h, GY - h);
      const T = addPlat(x0 + 20 + sp * tt - 170, GY - h, 340, false);
      coinsBetween(x0 + 40, GY - 60, T.x + 60, T.y - 60, 6, 140);
      skyS = { cur: T, topY: 0 }; skyPlateau = 0;
    }
    for (let i = 0; i < 8; i++) {
      let ph = 'up';
      if (skyPlateau > 0) { ph = 'plateau'; skyPlateau--; }
      else if (RNG() < 0.07) skyPlateau = rint(2, 3);
      chainStep(skyS, sp, ph);
    }
    genX = skyS.cur.x + skyS.cur.w;
  }

  function genPattern() {
    const D = clamp(meters / 2500, 0, 1);
    const sp = Math.max(speed, 460);
    const x = genX + sp * rnd(0.6, 0.9) * (1 - D * 0.25);
    extendGround(x);
    let w;
    if (tutQueue.length) {
      w = genTutorial(tutQueue.shift(), x);
    } else {
      const baby = squad.length < 3 ? 1.7 : squad.length < 8 ? 1.0 : 0.6;
      const opts = [
        ['spikes', 3], ['wall', 2], ['crates', 2.2], ['grump', 2 + D * 2], ['pit', 1.4 + D * 2],
        ['plats', 1.6], ['saw', D > 0.15 ? 1.2 + D * 1.5 : 0], ['coins', 1.4], ['combo', D > 0.3 ? 2.4 * D : 0],
        ['baby', baby * luckyMul()], ['pack', meters > 60 ? 0.5 * luckyMul() : 0], ['power', 0.6],
        ['ascent', (meters > 100 && genX > noAscentUntil) ? 1.5 + 2.2 * D : 0]
      ];
      w = runPattern(weighted(opts), x, D, sp);
    }
    genX = x + w;
    extendGround(genX);
  }

  function genTutorial(kind, x) {
    switch (kind) {
      case 'spike': addSpike(x); coinArc(x - 100, x + 140, 175, 6); tutHint(x, 'TAP anywhere to JUMP! Hold for higher', 'SWIPE UP (or tap) to JUMP! Hold for higher'); return 42;
      case 'crate': addCrate(x, GY); addCrate(x, GY - 64); tutHint(x, 'Press DASH to smash right through!', 'SWIPE RIGHT to DASH through!'); return 64;
      case 'grump': addGrump(x, GY - 50, true); coinLine(x - 120, GY - 28, 6, 40); tutHint(x, 'Hold SLIDE to duck - or JUMP on Grumps!', 'SWIPE DOWN to slide - or JUMP on Grumps!'); return 60;
      case 'baby': addBaby(x, GY); tutHint(x, 'Grab baby Gubs! They protect you & multiply score', 'Grab baby Gubs! They protect you & multiply score'); return 40;
      case 'pit': makePit(x, 170); coinArc(x - 50, x + 220, 200, 7); tutHint(x, 'Jump the gaps! Hold to jump higher', 'Jump the gaps! Hold to jump higher'); return 170;
      case 'slam': for (let i = 0; i < 3; i++) addCrate(x + i * 64, GY); tutHint(x - 120, 'Jump, then press SLIDE in the air to SLAM!', 'Jump, then SWIPE DOWN to SLAM!'); return 192;
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
        if (RNG() < 0.35) addBaby(x + 31, GY - h); else coinLine(x + 31, GY - h - 44, 1);
        return 62;
      }
      case 'crates': {
        if (RNG() < 0.55) {
          const n = rint(1, 3);
          for (let i = 0; i < n; i++) addCrate(x + i * 64, GY);
          coinLine(x + 10, GY - 120, n * 2, 30);
          return n * 64;
        }
        addCrate(x, GY); addCrate(x, GY - 64); coinLine(x + 32, GY - 175, 1);
        return 64;
      }
      case 'grump': {
        if (D > 0.3 && RNG() < 0.35) { addGrump(x, GY - 185, false); coinLine(x - 60, GY - 40, 5, 40); }
        else { addGrump(x, GY - 50, true); coinLine(x - 120, GY - 28, 6, 40); }
        return 60;
      }
      case 'pit': {
        const w = clamp(rnd(130, 170 + D * 190), 120, sp * 0.5);
        makePit(x, w);
        coinArc(x - 50, x + w + 50, 200, 7);
        if (w > 240 && RNG() < 0.5) addPlat(x + w / 2 - 70, GY - 130, 140);
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
          if (i === n - 1 && RNG() < 0.45) addBaby(cx + w - 40, y);
          cx += w + rint(90, 140);
        }
        if (D > 0.25) { const k = Math.floor((firstW - 40) / 42); for (let i = 0; i < k; i++) addSpike(x + 20 + i * 42); }
        return cx - x;
      }
      case 'saw': {
        if (D > 0.45 && RNG() < 0.45) { addSaw(x, GY - 130, 34, 85); return 68; }
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
        if (D > 0.1 && RNG() < 0.4) { addSpike(x); addBaby(x + 190, GY); return 210; }
        addBaby(x, GY);
        return 40;
      }
      case 'pack': {
        const n = rint(4, 8);
        for (let i = 0; i < n; i++) addBaby(x + i * 56, GY);
        return n * 56;
      }
      case 'power': { addPower(x, GY - 150, 0); return 60; }
      case 'ascent': {
        const w = genAscent(x, sp * 1.08);
        noAscentUntil = x + w + 2600;
        return w;
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
  function addPart(o) { if (parts.length > 500) parts.shift(); parts.push(o); }
  function burst(x, y, color, n, spd, size, shape) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.7);
      addPart({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life: 0.4 + Math.random() * 0.5, max: 0.9, size: size * (0.6 + Math.random() * 0.4), color, g: 1400, shape: shape || 'circle', rot: Math.random() * 6 });
    }
  }
  function dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      addPart({ x: x + (Math.random() - 0.5) * 28, y: y - 4, vx: -20 - Math.random() * 140, vy: -30 - Math.random() * 110, life: 0.3 + Math.random() * 0.25, max: 0.55, size: 6 + Math.random() * 6, color: 'rgba(255,255,255,0.8)', g: 200, shape: 'circle' });
    }
  }
  function ring(x, y, color, r) { addPart({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: r, color, g: 0, shape: 'ring' }); }
  function screenPop(text, color, size) {
    const sp = pops.filter(p => p.screen);
    if (sp.length >= 3) pops.splice(pops.indexOf(sp[0]), 1);
    pops.push({ text, color: color || '#fff', size: size || 44, t: 0, dur: 1.4, screen: true });
  }
  function worldPop(text, x, y, color, size) { pops.push({ text, x, y, color: color || '#fff', size: size || 28, t: 0, dur: 0.9, screen: false }); }
  function shake(d, m) { if (shakeT <= 0 || m >= shakeMag) { shakeMag = m; shakeDur = d; } shakeT = Math.max(shakeT, d); }

  function emitTrail(px, p, dt) {
    const tr = trailDef();
    if (tr.id === 'none' || !tr.shape) return;
    trailAcc += dt * tr.rate;
    while (trailAcc >= 1) {
      trailAcc -= 1;
      const col = tr.seq ? tr.colors[(trailSeq++) % tr.colors.length] : tr.colors[Math.floor(Math.random() * tr.colors.length)];
      addPart({
        x: px - 12 - Math.random() * 6, y: p.y - 6 - Math.random() * 38 * p.scale, vx: -speed * 0.35 - Math.random() * 80,
        vy: (tr.rise ? -60 - Math.random() * 90 : tr.fall ? 40 + Math.random() * 60 : (Math.random() - 0.5) * 60),
        life: tr.life * (0.7 + Math.random() * 0.3), max: tr.life, size: tr.size * (0.7 + Math.random() * 0.5), color: col, g: 0, shape: tr.shape, rot: Math.random() * 6
      });
    }
  }

  // ---------- run lifecycle ----------
  function startRun(m) {
    Sound.init();
    mode = m || save.mode || 'classic';
    save.mode = mode;
    segs = [{ x0: -3000, x1: 900 }];
    obs = []; plats = []; coins = []; babies = []; powers = []; pads = []; winds = []; parts = []; pops = []; squad = []; hist = []; tutHints = [];
    camX = 0; camY = 0; skyAlt = 0; speed = 460; meters = 0; score = 0; freezeT = 0; shakeT = 0; slowT = 0; debugHover = null;
    genX = 900; combo = 0; comboT = 0; coinStreak = 0; coinAcc = 0; revived = false; hint = null; banner = null; lastBiome = 0; downHeld = false;
    skyS = null; skyPlateau = 0; noAscentUntil = 0; zoneMax = 0; trailAcc = 0; timeLeft = 60;
    genRng = mode === 'daily' ? mulberry32(strHash('gubs-' + dateStr())) : Math.random;
    player = newPlayer();
    player.jumps = 0;
    run = { coins: 0, meters: 0, rescued: 0, dashes: 0, score: 0, maxSquad: 0, bestCombo: 0, maxAlt: 0, missionsDone: [], banked: { coins: 0, meters: 0 }, newBest: false, mode };
    if (mode === 'sky') { genX = 640; }
    tutQueue = (save.tutorial || mode !== 'classic') ? [] : ['spike', 'crate', 'grump', 'baby', 'pit', 'slam'];
    for (let i = 0; i < headStart(); i++) squad.push({ color: BABY_COLORS[i % BABY_COLORS.length], ph: i * 1.3 });
    run.maxSquad = squad.length;
    if (lv('shield') >= 1) player.shield = true;
    player.shieldRegen = 0;
    abilCd = 0; abilMax = 1;
    save.stats.runs++;
    ensureMissions();
    state = 'play';
    showScreen(null);
    Sound.music('game');
    banner = { text: mode === 'sky' ? 'SKY CLIMB' : mode === 'rush' ? 'TIME RUSH' : mode === 'zen' ? 'ZEN' : mode === 'daily' ? 'DAILY RUN' : BIOMES[0].name, sub: 'GO GO GUB!', t: 0 };
    if (mode === 'sky') hint = { text: swipeMode() ? 'SWIPE UP to jump! Bounce pads & wind lift you!' : 'TAP to jump! Springs & wind carry you UP!', t: 0 };
  }

  function enterMenu() {
    state = 'menu';
    segs = [{ x0: -1e12, x1: 1e12 }];
    obs = []; plats = []; coins = []; babies = []; powers = []; pads = []; winds = []; parts = []; pops = []; hist = []; tutHints = [];
    camY = 0; skyAlt = 0;
    player = newPlayer();
    squad = [];
    for (let i = 0; i < 6; i++) squad.push({ color: BABY_COLORS[i % BABY_COLORS.length], ph: i * 1.3 });
    banner = null; hint = null;
    updateMenuStats();
    showScreen('menu');
    Sound.music('menu');
  }

  function bankRun() {
    if (!run) return;
    const half = mode === 'zen';
    const dc = Math.floor((run.coins - run.banked.coins) * (half ? 0.5 : 1));
    save.coins += dc; save.stats.coins += dc;
    const m = Math.floor(meters);
    save.stats.meters += m - run.banked.meters;
    run.banked = { coins: run.coins, meters: m };
    run.score = Math.floor(score); run.meters = m;
    save.stats.maxAlt = Math.max(save.stats.maxAlt, run.maxAlt);
    save.stats.maxSquad = Math.max(save.stats.maxSquad, run.maxSquad);
    if (mode !== 'zen') {
      const key = bestKey(mode);
      if (run.score > (save.bests[key] || 0)) { save.bests[key] = run.score; run.newBest = true; }
      if (mode === 'classic' && run.score > save.best) save.best = run.score;
    }
    if (!tutQueue.length) save.tutorial = true;
    if (mode === 'daily' && save.dailyDone !== dateStr() && run.score > 0) {
      save.dailyDone = dateStr(); save.coins += 100;
      run.missionsDone.push({ text: 'Daily Run bonus', reward: 100 });
    }
    checkMissions();
    persist();
  }

  function die() {
    if (state !== 'play') return;
    state = 'dying'; dieT = 0;
    const p = player, px = camX + PX();
    shake(0.5, 16); freezeT = 0.1; buzz(180);
    Sound.sfx('die'); Sound.music(null);
    const sk = skinDef();
    burst(px, p.y - 24, sk.pat === 'rainbow' ? '#ff6fb1' : sk.body, 30, 800, 14);
    burst(px, p.y - 24, '#ffffff', 10, 600, 8);
    ring(px, p.y - 24, '#ffffff', 90);
  }

  function timeUp() {
    if (state !== 'play') return;
    state = 'dying'; dieT = 0; run.timeUp = true;
    shake(0.3, 8); buzz(100); Sound.sfx('die'); Sound.music(null);
  }

  function finishRun() {
    bankRun();
    state = 'over';
    $('goTitle').textContent = run.timeUp ? 'TIME UP!' : pick(['SPLAT!', 'SQUISHED!', 'GUB DOWN!', 'BONK!', 'OOF!']);
    $('goBest').style.display = run.newBest ? '' : 'none';
    $('goModeLbl').textContent = modeDef(mode).name;
    $('goBestVal').textContent = mode === 'zen' ? '-' : fmt(getBest(mode));
    $('goDist').textContent = fmt(meters) + 'm';
    $('goAlt').textContent = fmt(run.maxAlt) + 'm';
    $('goCoins').textContent = fmt(mode === 'zen' ? run.coins * 0.5 : run.coins);
    $('goSaved').textContent = fmt(run.rescued);
    $('goSquad').textContent = fmt(run.maxSquad);
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
    rb.style.display = (revived || run.timeUp || mode === 'zen') ? 'none' : '';
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
    const px = camX + PX();
    obs = obs.filter(o => o.x > camX + lw + 300 || o.x + o.w < camX);
    const p = player;
    if (p.y > camY + H - 120) p.y = camY + H - 220;
    if (p.y >= GY - 4 && mode !== 'sky') { p.y = GY; segs.unshift({ x0: camX - 300, x1: camX + lw + 400 }); }
    else plats.push({ x: px - 220, y: p.y + 6, w: 520, bounce: false, temp: 3 });
    p.vy = 0; p.invuln = 2.5; p.dashT = 0; p.slam = false; p.ouchT = 0; p.shield = true; p.rocketT = 0; p.onGround = false; p.jumps = 1;
    if (mode === 'rush') timeLeft = Math.max(timeLeft, 12);
    state = 'play'; showScreen(null); Sound.music('game'); Sound.sfx('revive');
    screenPop('SECOND CHANCE!', '#7dff9a', 50);
  }

  function pauseGame() {
    if (state !== 'play') return;
    state = 'paused';
    $('btnFinish').style.display = mode === 'zen' ? '' : 'none';
    showScreen('pause'); Sound.music(null);
    downHeld = false; if (player) player.holding = false;
    pointers.clear();
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
      p.vy = -JUMP_V * springMul(); p.jumps = 1; p.sq = 0.3; Sound.sfx('jump'); dust(px, p.y, 5);
    } else {
      p.vy = -JUMP2_V * springMul(); p.jumps++; p.spin = 1; p.sq = 0.25; Sound.sfx('djump', p.jumps - 2);
      ring(px, p.y - 20, 'rgba(255,255,255,0.9)', 50);
    }
    p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.holdT = 0; p.slideT = 0; p.slam = false;
    buzz(8);
  }

  function doDash() {
    const p = player;
    if (state !== 'play' || p.dashT > 0) return;
    if (p.energy < dashCost()) { Sound.sfx('deny'); return; }
    p.energy -= dashCost(); p.dashT = 0.34; p.slam = false; p.slideT = 0; p.vy = 0;
    run.dashes++; save.stats.dashes++;
    Sound.sfx('dash'); buzz(25); shake(0.15, 5);
  }

  function pressDown() {
    if (state !== 'play') return;
    const p = player; downHeld = true;
    if (p.onGround) {
      if (p.slideT <= 0) { Sound.sfx('slide'); dust(camX + PX(), p.y, 4); }
      p.slideT = 0.55;
    } else if (!p.slam && p.rocketT <= 0) {
      p.slam = true; p.dashT = 0; p.vy = Math.max(p.vy, 1400); p.sq = 0.35;
      Sound.sfx('whoosh');
    }
  }
  function releaseDown() { downHeld = false; }

  function useAbility() {
    if (state !== 'play') return;
    if (abilCd > 0) { Sound.sfx('deny'); return; }
    const ab = abilDef(), p = player, px = camX + PX();
    switch (ab.id) {
      case 'bubble':
        p.shield = true; Sound.sfx('shield'); ring(px, p.y - 30, '#9fe8ff', 110); screenPop('BUBBLE!', '#9fe8ff', 38); break;
      case 'slow':
        slowT = 3.2; Sound.sfx('warp'); screenPop('TIME WARP!', '#b9a1ff', 42); break;
      case 'pulse':
        for (const c of coins) if (c.x < camX + lw + 120) c.mag = true;
        for (const b of babies) if (!b.taken && b.x < camX + lw + 60) rescue(b, px);
        for (const q of powers) if (!q.taken && q.x < camX + lw + 60) collectPower(q, px);
        ring(px, p.y - 30, '#ffd84a', 300); Sound.sfx('power'); screenPop('VACUUM!', '#ffd84a', 42); break;
      case 'bomb':
        ring(px, p.y - 30, '#ffffff', 380); ring(px, p.y - 30, '#ffd84a', 260);
        shake(0.5, 16); Sound.sfx('bomb'); buzz(80); freezeT = 0.08;
        for (const o of obs) {
          if (o.dead || o.x < px - 260 || o.x > px + 700 || Math.abs(o.y + o.h / 2 - (p.y - 30)) > 520) continue;
          if (o.type === 'crate' || o.type === 'grump' || o.type === 'ufo') smash(o, 'mega');
          else { o.dead = true; burst(o.x + o.w / 2, o.y + o.h / 2, '#cfd5e2', 12, 520, 10, 'square'); }
        }
        screenPop('BOOM!', '#ff8a4a', 54); break;
      case 'rocket':
        p.rocketT = 2.4; p.dashT = 0; p.slam = false; Sound.sfx('rocket'); shake(0.3, 8); screenPop('BLAST OFF!', '#ff8a4a', 48); break;
      case 'phase':
        p.phaseT = 3.2; Sound.sfx('warp'); screenPop('PHASE SHIFT!', '#d6ccff', 42); break;
      case 'call':
        for (let i = 0; i < 6; i++) squad.push({ color: BABY_COLORS[(squad.length + i) % BABY_COLORS.length], ph: Math.random() * 6 });
        run.maxSquad = Math.max(run.maxSquad, squad.length);
        Sound.sfx('rescue'); screenPop('SQUAD CALL! +6', '#7dff9a', 44); burst(px, p.y - 30, '#ff8fc8', 14, 450, 9, 'heart'); break;
    }
    buzz(30);
    abilMax = abilCd = ab.cd * cdrMul();
  }

  function addCoins(n) {
    coinAcc += n * coinMul();
    const add = Math.floor(coinAcc); coinAcc -= add;
    run.coins += add;
    if (mode === 'rush') timeLeft = Math.min(90, timeLeft + 0.18 * n);
  }

  function addCombo(x, y) {
    combo++; comboT = 2.4;
    run.bestCombo = Math.max(run.bestCombo, combo);
    const words = { 2: 'NICE!', 3: 'SWEET!', 4: 'GREAT!', 5: 'GUBTASTIC!', 7: 'SUPER GUB!', 10: 'UNSTOPPABLE!', 15: 'GUB GOD!' };
    if (words[combo]) { screenPop(words[combo], ['#ffd84a', '#ff8fc8', '#7cf2e6', '#7dff9a'][combo % 4], 52); Sound.sfx('combo', combo); }
    const pts = 50 * combo * (1 + squad.length);
    score += pts;
    worldPop('+' + fmt(pts), x, y, '#fff', 28);
  }

  const SMASHABLE = { crate: 1, grump: 1, ufo: 1, rock: 1 };
  function smash(o, why) {
    if (o.dead) return;
    o.dead = true;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    if (o.type === 'crate') {
      burst(cx, cy, '#e09a4f', 14, 520, 12, 'square'); burst(cx, cy, '#a8632b', 6, 400, 9, 'square');
      addCoins(3); save.stats.crates++;
      worldPop('+3', cx, cy - 30, '#ffd84a', 26);
    } else if (o.type === 'grump') { burst(cx, cy, '#e8455f', 16, 600, 12); save.stats.stomps++; }
    else if (o.type === 'ufo') { burst(cx, cy, '#9fe8ff', 16, 600, 11); save.stats.stomps++; }
    else burst(cx, cy, '#a6a2c4', 12, 500, 11, 'square');
    Sound.sfx('smash'); buzz(15);
    if (why !== 'mega') shake(0.12, 6);
    freezeT = Math.max(freezeT, 0.035);
    if (mode === 'rush') timeLeft = Math.min(90, timeLeft + 0.4);
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
    const p = player, m = slamMul();
    shake(0.28, 13); Sound.sfx('slam'); buzz(45);
    ring(px, p.y, 'rgba(255,255,255,0.95)', 170 * m);
    dust(px, p.y, 12);
    for (const o of obs) {
      if (o.dead || (o.type !== 'crate' && o.type !== 'grump' && o.type !== 'ufo')) continue;
      if (o.x + o.w > px - 200 * m && o.x < px + 260 * m && o.y + o.h > p.y - 170) smash(o, 'slam');
    }
    p.sq = -0.4;
  }

  function loseGubs() {
    const n = squad.length, lose = Math.max(1, Math.floor(n * 0.08));
    return squad.splice(n - Math.min(lose, n), Math.min(lose, n));
  }

  function hurt() {
    const p = player, px = camX + PX();
    if (p.invuln > 0 || p.dashT > 0 || p.megaT > 0 || p.phaseT > 0 || p.rocketT > 0) return;
    if (p.shield) {
      p.shield = false; p.invuln = 1.1;
      p.shieldRegen = [0, 0, 40, 20][lv('shield')];
      Sound.sfx('shield'); shake(0.2, 8); buzz(50);
      burst(px, p.y - 30, '#9fe8ff', 18, 600, 9);
      screenPop('SHIELD POP!', '#9fe8ff', 40);
      return;
    }
    if (squad.length) {
      const lost = loseGubs();
      p.invuln = 1.4; p.ouchT = 0.6;
      for (let i = 0; i < Math.min(6, lost.length); i++) {
        addPart({ x: px - 30 - i * 14, y: p.y - 20, vx: -(200 + Math.random() * 300), vy: -(700 + Math.random() * 400), life: 1.2, max: 1.2, size: 30, color: lost[i].color, g: 1800, shape: 'gub', rot: 0 });
      }
      Sound.sfx('hurt'); shake(0.3, 11); buzz(70); freezeT = 0.08;
      screenPop(squad.length ? 'OUCH! -' + lost.length + (lost.length > 1 ? ' GUBS' : ' GUB') : 'LAST CHANCE!', '#ff8f8f', 40);
      combo = 0;
      return;
    }
    if (mode === 'zen') {
      p.invuln = 1.2; p.ouchT = 0.6; Sound.sfx('hurt'); screenPop('BONK!', '#ff8f8f', 40); combo = 0;
      return;
    }
    die();
  }

  function pitFall() {
    lastHit = 'FELL';
    const p = player, px = camX + PX();
    if (p.shield || squad.length || mode === 'zen') {
      if (p.shield) { p.shield = false; p.shieldRegen = [0, 0, 40, 20][lv('shield')]; }
      else if (squad.length) {
        const g = squad.pop();
        addPart({ x: px, y: camY + H - 40, vx: (Math.random() - 0.5) * 200, vy: 400, life: 1, max: 1, size: 30, color: g.color, g: 1800, shape: 'gub', rot: 0 });
      }
      p.y = camY + H - 30; p.vy = -1900; p.jumps = 1; p.invuln = 1.4; p.slam = false; p.dashT = 0;
      Sound.sfx('djump'); shake(0.25, 10); buzz(60);
      screenPop('GUB BOOST!', '#7cf2e6', 44);
      ring(px, camY + H - 30, '#ffffff', 80);
      return;
    }
    die();
  }

  function rescue(b, px) {
    b.taken = true;
    squad.push({ color: b.color, ph: Math.random() * 6 });
    worldPop('+1 GUB!', b.x, b.y - 70, '#7dff9a', 30);
    run.rescued++; save.stats.rescued++;
    run.maxSquad = Math.max(run.maxSquad, squad.length);
    Sound.sfx('rescue'); buzz(20);
    if (mode === 'rush') timeLeft = Math.min(90, timeLeft + 1.5);
    burst(b.x, b.y - 20, '#ff8fc8', 10, 380, 9, 'heart');
    const n = squad.length;
    if (n === 5 || n === 10 || n === 25 || n === 50 || n === 100 || n === 250 || n === 500) screenPop('GUB SQUAD x' + (n + 1) + '!', '#ffd84a', 46);
  }

  function collectPower(pw, px) {
    pw.taken = true;
    const p = player, k = powerMul();
    run.powerups = (run.powerups || 0) + 1; save.stats.powerups++;
    Sound.sfx('power'); buzz(30);
    burst(pw.x, pw.y, '#ffffff', 16, 500, 9, 'star');
    const names = { magnet: 'COIN MAGNET!', shield: 'BUBBLE SHIELD!', double: 'DOUBLE COINS!', mega: 'MEGA GUB!', rocket: 'ROCKET!' };
    screenPop(names[pw.type], '#ffd84a', 46);
    if (pw.type === 'magnet') p.magnetT = 9 * k;
    else if (pw.type === 'shield') p.shield = true;
    else if (pw.type === 'double') p.doubleT = 10 * k;
    else if (pw.type === 'mega') { p.megaT = 6 * k; shake(0.3, 10); }
    else if (pw.type === 'rocket') { p.rocketT = 2.2 + 0.2 * lv('power'); p.dashT = 0; p.slam = false; Sound.sfx('rocket'); shake(0.3, 8); }
  }

  // ---------- update ----------
  function update(dt) {
    time += dt;
    updateAmbient(dt);
    if (shakeT > 0) shakeT -= dt;
    if (state === 'menu' || state === 'layout') { updateMenu(dt); updateParts(dt); return; }
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
    if (p.onGround && p.hopT <= 0) { p.vy = -(750 + Math.random() * 400); p.onGround = false; p.hopT = 0.5 + Math.random() * 1.1; p.sq = 0.3; if (Math.random() < 0.3) p.spin = 1; }
    p.vy += GRAV * dt; p.y += p.vy * dt;
    if (p.y >= GY) { if (!p.onGround) p.sq = -0.25; p.y = GY; p.vy = 0; p.onGround = true; }
    springs(p, dt);
    hist.push({ t: time, y: p.y });
    while (hist.length && hist[0].t < time - 2.4) hist.shift();
  }

  function springs(p, dt) {
    p.sqv += (-p.sq * 260 - p.sqv * 14) * dt;
    p.sq += p.sqv * dt;
    p.blinkT -= dt;
    if (p.blinkT < -0.12) p.blinkT = 1.5 + Math.random() * 2.5;
    if (p.spin > 0) { p.spin -= dt / 0.4; if (p.spin < 0) p.spin = 0; }
  }

  function surfaceUnder(px, prevB, newB, half) {
    let best = null;
    for (const o of obs) {
      if (o.dead || o.type !== 'wall') continue;
      if (px + half > o.x + 4 && px - half < o.x + o.w - 4 && prevB <= o.y + 2 && newB >= o.y) {
        if (best === null || o.y < best.y) best = { y: o.y, bounce: false };
      }
    }
    for (const pl of plats) {
      if (px + half > pl.x && px - half < pl.x + pl.w && prevB <= pl.y + 2 && newB >= pl.y) {
        if (best === null || pl.y < best.y) best = { y: pl.y, bounce: pl.bounce, pl };
      }
    }
    if (newB >= GY && prevB <= GY + 6 && overGround(px - half * 0.6, px + half * 0.6)) {
      if (best === null || GY < best.y) best = { y: GY, bounce: false };
    }
    return best;
  }

  function hitbox(o) {
    switch (o.type) {
      case 'spike': return { x: o.x + 10, y: o.y + 12, w: o.w - 20, h: o.h - 12 };
      case 'saw': return { x: o.x + 9, y: o.y + 9, w: o.w - 18, h: o.h - 18 };
      case 'grump': return { x: o.x + 6, y: o.y + 6, w: o.w - 12, h: o.h - 12 };
      case 'ufo': return { x: o.x + 8, y: o.y + 6, w: o.w - 16, h: o.h - 12 };
      case 'rock': return { x: o.x + 8, y: o.y + 8, w: o.w - 16, h: o.h - 16 };
      case 'crate': return { x: o.x + 2, y: o.y + 2, w: o.w - 4, h: o.h - 4 };
      default: return o;
    }
  }

  function updatePlay(dt) {
    const p = player;
    const rdt = dt;
    if (slowT > 0) { slowT -= rdt; dt = rdt * 0.5; }
    if (mode === 'rush') { timeLeft -= rdt; if (timeLeft <= 0) { timeLeft = 0; timeUp(); return; } }
    if (abilCd > 0) abilCd = Math.max(0, abilCd - rdt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.ouchT = Math.max(0, p.ouchT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    p.doubleT = Math.max(0, p.doubleT - dt);
    p.phaseT = Math.max(0, p.phaseT - dt);
    p.padCd = Math.max(0, p.padCd - dt);
    if (p.megaT > 0) { p.megaT -= dt; if (p.megaT <= 0) { p.megaT = 0; p.invuln = Math.max(p.invuln, 1); } }
    if (lv('shield') >= 2 && !p.shield && p.shieldRegen > 0) {
      p.shieldRegen -= dt;
      if (p.shieldRegen <= 0) { p.shield = true; Sound.sfx('shield'); screenPop('SHIELD BACK!', '#9fe8ff', 34); }
    }
    p.scale = lerp(p.scale, p.megaT > 0 ? 1.7 : 1, Math.min(1, dt * 8));
    p.energy = Math.min(100, p.energy + dashRegen() * dt);
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.slideT = Math.max(0, p.slideT - dt);
    if (downHeld && p.onGround) p.slideT = Math.max(p.slideT, 0.08);
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (coinStreakT > 0) { coinStreakT -= dt; if (coinStreakT <= 0) coinStreak = 0; }

    // swipe-mode holds count as a jump hold after a short press
    if (swipeMode()) {
      const now = performance.now();
      pointers.forEach(q => { if (q.role === 'swipe' && !q.fired && !q.jump && now - q.t0 > 140) { q.jump = true; pressJump(); } });
    }

    // speed & camera
    if (mode === 'sky') speed = 440 + 340 * (1 - Math.exp(-meters / 1500));
    else if (mode === 'zen') speed = 430 + 150 * (1 - Math.exp(-meters / 1500));
    else if (mode === 'rush') speed = 540 + 520 * (1 - Math.exp(-meters / 1800));
    else speed = 460 + 560 * (1 - Math.exp(-meters / 2200));
    Sound.setIntensity(clamp((speed - 460) / 560, 0, 1));
    const v = speed * (p.dashT > 0 ? 2.3 : 1) * (p.megaT > 0 ? 1.25 : 1) * (p.rocketT > 0 ? 1.15 : 1);
    const dx = v * dt;
    camX += dx;
    const dm = dx / METER;
    meters += dm;
    score += dm * (1 + squad.length);
    run.score = Math.floor(score); run.meters = Math.floor(meters);
    ensureGen();
    const px = camX + PX();

    if (autopilot) autoPlay(px, dt);

    // jumping (ground jump, coyote jump, or an air jump if the upgrade allows)
    if (p.jumpBuf > 0 && p.rocketT <= 0) {
      if (p.onGround || p.coyote > 0) doJump(1);
      else if (p.jumps < maxJumps()) doJump(2);
    }

    // vertical motion
    const prevY = p.y;
    p.prevY = prevY;
    const sf = spaceFac(p.y);
    let inWind = false;
    for (const wd of winds) {
      if (px > wd.x && px < wd.x + wd.w && p.y - 24 > wd.y && p.y - 24 < wd.y + wd.h) { inWind = true; break; }
    }
    if (p.rocketT > 0) {
      p.rocketT -= dt; p.vy = -1050; p.y += p.vy * dt; p.onGround = false; p.jumps = Math.max(p.jumps, 1); p.slam = false;
      if (Math.random() < dt * 60) addPart({ x: px - 6 + (Math.random() - 0.5) * 16, y: p.y + 4, vx: -60 - Math.random() * 80, vy: 260 + Math.random() * 200, life: 0.4, max: 0.4, size: 12 + Math.random() * 8, color: Math.random() < 0.5 ? '#ffd84a' : '#ff6a1a', g: 0, shape: 'circle' });
      if (p.rocketT <= 0) { p.rocketT = 0; p.vy = -500; p.invuln = Math.max(p.invuln, 1.2); p.jumps = 1; }
    } else if (p.dashT > 0) {
      p.dashT -= dt; p.vy = 0;
      if (p.dashT <= 0) p.invuln = Math.max(p.invuln, 0.25);
      p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostT = 0.03; p.ghosts.push({ x: px, y: p.y, life: 1 }); }
    } else {
      let g = GRAV * (1 - 0.4 * sf);
      if (p.vy < 0 && p.holding && p.holdT < 0.3) g *= 0.42;
      else if (p.vy > 0) g *= 1.12;
      p.holdT += dt;
      p.vy += g * dt;
      if (inWind) { p.vy += (-850 - p.vy) * Math.min(1, dt * 7); p.onGround = false; }
      else if (p.holding && p.vy > 0 && !p.slam && glideCap() > 0 && !p.onGround) p.vy = Math.min(p.vy, glideCap());
      if (p.slam) p.vy = Math.max(p.vy, 2200);
      p.vy = clamp(p.vy, -2600, 2400);
      p.y += p.vy * dt;
    }
    if (debugHover !== null) { p.y = debugHover; p.vy = 0; }
    for (const gh of p.ghosts) gh.life -= dt * 4;
    p.ghosts = p.ghosts.filter(gh => gh.life > 0);

    // landing
    let landed = false;
    if (p.vy >= 0 && p.rocketT <= 0) {
      const top = surfaceUnder(px, prevY, p.y, 18 * p.scale);
      if (top !== null) {
        const impact = p.vy;
        p.y = top.y;
        if (top.bounce) {
          p.vy = -PAD_V; p.onGround = false; p.jumps = 1; p.sq = 0.4; p.slam = false; p.spin = 0;
          Sound.sfx('spring'); buzz(25); ring(px, p.y, '#ff8fc8', 90);
          if (top.pl) top.pl.sq = 0.5;
        } else {
          if (!p.onGround) {
            if (p.slam) slamImpact(px);
            else if (impact > 900) { p.sq = -0.28; dust(px, top.y, 6); }
            else p.sq = -0.15;
            if (p.megaT > 0) shake(0.15, 7);
          }
          p.vy = 0; p.onGround = true; p.jumps = 0; p.coyote = 0.1; p.slam = false; p.spin = 0;
          landed = true;
        }
      }
    }
    if (!landed) {
      p.onGround = false; p.coyote = Math.max(0, p.coyote - dt);
      if (p.coyote <= 0 && p.jumps === 0) p.jumps = 1;
    }

    // launch pads on the ground
    for (const pd of pads) {
      if (pd.sq > 0) pd.sq -= dt * 3;
      if (p.padCd <= 0 && landed && px > pd.x && px < pd.x + pd.w && Math.abs(p.y - pd.y) < 10) {
        p.vy = -PAD_V; p.onGround = false; p.jumps = 1; p.padCd = 0.3; p.sq = 0.4; pd.sq = 1;
        Sound.sfx('spring'); buzz(25); ring(px, p.y, '#ffd84a', 90);
      }
    }
    for (const pl of plats) {
      if (pl.sq > 0) pl.sq -= dt * 3;
      if (pl.temp) { pl.temp -= dt; }
    }

    // fall off the bottom of the screen
    camUpdate(dt);
    if (debugHover === null && p.y > camY + H + 60) { pitFall(); if (state !== 'play') return; camUpdate(dt); }

    // altitude, zones
    const altU = Math.max(0, GY - p.y);
    skyAlt += (altU - skyAlt) * Math.min(1, dt * 2);
    const altM = Math.floor(altU / ALT_U);
    if (altM > run.maxAlt) { score += (altM - run.maxAlt) * 10 * (1 + squad.length); run.maxAlt = altM; }
    const zone = altM < 20 ? 0 : altM < 60 ? 1 : altM < 120 ? 2 : altM < 250 ? 3 : 4;
    if (zone > zoneMax) {
      zoneMax = zone;
      banner = { text: GD.ZONES[zone], sub: 'ENTERING', t: 0 };
      Sound.sfx('mission'); shake(0.2, 5);
    }

    // obstacle collisions
    const sliding = p.slideT > 0 && p.onGround;
    const pw = 40 * p.scale, ph = (sliding ? 26 : 48) * p.scale;
    const hx = px - pw / 2 + 6, hy = p.y - ph + 6, hw = pw - 12, hh = ph - 8;
    const falling = p.vy > 0 || landed;
    for (const o of obs) {
      if (o.dead || o.x > px + 300 || o.x + o.w < px - 200) continue;
      const b = hitbox(o);
      if (!(hx < b.x + b.w && hx + hw > b.x && hy < b.y + b.h && hy + hh > b.y)) continue;
      const smashable = SMASHABLE[o.type];
      if (p.megaT > 0) { smash(o, 'mega'); continue; }
      if (p.dashT > 0) { if (smashable) smash(o, 'dash'); continue; }
      if (p.phaseT > 0 || p.rocketT > 0) continue;
      if ((o.type === 'crate' || o.type === 'grump' || o.type === 'ufo') && falling && prevY <= o.y + 18) { stomp(o); continue; }
      lastHit = o.type; hurt();
      if (state !== 'play') return;
    }

    // coins
    const pcy = p.y - ph / 2, cr = 30 * p.scale + 16, mr = magnetPassive();
    const magR = p.magnetT > 0 ? 420 : mr;
    for (const c of coins) {
      if (c.taken || (c.x > px + 700 && !c.mag)) continue;
      let ddx = c.x - px, ddy = c.y - pcy;
      if (!c.mag && magR > 0 && ddx < magR && ddx > -120 && Math.abs(ddy) < magR) c.mag = true;
      if (c.mag) {
        const k = Math.min(1, dt * 11);
        c.x += (px - c.x) * k; c.y += (pcy - c.y) * k;
        ddx = c.x - px; ddy = c.y - pcy;
      }
      if (ddx * ddx + ddy * ddy < cr * cr) {
        c.taken = true;
        addCoins(p.doubleT > 0 ? 2 : 1); p.energy = Math.min(100, p.energy + 3);
        coinStreak++; coinStreakT = 0.45;
        Sound.sfx('coin', coinStreak);
        addPart({ x: c.x, y: c.y, vx: 0, vy: -60, life: 0.3, max: 0.3, size: 22, color: '#fff6b0', g: 0, shape: 'ring' });
      }
    }

    // babies & power-ups
    for (const b of babies) {
      if (!b.taken && Math.abs(b.x - px) < 40 * p.scale + 8 && Math.abs((b.y - 18) - pcy) < 56 * p.scale) rescue(b, px);
    }
    for (const pwr of powers) {
      if (!pwr.taken && Math.abs(pwr.x - px) < 52 * p.scale && Math.abs(pwr.y + Math.sin(time * 3 + pwr.ph) * 10 - pcy) < 60 * p.scale) collectPower(pwr, px);
    }

    // move hazards
    for (const o of obs) {
      if (o.type === 'grump' || o.type === 'ufo') { o.x += o.vx * dt; o.y = o.baseY + Math.sin(time * 3 + o.t) * o.amp; }
      else if (o.type === 'rock') { o.x += o.vx * dt; o.rot += dt * 0.8; o.y = o.cy - 32 + Math.sin(time * 1.5 + o.t) * 22; }
      else if (o.type === 'saw') { o.rot += dt * 9; if (o.amp) o.cy = o.baseCy + Math.sin(time * 2.4 + o.t) * o.amp; o.y = o.cy - o.r; }
    }

    // cleanup
    const left = camX - 300;
    obs = obs.filter(o => !o.dead && o.x + o.w > left);
    coins = coins.filter(c => !c.taken && c.x > left);
    babies = babies.filter(b => !b.taken && b.x > left);
    powers = powers.filter(q => !q.taken && q.x > left);
    plats = plats.filter(q => q.x + q.w > left && !(q.temp !== undefined && q.temp <= 0));
    pads = pads.filter(q => q.x + q.w > left);
    winds = winds.filter(q => q.x + q.w > left);
    while (segs.length > 1 && segs[0].x1 < camX - 600) segs.shift();

    // feel
    springs(p, dt);
    hist.push({ t: time, y: p.y });
    while (hist.length && hist[0].t < time - 2.4) hist.shift();
    emitTrail(px, p, dt);
    const au = auraDef();
    if (au.id !== 'none') {
      auraT += dt;
      if (Math.random() < dt * 18) {
        const col = au.c2 === 'prism' ? GU.hsl(time * 120 + Math.random() * 90, 95, 65) : au.c2;
        addPart({ x: px + (Math.random() - 0.5) * 60, y: p.y - 10 - Math.random() * 50, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 60, life: 0.7, max: 0.7, size: 7, color: col, g: 0, shape: au.shape, rot: 0 });
      }
    }
    const sk = skinDef();
    if (sk.sparkle && Math.random() < dt * 14) {
      addPart({ x: px + (Math.random() - 0.5) * 52, y: p.y - Math.random() * 50, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 60, life: 0.6, max: 0.6, size: 7, color: sk.sparkle, g: 0, shape: 'star', rot: 0 });
    }
    if (p.megaT > 0 && Math.random() < dt * 30) {
      addPart({ x: px - 30, y: p.y - 10 - Math.random() * 70, vx: -200 - Math.random() * 200, vy: (Math.random() - 0.5) * 80, life: 0.4, max: 0.4, size: 8, color: '#7dff9a', g: 0, shape: 'star', rot: 0 });
    }

    // biome banner
    if (mode !== 'sky') {
      const bi = Math.floor(meters / BIOME_LEN);
      if (bi !== lastBiome) {
        lastBiome = bi;
        banner = { text: BIOMES[bi % BIOMES.length].name, sub: 'ZONE ' + (bi + 1), t: 0 };
        Sound.sfx('mission');
      }
    }
    if (banner) { banner.t += dt; if (banner.t > 2.4) banner = null; }

    for (const th of tutHints) {
      if (!th.shown && th.x - px < lw * 0.6) { th.shown = true; hint = { text: th.text, t: 0 }; }
    }
    if (hint) { hint.t += dt; if (hint.t > 3.2) hint = null; }

    missionT -= dt;
    if (missionT <= 0) { missionT = 0.5; checkMissions(); }
  }

  function camUpdate(dt) {
    const p = player;
    const target = Math.min(0, p.y - 430);
    camY += (target - camY) * Math.min(1, dt * (4 + Math.abs(p.vy) / 350));
    camY = Math.min(camY, p.y - 150);
    camY = Math.max(camY, Math.min(0, p.y - (H - 130)));
    camY = Math.min(camY, 0);
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
  for (let i = 0; i < 46; i++) amb.push({ x: Math.random() * 2000, y: Math.random() * H, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6 });
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

  // ---------- autopilot (testing / attract) ----------
  function autoPlay(px, dt) {
    const p = player;
    autoHoldT -= dt; autoDownT -= dt;
    if (autoHoldT <= 0 && p.holding) p.holding = false;
    let threat = null, td = 1e9;
    for (const o of obs) {
      if (o.dead) continue;
      const d = o.x - (px + 20);
      if (d > -10 && d < speed * 0.32 && d < td && o.y + o.h > p.y - 140 && o.y < p.y + 20) { td = d; threat = o; }
    }
    if (threat) {
      if (threat.type === 'grump' && threat.baseY > GY - 120) { if (td < speed * 0.22) autoDownT = 0.25; }
      else if (threat.type === 'grump') { /* high grump: stay low */ }
      else if ((threat.type === 'crate' || threat.type === 'saw' || threat.type === 'rock' || threat.type === 'ufo') && p.energy >= dashCost() && td < speed * 0.14) doDash();
      else if (p.onGround && td < speed * 0.2) { pressJump(); autoHoldT = threat.type === 'wall' ? 0.25 : 0.12; }
    }
    const ahead = px + speed * 0.12;
    if (p.onGround && p.y >= GY - 1 && !overGround(ahead, ahead + 30)) { pressJump(); autoHoldT = 0.3; }
    if (!p.onGround && p.vy > 200 && p.y >= GY - 300 && !overGround(px - 10, px + 60) && p.jumps < maxJumps()) { pressJump(); autoHoldT = 0.3; }
    downHeld = autoDownT > 0;
    if (downHeld && p.onGround) p.slideT = Math.max(p.slideT, 0.1);
  }

  // =====================================================================
  //                              DRAWING
  // =====================================================================
  function drawShape(c, shape, x, y, size, color, rot, a) {
    c.globalAlpha = a == null ? 1 : a;
    if (shape === 'ring' || shape === 'bubble') {
      c.strokeStyle = color; c.lineWidth = shape === 'bubble' ? 2.5 : 4;
      c.beginPath(); c.arc(x, y, size, 0, TAU); c.stroke();
      if (shape === 'bubble') { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(x, y, size, 0, TAU); c.fill(); }
    } else if (shape === 'square') {
      c.save(); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = color; c.fillRect(-size / 2, -size / 2, size, size); c.restore();
    } else if (shape === 'star') {
      c.fillStyle = color; starPath(c, x, y, size, rot || 0, 4, 0.4); c.fill();
    } else if (shape === 'heart') {
      const s = size * 0.6; c.fillStyle = color;
      c.beginPath(); c.moveTo(x, y + s);
      c.bezierCurveTo(x - s * 2, y - s * 0.5, x - s * 0.6, y - s * 1.8, x, y - s * 0.6);
      c.bezierCurveTo(x + s * 0.6, y - s * 1.8, x + s * 2, y - s * 0.5, x, y + s);
      c.fill();
    } else {
      c.fillStyle = color; c.beginPath(); c.arc(x, y, size / 2, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
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
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    g.addColorStop(0, P.skyT); g.addColorStop(1, P.skyB);
    ctx.fillStyle = g; ctx.fillRect(-40, -40, lw + 80, H + 80);
    // nebula (deep space)
    if (P.deep > 0.02) {
      for (let i = 0; i < 3; i++) {
        const nx = ((hash(i + 300) * lw * 1.4 - camX * 0.01) % (lw + 400) + lw + 400) % (lw + 400) - 200;
        const ny = ((hash(i + 310) * 700 - camY * 0.04) % 800 + 800) % 800 - 40;
        const ng = ctx.createRadialGradient(nx, ny, 10, nx, ny, 280);
        const col = ['255,90,180', '90,180,255', '170,110,255'][i];
        ng.addColorStop(0, 'rgba(' + col + ',' + (0.3 * P.deep) + ')'); ng.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = ng; ctx.fillRect(nx - 290, ny - 290, 580, 580);
      }
    }
    if (P.night > 0) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 80; i++) {
        const x = ((hash(i * 7 + 1) * lw - camX * 0.01 * (1 + i % 3)) % lw + lw) % lw;
        const y = ((hash(i * 13 + 5) * H * 0.8 - camY * 0.02 * (1 + i % 3)) % (H * 0.8) + H * 0.8) % (H * 0.8);
        ctx.globalAlpha = P.night * (0.35 + 0.65 * Math.abs(Math.sin(time * 1.7 + i)));
        const s = 1.5 + hash(i * 3) * 2.5; ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
    }
    // shooting star
    if (P.space > 0.2) {
      const ph = (time * 0.35) % 1, id = Math.floor(time * 0.35);
      if (ph < 0.16) {
        const sx = hash(id) * lw, sy = hash(id + 9) * 250, k = ph / 0.16;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(sx + k * 300, sy + k * 160); ctx.lineTo(sx + k * 300 - 90, sy + k * 160 - 48); ctx.stroke();
      }
    }
    // sun
    const sa = clamp(1 - P.space * 2.6, 0, 1);
    if (sa > 0.02) {
      const sx = lw * 0.74, sy = 175 - camY * 0.12;
      ctx.globalAlpha = sa;
      const glow = ctx.createRadialGradient(sx, sy, 40, sx, sy, 170);
      glow.addColorStop(0, 'rgba(255,255,255,0.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(sx - 180, sy - 180, 360, 360);
      ctx.fillStyle = P.sun; ctx.beginPath(); ctx.arc(sx, sy, 66, 0, TAU); ctx.fill();
      if (P.idx === 2 || P.idx === 4) {
        ctx.fillStyle = P.skyB;
        for (let i = 0; i < 5; i++) ctx.fillRect(sx - 70, sy + 8 + i * 12, 140, 3 + i);
      }
      ctx.globalAlpha = 1;
    }
    // planets
    if (P.space > 0.12) {
      const a = clamp((P.space - 0.12) * 2, 0, 1);
      const cols = [['#ff8a6b', '#c44a62'], ['#6cc8ff', '#3a6fc4'], ['#ffd84a', '#d98a1a']];
      for (let i = 0; i < 3; i++) {
        const k = 0.05 * (i + 1);
        const x = ((hash(i + 200) * (lw + 300) - camX * 0.01 * (i + 1)) % (lw + 300) + lw + 300) % (lw + 300) - 150;
        const y = ((80 + hash(i + 210) * 380 - camY * k) % 900 + 900) % 900 - 120;
        const r = 36 + hash(i + 220) * 46;
        ctx.globalAlpha = a;
        const pg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        pg.addColorStop(0, cols[i][0]); pg.addColorStop(1, cols[i][1]);
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
        if (i === 1) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * 0.38, -0.4, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.arc(x + r * 0.25, y + r * 0.2, r * 0.18, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // clouds (fade out toward space); they stack up the sky as you climb
    const ca = clamp(1 - P.space * 2.4, 0, 1) * 0.92;
    if (ca > 0.03) {
      ctx.globalAlpha = ca; ctx.fillStyle = '#fff';
      const shift = -camY * 0.45, span = lw + 600;
      const j0 = Math.ceil((-80 - shift - 70) / 150), j1 = Math.min(1, Math.floor((H + 80 - shift - 70) / 150));
      for (let j = j0; j <= j1; j++) {
        const y = 70 + j * 150 + shift + hash(j + 90) * 60;
        const x = (((hash(j + 50) * span - camX * 0.05 - time * 10) % span) + span) % span - 300;
        const s = 40 + hash(j + 3) * 45;
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
  const pick2 = (k, a) => a[Math.floor(hash(k * 17 + 3) * a.length)];

  function drawHills() {
    const shift = -camY * 0.4;
    if (shift > H + 260) return;
    ctx.save(); ctx.translate(0, shift);
    let off = camX * 0.12;
    ctx.fillStyle = P.far; ctx.beginPath(); ctx.moveTo(-20, H + 600);
    for (let x = -20; x <= lw + 40; x += 30) ctx.lineTo(x, farY(x + off));
    ctx.lineTo(lw + 40, H + 600); ctx.closePath(); ctx.fill();
    if (P.idx === 3) {
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(-20, -600, lw + 60, 600 + GY - 215);
      ctx.restore();
    }
    off = camX * 0.35;
    const span = 260, start = Math.floor(off / span) - 1;
    for (let k = start; k < start + lw / span + 3; k++) {
      if (hash(k * 3 + 11) < 0.4) continue;
      const wx = k * span + hash(k) * 120, x = wx - off;
      drawDeco(P.idx, x, midY(wx) + 8, 0.7 + hash(k * 5) * 0.6, k);
    }
    ctx.fillStyle = P.mid; ctx.beginPath(); ctx.moveTo(-20, H + 600);
    for (let x = -20; x <= lw + 40; x += 24) ctx.lineTo(x, midY(x + off));
    ctx.lineTo(lw + 40, H + 600); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawDeco(idx, x, y, s, k) {
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(43,22,64,0.5)';
    if (idx === 0) {
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 3 * s, y - 80 * s, 6 * s, 80 * s);
      ctx.fillStyle = pick2(k, ['#ff8fc8', '#ffd84a', '#b07cff', '#7cf2e6']);
      ctx.beginPath(); ctx.arc(x, y - 92 * s, 26 * s, 0, TAU); ctx.fill(); ctx.stroke();
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
        ctx.beginPath(); ctx.arc(ddx, GY + 42 + hash(k * 7) * 70, 4 + hash(k * 3) * 5, 0, TAU); ctx.fill();
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
    const alt = GY - pl.y;
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    const sq = Math.max(0, pl.sq || 0);
    if (pl.bounce) {
      const cx = pl.x + pl.w / 2;
      ctx.strokeStyle = INK; ctx.lineWidth = 5;
      for (const f of [0.25, 0.5, 0.75]) {
        const sx = pl.x + pl.w * f; ctx.beginPath(); ctx.moveTo(sx, pl.y + 24);
        for (let i = 0; i < 4; i++) ctx.lineTo(sx + (i % 2 ? -8 : 8), pl.y + 26 + (i + 1) * 5 * (1 - sq * 0.6));
        ctx.stroke();
      }
      rr(ctx, pl.x, pl.y - 6 + sq * 6, pl.w, 24, 10); ctx.fillStyle = '#ff6fb1'; ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#ffe3f3';
      for (let x = pl.x + 18; x < pl.x + pl.w - 18; x += 36) { ctx.beginPath(); ctx.moveTo(x, pl.y + 10 + sq * 6); ctx.lineTo(x + 10, pl.y - 2 + sq * 6); ctx.lineTo(x + 20, pl.y + 10 + sq * 6); ctx.closePath(); ctx.fill(); }
      return;
    }
    if (alt < 450) {
      rr(ctx, pl.x, pl.y - 4, pl.w, 30, 12); ctx.fillStyle = P.dirt; ctx.fill(); ctx.stroke();
      rr(ctx, pl.x, pl.y - 4, pl.w, 13, 6); ctx.fillStyle = P.grass; ctx.fill(); ctx.stroke();
    } else if (alt < 3200) {
      const n = Math.max(3, Math.round(pl.w / 46));
      ctx.fillStyle = INK;
      for (let k = 0; k < n; k++) { const cx = pl.x + 20 + k * (pl.w - 40) / (n - 1), r = 20 + hash(k * 5 + (pl.x | 0)) * 6; ctx.beginPath(); ctx.arc(cx, pl.y + 6, r + 4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff';
      for (let k = 0; k < n; k++) { const cx = pl.x + 20 + k * (pl.w - 40) / (n - 1), r = 20 + hash(k * 5 + (pl.x | 0)) * 6; ctx.beginPath(); ctx.arc(cx, pl.y + 6, r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#dbe9fb'; ctx.fillRect(pl.x + 14, pl.y + 10, pl.w - 28, 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(pl.x + 14, pl.y + 4, pl.w - 28, 7);
    } else {
      rr(ctx, pl.x, pl.y - 4, pl.w, 34, 16); ctx.fillStyle = '#6b6f9a'; ctx.fill(); ctx.stroke();
      rr(ctx, pl.x + 3, pl.y - 2, pl.w - 6, 11, 5); ctx.fillStyle = '#a8adde'; ctx.fill();
      ctx.fillStyle = 'rgba(30,20,70,0.35)';
      for (let k = 0; k < Math.floor(pl.w / 60); k++) { ctx.beginPath(); ctx.ellipse(pl.x + 30 + k * 60, pl.y + 17, 11, 6, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(124,242,230,0.5)'; ctx.fillRect(pl.x + 16, pl.y + 30, pl.w - 32, 4);
    }
  }

  function drawPad(pd) {
    const sq = Math.max(0, pd.sq || 0), hgt = 26 * (1 - sq * 0.7), top = pd.y - 8 - hgt;
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    rr(ctx, pd.x, pd.y - 8, pd.w, 10, 4); ctx.fillStyle = '#5a4a70'; ctx.fill(); ctx.stroke();
    for (const f of [0.22, 0.5, 0.78]) {
      const sx = pd.x + pd.w * f; ctx.beginPath(); ctx.moveTo(sx, pd.y - 8);
      for (let i = 0; i < 4; i++) ctx.lineTo(sx + (i % 2 ? -9 : 9), pd.y - 8 - (i + 1) * hgt / 4);
      ctx.stroke();
    }
    rr(ctx, pd.x + 6, top - 12, pd.w - 12, 14, 6); ctx.fillStyle = '#ff4a5a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd84a';
    for (let x = pd.x + 22; x < pd.x + pd.w - 26; x += 30) { ctx.beginPath(); ctx.moveTo(x, top - 3); ctx.lineTo(x + 8, top - 10); ctx.lineTo(x + 16, top - 3); ctx.closePath(); ctx.fill(); }
  }

  function drawWind(wd) {
    const g = ctx.createLinearGradient(0, wd.y, 0, wd.y + wd.h);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.15, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(160,235,255,0.38)');
    ctx.fillStyle = g; ctx.fillRect(wd.x, wd.y, wd.w, wd.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const cx = wd.x + wd.w / 2;
    for (let k = 0; k < 6; k++) {
      const yy = wd.y + wd.h - ((time * 280 + k * (wd.h / 6)) % wd.h);
      const a = clamp(Math.min(yy - wd.y, wd.y + wd.h - yy) / 80, 0, 1);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(cx - 20, yy + 12); ctx.lineTo(cx, yy - 8); ctx.lineTo(cx + 20, yy + 12); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(wd.x, wd.y); ctx.lineTo(wd.x, wd.y + wd.h); ctx.moveTo(wd.x + wd.w, wd.y); ctx.lineTo(wd.x + wd.w, wd.y + wd.h); ctx.stroke();
    ctx.setLineDash([]);
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
      ctx.beginPath(); ctx.ellipse(cx, cy, 26, 23, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c42f4a';
      ctx.beginPath(); ctx.moveTo(cx - 14, cy - 18); ctx.lineTo(cx - 8, cy - 30); ctx.lineTo(cx - 2, cy - 21); ctx.lineTo(cx + 5, cy - 32); ctx.lineTo(cx + 10, cy - 19); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + s * 9 - 3, cy - 4, 7, 0, TAU); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx + s * 9 - 6, cy - 3, 3.5, 0, TAU); ctx.fill();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + s * 3 - 3, cy - 10); ctx.lineTo(cx + s * 16 - 3, cy - 15); ctx.stroke();
      }
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx - 3, cy + 12, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (o.type === 'ufo') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      ctx.fillStyle = 'rgba(160,235,255,0.85)'; ctx.beginPath(); ctx.ellipse(cx, cy - 8, 20, 18, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8f92b8'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 36, 13, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx - 6, cy - 12, 3, 0, TAU); ctx.arc(cx + 6, cy - 12, 3, 0, TAU); ctx.fill();
      for (let i = -1; i <= 1; i++) { ctx.fillStyle = Math.floor(time * 6 + i) % 2 ? '#ffd84a' : '#ff6fb1'; ctx.beginPath(); ctx.arc(cx + i * 20, cy + 5, 4, 0, TAU); ctx.fill(); }
    } else if (o.type === 'rock') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot);
      ctx.fillStyle = '#7c7aa6'; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, r = 28 + hash(o.seed * 9 + i) * 8; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(30,20,70,0.3)';
      ctx.beginPath(); ctx.arc(-8, -6, 7, 0, TAU); ctx.arc(10, 8, 5, 0, TAU); ctx.fill();
      ctx.restore();
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
        const a = i / 24 * TAU, rad = i % 2 ? r * 0.8 : r;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a92a8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4a5a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawWorld() {
    const px = camX + PX();
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGround();
    for (const wd of winds) if (wd.x < camX + lw + 50 && wd.x + wd.w > camX - 50) drawWind(wd);
    for (const pl of plats) if (pl.x < camX + lw + 50 && pl.x + pl.w > camX - 50) drawPlat(pl);
    for (const pd of pads) if (pd.x < camX + lw + 50 && pd.x + pd.w > camX - 50) drawPad(pd);
    for (const c of coins) if (c.x > camX - 40 && c.x < camX + lw + 40) drawCoin(ctx, c.x, c.y, 14, time * 5 + c.t);
    for (const pwr of powers) {
      if (pwr.x < camX - 60 || pwr.x > camX + lw + 60) continue;
      const y = pwr.y + Math.sin(time * 3 + pwr.ph) * 10, r = 30 + Math.sin(time * 6) * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pwr.x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      drawPowerIcon(ctx, pwr.type, pwr.x, y, r);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(pwr.x - r * 0.45, y - r * 0.45, 6, 4, -0.7, 0, TAU); ctx.fill();
    }
    for (const b of babies) {
      if (b.x < camX - 60 || b.x > camX + lw + 60) continue;
      const bob = Math.abs(Math.sin(time * 6 + b.ph)) * 10;
      drawGubby(ctx, b.x, b.y - bob, 34, { body: b.color, pat: 'belly', mouth: 'open', lookX: -0.7, sy: 1 + bob * 0.01, t: time });
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
    const n = squad.length;
    if (!n) return;
    const nd = Math.min(n, 120), sp = Math.min(30 * player.scale, 520 / nd);
    const spd = Math.max(300, state === 'play' ? speed : 300);
    const xs = new Array(nd), ys = new Array(nd);
    let k = hist.length - 1;
    for (let i = 0; i < nd; i++) {
      const dist = (i + 1) * sp + 22, delay = dist / spd;
      while (k > 0 && hist[k].t > time - delay) k--;
      ys[i] = hist.length ? hist[k].y : player.y;
      xs[i] = px - dist;
    }
    for (let i = nd - 1; i >= 0; i--) {
      const f = squad[n - 1 - i] || squad[i];
      const onG = ys[i] >= GY - 1 || false;
      const bob = onG ? Math.abs(Math.sin(time * 14 + f.ph)) * 6 : 0;
      if (i < 10 && onG && state !== 'dying') {
        ctx.fillStyle = 'rgba(20,10,40,0.2)'; ctx.beginPath(); ctx.ellipse(xs[i], ys[i] + 2, 13, 4, 0, 0, TAU); ctx.fill();
      }
      if (i < 14) drawGubby(ctx, xs[i], ys[i] - bob, 30, { body: f.color, pat: 'belly', mouth: onG ? 'smile' : 'open', lookX: 0.8, lookY: onG ? 0 : -0.5, blink: Math.sin(time * 0.9 + f.ph * 3) > 0.985, t: time });
      else drawMiniGub(ctx, xs[i], ys[i] - bob, 26, f.color);
    }
    if (n > nd) oText('+' + fmt(n - nd), px - nd * sp - 50, (hist.length ? hist[0].y : player.y) - 20, 22, '#fff', 'center');
  }

  function drawPlayer(px) {
    const p = player;
    if (!p || state === 'dying' || state === 'over') return;
    const sk = skinDef(), size = 56 * p.scale;
    if (p.y <= GY + 1 && overGround(px - 10, px + 10) && skinDef().pat !== 'ghost') {
      const kk = clamp(1 - (GY - p.y) / 420, 0.3, 1);
      ctx.fillStyle = 'rgba(20,10,40,0.25)'; ctx.beginPath(); ctx.ellipse(px, GY + 2, 26 * p.scale * kk, 6 * kk, 0, 0, TAU); ctx.fill();
    }
    const au = auraDef();
    if (au.id !== 'none') {
      const cy = p.y - 26 * p.scale, r = 70 * p.scale;
      const g = ctx.createRadialGradient(px, cy, 8, px, cy, r);
      const c1 = au.c1 === 'prism' ? GU.hsl(time * 120, 95, 65, 0.55) : au.c1;
      g.addColorStop(0, c1); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, cy, r, 0, TAU); ctx.fill();
    }
    for (const g of p.ghosts) drawGubby(ctx, g.x, g.y, size, Object.assign(skinOpts(sk, time), { alpha: g.life * 0.45, sx: 1.25, sy: 0.85, mouth: 'grin' }));
    let sx = 1 - p.sq * 0.55, sy = 1 + p.sq;
    if (!p.onGround) { const st = clamp(Math.abs(p.vy) / 9000, 0, 0.12); sy += st; sx -= st * 0.6; }
    if (p.slideT > 0 && p.onGround) { sx = 1.42; sy = 0.56; }
    if (p.dashT > 0) { sx = 1.3; sy = 0.82; }
    const flick = p.invuln > 0 && p.megaT <= 0 && Math.floor(time * 16) % 2 === 0;
    const mouth = p.ouchT > 0 ? 'ouch' : (p.dashT > 0 || p.megaT > 0 || p.rocketT > 0) ? 'grin' : p.slam ? 'o' : (!p.onGround && p.vy < -200) ? 'open' : (!p.onGround && p.vy > 700) ? 'o' : 'smile';
    if (p.megaT > 0) {
      ctx.fillStyle = 'rgba(125,255,154,0.25)';
      ctx.beginPath(); ctx.arc(px, p.y - size * 0.42, size * 0.75 + Math.sin(time * 20) * 4, 0, TAU); ctx.fill();
    }
    drawGubby(ctx, px, p.y, size, Object.assign(skinOpts(sk, time), {
      sx, sy, rot: p.spin > 0 ? (1 - p.spin) * TAU : 0,
      alpha: flick ? 0.35 : (p.phaseT > 0 ? 0.45 : 1), mouth, blink: p.blinkT < 0 && p.ouchT <= 0, lookX: 0.7, lookY: clamp(p.vy / 1200, -0.8, 0.8)
    }));
    if (p.rocketT > 0) {
      ctx.save(); ctx.translate(px - 4, p.y - 30 * p.scale);
      ctx.fillStyle = '#ff4a5a'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      rr(ctx, -24, -2, 12, 38, 5); ctx.fill(); ctx.stroke(); rr(ctx, 12, -2, 12, 38, 5); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (p.shield) {
      const r = 44 * p.scale + Math.sin(time * 5) * 2, cy = p.y - 26 * p.scale * sy;
      ctx.fillStyle = 'rgba(120,230,255,0.18)'; ctx.strokeStyle = 'rgba(160,240,255,0.95)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(px, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(px, cy, r - 8, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    }
  }

  function drawParts() {
    for (const q of parts) {
      const a = clamp(q.life / (q.max * 0.6), 0, 1);
      if (q.shape === 'ring') {
        const k = 1 - q.life / q.max;
        ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.3 + k), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (q.shape === 'gub') {
        drawGubby(ctx, q.x, q.y, q.size, { body: q.color, mouth: 'ouch', rot: q.rot, t: time });
      } else drawShape(ctx, q.shape, q.x, q.y, q.size, q.color, q.rot, a);
    }
    ctx.globalAlpha = 1;
  }

  function drawAmbient() {
    const type = P.amb;
    if (type === 'star' || type === 'none') return;
    for (const a of amb) {
      if (type === 'petal') {
        ctx.fillStyle = 'rgba(255,170,210,0.85)';
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(time * a.s + a.ph);
        ctx.beginPath(); ctx.ellipse(0, 0, 6 * a.s, 3.5 * a.s, 0, 0, TAU); ctx.fill(); ctx.restore();
      } else if (type === 'sand') {
        ctx.fillStyle = 'rgba(255,235,190,0.55)'; ctx.fillRect(a.x, a.y, 14 * a.s, 2);
      } else if (type === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(a.x, a.y, 3 * a.s, 0, TAU); ctx.fill();
      } else if (type === 'ember') {
        ctx.fillStyle = 'rgba(255,' + (120 + ((a.ph * 40) | 0)) + ',40,' + (0.5 + 0.5 * Math.sin(time * 5 + a.ph)) + ')';
        ctx.fillRect(a.x, a.y, 4 * a.s, 4 * a.s);
      }
    }
  }

  // ---------- controls layout ----------
  function getBtnPos() {
    const s = save.settings;
    if (s.layout === 'custom' && s.btnPos) {
      const bp = s.btnPos, f = k => ({ x: clamp(bp[k][0] * lw, 40, lw - 40), y: clamp(bp[k][1] * H, 40, H - 40) });
      return { dash: f('dash'), slide: f('slide'), abil: f('abil') };
    }
    if (s.layout === 'left') return { dash: { x: 122 + safeL, y: H - 118 }, slide: { x: 285 + safeL, y: H - 92 }, abil: { x: 250 + safeL, y: H - 238 } };
    if (s.layout === 'split') return { dash: { x: lw - 122 - safeR, y: H - 118 }, slide: { x: 130 + safeL, y: H - 108 }, abil: { x: lw - 122 - safeR, y: H - 270 } };
    return { dash: { x: lw - 122 - safeR, y: H - 118 }, slide: { x: lw - 285 - safeR, y: H - 92 }, abil: { x: lw - 250 - safeR, y: H - 238 } };
  }
  function btnLayout() {
    const pos = getBtnPos(), k = save.settings.btnSize || 1;
    return {
      dash: { x: pos.dash.x, y: pos.dash.y, r: 72 * k }, slide: { x: pos.slide.x, y: pos.slide.y, r: 58 * k },
      abil: { x: pos.abil.x, y: pos.abil.y, r: 58 * k }, pause: { x: lw - 50 - safeR, y: 50, r: 32 }
    };
  }

  function drawDashBtn(d, p, label) {
    const ready = p.energy >= dashCost();
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU);
    ctx.fillStyle = ready ? '#ffd84a' : 'rgba(255,255,255,0.35)'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * (p.energy / 100));
    ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = ready ? '#fff' : '#ffd84a'; ctx.lineWidth = 6; ctx.stroke();
    ctx.lineCap = 'butt';
    const s = d.r / 72;
    ctx.beginPath();
    ctx.moveTo(d.x + 0.12 * 54 * s, d.y - 8 * s - 0.5 * 54 * s); ctx.lineTo(d.x - 0.3 * 54 * s, d.y - 8 * s + 0.08 * 54 * s); ctx.lineTo(d.x - 0.02 * 54 * s, d.y - 8 * s + 0.08 * 54 * s);
    ctx.lineTo(d.x - 0.12 * 54 * s, d.y - 8 * s + 0.5 * 54 * s); ctx.lineTo(d.x + 0.3 * 54 * s, d.y - 8 * s - 0.1 * 54 * s); ctx.lineTo(d.x + 0.02 * 54 * s, d.y - 8 * s - 0.1 * 54 * s);
    ctx.closePath();
    ctx.fillStyle = ready ? '#fff' : 'rgba(255,255,255,0.7)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.globalAlpha = 1;
    oText(label || 'DASH', d.x, d.y + 40 * s, 20 * s, '#fff', 'center');
  }
  function drawSlideBtn(dn, onGround, pressed, label) {
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(dn.x, dn.y, dn.r, 0, TAU);
    ctx.fillStyle = pressed ? '#7cf2e6' : 'rgba(255,255,255,0.35)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.lineWidth = 4;
    const s = dn.r / 58;
    for (const o of [-14, 4]) {
      ctx.beginPath(); ctx.moveTo(dn.x - 20 * s, dn.y + (o - 8) * s); ctx.lineTo(dn.x, dn.y + (o + 8) * s); ctx.lineTo(dn.x + 20 * s, dn.y + (o - 8) * s); ctx.lineTo(dn.x + 20 * s, dn.y + (o - 16) * s); ctx.lineTo(dn.x, dn.y + o * s); ctx.lineTo(dn.x - 20 * s, dn.y + (o - 16) * s); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    oText(label || (onGround ? 'SLIDE' : 'SLAM'), dn.x, dn.y + 34 * s, 18 * s, '#fff', 'center');
  }
  function drawAbilBtn(b, ready, frac) {
    const ab = abilDef();
    ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = ready ? '#b07cff' : 'rgba(255,255,255,0.35)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    drawAbilityIcon(ctx, ab.id, b.x, b.y - 4, b.r * 0.78);
    if (!ready) {
      ctx.fillStyle = 'rgba(43,22,64,0.55)';
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 7 + Math.sin(time * 8) * 2, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- HUD ----------
  function drawHUD() {
    const p = player, L = 26 + safeL, B = btnLayout();
    oText(fmt(score), L, 50, 48, '#fff');
    oText(fmt(meters) + ' m', L, 94, 24, '#fff5c2');
    let yy = 128;
    const altM = Math.floor(Math.max(0, GY - p.y) / ALT_U);
    if (run.maxAlt > 2 || altM > 2) { oText('ALT ' + fmt(altM) + ' m', L, yy, 24, '#9fe8ff'); yy += 32; }
    yy += 8;
    const timers = [['magnet', p.magnetT, 9 * powerMul()], ['double', p.doubleT, 10 * powerMul()], ['mega', p.megaT, 6 * powerMul()]];
    for (const [type, t, max] of timers) {
      if (t <= 0) continue;
      drawPowerIcon(ctx, type, L + 16, yy, 22);
      rr(ctx, L + 40, yy - 8, 110, 16, 8); ctx.fillStyle = 'rgba(43,22,64,0.5)'; ctx.fill();
      rr(ctx, L + 40, yy - 8, 110 * clamp(t / max, 0, 1), 16, 8); ctx.fillStyle = '#ffd84a'; ctx.fill();
      yy += 40;
    }
    if (p.shield) { drawPowerIcon(ctx, 'shield', L + 16, yy, 22); yy += 40; }
    if (slowT > 0) { oText('SLOW', L, yy, 22, '#b9a1ff'); yy += 30; }

    const n = squad.length;
    if (n > 0) {
      const pulse = 1 + Math.max(0, Math.sin(time * 8)) * 0.04;
      oText('x' + fmt(n + 1), lw / 2, 46, Math.round(46 * pulse), '#ffd84a', 'center');
      const nd = Math.min(n, 10);
      for (let i = 0; i < nd; i++) {
        const x = lw / 2 - (nd - 1) * 12 + i * 24;
        ctx.fillStyle = squad[i].color; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, 88, 9, 0, TAU); ctx.fill(); ctx.stroke();
      }
      if (n > 10) oText('+' + fmt(n - 10), lw / 2 + nd * 12 + 22, 88, 20, '#fff', 'left');
    }
    if (combo >= 2) oText('COMBO x' + combo, lw / 2, n ? 124 : 50, 26, '#7cf2e6', 'center', clamp(comboT, 0, 1));

    if (mode === 'rush') {
      const low = timeLeft < 10;
      oText(Math.ceil(timeLeft) + 's', lw / 2 + (n ? 190 : 0), n ? 46 : 100, low ? 54 + Math.sin(time * 12) * 4 : 48, low ? '#ff6f6f' : '#fff', 'center');
    }
    if (mode === 'zen') oText('ZEN', lw / 2, n ? 150 : 100, 22, '#d6ccff', 'center');

    drawCoin(ctx, B.pause.x - 170, 50, 17, time * 3);
    oText(fmt(run.coins), B.pause.x - 146, 52, 34, '#ffd84a');
    ctx.fillStyle = 'rgba(255,247,234,0.92)'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(B.pause.x, B.pause.y, B.pause.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(B.pause.x - 11, B.pause.y - 12, 8, 24); ctx.fillRect(B.pause.x + 3, B.pause.y - 12, 8, 24);

    const ready = abilCd <= 0, frac = abilMax > 0 ? clamp(1 - abilCd / abilMax, 0, 1) : 1;
    if (!swipeMode()) {
      drawDashBtn(B.dash, p);
      drawSlideBtn(B.slide, p.onGround, downHeld);
      drawAbilBtn(B.abil, ready, frac);
    } else {
      // swipe mode: compact status instead of buttons
      const bx = lw / 2, by = H - 36;
      rr(ctx, bx - 170, by - 10, 190, 20, 10); ctx.fillStyle = 'rgba(43,22,64,0.55)'; ctx.fill();
      rr(ctx, bx - 170, by - 10, 190 * clamp(p.energy / 100, 0, 1), 20, 10); ctx.fillStyle = p.energy >= dashCost() ? '#ffd84a' : '#d9a441'; ctx.fill();
      oText('DASH', bx - 76, by, 15, '#fff', 'center');
      drawAbilBtn({ x: bx + 70, y: by - 6, r: 30 }, ready, frac);
    }
  }

  function drawLayoutEditor() {
    const B = btnLayout(), p = player;
    ctx.fillStyle = 'rgba(43,22,64,0.35)'; ctx.fillRect(0, 0, lw, H);
    ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    for (const k of ['dash', 'slide', 'abil']) { ctx.beginPath(); ctx.arc(B[k].x, B[k].y, B[k].r + 16, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    drawDashBtn(B.dash, { energy: 100 });
    drawSlideBtn(B.slide, true, false, 'SLIDE');
    drawAbilBtn(B.abil, true, 1);
    oText('TAP ANYWHERE TO JUMP', lw / 2, H / 2 + 20, 28, '#fff', 'center', 0.8);
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
        const y = Math.random() * H, x = Math.random() * lw, l = 80 + Math.random() * 140;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y); ctx.stroke();
      }
    }
    if (player && player.rocketT > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) { const x = Math.random() * lw, y = Math.random() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 90 + Math.random() * 100); ctx.stroke(); }
    }
    if (slowT > 0) { ctx.fillStyle = 'rgba(120,90,200,0.14)'; ctx.fillRect(0, 0, lw, H); }
  }

  function draw() {
    computePalette();
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    ctx.save();
    if (shakeT > 0) { const m = shakeMag * clamp(shakeT / shakeDur, 0, 1); ctx.translate((Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m); }
    drawSky();
    drawHills();
    drawAmbient();
    drawWorld();
    ctx.restore();
    if (state === 'play' || state === 'dying' || state === 'paused') drawHUD();
    if (state === 'layout') drawLayoutEditor();
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
  //                              INPUT
  // =====================================================================
  const pointers = new Map();
  const d2 = (x, y, b) => (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y);
  const near = (x, y, b, k) => d2(x, y, b) < Math.pow(b.r * k, 2);
  let dragBtn = null;

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.init();
    const x = e.clientX / sc, y = e.clientY / sc;
    if (state === 'layout') {
      const B = btnLayout(); let best = null, bd = 1e9;
      for (const k of ['dash', 'slide', 'abil']) { const d = d2(x, y, B[k]); if (d < Math.pow(B[k].r * 1.5, 2) && d < bd) { bd = d; best = k; } }
      if (best) {
        if (save.settings.layout !== 'custom') {
          const pos = getBtnPos();
          save.settings.btnPos = { dash: [pos.dash.x / lw, pos.dash.y / H], slide: [pos.slide.x / lw, pos.slide.y / H], abil: [pos.abil.x / lw, pos.abil.y / H] };
          save.settings.layout = 'custom';
        }
        dragBtn = { k: best, id: e.pointerId };
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
      return;
    }
    if (state !== 'play') return;
    const B = btnLayout();
    if (near(x, y, B.pause, 1.5)) { pauseGame(); return; }
    if (!swipeMode()) {
      let role = 'jump';
      if (near(x, y, B.dash, 1.3)) role = 'dash';
      else if (near(x, y, B.slide, 1.3)) role = 'down';
      else if (near(x, y, B.abil, 1.3)) role = 'abil';
      pointers.set(e.pointerId, { role });
      if (role === 'jump') pressJump(); else if (role === 'dash') doDash(); else if (role === 'down') pressDown(); else useAbility();
    } else {
      pointers.set(e.pointerId, { role: 'swipe', x0: x, y0: y, t0: performance.now(), fired: false, jump: false, down: false });
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', e => {
    const x = e.clientX / sc, y = e.clientY / sc;
    if (state === 'layout' && dragBtn && dragBtn.id === e.pointerId) {
      const bp = save.settings.btnPos;
      bp[dragBtn.k] = [clamp(x, 40, lw - 40) / lw, clamp(y, 40, H - 40) / H];
      return;
    }
    const q = pointers.get(e.pointerId);
    if (!q || q.role !== 'swipe' || state !== 'play') return;
    const dx = x - q.x0, dy = y - q.y0, T = 38 / sc;
    if (Math.abs(dx) < T && Math.abs(dy) < T) return;
    q.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) doDash(); else useAbility();
    } else if (dy < 0) { if (!q.jump) { q.jump = true; pressJump(); } else if (player) player.jumpBuf = 0.13; }
    else { q.down = true; pressDown(); }
    q.x0 = x; q.y0 = y;
  });
  function recompute() {
    let jumpHeld = false, downStill = false;
    pointers.forEach(o => { if (o.role === 'jump' || (o.role === 'swipe' && o.jump)) jumpHeld = true; if (o.role === 'down' || (o.role === 'swipe' && o.down)) downStill = true; });
    if (!jumpHeld) releaseJump();
    if (!downStill) releaseDown();
  }
  function endPointer(e) {
    if (state === 'layout' && dragBtn && dragBtn.id === e.pointerId) { dragBtn = null; persist(); return; }
    const q = pointers.get(e.pointerId);
    if (!q) return;
    pointers.delete(e.pointerId);
    if (q.role === 'swipe' && !q.fired && !q.jump && state === 'play') { pressJump(); }
    recompute();
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
      else if (k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ' || k === 'KeyE') { e.preventDefault(); useAbility(); }
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
  //                           DOM MENUS
  // =====================================================================
  const SCREENS = ['menu', 'modes', 'shop', 'missions', 'settings', 'layout', 'pause', 'over'];
  function showScreen(id) {
    for (const s of SCREENS) $(s).classList.toggle('show', s === id);
    if (id !== 'shop') stopPreviews();
  }
  function shakeEl(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  let toastT = 0;
  function toast(msg) {
    const el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800);
  }
  function updateMenuStats() {
    $('menuBest').textContent = fmt(getBest(save.mode));
    $('menuCoins').textContent = fmt(save.coins);
    $('btnMode').textContent = 'MODE: ' + modeDef(save.mode).name;
    const g = giftReady();
    $('giftBtn').style.display = g ? '' : 'none';
  }
  function click() { Sound.init(); Sound.sfx('click'); buzz(10); }

  // logo letters
  const LOGO_COLORS = ['#5ee07a', '#ff8fc8', '#ffd84a', '#6cc8ff'];
  'GUBS'.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.setProperty('--c', LOGO_COLORS[i]);
    s.style.setProperty('--i', i);
    s.style.setProperty('--r', (i % 2 ? 4 : -4) + 'deg');
    $('logo').appendChild(s);
  });

  // ---- daily gift ----
  function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  const giftReady = () => save.gift.last !== dateStr();
  function claimGift() {
    if (!giftReady()) return;
    const streak = save.gift.last === yesterdayStr() ? save.gift.streak + 1 : 1;
    const reward = 50 + 25 * Math.min(streak - 1, 8);
    save.gift = { last: dateStr(), streak }; save.coins += reward; persist();
    Sound.init(); Sound.sfx('gift'); buzz(40);
    toast('DAILY GIFT  +' + reward + ' coins  (day ' + streak + ')');
    updateMenuStats();
  }

  // ---- buttons ----
  $('btnPlay').addEventListener('click', () => { click(); startRun(save.mode); });
  $('btnMode').addEventListener('click', () => { click(); renderModes(); showScreen('modes'); });
  $('giftBtn').addEventListener('click', claimGift);
  $('btnShop').addEventListener('click', () => { click(); shopTab = 'daily'; renderShop(); showScreen('shop'); });
  $('btnMissions').addEventListener('click', () => { click(); renderMissions(); showScreen('missions'); });
  $('btnSettings').addEventListener('click', () => { click(); renderSettings(); showScreen('settings'); });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { click(); updateMenuStats(); showScreen('menu'); }));
  $('btnResume').addEventListener('click', () => { click(); resumeGame(); });
  $('btnRestart').addEventListener('click', () => { click(); bankRun(); startRun(mode); });
  $('btnHome').addEventListener('click', () => { click(); bankRun(); enterMenu(); });
  $('btnFinish').addEventListener('click', () => { click(); state = 'dying'; dieT = 2; finishRun(); });
  $('btnAgain').addEventListener('click', () => { click(); startRun(mode); });
  $('btnOverHome').addEventListener('click', () => { click(); enterMenu(); });
  $('btnRevive').addEventListener('click', () => { Sound.init(); revive(); });
  $('btnTutorial').addEventListener('click', () => { click(); save.tutorial = false; persist(); startRun('classic'); });

  // ---- modes ----
  function renderModes() {
    const g = $('modeGrid'); g.innerHTML = '';
    for (const m of GD.MODES) {
      const b = document.createElement('button');
      b.className = 'mode'; b.style.setProperty('--mc', m.c);
      const best = m.id === 'zen' ? 'No score - just vibes' : 'BEST ' + fmt(getBest(m.id));
      b.innerHTML = '<div class="mh"></div><div class="mb"></div><div class="mbest"></div>';
      b.children[0].textContent = m.name; b.children[1].textContent = m.desc; b.children[2].textContent = best;
      b.addEventListener('click', () => { click(); startRun(m.id); });
      g.appendChild(b);
    }
  }

  // ---- shop ----
  let shopTab = 'daily', previews = [], previewRAF = 0;
  function stopPreviews() { previews = []; if (previewRAF) { cancelAnimationFrame(previewRAF); previewRAF = 0; } }
  function startPreviews() {
    if (previewRAF) return;
    const loop = () => {
      if (!previews.length) { previewRAF = 0; return; }
      const t = performance.now() / 1000;
      for (const f of previews) f(t);
      previewRAF = requestAnimationFrame(loop);
    };
    previewRAF = requestAnimationFrame(loop);
  }
  function makeCanvas(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
    const c2 = cv.getContext('2d');
    previews.push(t => { c2.setTransform(2, 0, 0, 2, 0, 0); c2.clearRect(0, 0, w, h); draw(c2, t, w, h); });
    return cv;
  }

  function ensureDaily(force) {
    const day = dateStr();
    if (force || !save.shopDay || save.shopDay.day !== day) {
      const salt = force ? (save.shopDay ? save.shopDay.salt + 1 : 1) : 0;
      const rng = mulberry32(strHash(day + '#' + salt));
      const pool = GD.SKINS.filter(s => s.price > 0 && !save.owned.includes(s.id)), picked = [];
      const take = rars => {
        const c = pool.filter(s => rars.includes(s.rarity) && !picked.includes(s.id));
        return c.length ? c[Math.floor(rng() * c.length)].id : null;
      };
      for (const rars of [['common'], ['common', 'rare'], ['rare'], ['epic'], ['epic', 'legendary'], ['legendary']]) {
        const id = take(rars) || take(['common', 'rare', 'epic', 'legendary']);
        if (id) picked.push(id);
      }
      const leg = picked.filter(id => GD.SKINS.find(s => s.id === id).rarity === 'legendary');
      save.shopDay = { day, salt, ids: picked, deal: leg.length ? leg[leg.length - 1] : picked[picked.length - 1] };
      persist();
    }
    return save.shopDay;
  }
  function untilReset() {
    const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
    const mins = Math.floor((m - n) / 60000);
    return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
  }

  function rarityStyle(el, rar) { el.style.setProperty('--rc', GD.RARITY[rar].color); }

  function skinCard(sk, price, isDeal) {
    const owned = save.owned.includes(sk.id), eq = save.skin === sk.id;
    const card = document.createElement('div');
    card.className = 'card' + (eq ? ' equipped' : '') + (owned ? ' owned' : '');
    rarityStyle(card, sk.rarity);
    const tag = document.createElement('div'); tag.className = 'rtag'; tag.textContent = GD.RARITY[sk.rarity].name; card.appendChild(tag);
    if (isDeal && !owned) { const d = document.createElement('div'); d.className = 'deal'; d.textContent = '-25%'; card.appendChild(d); }
    const rc = GD.RARITY[sk.rarity].color;
    card.appendChild(makeCanvas(120, 100, (c2, t) => {
      if (sk.rarity === 'epic' || sk.rarity === 'legendary') {
        const g = c2.createRadialGradient(60, 56, 6, 60, 56, 56); g.addColorStop(0, rc + '66'); g.addColorStop(1, rc + '00');
        c2.fillStyle = g; c2.fillRect(0, 0, 120, 100);
      }
      const bob = Math.abs(Math.sin(t * 3)) * (eq ? 5 : 0);
      drawGubby(c2, 60, 92 - bob, 74, Object.assign(skinOpts(sk, t), { mouth: owned ? 'grin' : 'smile', lookX: 0.2 }));
    }));
    const name = document.createElement('div'); name.className = 'cname'; name.textContent = sk.name; card.appendChild(name);
    const b = document.createElement('button');
    b.className = 'btn small ' + (eq ? 'ghost' : owned ? 'green' : 'yellow');
    if (eq) b.textContent = 'EQUIPPED';
    else if (owned) b.textContent = 'EQUIP';
    else { b.innerHTML = '<span class="coin"></span>'; b.appendChild(document.createTextNode(fmt(price))); }
    if (!owned && save.coins < price) b.classList.add('locked');
    b.addEventListener('click', () => {
      Sound.init();
      if (eq) return;
      if (owned) { save.skin = sk.id; persist(); Sound.sfx('click'); renderShop(); }
      else if (save.coins >= price) {
        save.coins -= price; save.owned.push(sk.id); save.skin = sk.id; persist();
        Sound.sfx('buy'); buzz(30); toast('NEW GUB!  ' + sk.name); renderShop(); updateMenuStats();
      } else { Sound.sfx('deny'); shakeEl(b); }
    });
    card.appendChild(b);
    return card;
  }

  function renderShop() {
    stopPreviews();
    $('shopCoins').textContent = fmt(save.coins);
    document.querySelectorAll('#shopTabs .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === shopTab));
    const body = $('shopBody'); body.innerHTML = '';
    if (shopTab === 'daily') {
      const d = ensureDaily(false);
      const head = document.createElement('div'); head.className = 'dailyhead';
      const left = document.createElement('div'); left.textContent = 'New Gubs in ' + untilReset();
      const rb = document.createElement('button'); rb.className = 'btn small purple'; rb.innerHTML = 'REROLL <span class="coin"></span>250';
      if (save.coins < 250) rb.classList.add('locked');
      rb.addEventListener('click', () => {
        Sound.init();
        if (save.coins < 250) { Sound.sfx('deny'); shakeEl(rb); return; }
        save.coins -= 250; ensureDaily(true); persist(); Sound.sfx('buy'); renderShop(); updateMenuStats();
      });
      head.append(left, rb); body.appendChild(head);
      const grid = document.createElement('div'); grid.className = 'grid';
      if (!d.ids.length) { const n = document.createElement('p'); n.className = 'note'; n.textContent = 'You own every Gub in the shop! Legend!'; body.appendChild(n); }
      for (const id of d.ids) {
        const sk = GD.SKINS.find(s => s.id === id), deal = id === d.deal;
        grid.appendChild(skinCard(sk, deal ? Math.round(sk.price * 0.75) : sk.price, deal));
      }
      body.appendChild(grid);
      const note = document.createElement('p'); note.className = 'note';
      note.textContent = 'Collected ' + save.owned.length + ' / ' + GD.SKINS.length + ' Gubs. Come back tomorrow for new ones!';
      body.appendChild(note);
    } else if (shopTab === 'mine') {
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const sk of GD.SKINS) if (save.owned.includes(sk.id)) grid.appendChild(skinCard(sk, sk.price, false));
      body.appendChild(grid);
      const note = document.createElement('p'); note.className = 'note';
      note.textContent = 'Collected ' + save.owned.length + ' / ' + GD.SKINS.length + ' Gubs.';
      body.appendChild(note);
    } else if (shopTab === 'upgrades') {
      for (const u of GD.UPGRADES) {
        const l = lv(u.id), row = document.createElement('div'); row.className = 'urow';
        const info = document.createElement('div'); info.className = 'info';
        const nm = document.createElement('div'); nm.className = 'uname'; nm.textContent = u.name;
        const ds = document.createElement('div'); ds.className = 'udesc'; ds.textContent = u.desc;
        const ef = document.createElement('div'); ef.className = 'ueff';
        ef.textContent = u.eff[l] + (l < u.max ? '   >   ' + u.eff[l + 1] : '   (MAX)');
        const pips = document.createElement('div'); pips.className = 'pips';
        for (let i = 0; i < u.max; i++) { const p = document.createElement('i'); if (i < l) p.className = 'f'; pips.appendChild(p); }
        info.append(nm, ds, ef, pips);
        const b = document.createElement('button');
        if (l >= u.max) { b.className = 'btn small ghost'; b.textContent = 'MAXED'; }
        else {
          const cost = u.costs[l];
          b.className = 'btn small yellow' + (save.coins < cost ? ' locked' : '');
          b.innerHTML = '<span class="coin"></span>'; b.appendChild(document.createTextNode(fmt(cost)));
          b.addEventListener('click', () => {
            Sound.init();
            if (save.coins < cost) { Sound.sfx('deny'); shakeEl(b); return; }
            save.coins -= cost; save.upg[u.id] = l + 1; persist(); Sound.sfx('buy'); buzz(30);
            toast(u.name + ' -> ' + u.eff[l + 1]); renderShop(); updateMenuStats();
          });
        }
        row.append(info, b); body.appendChild(row);
      }
    } else if (shopTab === 'abilities') {
      const note = document.createElement('p'); note.className = 'note'; note.textContent = 'One ability at a time. Tap the purple button (or swipe LEFT) to use it!';
      body.appendChild(note);
      for (const ab of GD.ABILITIES) {
        const owned = save.abilities.includes(ab.id), eq = save.ability === ab.id;
        const row = document.createElement('div'); row.className = 'urow' + (eq ? ' equipped' : '');
        const cv = makeCanvas(60, 60, (c2, t) => {
          c2.fillStyle = '#b07cff'; c2.strokeStyle = INK; c2.lineWidth = 3; c2.beginPath(); c2.arc(30, 30, 26, 0, TAU); c2.fill(); c2.stroke();
          drawAbilityIcon(c2, ab.id, 30, 28, 22);
        });
        const info = document.createElement('div'); info.className = 'info';
        const nm = document.createElement('div'); nm.className = 'uname'; nm.textContent = ab.name;
        const ds = document.createElement('div'); ds.className = 'udesc'; ds.textContent = ab.desc + '  Recharge: ' + Math.round(ab.cd * cdrMul()) + 's';
        info.append(nm, ds);
        const b = document.createElement('button');
        if (eq) { b.className = 'btn small ghost'; b.textContent = 'EQUIPPED'; }
        else if (owned) { b.className = 'btn small green'; b.textContent = 'EQUIP'; b.addEventListener('click', () => { Sound.init(); save.ability = ab.id; persist(); Sound.sfx('click'); renderShop(); }); }
        else {
          b.className = 'btn small yellow' + (save.coins < ab.price ? ' locked' : '');
          b.innerHTML = '<span class="coin"></span>'; b.appendChild(document.createTextNode(fmt(ab.price)));
          b.addEventListener('click', () => {
            Sound.init();
            if (save.coins < ab.price) { Sound.sfx('deny'); shakeEl(b); return; }
            save.coins -= ab.price; save.abilities.push(ab.id); save.ability = ab.id; persist(); Sound.sfx('buy'); buzz(30);
            toast('NEW ABILITY!  ' + ab.name); renderShop(); updateMenuStats();
          });
        }
        row.append(cv, info, b); body.appendChild(row);
      }
    } else if (shopTab === 'style') {
      const sec1 = document.createElement('div'); sec1.className = 'sec'; sec1.textContent = 'TRAILS'; body.appendChild(sec1);
      const g1 = document.createElement('div'); g1.className = 'grid';
      for (const tr of GD.TRAILS) g1.appendChild(styleCard(tr, 'trail', 'trails'));
      body.appendChild(g1);
      const sec2 = document.createElement('div'); sec2.className = 'sec'; sec2.textContent = 'AURAS'; body.appendChild(sec2);
      const g2 = document.createElement('div'); g2.className = 'grid';
      for (const au of GD.AURAS) g2.appendChild(styleCard(au, 'aura', 'auras'));
      body.appendChild(g2);
    }
    startPreviews();
  }

  function styleCard(item, key, listKey) {
    const owned = save[listKey].includes(item.id), eq = save[key] === item.id;
    const card = document.createElement('div'); card.className = 'card' + (eq ? ' equipped' : '');
    card.appendChild(makeCanvas(120, 100, (c2, t) => {
      if (key === 'trail' && item.shape) {
        for (let i = 0; i < 12; i++) {
          const x = 74 - i * 5.5, y = 78 + Math.sin(t * 5 + i * 0.6) * 9 - (item.rise ? i * 1.2 : item.fall ? -i : 0);
          const col = item.colors[i % item.colors.length], a = 1 - i / 13;
          drawShape(c2, item.shape, x, y, item.size * (0.55 + (1 - i / 12) * 0.5), col, t * 3 + i, a);
        }
      }
      if (key === 'aura' && item.c1) {
        const c1 = item.c1 === 'prism' ? GU.hsl(t * 120, 95, 65, 0.55) : item.c1;
        const g = c2.createRadialGradient(60, 56, 6, 60, 56, 52); g.addColorStop(0, c1); g.addColorStop(1, 'rgba(255,255,255,0)');
        c2.fillStyle = g; c2.beginPath(); c2.arc(60, 56, 52, 0, TAU); c2.fill();
        for (let i = 0; i < 6; i++) {
          const a = t * 1.5 + i; const col = item.c2 === 'prism' ? GU.hsl(t * 120 + i * 60, 95, 65) : item.c2;
          drawShape(c2, item.shape, 60 + Math.cos(a) * 40, 60 - ((t * 30 + i * 17) % 50) + 10, 5, col, a, 0.9);
        }
      }
      drawGubby(c2, 84 - (key === 'trail' ? 0 : 24), 90, 56, Object.assign(skinOpts(skinDef(), t), { mouth: 'grin', lookX: 0.5 }));
    }));
    const name = document.createElement('div'); name.className = 'cname'; name.textContent = item.name; card.appendChild(name);
    const b = document.createElement('button');
    b.className = 'btn small ' + (eq ? 'ghost' : owned ? 'green' : 'yellow');
    if (eq) b.textContent = 'EQUIPPED';
    else if (owned) b.textContent = 'EQUIP';
    else { b.innerHTML = '<span class="coin"></span>'; b.appendChild(document.createTextNode(fmt(item.price))); }
    if (!owned && save.coins < item.price) b.classList.add('locked');
    b.addEventListener('click', () => {
      Sound.init();
      if (eq) return;
      if (owned) { save[key] = item.id; persist(); Sound.sfx('click'); renderShop(); }
      else if (save.coins >= item.price) {
        save.coins -= item.price; save[listKey].push(item.id); save[key] = item.id; persist();
        Sound.sfx('buy'); buzz(30); toast('UNLOCKED  ' + item.name); renderShop(); updateMenuStats();
      } else { Sound.sfx('deny'); shakeEl(b); }
    });
    card.appendChild(b);
    return card;
  }
  document.querySelectorAll('#shopTabs .tab').forEach(t => t.addEventListener('click', () => { click(); shopTab = t.dataset.tab; renderShop(); }));

  // ---- missions ----
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

  // ---- settings ----
  function renderSettings() {
    const s = save.settings;
    document.querySelectorAll('[data-set]').forEach(b => {
      const k = b.dataset.set, on = s[k];
      b.dataset.label = b.dataset.label || b.textContent.trim();
      b.classList.toggle('off', !on);
      b.textContent = b.dataset.label + (on ? ' ON' : ' OFF');
    });
    document.querySelectorAll('#segScheme button').forEach(b => b.classList.toggle('on', b.dataset.scheme === s.scheme));
    document.querySelectorAll('#segLayout button').forEach(b => b.classList.toggle('on', b.dataset.layout === s.layout));
    document.querySelectorAll('#segSize button').forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.size) - s.btnSize) < 0.01));
    const sw = s.scheme === 'swipe';
    $('rowLayout').style.display = sw ? 'none' : ''; $('rowSize').style.display = sw ? 'none' : ''; $('rowEdit').style.display = sw ? 'none' : '';
    $('howto').innerHTML = sw
      ? '<b>SWIPE UP</b> (or tap) to jump - hold for higher, and with upgrades tap/swipe again in the air for extra jumps.<br><b>SWIPE RIGHT</b> to DASH through crates and over gaps.<br><b>SWIPE DOWN</b> to slide - in the air it SLAMS.<br><b>SWIPE LEFT</b> to use your ABILITY.<br>Rescue baby Gubs: your squad is unlimited and multiplies your score!'
      : '<b>TAP</b> anywhere to jump. Hold for a higher jump. Buy <b>MULTI-JUMP</b> in the shop for double, triple and more!<br><b>DASH</b> smashes crates &amp; Grumps and flies over gaps.<br><b>SLIDE</b> ducks under enemies; in the air it <b>SLAMS</b>.<br>The purple button uses your <b>ABILITY</b>.<br>Land on enemies to stomp them. Rescue baby Gubs - your squad is unlimited!';
  }
  document.querySelectorAll('[data-set]').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.set;
      save.settings[k] = !save.settings[k];
      applySettings(); persist(); click(); renderSettings();
    });
  });
  document.querySelectorAll('#segScheme button').forEach(b => b.addEventListener('click', () => { save.settings.scheme = b.dataset.scheme; persist(); click(); renderSettings(); }));
  document.querySelectorAll('#segLayout button').forEach(b => b.addEventListener('click', () => {
    const L = b.dataset.layout;
    if (L === 'custom' && !save.settings.btnPos) { const pos = getBtnPos(); save.settings.btnPos = { dash: [pos.dash.x / lw, pos.dash.y / H], slide: [pos.slide.x / lw, pos.slide.y / H], abil: [pos.abil.x / lw, pos.abil.y / H] }; }
    save.settings.layout = L; persist(); click(); renderSettings();
  }));
  document.querySelectorAll('#segSize button').forEach(b => b.addEventListener('click', () => { save.settings.btnSize = parseFloat(b.dataset.size); persist(); click(); renderSettings(); }));
  $('btnEditLayout').addEventListener('click', () => { click(); state = 'layout'; showScreen('layout'); });
  $('btnLayoutDone').addEventListener('click', () => { click(); state = 'menu'; persist(); renderSettings(); showScreen('settings'); });
  $('btnLayoutReset').addEventListener('click', () => { click(); save.settings.layout = 'right'; save.settings.btnPos = null; persist(); });
  function applySettings() { Sound.setMusic(save.settings.music); Sound.setSfx(save.settings.sfx); }

  // first touch unlocks audio
  document.addEventListener('pointerdown', () => { Sound.init(); applySettings(); }, { capture: true });

  // ---------- debug / test hooks ----------
  window.__gub = {
    get state() { return state; },
    get mode() { return mode; },
    get meters() { return meters; },
    get score() { return score; },
    get squad() { return squad.length; },
    get save() { return save; },
    get player() { return player; },
    get camY() { return camY; },
    get counts() { return { obs: obs.length, plats: plats.length, coins: coins.length, babies: babies.length, pads: pads.length, winds: winds.length, parts: parts.length }; },
    set autopilot(v) { autopilot = !!v; },
    get lastHit() { return lastHit; },
    get info() { return { camX, px: camX + PX(), speed, plats, obs, winds, pads }; },
    press() { pressJump(); }, release() { releaseJump(); }, dash() { doDash(); }, down() { pressDown(); }, up() { releaseDown(); },
    start: startRun,
    give(c) { save.coins += c; persist(); updateMenuStats(); },
    addSquad(n) { for (let i = 0; i < n; i++) squad.push({ color: BABY_COLORS[i % BABY_COLORS.length], ph: i * 0.7 }); },
    spawnBabies(n) { const prev = RNG; for (let i = 0; i < n; i++) addBaby(camX + PX() + 200 + i * 60, GY); },
    power(type) { collectPower({ x: camX + PX(), y: GY - 100, type }, 0); },
    warp(m) { meters = m; lastBiome = Math.floor(m / BIOME_LEN); },
    hover(altM) { debugHover = altM == null ? null : GY - altM * ALT_U; if (altM != null) { player.invuln = 99; skyAlt = altM * ALT_U; } },
    ability() { useAbility(); },
    skyJump(altM) {
      const y = GY - altM * ALT_U, x = camX + PX() - 120;
      plats = []; obs = []; coins = []; winds = []; pads = []; babies = []; powers = [];
      const prev = RNG; RNG = genRng;
      const T = addPlat(x, y, 300, false);
      if (!skyS) skyS = { cur: T, topY: 0 };
      skyS.cur = T; genX = x + 300;
      player.y = y; player.vy = 0; player.invuln = 99; camY = Math.min(0, y - 430); skyAlt = altM * ALT_U;
      RNG = prev;
    },
    upgrade(id, l) { save.upg[id] = l; },
    setScheme(s) { save.settings.scheme = s; }
  };

  // ---------- boot ----------
  applySettings();
  ensureMissions();
  computePalette();
  enterMenu();
  requestAnimationFrame(frame);
})();
