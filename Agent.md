# Product Requirements Document (PRD)

**Nama Proyek:** Web Simulasi Interaktif Fisika - Dinamika Partikel  
**Target Pengguna:** Siswa SMA / Pemula yang baru belajar Fisika  
**Platform:** Web Application (Desktop & Tablet Optimized)  
**Tujuan Dokumen:** Panduan teknis dan fungsional untuk Agen AI Coding dalam mengembangkan aplikasi.

---

## 1. Ringkasan Eksekutif (Executive Summary)
Aplikasi web pembelajaran interaktif yang memvisualisasikan materi Dinamika Partikel (Hukum Newton, Gaya Gesek, Tegangan Tali). Web ini memungkinkan siswa untuk membaca teori dasar, lalu bereksperimen di dalam "sandbox" fisika di mana mereka bisa memodifikasi parameter, menggeser balok, dan melihat penjelasan rumus yang *update* secara *real-time* seiring dengan perubahan simulasi. 

---

## 2. Konsep Fisika Inti (Core Physics Concepts)
Agen AI harus mengimplementasikan *physics engine* yang mengakomodasi hukum-hukum berikut:
1.  **Hukum Newton:** Analisis gaya dan percepatan ($\Sigma F = m \cdot a$).
2.  **Gaya Gesek:** Perhitungan gaya gesek statis ($f_s = \mu_s \cdot N$) dan kinetis ($f_k = \mu_k \cdot N$).
3.  **Gaya Tegangan Tali ($T$):** Sistem katrol dan balok yang saling terhubung.
4.  **Gaya Berat & Normal:** Pengaruh gravitasi dan gaya kontak permukaan, termasuk pada bidang miring.

---

## 3. Fitur Utama (Core Features)

### 3.1. Modul "Baca Materi Dulu" (Onboarding)
*   **Deskripsi:** Halaman/modal pop-up yang muncul pertama kali untuk memberikan ringkasan materi dasar secara visual dan interaktif sebelum masuk ke simulasi.
*   **Requirement:** UI bersih, teks mudah dibaca, dan bahasa ramah pemula.

### 3.2. Canvas Simulasi Fisika (Interactive Sandbox)
*   **Drag & Drop:** Pengguna dapat mengangkat, memindahkan, dan menjatuhkan balok di dalam canvas.
*   **Visualisasi Vektor (Panah Gaya):** Setiap gaya (gesek, normal, berat, tegangan tali) direpresentasikan dengan panah vektor yang panjang dan arahnya berubah secara otomatis berdasarkan nilai gaya.
*   **Interaksi Vektor:** Pengguna dapat mengklik panah vektor gaya tertentu di canvas, dan web akan langsung menyorot/membuka penjelasan mengenai gaya tersebut di Kolom Pembahasan.

### 3.3. Kontrol Parameter Fisika
*   **Deskripsi:** Panel kontrol (slider atau input angka) untuk mengubah variabel lingkungan dan objek.
*   **Parameter yang bisa diubah:**
    *   Massa balok ($m_{1}$, $m_{2}$, dst.)
    *   Koefisien gesek lantai/antar-balok ($\mu_s$ dan $\mu_k$)
    *   Sudut kemiringan lantai/bidang ($\theta$)
    *   Gaya tarik/dorong eksternal ($F$)
    *   Gravitasi ($g$)

### 3.4. Kolom Pembahasan & Rumus Real-Time
*   **Deskripsi:** Panel di sisi layar (sidebar) yang menampilkan langkah-langkah penyelesaian, rumus yang sedang bekerja, dan nilai perhitungannya.
*   **Requirement Utama:** 
    *   **Real-time Update:** Jika user menggeser slider massa, angka pada rumus di kolom pembahasan harus berubah secara instan tanpa *delay*.
    *   **Bahasa Pemula:** Jangan langsung menampilkan hasil akhir. Tampilkan *step-by-step* (misal: "Karena balok ditarik dengan gaya 50N dan gaya gesek statis maksimalnya 60N, maka balok belum bergerak, sehingga percepatan ($a$) = 0").
    *   **Dukungan LaTeX:** Gunakan *rendering* matematika yang rapi untuk rumus.

### 3.5. Variasi Sistem / Skenario (Presets)
*   Menyediakan beberapa *preset* sistem untuk menjaga retensi pengguna:
    1.  Satu balok di bidang datar.
    2.  Satu balok di bidang miring.
    3.  Dua balok dihubungkan tali melalui katrol (Mesin Atwood).
    4.  Tumpukan dua balok (analisis gesekan antar balok).

### 3.6. Mode Latihan Soal / Quiz
*   Integrasi kuis di mana pengguna diberikan target (misal: "Atur massa balok A agar sistem seimbang!").

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 4.1. Performa Super Cepat (High Performance)
*   **Masalah:** Web yang banyak animasi fisika dan *real-time DOM updates* sering *lag*.
*   **Solusi Teknis untuk AI:**
    *   Gunakan HTML5 Canvas atau WebGL (melalui *library* seperti Matter.js, PixiJS, atau p5.js) untuk *rendering* simulasi fisika agar mendapatkan minimal 60 FPS.
    *   Pisahkan *state management* antara UI Panel dan Canvas. Jangan lakukan *full re-render* pada komponen UI berat jika hanya posisi $x,y$ balok di canvas yang berubah.
    *   Gunakan *framework* modern yang cepat (misal: React dengan teknik optimasi seperti `useMemo`, `useCallback`, atau Svelte/SolidJS untuk reaktivitas instan).

### 4.2. UI/UX Design
*   Tampilan modern, responsif, bernuansa *gamification*, dan fokus pada kemudahan penggunaan (intuitif). *Layout* disarankan: Kiri/Tengah untuk Canvas Simulasi, Kanan untuk Panel Parameter & Pembahasan.

---

## 5. Instruksi Khusus untuk AI Coding Agent
1.  **Tahap 1:** Buat struktur *layout* utama dan integrasikan *physics engine* (misal: Matter.js) di dalam komponen Canvas.
2.  **Tahap 2:** Buat satu skenario *default* (Balok di bidang datar) dengan fitur *Drag & Drop* dan vektor gaya dasar yang bisa dirender.
3.  **Tahap 3:** Hubungkan parameter kontrol di UI dengan *physics engine* agar *update* secara *real-time*.
4.  **Tahap 4:** Bangun "Kolom Pembahasan" menggunakan parser matematika (seperti KaTeX atau MathJax) yang mendengarkan perubahan *state* dari *physics engine*.
5.  **Tahap 5:** Pastikan animasi tidak terpotong saat state React/framework meng-*update* teks.