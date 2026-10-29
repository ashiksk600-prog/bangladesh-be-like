(() => {
'use strict';
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const W = 400, H = 640, RL = 44, RR = 356;
const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Funny Bangla lines ---------- */
const LINES = {
  start: ['ভাই, জ্যাম তো শেষই হয় না!', 'ভাড়া ২০ টাকা, নাকি ২০০ টাকা?', 'মামা, সামনে তো গাড়ির মেলা!'],
  bus: ['বাস ভাইয়ের তো ব্রেকই নাই!', 'আরে মামা, বাসের নিচে যাইতেছিলাম!'],
  cng: ['সিএনজি ভাই, মিটারে যান!', 'আরে মামা, দেখে চালান!'],
  cow: ['গরু মামা, রাস্তা কি তোমার একার?', 'গরুরও ভিআইপি মুভমেন্ট!'],
  goat: ['ছাগলও জ্যামে আটকা!', 'ব্যা ব্যা! রাস্তা ছাড়ো!'],
  pothole: ['রাস্তায় গর্ত, নাকি গর্তে রাস্তা?', 'ঝাঁকুনিতেই ওজন কমে যাবে!'],
  ped: ['ভাই, জেব্রা ক্রসিং কোথায়?', 'হঠাৎ রাস্তা পার! বাহ!'],
  taka: ['টাকা পেলাম, ভাড়া বাঁচলো!', 'খুচরা নাই, সব রেখে দিলাম!'],
  fuchka: ['ফুচকা! আরেকটু ঝাল দিয়েন!', 'টক-ঝাল-মিষ্টি, আহা!'],
  tea: ['এক কাপ চা, ক্লান্তি ফা!', 'চা খেয়ে আবার ফুরফুরে!'],
  mango: ['রাজশাহীর আম! শিল্ড চালু!', 'আম খেয়ে সুপারম্যান!'],
  mile: ['ফ্লাইওভার কবে হবে ভাই?', 'গুলশান? আরো ৫০ টাকা লাগবে!', 'এই জ্যামে চা-ই ভরসা!']
};
const OVER = 'আজকের মতো ছুটি, কাল আবার জ্যামে দেখা!';

const TY = { bus: [58, 120], cng: [40, 62], cow: [46, 74], goat: [34, 46], pothole: [54, 34], ped: [22, 34],
  taka: [28, 28], fuchka: [28, 28], tea: [28, 28], mango: [30, 30] };
const PICK = { taka: 10, fuchka: 25, tea: 20, mango: 30 };

/* ---------- State ---------- */
let state = 'menu', score, bonus, dist, lives, t, speed = 170, spawnT, shield, inv, shake, nextMile, off = 0;
let objs = [], parts = [], txts = [], sayCD = 0, sayTimer, sound = true, last = 0;
let hi = 0;
try { hi = +localStorage.getItem('bbl_hi') || 0; } catch (e) {}
const P = { x: 200, y: 500, tilt: 0 };
const K = { l: 0, r: 0, u: 0, d: 0 };
$('best').textContent = hi;

/* ---------- Sound ---------- */
let ac;
function snd(f, d = .1, type = 'square', v = .05, slide = 0, delay = 0) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const s = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, s);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), s + d);
    g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(.0001, s + d);
    o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + d);
  } catch (e) {}
}
const sfx = {
  coin: () => { snd(880, .08, 'square', .04); snd(1320, .12, 'square', .04, 0, .07); },
  hit: () => { snd(220, .35, 'sawtooth', .09, -170); snd(90, .3, 'square', .08, -40, .05); },
  horn: () => { snd(330, .18, 'square', .05); snd(415, .25, 'square', .05, 0, .17); },
  over: () => { [400, 330, 260, 180].forEach((f, i) => snd(f, .25, 'triangle', .08, 0, i * .22)); }
};

/* ---------- Speech bubble ---------- */
function say(text, ms = 2200, force) {
  if (!force && sayCD > 0) return;
  const b = $('bubble'); b.hidden = true; void b.offsetWidth;
  b.textContent = text; b.hidden = false; sayCD = 1.2;
  clearTimeout(sayTimer); sayTimer = setTimeout(() => b.hidden = true, ms);
}

/* ---------- Spawning ---------- */
function spawn() {
  const k = Math.random() < .36 ? pick(['taka', 'taka', 'fuchka', 'tea', 'mango']) :
    pick(['bus', 'bus', 'cng', 'cng', 'cow', 'goat', 'pothole', 'pothole', 'ped']);
  const [w, h] = TY[k]; let x = RL + w / 2 + Math.random() * (RR - RL - w), v = 1, vx = 0;
  if (k === 'bus' || k === 'cng') v = pick([.6, .85]);
  if (k === 'ped') { const l = Math.random() < .5; x = l ? RL + 10 : RR - 10; vx = (l ? 1 : -1) * (45 + Math.random() * 35); }
  if (k === 'cow' || k === 'goat') vx = (Math.random() - .5) * 24;
  const o = { k, x, y: -h - 10, w, h, v, vx, p: Math.random() * 6, c: rnd(4) };
  if (objs.some(a => Math.abs(a.x - o.x) < (a.w + o.w) / 2 + 12 && Math.abs(a.y - o.y) < (a.h + o.h) / 2 + 70)) return;
  objs.push(o);
}

/* ---------- Effects ---------- */
function burst(x, y, col, n = 14) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 180;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: .5 + Math.random() * .4, c: Array.isArray(col) ? pick(col) : col, s: 3 + rnd(4) }); }
}
const float = (x, y, s) => txts.push({ x, y, s, l: 1 });

/* ---------- Game flow ---------- */
function reset() {
  objs = []; parts = []; txts = []; score = bonus = dist = t = 0; lives = 3; spawnT = .6; shield = inv = shake = 0;
  nextMile = 500; P.x = 200; P.y = 500; speed = 170; $('bubble').hidden = true;
}
function start() { reset(); state = 'play'; $('overlay').hidden = true; sfx.horn(); say(pick(LINES.start), 2600, true); setPauseIcon(); }
function pause() { if (state === 'play') { state = 'pause'; ov(`<h2>বিরতি</h2><p>চা-সুতা খেয়ে আসুন ☕</p><button data-a="resume">▶ চালিয়ে যান</button><button data-a="play">↻ নতুন খেলা</button>`); setPauseIcon(); } }
function resume() { if (state === 'pause') { state = 'play'; $('overlay').hidden = true; last = performance.now(); setPauseIcon(); } }
function setPauseIcon() { $('btnPause').textContent = state === 'pause' ? '▶' : '⏸'; }
function gameOver() {
  state = 'over'; sfx.over(); const nb = score > hi;
  if (nb) { hi = score; try { localStorage.setItem('bbl_hi', hi); } catch (e) {} }
  $('best').textContent = hi; say(OVER, 4000, true);
  setTimeout(() => { if (state === 'over') ov(`<h2>গেম ওভার!</h2><p class="bn">${OVER}</p><p>স্কোর: <b>${score}</b><br>সেরা: <b>${hi}</b></p>${nb ? '<p>🏆 নতুন রেকর্ড!</p>' : ''}<button data-a="play">↻ আবার চালান</button>`); }, 900);
}
function ov(html) { const o = $('overlay'); o.innerHTML = '<div class="card">' + html + '</div>'; o.hidden = false; }
function menu() {
  state = 'menu';
  ov(`<h1>Bangladesh<br>Be Like</h1><p>ঢাকার জ্যামে রিকশা চালান!</p>
  <p class="how">তীর চিহ্ন / WASD দিয়ে চালান · Touch: নিচের বোতাম<br>P = বিরতি · R = রিস্টার্ট · M = সাউন্ড<br>🪙 ফুচকা ☕ 🥭 নিন — বাস, গরু, গর্ত এড়িয়ে চলুন!</p>
  <p>সেরা স্কোর: <b>${hi}</b></p><button data-a="play">▶ খেলা শুরু</button>`);
}
$('overlay').addEventListener('click', e => { const a = e.target.dataset.a; if (a === 'play') start(); if (a === 'resume') resume(); });
$('btnPause').onclick = () => state === 'pause' ? resume() : pause();
$('btnSound').onclick = toggleSound;
function toggleSound() { sound = !sound; $('btnSound').textContent = sound ? '🔊' : '🔇'; }

/* ---------- Input ---------- */
const KM = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowUp: 'u', w: 'u', W: 'u', ArrowDown: 'd', s: 'd', S: 'd' };
addEventListener('keydown', e => {
  if (KM[e.key]) { K[KM[e.key]] = 1; e.preventDefault(); return; }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') state === 'pause' ? resume() : pause();
  else if (e.key === 'r' || e.key === 'R') start();
  else if (e.key === 'm' || e.key === 'M') toggleSound();
  else if ((e.key === 'Enter' || e.key === ' ') && (state === 'menu' || state === 'over')) { start(); e.preventDefault(); }
  else if ((e.key === 'Enter' || e.key === ' ') && state === 'pause') resume();
});
addEventListener('keyup', e => { if (KM[e.key]) K[KM[e.key]] = 0; });
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k, on = e => { e.preventDefault(); K[k] = 1; b.classList.add('on'); }, off_ = e => { e.preventDefault(); K[k] = 0; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off_); b.addEventListener('pointercancel', off_); b.addEventListener('pointerleave', off_);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', () => { K.l = K.r = K.u = K.d = 0; });

/* ---------- Layout ---------- */
function fit() {
  const s = $('stage'), sc = Math.min((s.clientWidth - 8) / W, (s.clientHeight - 8) / H), f = $('frame');
  f.style.width = Math.floor(W * sc) + 'px'; f.style.height = Math.floor(H * sc) + 'px'; f.style.fontSize = Math.max(10, 16 * sc) + 'px';
}
addEventListener('resize', fit); addEventListener('orientationchange', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('stage'));

/* ---------- Update ---------- */
function update(dt) {
  t += dt; speed = 170 + Math.min(300, t * 4.5); dist += speed * dt / 18; off += speed * dt;
  sayCD -= dt; shield -= dt; inv -= dt; shake = Math.max(0, shake - dt);
  const dx = K.r - K.l, dy = K.d - K.u;
  P.x = clamp(P.x + dx * 240 * dt, RL + 20, RR - 20); P.y = clamp(P.y + dy * 200 * dt, 130, H - 50);
  P.tilt += (dx * .18 - P.tilt) * Math.min(1, dt * 10);
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(.3, .9 - t * .007) * (.7 + Math.random() * .6); }
  for (const o of objs) {
    o.y += speed * o.v * dt; o.x += o.vx * dt;
    if (o.k === 'ped' && (o.x < RL + 8 || o.x > RR - 8)) o.vx = -o.vx;
    if ((o.k === 'cow' || o.k === 'goat') && (o.x < RL + o.w / 2 || o.x > RR - o.w / 2)) o.vx = -o.vx;
    const pk = PICK[o.k];
    const hw = (o.w * (pk ? 1 : .8) + 26) / 2, hh = (o.h * (pk ? 1 : .85) + 46) / 2;
    if (Math.abs(o.x - P.x) < hw && Math.abs(o.y - P.y) < hh) {
      if (pk) {
        o.dead = 1; bonus += pk; float(o.x, o.y, '+' + pk); sfx.coin();
        burst(o.x, o.y, ['#ffd166', '#fff', '#ffb703'], 10);
        if (o.k === 'tea' && lives < 3) lives++;
        if (o.k === 'mango') shield = 5;
        if (Math.random() < .5) say(pick(LINES[o.k]), 1800);
      } else if (shield > 0) {
        o.dead = 1; bonus += 5; float(o.x, o.y, '+5'); burst(o.x, o.y, ['#ffd166', '#fff'], 12); snd(300, .15, 'square', .05, 300);
      } else if (inv <= 0) {
        lives--; inv = 1.4; shake = .35; P.y = Math.min(H - 50, P.y + 25); sfx.hit();
        burst(P.x, P.y, ['#ff595e', '#ffd166', '#fff'], 20); float(P.x, P.y - 30, 'ধপাস!');
        if (lives <= 0) { gameOver(); return; }
        say(pick(LINES[o.k]), 2400, true);
      }
    }
  }
  objs = objs.filter(o => !o.dead && o.y < H + 120);
  score = bonus + Math.floor(dist);
  if (score >= nextMile) { nextMile += 500; say(pick(LINES.mile), 2400, true); sfx.horn(); }
}
function updateFx(dt) {
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.l -= dt; }
  parts = parts.filter(p => p.l > 0);
  for (const x of txts) { x.y -= 40 * dt; x.l -= dt; }
  txts = txts.filter(x => x.l > 0);
}

/* ---------- Drawing helpers ---------- */
function rr(x, y, w, h, r, c) { if (c) ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function el(x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
const BC = ['#e63946', '#f4a261', '#2a9d8f', '#9b5de5'], SH = ['#06d6a0', '#ef476f', '#118ab2', '#ffd166'];

function drawBg() {
  ctx.fillStyle = '#b8a88a'; ctx.fillRect(0, 0, W, H);
  const idx = Math.floor(off / 100), oy = off % 100;
  for (let i = -1; i < 8; i++) {
    const y = oy + i * 100, n = i - idx;
    for (let s = 0; s < 2; s++) {
      const h = (((n * 37 + s * 11) % 6) + 6) % 6, x = s ? 358 : 2;
      rr(x, y + 4, 40, 92, 6, ['#f28482', '#84a59d', '#f6bd60', '#8ecae6', '#cdb4db', '#90be6d'][h]);
      rr(x + 5, y + 10, 30, 80, 4, '#0002');
      ctx.fillStyle = '#fff8'; for (let r = 0; r < 3; r++) { ctx.fillRect(x + 9, y + 18 + r * 24, 8, 10); ctx.fillRect(x + 23, y + 18 + r * 24, 8, 10); }
    }
  }
  ctx.fillStyle = '#4a4e57'; ctx.fillRect(RL, 0, RR - RL, H);
  ctx.fillStyle = '#ffd166'; ctx.fillRect(RL, 0, 3, H); ctx.fillRect(RR - 3, 0, 3, H);
  ctx.fillStyle = '#ffffffcc'; const o2 = off % 60;
  for (let i = 1; i < 4; i++) for (let y = -60; y < H; y += 60) ctx.fillRect(RL + i * 78 - 2, y + o2, 4, 30);
}
function drawRickshaw() {
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.tilt);
  const bob = Math.sin(t * 20) * .8;
  el(2, 6, 24, 34, '#0003');
  rr(-21, -4, 7, 28, 3, '#1b1b1b'); rr(14, -4, 7, 28, 3, '#1b1b1b'); rr(-3, -32, 6, 20, 3, '#1b1b1b');
  rr(-16, -4 + bob, 32, 38, 12, '#e63946'); rr(-16, 7 + bob, 32, 5, 0, '#ffd166'); rr(-16, 18 + bob, 32, 5, 0, '#2a9d8f');
  rr(-11, 27 + bob, 22, 5, 2, '#a4161a');
  rr(-10, -14, 20, 14, 6, '#457b9d'); el(0, -16, 8, 8, '#ffd166'); el(0, -17, 5, 5, '#8d5524');
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -17, 5.5, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -26); ctx.lineTo(14, -26); ctx.stroke();
  ctx.restore();
}
function drawObj(o) {
  ctx.save(); ctx.translate(o.x, o.y); const k = o.k, C = BC[o.c];
  if (PICK[k]) {
    ctx.translate(0, Math.sin(t * 6 + o.p) * 3); el(0, 0, 19, 19, '#ffffff44');
    if (k === 'taka') { el(0, 0, 13, 13, '#ffb703'); el(0, 0, 10, 10, '#ffd166'); ctx.fillStyle = '#9a6700'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('৳', 0, 1); }
    else if (k === 'fuchka') { el(0, 2, 12, 11, '#e9a23b'); el(0, -4, 5, 4, '#7a4b12'); el(-6, 3, 3, 3, '#6a994e'); el(5, 5, 3, 3, '#e63946'); }
    else if (k === 'tea') { rr(-10, -6, 18, 16, 4, '#fff'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, 2, 5, -1.5, 1.5); ctx.stroke(); el(-1, -5, 8, 3, '#8b5a2b');
      ctx.strokeStyle = '#fffc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -9); ctx.quadraticCurveTo(0 + Math.sin(t * 5) * 3, -14, -3, -18); ctx.stroke(); }
    else { ctx.rotate(-.5); el(0, 0, 12, 15, '#ffb703'); el(3, -3, 5, 8, '#ff8c0099'); el(3, -16, 3, 7, '#2d6a4f'); }
  } else if (k === 'bus') {
    rr(-27, -56, 58, 120, 10, '#0003'); rr(-29, -60, 58, 120, 10, C); rr(-25, -56, 50, 20, 5, '#bde0fe'); rr(-22, -28, 44, 80, 6, '#ffffff55');
    for (let i = 0; i < 4; i++) rr(-18, -22 + i * 19, 36, 12, 3, '#ffffff99');
    rr(-29, 50, 58, 10, 4, '#0004'); ctx.fillStyle = '#ffe66d'; ctx.fillRect(-24, -62, 10, 4); ctx.fillRect(14, -62, 10, 4);
    ctx.fillStyle = '#ff595e'; ctx.fillRect(-26, 59, 8, 3); ctx.fillRect(18, 59, 8, 3);
  } else if (k === 'cng') {
    rr(-23, -26, 5, 14, 2, '#222'); rr(18, -26, 5, 14, 2, '#222'); rr(-23, 12, 5, 14, 2, '#222'); rr(18, 12, 5, 14, 2, '#222');
    rr(-20, -31, 40, 62, 12, '#2a9d8f'); rr(-17, -28, 34, 16, 6, '#bde0fe'); rr(-20, -8, 40, 8, 2, '#ffd166'); rr(-14, 2, 28, 24, 6, '#1d6f64');
  } else if (k === 'cow') {
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(Math.sin(t * 4 + o.p) * 6, -42); ctx.stroke();
    el(0, -2, 19, 32, '#fff'); el(-6, -10, 7, 9, '#333'); el(8, 8, 6, 8, '#333');
    el(-13, 28, 4, 3, '#ddd'); el(13, 28, 4, 3, '#ddd'); el(0, 32, 11, 10, '#fff'); el(0, 38, 7, 5, '#f4a6b0');
    ctx.fillStyle = '#222'; ctx.fillRect(-6, 30, 3, 3); ctx.fillRect(3, 30, 3, 3);
  } else if (k === 'goat') {
    el(0, 0, 12, 20, '#d8c3a5'); el(0, 22, 8, 7, '#d8c3a5'); el(0, 29, 3, 4, '#8a6f4d');
    ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-5, 18); ctx.lineTo(-8, 10); ctx.moveTo(5, 18); ctx.lineTo(8, 10); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.fillRect(-4, 22, 2, 2); ctx.fillRect(2, 22, 2, 2);
  } else if (k === 'pothole') {
    el(0, 0, 29, 18, '#33363d'); el(0, 0, 25, 14, '#15171c'); el(-6, 1, 9, 4, '#4aa3df88');
  } else if (k === 'ped') {
    el(0, 4, 12, 8, SH[o.c]); el(0, 2, 7, 7, '#8d5524'); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 2, 7, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
}
function draw() {
  ctx.save(); if (shake > 0) ctx.translate((Math.random() - .5) * 18 * shake, (Math.random() - .5) * 18 * shake);
  drawBg();
  [...objs].sort((a, b) => a.y - b.y).forEach(drawObj);
  if (state !== 'menu' && !(inv > 0 && Math.floor(t * 14) % 2)) drawRickshaw();
  if (shield > 0 && state !== 'menu') { ctx.fillStyle = `rgba(255,209,102,${.25 + Math.sin(t * 10) * .1})`; ctx.beginPath(); ctx.arc(P.x, P.y, 42, 0, 7); ctx.fill(); }
  for (const p of parts) { ctx.globalAlpha = Math.min(1, p.l * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
  ctx.globalAlpha = 1; ctx.font = 'bold 20px "Noto Sans Bengali","Nirmala UI",sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000a';
  for (const x of txts) { ctx.fillStyle = '#ffd166'; ctx.strokeText(x.s, x.x, x.y); ctx.fillText(x.s, x.x, x.y); }
  ctx.restore();
}

/* ---------- Loop ---------- */
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  if (state === 'play') update(dt);
  else if (state !== 'pause') { off += 60 * dt; t += dt; shake = Math.max(0, shake - dt); }
  if (state !== 'pause') updateFx(dt);
  $('score').textContent = score || 0; $('lives').textContent = state === 'menu' ? '♥♥♥' : '♥'.repeat(Math.max(0, lives || 0));
  draw(); requestAnimationFrame(loop);
}
reset(); fit(); menu(); requestAnimationFrame(loop);
})();
