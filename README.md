# FisikaLab — Dinamika Partikel

Web simulasi interaktif fisika untuk siswa SMA: **Hukum Newton, gaya gesek, bidang miring, mesin Atwood, dan tumpukan balok** — dengan kolom pembahasan yang menghitung ulang rumusnya secara real-time mengikuti angka di slider.

Dibangun dari PRD `Agent.md` (ada di repo ini) — HTML + CSS + JS murni, tanpa framework, tanpa build step.

## Fitur
- **4 skenario** (tab di atas): Bidang Datar · Bidang Miring · Mesin Atwood · Tumpukan Balok
- **Canvas interaktif**: tarik balok dengan mouse/sentuh; geser slider → semua angka dan panah berubah langsung
- **Panah vektor gaya** proporsional dengan nilai + klik panahnya untuk membaca penjelasan gaya tersebut
- **Kolom Pembahasan real-time**: status sistem (diam/bergerak + alasan), hukum yang sedang bekerja, langkah perhitungan (rumus umum → substitusi angka → hasil), tabel ringkasan nilai
- **Dua mode penjelasan**: 🌱 Pemula (analogi bahasa sehari-hari) dan 📐 Lengkap (semua rumus & turunan)
- **🎯 Mode Latihan**: tantangan yang dicek langsung terhadap state simulasi (mis. "atur μs minimum agar balok tetap diam")
- **📖 Modal materi**: ringkasan Hukum Newton & gaya, tampil otomatis saat pertama kali dibuka
- Gravitasi preset (Bumi/Bulan/Mars/Jupiter) + kustom; kontrol kecepatan 0,25×–2×; dark mode otomatis; jalan di HP & laptop

## Struktur
```
index.html     # shell UI + modal materi/kuis
js/engine.js   # mesin fisika + definisi skenario + teks pembahasan (4 skenario)
js/render.js   # renderer Canvas 2D + panah vektor + layout tiap skenario
js/app.js      # loop fixed-timestep, UI panel, interaksi drag/klik, kuis
Agent.md       # PRD sumber
```

## Menjalankan
Buka `index.html` langsung, atau lewat server lokal:
```bash
python3 -m http.server 3004
```

Dibuat untuk latihan belajar — kontribusi & koreksi dipersilakan. [GitHub @FairusFT](https://github.com/FairusFT)
