// GUBS game data: skins, trails, auras, upgrades, abilities, modes.
(function () {
  'use strict';
  const GD = window.GD = {};

  GD.RARITY = {
    common: { name: 'COMMON', color: '#8fa6bd' },
    rare: { name: 'RARE', color: '#3aa8f0' },
    epic: { name: 'EPIC', color: '#a566ff' },
    legendary: { name: 'LEGENDARY', color: '#ff9f1c' }
  };

  // acc = accessories drawn by GubDraw; pat = body pattern; pc = pattern colour
  GD.SKINS = [
    // ---------- common ----------
    { id: 'gub', name: 'Gub', rarity: 'common', price: 0, body: '#5ee07a', pat: 'belly' },
    { id: 'bubble', name: 'Bubblegum', rarity: 'common', price: 150, body: '#ff8fc8', pat: 'belly', acc: ['bow'] },
    { id: 'sky', name: 'Sky Gub', rarity: 'common', price: 200, body: '#6cc8ff', pat: 'belly', acc: ['cap'] },
    { id: 'sunny', name: 'Sunny', rarity: 'common', price: 250, body: '#ffd84a', pat: 'belly', acc: ['flower'] },
    { id: 'minty', name: 'Propeller Gub', rarity: 'common', price: 250, body: '#7cf2e6', pat: 'belly', acc: ['prop'] },
    { id: 'peachy', name: 'Peachy Cat', rarity: 'common', price: 300, body: '#ffb08a', pat: 'spots', pc: 'rgba(255,120,80,0.45)', acc: ['catears'] },
    { id: 'lemon', name: 'Cool Lemon', rarity: 'common', price: 350, body: '#f6ee5a', pat: 'belly', acc: ['shades'] },
    // ---------- rare ----------
    { id: 'grape', name: 'Grape', rarity: 'rare', price: 600, body: '#b07cff', pat: 'belly', acc: ['antenna'] },
    { id: 'bunny', name: 'Bunny Gub', rarity: 'rare', price: 800, body: '#fff2f8', pat: 'belly', acc: ['bunny'] },
    { id: 'ninja', name: 'Ninja Gub', rarity: 'rare', price: 900, body: '#4a4e66', acc: ['headband'] },
    { id: 'cowboy', name: 'Cowboy Gub', rarity: 'rare', price: 900, body: '#d9a066', pat: 'spots', pc: 'rgba(120,70,20,0.35)', acc: ['cowboy'] },
    { id: 'pirate', name: 'Pirate Gub', rarity: 'rare', price: 1100, body: '#e85a5a', pat: 'stripes', pc: '#ffffff', acc: ['pirate'] },
    { id: 'dj', name: 'DJ Gub', rarity: 'rare', price: 1200, body: '#4d4dff', pat: 'stripes', pc: '#2ef2ff', acc: ['phones'] },
    { id: 'wizard', name: 'Wizard Gub', rarity: 'rare', price: 1400, body: '#8a5cff', pat: 'stars', pc: '#ffe66b', acc: ['wizard'] },
    // ---------- epic ----------
    { id: 'cactus', name: 'Cactus Gub', rarity: 'epic', price: 2000, body: '#5ec26a', pat: 'belly', acc: ['spikes', 'flower'] },
    { id: 'robo', name: 'Robo Gub', rarity: 'epic', price: 2200, body: '#c9d3e0', pat: 'metal', acc: ['visor', 'antenna'] },
    { id: 'devil', name: 'Devil Gub', rarity: 'epic', price: 2400, body: '#e8455f', pat: 'belly', acc: ['horns', 'tail'] },
    { id: 'ghost', name: 'Ghost Gub', rarity: 'epic', price: 2600, body: '#eaf6ff', pat: 'ghost' },
    { id: 'astro', name: 'Astro Gub', rarity: 'epic', price: 2800, body: '#ffffff', pat: 'belly', acc: ['helmet'] },
    { id: 'candy', name: 'Candy Gub', rarity: 'epic', price: 3000, body: '#ff8fc8', pat: 'candy', pc: '#ffffff', acc: ['lolli'] },
    { id: 'dino', name: 'Dino Gub', rarity: 'epic', price: 3200, body: '#6fd25a', pat: 'scales', acc: ['plates', 'tail'] },
    // ---------- legendary ----------
    { id: 'king', name: 'King Gub', rarity: 'legendary', price: 5000, body: '#ff7a4a', pat: 'belly', acc: ['crown'] },
    { id: 'golden', name: 'Golden Gub', rarity: 'legendary', price: 8000, body: '#ffcf3d', pat: 'gold', acc: ['halo'], sparkle: '#fff6b0' },
    { id: 'galaxy', name: 'Galaxy Gub', rarity: 'legendary', price: 9000, body: '#2a1760', pat: 'galaxy', acc: ['orbit'], sparkle: '#c9b3ff' },
    { id: 'lava', name: 'Lava Gub', rarity: 'legendary', price: 9500, body: '#3b1610', pat: 'lava', acc: ['flame'], sparkle: '#ffb03a' },
    { id: 'rainbow', name: 'Rainbow Gub', rarity: 'legendary', price: 10000, body: '#ff6fb1', pat: 'rainbow', sparkle: '#ffffff' },
    { id: 'unicorn', name: 'Unicorn Gub', rarity: 'legendary', price: 11000, body: '#fff0ff', pat: 'belly', acc: ['unicorn'], sparkle: '#ffd8ff' },
    { id: 'dragon', name: 'Dragon Gub', rarity: 'legendary', price: 12000, body: '#4acb6a', pat: 'scales', acc: ['horns', 'wings', 'tail'], sparkle: '#ffb03a' },
    // ---------- added in 4.0 ----------
    { id: 'chef', name: 'Chef Gub', rarity: 'common', price: 400, body: '#ffffff', pat: 'belly', acc: ['chef'] },
    { id: 'santa', name: 'Santa Gub', rarity: 'rare', price: 1300, body: '#e8455f', pat: 'belly', acc: ['santa'] },
    { id: 'viking', name: 'Viking Gub', rarity: 'rare', price: 1500, body: '#d9a066', pat: 'belly', acc: ['viking'] },
    { id: 'mushroom', name: 'Shroom Gub', rarity: 'rare', price: 1600, body: '#f5e6d0', pat: 'spots', pc: 'rgba(255,111,177,0.4)', acc: ['shroomcap'] },
    { id: 'jester', name: 'Jester Gub', rarity: 'epic', price: 2900, body: '#b07cff', pat: 'stripes', pc: '#ffd84a', acc: ['jester'] },
    { id: 'shark', name: 'Shark Gub', rarity: 'epic', price: 3300, body: '#5a8fc8', pat: 'belly', acc: ['sharkfin'] },
    { id: 'panda', name: 'Panda Gub', rarity: 'epic', price: 3500, body: '#ffffff', pat: 'panda', acc: ['pandaears'] },
    { id: 'pumpkin', name: 'Pumpkin Gub', rarity: 'legendary', price: 7000, body: '#ff8a1a', pat: 'jack', acc: ['pumpkinstem'], sparkle: '#ffe14a' }
  ];

  const RAINBOW = ['#ff5f5f', '#ff9a3c', '#ffd84a', '#5ee07a', '#5cc4ff', '#b07cff'];

  GD.TRAILS = [
    { id: 'none', name: 'No Trail', price: 0 },
    { id: 'sparkle', name: 'Sparkle', price: 300, shape: 'star', colors: ['#fff6b0', '#ffffff'], size: 8, life: 0.5, rate: 26 },
    { id: 'hearts', name: 'Love', price: 500, shape: 'heart', colors: ['#ff8fc8', '#ff5f9a'], size: 9, life: 0.7, rate: 12, rise: 1 },
    { id: 'bubbles', name: 'Bubbles', price: 600, shape: 'bubble', colors: ['#bff2ff'], size: 14, life: 0.9, rate: 10, rise: 1 },
    { id: 'pixel', name: 'Pixel Dust', price: 700, shape: 'square', colors: ['#5cc4ff', '#ff6fb1', '#ffd84a', '#5ee07a'], size: 9, life: 0.5, rate: 30 },
    { id: 'snow', name: 'Snowfall', price: 800, shape: 'circle', colors: ['#ffffff'], size: 8, life: 0.9, rate: 20, fall: 1 },
    { id: 'rainbow', name: 'Rainbow', price: 1200, shape: 'circle', colors: RAINBOW, size: 12, life: 0.55, rate: 55, seq: 1 },
    { id: 'fire', name: 'Flame', price: 1500, shape: 'circle', colors: ['#ffd84a', '#ff8a4a', '#ff4f4f'], size: 13, life: 0.45, rate: 46, rise: 1 },
    { id: 'zap', name: 'Zap', price: 1800, shape: 'star', colors: ['#fff7a0', '#7cf2e6'], size: 11, life: 0.3, rate: 34 },
    { id: 'stardust', name: 'Stardust', price: 3000, shape: 'star', colors: ['#b07cff', '#ff6fb1', '#7cf2e6', '#ffffff'], size: 10, life: 0.7, rate: 42 }
  ];

  GD.AURAS = [
    { id: 'none', name: 'No Aura', price: 0 },
    { id: 'glow', name: 'Sunny Glow', price: 800, c1: 'rgba(255,230,120,0.55)', c2: '#ffe66b', shape: 'star' },
    { id: 'frost', name: 'Frost', price: 1200, c1: 'rgba(150,230,255,0.5)', c2: '#d6f6ff', shape: 'circle' },
    { id: 'shadow', name: 'Shadow', price: 1600, c1: 'rgba(60,20,100,0.6)', c2: '#8a52d6', shape: 'circle' },
    { id: 'flame', name: 'Inferno', price: 2200, c1: 'rgba(255,120,40,0.55)', c2: '#ffb03a', shape: 'circle' },
    { id: 'prism', name: 'Prism', price: 3500, c1: 'prism', c2: 'prism', shape: 'star' }
  ];

  // Permanent upgrades. eff[l] describes the effect at level l (0..max).
  GD.UPGRADES = [
    { id: 'multi', name: 'Multi-Jump', max: 4, costs: [600, 1800, 4500, 10000],
      desc: 'Jump again in mid-air. Double, triple, quad and penta jumps!',
      eff: ['1 jump', '2 jumps (Double)', '3 jumps (Triple)', '4 jumps (Quad)', '5 jumps (PENTA!)'] },
    { id: 'spring', name: 'Super Springs', max: 5, costs: [300, 600, 1000, 1600, 2600],
      desc: 'Jump higher.', eff: ['+0%', '+7% power', '+14% power', '+21% power', '+28% power', '+35% power'] },
    { id: 'glide', name: 'Glider Cape', max: 3, costs: [900, 2200, 5000],
      desc: 'Hold the jump to float down gently.', eff: ['Off', 'Slow fall', 'Glide', 'Super glide'] },
    { id: 'dash', name: 'Fast Recharge', max: 5, costs: [400, 800, 1500, 2600, 4200],
      desc: 'Your dash charge refills faster.',
      eff: ['8 charge/s', '11 charge/s', '14 charge/s', '18 charge/s', '22 charge/s', '28 charge/s'] },
    { id: 'dlen', name: 'Long Dash', max: 5, costs: [500, 1000, 1800, 3000, 5000],
      desc: 'Dashing drains charge slower, so one dash lasts longer.',
      eff: ['1.7s of dash', '2.0s of dash', '2.4s of dash', '2.9s of dash', '3.6s of dash', '4.5s of dash'] },
    { id: 'dspd', name: 'Fast Dash', max: 4, costs: [600, 1300, 2400, 4200],
      desc: 'Dash much faster.', eff: ['Speed x2.2', 'Speed x2.6', 'Speed x3.0', 'Speed x3.4', 'Speed x3.8'] },
    { id: 'dpow', name: 'Strong Dash', max: 3, costs: [900, 2200, 5000],
      desc: 'A dash that hits harder.',
      eff: ['Smashes crates & Grumps', 'Smashes EVERYTHING', 'Wider smash + pulls coins', 'Every smash refills charge'] },
    { id: 'dlift', name: 'Sky Dash', max: 4, costs: [700, 1500, 3000, 5500],
      desc: 'Steer your dash upward faster. Fly up to the sky!',
      eff: ['Climb 260/s', 'Climb 480/s', 'Climb 700/s', 'Climb 920/s', 'Climb 1140/s'] },
    { id: 'magnet', name: 'Coin Magnet', max: 5, costs: [500, 1000, 1800, 3000, 5000],
      desc: 'Pull in nearby coins all the time.',
      eff: ['Off', 'Range 70', 'Range 140', 'Range 210', 'Range 280', 'Range 350'] },
    { id: 'power', name: 'Power Time', max: 5, costs: [500, 1000, 1800, 3000, 5000],
      desc: 'Power-ups last longer.', eff: ['x1.0', 'x1.2', 'x1.4', 'x1.6', 'x1.8', 'x2.0'] },
    { id: 'coin', name: 'Coin Boost', max: 5, costs: [700, 1400, 2400, 4000, 6500],
      desc: 'Every coin is worth more.', eff: ['x1.0', 'x1.1', 'x1.2', 'x1.3', 'x1.4', 'x1.5'] },
    { id: 'head', name: 'Head Start', max: 5, costs: [500, 1200, 2400, 4500, 8000],
      desc: 'Begin every run with Gubs in your squad.', eff: ['0 Gubs', '1 Gub', '2 Gubs', '4 Gubs', '6 Gubs', '10 Gubs'] },
    { id: 'shield', name: 'Bubble Armor', max: 3, costs: [800, 2000, 4500],
      desc: 'Start with a shield. Higher levels bring it back.',
      eff: ['None', 'Start shield', 'Regrows every 40s', 'Regrows every 20s'] },
    { id: 'lucky', name: 'Lucky Gubs', max: 3, costs: [600, 1200, 2200],
      desc: 'More baby Gubs show up needing help.', eff: ['x1.0', 'x1.25', 'x1.5', 'x1.8'] },
    { id: 'slam', name: 'Mega Slam', max: 3, costs: [700, 1500, 3000],
      desc: 'Slam shockwave reaches further.', eff: ['x1.0', 'x1.3', 'x1.6', 'x2.0'] },
    { id: 'cdr', name: 'Quick Charge', max: 5, costs: [900, 1800, 3200, 5500, 9000],
      desc: 'Your ability recharges faster.', eff: ['0%', '-10%', '-20%', '-30%', '-40%', '-50%'] }
  ];

  GD.ABILITIES = [
    { id: 'bubble', name: 'Bubble Shield', price: 0, cd: 25, desc: 'Instantly pop up a protective bubble.' },
    { id: 'slow', name: 'Time Warp', price: 1200, cd: 30, desc: 'Slow down time for 3 seconds.' },
    { id: 'pulse', name: 'Coin Vacuum', price: 1800, cd: 22, desc: 'Sucks in every coin and rescues every Gub on screen.' },
    { id: 'bomb', name: 'Gub Bomb', price: 2500, cd: 35, desc: 'BOOM! Blows up everything nearby.' },
    { id: 'rocket', name: 'Rocket Boost', price: 3000, cd: 40, desc: 'Blast off toward space!' },
    { id: 'phase', name: 'Phase Shift', price: 3500, cd: 40, desc: 'Ghost through everything for 3 seconds.' },
    { id: 'call', name: 'Squad Call', price: 4500, cd: 45, desc: 'Summon 6 Gubs to join your squad.' },
    { id: 'star', name: 'Star Surge', price: 6000, cd: 50, desc: 'Become an unstoppable star for 4 seconds.' }
  ];

  GD.PETS = [
    { id: 'none', name: 'No Pet', price: 0, perk: '' },
    { id: 'puppy', name: 'Puppy', price: 1500, perk: 'Pulls in coins (+150 range)' },
    { id: 'kitty', name: 'Kitty', price: 2000, perk: 'More baby Gubs need rescuing (+30%)' },
    { id: 'birdie', name: 'Birdie', price: 2500, perk: 'Free glide: hold jump to float' },
    { id: 'bunny', name: 'Bun-Bun', price: 3000, perk: 'Jump 6% higher' },
    { id: 'drone', name: 'Drone', price: 3500, perk: 'Dash recharges faster' },
    { id: 'ghosty', name: 'Ghosty', price: 4500, perk: 'Free shield every 45 seconds' },
    { id: 'dragon', name: 'Dragonling', price: 6000, perk: 'Power-ups last 30% longer' },
    { id: 'duck', name: 'Golden Duck', price: 8000, perk: 'Every coin is worth 15% more' }
  ];

  // trophies: three tiers per stat. value() is looked up by key in game.js
  const T3 = [100, 400, 1500];
  const TR = [
    ['meters', 'Marathoner', n => 'Run ' + n.toLocaleString('en-US') + 'm in total', [2000, 20000, 200000]],
    ['runs', 'Regular', n => 'Play ' + n + ' runs', [10, 100, 500]],
    ['coins', 'Coin Hoarder', n => 'Collect ' + n.toLocaleString('en-US') + ' coins', [500, 5000, 50000]],
    ['stomps', 'Grump Stomper', n => 'Stomp ' + n + ' enemies', [25, 250, 1500]],
    ['crates', 'Crate Crusher', n => 'Smash ' + n + ' crates', [50, 500, 3000]],
    ['rescued', 'Gub Guardian', n => 'Rescue ' + n + ' baby Gubs', [25, 250, 2000]],
    ['dashes', 'Dash Master', n => 'Dash ' + n + ' times', [25, 250, 1500]],
    ['powerups', 'Power Player', n => 'Grab ' + n + ' power-ups', [15, 150, 1000]],
    ['maxAlt', 'Sky High', n => 'Reach ' + n + 'm altitude', [40, 150, 400]],
    ['maxSquad', 'Squad Goals', n => 'Lead a squad of ' + n, [10, 50, 250]],
    ['bosses', 'Boss Slayer', n => 'Defeat ' + n + (n === 1 ? ' boss' : ' bosses'), [1, 5, 20]],
    ['close', 'Daredevil', n => 'Make ' + n + ' close calls', [20, 150, 800]],
    ['combo', 'Combo King', n => 'Chain a x' + n + ' combo', [8, 20, 45]],
    ['best', 'High Scorer', n => 'Score ' + n.toLocaleString('en-US') + ' in one run', [10000, 100000, 1000000]],
    ['skins', 'Collector', n => 'Own ' + n + ' Gubs', [6, 14, 28]],
    ['level', 'Gub Level', n => 'Reach player level ' + n, [5, 15, 30]],
    ['streak', 'Daily Devotee', n => 'Claim gifts ' + n + ' days in a row', [3, 7, 14]]
  ];
  GD.ACH = [];
  const ROM = ['I', 'II', 'III'];
  TR.forEach(t => t[3].forEach((n, i) => GD.ACH.push({ id: t[0] + i, stat: t[0], name: t[1] + ' ' + ROM[i], desc: t[2](n), target: n, reward: T3[i] })));

  GD.MODES = [
    { id: 'classic', name: 'CLASSIC', desc: 'Run forever. Climb all the way to space.', c: '#ffd84a' },
    { id: 'sky', name: 'SKY CLIMB', desc: 'No ground. Just up, up, UP!', c: '#6cc8ff' },
    { id: 'rush', name: 'TIME RUSH', desc: '60 seconds. Coins and Gubs add time.', c: '#ff8fc8' },
    { id: 'daily', name: 'DAILY RUN', desc: 'Same course for everyone today.', c: '#7dff9a' },
    { id: 'zen', name: 'ZEN', desc: 'Relax. No game over. Half coins.', c: '#b9a1ff' },
    { id: 'boss', name: 'BOSS RUSH', desc: 'Grump Kings, back to back!', c: '#ff7a6a' },
    { id: 'party', name: 'GUB PARTY', desc: 'Start with 25 Gubs. Babies everywhere!', c: '#ffa94d' }
  ];

  GD.ZONES = ['GROUND', 'SKY', 'STRATOSPHERE', 'SPACE', 'DEEP SPACE'];
})();
