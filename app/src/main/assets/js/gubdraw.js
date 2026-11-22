// GUBS drawing helpers: the Gub itself (patterns + accessories), mini gubs, icons.
(function () {
  'use strict';
  const INK = '#2b1640';
  const TAU = Math.PI * 2;
  const GU = window.GubDraw = { INK };

  const hsl = (h, s, l, a) => 'hsla(' + (((h % 360) + 360) % 360).toFixed(0) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')';
  GU.hsl = hsl;
  function hash(n) {
    let h = Math.imul(n | 0, 374761393);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  GU.rr = rr;
  function starPath(c, x, y, r, rot, pts, inner) {
    c.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 ? r * inner : r, a = rot + (i / (pts * 2)) * TAU - Math.PI / 2;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  GU.starPath = starPath;

  function bodyFill(c, o, w, h, t) {
    switch (o.pat) {
      case 'rainbow': {
        const g = c.createLinearGradient(0, -h, 0, 0), hh = (t * 70) % 360;
        g.addColorStop(0, hsl(hh, 95, 64)); g.addColorStop(1, hsl(hh + 90, 95, 60)); return g;
      }
      case 'metal': {
        const g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, '#9aa6b8'); g.addColorStop(0.45, '#eef3fa'); g.addColorStop(1, '#a9b4c6'); return g;
      }
      case 'gold': {
        const g = c.createLinearGradient(-w / 2, -h, w / 2, 0);
        g.addColorStop(0, '#ffe56b'); g.addColorStop(0.5, '#ffb800'); g.addColorStop(1, '#ff9a00'); return g;
      }
      case 'galaxy': {
        const g = c.createLinearGradient(0, -h, 0, 0);
        g.addColorStop(0, '#3a1d7a'); g.addColorStop(1, '#150a3c'); return g;
      }
      case 'lava': {
        const g = c.createLinearGradient(0, -h, 0, 0);
        g.addColorStop(0, '#4a1a10'); g.addColorStop(1, '#210a08'); return g;
      }
    }
    return o.body;
  }

  function drawGubby(c, x, y, size, o) {
    o = o || {};
    const t = o.t || 0;
    const w = size * (o.sx || 1), h = size * 0.92 * (o.sy || 1);
    const accs = !o.acc ? [] : Array.isArray(o.acc) ? o.acc : [o.acc];
    const has = a => accs.indexOf(a) >= 0;
    const lwid = Math.max(2, size * 0.075);
    const top = -h * 0.86;
    const ex = w * 0.17, ey = -h * 0.55, er = size * 0.135, fwd = w * 0.06;
    c.save();
    c.translate(x, y);
    if (o.rot) { c.translate(0, -h * 0.45); c.rotate(o.rot); c.translate(0, h * 0.45); }
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.pat === 'ghost') c.globalAlpha *= 0.8;
    c.lineJoin = 'round'; c.lineCap = 'round';
    const bodyCol = o.pat === 'rainbow' ? hsl(t * 70 + 40, 95, 62) : o.body;

    const body = () => {
      c.beginPath();
      c.moveTo(-w * 0.5, -h * 0.22);
      c.bezierCurveTo(-w * 0.52, -h * 1.12, w * 0.52, -h * 1.12, w * 0.5, -h * 0.22);
      c.bezierCurveTo(w * 0.5, -h * 0.02, w * 0.36, 0, w * 0.2, 0);
      c.lineTo(-w * 0.2, 0);
      c.bezierCurveTo(-w * 0.36, 0, -w * 0.5, -h * 0.02, -w * 0.5, -h * 0.22);
      c.closePath();
    };

    // ----- behind the body -----
    if (has('wings')) {
      const fl = Math.sin(t * 9) * 0.18;
      c.fillStyle = '#2f9e4f'; c.strokeStyle = INK; c.lineWidth = lwid * 0.8;
      for (const s of [-1, 0.7]) {
        c.save(); c.scale(s, 1);
        c.beginPath();
        c.moveTo(w * 0.15, -h * 0.55);
        c.lineTo(w * 0.95, -h * (1.1 + fl)); c.lineTo(w * 0.78, -h * 0.8);
        c.lineTo(w * 1.0, -h * 0.7); c.lineTo(w * 0.7, -h * 0.55); c.lineTo(w * 0.8, -h * 0.4);
        c.lineTo(w * 0.15, -h * 0.35); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
    }
    if (has('tail')) {
      const sw = Math.sin(t * 6) * h * 0.06;
      c.strokeStyle = INK; c.lineWidth = lwid * 0.8;
      if (o.pat === 'scales') {
        c.fillStyle = bodyCol;
        c.beginPath(); c.moveTo(-w * 0.4, -h * 0.34); c.lineTo(-w * 1.0, -h * 0.14 + sw); c.lineTo(-w * 0.4, -h * 0.06); c.closePath(); c.fill(); c.stroke();
      } else {
        c.beginPath(); c.moveTo(-w * 0.42, -h * 0.18); c.quadraticCurveTo(-w * 0.8, -h * 0.05 + sw, -w * 0.95, -h * 0.34 + sw); c.stroke();
        c.fillStyle = '#b8192f';
        c.beginPath(); c.moveTo(-w * 0.95, -h * 0.34 + sw); c.lineTo(-w * 1.1, -h * 0.5 + sw); c.lineTo(-w * 0.8, -h * 0.46 + sw); c.closePath(); c.fill(); c.stroke();
      }
    }
    if (has('halo')) {
      c.strokeStyle = '#ffe66b'; c.lineWidth = size * 0.07;
      c.beginPath(); c.ellipse(0, -h * 1.02 + Math.sin(t * 3) * 2, w * 0.3, h * 0.08, 0, 0, TAU); c.stroke();
    }

    // ----- body -----
    body();
    c.fillStyle = bodyFill(c, o, w, h, t); c.fill();
    c.save(); body(); c.clip();
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.beginPath(); c.ellipse(w * 0.1, h * 0.05, w * 0.62, h * 0.3, 0, 0, TAU); c.fill();
    switch (o.pat) {
      case 'belly':
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath(); c.ellipse(w * 0.02, -h * 0.17, w * 0.3, h * 0.17, 0, 0, TAU); c.fill(); break;
      case 'spots':
        c.fillStyle = o.pc || 'rgba(0,0,0,0.15)';
        [[-0.2, -0.7, 0.07], [0.22, -0.62, 0.06], [-0.05, -0.36, 0.05], [0.3, -0.3, 0.05], [-0.33, -0.4, 0.045]].forEach(s => {
          c.beginPath(); c.arc(w * s[0], h * s[1], w * s[2], 0, TAU); c.fill();
        }); break;
      case 'stripes':
        c.fillStyle = o.pc || '#fff';
        c.fillRect(-w, -h * 0.3, w * 2, h * 0.08); c.fillRect(-w, -h * 0.15, w * 2, h * 0.08); break;
      case 'stars':
        c.fillStyle = o.pc || '#ffe66b';
        [[-0.25, -0.35, 0.06], [0.2, -0.28, 0.05], [0.05, -0.12, 0.04], [-0.1, -0.7, 0.045]].forEach(s => {
          starPath(c, w * s[0], h * s[1], w * s[2] * 1.6, 0, 5, 0.45); c.fill();
        }); break;
      case 'metal':
        c.fillStyle = 'rgba(60,70,90,0.5)';
        [[-0.36, -0.25], [0.36, -0.25], [-0.36, -0.55], [0.36, -0.55]].forEach(s => { c.beginPath(); c.arc(w * s[0], h * s[1], w * 0.03, 0, TAU); c.fill(); });
        c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-w, -h * 0.22, w * 2, h * 0.04); break;
      case 'candy':
        c.strokeStyle = o.pc || '#fff'; c.lineWidth = w * 0.1;
        for (let i = -3; i < 6; i++) { c.beginPath(); c.moveTo(-w * 0.8 + i * w * 0.24, 0); c.lineTo(-w * 0.8 + i * w * 0.24 + w * 0.55, -h * 1.05); c.stroke(); }
        break;
      case 'scales':
        c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = Math.max(1.5, size * 0.03);
        for (let r = 0; r < 4; r++) for (let k = -3; k <= 3; k++) {
          c.beginPath(); c.arc(k * w * 0.2 + (r % 2) * w * 0.1, -h * (0.15 + r * 0.2), w * 0.1, 0, Math.PI); c.stroke();
        } break;
      case 'gold':
        c.fillStyle = 'rgba(255,255,255,0.45)';
        c.beginPath(); c.ellipse(-w * 0.2, -h * 0.55, w * 0.07, h * 0.3, 0.5, 0, TAU); c.fill(); break;
      case 'galaxy': {
        const g = c.createRadialGradient(w * 0.1, -h * 0.4, 1, w * 0.1, -h * 0.4, w * 0.55);
        g.addColorStop(0, 'rgba(255,111,177,0.55)'); g.addColorStop(1, 'rgba(255,111,177,0)');
        c.fillStyle = g; c.fillRect(-w, -h * 1.1, w * 2, h * 1.2);
        for (let i = 0; i < 16; i++) {
          const sx = (hash(i * 3 + 1) - 0.5) * w * 0.95, sy = -hash(i * 7 + 2) * h * 0.95;
          c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6 + i * 1.7));
          c.fillStyle = '#fff'; c.beginPath(); c.arc(sx, sy, size * 0.022 + hash(i) * size * 0.015, 0, TAU); c.fill();
        }
        c.globalAlpha = 1; break;
      }
      case 'lava': {
        const pulse = 0.65 + 0.35 * Math.sin(t * 4);
        const cracks = [[[-0.35, -0.2], [-0.2, -0.4], [-0.28, -0.62], [-0.1, -0.8]], [[0.3, -0.15], [0.15, -0.35], [0.28, -0.55], [0.12, -0.75]], [[0, -0.1], [0.05, -0.3], [-0.05, -0.5]]];
        for (const pass of [0, 1]) {
          c.strokeStyle = pass ? 'rgba(255,230,120,' + pulse + ')' : 'rgba(255,90,20,' + pulse * 0.8 + ')';
          c.lineWidth = pass ? size * 0.025 : size * 0.06;
          cracks.forEach(cr => { c.beginPath(); cr.forEach((p, i) => i ? c.lineTo(w * p[0], h * p[1]) : c.moveTo(w * p[0], h * p[1])); c.stroke(); });
        }
        break;
      }
      case 'rainbow':
        c.fillStyle = 'rgba(255,255,255,0.28)';
        c.beginPath(); c.ellipse(w * 0.02, -h * 0.17, w * 0.3, h * 0.17, 0, 0, TAU); c.fill(); break;
      case 'ghost':
        c.fillStyle = 'rgba(160,200,255,0.25)'; c.fillRect(-w, -h * 0.4, w * 2, h * 0.4); break;
      case 'panda':
        c.fillStyle = '#1d1a24';
        for (const sgn of [-1, 1]) { c.beginPath(); c.ellipse(sgn * ex + fwd, ey + er * 0.1, er * 1.35, er * 1.5, sgn * 0.3, 0, TAU); c.fill(); }
        c.fillRect(-w * 0.5, -h * 0.34, w * 0.2, h * 0.34); c.fillRect(w * 0.3, -h * 0.34, w * 0.2, h * 0.34);
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(w * 0.02, -h * 0.17, w * 0.28, h * 0.15, 0, 0, TAU); c.fill(); break;
      case 'jack':
        c.strokeStyle = 'rgba(120,40,0,0.35)'; c.lineWidth = Math.max(2, size * 0.04);
        for (const k of [-0.28, 0, 0.28]) { c.beginPath(); c.moveTo(w * k, -h * 0.9); c.quadraticCurveTo(w * k * 1.9, -h * 0.5, w * k, 0); c.stroke(); } break;
    }
    if (has('headband')) { c.fillStyle = '#ff3b3b'; c.fillRect(-w, -h * 0.82, w * 2, h * 0.13); }
    c.restore();
    c.lineWidth = lwid; c.strokeStyle = INK;
    body(); c.stroke();
    // shine
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(-w * 0.22, -h * 0.72, w * 0.1, h * 0.065, -0.6, 0, TAU); c.fill();

    // ----- face -----
    const lx = Math.max(-1, Math.min(1, o.lookX == null ? 0.4 : o.lookX)) * er * 0.42;
    const ly = Math.max(-1, Math.min(1, o.lookY || 0)) * er * 0.42;
    c.strokeStyle = INK;
    for (const s of [-1, 1]) {
      const cx = s * ex + fwd;
      if (o.blink) {
        c.lineWidth = lwid * 0.9;
        c.beginPath(); c.moveTo(cx - er * 0.8, ey); c.quadraticCurveTo(cx, ey + er * 0.55, cx + er * 0.8, ey); c.stroke();
        continue;
      }
      c.beginPath(); c.ellipse(cx, ey, er * 0.85, er, 0, 0, TAU);
      c.fillStyle = '#fff'; c.fill(); c.lineWidth = lwid * 0.7; c.stroke();
      if (o.mouth === 'ouch') {
        c.lineWidth = lwid * 0.8; c.beginPath();
        c.moveTo(cx - er * 0.4, ey - er * 0.4); c.lineTo(cx + er * 0.4, ey + er * 0.4);
        c.moveTo(cx + er * 0.4, ey - er * 0.4); c.lineTo(cx - er * 0.4, ey + er * 0.4); c.stroke();
      } else {
        c.fillStyle = INK; c.beginPath(); c.arc(cx + lx, ey + ly, er * 0.5, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + lx + er * 0.18, ey + ly - er * 0.2, er * 0.17, 0, TAU); c.fill();
      }
    }
    c.fillStyle = 'rgba(255,90,140,0.4)';
    c.beginPath(); c.ellipse(-w * 0.27 + fwd, -h * 0.37, w * 0.075, h * 0.045, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(w * 0.33 + fwd * 0.3, -h * 0.37, w * 0.075, h * 0.045, 0, 0, TAU); c.fill();
    const mx = fwd + w * 0.03, my = -h * 0.33, m = o.mouth || 'smile';
    c.lineWidth = lwid * 0.85; c.strokeStyle = INK;
    if (m === 'smile') { c.beginPath(); c.arc(mx, my - size * 0.04, size * 0.085, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    else if (m === 'open' || m === 'grin') {
      c.beginPath();
      if (m === 'grin') c.arc(mx, my - size * 0.03, size * 0.1, 0, Math.PI); else c.ellipse(mx, my, size * 0.07, size * 0.065, 0, 0, TAU);
      c.closePath(); c.fillStyle = INK; c.fill();
      c.fillStyle = '#ff6f91'; c.beginPath(); c.ellipse(mx, my + size * 0.03, size * 0.04, size * 0.025, 0, 0, TAU); c.fill();
    } else if (m === 'o') { c.fillStyle = INK; c.beginPath(); c.arc(mx, my, size * 0.04, 0, TAU); c.fill(); }
    else if (m === 'ouch') {
      c.beginPath(); c.moveTo(mx - size * 0.09, my); c.lineTo(mx - size * 0.03, my - size * 0.03);
      c.lineTo(mx + size * 0.03, my); c.lineTo(mx + size * 0.09, my - size * 0.03); c.stroke();
    }

    // ----- accessories -----
    c.lineWidth = lwid * 0.8; c.strokeStyle = INK;
    const lw8 = lwid * 0.8;
    for (const a of accs) {
      switch (a) {
        case 'bow': {
          c.fillStyle = '#ff4f8b';
          const bx = w * 0.2, by = top + h * 0.02;
          c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - w * 0.2, by - h * 0.14); c.lineTo(bx - w * 0.2, by + h * 0.12); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + w * 0.2, by - h * 0.14); c.lineTo(bx + w * 0.2, by + h * 0.12); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.arc(bx, by, w * 0.05, 0, TAU); c.fill(); c.stroke(); break;
        }
        case 'cap': {
          c.fillStyle = '#ff4f4f';
          c.beginPath(); c.ellipse(0, top + h * 0.1, w * 0.36, h * 0.2, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.ellipse(w * 0.32, top + h * 0.1, w * 0.22, h * 0.045, 0, 0, TAU); c.fill(); c.stroke();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(0, top - h * 0.03, w * 0.07, 0, TAU); c.fill(); break;
        }
        case 'flower': {
          const fx = -w * 0.15, fy = top + h * 0.02;
          c.fillStyle = '#fff';
          for (let i = 0; i < 5; i++) {
            const an = i / 5 * TAU + t;
            c.beginPath(); c.arc(fx + Math.cos(an) * w * 0.09, fy + Math.sin(an) * w * 0.09, w * 0.07, 0, TAU); c.fill(); c.stroke();
          }
          c.fillStyle = '#ff8a4a'; c.beginPath(); c.arc(fx, fy, w * 0.065, 0, TAU); c.fill(); c.stroke(); break;
        }
        case 'antenna': {
          const ax = w * 0.12 + Math.sin(t * 6) * w * 0.04;
          c.beginPath(); c.moveTo(0, top + h * 0.02); c.quadraticCurveTo(w * 0.05, top - h * 0.2, ax, top - h * 0.3); c.stroke();
          c.fillStyle = '#ffe14a'; c.beginPath(); c.arc(ax, top - h * 0.3, w * 0.08, 0, TAU); c.fill(); c.stroke(); break;
        }
        case 'prop': {
          c.fillStyle = '#ff5f5f';
          c.beginPath(); c.ellipse(0, top + h * 0.06, w * 0.3, h * 0.14, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#ffd84a'; c.fillRect(-w * 0.03, top - h * 0.1, w * 0.06, h * 0.07);
          c.fillStyle = '#5cc4ff';
          c.beginPath(); c.ellipse(0, top - h * 0.11, Math.max(w * 0.05, w * 0.36 * Math.abs(Math.cos(t * 16))), h * 0.035, 0, 0, TAU); c.fill(); c.stroke(); break;
        }
        case 'catears': {
          for (const s of [-1, 1]) {
            c.fillStyle = bodyCol;
            c.beginPath(); c.moveTo(s * w * 0.1, top + h * 0.1); c.lineTo(s * w * 0.4, top + h * 0.15); c.lineTo(s * w * 0.3, top - h * 0.14); c.closePath(); c.fill(); c.stroke();
            c.fillStyle = '#ff8fb0';
            c.beginPath(); c.moveTo(s * w * 0.2, top + h * 0.09); c.lineTo(s * w * 0.34, top + h * 0.11); c.lineTo(s * w * 0.29, top - h * 0.05); c.closePath(); c.fill();
          } break;
        }
        case 'shades': {
          c.fillStyle = '#1a1a2e';
          rr(c, -w * 0.36 + fwd, ey - er * 0.8, w * 0.72, er * 1.5, er * 0.5); c.fill(); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(-w * 0.26 + fwd, ey - er * 0.55, w * 0.09, er * 0.25); c.fillRect(w * 0.08 + fwd, ey - er * 0.55, w * 0.09, er * 0.25); break;
        }
        case 'headband': {
          c.strokeStyle = '#ff3b3b'; c.lineWidth = size * 0.07;
          const wv = Math.sin(t * 14) * size * 0.06;
          c.beginPath(); c.moveTo(-w * 0.45, -h * 0.76); c.quadraticCurveTo(-w * 0.7, -h * 0.7 + wv, -w * 0.85, -h * 0.55 - wv); c.stroke();
          c.strokeStyle = INK; c.lineWidth = lw8; break;
        }
        case 'visor': {
          rr(c, -w * 0.32 + fwd, ey - er * 0.7, w * 0.64, er * 1.4, er * 0.6);
          c.fillStyle = 'rgba(70,235,255,0.72)'; c.fill(); c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-w * 0.2 + fwd, ey - er * 0.45, w * 0.12, er * 0.25); break;
        }
        case 'bunny': {
          for (const s of [-1, 1]) {
            c.save(); c.translate(s * w * 0.18, top + h * 0.02); c.rotate(s * 0.14 + Math.sin(t * 4 + s) * 0.05);
            c.fillStyle = bodyCol; c.beginPath(); c.ellipse(0, -h * 0.2, w * 0.09, h * 0.24, 0, 0, TAU); c.fill(); c.stroke();
            c.fillStyle = '#ffb3cf'; c.beginPath(); c.ellipse(0, -h * 0.2, w * 0.045, h * 0.17, 0, 0, TAU); c.fill();
            c.restore();
          } break;
        }
        case 'cowboy': {
          c.fillStyle = '#9a6a3a';
          c.beginPath(); c.ellipse(0, top + h * 0.1, w * 0.52, h * 0.07, 0, 0, TAU); c.fill(); c.stroke();
          c.fillStyle = '#b9803f';
          c.beginPath(); c.moveTo(-w * 0.26, top + h * 0.08); c.quadraticCurveTo(-w * 0.28, top - h * 0.22, 0, top - h * 0.1); c.quadraticCurveTo(w * 0.28, top - h * 0.22, w * 0.26, top + h * 0.08); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#6b3f1a'; c.fillRect(-w * 0.26, top + h * 0.0, w * 0.52, h * 0.05); break;
        }
        case 'pirate': {
          c.fillStyle = '#2b2b3a';
          c.beginPath(); c.moveTo(-w * 0.46, top + h * 0.12); c.lineTo(-w * 0.1, top - h * 0.18); c.lineTo(w * 0.1, top - h * 0.18); c.lineTo(w * 0.46, top + h * 0.12);
          c.quadraticCurveTo(0, top + h * 0.2, -w * 0.46, top + h * 0.12); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(0, top - h * 0.02, w * 0.06, 0, TAU); c.fill();
          c.fillStyle = '#111'; c.beginPath(); c.ellipse(-ex + fwd, ey, er * 0.95, er * 1.05, 0, 0, TAU); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(-ex + fwd - er * 0.8, ey - er * 0.6); c.lineTo(ex + fwd + w * 0.1, -h * 0.82); c.stroke(); break;
        }
        case 'phones': {
          c.strokeStyle = INK; c.lineWidth = size * 0.1;
          c.beginPath(); c.arc(0, -h * 0.45, w * 0.54, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
          c.strokeStyle = '#ff5fd2'; c.lineWidth = size * 0.055; c.stroke();
          c.fillStyle = '#ff5fd2'; c.strokeStyle = INK; c.lineWidth = lw8;
          for (const s of [-1, 1]) { rr(c, s * w * 0.55 - w * 0.07, -h * 0.55, w * 0.14, h * 0.25, w * 0.05); c.fill(); c.stroke(); } break;
        }
        case 'wizard': {
          c.fillStyle = '#5a3fd0';
          c.beginPath(); c.moveTo(-w * 0.3, top + h * 0.1); c.quadraticCurveTo(-w * 0.1, top - h * 0.25, w * 0.1 + Math.sin(t * 3) * w * 0.03, top - h * 0.5); c.quadraticCurveTo(w * 0.15, top - h * 0.1, w * 0.3, top + h * 0.1); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.ellipse(0, top + h * 0.1, w * 0.46, h * 0.06, 0, 0, TAU); c.fill(); c.stroke();
          c.fillStyle = '#ffe66b'; starPath(c, -w * 0.02, top - h * 0.1, w * 0.07, t, 5, 0.45); c.fill(); break;
        }
        case 'horns': {
          const dragon = has('wings');
          c.fillStyle = dragon ? '#f2e3b5' : '#b8192f';
          for (const s of [-1, 1]) {
            c.beginPath(); c.moveTo(s * w * 0.14, top + h * 0.08); c.quadraticCurveTo(s * w * 0.3, top - h * 0.05, s * w * 0.26, top - h * 0.24);
            c.quadraticCurveTo(s * w * 0.44, top - h * 0.1, s * w * 0.4, top + h * 0.12); c.closePath(); c.fill(); c.stroke();
          } break;
        }
        case 'helmet': {
          c.fillStyle = 'rgba(160,220,255,0.2)'; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = size * 0.07;
          c.beginPath(); c.arc(0, -h * 0.5, w * 0.7, 0, TAU); c.fill(); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = size * 0.04;
          c.beginPath(); c.arc(0, -h * 0.5, w * 0.55, Math.PI * 1.1, Math.PI * 1.4); c.stroke();
          c.strokeStyle = INK; c.lineWidth = lw8;
          c.beginPath(); c.arc(0, -h * 0.5, w * 0.7 + size * 0.035, 0, TAU); c.stroke(); break;
        }
        case 'lolli': {
          const lx2 = w * 0.1;
          c.beginPath(); c.moveTo(lx2, top + h * 0.05); c.lineTo(lx2, top - h * 0.2); c.stroke();
          c.fillStyle = '#ff6fb1'; c.beginPath(); c.arc(lx2, top - h * 0.34, w * 0.17, 0, TAU); c.fill(); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = size * 0.035; c.beginPath();
          for (let i = 0; i < 24; i++) { const r = i * 0.0065 * w; c.lineTo(lx2 + Math.cos(i * 0.6 + t * 2) * r, top - h * 0.34 + Math.sin(i * 0.6 + t * 2) * r); }
          c.stroke(); c.strokeStyle = INK; c.lineWidth = lw8; break;
        }
        case 'spikes': {
          c.strokeStyle = '#fffbe0'; c.lineWidth = size * 0.04;
          [[-0.38, -0.3], [-0.42, -0.5], [-0.3, -0.7], [0.4, -0.3], [0.44, -0.5], [0.32, -0.7], [-0.15, -0.8], [0.15, -0.82]].forEach(p => {
            const dx = p[0] * 0.5 * (p[1] < -0.75 ? 0.1 : 1), dy = p[1] < -0.75 ? -0.06 : 0;
            c.beginPath(); c.moveTo(w * p[0], h * p[1]); c.lineTo(w * (p[0] + Math.sign(p[0]) * 0.1 + dx * 0), h * (p[1] + dy - 0.03)); c.stroke();
          });
          c.strokeStyle = INK; c.lineWidth = lw8; break;
        }
        case 'plates': {
          c.fillStyle = '#ff9a3c';
          [-0.3, -0.1, 0.1, 0.3].forEach((px, i) => {
            const by = top + h * 0.06 + Math.abs(px) * h * 0.35, ph = h * (0.15 - Math.abs(px) * 0.1);
            c.beginPath(); c.moveTo(w * px - w * 0.07, by); c.lineTo(w * px, by - ph); c.lineTo(w * px + w * 0.07, by); c.closePath(); c.fill(); c.stroke();
          }); break;
        }
        case 'flame': {
          for (let i = -2; i <= 2; i++) {
            const fh = h * (0.28 - Math.abs(i) * 0.04) * (0.8 + 0.3 * Math.sin(t * 11 + i * 1.7));
            const bx = w * i * 0.11, by = top + h * 0.08 + Math.abs(i) * h * 0.05;
            c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(bx - w * 0.07, by); c.quadraticCurveTo(bx - w * 0.04, by - fh * 0.6, bx + Math.sin(t * 9 + i) * w * 0.04, by - fh); c.quadraticCurveTo(bx + w * 0.06, by - fh * 0.5, bx + w * 0.07, by); c.closePath(); c.fill();
            c.fillStyle = '#ffd84a'; c.beginPath(); c.moveTo(bx - w * 0.03, by); c.quadraticCurveTo(bx, by - fh * 0.5, bx + Math.sin(t * 9 + i) * w * 0.02, by - fh * 0.62); c.quadraticCurveTo(bx + w * 0.03, by - fh * 0.3, bx + w * 0.03, by); c.closePath(); c.fill();
          } break;
        }
        case 'unicorn': {
          const cols = ['#ff5f9a', '#ffd84a', '#5cc4ff'];
          c.lineWidth = size * 0.05;
          cols.forEach((col, i) => {
            c.strokeStyle = col; c.beginPath();
            c.moveTo(-w * 0.12, top + h * 0.02 + i * h * 0.04);
            c.quadraticCurveTo(-w * 0.55, top - h * 0.05 + i * h * 0.08 + Math.sin(t * 5 + i) * h * 0.02, -w * 0.5, -h * 0.35 + i * h * 0.07); c.stroke();
          });
          c.lineWidth = lw8; c.strokeStyle = INK;
          c.fillStyle = '#ffd84a';
          c.beginPath(); c.moveTo(w * 0.04, top + h * 0.08); c.lineTo(w * 0.14, top - h * 0.34); c.lineTo(w * 0.22, top + h * 0.06); c.closePath(); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(w * 0.07, top - h * 0.04); c.lineTo(w * 0.19, top - h * 0.02); c.moveTo(w * 0.1, top - h * 0.17); c.lineTo(w * 0.17, top - h * 0.15); c.stroke(); break;
        }
        case 'orbit': {
          const ox = Math.cos(t * 3) * w * 0.78, oy = -h * 0.5 + Math.sin(t * 3) * h * 0.2;
          c.fillStyle = '#fff6b0'; starPath(c, ox, oy, w * 0.1, t * 2, 5, 0.45); c.fill(); c.stroke(); break;
        }
        case 'chef': {
          c.fillStyle = '#ffffff';
          for (const k of [-0.2, 0, 0.2]) { c.beginPath(); c.arc(w * k, top - h * 0.28, w * 0.17, 0, TAU); c.fill(); c.stroke(); }
          rr(c, -w * 0.28, top - h * 0.22, w * 0.56, h * 0.3, 6); c.fill(); c.stroke(); break;
        }
        case 'santa': {
          const sw = Math.sin(t * 3) * w * 0.03;
          c.fillStyle = '#e8203a';
          c.beginPath(); c.moveTo(-w * 0.34, top + h * 0.1); c.quadraticCurveTo(-w * 0.1, top - h * 0.3, w * 0.22 + sw, top - h * 0.18); c.lineTo(w * 0.34, top + h * 0.1); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff'; rr(c, -w * 0.38, top + h * 0.02, w * 0.76, h * 0.12, 6); c.fill(); c.stroke();
          c.beginPath(); c.arc(w * 0.22 + sw, top - h * 0.16, w * 0.09, 0, TAU); c.fill(); c.stroke(); break;
        }
        case 'viking': {
          c.fillStyle = '#f2e3b5';
          for (const sgn of [-1, 1]) { c.beginPath(); c.moveTo(sgn * w * 0.34, top + h * 0.12); c.quadraticCurveTo(sgn * w * 0.62, top + h * 0.06, sgn * w * 0.52, top - h * 0.22); c.quadraticCurveTo(sgn * w * 0.44, top - h * 0.02, sgn * w * 0.28, top + h * 0.02); c.closePath(); c.fill(); c.stroke(); }
          c.fillStyle = '#9aa3b8'; c.beginPath(); c.ellipse(0, top + h * 0.1, w * 0.36, h * 0.2, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#c3cadb'; c.fillRect(-w * 0.36, top + h * 0.08, w * 0.72, h * 0.06); break;
        }
        case 'shroomcap': {
          c.fillStyle = '#ff4f4f'; c.beginPath(); c.ellipse(0, top + h * 0.12, w * 0.55, h * 0.3, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff'; for (const q of [[-0.3, 0.0, 0.09], [0.05, -0.13, 0.11], [0.32, 0.0, 0.08], [-0.1, 0.05, 0.06]]) { c.beginPath(); c.arc(w * q[0], top + h * (0.0 + q[1]), w * q[2], 0, TAU); c.fill(); } break;
        }
        case 'jester': {
          const swy = Math.sin(t * 4) * h * 0.03;
          for (const [sgn, col] of [[-1, '#ffd84a'], [1, '#ff5f9a']]) {
            c.fillStyle = col; c.beginPath(); c.moveTo(sgn * w * 0.05, top + h * 0.1); c.quadraticCurveTo(sgn * w * 0.5, top - h * 0.05, sgn * w * 0.55, top - h * 0.28 + swy); c.quadraticCurveTo(sgn * w * 0.3, top - h * 0.1, sgn * -w * 0.0, top - h * 0.0); c.closePath(); c.fill(); c.stroke();
            c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(sgn * w * 0.55, top - h * 0.28 + swy, w * 0.06, 0, TAU); c.fill(); c.stroke();
          } break;
        }
        case 'sharkfin': {
          c.fillStyle = '#7aa3d8'; c.beginPath(); c.moveTo(-w * 0.16, top + h * 0.12); c.quadraticCurveTo(-w * 0.04, top - h * 0.16, w * 0.12, top - h * 0.3); c.quadraticCurveTo(w * 0.1, top - h * 0.06, w * 0.2, top + h * 0.12); c.closePath(); c.fill(); c.stroke(); break;
        }
        case 'pandaears': {
          c.fillStyle = '#1d1a24'; for (const sgn of [-1, 1]) { c.beginPath(); c.arc(sgn * w * 0.34, top + h * 0.02, w * 0.14, 0, TAU); c.fill(); c.stroke(); } break;
        }
        case 'pumpkinstem': {
          c.fillStyle = '#3f9e3a'; rr(c, -w * 0.06, top - h * 0.14, w * 0.12, h * 0.2, 4); c.fill(); c.stroke();
          c.strokeStyle = '#3f9e3a'; c.beginPath(); c.moveTo(w * 0.06, top - h * 0.06); c.quadraticCurveTo(w * 0.26, top - h * 0.14, w * 0.2, top + h * 0.0); c.stroke(); c.strokeStyle = INK; break;
        }
        case 'crown': {
          c.fillStyle = '#ffd23f';
          const cw = w * 0.5, cb = top + h * 0.06;
          c.beginPath();
          c.moveTo(-cw / 2, cb); c.lineTo(-cw / 2, cb - h * 0.2); c.lineTo(-cw / 4, cb - h * 0.08); c.lineTo(0, cb - h * 0.25);
          c.lineTo(cw / 4, cb - h * 0.08); c.lineTo(cw / 2, cb - h * 0.2); c.lineTo(cw / 2, cb); c.closePath();
          c.fill(); c.stroke();
          c.fillStyle = '#ff4f8b'; c.beginPath(); c.arc(0, cb - h * 0.06, w * 0.04, 0, TAU); c.fill(); break;
        }
      }
    }
    c.restore();
  }
  GU.drawGubby = drawGubby;

  function drawMiniGub(c, x, y, size, color, blink) {
    const w = size, h = size * 0.9;
    c.beginPath();
    c.moveTo(x - w * 0.5, y - h * 0.2);
    c.bezierCurveTo(x - w * 0.52, y - h * 1.1, x + w * 0.52, y - h * 1.1, x + w * 0.5, y - h * 0.2);
    c.lineTo(x + w * 0.42, y); c.lineTo(x - w * 0.42, y); c.closePath();
    c.fillStyle = color; c.fill();
    c.lineWidth = Math.max(1.5, size * 0.075); c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
    const er = size * 0.11, ey = y - h * 0.55;
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(x - w * 0.14 + w * 0.06, ey, er, 0, TAU); c.arc(x + w * 0.2 + w * 0.06, ey, er, 0, TAU); c.fill();
    c.fillStyle = INK;
    c.beginPath(); c.arc(x - w * 0.14 + w * 0.09, ey, er * 0.5, 0, TAU); c.arc(x + w * 0.2 + w * 0.09, ey, er * 0.5, 0, TAU); c.fill();
  }
  GU.drawMiniGub = drawMiniGub;

  GU.drawCoin = function (c, x, y, r, ph) {
    const k = Math.max(0.18, Math.abs(Math.cos(ph)));
    c.lineWidth = 3; c.strokeStyle = INK;
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.ellipse(x, y, r * k, r, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#f2a900';
    c.beginPath(); c.ellipse(x, y, r * k * 0.55, r * 0.55, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.ellipse(x - r * k * 0.35, y - r * 0.4, r * k * 0.18, r * 0.18, 0, 0, TAU); c.fill();
  };

  GU.drawPowerIcon = function (c, type, x, y, r) {
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
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(x - r * 0.15, y - r * 0.2, r * 0.1, r * 0.2, 0.3, 0, TAU); c.fill();
    } else if (type === 'double') {
      c.font = '900 ' + Math.round(r * 0.9) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = r * 0.2; c.strokeText('x2', x, y + r * 0.04); c.fillStyle = '#ffd23f'; c.fillText('x2', x, y + r * 0.04);
    } else if (type === 'star') {
      starPath(c, x, y + r * 0.04, r * 0.62, 0, 5, 0.5);
      c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = r * 0.12; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(x - r * 0.16, y - r * 0.18, r * 0.09, r * 0.16, 0.5, 0, TAU); c.fill();
    } else if (type === 'rocket') {
      c.save(); c.translate(x, y); c.rotate(-Math.PI / 4);
      c.lineWidth = r * 0.1;
      c.fillStyle = '#ffb03a'; c.beginPath(); c.moveTo(-r * 0.14, r * 0.45); c.lineTo(0, r * 0.82); c.lineTo(r * 0.14, r * 0.45); c.closePath(); c.fill();
      c.fillStyle = '#ff4a5a'; c.beginPath(); c.moveTo(-r * 0.25, r * 0.15); c.lineTo(-r * 0.5, r * 0.5); c.lineTo(-r * 0.2, r * 0.42); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * 0.25, r * 0.15); c.lineTo(r * 0.5, r * 0.5); c.lineTo(r * 0.2, r * 0.42); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, r * 0.26, r * 0.55, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#ff4a5a'; c.beginPath(); c.moveTo(-r * 0.24, -r * 0.3); c.quadraticCurveTo(0, -r * 0.95, r * 0.24, -r * 0.3); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#5cc4ff'; c.beginPath(); c.arc(0, r * 0.02, r * 0.12, 0, TAU); c.fill(); c.stroke();
      c.restore();
    } else {
      c.beginPath(); c.moveTo(x, y - r * 0.62); c.lineTo(x + r * 0.5, y); c.lineTo(x + r * 0.2, y); c.lineTo(x + r * 0.2, y + r * 0.55);
      c.lineTo(x - r * 0.2, y + r * 0.55); c.lineTo(x - r * 0.2, y); c.lineTo(x - r * 0.5, y); c.closePath();
      c.fillStyle = '#5ee07a'; c.fill(); c.lineWidth = r * 0.12; c.stroke();
    }
  };

  GU.drawAbilityIcon = function (c, id, x, y, r) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = r * 0.12;
    switch (id) {
      case 'bubble':
        c.fillStyle = 'rgba(140,225,255,0.75)'; c.beginPath(); c.arc(x, y, r * 0.58, 0, TAU); c.fill(); c.stroke();
        c.strokeStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.4, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); break;
      case 'slow':
        c.fillStyle = '#fff7ea'; c.beginPath(); c.arc(x, y, r * 0.58, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - r * 0.38); c.moveTo(x, y); c.lineTo(x + r * 0.26, y + r * 0.12); c.stroke(); break;
      case 'pulse':
        c.strokeStyle = '#ffd84a'; c.lineWidth = r * 0.16;
        c.beginPath(); c.arc(x, y, r * 0.62, -0.8, 0.8); c.moveTo(x - r * 0.0 + r * 0.45, y); c.arc(x, y, r * 0.45, -0.7, 0.7); c.stroke();
        c.strokeStyle = INK; c.lineWidth = r * 0.12; c.fillStyle = '#ffd23f';
        c.beginPath(); c.arc(x - r * 0.28, y, r * 0.3, 0, TAU); c.fill(); c.stroke(); break;
      case 'bomb':
        c.fillStyle = '#3b3050'; c.beginPath(); c.arc(x, y + r * 0.1, r * 0.48, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x + r * 0.2, y - r * 0.32); c.quadraticCurveTo(x + r * 0.4, y - r * 0.6, x + r * 0.2, y - r * 0.72); c.stroke();
        c.fillStyle = '#ffd84a'; starPath(c, x + r * 0.22, y - r * 0.74, r * 0.2, 0.3, 6, 0.45); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(x - r * 0.18, y - r * 0.05, r * 0.1, 0, TAU); c.fill(); break;
      case 'rocket': GU.drawPowerIcon(c, 'rocket', x, y, r * 1.05); break;
      case 'star': GU.drawPowerIcon(c, 'star', x, y, r * 1.1); break;
      case 'phase':
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath();
        c.moveTo(x - r * 0.45, y + r * 0.5); c.lineTo(x - r * 0.45, y - r * 0.1);
        c.bezierCurveTo(x - r * 0.45, y - r * 0.85, x + r * 0.45, y - r * 0.85, x + r * 0.45, y - r * 0.1);
        c.lineTo(x + r * 0.45, y + r * 0.5); c.lineTo(x + r * 0.22, y + r * 0.34); c.lineTo(x, y + r * 0.5); c.lineTo(x - r * 0.22, y + r * 0.34); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = INK; c.beginPath(); c.arc(x - r * 0.16, y - r * 0.12, r * 0.07, 0, TAU); c.arc(x + r * 0.16, y - r * 0.12, r * 0.07, 0, TAU); c.fill(); break;
      case 'call':
        drawMiniGub(c, x - r * 0.38, y + r * 0.35, r * 0.5, '#ff8fc8');
        drawMiniGub(c, x + r * 0.38, y + r * 0.35, r * 0.5, '#6cc8ff');
        drawMiniGub(c, x, y + r * 0.12, r * 0.62, '#5ee07a'); break;
    }
    c.restore();
  };

  // ---------- pets ----------
  GU.drawPet = function (c, id, x, y, size, t) {
    const w = size, h = size * 0.85, lw2 = Math.max(2, size * 0.06);
    c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = lw2; c.strokeStyle = INK;
    const bob = Math.abs(Math.sin(t * 5)) * size * 0.04;
    c.translate(0, -bob);
    const dome = col => {
      c.beginPath(); c.moveTo(-w * 0.45, -h * 0.2); c.bezierCurveTo(-w * 0.48, -h * 1.1, w * 0.48, -h * 1.1, w * 0.45, -h * 0.2);
      c.bezierCurveTo(w * 0.45, -h * 0.02, w * 0.3, 0, w * 0.15, 0); c.lineTo(-w * 0.15, 0); c.bezierCurveTo(-w * 0.3, 0, -w * 0.45, -h * 0.02, -w * 0.45, -h * 0.2); c.closePath();
      c.fillStyle = col; c.fill(); c.stroke();
    };
    const eyes = (dy, sp) => { for (const s2 of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(s2 * w * (sp || 0.15) + w * 0.05, -h * dy, w * 0.1, 0, TAU); c.fill(); c.lineWidth = lw2 * 0.6; c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(s2 * w * (sp || 0.15) + w * 0.08, -h * dy, w * 0.05, 0, TAU); c.fill(); } c.lineWidth = lw2; };
    const ell = (col, px, py, rx, ry, rot) => { c.beginPath(); c.ellipse(px, py, rx, ry, rot || 0, 0, TAU); c.fillStyle = col; c.fill(); c.stroke(); };
    switch (id) {
      case 'puppy':
        ell('#9a6a3a', -w * 0.4, -h * 0.55, w * 0.14, h * 0.3, 0.3); ell('#9a6a3a', w * 0.4, -h * 0.55, w * 0.14, h * 0.3, -0.3);
        dome('#d9a066'); eyes(0.58); ell('#2b1640', w * 0.08, -h * 0.4, w * 0.07, h * 0.05); ell('#ff6f91', w * 0.08, -h * 0.28, w * 0.05, h * 0.07); break;
      case 'kitty':
        for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * w * 0.1, -h * 0.95); c.lineTo(s2 * w * 0.42, -h * 0.9); c.lineTo(s2 * w * 0.38, -h * 1.3); c.closePath(); c.fillStyle = '#ffb08a'; c.fill(); c.stroke(); }
        dome('#ffb08a'); eyes(0.58); c.lineWidth = lw2 * 0.5; for (const s2 of [-1, 1]) for (const k of [-0.05, 0.06]) { c.beginPath(); c.moveTo(w * 0.08 + s2 * w * 0.12, -h * (0.4 + k)); c.lineTo(w * 0.08 + s2 * w * 0.4, -h * (0.42 + k * 2)); c.stroke(); } c.lineWidth = lw2; ell('#ff8fb0', w * 0.08, -h * 0.38, w * 0.04, h * 0.03); break;
      case 'birdie': {
        const fl = Math.sin(t * 14) * 0.5;
        ell('#4aa8e8', -w * 0.45, -h * 0.45, w * 0.28, h * 0.12, -0.5 - fl); dome('#6cc8ff'); eyes(0.58, 0.12);
        c.beginPath(); c.moveTo(w * 0.28, -h * 0.45); c.lineTo(w * 0.52, -h * 0.38); c.lineTo(w * 0.28, -h * 0.3); c.closePath(); c.fillStyle = '#ff9a3c'; c.fill(); c.stroke();
        ell('#ffd84a', 0, -h * 1.05, w * 0.07, h * 0.12, 0.2); break;
      }
      case 'bunny':
        ell('#fff', -w * 0.18, -h * 1.25, w * 0.1, h * 0.32, 0.1); ell('#ffb3cf', -w * 0.18, -h * 1.25, w * 0.045, h * 0.22, 0.1); ell('#fff', w * 0.18, -h * 1.25, w * 0.1, h * 0.32, -0.1); ell('#ffb3cf', w * 0.18, -h * 1.25, w * 0.045, h * 0.22, -0.1);
        dome('#ffffff'); eyes(0.58); ell('#ff8fb0', w * 0.08, -h * 0.4, w * 0.05, h * 0.04); break;
      case 'drone': {
        c.fillStyle = '#5a5478'; c.fillRect(-w * 0.05, -h * 1.15, w * 0.1, h * 0.2); c.strokeRect(-w * 0.05, -h * 1.15, w * 0.1, h * 0.2);
        ell('#c3cadb', 0, -h * 1.2, w * 0.45 * Math.abs(Math.cos(t * 30)) + w * 0.06, h * 0.05);
        ell('#c9d3e0', 0, -h * 0.6, w * 0.42, h * 0.4); ell('#7cf2e6', w * 0.06, -h * 0.62, w * 0.2, h * 0.2); ell('#2b1640', w * 0.1, -h * 0.62, w * 0.09, h * 0.09);
        for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * w * 0.2, -h * 0.25); c.lineTo(s2 * w * 0.28, 0); c.stroke(); } break;
      }
      case 'ghosty':
        c.globalAlpha = 0.85; dome('#eaf6ff'); eyes(0.6); c.beginPath(); c.arc(w * 0.08, -h * 0.35, w * 0.06, 0, Math.PI); c.stroke(); c.globalAlpha = 1; break;
      case 'dragon':
        ell('#3fae4a', -w * 0.45, -h * 0.6, w * 0.2, h * 0.14, -0.6); for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * w * 0.12, -h * 1.0); c.lineTo(s2 * w * 0.22, -h * 1.3); c.lineTo(s2 * w * 0.3, -h * 0.95); c.closePath(); c.fillStyle = '#f2e3b5'; c.fill(); c.stroke(); }
        dome('#5ee07a'); eyes(0.58); ell('#c8f5a0', w * 0.05, -h * 0.2, w * 0.2, h * 0.14); break;
      case 'duck':
        dome('#ffd23f'); eyes(0.62, 0.13); ell('#ff9a3c', w * 0.3, -h * 0.4, w * 0.2, h * 0.1); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-w * 0.2, -h * 0.82, w * 0.08, h * 0.06, -0.6, 0, TAU); c.fill();
        c.fillStyle = '#fff6b0'; starPath(c, -w * 0.3, -h * 1.0, w * 0.1, t * 2, 4, 0.4); c.fill(); break;
    }
    c.restore();
  };
})();
