# Menu Print Teks Label Honeywell PM42

Modul mandiri baru untuk mencetak teks kustom multi-baris pada media kertas label Honeywell PM42 (ukuran standar 80x100 mm, landscape atau portrait) yang disesuaikan secara presisi dengan spesifikasi area cetak dan margin printer Honeywell PM42 seperti pada menu Generator QR Code.

## User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan preferensi yang telah dikonfirmasi pengguna pada tahap klarifikasi:

- **Penempatan Menu**: Menu mandiri di Sidebar dan Tools Grid dengan label **"Print Teks PM42"** (id tab: `pm42-text-print`).
- **Format Teks**: Teks bebas multi-baris (multiline free text) dengan kontrol ukuran font, perataan teks (kiri / tengah / kanan), ketebalan huruf (bold / regular), tinggi baris (line height), serta opsi garis batas/kotak.
- **Dukungan Satuan & Massal (Batch)**:
  - **Mode Satuan**: Input teks bebas langsung untuk dicetak dalam 1 label (atau cetak multi-salinan/copies).
  - **Mode Batch (Massal)**: Input banyak data teks sekaligus dengan pemisah baris atau pemisah label (`---`), di mana setiap entri akan otomatis menjadi 1 lembar label tersendiri pada kertas PM42.

---

## 1. Overview & Core Concept

- **Tujuan Utama**: Memungkinkan tim logistik dan operasional gudang mencetak label berbasis teks murni (seperti label nama rak, instruksi penanganan/handling, identitas palet/karton, memo karantina, atau penandaan khusus) langsung ke printer barcode Honeywell PM42 tanpa memerlukan QR code, namun menggunakan rol kertas label yang sama (80x100 mm).
- **Target Pengguna**: Operator gudang, staf inventory, dan admin logistik.
- **Nilai Tambah**:
  - Ukuran cetak, margin, dan paging CSS 100% konsisten dengan modul `QrGeneratorHoneywellModule` yang sudah terkalibrasi di printer PM42 fisik.
  - Preview cetak WYSIWYG interaktif dengan grid ukuran nyata sehingga hasil cetak tidak terpotong (clip) atau melompat halaman.
  - Opsi copy/duplikasi, template cepat (contoh: Label Rak, Label Hold/Karantina, Label Fragile, Label Catatan Gudang), dan ekspor/cetak batch yang cepat.

---

## 2. User Experience & Visual Design

### A. Alur Pengguna (User Flow)
1. **Navigasi**: Pengguna membuka menu **"Print Teks PM42"** dari Sidebar (kategori Tools & Utilitas) atau dari Tools Grid di halaman utama.
2. **Input Teks**:
   - Pengguna memilih mode: **Cetak Satuan (Single Text)** atau **Cetak Massal (Batch Text)**.
   - Pada mode satuan: Pengguna mengetik teks bebas di editor teks, mengatur ukuran font (slider atau preset XS-XXL), perataan teks (Align Left/Center/Right), dan opsi teks tebal/bold atau huruf kapital.
   - Pada mode massal: Pengguna mengetik atau mem-paste daftar teks (dipisahkan baris baru atau pembatas `---`), lalu sistem memecahnya menjadi daftar kartu label tersendiri.
3. **Konfigurasi Area Cetak PM42**:
   - Orientasi: Landscape (100x80 mm - standar PM42) atau Portrait (80x100 mm).
   - Margin atas (Top Margin, default 10 mm persis seperti modul QR PM42), margin kiri/kanan.
   - Opsi Border/Garis tepi label (kotak solid/putus-putus atau tanpa border).
4. **Pratinjau Nyata (Real-time Preview)**:
   - Menampilkan visualisasi persis ukuran kertas PM42 dengan skala proporsional.
   - Indikator peringatan jika teks terlalu panjang dan berpotensi terpotong di kertas.
5. **Cetak**:
   - Tombol **"Cetak Label"** membuka dialog print browser khusus dengan media query `@page { size: 100mm 80mm; margin: 0; }` yang terisolasi, memastikan printer PM42 langsung mencetak per label tanpa halaman kosong tambahan.

### B. Visual Identity & Komponen UI
- **Pola Warna**: Neutral slate dengan aksen brand biru elektrik / navy logistik (`bg-slate-900`, `text-slate-800`, `border-slate-200`), konsisten dengan design system logistik aplikasi.
- **Tipografi**: Display font yang tajam dan mudah dibaca dari jarak jauh di gudang (font sans tebal untuk headline/tanda, monospace tabular untuk nomor/kode).
- **Zero-Pill Discipline**: Metadata status atau jumlah label ditampilkan dalam teks bersih (`Label 1 dari 5 · 100 x 80 mm`), bukan badge pill berlebih.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Modul Mandiri (`src/components/logistics/Pm42TextPrintModule.tsx`) vs Menggabungkan ke modul QR**
  - *Pendekatan*: Dibuat modul mandiri agar alur kerja cetak teks tidak terbebani logika QR code, generator barcode, library qrcode, dan upload 15-kolom yang kompleks.
  - *Manfaat*: Kode bersih, terisolasi, loading cepat, dan UX fokus khusus pada tata letak teks cetak.
- **Keputusan 2: Engine Cetak Khusus Label Honeywell PM42**
  - *Pendekatan*: Mengadopsi struktur CSS `@media print` dan `@page` milimeter yang identik dengan `QrGeneratorHoneywellModule` (100mm x 80mm pada landscape, margin 10mm, `page-break-after: always`).
  - *Manfaat*: Menghindari masalah umum printer PM42 seperti kertas tergulung lebih dari 1 label atau teks terpotong sensor gap kertas label.
- **Keputusan 3: Template Teks Cepat (Quick Presets)**
  - *Pendekatan*: Menyediakan tombol template 1-klik untuk kebutuhan gudang umum (misal: "HOLD / KARANTINA", "REPACKING AREA", "LOKASI RAK [A-01-01]", "BARANG TITIPAN").
  - *Manfaat*: Mempercepat pengisian teks tanpa perlu mengetik dari awal setiap saat.

---

## 4. Technical Architecture & Component Structure

### Architecture Diagram
```
┌────────────────────────────────────────────────────────┐
│                   Aplikasi Utama                       │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   Sidebar Navigation │    │      Tools Grid      │  │
│  │   [Print Teks PM42]  │    │  [Print Teks PM42]   │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
│             └─────────────┬─────────────┘              │
│                           ▼                            │
│                 App.tsx / ToolWorkspace                │
│                           │                            │
│                           ▼                            │
│        Pm42TextPrintModule.tsx                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Editor Teks (Single / Batch Input)            │  │
│  │ 2. Tool Layout Controls (Font, Align, Margin)    │  │
│  │ 3. Quick Warehouse Templates                     │  │
│  │ 4. Live WYSIWYG Label Canvas                     │  │
│  │ 5. Isolated Print Portal / Print CSS Engine      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### File Changes Planned:
1. **`src/types.ts`**:
   - Menambahkan `'pm42-text-print'` ke union type `MainToolTab`.
2. **`src/components/logistics/Pm42TextPrintModule.tsx`**:
   - Pembuatan komponen baru lengkap dengan state, preview interaktif, preset ukuran teks, dan print portal terisolasi.
3. **`src/components/ToolsGrid.tsx`**:
   - Menambahkan kartu menu "Print Teks PM42" dengan icon printer / type text, deskripsi, dan kata kunci pencarian.
4. **`src/components/Sidebar.tsx`**:
   - Menambahkan menu "Print Teks PM42" pada daftar navigasi tools logistik.
5. **`src/components/tools/ToolWorkspacePage.tsx`**:
   - Mendaftarkan metadata modul `'pm42-text-print'` (icon, judul, kategori).
6. **`src/components/EmbeddedToolsWorkspace.tsx`**:
   - Menghubungkan rendering `'pm42-text-print'` ke `Pm42TextPrintModule`.
