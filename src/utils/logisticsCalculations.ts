export interface EdComputeResult {
  material: string;
  description: string;
  batch: string;
  tglMixing: Date | null;
  sledEd: Date | null;
  lamaEdTahun: number;
  batchUnix: string;
  kodeNumerik: number | null;
  doy: number | null;
  digitTahunProduksi: number | null;
  tahunProduksi: number | null;
  status: string;
}

/**
 * Menghitung Expired Date, Tgl Mixing, DOY, dan Validasi Batch
 * @param {string} material - Kode Material (misal: "21104501")
 * @param {string} description - Deskripsi Produk (misal: "KINO SAMANTHA HAIR OIL")
 * @param {string} rawBatch - Kode Batch mentah (misal: "L911346N")
 * @param {Date} [todayOverride] - Tanggal acuan (default: Hari Ini)
 */
export function edComputeExpiredRow(
  material: string,
  description: string,
  rawBatch: string,
  todayOverride?: Date
): EdComputeResult {
  const today = todayOverride || new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const rawB = String(rawBatch || '').trim();
  
  // 1. Bersihkan karakter abjad di akhir batch (misal: "L911346N" -> "911346")
  let batchUnix = rawB;
  const last1 = rawB.slice(-1);
  const last2 = rawB.slice(-2);
  let strip = 0;
  if (/^[A-Za-z]$/.test(last1)) strip += 1;
  if (/^[A-Za-z]{2}$/.test(last2)) strip += 1;
  if (strip > 0) batchUnix = rawB.slice(0, rawB.length - strip);

  // 2. Tentukan Masa Simpan (ED) berdasarkan kata kunci pada Nama Barang
  const d = String(description || '').toUpperCase();
  let lamaEdTahun = 3; // Default 3 Tahun
  if (d.includes('PAPER')) lamaEdTahun = 5;
  else if (d.includes('OLIVE') && d.includes('OIL')) lamaEdTahun = 4;
  else if (d.includes('Q-LIFE') || d.includes('KESET') || (d.includes('SAMANT') && d.includes('20'))) lamaEdTahun = 2;
  else if (d.includes('PIA')) lamaEdTahun = 1;

  const isAbstract = d.includes('ABSTRAC');
  let status = 'OK';
  let kodeNumerik: number | null = null, doy: number | null = null, digitThn: number | null = null, tahunProduksi: number | null = null;
  let tglMixing: Date | null = null, sled: Date | null = null;

  // 3. Ambil 4 digit terakhir dari Unix Batch (Format: [DOY 3 Digit][Digit Tahun 1 Digit])
  const last4 = batchUnix.slice(-4);
  if (!batchUnix) {
    status = 'Cek: Batch kosong / tidak valid';
  } else if (!/^\d{1,4}$/.test(last4)) {
    status = 'Cek: Batch Unix gagal terbaca (4 digit kode tidak ditemukan)';
  } else {
    kodeNumerik = parseInt(last4, 10);
    doy = Math.floor(kodeNumerik / 10);      // 3 Digit Pertama = DOY (Hari ke-N dalam tahun)
    digitThn = kodeNumerik % 10;              // Digit Terakhir = Digit Terakhir Tahun Produksi
    
    // Hitung Tahun Produksi paling mendekati (tidak melebihi tahun berjalan)
    tahunProduksi = today.getFullYear() - (((today.getFullYear() - digitThn) % 10) + 10) % 10;
    if (doy < 1 || doy > 366) {
      status = 'Cek: Hari ke-N (DOY) di luar rentang valid';
    } else {
      // Hitung Tanggal Mixing: 1 Jan + (DOY - 1) hari
      tglMixing = new Date(tahunProduksi, 0, 1);
      tglMixing.setDate(tglMixing.getDate() + (doy - 1));
      
      if (tglMixing.getFullYear() !== tahunProduksi) {
        status = 'Cek: Hari ke-N (DOY) tidak valid untuk tahun produksi ini';
        tglMixing = null;
      } else if (tglMixing > today) {
        status = 'Cek: Tgl Mixing di masa depan';
      }
    }
  }

  // 4. Hitung SLED (Shelf Life Expiration Date)
  if (isAbstract) {
    sled = new Date(9999, 11, 31); // Non-expired
    if (status === 'OK') status = 'OK (Non-Expired)';
  } else if (tglMixing) {
    sled = new Date(tglMixing.getTime());
    const targetYr = sled.getFullYear() + lamaEdTahun;
    const month = sled.getMonth();
    const day = sled.getDate();
    sled.setFullYear(targetYr, month, day);
    if (sled.getMonth() !== month) {
      sled.setFullYear(targetYr, month + 1, 0); // Penanganan tahun kabisat (29 Feb)
    }
    if (status === 'OK' && sled < today) status = 'PERHATIAN: Sudah Expired';
  }

  return {
    material: material || '',
    description: description || '',
    batch: rawB,
    tglMixing,            // Date object
    sledEd: sled,         // Date object
    lamaEdTahun,
    batchUnix,
    kodeNumerik,
    doy,
    digitTahunProduksi: digitThn,
    tahunProduksi,
    status
  };
}

/**
 * Memproses dan mengagregasi baris data mentah Stock Opname (SUMIFS berdasarkan Location + ItemCode + SLOC)
 */
export function aggregateStockOpnameRows(rows: Array<{
  no?: number;
  location: string;
  itemCode: string;
  itemName: string;
  sloc: string;
  lastQty: number;
}>) {
  const map = new Map();
  rows.forEach(r => {
    const key = r.location + '||' + r.itemCode + '||' + r.sloc;
    if (!map.has(key)) {
      map.set(key, {
        no: r.no || 1,
        location: r.location,
        itemCode: r.itemCode,
        itemName: r.itemName,
        sloc: r.sloc,
        lastQty: 0
      });
    }
    map.get(key).lastQty += Number(r.lastQty) || 0;
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.sloc !== b.sloc) return a.sloc.localeCompare(b.sloc);
    if (a.location !== b.location) return a.location.localeCompare(b.location);
    return a.itemCode.localeCompare(b.itemCode);
  });
}

/**
 * Memproses data MB52 SAP (Last Qty = Unrestricted + Transit + Blocked)
 */
export function processMB52Rows(jsonRows: Array<Record<string, any>>) {
  return jsonRows.map(r => {
    const material = String(r['Material'] || r['Item Code'] || r['Kode Barang'] || '').trim();
    const unrestricted = Number(r['Unrestricted'] || r['Stok Unrestricted'] || 0) || 0;
    const transit = Number(r['Transit and Transfer'] || r['Transit'] || 0) || 0;
    const blocked = Number(r['Blocked'] || r['Stok Blocked'] || 0) || 0;
    const sloc = String(r['Storage Location'] || r['SLOC'] || r['Sloc'] || '').trim();
    
    return {
      material,
      desc: String(r['Material Description'] || r['Item Name'] || r['Nama Barang'] || '').trim(),
      plant: String(r['Plant'] || '').trim(),
      sloc,
      unrestricted,
      transit,
      blocked,
      lastQty: unrestricted + transit + blocked, // Total Stok Fisik/Sistem SAP
      group: material.toUpperCase().startsWith('FG') ? 'FG' : 'PACKAGING'
    };
  }).filter(r => r.sloc && r.material);
}

const generatedSNs = new Set<string>();

/**
 * Generate Serial Number dari teks input Excel (Tab Separated Lines)
 */
export function generateSerialNumberList(inputText: string) {
  if (!inputText.trim()) return [];
  
  const rows = inputText.split('\n');
  const d = new Date();
  const dateStr = String(d.getFullYear()).slice(-2) + 
                  String(d.getMonth() + 1).padStart(2, '0') + 
                  String(d.getDate()).padStart(2, '0');
  
  const results: Array<{ sn: string; rawCols: string[] }> = [];
  let count = 0;
  rows.forEach(row => {
    if (!row.trim()) return;
    const cols = row.split('\t');
    if (cols.length > 0) {
      count++;
      const binLoc = (cols[0] || '').trim();
      // Ambil 8 karakter terakhir bin location (dipad 8 digit nol jika kurang)
      const rightBin = binLoc.length > 8 ? binLoc.slice(-8) : binLoc.padStart(8, '0');
      
      let sn: string;
      let attempt = 0;
      do {
        let randNum = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
        if (attempt > 50) randNum = String(count).padStart(4, '0'); // Fallback jika konflik
        sn = `FGKINO-${dateStr}${rightBin}${randNum}`;
        attempt++;
      } while (generatedSNs.has(sn));
      generatedSNs.add(sn);
      results.push({ sn, rawCols: cols.map(c => (c || '').trim()) });
    }
  });
  return results;
}

export interface CompareResultRow {
  no: number;
  sloc: string;
  item: string;
  desc: string;
  bLargo: string;
  bSap: string;
  qLargo: number;
  qSap: number;
  diff: number;
  status: 'MATCH' | 'QTY_DIFF' | 'REPLACE' | 'NO_CANDIDATE' | 'LARGO_ONLY';
  rec: string;
}

/**
 * Melakukan perbandingan (Reconciliation) data LARGO vs SAP
 */
export function compareLargoAndSap(
  largoRows: Array<{ sloc: string; item: string; desc?: string; batch: string; qty: any }>,
  sapRows: Array<{ sloc: string; item: string; desc?: string; batch: string; unrestricted?: any; blocked?: any; qty?: any }>
): CompareResultRow[] {
  const norm = (s: any) => String(s || '').trim().toUpperCase().replace(/^0+(.+)$/, '$1') || String(s || '').trim().toUpperCase();
  const pQty = (v: any) => { const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };

  // 1. Grouping LARGO (Key: Sloc || Item || Batch)
  const largoMap = new Map();
  largoRows.forEach(r => {
    const sloc = norm(r.sloc), item = norm(r.item), bat = norm(r.batch);
    if (!item || !bat) return;
    const key = sloc + '||' + item + '||' + bat;
    if (!largoMap.has(key)) largoMap.set(key, { sloc, item, desc: r.desc || '', bat, qty: 0 });
    largoMap.get(key).qty += pQty(r.qty);
  });

  // 2. Grouping SAP (Key: Sloc || Item || Batch)
  const sapMap = new Map();
  sapRows.forEach(r => {
    const sloc = norm(r.sloc), item = norm(r.item), bat = norm(r.batch);
    if (!item || !bat) return;
    const key = sloc + '||' + item + '||' + bat;
    if (!sapMap.has(key)) sapMap.set(key, { sloc, item, desc: r.desc || '', bat, qty: 0 });
    const addQty = r.qty !== undefined ? pQty(r.qty) : (pQty(r.unrestricted) + pQty(r.blocked));
    sapMap.get(key).qty += addQty;
  });

  // 3. Analisis Match, Selisih Qty, dan Batch Pengganti
  const sapMissing: any[] = [], largoMissing: any[] = [];
  sapMap.forEach((d, k) => { if (!largoMap.has(k)) sapMissing.push(d); });
  largoMap.forEach((d, k) => { if (!sapMap.has(k)) largoMissing.push(d); });

  const results: CompareResultRow[] = [];
  let no = 0;

  // Case A: Item & Batch sama di LARGO & SAP
  sapMap.forEach((sap, key) => {
    if (!largoMap.has(key)) return;
    const largo = largoMap.get(key);
    const match = sap.qty === largo.qty;
    results.push({
      no: ++no, sloc: sap.sloc, item: sap.item, desc: sap.desc || largo.desc,
      bLargo: largo.bat, bSap: sap.bat, qLargo: largo.qty, qSap: sap.qty,
      diff: sap.qty - largo.qty,
      status: match ? 'MATCH' : 'QTY_DIFF',
      rec: match ? 'Sesuai' : 'Qty Beda'
    });
  });

  // Case B: Ada di SAP tapi tidak ada di LARGO (Cek kandidat ganti batch)
  const claimed = new Set<string>();
  const cKey = (s: string, i: string, b: string) => s + '||' + i + '||' + b;

  sapMissing.forEach(sap => {
    const cands = largoMissing.filter(l => l.sloc === sap.sloc && l.item === sap.item && l.qty === sap.qty && !claimed.has(cKey(l.sloc, l.item, l.bat)));
    if (cands.length > 0) {
      const blist = cands.map(c => c.bat).join(', ');
      cands.forEach(c => claimed.add(cKey(c.sloc, c.item, c.bat)));
      results.push({
        no: ++no, sloc: sap.sloc, item: sap.item, desc: sap.desc,
        bLargo: blist, bSap: sap.bat, qLargo: sap.qty, qSap: sap.qty,
        diff: 0, status: 'REPLACE', rec: 'Ganti ke ' + blist
      });
    } else {
      results.push({
        no: ++no, sloc: sap.sloc, item: sap.item, desc: sap.desc,
        bLargo: '', bSap: sap.bat, qLargo: 0, qSap: sap.qty,
        diff: sap.qty, status: 'NO_CANDIDATE', rec: 'Tanpa Kandidat di LARGO'
      });
    }
  });

  // Case C: Hanya ada di LARGO
  largoMissing.forEach(l => {
    if (claimed.has(cKey(l.sloc, l.item, l.bat))) return;
    results.push({
      no: ++no, sloc: l.sloc, item: l.item, desc: l.desc,
      bLargo: l.bat, bSap: '', qLargo: l.qty, qSap: 0,
      diff: -l.qty, status: 'LARGO_ONLY', rec: 'Hanya ada di LARGO'
    });
  });

  return results;
}
