// Gubbies procedural audio: chiptune music + synthesized SFX. No audio files needed.
(function () {
  'use strict';
  const Sound = {};
  let ac = null, comp = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let musicOn = true, sfxOn = true;
  let mode = null, nextTime = 0, step = 0, bpm = 112, intensity = 0;
  const MUSIC_VOL = 0.26, SFX_VOL = 0.55;

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  Sound.init = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      comp.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0; musicBus.connect(comp);
      sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? SFX_VOL : 0; sfxBus.connect(comp);
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setInterval(schedule, 25);
    } catch (e) { ac = null; }
  };

  Sound.setMusic = function (on) {
    musicOn = on;
    if (musicBus) musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ac.currentTime, 0.05);
  };
  Sound.setSfx = function (on) {
    sfxOn = on;
    if (sfxBus) sfxBus.gain.setTargetAtTime(on ? SFX_VOL : 0, ac.currentTime, 0.05);
  };
  Sound.suspend = function () { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); };
  Sound.resume = function () { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); };
  Sound.music = function (m) {
    if (m === mode) return;
    mode = m;
    if (ac) { nextTime = ac.currentTime + 0.06; step = 0; }
  };
  Sound.setIntensity = function (v) { intensity = v; };

  function env(g, t0, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function osc(type, f, t0, dur, vol, bus, f2) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    env(g, t0, 0.005, vol, dur);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, bus, ftype, freq, freq2) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = ftype;
    f.frequency.setValueAtTime(freq, t0);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
    const g = ac.createGain(); env(g, t0, 0.003, vol, dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }
  function kick(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 0.002, vol, 0.18);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.22);
  }

  // ---- music: C - G - Am - F, 4 bars of 16 steps ----
  const CHORDS = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
  const ARP = [0, 1, 2, 1, 2, 1, 0, 1, 0, 1, 2, 1, 2, 0, 2, 1];
  const MEL = {
    0: 72, 3: 76, 6: 79, 8: 76, 10: 79, 12: 81, 14: 79,
    16: 74, 19: 79, 22: 83, 24: 81, 26: 79, 28: 74, 30: 76,
    32: 76, 35: 81, 38: 84, 40: 83, 42: 81, 44: 76, 46: 79,
    48: 77, 51: 81, 54: 84, 56: 81, 58: 77, 60: 79, 62: 76
  };

  function schedule() {
    if (!ac || !mode || ac.state !== 'running') return;
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.02;
    const target = mode === 'menu' ? 112 : 136 + intensity * 26;
    bpm += (target - bpm) * 0.05;
    while (nextTime < ac.currentTime + 0.12) {
      playStep(step, nextTime);
      nextTime += 60 / bpm / 4;
      step = (step + 1) % 64;
    }
  }

  function playStep(s, t) {
    const bar = Math.floor(s / 16), st = s % 16, ch = CHORDS[bar];
    const game = mode === 'game';
    if (st % 4 === 0 && (game || st % 8 === 0)) kick(t, game ? 0.9 : 0.5);
    if (game && (st === 4 || st === 12)) noise(t, 0.12, 0.3, musicBus, 'bandpass', 1800);
    if (st % 4 === 2) noise(t, 0.04, game ? 0.16 : 0.07, musicBus, 'highpass', 7000);
    if (st === 0 || st === 3 || st === 8 || st === 11 || (game && st === 14)) {
      osc('triangle', mtof(ch[0] - 12), t, 0.24, 0.55, musicBus);
    }
    if (game || st % 2 === 0) {
      const n = ch[ARP[st]] + 12 + (st >= 8 ? 12 : 0);
      osc('square', mtof(n), t, 0.09, game ? 0.07 : 0.05, musicBus);
    }
    if (MEL[s]) osc(game ? 'square' : 'triangle', mtof(MEL[s]), t, 0.2, game ? 0.08 : 0.14, musicBus);
  }

  // ---- sound effects ----
  Sound.sfx = function (n, k) {
    if (!ac || !sfxOn || ac.state !== 'running') return;
    const t = ac.currentTime, b = sfxBus;
    switch (n) {
      case 'jump': osc('square', 300, t, 0.14, 0.16, b, 640); break;
      case 'djump': osc('square', 450, t, 0.16, 0.16, b, 980); osc('sine', 900, t + 0.03, 0.12, 0.12, b, 1500); break;
      case 'coin': {
        const m = 1 + Math.min(k || 0, 12) * 0.04;
        osc('square', 1320 * m, t, 0.06, 0.1, b); osc('square', 1760 * m, t + 0.05, 0.11, 0.1, b);
        break;
      }
      case 'stomp': osc('sine', 560, t, 0.22, 0.45, b, 150); osc('square', 280, t, 0.1, 0.1, b, 560); break;
      case 'smash': noise(t, 0.25, 0.5, b, 'lowpass', 2600, 300); osc('square', 180, t, 0.15, 0.18, b, 60); break;
      case 'dash': noise(t, 0.3, 0.4, b, 'bandpass', 800, 4200); osc('sawtooth', 200, t, 0.25, 0.1, b, 900); break;
      case 'slide': noise(t, 0.25, 0.22, b, 'bandpass', 1200, 500); break;
      case 'slam': osc('sine', 220, t, 0.32, 0.65, b, 40); noise(t, 0.3, 0.4, b, 'lowpass', 1200, 100); break;
      case 'whoosh': noise(t, 0.25, 0.2, b, 'bandpass', 2400, 400); break;
      case 'rescue': [72, 76, 79, 84].forEach((m, i) => osc('square', mtof(m), t + i * 0.06, 0.12, 0.11, b)); break;
      case 'power': [72, 76, 79, 84, 88, 91].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.045, 0.12, 0.2, b)); break;
      case 'hurt': osc('sawtooth', 420, t, 0.3, 0.22, b, 90); noise(t, 0.2, 0.3, b, 'lowpass', 1500); break;
      case 'shield': osc('sine', 1000, t, 0.4, 0.3, b, 200); noise(t, 0.2, 0.2, b, 'highpass', 3000); break;
      case 'die':
        osc('square', 523, t, 0.15, 0.18, b); osc('square', 392, t + 0.15, 0.15, 0.18, b);
        osc('square', 262, t + 0.3, 0.45, 0.2, b, 120); noise(t, 0.35, 0.4, b, 'lowpass', 900);
        break;
      case 'click': osc('square', 660, t, 0.05, 0.1, b); break;
      case 'deny': osc('square', 180, t, 0.12, 0.14, b); osc('square', 150, t + 0.1, 0.14, 0.14, b); break;
      case 'buy': [67, 72, 76, 79, 84].forEach((m, i) => osc('square', mtof(m), t + i * 0.05, 0.1, 0.12, b)); break;
      case 'mission': [72, 79, 84, 88].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.08, 0.22, 0.25, b)); break;
      case 'combo': osc('triangle', 880 * (1 + Math.min(k || 0, 10) * 0.06), t, 0.12, 0.2, b, 1320); break;
      case 'revive': [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => osc('square', mtof(m), t + i * 0.05, 0.12, 0.12, b)); break;
    }
  };

  window.Sound = Sound;
})();
