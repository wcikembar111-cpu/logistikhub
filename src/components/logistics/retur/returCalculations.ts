import { ReturInventoryItem } from '../../../types';

export interface ExpiryAnalysis {
  status: 'EXPIRED' | 'CRITICAL' | 'NEAR_ED' | 'MEDIUM' | 'SAFE' | 'UNKNOWN';
  label: string;
  diffDays: number | null;
  badgeClass: string;
}

/**
 * Robust quantity parser that accurately handles Indonesian number formats (1.250,50),
 * standard formats (1,250.50), dots-as-thousands, and strips unit suffixes.
 */
export function parseQuantity(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;

  // Strip common unit suffixes
  str = str.replace(/\b(pcs|pc|ctn|box|dus|bal|pack|ea|kg|gr|unit|un|btl|slop|renceng)\b/gi, '').trim();
  str = str.replace(/\s+/g, '');

  // Handle thousand and decimal separators accurately
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Indonesian format: 1.250,50 -> 1250.50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard format: 1,250.50 -> 1250.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // If comma is followed by 1 or 2 digits at end, it's decimal: 12,5 -> 12.5
    if (/,\d{1,2}$/.test(str)) {
      str = str.replace(',', '.');
    } else {
      // Otherwise thousand separator: 1,000 -> 1000
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    // Multiple dots e.g. 1.000.000 -> 1000000
    if ((str.match(/\./g) || []).length > 1) {
      str = str.replace(/\./g, '');
    } else if (/\.\d{3}$/.test(str)) {
      // Indonesian single thousand separator e.g. 1.250 -> 1250
      str = str.replace(/\./g, '');
    }
  }

  const clean = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 1000) / 1000;
}

/**
 * Robust date parser handling Excel serial numbers, Date instances, and string formats.
 */
export function parseExcelDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    // Excel date serial number
    try {
      const parsedDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().slice(0, 10);
      }
    } catch {
      // fallback
    }
  }
  const str = String(val).trim();
  if (!str) return '';

  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    try {
      const parsedDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().slice(0, 10);
      }
    } catch {
      // fallback
    }
  }

  // Indonesian / European format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  return str;
}

/**
 * Calculates expiry classification and days remaining with accurate calendar math.
 */
export function calculateExpiryStatus(expiredStr?: string): ExpiryAnalysis {
  if (!expiredStr) {
    return {
      status: 'UNKNOWN',
      label: 'Tanpa ED',
      diffDays: null,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  const expDate = new Date(expiredStr);
  if (isNaN(expDate.getTime())) {
    return {
      status: 'UNKNOWN',
      label: 'Format ED Invalid',
      diffDays: null,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'EXPIRED',
      label: `Expired (${Math.abs(diffDays)} hari lalu)`,
      diffDays,
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold'
    };
  }
  if (diffDays <= 30) {
    return {
      status: 'CRITICAL',
      label: `Kritis (${diffDays} hari lagi)`,
      diffDays,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
    };
  }
  if (diffDays <= 90) {
    return {
      status: 'NEAR_ED',
      label: `Near ED (${diffDays} hari)`,
      diffDays,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
    };
  }
  if (diffDays <= 180) {
    return {
      status: 'MEDIUM',
      label: `Waspada (${diffDays} hari)`,
      diffDays,
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-300 font-medium'
    };
  }
  return {
    status: 'SAFE',
    label: `Aman (${diffDays} hari)`,
    diffDays,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
  };
}

/**
 * Header row detector and column index mapper.
 */
export function findHeaderRowAndMap(rows: any[][]): { headerIndex: number; columnMap: Record<string, number> } {
  const maxSearch = Math.min(rows.length, 12);
  let bestHeaderIndex = -1;
  let bestMatchScore = 0;
  let bestColumnMap: Record<string, number> = {};

  const fieldSynonyms: Record<string, string[]> = {
    no: ['no', 'nomor', 'no.', 'number', 'idx', 'urut'],
    item_code: ['item code', 'kode item', 'kode barang', 'material', 'item_code', 'itemcode', 'sku', 'product code', 'kode'],
    item_name: ['item name', 'nama barang', 'nama item', 'deskripsi', 'description', 'material description', 'item_name', 'nama'],
    category: ['category', 'kategori', 'kat', 'kelompok', 'group', 'prod group'],
    location: ['location', 'lokasi', 'bin', 'bin location', 'loc', 'rak', 'bin loc', 'tempat'],
    location_type: ['location type', 'tipe lokasi', 'tipe', 'loc type', 'tipe rak'],
    first_qty: ['first qty', 'qty awal', 'first_qty', 'kuantitas awal', 'initial qty', 'awal', 'first qty pcs'],
    last_qty_pcs: ['last qty pcs', 'last qty', 'qty akhir', 'qty pcs', 'kuantitas akhir', 'last_qty', 'stok fisik', 'qty', 'jumlah', 'last qty (pcs)'],
    uom: ['uom', 'satuan', 'unit', 'base uom', 'sat'],
    qty_convert_ctn: ['qty convert ctn', 'qty convert', 'convert ctn', 'ctn', 'karton', 'qty ctn', 'qty_convert', 'konversi', 'qty convert (ctn)'],
    uom_convert: ['uom convert', 'satuan konversi', 'uom konversi', 'uom_convert'],
    lpn_serial: ['lpn/serial number', 'lpn serial', 'lpn', 'serial number', 'serial', 'sn', 'lpn/sn', 'lpn_serial', 'serial no'],
    batch: ['batch', 'no batch', 'lot', 'batch number', 'no. batch', 'kode batch'],
    vendor_batch: ['vendor batch', 'batch vendor', 'lot vendor', 'vendor_batch'],
    sloc: ['sloc', 'storage location', 'gudang', 'storage loc', 'lokasi simpan'],
    expired: ['expired', 'expired date', 'ed', 'exp date', 'tgl expired', 'kedaluwarsa', 'sled', 'exp', 'expiry date'],
    destination_code: ['destination code', 'kode tujuan', 'destination', 'tujuan', 'dst code'],
    qc_code: ['qc code', 'status qc', 'qc', 'kondisi', 'qc status'],
    user_tally: ['user tally', 'tally', 'petugas', 'checker', 'user'],
    shelf_life: ['shelf life', 'masa simpan', 'shelf_life', 'masa'],
    source: ['source', 'sumber', 'asal', 'inbound'],
    by_ed: ['by ed', 'by_ed', 'kategori ed', 'grup ed', 'byed', 'ed group', 'group ed']
  };

  for (let r = 0; r < maxSearch; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const colMap: Record<string, number> = {};
    let score = 0;

    row.forEach((cellVal, cIdx) => {
      if (cellVal === undefined || cellVal === null) return;
      const cleanText = String(cellVal).trim().toLowerCase().replace(/[_\-\s]+/g, ' ');

      for (const [field, synonyms] of Object.entries(fieldSynonyms)) {
        if (colMap[field] === undefined) {
          const matched = synonyms.some(syn => {
            const cleanSyn = syn.toLowerCase().replace(/[_\-\s]+/g, ' ');
            return cleanText === cleanSyn || cleanText.startsWith(cleanSyn + ' ') || cleanText.endsWith(' ' + cleanSyn);
          });
          if (matched) {
            colMap[field] = cIdx;
            score++;
            break;
          }
        }
      }
    });

    if (score > bestMatchScore && score >= 2) {
      bestMatchScore = score;
      bestHeaderIndex = r;
      bestColumnMap = colMap;
    }
  }

  if (bestHeaderIndex !== -1 && bestMatchScore >= 2) {
    return { headerIndex: bestHeaderIndex, columnMap: bestColumnMap };
  }

  return {
    headerIndex: 0,
    columnMap: {
      no: 0,
      item_code: 1,
      item_name: 2,
      category: 3,
      location: 4,
      location_type: 5,
      first_qty: 6,
      last_qty_pcs: 7,
      uom: 8,
      qty_convert_ctn: 9,
      uom_convert: 10,
      lpn_serial: 11,
      batch: 12,
      vendor_batch: 13,
      sloc: 14,
      expired: 15,
      destination_code: 16,
      qc_code: 17,
      user_tally: 18,
      shelf_life: 19,
      source: 20,
      by_ed: 21
    }
  };
}

export const COLOR_PALETTE = [
  '#1e40af', '#047857', '#b45309', '#b91c1c', 
  '#6d28d9', '#be185d', '#0e7490', '#334155',
  '#4338ca', '#15803d', '#c2410c', '#e11d48',
  '#7e22ce', '#0369a1', '#a16207', '#475569'
];

/**
 * Built-in Sample Generator Data for immediate testing without preparing a spreadsheet.
 */
export const DEMO_RETUR_DATA: ReturInventoryItem[] = [
  {
    id: 'demo-1',
    no: 1,
    item_code: 'KINO-CP-001',
    item_name: 'CAP PANDA LIANG TEH 310ML CAN',
    category: 'BEVERAGE',
    location: 'R-01-A',
    location_type: 'RACK',
    first_qty: 2400,
    last_qty_pcs: 2400,
    uom: 'PCS',
    qty_convert_ctn: 100,
    uom_convert: 'CTN',
    lpn_serial: 'LPN-2401',
    batch: 'B240810',
    vendor_batch: 'VB-01',
    sloc: '8A04',
    expired: '2026-09-25',
    destination_code: 'DST-JKT',
    qc_code: 'PASS',
    user_tally: 'CHECKER-1',
    shelf_life: '24 Bulan',
    source: 'INBOUND RETUR',
    by_ed: 'CAP PANDA'
  },
  {
    id: 'demo-2',
    no: 2,
    item_code: 'KINO-CP-002',
    item_name: 'CAP PANDA CINCAU 310ML CAN',
    category: 'BEVERAGE',
    location: 'R-01-B',
    location_type: 'RACK',
    first_qty: 1800,
    last_qty_pcs: 1680,
    uom: 'PCS',
    qty_convert_ctn: 70,
    uom_convert: 'CTN',
    lpn_serial: 'LPN-2402',
    batch: 'B240502',
    vendor_batch: 'VB-02',
    sloc: '8A04',
    expired: '2026-10-15',
    destination_code: 'DST-BDG',
    qc_code: 'RUSAK KEMASAN',
    user_tally: 'CHECKER-1',
    shelf_life: '24 Bulan',
    source: 'INBOUND RETUR',
    by_ed: 'CAP PANDA'
  },
  {
    id: 'demo-3',
    no: 3,
    item_code: 'KINO-SM-101',
    item_name: 'SAMANTHA HAIR CREME COLOR BLACK 25G',
    category: 'PERSONAL CARE',
    location: 'R-03-A',
    location_type: 'SHELF',
    first_qty: 3600,
    last_qty_pcs: 3600,
    uom: 'PCS',
    qty_convert_ctn: 50,
    uom_convert: 'CTN',
    lpn_serial: 'LPN-2403',
    batch: 'SM231120',
    vendor_batch: 'VB-03',
    sloc: '8A04',
    expired: '2026-08-30',
    destination_code: 'DST-SBY',
    qc_code: 'EXPIRED',
    user_tally: 'CHECKER-2',
    shelf_life: '36 Bulan',
    source: 'INBOUND RETUR',
    by_ed: 'SAMANTHA'
  },
  {
    id: 'demo-4',
    no: 4,
    item_code: 'KINO-OV-201',
    item_name: 'OVALE FACIAL MASK LEMON 15G',
    category: 'SKINCARE',
    location: 'R-02-C',
    location_type: 'RACK',
    first_qty: 1200,
    last_qty_pcs: 1200,
    uom: 'PCS',
    qty_convert_ctn: 24,
    uom_convert: 'CTN',
    lpn_serial: 'LPN-2404',
    batch: 'OV240115',
    vendor_batch: 'VB-04',
    sloc: '8A04',
    expired: '2027-02-28',
    destination_code: 'DST-JKT',
    qc_code: 'PASS',
    user_tally: 'CHECKER-3',
    shelf_life: '36 Bulan',
    source: 'INBOUND RETUR',
    by_ed: 'OVALE'
  },
  {
    id: 'demo-5',
    no: 5,
    item_code: 'KINO-SL-301',
    item_name: 'SLICK KITCHEN CLEANER 500ML REFILL',
    category: 'HOUSEHOLD',
    location: 'FL-01',
    location_type: 'FLOOR',
    first_qty: 960,
    last_qty_pcs: 960,
    uom: 'PCS',
    qty_convert_ctn: 40,
    uom_convert: 'CTN',
    lpn_serial: 'LPN-2405',
    batch: 'SL240310',
    vendor_batch: 'VB-05',
    sloc: '8A04',
    expired: '2027-08-15',
    destination_code: 'DST-CKB',
    qc_code: 'PASS',
    user_tally: 'CHECKER-2',
    shelf_life: '24 Bulan',
    source: 'INBOUND RETUR',
    by_ed: 'SLICK'
  }
];
