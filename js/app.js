/* ═══════════════════════════════════════════════════════════════
   FisikaLab — APP: state, loop fisika, UI, interaksi, kuis
   ═══════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const {SCENES, QUIZ, fmt, fmt0, clamp} = window.Fisika;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- state ---------- */
const S = {
  sceneId: 'flat',
  params: {},                 // per-scene param values
  kin: {},
  running: false,
  speed: 1,
  mode: 'pemula',
  selectedVec: null,
  showFPS: false,
  g: 9.8,
  lastVal: null
};
const scene = () => SCENES[S.sceneId];
const params = () => S.params[S.sceneId];

/* init params for all scenes */
for (const id in SCENES) {
  const sc = SCENES[id]; const p = {};
  sc.params.forEach(d => p[d.k] = d.def);
  p.g = 9.8;
  S.params[id] = p;
  S.kin[id] = sc.reset();
}

/* ---------- viewer ---------- */
const viewer = new window.FisikaViewer($('#cv'));

/* ---------- loop ---------- */
const FIXED_DT = 1 / 120;
let acc = 0, lastT = 0, dirty = true, panelT = 0, fpsT = 0, frames = 0, fps = 0;

function physics() {
  const sc = scene(), p = params(), kin = S.kin[S.sceneId];
  const steps = Math.min(12, Math.floor(acc / FIXED_DT));
  for (let i = 0; i < steps; i++) {
    const val = sc.compute(p, kin);
    sc.integrate(p, kin, val, FIXED_DT);
    acc -= FIXED_DT;
    S.lastVal = val;
  }
}

function loop(t) {
  requestAnimationFrame(loop);
  if (document.hidden) { lastT = t; return; }
  const dt = Math.min(0.25, (t - lastT) / 1000 || 0);
  lastT = t;

  if (S.running) {
    acc += dt * S.speed;
    physics();
    dirty = true;
  } else if (dirty) {
    S.lastVal = scene().compute(params(), S.kin[S.sceneId]);
  }

  if (S.running || dirty) viewer.draw(S.kin[S.sceneId], S.lastVal, params());

  /* panel: max 10 Hz saat jalan, langsung saat berubah */
  if (S.running ? (t - panelT > 100) : dirty) { panelT = t; updatePanel(); }

  if (!S.running) dirty = false;

  frames++;
  if (t - fpsT > 800) {
    fps = Math.round(frames * 1000 / (t - fpsT));
    if (S.showFPS) $('#fps').textContent = `FPS ${fps}`;
    frames = 0; fpsT = t;
  }
}

/* ---------- panel pembahasan ---------- */
let panelCache = '';
function updatePanel(force) {
  const v = S.lastVal; if (!v) return;
  const sc = scene(), p = params();
  const st = sc.status(p, v);
  let statusHtml = `<span class="badge ${st.cls}"><b></b>${st.label}</span><p class="reason">${st.reason}</p>`;
  /* law chips */
  const laws = [
    ['Hukum I Newton', !v.moving],
    ['Hukum II Newton', !!v.moving],
    ['Hukum III Newton', true],
    ['Gesek statis', !v.moving],
    ['Gesek kinetis', !!v.moving]
  ];
  statusHtml += `<div class="lawchips">` + laws.map(([n, on]) => `<span class="chip${on ? ' acc' : ''}">${n}</span>`).join('') + `</div>`;

  /* steps */
  const stepsAll = sc.steps(p, v, S.mode === 'lengkap');
  const list = S.mode === 'pemula' ? stepsAll.filter(s => s.hl) : stepsAll;
  const stepsHtml = list.map(s => {
    if (S.mode === 'pemula') {
      return `<div class="step hl"><div class="step__t">${s.t}</div><div class="eq res">${s.r}</div></div>`;
    }
    return `<div class="step${s.hl ? ' hl' : ''}"><div class="step__t">${s.t}</div>
      <div class="eq gen">${s.g}</div><div class="eq">${s.s}</div><div class="eq res">${s.r}</div></div>`;
  }).join('');

  /* values */
  const rows = sc.values(p, v);
  const valsHtml = rows.map(([k, val], i) => {
    const hl = /^a —|^a /.test(k) && v.moving;
    return `<tr${hl ? ' class="hl"' : ''}><td class="k">${k}</td><td class="v">${val}</td></tr>`;
  }).join('');

  /* vec note */
  let noteHtml = '';
  if (S.selectedVec) {
    const vecList = sc.vecs(p, v);
    const vec = vecList.find(x => x.id === S.selectedVec);
    if (vec) {
      const txt = S.mode === 'pemula' ? vec.note.pemula : vec.note.lengkap;
      noteHtml = `<b>${vec.label}</b> — ${txt} <span style="opacity:.6">(klik area kosong untuk menutup)</span>`;
      $('#vecNote').classList.add('on');
    } else { $('#vecNote').classList.remove('on'); }
  } else { $('#vecNote').classList.remove('on'); }

  /* skip DOM writes kalau tidak berubah */
  const sig = statusHtml + stepsHtml + valsHtml + noteHtml + S.mode;
  if (!force && sig === panelCache) return;
  panelCache = sig;

  $('#statusBox').innerHTML = statusHtml;
  if (noteHtml) $('#vecNote').innerHTML = noteHtml;
  $('#steps').innerHTML = stepsHtml || '<p class="reason">Jalankan simulasi atau ubah parameter untuk melihat langkah perhitungan.</p>';
  $('#valsTable').querySelector('tbody').innerHTML = valsHtml;
  updateVecNoteVisibility();
}
function updateVecNoteVisibility() {
  const el = $('#vecNote');
  if (S.selectedVec) el.classList.add('on'); else el.classList.remove('on');
}

/* ---------- controls ---------- */
function buildControls() {
  const sc = scene();
  const cont = $('#controls');
  cont.innerHTML = '';
  sc.params.forEach(d => {
    const row = document.createElement('div');
    row.className = 'ctrl'; row.dataset.k = d.k;
    row.innerHTML = `
      <label>${d.label}${d.unit ? ` <small>(${d.unit})</small>` : ''}</label>
      <input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${params()[d.k]}">
      <input type="number" min="${d.min}" max="${d.max}" step="${d.step}" value="${params()[d.k]}">`;
    const [rng, num] = [row.querySelector('input[type=range]'), row.querySelector('input[type=number]')];
    const apply = v => {
      v = clamp(parseFloat(v) || 0, d.min, d.max);
      params()[d.k] = v; rng.value = v; num.value = v;
      onParamChange();
    };
    rng.addEventListener('input', e => apply(e.target.value));
    num.addEventListener('input', e => apply(e.target.value));
    cont.appendChild(row);
  });
  /* vector toggles */
  const vecTog = $('#vecToggles');
  const valNow = sc.compute(params(), S.kin[S.sceneId]);
  const vecIds = [...new Set(sc.vecs(params(), valNow).map(v => v.id))];
  const cc = viewer.palette();
  const ccLight = {N: '#1e293b', W: '#7c3aed', Wpar: '#e11d48', Wperp: '#b45309', T: '#047857', W1: '#7c3aed', W2: '#9333ea', F: '#0284c7', f: '#dc2626', f1: '#c2410c', f2: '#dc2626', T1: '#047857', T2: '#0e7490'};
  const ccDark = {N: '#e2e8f0', W: '#a78bfa', Wpar: '#fb7185', Wperp: '#fbbf24', T: '#34d399', W1: '#a78bfa', W2: '#c084fc', F: '#38bdf8', f: '#f87171', f1: '#fb923c', f2: '#f87171', T1: '#34d399', T2: '#22d3ee'};
  const chipCol = id => (cc[id] && /^#(0|1|2|3|4|5|6|7|8|9|a|b)[0-9a-f]{5}$/i.test(cc[id])) ? cc[id] : (ccDark[id] || '#888');
  vecTog.innerHTML = vecIds.map(id => `<label class="chip${viewer.ovec[id] !== false ? ' acc' : ''}" style="cursor:pointer;border-color:${chipCol(id)};color:${chipCol(id)}" data-vec="${id}">${id}</label>`).join('');
  vecTog.querySelectorAll('[data-vec]').forEach(ch => {
    ch.addEventListener('click', () => {
      const id = ch.dataset.vec;
      viewer.ovec[id] = !(viewer.ovec[id] !== false);
      ch.classList.toggle('acc', viewer.ovec[id] !== false);
      dirty = true;
    });
  });
}

function enforceMu() {
  const p = params();
  if ('muk' in p && p.muk > p.mus) p.muk = p.mus;
  if ('muk1' in p) { if (p.muk1 > p.mus1) p.muk1 = p.mus1; if (p.muk2 > p.mus2) p.muk2 = p.mus2; }
  /* sync nilai balik ke slider */
  $$('#controls .ctrl').forEach(row => {
    const k = row.dataset.k; if (!k) return;
    const [rng, num] = [row.querySelector('input[type=range]'), row.querySelector('input[type=number]')];
    if (parseFloat(rng.value) !== p[k]) rng.value = p[k];
    if (parseFloat(num.value) !== p[k]) num.value = p[k];
  });
}
function onParamChange() {
  enforceMu();
  S.lastVal = scene().compute(params(), S.kin[S.sceneId]);
  dirty = true;
  updatePanel(true);
}

/* ---------- scene & tabs ---------- */
function buildTabs() {
  $('#tabs').innerHTML = Object.values(SCENES).map(sc =>
    `<button class="tab" data-scene="${sc.id}">${sc.icon} ${sc.name}</button>`).join('');
  $$('#tabs .tab').forEach(b => b.addEventListener('click', () => setScene(b.dataset.scene)));
}
function setScene(id) {
  S.sceneId = id; S.selectedVec = null; S.running = false;
  S.kin[id] = SCENES[id].reset();
  viewer.setScene(id);
  buildControls();
  $('#hint').innerHTML = SCENES[id].static
    ? `<span>🖱 Tarik simpul untuk mengubah sudut tali</span><span>🎯 Klik panah gaya → penjelasan</span><span>⚖️ Sistem selalu seimbang</span>`
    : `<span>🖱 Tarik balok untuk memindahkan</span><span>🎯 Klik panah gaya → penjelasan</span><span>▶/Spasi = jalankan</span>`;
  setPlayIcon();
  S.lastVal = SCENES[id].compute(params(), S.kin[id]);
  dirty = true; updatePanel(true);
  $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.scene === id));
  panelCache = '';
}

/* ---------- play / reset / speed ---------- */
function setPlayIcon() { $('#btnPlay').textContent = S.running ? '⏸' : '▶'; }
function togglePlay() { S.running = !S.running; acc = 0; setPlayIcon(); }
function resetScene() {
  S.kin[S.sceneId] = scene().reset(); S.running = false; acc = 0;
  setPlayIcon(); S.lastVal = scene().compute(params(), S.kin[S.sceneId]);
  dirty = true; updatePanel(true); toast('Posisi direset');
}

/* ---------- interaksi canvas ---------- */
let drag = null;
const cv = $('#cv');
function evPos(e) {
  const r = cv.getBoundingClientRect();
  return {px: e.clientX - r.left, py: e.clientY - r.top};
}
function worldAt(e) { const {px, py} = evPos(e); return viewer.fromPix(px, py); }

function blockHit(w, loose = true) {
  const sc = scene(), kin = S.kin[S.sceneId], p = params();
  if (S.sceneId === 'flat') {
    const bx = kin.x, by = 0, bw = 1.1, bh = 0.8, m = loose ? 0.35 : 0.06;
    return w.x > bx - m && w.x < bx + bw + m && w.y > by - m && w.y < by + bh + m;
  }
  if (S.sceneId === 'incline') {
    const rad = Math.PI * p.theta / 180;
    const sPos = clamp(kin.s, 0.35, sc.sMax(p));
    const cx = 0.5 + sPos * Math.cos(rad) - Math.sin(rad) * 0.35;
    const cy = sPos * Math.sin(rad) + Math.cos(rad) * 0.35;
    return Math.hypot(w.x - cx, w.y - cy) < (loose ? 1.1 : 0.5);
  }
  if (S.sceneId === 'atwood') {
    const cxM = 4, yTop = 6.2, bh = .8;
    const c1 = {x: cxM - 1.1, y: yTop - kin.y1 - bh / 2};
    const c2 = {x: cxM + 1.1, y: yTop - kin.y2 - bh / 2};
    const r = loose ? 1 : 0.55;
    return Math.hypot(w.x - c1.x, w.y - c1.y) < r || Math.hypot(w.x - c2.x, w.y - c2.y) < r;
  }
  if (S.sceneId === 'stack') {
    const bw2 = 1.5, bh2 = .75, bw1 = 1.1, bh1 = .6;
    const x2 = kin.x2, x1 = kin.x2 + (bw2 - bw1) / 2 + kin.rel * 0.9;
    const mB = loose ? .4 : .06, mT = loose ? .3 : .06;
    const inB = w.x > x2 - mB && w.x < x2 + bw2 + mB && w.y > 0 - (loose ? 0 : .06) && w.y < bh2 + mB;
    const inT = w.x > x1 - mT && w.x < x1 + bw1 + mT && w.y > bh2 && w.y < bh2 + bh1 + mT;
    return inB || inT;
  }
  if (S.sceneId === 'hang') {
    const v = S.lastVal;
    if (!v || v.kx === undefined) return false;
    // simpul + seluruh daerah beban menggantung
    const r = loose ? 0.75 : 0.45;
    const onKnot = Math.hypot(w.x - v.kx, w.y - v.ky) < r;
    const bw = 1.2, bh = 1.0;
    const bY = Math.max(0.05, v.ky - 0.9 - bh);
    const bx = v.kx, byTop = bY + bh;
    const pad = loose ? 0.3 : 0.05;
    const onLoad = w.x > bx - pad && w.x < bx + bw + pad && w.y > bY - pad && w.y < byTop + pad;
    return onKnot || onLoad;
  }
  return false;
}

cv.addEventListener('pointerdown', e => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* synthetic events may fail */ }
  const {px, py} = evPos(e);
  const w = worldAt(e);
  const tip = viewer.tipHit(px, py, 14);
  const hit = tip || viewer.hitVector(px, py);
  /* prioritas 1: kepala panah vektor (lingkaran ujung) → pilih penjelasan
     prioritas 2: badan balok (core) → tarik
     prioritas 3: area panah lain di luar balok → pilih penjelasan
     prioritas 4: sekitar balok (margin) → tetap bisa ditarik
     prioritas 5: kosong → tutup penjelasan */
  if (tip) {
    S.selectedVec = (S.selectedVec === tip) ? null : tip;
    updatePanel(true);
  } else if (blockHit(w, false)) {
    drag = {x: w.x, y: w.y, wasRunning: S.running};
    S.running = false; acc = 0; setPlayIcon();
    cv.classList.add('grabbing');
    S.selectedVec = null;
  } else if (hit && !blockHit(w, false)) {
    S.selectedVec = (S.selectedVec === hit) ? null : hit;
    updatePanel(true);
  } else if (blockHit(w, true)) {
    drag = {x: w.x, y: w.y, wasRunning: S.running};
    S.running = false; acc = 0; setPlayIcon();
    cv.classList.add('grabbing');
    S.selectedVec = null;
  } else {
    S.selectedVec = null; updatePanel(true);
  }
  dirty = true;
});
cv.addEventListener('pointermove', e => {
  const {px, py} = evPos(e);
  if (drag) {
    const w = worldAt(e);
    const kin = S.kin[S.sceneId], p = params();
    const dx = w.x - drag.x, dy = w.y - drag.y;
    if (S.sceneId === 'flat') scene().drag(kin, dx);
    else if (S.sceneId === 'incline') {
      const rad = Math.PI * p.theta / 180;
      scene().drag(kin, dx * Math.cos(rad) + dy * Math.sin(rad), p);
    }
    else if (S.sceneId === 'atwood') scene().drag(kin, -dy);
    else if (S.sceneId === 'stack') scene().drag(kin, dx);
    else if (S.sceneId === 'hang') {
      scene().dragAngles(p, kin, w.x, w.y);
      // sync slider sudut ke nilai baru
      $$('#controls .ctrl').forEach(row => {
        const k = row.dataset.k; if (k !== 't1' && k !== 't2') return;
        const val = p[k];
        const rng = row.querySelector('input[type=range]'), num = row.querySelector('input[type=number]');
        if (parseFloat(rng.value) !== val) rng.value = val;
        if (parseFloat(num.value) !== val) num.value = val;
      });
    }
    drag = {x: w.x, y: w.y};
    S.lastVal = scene().compute(p, kin);
    dirty = true;
    return;
  }
  /* hover */
  const t2 = viewer.tipHit(px, py);
  const hv = t2 || (viewer.hitVector(px, py) && !blockHit(worldAt(e), false) ? viewer.hitVector(px, py) : null);
  if (hv !== viewer.hoverVec) { viewer.hoverVec = hv; cv.style.cursor = hv ? 'pointer' : 'grab'; dirty = true; }
});
function endDrag() {
  if (!drag) return;
  const was = drag.wasRunning;
  drag = null;
  cv.classList.remove('grabbing');
  S.kin[S.sceneId].v = 0;                        // mulai dari kecepatan nol
  if (S.kin[S.sceneId].v1 !== undefined) { S.kin[S.sceneId].v1 = 0; S.kin[S.sceneId].v2 = 0; }
  S.running = was; setPlayIcon();
  dirty = true;
}
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

/* ---------- UI wiring ---------- */
$('#btnPlay').addEventListener('click', togglePlay);
$('#btnReset').addEventListener('click', resetScene);
$('#speed').addEventListener('input', e => {
  S.speed = parseFloat(e.target.value);
  $('#speedVal').textContent = S.speed + '×';
});
$('#gPreset').addEventListener('change', e => {
  const val = e.target.value;
  if (val === 'custom') { $('#gCustom').style.display = ''; return; }
  $('#gCustom').style.display = 'none';
  setG(parseFloat(val));
});
$('#gCustom').addEventListener('input', e => setG(parseFloat(e.target.value)));
function setG(g) {
  if (!isFinite(g) || g <= 0) return;
  S.g = g;
  for (const id in S.params) S.params[id].g = g;
  onParamChange();
}
$$('#modeToggle button').forEach(b => b.addEventListener('click', () => {
  S.mode = b.dataset.mode;
  $$('#modeToggle button').forEach(x => x.classList.toggle('on', x === b));
  updatePanel(true);
}));

/* keyboard */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'r' || e.key === 'R') resetScene();
  else if (e.key === 'd' || e.key === 'D') {
    S.showFPS = !S.showFPS; $('#fps').classList.toggle('on', S.showFPS);
  }
  else if (['1', '2', '3', '4'].includes(e.key)) {
    setScene(['flat', 'incline', 'atwood', 'stack'][+e.key - 1]);
  }
});

/* ---------- modal materi ---------- */
$('#btnMateri').addEventListener('click', () => $('#materiOvl').classList.add('open'));
$('#materiSkip').addEventListener('click', () => $('#materiOvl').classList.remove('open'));
$('#materiGo').addEventListener('click', () => $('#materiOvl').classList.remove('open'));
$('#materiOvl').addEventListener('click', e => { if (e.target === $('#materiOvl')) $('#materiOvl').classList.remove('open'); });

/* ---------- quiz ---------- */
const ALL_TASKS = [];
for (const sid in QUIZ) QUIZ[sid].forEach((t, i) => ALL_TASKS.push({...t, scene: sid}));
let quizTask = null, quizScore = 0, quizIdx = 0;

function openQuiz() {
  $('#quizOvl').classList.add('open');
  if (!quizTask) quizScore = 0, quizIdx = -1;
  nextTask();
}
function nextTask() {
  quizIdx = (quizIdx + 1) % ALL_TASKS.length;
  quizTask = ALL_TASKS[quizIdx];
  setScene(quizTask.scene);
  $('#quizTask').innerHTML = quizTask.task;
  $('#quizScn').textContent = 'Skenario: ' + SCENES[quizTask.scene].name;
  $('#quizScore').textContent = `Skor: ${quizScore} ✔`;
  $('#quizRes').textContent = '';
  $('#quizRes').className = 'quizres';
}
$('#btnQuiz').addEventListener('click', openQuiz);
$('#quizNew').addEventListener('click', nextTask);
$('#quizHint').addEventListener('click', () => {
  if (!quizTask) return;
  $('#quizRes').className = 'quizres';
  $('#quizRes').innerHTML = '💡 ' + quizTask.hint;
});
$('#quizCheck').addEventListener('click', () => {
  if (!quizTask || !S.lastVal) return;
  const ok = quizTask.check(params(), S.lastVal);
  if (ok) { quizScore++; $('#quizRes').className = 'quizres ok'; $('#quizRes').textContent = '✅ Benar! Kerja bagus — coba tantangan berikutnya.'; toast('✅ Jawaban benar!'); }
  else { $('#quizRes').className = 'quizres no'; $('#quizRes').textContent = '❌ Belum tepat — cek lagi nilai parameternya, lalu periksa ulang.'; toast('❌ Belum tepat'); }
  $('#quizScore').textContent = `Skor: ${quizScore} ✔`;
});
$('#quizOvl').addEventListener('click', e => { if (e.target === $('#quizOvl')) $('#quizOvl').classList.remove('open'); });

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- boot ---------- */
buildTabs();
setScene('flat');
requestAnimationFrame(loop);
setTimeout(() => { if (!sessionStorage.getItem('fl_seen')) { $('#materiOvl').classList.add('open'); sessionStorage.setItem('fl_seen', '1'); } }, 400);

/* export kecil untuk debug */
window.__FL = {S, viewer, setScene, togglePlay};
})();
