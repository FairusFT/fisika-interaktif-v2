/* ═══════════════════════════════════════════════════════════════
   FisikaLab — ENGINE: fisika + definisi skenario + teks pembahasan
   Semua perhitungan murni di sini; UI hanya membaca.
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const D2R = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n, dec = 2) => {
  if (!isFinite(n)) n = 0;
  return n.toLocaleString('id-ID', {maximumFractionDigits: dec, minimumFractionDigits: dec});
};
const fmt0 = n => (isFinite(n) ? Math.round(n) : 0).toLocaleString('id-ID');

/* latex-free fraction helper (HTML) */
const frac = (a, b) => `<span class="frac"><span class="num">${a}</span><span class="den">${b}</span></span>`;

/* helper step builder: {t: judul, g: rumus umum, s: substitusi, r: hasil, hl: bool} */
const S = (t, g, s, r, hl = false) => ({t, g, s, r, hl});

/* ═══════════════ SCENE: BIDANG DATAR ═══════════════ */
const flat = {
  id: 'flat', icon: '▭', name: 'Bidang Datar',
  desc: 'Balok ditarik gaya F di lantai yang punya gesekan.',
  params: [
    {k: 'm',   label: 'Massa m',          unit: 'kg', min: 1,   max: 20,  step: .5, def: 5},
    {k: 'F',   label: 'Gaya tarik F',     unit: 'N',  min: 0,   max: 100, step: .5, def: 15},
    {k: 'mus', label: 'Gesek statis μs',  unit: '',   min: 0,   max: 1,   step: .05, def: .4},
    {k: 'muk', label: 'Gesek kinetis μk', unit: '',   min: 0,   max: 1,   step: .05, def: .3}
  ],
  X0: 1.2,   // posisi awal balok (m)
  world: {w: 10, h: 4.2},
  compute(p, kin) {
    const N = p.m * p.g;
    const W = N;
    const fsMax = p.mus * N, fk = p.muk * N;
    const v = kin.v;
    let moving = kin.moving, a = 0, f = 0, net = 0;
    const eps = 1e-6;
    if (!moving) {
      if (p.F > fsMax + 1e-9) { moving = true; kin.dir = 1; }
      else { f = p.F; a = 0; net = 0; }
    }
    /* v≈0 dan F masih di bawah batas statis → tetap diam (anti mundur) */
    if (moving && Math.abs(v) < 3e-3 && Math.abs(p.F) <= fsMax + 1e-9) {
      moving = false; kin.v = 0; f = p.F; a = 0; net = 0;
    }
    if (moving) {
      if (Math.abs(v) < 1e-4) kin.dir = p.F > 0 ? 1 : (p.F < 0 ? -1 : kin.dir || 1);
      const dirV = Math.abs(v) > 1e-4 ? Math.sign(v) : kin.dir;
      const ff = fk * (-dirV);           // gesek kinetis melawan arah gerak
      const netF = p.F + ff;
      a = netF / p.m;
      f = -ff;                            // besar gesek yang tampil (berlawanan gerak)
      net = netF;
      // berhenti: kecepatan akan melewati nol → cek ulang statis
      if (dirV !== 0 && v !== 0 && Math.sign(v + a * 0.016) !== dirV) {
        // prediksi singkat: berhenti
        kin.stopAfter = true;
      }
      if (Math.abs(v) < 3e-3 && Math.abs(p.F) <= fsMax && kin.stopAfter) {
        moving = false; kin.stopAfter = false; kin.v = 0;
        f = p.F; a = 0; net = 0;
      }
      // F=0 & sudah di bawah ambang → berhenti total
      if (!moving && Math.abs(p.F) <= fsMax) { kin.v = 0; }
    }
    kin.moving = moving;
    return {N, W, fsMax, fk, f: Math.abs(f), F_: p.F, a, net, moving,
            dirLabel: moving ? (v >= 0 ? 'ke kanan →' : '← ke kiri') : '—',
            Wpar: 0, Wperp: N, T: 0, extra: {}};
  },
  reset() { return {x: this.X0, v: 0, moving: false, dir: 1, stopAfter: false}; },
  integrate(p, kin, val, dt) {
    if (!kin.moving) return;
    const vNew = kin.v + val.a * dt;
    if (kin.v !== 0 && Math.sign(vNew) !== Math.sign(kin.v)) { kin.v = 0; kin.moving = false; return; }
    kin.v = vNew;
    if (Math.abs(kin.v) < 3e-3 && Math.abs(p.F) <= val.fsMax) { kin.v = 0; kin.moving = false; return; }
    kin.x += kin.v * dt;
    const maxX = this.world.w - 2.2, minX = 0.4;
    if (kin.x < minX) { kin.x = minX; kin.v = 0; kin.moving = false; }
    if (kin.x > maxX) { kin.x = maxX; kin.v = 0; kin.moving = false; }
  },
  drag(kin, dxM) { kin.x = clamp(kin.x + dxM, 0.4, this.world.w - 2.2); kin.v = 0; kin.moving = false; },
  status(p, v) {
    if (v.moving) return {cls: 'b-move', label: 'Balok Bergerak ⟶', reason:
      `Gaya tarik F = <b>${fmt(v.F_)}</b> N lebih besar dari gesek statis maksimum f<sub>s,maks</sub> = <b>${fmt(v.fsMax)}</b> N. Balok mulai bergerak, lalu ditahan gesek kinetis f<sub>k</sub> = <b>${fmt(v.fk)}</b> N.`};
    return {cls: 'b-static', label: 'Balok Diam (seimbang)', reason:
      `Gaya tarik F = <b>${fmt(v.F_)}</b> N masih di bawah gesek statis maksimum f<sub>s,maks</sub> = <b>${fmt(v.fsMax)}</b> N. Gesek statis menahan tepat sebesar <b>${fmt(v.f)}</b> N, sehingga ΣF = 0 dan balok tetap diam.`};
  },
  steps(p, v, lengkap) {
    const st = [];
    st.push(S('Gaya normal', 'N = m · g', `N = ${fmt(p.m)} × ${fmt(p.g)}`, `N = ${fmt(v.N)} N`));
    st.push(S('Berat', 'W = m · g', `W = ${fmt(p.m)} × ${fmt(p.g)}`, `W = ${fmt(v.W)} N`));
    st.push(S('Gesek statis maksimum', 'f<sub>s,maks</sub> = μ<sub>s</sub> · N', `f<sub>s,maks</sub> = ${fmt(p.mus)} × ${fmt(v.N)}`, `f<sub>s,maks</sub> = ${fmt(v.fsMax)} N`));
    st.push(S('Gesek kinetis', 'f<sub>k</sub> = μ<sub>k</sub> · N', `f<sub>k</sub> = ${fmt(p.muk)} × ${fmt(v.N)}`, `f<sub>k</sub> = ${fmt(v.fk)} N`));
    if (!v.moving) {
      st.push(S('Uji gerak', 'F  vs  f<sub>s,maks</sub>', `${fmt(p.F)} N  ${p.F > v.fsMax ? '>' : '≤'}  ${fmt(v.fsMax)} N`, 'Balok DIAM', true));
      st.push(S('Hukum I Newton', 'ΣF = 0', `F − f<sub>s</sub> = 0  →  f<sub>s</sub> = ${fmt(p.F)} N`, `a = 0 m/s²`, true));
    } else {
      st.push(S('Uji gerak', 'F  vs  f<sub>s,maks</sub>', `${fmt(p.F)} N  >  ${fmt(v.fsMax)} N`, 'Balok BERGERAK', true));
      st.push(S('Hukum II Newton', 'a = (F − f<sub>k</sub>) / m',
        `a = (${fmt(p.F)} − ${fmt(v.fk)}) / ${fmt(p.m)}`, `a = ${fmt(Math.abs(v.a))} m/s²` , true));
    }
    return st;
  },
  vecs(p, v, kin) {
    const list = [];
    list.push({id: 'W', label: 'W', val: v.W, note:
      {pemula: 'W itu berat — tarikan bumi ke bawah. Makin berat, makin susah didorong.', lengkap: `W = m·g = ${fmt(v.W)} N, arah selalu tegak lurus ke bawah.`}});
    list.push({id: 'N', label: 'N', val: v.N, note:
      {pemula: 'N itu "dorongan balik" lantai ke balok. Karena lantai tidak ambles, N menyeimbangkan berat.', lengkap: `N = m·g = ${fmt(v.N)} N (lantai rata).`}});
    list.push({id: 'F', label: 'F', val: p.F, note:
      {pemula: 'F itu gaya tarik yang kamu berikan dari slider "Gaya tarik".', lengkap: `F = ${fmt(p.F)} N ke kanan (gaya luar).`}});
    if (v.f > 0) list.push({id: 'f', label: 'f', val: v.f, note: v.moving
      ? {pemula: 'f di sini gesek KINETIS — "rem" dari lantai kasar yang melawan arah gerak.', lengkap: `f_k = μ_k·N = ${fmt(v.fk)} N, arah berlawanan gerak.`}
      : {pemula: 'f di sini gesek STATIS — menahan balok supaya tidak mulai bergerak. Besarnya menyesuaikan, sampai batas f_s,maks.', lengkap: `f_s = ${fmt(v.f)} N (menyesuaikan), batas maksimumnya ${fmt(v.fsMax)} N.`}});
    return list;
  },
  values(p, v) {
    return [['N — gaya normal', `${fmt(v.N)} N`], ['W — berat', `${fmt(v.W)} N`],
      ['f_s,maks', `${fmt(v.fsMax)} N`], ['f_k', `${fmt(v.fk)} N`],
      [`f — gesek aktual (${v.moving ? 'kinetis' : 'statis'})`, `${fmt(v.f)} N`],
      ['ΣF — resultan', `${fmt(v.net)} N`], ['a — percepatan', `${fmt(v.a)} m/s²`],
      ['Arah gerak', v.dirLabel]];
  }
};

/* ═══════════════ SCENE: BIDANG MIRING ═══════════════ */
const incline = {
  id: 'incline', icon: '◺', name: 'Bidang Miring',
  desc: 'Balok di bidang miring — berat terurai jadi komponen sin θ dan cos θ.',
  params: [
    {k: 'm',     label: 'Massa m',       unit: 'kg', min: 1,   max: 20, step: .5,  def: 4},
    {k: 'theta', label: 'Sudut θ',       unit: '°',  min: 5,   max: 80, step: 1,   def: 30},
    {k: 'mus',   label: 'Gesek statis μs', unit: '', min: 0,   max: 1,  step: .01, def: .6},
    {k: 'muk',   label: 'Gesek kinetis μk', unit: '', min: 0,  max: 1,  step: .01, def: .4}
  ],
  world: {w: 11, h: 5.6},
  reset() { return {s: 0.9, v: 0, moving: false, stopAfter: false}; }, // jarak dari kaki bukit (m)
  sMax(p) { const rad = D2R(p.theta); return Math.min(9, (this.world.h - 0.8) / Math.max(0.2, Math.sin(rad))) * 0.92; },
  compute(p, kin) {
    const rad = D2R(p.theta), sin = Math.sin(rad), cos = Math.cos(rad);
    const W = p.m * p.g, N = W * cos, Wpar = W * sin;
    const fsMax = p.mus * N, fk = p.muk * N;
    let moving = kin.moving, a = 0, f = 0, net = 0;
    if (!moving) {
      if (Wpar > fsMax + 1e-9) { moving = true; }
      else { f = Wpar; }
    }
    if (moving) {
      f = fk;
      net = Wpar - fk;
      a = net / p.m;
      if (kin.stopAfter && Math.abs(kin.v) < 3e-3) { kin.v = 0; moving = false; kin.stopAfter = false; f = Wpar; a = 0; net = 0; }
      if (Wpar <= fsMax) kin.stopAfter = true;
    }
    kin.moving = moving;
    return {N, W, Wpar, Wperp: N, fsMax, fk, f, a, net, moving, T: 0,
      dirLabel: moving ? 'turun bidang ↙' : '—', extra: {sin, cos}};
  },
  integrate(p, kin, val, dt) {
    if (!kin.moving) return;
    kin.v += val.a * dt;
    if (kin.v < 0) kin.v = 0;
    kin.s -= kin.v * dt;                    // s diukur dari kaki; bergerak turun → s mengecil
    if (kin.s < 0.35) { kin.s = 0.35; kin.v = 0; kin.moving = false; }
    const sMax = this.sMax(p);
    if (kin.s > sMax) { kin.s = sMax; kin.v = 0; kin.moving = false; }
  },
  drag(kin, dsM, p) { kin.s = clamp(kin.s + dsM, 0.35, this.sMax(p)); kin.v = 0; kin.moving = false; },
  status(p, v) {
    if (v.moving) return {cls: 'b-down', label: 'Balok Meluncur Turun ↙', reason:
      `Komponen berat sejajar bidang W·sin θ = <b>${fmt(v.Wpar)}</b> N mengalahkan gesek statis maksimum <b>${fmt(v.fsMax)}</b> N. Balok meluncur turun, gesek kinetis ${fmt(v.fk)} N melawan.`};
    return {cls: 'b-static', label: 'Balok Diam di Bidang', reason:
      `W·sin θ = <b>${fmt(v.Wpar)}</b> N masih ditahan gesek statis (maks <b>${fmt(v.fsMax)}</b> N). Gesek menahan sebesar ${fmt(v.f)} N — sudut belum cukup curam untuk meluncurkan balok.`};
  },
  steps(p, v, lengkap) {
    const st = [];
    st.push(S('Komponen tegak lurus', 'N = W · cos θ', `N = ${fmt(v.W)} × cos ${fmt0(p.theta)}°`, `N = ${fmt(v.N)} N`));
    st.push(S('Komponen sejajar', 'W<sub>∥</sub> = W · sin θ', `W<sub>∥</sub> = ${fmt(v.W)} × sin ${fmt0(p.theta)}°`, `W<sub>∥</sub> = ${fmt(v.Wpar)} N`));
    st.push(S('Gesek statis maksimum', 'f<sub>s,maks</sub> = μ<sub>s</sub> · N', `f<sub>s,maks</sub> = ${fmt(p.mus)} × ${fmt(v.N)}`, `f<sub>s,maks</sub> = ${fmt(v.fsMax)} N`));
    if (!v.moving) {
      st.push(S('Uji luncur', 'W<sub>∥</sub>  vs  f<sub>s,maks</sub>', `${fmt(v.Wpar)} N  ≤  ${fmt(v.fsMax)} N`, 'Balok DIAM', true));
      st.push(S('Kesetimbangan', 'ΣF = W<sub>∥</sub> − f<sub>s</sub> = 0', `f<sub>s</sub> = ${fmt(v.Wpar)} N`, 'a = 0 m/s²', true));
    } else {
      st.push(S('Uji luncur', 'W<sub>∥</sub>  vs  f<sub>s,maks</sub>', `${fmt(v.Wpar)} N  >  ${fmt(v.fsMax)} N`, 'Balok MELUNCUR', true));
      st.push(S('Hukum II Newton', 'a = (W<sub>∥</sub> − f<sub>k</sub>) / m',
        `a = (${fmt(v.Wpar)} − ${fmt(v.fk)}) / ${fmt(p.m)}`, `a = ${fmt(v.a)} m/s²`, true));
    }
    return st;
  },
  vecs(p, v) {
    return [
      {id: 'W', label: 'W', val: v.W, note: {pemula: 'W = tarikan bumi. Di bidang miring, berat "dipecah" jadi dua: yang menekan bidang dan yang menarik menyusuri bidang.', lengkap: `W = m·g = ${fmt(v.W)} N.`}},
      {id: 'N', label: 'N', val: v.N, note: {pemula: 'N itu dorongan bidang, tegak lurus permukaan. Makin miring, makin kecil N.', lengkap: `N = m·g·cos θ = ${fmt(v.N)} N.`}},
      {id: 'Wpar', label: 'W sinθ', val: v.Wpar, note: {pemula: 'Ini "bagian berat" yang menarik balok menyusuri bidang — biang keladi balok meluncur.', lengkap: `W sin θ = m·g·sin θ = ${fmt(v.Wpar)} N.`}},
      {id: 'Wperp', label: 'W cosθ', val: v.Wperp, note: {pemula: 'Ini "bagian berat" yang menekan permukaan — menentukan besar gaya normal.', lengkap: `W cos θ = m·g·cos θ = ${fmt(v.Wperp)} N = N.`}},
      {id: 'f', label: 'f', val: v.f, note: v.moving
        ? {pemula: 'Gesek kinetis — rem dari permukaan yang melawan luncuran.', lengkap: `f_k = μ_k·N = ${fmt(v.fk)} N.`}
        : {pemula: 'Gesek statis — menahan balok di tempatnya.', lengkap: `f_s = ${fmt(v.f)} N (batas ${fmt(v.fsMax)} N).`}}
    ];
  },
  values(p, v) {
    return [['W — berat', `${fmt(v.W)} N`], ['W sin θ (sejajar)', `${fmt(v.Wpar)} N`], ['W cos θ (tegak lurus)', `${fmt(v.Wperp)} N`],
      ['N — gaya normal', `${fmt(v.N)} N`], ['f_s,maks', `${fmt(v.fsMax)} N`], ['f_k', `${fmt(v.fk)} N`],
      [`f — gesek aktual (${v.moving ? 'kinetis' : 'statis'})`, `${fmt(v.f)} N`], ['ΣF — resultan', `${fmt(v.net)} N`],
      ['a — percepatan', `${fmt(v.a)} m/s²`]];
  }
};

/* ═══════════════ SCENE: MESIN ATWOOD ═══════════════ */
const atwood = {
  id: 'atwood', icon: '⚓', name: 'Mesin Atwood',
  desc: 'Dua balok bergantung di katrol licin — tali menghubungkan keduanya.',
  params: [
    {k: 'm1', label: 'Massa m₁ (kiri)',  unit: 'kg', min: 0.5, max: 20, step: .5, def: 3},
    {k: 'm2', label: 'Massa m₂ (kanan)', unit: 'kg', min: 0.5, max: 20, step: .5, def: 2}
  ],
  world: {w: 8, h: 6.4},
  reset() { return {y1: 2.0, y2: 2.0, v: 0, moving: false}; }, // y = jarak dari katrol (m)
  compute(p, kin) {
    const W1 = p.m1 * p.g, W2 = p.m2 * p.g;
    const T = (2 * p.m1 * p.m2 * p.g) / (p.m1 + p.m2);
    const a = Math.abs(p.m1 - p.m2) * p.g / (p.m1 + p.m2);
    const moving = Math.abs(p.m1 - p.m2) > 1e-9;
    const dir = p.m1 > p.m2 ? 1 : -1;   // +1: m1 turun, m2 naik
    kin.dir = moving ? dir : 0;
    kin.moving = moving;
    return {W1, W2, T: moving ? T : (W1 + W2) / 2, a: moving ? a : 0, moving, dir,
      N: 0, W: W1, fsMax: 0, fk: 0, f: 0, net: moving ? a * (p.m1 + p.m2) : 0,
      dirLabel: moving ? (dir === 1 ? 'm₁ turun, m₂ naik' : 'm₂ turun, m₁ naik') : '—',
      Wpar: 0, Wperp: 0};
  },
  integrate(p, kin, val, dt) {
    if (!val.moving) return;
    kin.v += val.a * dt;
    kin.y1 += val.dir * kin.v * dt;
    kin.y2 -= val.dir * kin.v * dt;
    const yMin = 0.7, yMax = this.world.h - 1.4;
    if (kin.y1 < yMin) { kin.y1 = yMin; kin.v = 0; }
    if (kin.y2 < yMin) { kin.y2 = yMin; kin.v = 0; }
    if (kin.y1 > yMax) { kin.y1 = yMax; kin.v = 0; }
    if (kin.y2 > yMax) { kin.y2 = yMax; kin.v = 0; }
  },
  drag(kin, dyM1) { kin.y1 = clamp(kin.y1 + dyM1, 0.7, this.world.h - 1.4); kin.y2 = clamp((this.reset().y1 + this.reset().y2) - kin.y1, 0.7, this.world.h - 1.4); kin.v = 0; },
  status(p, v) {
    if (!v.moving) return {cls: 'b-static', label: 'Sistem Diam (seimbang)', reason:
      `Berat kedua balok sama besar (W₁ = W₂ = <b>${fmt(v.W1)}</b> N), sehingga tidak ada yang menang tarik tambang — sistem diam.`};
    return {cls: 'b-move', label: v.dir === 1 ? 'm₁ Turun · m₂ Naik' : 'm₂ Turun · m₁ Naik', reason:
      `Berat balok ${v.dir === 1 ? 'm₁' : 'm₂'} (${fmt(v.dir === 1 ? v.W1 : v.W2)} N) lebih besar dari ${v.dir === 1 ? 'm₂' : 'm₁'} (${fmt(v.dir === 1 ? v.W2 : v.W1)} N). Sistem bergerak dipercepat: a = <b>${fmt(v.a)}</b> m/s², tegangan tali T = <b>${fmt(v.T)}</b> N.`};
  },
  steps(p, v, lengkap) {
    const st = [];
    st.push(S('Berat masing-masing', 'W₁ = m₁·g &nbsp; W₂ = m₂·g',
      `W₁ = ${fmt(p.m1)} × ${fmt(p.g)} = ${fmt(v.W1)} N · W₂ = ${fmt(p.m2)} × ${fmt(p.g)} = ${fmt(v.W2)} N`,
      v.moving ? 'Berat tidak sama' : 'W₁ = W₂', true));
    if (!v.moving) {
      st.push(S('Kesetimbangan', 'ΣF = W₁ − W₂ = 0', `${fmt(v.W1)} − ${fmt(v.W2)} = 0`, 'a = 0; T = W = ' + fmt(v.T) + ' N', true));
    } else {
      st.push(S('Hukum II Newton (sistem)', 'a = (W₁ − W₂) / (m₁ + m₂)',
        `a = ${fmt(Math.abs(v.W1 - v.W2))} / ${fmt(p.m1 + p.m2)}`, `a = ${fmt(v.a)} m/s²`, true));
      const heavy = v.dir === 1 ? 'm₁' : 'm₂', light = v.dir === 1 ? 'm₂' : 'm₁';
      const mH = v.dir === 1 ? p.m1 : p.m2, mL = v.dir === 1 ? p.m2 : p.m1;
      st.push(S('Tegangan tali', `T = ${light}·(g + a)`,
        `T = ${fmt(mL)} × (${fmt(p.g)} + ${fmt(v.a)})`, `T = ${fmt(v.T)} N`));
      st.push(S('Cek dengan balok berat', `T = ${heavy}·(g − a) dari sisi ${heavy}`,
        `T = ${fmt(mH)} × (${fmt(p.g)} − ${fmt(v.a)})`, `T = ${fmt(mH * (p.g - v.a))} N ✓ (sama di kedua sisi)`, false));
    }
    return st;
  },
  vecs(p, v) {
    const V = [];
    V.push({id: 'W1', label: 'W₁', val: v.W1, note: {pemula: 'Berat m₁ — tarikan bumi pada balok kiri.', lengkap: `W₁ = m₁·g = ${fmt(v.W1)} N.`}});
    V.push({id: 'W2', label: 'W₂', val: v.W2, note: {pemula: 'Berat m₂ — tarikan bumi pada balok kanan.', lengkap: `W₂ = m₂·g = ${fmt(v.W2)} N.`}});
    V.push({id: 'T', label: 'T', val: v.T, note: {pemula: 'T itu tarikan tali. Di katrol licin, kedua ujung tali menarik dengan besar yang SAMA.', lengkap: `T = ${fmt(v.T)} N di kedua sisi (tali & katrol ringan).`}});
    return V;
  },
  values(p, v) {
    return [['W₁ — berat kiri', `${fmt(v.W1)} N`], ['W₂ — berat kanan', `${fmt(v.W2)} N`],
      ['T — tegangan tali', `${fmt(v.T)} N`], ['ΣF — resultan', `${fmt(v.net)} N`],
      ['a — percepatan', `${fmt(v.a)} m/s²`], ['Arah gerak', v.dirLabel]];
  }
};

/* ═══════════════ SCENE: TUMPUKAN BALOK ═══════════════ */
const stack = {
  id: 'stack', icon: '▤', name: 'Tumpukan Balok',
  desc: 'Dua balok ditumpuk, gaya menarik balok bawah — cek gesekan antar balok.',
  params: [
    {k: 'm1',   label: 'Massa atas m₁',  unit: 'kg', min: 1, max: 8,   step: .5,  def: 2},
    {k: 'm2',   label: 'Massa bawah m₂', unit: 'kg', min: 1, max: 20,  step: .5,  def: 4},
    {k: 'F',    label: 'Gaya tarik F',   unit: 'N',  min: 0, max: 150, step: 2,   def: 30},
    {k: 'mus1', label: 'μs antar balok', unit: '',   min: 0, max: 1,   step: .05, def: .5},
    {k: 'muk1', label: 'μk antar balok', unit: '',   min: 0, max: 1,   step: .05, def: .4},
    {k: 'mus2', label: 'μs dengan lantai', unit: '', min: 0, max: 1,   step: .05, def: .3},
    {k: 'muk2', label: 'μk dengan lantai', unit: '', min: 0, max: 1,   step: .05, def: .2}
  ],
  world: {w: 10, h: 4.2},
  reset() { return {x2: 1.6, rel: 0, v1: 0, v2: 0, moving: false, slipping: false}; },
  compute(p, kin) {
    const g = p.g;
    const N1 = p.m1 * g;                     // normal antar balok
    const N2 = (p.m1 + p.m2) * g;            // normal dengan lantai
    const fs1Max = p.mus1 * N1, fk1 = p.muk1 * N1;
    const fs2Max = p.mus2 * N2, fk2 = p.muk2 * N2;
    let moving = kin.moving, slipping = kin.slipping, a1 = 0, a2 = 0, f1 = 0, f2 = 0;
    // fase diam total
    if (!moving) {
      if (p.F > fs2Max + 1e-9) { moving = true; } else { f2 = p.F; }
    }
    if (moving) {
      // asumsi bergerak bersama dulu
      const aTogether = (p.F - fk2) / (p.m1 + p.m2);
      const f1Needed = p.m1 * aTogether;
      if (!slipping && f1Needed <= fs1Max + 1e-9) {
        a1 = a2 = aTogether; f1 = f1Needed; f2 = fk2; kin.v1 = kin.v2 = kin.v2 || kin.v1 || 0;
        kin.v1 = kin.v2 = (kin.v2 || 0);
      } else {
        slipping = true;
        a1 = fk1 / p.m1;                     // balok atas didorong gesek kinetis
        a2 = (p.F - fk1 - fk2) / p.m2;
        f1 = fk1; f2 = fk2;
      }
      if (kin.stopAfter && Math.abs(kin.v2) < 3e-3) { moving = false; slipping = false; kin.v1 = kin.v2 = 0; kin.stopAfter = false; a1 = a2 = 0; f2 = p.F; f1 = 0; }
      if (p.F <= fs2Max) kin.stopAfter = true;
    }
    const net = moving ? (a2 * p.m2 + a1 * p.m1) : 0;
    kin.moving = moving; kin.slipping = slipping;
    return {N1, N2, fs1Max, fk1, fs2Max, fk2, f1: moving ? f1 : 0, f2: moving ? f2 : f2,
      a1, a2, a: moving && !slipping ? a2 : (moving ? a1 : 0), moving, slipping,
      N: N2, W: N2, W1: N1, fsMax: fs2Max, f: moving ? f2 : f2, net, T: 0,
      dirLabel: !moving ? '—' : (slipping ? 'atas & bawah beda percepatan' : 'keduanya bergerak bersama →'),
      Wpar: 0, Wperp: N2};
  },
  integrate(p, kin, val, dt) {
    if (!val.moving) return;
    kin.v2 += val.a2 * dt;
    kin.v1 += val.a1 * dt;
    if (kin.v2 < 0) kin.v2 = 0;
    kin.x2 += kin.v2 * dt;
    kin.rel += (kin.v1 - kin.v2) * dt;
    const maxX = this.world.w - 3.4, minX = 0.4;
    if (kin.x2 < minX) { kin.x2 = minX; kin.v2 = 0; }
    if (kin.x2 > maxX) { kin.x2 = maxX; kin.v2 = 0; }
    // batas geser relatif biar tetap "di atas" balok bawah
    const relMax = 0.5;
    if (kin.rel > relMax) { kin.rel = relMax; kin.v1 = kin.v2; }
    if (kin.rel < -relMax) { kin.rel = -relMax; kin.v1 = kin.v2; }
  },
  drag(kin, dxM) { kin.x2 = clamp(kin.x2 + dxM, 0.4, this.world.w - 3.4); kin.v1 = kin.v2 = 0; kin.moving = false; },
  status(p, v) {
    if (!v.moving) return {cls: 'b-static', label: 'Kedua Balok Diam', reason:
      `F = <b>${fmt(p.F)}</b> N belum melebihi gesek statis lantai f<sub>s2,maks</sub> = <b>${fmt(v.fs2Max)}</b> N. Sistem belum mau bergerak sama sekali.`};
    if (v.slipping) return {cls: 'b-down', label: 'Balok Atas Tergelincir!', reason:
      `Balok bawah dipercepat <b>${fmt(v.a2)}</b> m/s², tapi gesek maksimum antar balok (${fmt(v.fs1Max)} N) tidak cukup ikut membawa balok atas — balok atas hanya dipercepat <b>${fmt(v.a1)}</b> m/s² (didorong gesek kinetis ${fmt(v.fk1)} N) dan tergelincir di atasnya.`};
    return {cls: 'b-move', label: 'Kedua Balok Bergerak Bersama →', reason:
      `F = <b>${fmt(p.F)}</b> N mengalahkan gesek lantai (f<sub>k2</sub> = ${fmt(v.fk2)} N). Gesek antara balok masih sanggup ikut membawa balok atas (butuh ${fmt(v.f1)} N ≤ batas ${fmt(v.fs1Max)} N), jadi keduanya bergerak bersama dengan a = <b>${fmt(v.a2)}</b> m/s².`};
  },
  steps(p, v, lengkap) {
    const st = [];
    st.push(S('Normal antar balok', 'N₁ = m₁·g', `N₁ = ${fmt(p.m1)} × ${fmt(p.g)}`, `N₁ = ${fmt(v.N1)} N`));
    st.push(S('Normal ke lantai', 'N₂ = (m₁ + m₂)·g', `N₂ = (${fmt(p.m1)} + ${fmt(p.m2)}) × ${fmt(p.g)}`, `N₂ = ${fmt(v.N2)} N`));
    st.push(S('Gesek lantai', 'f<sub>s2,maks</sub> = μ<sub>s2</sub>·N₂', `f<sub>s2,maks</sub> = ${fmt(p.mus2)} × ${fmt(v.N2)}`, `f<sub>s2,maks</sub> = ${fmt(v.fs2Max)} N`));
    st.push(S('Gesek antar balok', 'f<sub>s1,maks</sub> = μ<sub>s1</sub>·N₁', `f<sub>s1,maks</sub> = ${fmt(p.mus1)} × ${fmt(v.N1)}`, `f<sub>s1,maks</sub> = ${fmt(v.fs1Max)} N`));
    if (!v.moving) {
      st.push(S('Uji gerak', 'F vs f<sub>s2,maks</sub>', `${fmt(p.F)} N ≤ ${fmt(v.fs2Max)} N`, 'Semua DIAM', true));
    } else if (v.slipping) {
      st.push(S('Uji gerak', 'F vs f<sub>s2,maks</sub>', `${fmt(p.F)} N > ${fmt(v.fs2Max)} N`, 'Bergerak — cek apakah balok atas ikut', true));
      st.push(S('Butuh gesek antar balok', 'f₁ = m₁ · a<sub>bersama</sub>', `f₁ = ${fmt(p.m1)} × ${fmt((p.F - v.fk2) / (p.m1 + p.m2))} = ${fmt(p.m1 * (p.F - v.fk2) / (p.m1 + p.m2))} N > ${fmt(v.fs1Max)} N`, 'Tidak cukup → TERGELINCIR', true));
      st.push(S('Percepatan balok atas', 'a₁ = f<sub>k1</sub> / m₁', `a₁ = ${fmt(v.fk1)} / ${fmt(p.m1)}`, `a₁ = ${fmt(v.a1)} m/s²`));
      st.push(S('Percepatan balok bawah', 'a₂ = (F − f<sub>k1</sub> − f<sub>k2</sub>) / m₂', `a₂ = (${fmt(p.F)} − ${fmt(v.fk1)} − ${fmt(v.fk2)}) / ${fmt(p.m2)}`, `a₂ = ${fmt(v.a2)} m/s²`, true));
    } else {
      st.push(S('Uji gerak', 'F vs f<sub>s2,maks</sub>', `${fmt(p.F)} N > ${fmt(v.fs2Max)} N`, 'Bergerak bersama', true));
      st.push(S('Hukum II Newton (sistem)', 'a = (F − f<sub>k2</sub>) / (m₁ + m₂)', `a = (${fmt(p.F)} − ${fmt(v.fk2)}) / ${fmt(p.m1 + p.m2)}`, `a = ${fmt(v.a2)} m/s²`, true));
      st.push(S('Cek gesek antara balok', 'f₁ = m₁·a', `f₁ = ${fmt(p.m1)} × ${fmt(v.a2)} = ${fmt(v.f1)} N ≤ ${fmt(v.fs1Max)} N`, 'Aman — balok atas ikut ✓'));
    }
    return st;
  },
  vecs(p, v) {
    return [
      {id: 'F', label: 'F', val: p.F, note: {pemula: 'F menarik balok BAWAH ke kanan.', lengkap: `F = ${fmt(p.F)} N pada balok bawah.`}},
      {id: 'f1', label: 'f₁', val: v.f1, note: {pemula: 'f₁ gesek antara balok atas & bawah — inilah yang "menyeret" balok atas ikut jalan.', lengkap: `f₁ = ${fmt(v.f1)} N (${v.slipping ? 'kinetis' : 'statis'}), batas ${fmt(v.fs1Max)} N.`}},
      {id: 'f2', label: 'f₂', val: v.f2, note: {pemula: 'f₂ gesek antara balok bawah & lantai — rem utama sistem.', lengkap: `f₂ = ${fmt(v.f2)} N, batas statis ${fmt(v.fs2Max)} N.`}},
      {id: 'W', label: 'W₂', val: v.N2, note: {pemula: 'Berat total kedua balok menekan lantai.', lengkap: `W total = (m₁+m₂)·g = ${fmt(v.N2)} N.`}},
      {id: 'N', label: 'N', val: v.N2, note: {pemula: 'Dorongan balik lantai, menyeimbangkan berat total.', lengkap: `N lantai = ${fmt(v.N2)} N.`}}
    ];
  },
  values(p, v) {
    return [['N₁ — normal antar balok', `${fmt(v.N1)} N`], ['N₂ — normal ke lantai', `${fmt(v.N2)} N`],
      ['f_s1,maks (antar balok)', `${fmt(v.fs1Max)} N`], ['f_s2,maks (lantai)', `${fmt(v.fs2Max)} N`],
      [`f₁ aktual (${v.slipping ? 'kinetis' : 'statis'})`, `${fmt(v.f1)} N`],
      [`f₂ aktual (${v.moving ? 'kinetis' : 'statis'})`, `${fmt(v.f2)} N`],
      ['a balok atas', `${fmt(v.a1)} m/s²`], ['a balok bawah', `${fmt(v.a2)} m/s²`],
      ['Status', !v.moving ? 'diam' : (v.slipping ? 'tergelincir' : 'bersama')]];
  }
};

/* ═══════════════ KUIS ═══════════════ */
const QUIZ = {
  flat: [
    {task: 'Balok (m = <b>5 kg</b>, μs = <b>0,5</b>) diam di lantai. Atur gaya tarik F <b>hampir tepat</b> di ambang balok mulai bergerak — tapi balok MASIH diam (selisih < 2% dari f_s,maks).',
     hint: 'Gesek statis maksimum = μs·m·g = 0,5 × 5 × 9,8 = 24,5 N. Setel F sedikit di bawah itu.',
     check: (p, v) => !v.moving && p.F > 0 && (v.fsMax - p.F) / v.fsMax < 0.03},
    {task: 'Buat balok bergerak dengan percepatan <b>a = 3 m/s²</b> (m = 4 kg, μk = 0,25). Berapa F yang pas? (toleransi ±0,15)',
     hint: 'a = (F − μk·m·g)/m → F = m·a + μk·m·g = 4·3 + 0,25·4·9,8.',
     check: (p, v) => Math.abs(p.m - 4) < 0.75 && Math.abs(p.muk - 0.25) < 0.03 && v.moving && Math.abs(Math.abs(v.a) - 3) < 0.15}
  ],
  incline: [
    {task: 'Sudut θ = <b>30°</b>, balok diam. Atur μs <b>sekecil mungkin</b> tanpa balok meluncur (selisih < 5% dari ambang).',
     hint: 'Ambang: tan θ = μs → μs ≈ tan 30° ≈ 0,577. Setel sedikit di atas itu.',
     check: (p, v) => Math.abs(p.theta - 30) < 1 && !v.moving && (v.fsMax - v.Wpar) / Math.max(v.Wpar, 1e-9) < 0.055 && v.fsMax >= v.Wpar - 1e-9},
    {task: 'Buat balok meluncur dengan percepatan a = <b>3,5 m/s²</b> di θ = 45° (toleransi ±0,2).',
     hint: 'a = g(sin θ − μk cos θ). Tanpa gesek: a = g·sin 45° ≈ 6,93 m/s². Terlalu besar — naikkan μk sampai tepat.',
     check: (p, v) => Math.abs(p.theta - 45) < 1 && v.moving && Math.abs(Math.abs(v.a) - 3.5) < 0.2}
  ],
  atwood: [
    {task: 'Atur kedua massa agar tegangan tali T = <b>48 N</b> saat sistem bergerak (toleransi ±1,5 N).',
     hint: 'T = 2·m₁·m₂·g/(m₁+m₂). Coba m₁ = 6 kg dan m₂ = 4 kg (T ≈ 47 N), lalu haluskan.',
     check: (p, v) => v.moving && Math.abs(v.T - 48) < 1.5},
    {task: 'Buat sistem <b>seimbang</b> (diam) dengan total massa = <b>10 kg</b>.',
     hint: 'Seimbang terjadi saat m₁ = m₂. Bagi 10 kg sama rata.',
     check: (p, v) => !v.moving && Math.abs(p.m1 + p.m2 - 10) < 0.6}
  ],
  stack: [
    {task: 'Bikin balok atas <b>tergelincir</b> (m₁ = 2 kg, m₂ = 4 kg, μs1 = 0,5). Cari F seminimal mungkin supaya slip (toleransi: baru saja slip).',
     hint: 'Slip terjadi saat m₁·a_bersama > μs1·m₁·g, dengan a_bersama = (F − μk2·(m₁+m₂)g)/(m₁+m₂). Naikkan F sedikit-sedikit.',
     check: (p, v) => v.moving && v.slipping && Math.abs(p.m1 - 2) < 0.6 && Math.abs(p.m2 - 4) < 0.6},
  ]
};

const SCENES = {flat, incline, atwood, stack};

/* ═══════════════ EXPORT ═══════════════ */
window.Fisika = {SCENES, QUIZ, fmt, fmt0, frac, clamp, D2R};
})();
