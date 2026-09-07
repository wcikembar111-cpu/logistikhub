import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Layers, 
  ArrowUpDown, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Check, 
  FileText, 
  Info, 
  DatabaseZap,
  RotateCcw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { MatchGrfgDetailRow, MatchGrfgOrderSummary } from '../../types';
import { useNotification } from '../../context/NotificationContext';

/* =========================================================
   KETENTUAN SISTEM KERJA MB51 MATCH GRFG REPACK
   ========================================================= */
const RULES = {
  materialMustContain: 'FG',
  allowedMovementTypes: ['101', '102', '261', '262', '531', '532'],
  orderPrefixes: ['120', '121']
};

const KONVERSI_SHEET_NAME = 'KONVERSI';
const STORAGE_KEY_KONVERSI = 'match_grfg_master_konversi_cache';
const STORAGE_KEY_LAST_SYNC = 'match_grfg_last_sync';
const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1o8hWUAK6DO1rmggbiRaRNfT7On4c9RhrHR6X07nqZm4/edit?gid=901676227#gid=901676227';
const DEFAULT_SHEET_ID = '1o8hWUAK6DO1rmggbiRaRNfT7On4c9RhrHR6X07nqZm4';
const DEFAULT_GID = '901676227';

const FIELDS_REQUIRED = {
  material: ['Material', 'Material Number', 'No. Material', 'Mat', 'Material No'],
  qty: ['Qty in unit of entry', 'Qty', 'Quantity', 'Jumlah', 'Qty in Un. of Entry', 'Quantity in Unit of Entry'],
  unit: ['Unit of Entry', 'Unit', 'UoM', 'Satuan', 'BUn', 'Base Unit of Measure'],
  movementType: ['Movement Type', 'Movement type', 'MvT', 'MT', 'Jenis Pergerakan', 'BwA'],
  order: ['Order', 'Order No', 'No. Order', 'Nomor Order', 'AUFNR', 'No Order']
};

const FIELDS_OPTIONAL = {
  deskripsi: ['Material Description', 'Deskripsi Material', 'Deskripsi', 'Material Text', 'Item Text Description'],
  dokumen: ['Material Document', 'Dokumen Material', 'No. Dokumen', 'Doc. Number', 'Mat. Doc.'],
  posting: ['Posting Date', 'Tanggal Posting', 'Tgl Posting', 'Post Date', 'Pstng Date'],
  batch: ['Batch', 'No. Batch', 'Lot', 'Charg'],
  teks: ['Text', 'Teks', 'Header Text', 'Item Text', 'Keterangan']
};

export function MatchGrfgRepackModule() {
  const { showToast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const konversiFileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRules, setShowRules] = useState<boolean>(true);

  // Analysis data
  const [summaryRows, setSummaryRows] = useState<MatchGrfgOrderSummary[]>([]);
  const [detailRows, setDetailRows] = useState<MatchGrfgDetailRow[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);

  // Master Konversi state (Map: materialKey -> factor)
  const [konversiMap, setKonversiMap] = useState<Map<string, number>>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_KONVERSI);
      if (cached) {
        const parsed = JSON.parse(cached);
        return new Map<string, number>(Object.entries(parsed));
      }
    } catch {
      // ignore
    }
    return new Map<string, number>();
  });

  const [isSyncingKonversi, setIsSyncingKonversi] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC) || '';
  });
  const [konversiSearch, setKonversiSearch] = useState<string>('');

  // UI Navigation & Filters
  const [activeTab, setActiveTab] = useState<'summary' | 'detail' | 'konversi'>('summary');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selisih' | 'ok'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [copiedOrder, setCopiedOrder] = useState<string | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<'order' | 'count' | 'total' | 'status'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Save konversi to local storage whenever it changes
  useEffect(() => {
    if (konversiMap.size > 0) {
      try {
        const obj = Object.fromEntries(konversiMap);
        localStorage.setItem(STORAGE_KEY_KONVERSI, JSON.stringify(obj));
      } catch {
        // ignore
      }
    }
  }, [konversiMap]);

  /* =========================================================
     HELPER FUNCTIONS
     ========================================================= */
  const formatNumber = (n: number | null | undefined): string => {
    if (n === null || n === undefined || isNaN(n)) return '0';
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString('id-ID');
  };

  const formatDate = (v: any): string => {
    if (!v) return '';
    if (v instanceof Date && !isNaN(v.getTime())) {
      const dd = String(v.getDate()).padStart(2, '0');
      const mm = String(v.getMonth() + 1).padStart(2, '0');
      const yyyy = v.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return String(v);
  };

  const sheetToAOA = (sheet: XLSX.WorkSheet): { headers: string[]; rows: any[][] } => {
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: false });
    if (!aoa.length) return { headers: [], rows: [] };
    const headers = (aoa[0] || []).map((h: any) => String(h === null || h === undefined ? '' : h).trim());
    return { headers, rows: aoa.slice(1) };
  };

  const findHeaderIndex = (headers: string[], targets: string[]): number => {
    for (const target of targets) {
      const idx = headers.indexOf(target);
      if (idx !== -1) return idx;
      const targetNorm = target.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      for (let i = 0; i < headers.length; i++) {
        const hNorm = headers[i].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hNorm === targetNorm) return i;
      }
    }
    return -1;
  };

  const resolveFields = (headers: string[], fieldMap: Record<string, string[]>): Record<string, number> => {
    const resolved: Record<string, number> = {};
    Object.keys(fieldMap).forEach(key => {
      resolved[key] = findHeaderIndex(headers, fieldMap[key]);
    });
    return resolved;
  };

  const findSheetName = (workbook: XLSX.WorkBook, target: string): string | null => {
    const names = workbook.SheetNames;
    const exact = names.find(n => n === target);
    if (exact) return exact;
    const targetUp = target.trim().toUpperCase();
    const caseMatch = names.find(n => n.trim().toUpperCase() === targetUp);
    if (caseMatch) return caseMatch;
    const partialMatch = names.find(n => n.trim().toUpperCase().includes(targetUp));
    return partialMatch || null;
  };

  const findDataSheet = (workbook: XLSX.WorkBook, konversiSheetName: string | null) => {
    const names = workbook.SheetNames;
    const candidates: Array<{ sheetName: string; aoa: { headers: string[]; rows: any[][] }; fieldsReq: Record<string, number>; missingCount: number }> = [];

    for (const sName of names) {
      if (konversiSheetName && sName === konversiSheetName) continue;

      const parsed = sheetToAOA(workbook.Sheets[sName]);
      if (!parsed.rows.length) continue;

      const fieldsReq = resolveFields(parsed.headers, FIELDS_REQUIRED);
      const missing = Object.keys(fieldsReq).filter(k => fieldsReq[k] === -1);

      if (missing.length === 0) {
        if (sName.trim().toUpperCase() === 'MB51') {
          return { sheetName: sName, aoa: parsed, fieldsReq, missingCount: 0 };
        }
        candidates.push({ sheetName: sName, aoa: parsed, fieldsReq, missingCount: 0 });
      } else {
        candidates.push({ sheetName: sName, aoa: parsed, fieldsReq, missingCount: missing.length });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.missingCount - b.missingCount);
      return candidates[0];
    }
    return null;
  };

  /* =========================================================
     EXTRACT KONVERSI DARI SHEET
     ========================================================= */
  const extractKonversiFromSheet = (rows: any[][]): Map<string, number> => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      if (!r || !r.length) return;
      const key = String(r[0] === undefined || r[0] === null ? '' : r[0]).trim();
      if (!key || key.toUpperCase() === 'MATERIAL' || key.toUpperCase() === 'MATERIAL NUMBER') return;

      // Check Column C (index 2), or fallback to Column B (index 1) if numeric
      let factor = 0;
      if (r.length > 2 && r[2] !== '' && !isNaN(Number(r[2]))) {
        factor = Number(r[2]);
      } else if (r.length > 1 && r[1] !== '' && !isNaN(Number(r[1]))) {
        factor = Number(r[1]);
      }
      if (!map.has(key)) {
        map.set(key, factor);
      }
    });
    return map;
  };

  /* =========================================================
     CORE CALCULATION
     ========================================================= */
  const runAnalysis = (
    mb51Rows: any[][], 
    fReq: Record<string, number>, 
    fOpt: Record<string, number>, 
    activeKonversi: Map<string, number>
  ) => {
    const groups = new Map<string, { rows: MatchGrfgDetailRow[]; sum: number }>();
    const details: MatchGrfgDetailRow[] = [];

    mb51Rows.forEach((row, i) => {
      const materialVal = row[fReq.material];
      const qty = Number(row[fReq.qty]) || 0;
      const unit = String(row[fReq.unit] === undefined || row[fReq.unit] === null ? '' : row[fReq.unit]).trim();
      const movementType = String(row[fReq.movementType] === undefined || row[fReq.movementType] === null ? '' : row[fReq.movementType]).trim();
      const orderStr = String(row[fReq.order] === undefined || row[fReq.order] === null ? '' : row[fReq.order]).trim();

      // Skip row if blank
      if (!materialVal && !orderStr && !movementType && !qty) return;

      const materialKey = String(materialVal === undefined || materialVal === null ? '' : materialVal).trim();
      const konversi = activeKonversi.get(materialKey) || 0;
      const isCar = unit.toUpperCase() === 'CAR';
      const totalPcs = isCar ? (qty * (konversi || 1)) : qty;

      const reasons: string[] = [];
      const matOk = materialKey && materialKey.toUpperCase().includes(RULES.materialMustContain);
      if (!matOk) reasons.push(`Material bukan "${RULES.materialMustContain}"`);

      const mtOk = RULES.allowedMovementTypes.includes(movementType);
      if (!mtOk) reasons.push(`Movement Type "${movementType || '-'}" tidak termasuk (harus ${RULES.allowedMovementTypes.join(',')})`);

      const orderOk = RULES.orderPrefixes.some(p => orderStr.startsWith(p));
      if (!orderOk) reasons.push(`Order tidak diawali ${RULES.orderPrefixes.join('/')}`);

      const included = !!(matOk && mtOk && orderOk);

      const detailRow: MatchGrfgDetailRow = {
        no: i + 1,
        order: orderStr,
        material: materialVal === undefined || materialVal === null ? '' : String(materialVal),
        deskripsi: fOpt.deskripsi !== -1 && row[fOpt.deskripsi] !== undefined ? String(row[fOpt.deskripsi]) : '',
        movementType,
        qty,
        unit,
        konversi,
        totalPcs,
        dokumen: fOpt.dokumen !== -1 && row[fOpt.dokumen] !== undefined ? String(row[fOpt.dokumen]) : '',
        posting: fOpt.posting !== -1 && row[fOpt.posting] !== undefined ? formatDate(row[fOpt.posting]) : '',
        batch: fOpt.batch !== -1 && row[fOpt.batch] !== undefined ? String(row[fOpt.batch]) : '',
        teks: fOpt.teks !== -1 && row[fOpt.teks] !== undefined ? String(row[fOpt.teks]) : '',
        included,
        reason: reasons.join('; ')
      };
      details.push(detailRow);

      if (included) {
        if (!groups.has(orderStr)) {
          groups.set(orderStr, { rows: [], sum: 0 });
        }
        const g = groups.get(orderStr)!;
        g.rows.push(detailRow);
        g.sum += totalPcs;
      }
    });

    const summaries: MatchGrfgOrderSummary[] = [];
    groups.forEach((g, order) => {
      const balanced = Math.abs(g.sum) < 0.005;
      summaries.push({
        order,
        count: g.rows.length,
        total: Math.round(g.sum * 100) / 100,
        status: balanced ? 'OK' : 'SELISIH',
        rows: g.rows
      });
    });

    setSummaryRows(summaries);
    setDetailRows(details);
    setHasAnalyzed(true);
    setIsProcessing(false);

    const okCount = summaries.filter(s => s.status === 'OK').length;
    const selisihCount = summaries.length - okCount;
    showToast(
      `Analisis selesai: ${summaries.length} order diproses (${okCount} Seimbang, ${selisihCount} Selisih).`,
      selisihCount > 0 ? 'warning' : 'success'
    );
  };

  /* =========================================================
     HANDLE MAIN MB51 FILE UPLOAD
     ========================================================= */
  const handleFileUpload = (file: File) => {
    setErrorMsg(null);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setErrorMsg('Format file harus .xlsx, .xls, atau .csv');
      showToast('Format file tidak didukung. Harap gunakan format Excel (.xlsx/.xls).', 'error');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error('File kosong atau gagal dibaca.');
        const workbook = XLSX.read(new Uint8Array(buffer as ArrayBuffer), { type: 'array', cellDates: true });

        // 1. Cek apakah ada sheet KONVERSI di workbook ini
        let activeKonversi = new Map(konversiMap);
        const konversiName = findSheetName(workbook, KONVERSI_SHEET_NAME);
        if (konversiName) {
          const konversiParsed = sheetToAOA(workbook.Sheets[konversiName]);
          if (konversiParsed.rows.length > 0) {
            const extracted = extractKonversiFromSheet(konversiParsed.rows);
            if (extracted.size > 0) {
              activeKonversi = extracted;
              setKonversiMap(extracted);
              showToast(`Ditemukan sheet KONVERSI di file (${extracted.size} item terdaftar).`, 'info');
            }
          }
        }

        // 2. Cari data sheet MB51
        const dataSheetInfo = findDataSheet(workbook, konversiName);
        if (!dataSheetInfo || dataSheetInfo.missingCount > 0) {
          const missingNames: string[] = [];
          if (dataSheetInfo && dataSheetInfo.fieldsReq) {
            Object.keys(dataSheetInfo.fieldsReq).forEach(k => {
              if (dataSheetInfo.fieldsReq[k] === -1) {
                missingNames.push(FIELDS_REQUIRED[k as keyof typeof FIELDS_REQUIRED][0]);
              }
            });
          }
          let msg = 'Sheet data transaksi MB51 tidak ditemukan atau kolom wajib belum lengkap.';
          if (missingNames.length > 0 && dataSheetInfo) {
            msg += ` (Sheet "${dataSheetInfo.sheetName}" kurang kolom: ${missingNames.join(', ')})`;
          }
          setErrorMsg(msg);
          setIsProcessing(false);
          showToast(msg, 'error');
          return;
        }

        const dataSheet = dataSheetInfo.aoa;
        const fieldsReq = dataSheetInfo.fieldsReq;
        const fieldsOpt = resolveFields(dataSheet.headers, FIELDS_OPTIONAL);

        runAnalysis(dataSheet.rows, fieldsReq, fieldsOpt, activeKonversi);
      } catch (err: any) {
        setErrorMsg(err.message || 'Terjadi kesalahan saat memproses file Excel.');
        setIsProcessing(false);
        showToast(`Gagal membaca Excel: ${err.message}`, 'error');
      }
    };

    reader.onerror = () => {
      setErrorMsg('Gagal membaca file dari penyimpanan perangkat.');
      setIsProcessing(false);
      showToast('Gagal membaca file.', 'error');
    };

    reader.readAsArrayBuffer(file);
  };

  /* =========================================================
     UPLOAD SEPARATE MASTER KONVERSI
     ========================================================= */
  const handleKonversiUpload = (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      showToast('Format file master konversi harus .xlsx/.xls', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;
        const workbook = XLSX.read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' });
        // find KONVERSI sheet or first sheet
        const sName = findSheetName(workbook, KONVERSI_SHEET_NAME) || workbook.SheetNames[0];
        const parsed = sheetToAOA(workbook.Sheets[sName]);
        const extracted = extractKonversiFromSheet(parsed.rows);
        if (extracted.size === 0) {
          showToast('Tidak ada data konversi yang valid di file ini. Pastikan Kolom A adalah Material dan Kolom C (atau B) adalah Faktor Konversi.', 'warning');
          return;
        }
        setKonversiMap(extracted);
        showToast(`Berhasil memuat ${extracted.size} data Master Konversi.`, 'success');

        // If detailRows already exist, re-calculate
        if (detailRows.length > 0) {
          recalculateWithNewKonversi(extracted);
        }
      } catch (err: any) {
        showToast(`Gagal membaca file konversi: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const recalculateWithNewKonversi = (newMap: Map<string, number>) => {
    const updatedDetails = detailRows.map(row => {
      const konversi = newMap.get(row.material) || 0;
      const isCar = row.unit.toUpperCase() === 'CAR';
      const totalPcs = isCar ? (row.qty * (konversi || 1)) : row.qty;
      return {
        ...row,
        konversi,
        totalPcs
      };
    });

    const groups = new Map<string, { rows: MatchGrfgDetailRow[]; sum: number }>();
    updatedDetails.forEach(r => {
      if (r.included) {
        if (!groups.has(r.order)) groups.set(r.order, { rows: [], sum: 0 });
        const g = groups.get(r.order)!;
        g.rows.push(r);
        g.sum += r.totalPcs;
      }
    });

    const summaries: MatchGrfgOrderSummary[] = [];
    groups.forEach((g, order) => {
      const balanced = Math.abs(g.sum) < 0.005;
      summaries.push({
        order,
        count: g.rows.length,
        total: Math.round(g.sum * 100) / 100,
        status: balanced ? 'OK' : 'SELISIH',
        rows: g.rows
      });
    });

    setDetailRows(updatedDetails);
    setSummaryRows(summaries);
    showToast('Rekalkulasi dengan Master Konversi baru selesai.', 'info');
  };

  /* =========================================================
     SINKRONISASI KONVERSI DARI GOOGLE SPREADSHEET (ONLINE)
     ========================================================= */
  const syncKonversiFromGoogleSheets = async (forceRefresh = false) => {
    setIsSyncingKonversi(true);
    try {
      const res = await fetch(`/api/match-grfg/fetch-konversi?sheetId=${DEFAULT_SHEET_ID}&gid=${DEFAULT_GID}&refresh=${forceRefresh ? 'true' : 'false'}`);
      if (!res.ok) {
        throw new Error(`Server status ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (!json.success || !json.csv) {
        throw new Error(json.message || 'Gagal menerima CSV dari Google Spreadsheet.');
      }

      const workbook = XLSX.read(json.csv, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = sheetToAOA(firstSheet);
      const extracted = extractKonversiFromSheet(parsed.rows);

      if (extracted.size === 0) {
        throw new Error('Tidak ada data material yang ditemukan dalam sheet KONVERSI Google Spreadsheet.');
      }

      setKonversiMap(extracted);
      const nowStr = new Date().toLocaleString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      setLastSyncTime(nowStr);
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, nowStr);
      
      showToast(`Berhasil menyinkronkan ${extracted.size.toLocaleString('id-ID')} Master Konversi dari Google Spreadsheet!`, 'success');

      if (detailRows.length > 0) {
        recalculateWithNewKonversi(extracted);
      }
    } catch (err: any) {
      console.error('Sync Konversi Error:', err);
      showToast(`Gagal sinkronisasi konversi: ${err.message}`, 'error');
    } finally {
      setIsSyncingKonversi(false);
    }
  };

  // Auto-sync on component mount if cache is empty
  useEffect(() => {
    if (konversiMap.size === 0) {
      syncKonversiFromGoogleSheets(false);
    }
  }, []);

  /* =========================================================
     DOWNLOAD CONTOH TEMPLATE EXCEL
     ========================================================= */
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: MB51
    const sampleMb51 = [
      ['Material', 'Material Description', 'Movement Type', 'Qty in unit of entry', 'Unit of Entry', 'Order', 'Material Document', 'Posting Date', 'Batch', 'Text'],
      ['FG-REPACK-001', 'Kino Candy Mint 150g Box', '101', 50, 'CAR', '1200008891', '5001234567', '2026-09-01', 'B260901', 'GR FG Repack Hasil'],
      ['FG-REPACK-001', 'Kino Candy Mint 150g Box', '261', -1200, 'PCS', '1200008891', '5001234568', '2026-09-01', 'B260901', 'GI Bahan Repack'],
      ['FG-REPACK-002', 'Ovale Facial Mask Lemon', '101', 20, 'CAR', '1210004452', '5001234569', '2026-09-02', 'B260902', 'GR FG Repack'],
      ['FG-REPACK-002', 'Ovale Facial Mask Lemon', '261', -450, 'PCS', '1210004452', '5001234570', '2026-09-02', 'B260902', 'GI Bahan (Selisih 30 pcs)']
    ];
    const wsMb51 = XLSX.utils.aoa_to_sheet(sampleMb51);
    XLSX.utils.book_append_sheet(wb, wsMb51, 'MB51');

    // Sheet 2: KONVERSI
    const sampleKonversi = [
      ['Material', 'Deskripsi', 'Faktor Konversi (1 CAR = n PCS)'],
      ['FG-REPACK-001', 'Kino Candy Mint 150g Box', 24],
      ['FG-REPACK-002', 'Ovale Facial Mask Lemon', 24]
    ];
    const wsKonversi = XLSX.utils.aoa_to_sheet(sampleKonversi);
    XLSX.utils.book_append_sheet(wb, wsKonversi, 'KONVERSI');

    XLSX.writeFile(wb, 'Template_MB51_Match_GRFG_Repack.xlsx');
    showToast('Template Excel berhasil diunduh.', 'success');
  };

  /* =========================================================
     EXPORT TO EXCEL
     ========================================================= */
  const exportToExcel = () => {
    if (!summaryRows.length && !detailRows.length) {
      showToast('Tidak ada data untuk diekspor.', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Per Order
    const summaryData = summaryRows.map((r, idx) => ({
      'No': idx + 1,
      'Nomor Order': r.order,
      'Jumlah Baris': r.count,
      'Total PCS': r.total,
      'Status': r.status === 'OK' ? 'SEIMBANG' : 'SELISIH'
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Per Order');

    // Sheet 2: Detail Baris
    const detailData = detailRows.map(r => ({
      'No': r.no,
      'Order': r.order,
      'Material': r.material,
      'Deskripsi Material': r.deskripsi,
      'Movement Type': r.movementType,
      'Qty': r.qty,
      'Unit': r.unit,
      'Konversi': r.konversi,
      'Total PCS': r.totalPcs,
      'No. Dokumen': r.dokumen,
      'Tgl Posting': r.posting,
      'Batch': r.batch,
      'Teks': r.teks,
      'Termasuk Kalkulasi': r.included ? 'Ya' : 'Tidak',
      'Alasan Dikecualikan': r.reason
    }));
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Baris MB51');

    // Sheet 3: Master Konversi yang dipakai
    const konversiArr = Array.from(konversiMap.entries()).map(([k, v], idx) => ({
      'No': idx + 1,
      'Material': k,
      'Faktor Konversi (CAR ke PCS)': v
    }));
    if (konversiArr.length > 0) {
      const wsKonv = XLSX.utils.json_to_sheet(konversiArr);
      XLSX.utils.book_append_sheet(wb, wsKonv, 'Master Konversi');
    }

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `Hasil_Match_GRFG_Repack_${stamp}.xlsx`);
    showToast('Berhasil mengunduh rekap Excel hasil analisis.', 'success');
  };

  /* =========================================================
     RESET TOOL
     ========================================================= */
  const handleReset = () => {
    setFileName('');
    setSummaryRows([]);
    setDetailRows([]);
    setHasAnalyzed(false);
    setErrorMsg(null);
    setSearchQuery('');
    setStatusFilter('all');
    setExpandedOrders(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Tampilan berhasil direset.', 'info');
  };

  /* =========================================================
     ACCORDION TOGGLE
     ========================================================= */
  const toggleOrderExpand = (order: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order);
      else next.add(order);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrder(text);
    setTimeout(() => setCopiedOrder(null), 1500);
    showToast(`Disalin: ${text}`, 'info');
  };

  /* =========================================================
     FILTERED & SORTED LISTS
     ========================================================= */
  const filteredSummary = useMemo(() => {
    let list = summaryRows.slice();

    if (statusFilter === 'selisih') {
      list = list.filter(r => r.status === 'SELISIH');
    } else if (statusFilter === 'ok') {
      list = list.filter(r => r.status === 'OK');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.order.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];
      if (sortKey === 'total') {
        valA = Math.abs(a.total);
        valB = Math.abs(b.total);
      }
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [summaryRows, statusFilter, searchQuery, sortKey, sortDir]);

  const filteredDetails = useMemo(() => {
    let list = detailRows.slice();

    if (statusFilter === 'selisih') {
      const selisihOrders = new Set(summaryRows.filter(s => s.status === 'SELISIH').map(s => s.order));
      list = list.filter(r => selisihOrders.has(r.order));
    } else if (statusFilter === 'ok') {
      const okOrders = new Set(summaryRows.filter(s => s.status === 'OK').map(s => s.order));
      list = list.filter(r => okOrders.has(r.order));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.order.toLowerCase().includes(q) ||
        r.material.toLowerCase().includes(q) ||
        r.deskripsi.toLowerCase().includes(q) ||
        r.batch.toLowerCase().includes(q) ||
        r.dokumen.toLowerCase().includes(q)
      );
    }

    return list;
  }, [detailRows, summaryRows, statusFilter, searchQuery]);

  const filteredKonversiList = useMemo(() => {
    let list = Array.from(konversiMap.entries());
    if (konversiSearch.trim()) {
      const q = konversiSearch.toLowerCase().trim();
      list = list.filter(([mat]) => mat.toLowerCase().includes(q));
    }
    return list;
  }, [konversiMap, konversiSearch]);

  // Statistics calculation
  const totalOrders = summaryRows.length;
  const okCount = summaryRows.filter(r => r.status === 'OK').length;
  const selisihCount = totalOrders - okCount;
  const totalRows = detailRows.length;
  const includedRows = detailRows.filter(r => r.included).length;
  const excludedRows = totalRows - includedRows;

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              MB51 Analyzer
            </span>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Generator 100% Client-Side
            </span>
            <span className="bg-slate-700/60 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Tanpa Database
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="text-emerald-400" size={26} />
            Match GRFG Repack
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Rekonsiliasi pergerakan stok SAP MB51 per Nomor Order. Otomatis memvalidasi filter FG, Movement Type (101, 102, 261, 262, 531, 532), Order prefix 120/121, dan konversi CAR ke PCS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            title="Unduh contoh template Excel MB51 & KONVERSI"
          >
            <Download size={14} className="text-emerald-400" />
            Contoh Template
          </button>
          {hasAnalyzed && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RotateCcw size={14} className="text-amber-400" />
              Upload File Baru
            </button>
          )}
        </div>
      </div>

      {/* Accordion: Sistem Kerja & Aturan Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowRules(prev => !prev)}
          className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200/80"
        >
          <div className="flex items-center gap-2.5">
            <Info size={16} className="text-blue-600 shrink-0" />
            <span className="font-semibold text-sm text-slate-800">
              Sistem Kerja & Ketentuan Filter Rekonsiliasi MB51
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>{showRules ? 'Sembunyikan' : 'Lihat Aturan'}</span>
            {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showRules && (
          <div className="p-5 text-xs sm:text-sm text-slate-600 space-y-3 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="font-bold text-blue-900 block mb-1">1. Filter Material</span>
                <p className="text-slate-600 text-xs">
                  Material harus mengandung teks <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">"FG"</span> (Finished Goods).
                </p>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <span className="font-bold text-emerald-900 block mb-1">2. Movement Type Diizinkan</span>
                <p className="text-slate-600 text-xs">
                  Hanya baris dengan MT: <span className="font-mono bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">101, 102, 261, 262, 531, 532</span>.
                </p>
              </div>
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="font-bold text-indigo-900 block mb-1">3. Awalan Nomor Order</span>
                <p className="text-slate-600 text-xs">
                  Nomor Order harus diawali dengan <span className="font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">120</span> atau <span className="font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">121</span>.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <p className="text-slate-700">
                <strong className="text-slate-900">Kalkulasi Total PCS:</strong> Baris dengan Unit = <code className="bg-slate-200 text-slate-800 px-1 rounded">CAR</code> dikalikan faktor konversi dari sheet <code className="bg-slate-200 text-slate-800 px-1 rounded">KONVERSI</code> (1 CAR = n PCS). Unit lain tetap dihitung apa adanya.
              </p>
              <p className="text-slate-700">
                <strong className="text-slate-900">Validasi Keseimbangan:</strong> Seluruh baris yang lolos ketiga filter dijumlahkan per Nomor Order. Jika total = 0, status <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">SEIMBANG</span>. Jika ada sisa selisih, ditandai <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">SELISIH</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Zone & Konversi Status */}
      {!hasAnalyzed ? (
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-white ${
              isProcessing 
                ? 'border-blue-400 bg-blue-50/40 pointer-events-none opacity-80' 
                : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              {isProcessing ? (
                <RefreshCw size={28} className="animate-spin text-blue-600" />
              ) : (
                <Upload size={28} />
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
              {isProcessing ? 'Memproses dan Menganalisis MB51...' : 'Upload File Excel SAP MB51'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mb-3 leading-relaxed">
              Klik atau seret file spreadsheet (.xlsx / .xls). File dapat berisi sheet transaksi <code className="text-slate-700 font-mono bg-slate-100 px-1 rounded">MB51</code> dan sheet <code className="text-slate-700 font-mono bg-slate-100 px-1 rounded">KONVERSI</code> secara terpadu.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                Kolom wajib MB51: Material, Qty, Unit, Movement Type, Order
              </span>
              <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                {konversiMap.size > 0 
                  ? `Konversi Otomatis Siap (${konversiMap.size.toLocaleString('id-ID')} item dari Google Spreadsheet)` 
                  : 'Menghubungkan ke Google Spreadsheet...'}
              </span>
            </div>
          </div>

          {/* Master Konversi Status Card: Google Spreadsheet Connected */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                <CheckCircle2 size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-emerald-950">
                    Master Konversi: Terhubung Otomatis ke Google Spreadsheet
                  </span>
                  <span className="bg-emerald-200/70 text-emerald-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {konversiMap.size > 0 ? `${konversiMap.size.toLocaleString('id-ID')} Produk Aktif` : 'Menghubungkan...'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed max-w-2xl">
                  <strong>Anda tidak perlu mengupload file konversi setiap saat!</strong> Konversi CAR ke PCS tersinkronisasi otomatis dari sheet <code className="bg-emerald-100 px-1 rounded font-mono text-emerald-900">KONVERSI</code> Google Spreadsheet Anda.
                </p>
                {lastSyncTime && (
                  <p className="text-[11px] text-emerald-700/70">
                    Terakhir disinkronkan: <span className="font-semibold text-emerald-900">{lastSyncTime}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                disabled={isSyncingKonversi}
                onClick={() => syncKonversiFromGoogleSheets(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                title="Perbarui data konversi dari Google Spreadsheet terbaru"
              >
                <RefreshCw size={13} className={isSyncingKonversi ? 'animate-spin' : ''} />
                {isSyncingKonversi ? 'Menyinkronkan...' : 'Sinkronkan Ulang'}
              </button>
              <a
                href={DEFAULT_SPREADSHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink size={13} className="text-slate-500" />
                Buka Spreadsheet
              </a>
              <input 
                ref={konversiFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleKonversiUpload(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => konversiFileInputRef.current?.click()}
                className="px-2.5 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs transition-colors"
                title="Upload file konversi manual cadangan jika offline"
              >
                Upload Manual
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-rose-500 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Kendala Analisis Data</span>
                {errorMsg}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-5 animate-fade-in">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">Total Nomor Order</span>
              <div className="text-2xl font-bold font-mono text-slate-900">{formatNumber(totalOrders)}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Order unik lolos filter</span>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-2xs bg-emerald-50/20">
              <span className="text-xs text-emerald-700 font-medium block mb-1">Seimbang (Balance = 0)</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">{formatNumber(okCount)}</div>
              <span className="text-[11px] text-emerald-600/80 mt-1 block">Stok masuk = keluar</span>
            </div>

            <div className={`bg-white rounded-xl p-4 shadow-2xs border ${
              selisihCount > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
            }`}>
              <span className={`text-xs font-medium block mb-1 ${
                selisihCount > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}>
                Selisih (Perlu Cek)
              </span>
              <div className={`text-2xl font-bold font-mono ${
                selisihCount > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}>
                {formatNumber(selisihCount)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Order dengan saldo ≠ 0</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block mb-1">Total Baris File</span>
              <div className="text-2xl font-bold font-mono text-slate-800">{formatNumber(totalRows)}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Seluruh data transaksi</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 font-medium block mb-1">Baris Dihitung</span>
              <div className="text-2xl font-bold font-mono text-blue-600">{formatNumber(includedRows)}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">{formatNumber(excludedRows)} baris dikecualikan</span>
            </div>
          </div>

          {/* Main Card with Tabs & Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Tab navigation */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 sm:px-6 pt-3 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                    activeTab === 'summary'
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ringkasan Per Order ({filteredSummary.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('detail')}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                    activeTab === 'detail'
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Detail Baris Transaksi ({filteredDetails.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('konversi')}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
                    activeTab === 'konversi'
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Data Konversi ({konversiMap.size})
                </button>
              </div>

              <div className="py-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download size={14} />
                  Export ke Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Toolbar (Search & Filters) */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor order / material / deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Semua ({summaryRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('selisih')}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      statusFilter === 'selisih' ? 'bg-rose-500 text-white shadow-2xs font-semibold' : 'text-rose-600 hover:text-rose-800'
                    }`}
                  >
                    Selisih Saja ({selisihCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ok')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === 'ok' ? 'bg-emerald-600 text-white shadow-2xs font-semibold' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Seimbang ({okCount})
                  </button>
                </div>
              </div>
            </div>

            {/* TAB 1: RINGKASAN PER ORDER */}
            {activeTab === 'summary' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th 
                        onClick={() => {
                          if (sortKey === 'order') setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('order'); setSortDir('asc'); }
                        }}
                        className="py-3 px-4 cursor-pointer hover:text-blue-700 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Nomor Order
                          <ArrowUpDown size={12} className="opacity-60" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (sortKey === 'count') setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('count'); setSortDir('desc'); }
                        }}
                        className="py-3 px-4 text-right cursor-pointer hover:text-blue-700 select-none"
                      >
                        <div className="flex items-center justify-end gap-1">
                          Jumlah Baris
                          <ArrowUpDown size={12} className="opacity-60" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (sortKey === 'total') setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('total'); setSortDir('desc'); }
                        }}
                        className="py-3 px-4 text-right cursor-pointer hover:text-blue-700 select-none"
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total PCS
                          <ArrowUpDown size={12} className="opacity-60" />
                        </div>
                      </th>
                      <th 
                        onClick={() => {
                          if (sortKey === 'status') setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('status'); setSortDir('asc'); }
                        }}
                        className="py-3 px-4 text-center cursor-pointer hover:text-blue-700 select-none"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Status
                          <ArrowUpDown size={12} className="opacity-60" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSummary.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Tidak ada data nomor order yang sesuai dengan kriteria pencarian / filter.
                        </td>
                      </tr>
                    ) : (
                      filteredSummary.map((item, idx) => {
                        const isExpanded = expandedOrders.has(item.order);
                        const isOk = item.status === 'OK';

                        // Group rows by Movement Type for expanded view
                        const mtMap = new Map<string, { count: number; sum: number }>();
                        item.rows.forEach(r => {
                          if (!mtMap.has(r.movementType)) {
                            mtMap.set(r.movementType, { count: 0, sum: 0 });
                          }
                          const cur = mtMap.get(r.movementType)!;
                          cur.count += 1;
                          cur.sum += r.totalPcs;
                        });

                        return (
                          <React.Fragment key={item.order}>
                            <tr className={`hover:bg-slate-50/80 transition-colors ${
                              !isOk ? 'bg-rose-50/20' : ''
                            }`}>
                              <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-mono font-medium text-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <span>{item.order}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(item.order)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Salin Nomor Order"
                                  >
                                    {copiedOrder === item.order ? (
                                      <Check size={12} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600">
                                {formatNumber(item.count)}
                              </td>
                              <td className={`py-3 px-4 text-right font-mono font-bold ${
                                isOk ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {formatNumber(item.total)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isOk
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {isOk ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                  {isOk ? 'SEIMBANG' : 'SELISIH'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleOrderExpand(item.order)}
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1 mx-auto ${
                                    isExpanded
                                      ? 'bg-slate-200 text-slate-800 border-slate-300'
                                      : 'bg-white hover:bg-slate-100 text-blue-700 border-slate-300'
                                  }`}
                                >
                                  {isExpanded ? 'Tutup' : 'Detail'}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              </td>
                            </tr>

                            {/* Accordion Detail Rows */}
                            {isExpanded && (
                              <tr className="bg-slate-50/70 border-b border-slate-200">
                                <td colSpan={6} className="p-4">
                                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
                                    {/* Sub-table: Movement Type Breakdown */}
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Layers size={13} className="text-blue-600" />
                                        Ringkasan per Movement Type
                                      </h5>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {Array.from(mtMap.entries()).map(([mt, d]) => (
                                          <div key={mt} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                              <span className="font-mono font-bold text-blue-800">MT {mt}</span>
                                              <span className="text-slate-500 font-mono">{d.count} baris</span>
                                            </div>
                                            <div className="text-sm font-mono font-semibold text-slate-800">
                                              {formatNumber(d.sum)} <span className="text-[11px] font-normal text-slate-400">PCS</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Sub-table: Individual contributing rows */}
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FileText size={13} className="text-emerald-600" />
                                        Baris Kontribusi Order ({item.rows.length} Transaksi)
                                      </h5>
                                      <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-72">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
                                              <th className="py-2 px-3">Material</th>
                                              <th className="py-2 px-3">Deskripsi</th>
                                              <th className="py-2 px-3 text-center">MT</th>
                                              <th className="py-2 px-3 text-right">Qty Asli</th>
                                              <th className="py-2 px-3 text-center">Unit</th>
                                              <th className="py-2 px-3 text-right">Konversi</th>
                                              <th className="py-2 px-3 text-right">Total PCS</th>
                                              <th className="py-2 px-3">Dokumen</th>
                                              <th className="py-2 px-3">Tgl Post</th>
                                              <th className="py-2 px-3">Batch</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {item.rows.map((row, rIdx) => (
                                              <tr key={rIdx} className="hover:bg-slate-50 font-mono text-[11px]">
                                                <td className="py-2 px-3 font-semibold text-slate-800">{row.material}</td>
                                                <td className="py-2 px-3 font-sans text-slate-600">{row.deskripsi || '-'}</td>
                                                <td className="py-2 px-3 text-center font-bold text-blue-700">{row.movementType}</td>
                                                <td className="py-2 px-3 text-right">{formatNumber(row.qty)}</td>
                                                <td className="py-2 px-3 text-center font-sans">{row.unit}</td>
                                                <td className="py-2 px-3 text-right">{formatNumber(row.konversi)}</td>
                                                <td className="py-2 px-3 text-right font-bold text-slate-900">{formatNumber(row.totalPcs)}</td>
                                                <td className="py-2 px-3 text-slate-500">{row.dokumen || '-'}</td>
                                                <td className="py-2 px-3 text-slate-500 font-sans">{row.posting || '-'}</td>
                                                <td className="py-2 px-3 text-slate-500">{row.batch || '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: DETAIL BARIS TRANSAKSI */}
            {activeTab === 'detail' && (
              <div className="overflow-x-auto max-h-[650px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                      <th className="py-3 px-3 text-center w-12">No</th>
                      <th className="py-3 px-3">Order</th>
                      <th className="py-3 px-3">Material</th>
                      <th className="py-3 px-3">Deskripsi</th>
                      <th className="py-3 px-3 text-center">MT</th>
                      <th className="py-3 px-3 text-right">Qty</th>
                      <th className="py-3 px-3 text-center">Unit</th>
                      <th className="py-3 px-3 text-right">Konversi</th>
                      <th className="py-3 px-3 text-right">Total PCS</th>
                      <th className="py-3 px-3">Dokumen</th>
                      <th className="py-3 px-3">Tgl Post</th>
                      <th className="py-3 px-3">Batch</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                    {filteredDetails.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-slate-400 font-sans">
                          Tidak ada baris transaksi yang sesuai dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredDetails.map((r, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-slate-50 transition-colors ${
                            r.included ? '' : 'bg-slate-50/60 text-slate-400 opacity-80'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400">{r.no}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{r.order || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{r.material}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 max-w-xs truncate">{r.deskripsi || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-700">{r.movementType}</td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(r.qty)}</td>
                          <td className="py-2.5 px-3 text-center font-sans">{r.unit}</td>
                          <td className="py-2.5 px-3 text-right">{formatNumber(r.konversi)}</td>
                          <td className={`py-2.5 px-3 text-right font-bold ${
                            r.included ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                            {formatNumber(r.totalPcs)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{r.dokumen || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-sans">{r.posting || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{r.batch || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {r.included ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                TERMASUK
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                                DIKECUALIKAN
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs text-rose-600 max-w-xs truncate">
                            {r.reason || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: DATA MASTER KONVERSI */}
            {activeTab === 'konversi' && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-emerald-950 text-sm">
                        Master Konversi ({konversiMap.size.toLocaleString('id-ID')} Item Terhubung)
                      </h4>
                      <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        Google Sheets Live
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/80 mt-1">
                      Faktor ini otomatis digunakan untuk mengalikan kuantitas satuan <code className="bg-emerald-100 px-1 rounded text-emerald-900 font-mono">CAR</code> menjadi <code className="bg-emerald-100 px-1 rounded text-emerald-900 font-mono">PCS</code>. Anda tidak perlu mengupload file setiap saat.
                    </p>
                    {lastSyncTime && (
                      <p className="text-[11px] text-emerald-700/70 mt-0.5">
                        Terakhir disinkronkan: <span className="font-semibold text-emerald-900">{lastSyncTime}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSyncingKonversi}
                      onClick={() => syncKonversiFromGoogleSheets(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <RefreshCw size={13} className={isSyncingKonversi ? 'animate-spin' : ''} />
                      {isSyncingKonversi ? 'Menyinkronkan...' : 'Sinkronkan Ulang'}
                    </button>
                    <a
                      href={DEFAULT_SPREADSHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <ExternalLink size={13} className="text-slate-500" />
                      Buka Spreadsheet
                    </a>
                    <button
                      type="button"
                      onClick={() => konversiFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Upload size={13} />
                      Upload File (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Search Bar for Konversi Table */}
                <div className="flex items-center gap-2 max-w-sm">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari kode material di daftar konversi..."
                      value={konversiSearch}
                      onChange={(e) => setKonversiSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  {konversiSearch && (
                    <button
                      type="button"
                      onClick={() => setKonversiSearch('')}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {konversiMap.size === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    {isSyncingKonversi 
                      ? 'Sedang menyinkronkan data Master Konversi dari Google Spreadsheet...'
                      : 'Belum ada data konversi yang tersimpan. Silakan klik tombol "Sinkronkan Ulang" di atas.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                          <th className="py-2.5 px-4 w-16 text-center">No</th>
                          <th className="py-2.5 px-4">Material Code (Finished Goods)</th>
                          <th className="py-2.5 px-4 text-right">Faktor Konversi (1 CAR = n PCS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {filteredKonversiList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400 font-sans">
                              Tidak ada kode material yang cocok dengan "{konversiSearch}".
                            </td>
                          </tr>
                        ) : (
                          filteredKonversiList.map(([mat, val], idx) => (
                            <tr key={mat} className="hover:bg-slate-50">
                              <td className="py-2 px-4 text-center text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-4 font-semibold text-slate-800">{mat}</td>
                              <td className="py-2 px-4 text-right font-bold text-emerald-700">{formatNumber(val)} PCS</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
