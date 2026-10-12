/* ═══════════════════════════════════════════════════════════════
   FisikaLab — RENDER: Canvas viewer + vektor + layout skenario
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const {SCENES, fmt, frac, D2R, clamp} = window.Fisika;

class Viewer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.ovec = {W: true, N: true, F: true, f: true, Wpar: true, Wperp: true, T: true, W1: true, W2: true, f1: true, f2: true, T1: true, T2: true};
    this.sceneId = 'flat';
    this.hoverVec = null;
    this.px = {x: 70, y: 70, s: 70};  // origin & scale
    this.resize();
    this._onResize = () => { this.ovecDrity = true; this.resize(); };
    window.addEventListener('resize', this._onResize);
  }
  setScene(id) { this.sceneId = id; this.resize(); }
  // ubah koordinat dunia (meter) → piksel
  cvt(xm, ym) { const w = this.scene(); const s = this.px.s; return {x: this.px.x + xm * s, y: this.px.y + ym * s}; }
  pxPerM() { return this.px.s; }
  scene() { return SCENES[this.sceneId]; }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = Math.max(320, r.width);
    this.H = Math.max(260, r.height);
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.cv.style.width = this.W + 'px';
    this.cv.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layout();
    this.staticDirty = true;
  }
  layout() {
    const sc = this.scene(); const w = sc.world;
    const HUD = 66;  // ruang bawah untuk kontrol play/speed
    const s = Math.min(this.W / (w.w + .6), (this.H - HUD) / (w.h + .3));
    this.px.s = s;
    // origin dunia: (0,0) = kiri-bawah; dunia y ke ATAS
    this.px.x = (this.W - s * w.w) / 2;
    this.px.y = this.H - HUD;
  }
  // dunia y ke atas: piksel = originY - y*s
  toPix(xm, ym) { const s = this.px.s; return {x: this.px.x + xm * s, y: this.px.y - ym * s}; }
  fromPix(px, py) { const s = this.px.s; return {x: (px - this.px.x) / s, y: (this.px.y - py) / s}; }

  draw(kin, val, p, opts) {
    const {ctx} = this; const sc = this.scene(); const s = this.px.s;
    const {W, H} = this;
    this.vectorHit = [];       // satu reset per frame; drawVectors boleh dipanggil berkali-kali
    ctx.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.body);
    const col = n => css.getPropertyValue(n).trim();

    // bg
    ctx.fillStyle = col('--bg2');
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = col('--line');
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= sc.world.w; gx++) { const a = this.toPix(gx, 0), b = this.toPix(gx, sc.world.h); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let gy = 0; gy <= sc.world.h; gy++) { const a = this.toPix(0, gy), b = this.toPix(sc.world.w, gy); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    switch (this.sceneId) {
      case 'flat': this.drawFlat(ctx, kin, val, p, col); break;
      case 'incline': this.drawIncline(ctx, kin, val, p, col); break;
      case 'atwood': this.drawAtwood(ctx, kin, val, p, col); break;
      case 'stack': this.drawStack(ctx, kin, val, p, col); break;
      case 'hang': this.drawHang(ctx, kin, val, p, col); break;
    }
  }

  /* ---------- shared helpers ---------- */
  ground(ctx, col, x0, x1, y = 0) {
    const a = this.toPix(x0, y), b = this.toPix(x1, y);
    ctx.fillStyle = col('--line2');
    ctx.fillRect(a.x, a.y, b.x - a.x, 8);
    // hatched
    ctx.strokeStyle = col('--line2');
    for (let x = a.x; x < b.x - 8; x += 16) {
      ctx.beginPath(); ctx.moveTo(x + 8, a.y + 8); ctx.lineTo(x, a.y + 18); ctx.stroke();
    }
  }
  rect(ctx, cx, cy, w, h, fill, rot = 0, radius = 6) {
    const p = this.toPix(cx, cy); const s = this.px.s;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot);
    ctx.fillStyle = fill;
    this.roundRect(ctx, -w * s / 2, -h * s, w * s, h * s, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    this.roundRect(ctx, -w * s / 2, -h * s, w * s, h * s, radius); ctx.stroke();
    ctx.restore();
  }
  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  label(ctx, text, x, y, color, size = 12, align = 'center') {
    if (text === undefined || text === null) text = '';
    ctx.font = `700 ${size}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.72)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  arrow(ctx, x1, y1, x2, y2, color, width = 3, head = 9) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const an = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(an - .42), y2 - head * Math.sin(an - .42));
    ctx.lineTo(x2 - head * Math.cos(an + .42), y2 - head * Math.sin(an + .42));
    ctx.closePath(); ctx.fill();
  }
  vscale(maxF, target = 1.5) { return target / Math.max(1, maxF); } // meter per newton

  /* ---------- vectors ---------- */
  palette() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return dark
      ? {W: '#a78bfa', N: '#e2e8f0', F: '#38bdf8', f: '#f87171', Wpar: '#fb7185', Wperp: '#fbbf24', T: '#34d399', W1: '#a78bfa', W2: '#c084fc', f1: '#fb923c', f2: '#f87171', T1: '#34d399', T2: '#22d3ee'}
      : {W: '#7c3aed', N: '#1e293b', F: '#0284c7', f: '#dc2626', Wpar: '#e11d48', Wperp: '#b45309', T: '#047857', W1: '#7c3aed', W2: '#9333ea', f1: '#c2410c', f2: '#dc2626', T1: '#047857', T2: '#0e7490'};
  }
  drawVectors(ctx, list, anchor, maxF, col, opts) {
    const cc = this.palette();
    const vs = this.vscale(maxF);
    list.forEach(v => {
      if (!this.ovec[v.id] || v.val <= 0.05) return;
      const a = this.toPix(anchor.x, anchor.y);
      const len = clamp(v.val * vs, 0.42, 2.6) * this.px.s;
      const dims = (v.dir !== undefined ? v.dir : {x: 0, y: 0});
      const ex = a.x + dims.x * len, ey = a.y + dims.y * len;
      const color = cc[v.id] || '#fff';
      const hot = this.hoverVec === v.id;
      this.arrow(ctx, a.x, a.y, ex, ey, color, hot ? 5 : 3, hot ? 12 : 9);
      if (hot) { ctx.save(); ctx.globalAlpha = .18; ctx.beginPath(); ctx.arc(ex, ey, 16, 0, 7); ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
      let lx, ly;
      if (v.labelPos === 'mid') {
        lx = a.x + dims.x * len * 0.6 + 26;
        ly = a.y + dims.y * len * 0.6 - 14;
      } else if (v.labelPos === 'right') {
        lx = a.x + dims.x * len + 30;
        ly = a.y + dims.y * len * 0.55;
      } else {
        lx = a.x + dims.x * (len + 18); ly = a.y + dims.y * (len + 12);
      }
      this.label(ctx, `${v.label}=${Math.round(v.val)}N`, lx, ly, color, hot ? 14 : 11.5);
      this.vectorHit.push({id: v.id, x1: a.x - 8, y1: Math.min(a.y, ey) - 10, x2: ex + 12, y2: Math.max(a.y, ey) + 10, cx: ex, cy: ey});
    });
  }
  tipHit(px, py, r = 14) {
    if (!this.vectorHit) return null;
    let best = null, bd = r;
    for (const h of this.vectorHit) {
      const d = Math.hypot(px - h.cx, py - h.cy);
      if (d < bd) { bd = d; best = h.id; }
    }
    return best;
  }
  hitVector(px, py) {
    if (!this.vectorHit) return null;
    let best = null, bd = 1e9;
    for (const h of this.vectorHit) {
      if (px >= h.x1 && px <= h.x2 && py >= h.y1 && py <= h.y2) {
        const d = Math.hypot(px - h.cx, py - h.cy);
        if (d < bd) { bd = d; best = h.id; }
      }
    }
    return best;
  }

  /* ---------- SCENE drawings ---------- */
  drawFlat(ctx, kin, val, p, col) {
    const s = this.px.s;
    this.ground(ctx, col, 0, 10);
    const bw = 1.1, bh = 0.8;
    this.rect(ctx, kin.x + bw / 2, 0, bw, bh, '#fbbf24');
    this.label(ctx, fmt(p.m, 1) + ' kg', ...Object.values(this.toPix(kin.x + bw / 2, bh / 2 + .06)), '#0b0f16', 13);
    // anchor = pusat balok
    const anchor = {x: kin.x + bw / 2, y: bh / 2};
    const maxF = Math.max(val.W, val.N, p.F, val.fsMax, val.fk, 1);
    const list = [
      {id: 'W', label: 'W', val: val.W, dir: {x: 0, y: 1}},
      {id: 'N', label: 'N', val: val.N, dir: {x: 0, y: -1}},
      {id: 'F', label: 'F', val: Math.abs(p.F), dir: {x: 1, y: 0}},
      {id: 'f', label: 'f', val: val.f > 0 ? val.f : 0, dir: {x: (kin.v < -1e-4 ? 1 : -1), y: 0}}
    ];
    this.drawVectors(ctx, list, anchor, maxF, col);
    if (kin.moving) {
      const a = this.toPix(anchor.x, 2.2);
      this.vmsign(ctx, a.x, a.y, Math.sign(kin.v) || 1, col('--acc'));
    }
  }
  vmsign(ctx, x, y, dir, color) {
    ctx.save(); ctx.globalAlpha = .8;
    for (let i = 0; i < 3; i++) {
      const off = i * 16 * dir;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + off, y - 9); ctx.lineTo(x + off + 9 * dir, y); ctx.lineTo(x + off, y + 9); ctx.stroke();
    }
    ctx.restore();
  }
  drawIncline(ctx, kin, val, p, col) {
    const rad = D2R(p.theta);
    const scL = this.scene(); const L = scL.sMax(p) / 0.92; // panjang bidang miring yang digambar
    const bx = 0.5, by = 0; // kaki
    // segitiga bidang
    const tip = {x: bx + L * Math.cos(rad), y: L * Math.sin(rad)};
    const a = this.toPix(bx, by), b = this.toPix(tip.x, tip.y), c = this.toPix(tip.x, by);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,.12)'; ctx.fill();
    ctx.strokeStyle = col('--a1'); ctx.lineWidth = 2; ctx.stroke();
    // lantai + sudut
    this.ground(ctx, col, 0, tip.x + .4);
    ctx.beginPath();
    const arcR = Math.min(this.px.s * 1.1, 60);
    ctx.arc(a.x, a.y, arcR, -rad, 0);
    ctx.strokeStyle = col('--warn'); ctx.lineWidth = 2; ctx.stroke();
    this.label(ctx, `${Math.round(p.theta)}°`, a.x + arcR * 1.25, a.y - arcR * 0.32, col('--warn'), 13);
    // balok di sepanjang bidang: posisi s dari kaki
    const sPos = clamp(kin.s, 0.35, scL.sMax(p));
    const cx = bx + sPos * Math.cos(rad), cy = sPos * Math.sin(rad);
    const bw = 0.95, bh = 0.7;
    // rect digambar dengan pusat di (cx,cy) + setengah tinggi menjauhi bidang (normal = -sin,cos)
    const nx2 = -Math.sin(rad), ny2 = Math.cos(rad);
    const bcx = cx + nx2 * bh / 2, bcy = cy + ny2 * bh / 2;
    const pp = this.toPix(bcx, bcy);
    ctx.save(); ctx.translate(pp.x, pp.y); ctx.rotate(-rad);
    ctx.fillStyle = '#fbbf24'; this.roundRect(ctx, -bw * this.px.s / 2, -bh * this.px.s / 2, bw * this.px.s, bh * this.px.s, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; this.roundRect(ctx, -bw * this.px.s / 2, -bh * this.px.s / 2, bw * this.px.s, bh * this.px.s, 6); ctx.stroke();
    ctx.restore();
    this.label(ctx, fmt(p.m, 1) + ' kg', pp.x, pp.y, '#0b0f16', 12.5);
    // vektor
    const anchor = {x: bcx, y: bcy};
    const maxF = Math.max(val.W, val.N, val.Wpar, val.f, 1);
    const list = [
      {id: 'W', label: 'W', val: val.W, dir: {x: 0, y: 1}},
      {id: 'N', label: 'N', val: val.N, dir: {x: nx2, y: -ny2}},
      {id: 'Wpar', label: 'W sinθ', val: val.Wpar, dir: {x: -Math.cos(rad), y: Math.sin(rad)}},
      {id: 'Wperp', label: 'W cosθ', val: val.Wperp, dir: {x: Math.sin(rad), y: Math.cos(rad)}},
      {id: 'f', label: 'f', val: val.f > 0 ? val.f : 0, dir: {x: Math.cos(rad), y: -Math.sin(rad)}}
    ];
    this.drawVectors(ctx, list, anchor, maxF, col);
  }
  drawAtwood(ctx, kin, val, p, col) {
    const cxM = 4;                // x katrol (m)
    const yTop = 6.2;             // tinggi katrol
    const pr = Math.min(this.px.s * 0.75, 40);
    // gantungan katrol: bracket horizontal di langit-langit + pengait pendek ke katrol
    const top = this.toPix(cxM, yTop);
    const ceil = this.toPix(cxM, yTop + 0.9);
    ctx.strokeStyle = col('--line2'); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(top.x - 90, ceil.y); ctx.lineTo(top.x + 90, ceil.y); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(top.x, ceil.y); ctx.lineTo(top.x, top.y - pr); ctx.stroke();
    ctx.beginPath(); ctx.arc(top.x, top.y, pr, 0, 7);
    ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.fill();
    ctx.strokeStyle = col('--mut'); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(top.x, top.y, pr * .4, 0, 7); ctx.stroke();
    // tali + balok
    const bw = 1.0, bh = .8;
    const d1 = kin.y1, d2 = kin.y2;
    const b1 = this.toPix(cxM - 1.1, yTop - d1 - bh / 2);
    const b2 = this.toPix(cxM + 1.1, yTop - d2 - bh / 2);
    ctx.strokeStyle = col('--ok'); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(b1.x, b1.y - bh * this.px.s / 2); ctx.lineTo(top.x, top.y);
    ctx.moveTo(top.x, top.y); ctx.lineTo(b2.x, b2.y - bh * this.px.s / 2); ctx.stroke();
    for (const [pp, mm, colr] of [[b1, p.m1, '#38bdf8'], [b2, p.m2, '#a78bfa']]) {
      ctx.fillStyle = colr; this.roundRect(ctx, pp.x - bw * this.px.s / 2, pp.y - bh * this.px.s / 2, bw * this.px.s, bh * this.px.s, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; this.roundRect(ctx, pp.x - bw * this.px.s / 2, pp.y - bh * this.px.s / 2, bw * this.px.s, bh * this.px.s, 6); ctx.stroke();
      this.label(ctx, fmt(mm, 1) + ' kg', pp.x, pp.y, '#0b0f16', 12.5);
    }
    // vektor: W ke bawah dari tiap balok, T searah tali menuju katrol
    const maxF = Math.max(val.W1, val.W2, val.T, 1);
    const anchor1 = {x: cxM - 1.1, y: yTop - d1 - bh / 2}, anchor2 = {x: cxM + 1.1, y: yTop - d2 - bh / 2};
    // arah tali (dari balok ke katrol), dinormalisasi di ruang pixel (dunia y ke atas)
    const ropeDir = (ax, ay) => {
      const dxw = cxM - ax, dyw = yTop - ay;
      const n = Math.hypot(dxw, dyw) || 1;
      return {x: dxw / n, y: -dyw / n};   // pixel: y negatif = naik
    };
    const r1 = ropeDir(anchor1.x, anchor1.y), r2 = ropeDir(anchor2.x, anchor2.y);
    const l1 = [{id: 'W1', label: 'W₁', val: val.W1, dir: {x: 0, y: 1}}, {id: 'T', label: 'T', val: val.T, dir: r1}];
    const l2 = [{id: 'W2', label: 'W₂', val: val.W2, dir: {x: 0, y: 1}}, {id: 'T', label: 'T', val: val.T, dir: r2}];
    this.drawVectors(ctx, l1, anchor1, maxF, col);
    this.drawVectors(ctx, l2, anchor2, maxF, col);
  }
  drawHang(ctx, kin, val, p, col) {
    const {xL, xR, yC} = this.scene().AX;
    const c1 = this.toPix(xL, yC), c2 = this.toPix(xR, yC);
    const ceilY = c1.y;
    // langit-langit: balok + arsir
    ctx.fillStyle = col('--line2');
    ctx.fillRect(c1.x - 24, ceilY - 10, (c2.x - c1.x) + 48, 10);
    ctx.strokeStyle = col('--line2');
    for (let x = c1.x - 16; x < c2.x + 24; x += 18) {
      ctx.beginPath(); ctx.moveTo(x + 9, ceilY); ctx.lineTo(x - 3, ceilY + 12); ctx.stroke();
    }
    // tali
    const k = this.toPix(val.kx, val.ky);
    ctx.strokeStyle = col('--ok'); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(c1.x, ceilY); ctx.lineTo(k.x, k.y); ctx.moveTo(c2.x, ceilY); ctx.lineTo(k.x, k.y); ctx.stroke();
    // simpul
    ctx.beginPath(); ctx.arc(k.x, k.y, 6, 0, 7); ctx.fillStyle = '#e2e8f0'; ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
    // tali bawah + beban (balok abu)
    const bh = 1.0, bw = 1.2;
    const bTop = val.ky - 0.9;
    const bY = Math.max(0.05, bTop - bh);
    const bp = this.toPix(val.kx + bw / 2, bY + bh / 2);
    ctx.strokeStyle = col('--ok'); ctx.lineWidth = 2.6;
    const bTopPix = this.toPix(val.kx, bTop);
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(bTopPix.x, bTopPix.y); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    this.roundRect(ctx, bp.x - bw * this.px.s / 2, bp.y - bh * this.px.s / 2, bw * this.px.s, bh * this.px.s, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; this.roundRect(ctx, bp.x - bw * this.px.s / 2, bp.y - bh * this.px.s / 2, bw * this.px.s, bh * this.px.s, 6); ctx.stroke();
    this.label(ctx, `${Math.round(p.W)} N`, bp.x, bp.y, '#0b0f16', 13);
    // sudut arcs (θ₁ dari horizontal-kanan jangkar kiri; θ₂ dari horizontal-kiri jangkar kanan)
    const arcR = Math.min(this.px.s * 1.2, 62);
    ctx.strokeStyle = col('--warn'); ctx.lineWidth = 1.8;
    const a1pix = Math.atan2(k.y - ceilY, k.x - c1.x);   // 0..π/2 (kanan-bawah)
    const a2pix = Math.atan2(k.y - ceilY, k.x - c2.x);   // π/2..π (kiri-bawah)
    ctx.beginPath(); ctx.arc(c1.x, ceilY, arcR, 0, a1pix); ctx.stroke();
    ctx.beginPath(); ctx.arc(c2.x, ceilY, arcR, Math.PI, a2pix, true); ctx.stroke();
    this.label(ctx, `${Math.round(p.t1)}°`, c1.x + arcR * 1.05, ceilY + arcR * 0.5, col('--warn'), 11.5);
    this.label(ctx, `${Math.round(p.t2)}°`, c2.x - arcR * 1.05, ceilY + arcR * 0.5, col('--warn'), 11.5);
    // vektor: T1 sepanjang tali kiri (arah simpul → jangkar), T2 idem, W dari beban ke bawah
    const maxF = Math.max(val.T1, val.T2, p.W, 1);
    const dirT1 = (() => { const dx = c1.x - k.x, dy = c1.y - k.y; const n = Math.hypot(dx, dy) || 1; return {x: dx / n, y: dy / n}; })();
    const dirT2 = (() => { const dx = c2.x - k.x, dy = c2.y - k.y; const n = Math.hypot(dx, dy) || 1; return {x: dx / n, y: dy / n}; })();
    const anchorK = {x: val.kx, y: val.ky};
    const anchorB = {x: val.kx + bw / 2, y: bY + bh / 2};
    this.drawVectors(ctx, [
      {id: 'T1', label: 'T₁', val: val.T1, dir: dirT1, labelPos: 'mid'},
      {id: 'T2', label: 'T₂', val: val.T2, dir: dirT2, labelPos: 'mid'}
    ], anchorK, maxF, col);
    this.drawVectors(ctx, [
      {id: 'W', label: 'W', val: p.W, dir: {x: 0, y: 1}, labelPos: 'right'}
    ], anchorB, maxF, col);
  }
  drawStack(ctx, kin, val, p, col) {
    const s = this.px.s;
    this.ground(ctx, col, 0, 10);
    const bw2 = 1.5, bh2 = .75, bw1 = 1.1, bh1 = .6;
    const x2 = kin.x2, x1 = kin.x2 + (bw2 - bw1) / 2 + kin.rel * 0.9;
    // bawah
    this.rect(ctx, x2 + bw2 / 2, 0, bw2, bh2, '#a78bfa');
    this.label(ctx, fmt(p.m2, 1) + ' kg', ...Object.values(this.toPix(x2 + bw2 / 2, bh2 / 2)), '#0b0f16', 12.5);
    // atas
    this.rect(ctx, x1 + bw1 / 2, bh2, bw1, bh1, '#38bdf8');
    this.label(ctx, fmt(p.m1, 1) + ' kg', ...Object.values(this.toPix(x1 + bw1 / 2, bh2 + bh1 / 2)), '#0b0f16', 12);
    // vektor: F kanan di bawah, f2 kiri di bawah, f1 kanan/geser di atas
    const maxF = Math.max(p.F, val.fs1Max, val.fs2Max, val.fs2Max, 1);
    const anchorB = {x: x2 + bw2 / 2, y: bh2 / 2};
    const anchorT = {x: x1 + bw1 / 2, y: bh2 + bh1 / 2};
    const lB = [{id: 'F', label: 'F', val: p.F, dir: {x: 1, y: 0}}, {id: 'f2', label: 'f₂', val: val.f2 > 0 ? val.f2 : 0, dir: {x: -1, y: 0}}, {id: 'N', label: 'N', val: val.N2, dir: {x: 0, y: -1}}, {id: 'W', label: 'W', val: val.N2, dir: {x: 0, y: 1}}];
    const lT = [{id: 'f1', label: 'f₁', val: val.f1 > 0 ? val.f1 : 0, dir: {x: 1, y: 0}}];
    this.drawVectors(ctx, lB, anchorB, maxF, col);
    this.drawVectors(ctx, lT, anchorT, maxF, col);
  }
}
/* export */
window.FisikaViewer = Viewer;
})();
