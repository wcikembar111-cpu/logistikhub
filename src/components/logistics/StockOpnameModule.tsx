import React, { useState, useRef, useEffect, useMemo } from 'react';
import XLSX from 'xlsx-js-style';
import { 
  Layers, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  Sliders, 
  Info, 
  Building2, 
  UserCheck, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Search, 
  Eye, 
  Clock, 
  ShieldCheck,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useSupabase';

const LOGO_URL = 'https://res.cloudinary.com/dedtb3vnj/image/upload/v1782568576/kino_yrhkmc.png';

// Role & App Metadata
export const APP_METADATA = {
  appName: 'Suite Stock Opname',
  version: '3.4',
  company: 'CKBLogistik',
  deployedBy: 'wcikembar111@gmail.com',
  serverTimezone: 'Asia/Jakarta'
};

function fmtTglID(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const bln = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${String(d.getDate()).padStart(2, '0')} ${bln[d.getMonth()]} ${d.getFullYear()}`;
}

function normKey(obj: Record<string, any>, candidates: string[]) {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const found = keys.find(k => k.trim().toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  return null;
}

export function StockOpnameModule() {
  const { showToast, showConfirm } = useNotification();
  const { isAdmin } = useAuth();

  // Navigation & Route state: 'form' | 'ba'
  const [currentRoute, setCurrentRoute] = useState<'form' | 'ba'>('form');

  // Stepper state
  const [formStep, setFormStep] = useState<number>(1);
  const [baStep, setBaStep] = useState<number>(1);

  // Preview overlay state
  const [previewMode, setPreviewMode] = useState<'none' | 'form' | 'ba'>('none');

  // Admin Mass Delete State (Berita Acara Result Table)
  const [selectedBaNos, setSelectedBaNos] = useState<number[]>([]);

  // ============================================================
  //  STATE MODUL 1: GENERATOR FORM SO
  // ============================================================
  const [uploadFormat, setUploadFormat] = useState<'retur' | 'mb52'>('retur');
  const [formFileName, setFormFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [aggRows, setAggRows] = useState<any[]>([]);
  const [slocSummary, setSlocSummary] = useState<Record<string, any>>({});
  const [selectedSlocs, setSelectedSlocs] = useState<Set<string>>(new Set());
  const [numericCols, setNumericCols] = useState<string[]>([]);
  const [selectedQtyCol, setSelectedQtyCol] = useState<string>('');
  const [mb52Groups, setMb52Groups] = useState<{ FG: { count: number; plant: string }; PACKAGING: { count: number; plant: string } }>({
    FG: { count: 0, plant: '' },
    PACKAGING: { count: 0, plant: '' }
  });

  // Form Headers
  const [formDocNo, setFormDocNo] = useState('PPIC.025.00');
  const [formPlant, setFormPlant] = useState('1800');
  const [formArea, setFormArea] = useState('Gd. Distribusi');
  const [formTgl, setFormTgl] = useState(new Date().toISOString().slice(0, 10));
  const [formPic1, setFormPic1] = useState('');
  const [formPic2, setFormPic2] = useState('');
  const [formPaperSize, setFormPaperSize] = useState<'A4' | 'Letter'>('A4');

  // Raw file caching for re-triggering column chips in Retur mode
  const rawJsonCacheRef = useRef<{ json: any[]; kLoc: string; kCode: string; kName: string; kSloc: string; kNo: string | null } | null>(null);

  // ============================================================
  //  STATE MODUL 2: GENERATOR BERITA ACARA
  // ============================================================
  const [sapFileName, setSapFileName] = useState<string>('');
  const [soFileName, setSoFileName] = useState<string>('');
  const [sapData, setSapData] = useState<any[] | null>(null);
  const [soData, setSoData] = useState<any[] | null>(null);
  const [soRawJson, setSoRawJson] = useState<any[] | null>(null);
  const [soFisikCol, setSoFisikCol] = useState<string | null>(null);
  const [soNumCols, setSoNumCols] = useState<string[]>([]);
  const [joinedRows, setJoinedRows] = useState<any[]>([]);
  const [unmatchedList, setUnmatchedList] = useState<string[]>([]);
  const [sheetResultsSummary, setSheetResultsSummary] = useState<string>('');
  const [baSearch, setBaSearch] = useState('');

  // BA Header Parameters
  const [baNarasi, setBaNarasi] = useState(
    'Pada hari ini Tanggal [TGL] daripukul 08:00- Selesai, Tim Inventory Melakukan penghitungan barang Jadi yang ada di Gudang Cikembar dengan rincian sebagai berikut :'
  );
  const [baTgl, setBaTgl] = useState(new Date().toISOString().slice(0, 10));
  const [baGudang, setBaGudang] = useState('Gudang Cikembar');
  const [baPaperSize, setBaPaperSize] = useState<'A4' | 'Letter'>('A4');

  // Handlers Hapus Massal Admin
  const handleToggleSelectAllBa = (visibleNos: number[]) => {
    if (selectedBaNos.length === visibleNos.length) {
      setSelectedBaNos([]);
    } else {
      setSelectedBaNos(visibleNos);
    }
  };

  const handleToggleSelectBa = (no: number) => {
    setSelectedBaNos(prev => 
      prev.includes(no) ? prev.filter(x => x !== no) : [...prev, no]
    );
  };

  const handleBulkDeleteBa = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Fungsi hapus massal khusus untuk Admin.', 'danger');
      return;
    }
    if (selectedBaNos.length === 0) {
      showToast('Pilih Data', 'Pilih setidaknya satu baris rekonsiliasi.', 'info');
      return;
    }

    showConfirm({
      title: 'Konfirmasi Hapus Massal Baris Rekonsiliasi (Admin)',
      message: `Apakah Anda yakin ingin menghapus ${selectedBaNos.length} baris hasil rekonsiliasi terpilih?`,
      confirmText: `Ya, Hapus ${selectedBaNos.length} Baris`,
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        const nextRows = joinedRows.filter(r => !selectedBaNos.includes(r.no));
        // re-number rows
        const renumbered = nextRows.map((r, idx) => ({ ...r, no: idx + 1 }));
        setJoinedRows(renumbered);
        setSelectedBaNos([]);
        showToast('Sukses', `${selectedBaNos.length} baris rekonsiliasi berhasil dihapus.`, 'success');
      }
    });
  };

  const handleClearAllBa = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Fungsi reset tabel rekonsiliasi khusus untuk Admin.', 'danger');
      return;
    }

    showConfirm({
      title: 'Kosongkan Seluruh Tabel Rekonsiliasi (Admin)',
      message: 'Apakah Anda yakin ingin mengosongkan seluruh baris tabel rekonsiliasi Berita Acara?',
      confirmText: 'Ya, Kosongkan Semua',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        setJoinedRows([]);
        setSelectedBaNos([]);
        showToast('Tabel Dikosongkan', 'Seluruh data rekonsiliasi telah dikosongkan.', 'info');
      }
    });
  };

  // ============================================================
  //  LOGIKA RESET & ROUTER
  // ============================================================
  const resetFormModule = () => {
    setFormFileName('');
    setRawRows([]);
    setAggRows([]);
    setSlocSummary({});
    setSelectedSlocs(new Set());
    setNumericCols([]);
    setSelectedQtyCol('');
    setMb52Groups({ FG: { count: 0, plant: '' }, PACKAGING: { count: 0, plant: '' } });
    rawJsonCacheRef.current = null;
    setFormStep(1);
    setPreviewMode('none');
  };

  const resetBaModule = () => {
    setSapFileName('');
    setSoFileName('');
    setSapData(null);
    setSoData(null);
    setSoRawJson(null);
    setSoFisikCol(null);
    setSoNumCols([]);
    setJoinedRows([]);
    setUnmatchedList([]);
    setSheetResultsSummary('');
    setBaStep(1);
    setPreviewMode('none');
  };

  const handleFormatChange = (fmt: 'retur' | 'mb52') => {
    if (fmt === uploadFormat) return;
    setUploadFormat(fmt);
    resetFormModule();
  };

  // ============================================================
  //  MODUL 1: FILE PARSER (RETUR & MB52)
  // ============================================================
  const handleFormFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFormFile(file);
    e.target.value = '';
  };

  const processFormFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        if (!json.length) {
          showToast('File Kosong', 'Tidak ditemukan data di dalam sheet pertama.', 'warning');
          return;
        }

        if (uploadFormat === 'mb52') {
          processMb52Data(json, file.name);
        } else {
          processReturData(json, file.name);
        }
      } catch (err: any) {
        console.error(err);
        showToast('Gagal Membaca File', err.message || 'Format file tidak valid.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- RETUR PROCESSOR ---
  const processReturData = (json: any[], fileName: string) => {
    const sample = json[0];
    const kLoc = normKey(sample, ['Location']);
    const kCode = normKey(sample, ['Item Code']);
    const kName = normKey(sample, ['Item Name']);
    const kSloc = normKey(sample, ['SLOC', 'Sloc']);

    if (!kLoc || !kCode || !kName || !kSloc) {
      showToast('Kolom Wajib Tidak Lengkap', 'Kolom wajib (Location, Item Code, Item Name, SLOC) tidak ditemukan.', 'danger');
      return;
    }

    const numCols = Object.keys(sample).filter(k => {
      const lk = k.trim().toLowerCase();
      if (['location', 'item code', 'item name', 'sloc', 'no'].includes(lk)) return false;
      const vals = json.slice(0, 20).map(r => r[k]).filter(v => v !== '');
      return vals.filter(v => !isNaN(Number(v)) && v !== '').length > 0;
    });

    if (!numCols.length) {
      showToast('Kolom Qty Tidak Ditemukan', 'Tidak ditemukan kolom numerik kuantitas di file retur.', 'danger');
      return;
    }

    const defaultQty = normKey(sample, ['Last Qty', 'LastQty', 'last qty', 'Qty', 'QTY']) || numCols[0];
    setNumericCols(numCols);
    setSelectedQtyCol(defaultQty);
    setFormFileName(fileName);

    const kNo = normKey(sample, ['No']);
    rawJsonCacheRef.current = { json, kLoc, kCode, kName, kSloc, kNo };

    applyReturAggregation(json, kLoc, kCode, kName, kSloc, kNo, defaultQty);
  };

  const applyReturAggregation = (
    json: any[], 
    kLoc: string, 
    kCode: string, 
    kName: string, 
    kSloc: string, 
    kNo: string | null, 
    qtyCol: string
  ) => {
    const parsedRaw = json.map(r => ({
      no: kNo ? (r[kNo] ?? '') : '',
      location: String(r[kLoc] ?? '').trim(),
      itemCode: String(r[kCode] ?? '').trim(),
      itemName: String(r[kName] ?? '').trim(),
      sloc: String(r[kSloc] ?? '').trim(),
      lastQty: Number(r[qtyCol]) || 0
    })).filter(r => r.sloc);

    setRawRows(parsedRaw);

    // SUMIFS Aggregation by location || itemCode || sloc
    const map = new Map<string, any>();
    parsedRaw.forEach(r => {
      const key = `${r.location}||${r.itemCode}||${r.sloc}`;
      if (!map.has(key)) {
        map.set(key, {
          no: r.no,
          location: r.location,
          itemCode: r.itemCode,
          itemName: r.itemName,
          sloc: r.sloc,
          lastQty: 0
        });
      }
      map.get(key)!.lastQty += r.lastQty;
    });

    const aggregated = Array.from(map.values()).sort((a, b) => {
      if (a.sloc !== b.sloc) return a.sloc.localeCompare(b.sloc);
      if (a.location !== b.location) return a.location.localeCompare(b.location);
      return a.itemCode.localeCompare(b.itemCode);
    });

    setAggRows(aggregated);

    // SLoc summary mapping
    const summary: Record<string, any> = {};
    aggregated.forEach(r => {
      if (!summary[r.sloc]) {
        summary[r.sloc] = {
          rows: [],
          items: new Set<string>(),
          locations: new Set<string>(),
          totalQty: 0
        };
      }
      summary[r.sloc].rows.push(r);
      summary[r.sloc].items.add(r.itemCode);
      summary[r.sloc].locations.add(r.location);
      summary[r.sloc].totalQty += r.lastQty;
    });

    setSlocSummary(summary);
    setSelectedSlocs(new Set(Object.keys(summary)));
    setFormStep(3);
    showToast('File Retur Terbaca', `${parsedRaw.length} baris mentah diagregasi menjadi ${aggregated.length} baris unik (${Object.keys(summary).length} SLOC).`, 'success');
  };

  const handleSelectQtyChip = (col: string) => {
    setSelectedQtyCol(col);
    if (rawJsonCacheRef.current) {
      const { json, kLoc, kCode, kName, kSloc, kNo } = rawJsonCacheRef.current;
      applyReturAggregation(json, kLoc, kCode, kName, kSloc, kNo, col);
    }
  };

  // --- MB52 PROCESSOR ---
  const processMb52Data = (json: any[], fileName: string) => {
    const sample = json[0];
    const kMat = normKey(sample, ['Material']);
    const kDesc = normKey(sample, ['Material Description']);
    const kPlant = normKey(sample, ['Plant']);
    const kSloc = normKey(sample, ['Storage Location']);
    const kUnres = normKey(sample, ['Unrestricted']);
    const kTrans = normKey(sample, ['Transit and Transfer']);
    const kBlock = normKey(sample, ['Blocked']);

    const missing: string[] = [];
    if (!kMat) missing.push('Material');
    if (!kDesc) missing.push('Material Description');
    if (!kPlant) missing.push('Plant');
    if (!kSloc) missing.push('Storage Location');
    if (!kUnres) missing.push('Unrestricted');
    if (!kTrans) missing.push('Transit and Transfer');
    if (!kBlock) missing.push('Blocked');

    if (missing.length) {
      showToast('Kolom MB52 Tidak Lengkap', `Kolom wajib tidak ditemukan: ${missing.join(', ')}`, 'danger');
      return;
    }

    const parsed = json.map(r => {
      const material = String(r[kMat] ?? '').trim();
      const unrestricted = Number(r[kUnres]) || 0;
      const transit = Number(r[kTrans]) || 0;
      const blocked = Number(r[kBlock]) || 0;
      return {
        material,
        desc: String(r[kDesc] ?? '').trim(),
        plant: String(r[kPlant] ?? '').trim(),
        sloc: String(r[kSloc] ?? '').trim(),
        unrestricted,
        transit,
        blocked,
        lastQty: unrestricted + transit + blocked,
        group: material.toUpperCase().startsWith('FG') ? 'FG' : 'PACKAGING'
      };
    }).filter(r => r.sloc && r.material);

    if (!parsed.length) {
      showToast('Tidak Ada Baris Valid', 'Seluruh baris memiliki Material atau Storage Location kosong.', 'warning');
      return;
    }

    setRawRows(parsed);
    setFormFileName(fileName);

    // Agregasi Material + SLOC
    const map = new Map<string, any>();
    parsed.forEach(r => {
      const key = `${r.material}||${r.sloc}`;
      if (!map.has(key)) {
        map.set(key, {
          material: r.material,
          desc: r.desc,
          plant: r.plant,
          sloc: r.sloc,
          lastQty: 0,
          group: r.group,
          location: `${r.sloc}-${r.group}`
        });
      }
      map.get(key)!.lastQty += r.lastQty;
    });

    const aggregated = Array.from(map.values()).sort((a, b) => {
      if (a.sloc !== b.sloc) return a.sloc.localeCompare(b.sloc);
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.material.localeCompare(b.material);
    });
    setAggRows(aggregated);

    // Summary per SLOC (FG & PACKAGING breakdown)
    const summary: Record<string, any> = {};
    aggregated.forEach(r => {
      if (!summary[r.sloc]) {
        summary[r.sloc] = {
          rows: [],
          items: new Set<string>(),
          groups: {
            FG: { rows: [], totalQty: 0 },
            PACKAGING: { rows: [], totalQty: 0 }
          },
          totalQty: 0
        };
      }
      summary[r.sloc].rows.push(r);
      summary[r.sloc].items.add(r.material);
      summary[r.sloc].totalQty += r.lastQty;
      summary[r.sloc].groups[r.group].rows.push(r);
      summary[r.sloc].groups[r.group].totalQty += r.lastQty;
    });

    const grpCounts = { FG: { count: 0, plant: '' }, PACKAGING: { count: 0, plant: '' } };
    parsed.forEach(r => {
      if (r.group === 'FG') {
        grpCounts.FG.count++;
        if (!grpCounts.FG.plant && r.plant) grpCounts.FG.plant = r.plant;
      } else {
        grpCounts.PACKAGING.count++;
        if (!grpCounts.PACKAGING.plant && r.plant) grpCounts.PACKAGING.plant = r.plant;
      }
    });

    setMb52Groups(grpCounts);
    const firstPlant = parsed.find(r => r.plant)?.plant;
    if (firstPlant) setFormPlant(firstPlant);

    setSelectedQtyCol('Last Qty (Unrestricted+Transit+Blocked)');
    setSlocSummary(summary);
    setSelectedSlocs(new Set(Object.keys(summary)));
    setFormStep(3);

    showToast('File MB52 Terbaca', `${parsed.length} data stok berhasil diolah (FG: ${grpCounts.FG.count}, PACKAGING: ${grpCounts.PACKAGING.count}).`, 'success');
  };

  const toggleSlocSelection = (sloc: string) => {
    const next = new Set(selectedSlocs);
    if (next.has(sloc)) next.delete(sloc);
    else next.add(sloc);
    setSelectedSlocs(next);
  };

  // ============================================================
  //  MODUL 1: EXPORT EXCEL FORM SO
  // ============================================================
  const handleDownloadFormExcel = () => {
    if (selectedSlocs.size === 0) {
      showToast('Pilih SLOC', 'Pilih minimal satu SLOC untuk di-export.', 'warning');
      return;
    }

    const THIN = { style: 'thin', color: { rgb: '000000' } };
    const BOX = { top: THIN, bottom: THIN, left: THIN, right: THIN };
    const TOPONLY = { top: THIN };

    const stTitle = { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stDept = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stDocNo = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stMetaLbl = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'left', vertical: 'center' }, border: BOX };
    const stMetaVal = { font: { sz: 9 }, alignment: { horizontal: 'left', vertical: 'center' }, border: BOX };
    const stPicLbl = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stPicVal = { font: { sz: 9 }, alignment: { horizontal: 'left', vertical: 'center' }, border: BOX };
    const stBox = { border: BOX };
    const stTh = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stC = { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BOX };
    const stL = { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BOX };
    const stTotalLbl = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'right' }, border: BOX };
    const stSignLbl = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center' } };
    const stSignName = { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: TOPONLY };

    const numSt = (fmt = '#,##0') => ({ font: { sz: 9 }, alignment: { horizontal: 'right' }, border: BOX, numFmt: fmt });
    const totalNumSt = (fmt = '#,##0') => ({ font: { bold: true, sz: 9 }, alignment: { horizontal: 'right' }, border: BOX, numFmt: fmt });

    const cell = (v: any, t: string, s: any) => ({ v, t, s });
    const blankBox = () => cell('', 's', stBox);
    const blankNone = () => cell('', 's', {});

    const tglDisplay = formTgl ? fmtTglID(formTgl) : '';

    function buildSheetAOA(sloc: string, rows: any[], totalQty: number, qtyColLabel: string) {
      const aoa: any[][] = [];
      const merges: any[] = [];

      aoa.push([
        cell('FORMULIR STOCK OPNAME INTERNAL', 's', stTitle), blankBox(), blankBox(), blankBox(), blankBox(), blankBox(),
        cell('LOGISTIK DEPARTEMEN', 's', stDept), blankBox()
      ]);
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
      merges.push({ s: { r: 0, c: 6 }, e: { r: 0, c: 7 } });

      aoa.push([cell(formDocNo, 's', stDocNo), ...Array(7).fill(0).map(() => cell('', 's', stDocNo))]);
      merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });

      aoa.push([
        cell('Plant', 's', stMetaLbl), cell(formPlant, 's', stMetaVal), blankBox(),
        cell('PIC SO 1', 's', stPicLbl), cell(formPic1, 's', stPicVal), blankBox(), blankBox(), blankBox()
      ]);

      aoa.push([
        cell('SLoc', 's', stMetaLbl), cell(sloc, 's', stMetaVal), blankBox(),
        cell('PIC SO 2', 's', stPicLbl), cell(formPic2, 's', stPicVal), blankBox(), blankBox(), blankBox()
      ]);

      aoa.push([
        cell('Tgl', 's', stMetaLbl), cell(tglDisplay, 's', stMetaVal), blankBox(), blankBox(), blankBox(), blankBox(), blankBox(), blankBox()
      ]);

      aoa.push([
        cell('Area', 's', stMetaLbl), cell(formArea, 's', stMetaVal), blankBox(), blankBox(), blankBox(), blankBox(), blankBox(), blankBox()
      ]);

      aoa.push([]);

      aoa.push(['NO', 'Location', 'Item Code', 'Item Name', 'Sloc', qtyColLabel, 'Fisik', 'Keterangan'].map(h => cell(h, 's', stTh)));

      let running = 0;
      rows.forEach(r => {
        running++;
        aoa.push([
          cell(running, 'n', stC),
          cell(r.location !== undefined ? r.location : '', 's', stL),
          cell(r.itemCode !== undefined ? r.itemCode : r.material, 's', stL),
          cell(r.itemName !== undefined ? r.itemName : r.desc, 's', stL),
          cell(r.sloc, 's', stC),
          cell(r.lastQty, 'n', numSt()),
          blankBox(),
          blankBox()
        ]);
      });

      const rTotal = aoa.length;
      aoa.push([
        cell('Total', 's', stTotalLbl), blankBox(), blankBox(), blankBox(), blankBox(),
        cell(totalQty, 'n', totalNumSt()),
        blankBox(), blankBox()
      ]);
      merges.push({ s: { r: rTotal, c: 0 }, e: { r: rTotal, c: 4 } });

      aoa.push([]);

      const rSignLbl = aoa.length;
      aoa.push([
        cell('Pelaksana', 's', stSignLbl), blankNone(), blankNone(),
        cell('Mengetahui', 's', stSignLbl), blankNone(), blankNone(),
        cell('Menyetujui', 's', stSignLbl), blankNone()
      ]);
      merges.push({ s: { r: rSignLbl, c: 0 }, e: { r: rSignLbl, c: 2 } });
      merges.push({ s: { r: rSignLbl, c: 3 }, e: { r: rSignLbl, c: 5 } });
      merges.push({ s: { r: rSignLbl, c: 6 }, e: { r: rSignLbl, c: 7 } });

      aoa.push([]); aoa.push([]); aoa.push([]);

      const rSignName = aoa.length;
      aoa.push([
        cell('Inventory', 's', stSignName), cell('', 's', stSignName), cell('', 's', stSignName),
        cell('SPv Log Distribusi', 's', stSignName), cell('', 's', stSignName), cell('', 's', stSignName),
        cell('Manager Log Distribusi', 's', stSignName), cell('', 's', stSignName)
      ]);
      merges.push({ s: { r: rSignName, c: 0 }, e: { r: rSignName, c: 2 } });
      merges.push({ s: { r: rSignName, c: 3 }, e: { r: rSignName, c: 5 } });
      merges.push({ s: { r: rSignName, c: 6 }, e: { r: rSignName, c: 7 } });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
      ws['!merges'] = merges;
      return ws;
    }

    const wb = XLSX.utils.book_new();
    const slocsSorted: string[] = Array.from<string>(selectedSlocs).sort();
    const usedSheetNames = new Set<string>();

    function appendSheetUnique(ws: any, baseName: string) {
      let name = baseName.substring(0, 31);
      let i = 2;
      while (usedSheetNames.has(name)) {
        name = (baseName + '_' + i).substring(0, 31);
        i++;
      }
      usedSheetNames.add(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    if (uploadFormat === 'mb52') {
      slocsSorted.forEach(sloc => {
        const s = slocSummary[sloc];
        if (!s) return;
        ['FG', 'PACKAGING'].forEach(grp => {
          const gRows = s.groups[grp]?.rows || [];
          if (!gRows.length) return;
          const ws = buildSheetAOA(sloc, gRows, s.groups[grp].totalQty, 'Last Qty');
          appendSheetUnique(ws, `${sloc}-${grp}`);
        });
      });
    } else {
      slocsSorted.forEach(sloc => {
        const sData = slocSummary[sloc];
        if (!sData) return;
        const ws = buildSheetAOA(sloc, sData.rows, sData.totalQty, selectedQtyCol);
        appendSheetUnique(ws, sloc);
      });
    }

    XLSX.writeFile(wb, `FormSO_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Download Sukses', 'File Form SO Excel berhasil diunduh.', 'success');
  };

  // ============================================================
  //  MODUL 2: FILE PARSER & JOIN BERITA ACARA
  // ============================================================
  const handleSapFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSapFile(file);
    e.target.value = '';
  };

  const processSapFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (!json.length) {
          showToast('File SAP Kosong', 'Tidak ada data di sheet pertama file SAP.', 'warning');
          return;
        }

        const sample = json[0];
        const kSloc = normKey(sample, ['Storage Location', 'Sloc', 'SLOC', 'sloc', 'StorageLoc']);
        const kMat = normKey(sample, ['Material', 'material', 'Item Code']);
        const kDesc = normKey(sample, ['Material Description', 'Material Desc', 'Item Name', 'Description']);
        const kBun = normKey(sample, ['Base Unit of Measure', 'Base Unit', 'Bun', 'UOM', 'Unit', 'Satuan']);
        const kUnres = normKey(sample, ['Unrestricted', 'unrestricted', 'Unrestr.']);
        const kTrans = normKey(sample, ['Transit and Transfer', 'Transit & Transfer', 'Transit', 'InTransit', 'transit']);
        const kBlock = normKey(sample, ['Blocked', 'blocked', 'Blocked Stock']);

        if (!kSloc || !kMat) {
          showToast('Header SAP Tidak Sesuai', 'Kolom Storage Location & Material wajib ada.', 'danger');
          return;
        }

        const parsed = json.map(r => {
          const unrestricted = Number(r[kUnres || '']) || 0;
          const transit = Number(r[kTrans || '']) || 0;
          const blocked = Number(r[kBlock || '']) || 0;
          return {
            sloc: String(r[kSloc] ?? '').trim(),
            material: String(r[kMat] ?? '').trim(),
            desc: String(r[kDesc || ''] ?? '').trim(),
            bun: String(r[kBun || ''] ?? '').trim(),
            unrestricted,
            transit,
            blocked,
            sapQty: unrestricted + transit + blocked
          };
        }).filter(r => r.sloc && r.material);

        setSapData(parsed);
        setSapFileName(file.name);
        showToast('SAP Dimuat', `${parsed.length} baris data SAP berhasil dimuat.`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast('Gagal Membaca SAP', err.message || 'Format file SAP tidak valid.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSoMultiSheetFile(file);
    e.target.value = '';
  };

  const processSoMultiSheetFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const allRows: any[] = [];
        let detectedHeaders: string[] | null = null;
        const sheetResults: string[] = [];

        const HEADER_KEYWORDS = ['no', 'location', 'item code', 'item name', 'material', 'sloc', 'fisik', 'keterangan', 'ket', 'last qty', 'qty'];
        const MIN_KEYWORD_MATCH = 3;

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
          if (!aoa.length) return;

          let headerRowIdx = -1;
          let headers: string[] = [];
          for (let i = 0; i < Math.min(aoa.length, 20); i++) {
            const row = aoa[i] || [];
            const rowStr = row.map(v => String(v || '').trim().toLowerCase());
            const matchCount = rowStr.filter(v => HEADER_KEYWORDS.some(kw => v === kw || v.includes(kw))).length;
            if (matchCount >= MIN_KEYWORD_MATCH) {
              headerRowIdx = i;
              headers = row.map(v => String(v || '').trim());
              break;
            }
          }
          if (headerRowIdx < 0) return;

          if (!detectedHeaders) detectedHeaders = headers;

          let sheetRows = 0;
          let blankStreak = 0;
          for (let i = headerRowIdx + 1; i < aoa.length; i++) {
            const row = aoa[i] || [];
            const allEmpty = row.every(v => String(v || '').trim() === '');
            if (allEmpty) {
              blankStreak++;
              if (blankStreak >= 3) break;
              continue;
            }
            blankStreak = 0;
            const obj: Record<string, any> = {};
            headers.forEach((h, idx) => {
              obj[h] = row[idx] !== undefined ? row[idx] : '';
            });
            obj['__sheet'] = sheetName;
            allRows.push(obj);
            sheetRows++;
          }
          sheetResults.push(`${sheetName}: ${sheetRows} baris`);
        });

        if (!allRows.length) {
          showToast('Data Form Tidak Ditemukan', 'Tidak ditemukan baris tabel data di semua sheet.', 'danger');
          return;
        }

        setSoRawJson(allRows);
        setSoFileName(file.name);
        setSheetResultsSummary(sheetResults.join(' | '));

        const sample = allRows[0];
        const kMat = normKey(sample, ['Item Code', 'Material', 'material', 'item code']);
        const kSloc = normKey(sample, ['Sloc', 'SLOC', 'sloc', 'Storage Location']);
        const kDesc = normKey(sample, ['Item Name', 'Material Description', 'item name']);

        if (!kMat || !kSloc) {
          showToast('Header Kolom Kurang', `Kolom Item Code / SLoc tidak ditemukan. Header: ${Object.keys(sample).join(', ')}`, 'danger');
          return;
        }

        let kFisik = normKey(sample, ['Fisik', 'fisik', 'FISIK', 'Physical', 'Qty Fisik', 'Qty fisik']);
        const numCols = Object.keys(sample).filter(k => {
          const lk = k.trim().toLowerCase();
          if (['no', 'sloc', 'material', 'item code', 'item name', 'location', 'bun', 'keterangan', 'ket', 'last qty', 'sap', 'storage location', '__sheet'].includes(lk)) return false;
          const vals = allRows.slice(0, 15).map(r => r[k]).filter(v => String(v || '').trim() !== '');
          return vals.some(v => !isNaN(Number(v)));
        });

        if (!kFisik && numCols.length) kFisik = numCols[0];
        setSoNumCols(numCols);
        setSoFisikCol(kFisik || null);

        const parsed = allRows.map(r => ({
          material: String(r[kMat] ?? '').trim(),
          sloc: String(r[kSloc] ?? '').trim(),
          desc: kDesc ? String(r[kDesc] ?? '').trim() : '',
          fisik: kFisik ? (Number(r[kFisik]) || 0) : 0
        })).filter(r => r.material && r.sloc);

        setSoData(parsed);
        showToast('Form SO Terisi Dimuat', `${parsed.length} baris dari ${sheetResults.length} sheet berhasil dimuat.`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast('Gagal Membaca Form SO', err.message || 'Terjadi kesalahan membaca file.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSelectSoFisikCol = (col: string) => {
    setSoFisikCol(col);
    if (!soRawJson) return;
    const sample = soRawJson[0];
    const kMat = normKey(sample, ['Item Code', 'Material', 'material', 'item code']) || 'material';
    const kSloc = normKey(sample, ['Sloc', 'SLOC', 'sloc', 'Storage Location']) || 'sloc';
    const kDesc = normKey(sample, ['Item Name', 'Material Description', 'item name']);

    const parsed = soRawJson.map(r => ({
      material: String(r[kMat] ?? '').trim(),
      sloc: String(r[kSloc] ?? '').trim(),
      desc: kDesc ? String(r[kDesc] ?? '').trim() : '',
      fisik: Number(r[col]) || 0
    })).filter(r => r.material && r.sloc);

    setSoData(parsed);
  };

  const handleExecuteJoin = () => {
    if (!sapData || !soData) {
      showToast('File Belum Lengkap', 'Upload kedua file (File SAP dan Form SO Terisi) sebelum melakukan JOIN.', 'warning');
      return;
    }

    const soMap = new Map<string, any>();
    soData.forEach(r => {
      const key = `${r.material.toLowerCase()}||${r.sloc.toLowerCase()}`;
      if (soMap.has(key)) {
        soMap.get(key)!.fisik += r.fisik;
      } else {
        soMap.set(key, { ...r });
      }
    });

    let no = 0;
    const unmatched: string[] = [];
    const joined = sapData.map(r => {
      const key = `${r.material.toLowerCase()}||${r.sloc.toLowerCase()}`;
      const soRow = soMap.get(key);
      const fisik = soRow ? soRow.fisik : 0;
      // Formula CKBLogistik: Selisih = Fisik - SAP
      const selisih = fisik - r.sapQty;

      if (!soRow) unmatched.push(`${r.material} / ${r.sloc}`);
      no++;
      return {
        no,
        sloc: r.sloc,
        material: r.material,
        desc: r.desc || (soRow ? soRow.desc : ''),
        bun: r.bun,
        sapQty: r.sapQty,
        unrestricted: r.unrestricted,
        transit: r.transit,
        blocked: r.blocked,
        fisik,
        selisih,
        ket: ''
      };
    });

    setJoinedRows(joined);
    setUnmatchedList(unmatched);
    setBaStep(3);
    showToast('JOIN Selesai', `${joined.length} item berhasil direkonsiliasi.`, 'success');
  };

  // ============================================================
  //  MODUL 2: EXPORT EXCEL BERITA ACARA
  // ============================================================
  const getCompiledNarasi = () => {
    const tglStr = baTgl ? fmtTglID(baTgl) : '[TGL]';
    return baNarasi.replace(/\[TGL\]/g, tglStr);
  };

  const handleDownloadBaExcel = () => {
    if (!joinedRows.length) {
      showToast('Belum Ada Data JOIN', 'Lakukan proses JOIN terlebih dahulu.', 'warning');
      return;
    }

    const narasi = getCompiledNarasi();

    const THIN = { style: 'thin', color: { rgb: '000000' } };
    const BOX = { top: THIN, bottom: THIN, left: THIN, right: THIN };
    const TOPONLY = { top: THIN };

    const stTitle = { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stDept = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stBox = { border: BOX };
    const stNarasi = { font: { sz: 9 }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true }, border: BOX };
    const stTh = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center', vertical: 'center' }, border: BOX };
    const stC = { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: BOX };
    const stL = { font: { sz: 9 }, alignment: { horizontal: 'left' }, border: BOX };
    const stTotalLbl = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'right' }, border: BOX };
    const stSignLbl = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center' } };
    const stSignName = { font: { sz: 9 }, alignment: { horizontal: 'center' }, border: TOPONLY };

    const numSt = (fmt = '#,##0') => ({ font: { sz: 9 }, alignment: { horizontal: 'right' }, border: BOX, numFmt: fmt });
    const totalNumSt = (fmt = '#,##0') => ({ font: { bold: true, sz: 9 }, alignment: { horizontal: 'right' }, border: BOX, numFmt: fmt });
    const selisihSt = (val: number, bold = false) => ({
      font: { sz: 9, bold: bold || val !== 0, color: { rgb: val > 0 ? '1F9D55' : val < 0 ? 'C0392B' : '000000' } },
      alignment: { horizontal: 'right' },
      border: BOX,
      numFmt: '+#,##0;-#,##0;0'
    });

    const cell = (v: any, t: string, s: any) => ({ v, t, s });
    const blankBox = () => cell('', 's', stBox);
    const blankNone = () => cell('', 's', {});

    const aoa: any[][] = [];
    const merges: any[] = [];

    // Header 0
    aoa.push([
      blankBox(), blankBox(),
      cell('BERITA ACARA STOCK OPNAME', 's', stTitle), blankBox(), blankBox(), blankBox(),
      cell('LOGISTIK DEPARTEMEN', 's', stDept), blankBox(), blankBox()
    ]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 5 } });
    merges.push({ s: { r: 0, c: 6 }, e: { r: 0, c: 8 } });

    // Narasi 1
    aoa.push([cell(narasi, 's', stNarasi), ...Array(8).fill(0).map(() => cell('', 's', stNarasi))]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });

    // Table Header 2
    aoa.push(['NO', 'Sloc', 'Material', 'Material Description', 'Bun', 'SAP', 'Fisik', 'Selisih', 'Keterangan'].map(h => cell(h, 's', stTh)));

    // Data rows
    joinedRows.forEach(rw => {
      aoa.push([
        cell(rw.no, 'n', stC),
        cell(rw.sloc, 's', stC),
        cell(rw.material, 's', stL),
        cell(rw.desc, 's', stL),
        cell(rw.bun, 's', stC),
        cell(rw.sapQty, 'n', numSt()),
        cell(rw.fisik, 'n', numSt()),
        cell(rw.selisih, 'n', selisihSt(rw.selisih)),
        cell(rw.ket, 's', stL)
      ]);
    });

    // Total row
    const totSAP = joinedRows.reduce((s, x) => s + x.sapQty, 0);
    const totFisik = joinedRows.reduce((s, x) => s + x.fisik, 0);
    const totSel = joinedRows.reduce((s, x) => s + x.selisih, 0);
    const rTotal = aoa.length;
    aoa.push([
      cell('Total', 's', stTotalLbl), blankBox(), blankBox(), blankBox(), blankBox(),
      cell(totSAP, 'n', totalNumSt()),
      cell(totFisik, 'n', totalNumSt()),
      cell(totSel, 'n', selisihSt(totSel, true)),
      blankBox()
    ]);
    merges.push({ s: { r: rTotal, c: 0 }, e: { r: rTotal, c: 4 } });

    aoa.push([]);

    // Signatures
    const rSignLbl = aoa.length;
    aoa.push([
      cell('Pelaksana', 's', stSignLbl), blankNone(), blankNone(),
      cell('Mengetahui', 's', stSignLbl), blankNone(), blankNone(),
      cell('Menyetujui', 's', stSignLbl), blankNone(), blankNone()
    ]);
    merges.push({ s: { r: rSignLbl, c: 0 }, e: { r: rSignLbl, c: 2 } });
    merges.push({ s: { r: rSignLbl, c: 3 }, e: { r: rSignLbl, c: 5 } });
    merges.push({ s: { r: rSignLbl, c: 6 }, e: { r: rSignLbl, c: 8 } });

    aoa.push([]); aoa.push([]); aoa.push([]);

    const rSignName = aoa.length;
    aoa.push([
      cell('Inventory', 's', stSignName), cell('', 's', stSignName), cell('', 's', stSignName),
      cell('SPv Log Distribusi', 's', stSignName), cell('', 's', stSignName), cell('', 's', stSignName),
      cell('Manager Log Distribusi', 's', stSignName), cell('', 's', stSignName), cell('', 's', stSignName)
    ]);
    merges.push({ s: { r: rSignName, c: 0 }, e: { r: rSignName, c: 2 } });
    merges.push({ s: { r: rSignName, c: 3 }, e: { r: rSignName, c: 5 } });
    merges.push({ s: { r: rSignName, c: 6 }, e: { r: rSignName, c: 8 } });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 5 }, { wch: 8 }, { wch: 16 }, { wch: 38 }, { wch: 6 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 20 }];
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Berita Acara');
    XLSX.writeFile(wb, `BA_StockOpname_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Download Sukses', 'File Berita Acara Excel berhasil diunduh.', 'success');
  };

  // Filtered rows for BA preview
  const filteredJoinedRows = useMemo(() => {
    if (!baSearch.trim()) return joinedRows;
    const q = baSearch.toLowerCase();
    return joinedRows.filter(r => 
      r.material.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      r.sloc.toLowerCase().includes(q)
    );
  }, [joinedRows, baSearch]);

  const baStats = useMemo(() => {
    const totalSAP = joinedRows.reduce((s, r) => s + r.sapQty, 0);
    const totalFisik = joinedRows.reduce((s, r) => s + r.fisik, 0);
    const totalSelisih = joinedRows.reduce((s, r) => s + r.selisih, 0);
    const berselisih = joinedRows.filter(r => r.selisih !== 0).length;
    return { totalSAP, totalFisik, totalSelisih, berselisih };
  }, [joinedRows]);

  return (
    <div className="space-y-5 animate-fade-in text-slate-800">
      {/* Top Application Header / Brand Bar - Minimalist Blue, Orange, White */}
      <div className="bg-white text-slate-900 p-4 sm:p-4.5 rounded-2xl shadow-2xs border border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold tracking-wider text-xs shadow-2xs">
            SO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase m-0 leading-tight text-blue-900">
                SUITE STOCK OPNAME
              </h2>
              <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                v{APP_METADATA.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {APP_METADATA.company} · Generator Form Hitung Fisik & Berita Acara Rekonsiliasi SAP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600">
          <Clock size={13} className="text-orange-500" />
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90">
        <button
          type="button"
          onClick={() => setCurrentRoute('form')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            currentRoute === 'form' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText size={15} />
          <span>Tahap 1: Generator Form SO</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentRoute('ba')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            currentRoute === 'ba' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Tahap 2: Generator Berita Acara</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. MODUL 1: GENERATOR FORM SO VIEW */}
      {/* ============================================================ */}
      {currentRoute === 'form' && (
        <div className="space-y-5">
          {/* Format Selector Toggle (Retur vs MB52) */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-2xl w-max border border-slate-300/80">
            <button
              type="button"
              onClick={() => handleFormatChange('retur')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                uploadFormat === 'retur' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <RotateCcw size={14} />
              <span>Data Retur</span>
            </button>

            <button
              type="button"
              onClick={() => handleFormatChange('mb52')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                uploadFormat === 'mb52' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/60'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Data MB52 SAP</span>
            </button>
          </div>

          {/* Panel 1: Upload File */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-red-100 text-red-600 font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">
                    Upload File {uploadFormat === 'retur' ? 'Retur' : 'MB52 SAP'}
                  </h3>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    {uploadFormat === 'retur'
                      ? 'Format .xlsx hasil export sistem (Kolom: Location, Item Code, Item Name, SLOC)'
                      : 'Export MB52 SAP (Kolom: Material, Material Description, Plant, Storage Location, Unrestricted, Transit, Blocked)'}
                  </p>
                </div>
              </div>

              {formFileName && (
                <button
                  type="button"
                  onClick={resetFormModule}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset Form</span>
                </button>
              )}
            </div>

            {/* Dropzone Box */}
            <label className="border-2 border-dashed border-slate-300 hover:border-red-500 bg-slate-50 hover:bg-red-50/30 transition-all rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-red-100 text-slate-500 group-hover:text-red-600 flex items-center justify-center shadow-xs mb-3 transition-colors">
                <Upload size={22} />
              </div>
              <strong className="text-sm font-bold text-slate-800 group-hover:text-red-700">
                {formFileName ? `File Terpilih: ${formFileName}` : `Klik atau Seret file ${uploadFormat === 'retur' ? 'retur.xlsx' : 'MB52.xlsx'} ke sini`}
              </strong>
              <span className="text-xs text-slate-500 mt-1">
                {uploadFormat === 'retur'
                  ? 'Kolom kuantitas dapat dipilih setelah file terbaca'
                  : 'Last Qty otomatis = Unrestricted + Transit and Transfer + Blocked'}
              </span>
              <div className="mt-3 bg-slate-800 text-white font-mono text-[10px] px-3 py-1 rounded-md font-semibold">
                {uploadFormat === 'retur' ? 'Location · Item Code · Item Name · SLOC' : 'Material · Storage Location · Unrestricted · Transit · Blocked'}
              </div>
              <input type="file" accept=".xlsx, .xls" onChange={handleFormFileUpload} className="hidden" />
            </label>

            {/* Chip Qty Selector for Retur */}
            {uploadFormat === 'retur' && numericCols.length > 0 && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                  Pilih Kolom Qty yang Ditampilkan di Form:
                </span>
                <div className="flex flex-wrap gap-2">
                  {numericCols.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleSelectQtyChip(col)}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedQtyCol === col
                          ? 'bg-blue-900 text-white border-blue-950 shadow-xs'
                          : 'bg-white text-blue-900 border-blue-300 hover:border-blue-500'
                      }`}
                    >
                      {selectedQtyCol === col && <Check size={13} />}
                      <span>{col}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: Pilih SLOC */}
          {Object.keys(slocSummary).length > 0 && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-red-100 text-red-600 font-mono font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 m-0">Pilih Storage Location (SLOC)</h3>
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                      Setiap SLOC akan dibuatkan lembar form terpisah. Anda dapat memilih beberapa SLOC sekaligus.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlocs(new Set(Object.keys(slocSummary)))}
                    className="text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                  >
                    Pilih Semua ({Object.keys(slocSummary).length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSlocs(new Set())}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              {/* SLoc Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(slocSummary).sort().map(sloc => {
                  const s = slocSummary[sloc];
                  const isSelected = selectedSlocs.has(sloc);
                  return (
                    <div
                      key={sloc}
                      onClick={() => toggleSlocSelection(sloc)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-red-50/50 border-red-500 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>

                      <div className="font-mono text-base font-bold text-slate-900 mb-1">
                        {sloc}
                      </div>

                      <div className="text-[11px] text-slate-600 leading-relaxed">
                        {uploadFormat === 'mb52' ? (
                          <>
                            <div>{s.rows.length} baris · {s.items.size} material</div>
                            <div className="text-blue-900 font-semibold mt-0.5">
                              FG: {s.groups.FG.rows.length} · PK: {s.groups.PACKAGING.rows.length}
                            </div>
                            <div className="font-bold text-slate-800 mt-1">
                              Total Qty: {s.totalQty.toLocaleString('id-ID')}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>{s.rows.length} baris · {s.items.size} item · {s.locations.size} lokasi</div>
                            <div className="font-bold text-slate-800 mt-1">
                              Total Qty: {s.totalQty.toLocaleString('id-ID')}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Panel 3: Lengkapi Keterangan & Form Parameters */}
          {Object.keys(slocSummary).length > 0 && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-red-100 text-red-600 font-mono font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">Lengkapi Keterangan Form</h3>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Data ini akan tercetak di bagian kop dokumen form hitung fisik.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Dokumen:</label>
                  <input
                    type="text"
                    value={formDocNo}
                    onChange={(e) => setFormDocNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plant:</label>
                  <input
                    type="text"
                    value={formPlant}
                    onChange={(e) => setFormPlant(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Area:</label>
                  <input
                    type="text"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pelaksanaan:</label>
                  <input
                    type="date"
                    value={formTgl}
                    onChange={(e) => setFormTgl(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIC SO 1 (Pelaksana):</label>
                  <input
                    type="text"
                    value={formPic1}
                    onChange={(e) => setFormPic1(e.target.value)}
                    placeholder="Nama PIC SO 1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIC SO 2 (Pelaksana):</label>
                  <input
                    type="text"
                    value={formPic2}
                    onChange={(e) => setFormPic2(e.target.value)}
                    placeholder="Nama PIC SO 2"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ukuran Kertas Print:</label>
                  <select
                    value={formPaperSize}
                    onChange={(e) => setFormPaperSize(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">Letter (216 × 279 mm)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadFormExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Download size={15} />
                  <span>Download Excel Form SO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode('form')}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Eye size={15} />
                  <span>Pratinjau & Cetak PDF ({selectedSlocs.size} SLOC)</span>
                </button>

                <button
                  type="button"
                  onClick={resetFormModule}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Mulai Ulang
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODUL 2: GENERATOR BERITA ACARA VIEW */}
      {/* ============================================================ */}
      {currentRoute === 'ba' && (
        <div className="space-y-5">
          {/* Panel 1: Upload 2 File (SAP & Form SO) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">Upload File Rekonsiliasi</h3>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Upload File SAP (MB52) dan Form SO yang sudah terisi fisik (multi-sheet didukung).
                  </p>
                </div>
              </div>

              {(sapFileName || soFileName) && (
                <button
                  type="button"
                  onClick={resetBaModule}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset BA</span>
                </button>
              )}
            </div>

            {/* Grid 2 Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: File SAP */}
              <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                sapData ? 'bg-emerald-50/40 border-emerald-500' : 'bg-slate-50 border-dashed border-slate-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      1. File Data SAP (.xlsx)
                    </span>
                    {sapData && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 m-0 mb-3">
                    Export MB52 dari sistem SAP (Material, SLoc, Unrestricted, Transit, Blocked).
                  </p>

                  <div className="bg-slate-900 text-white font-mono text-[10px] p-2 rounded-lg mb-3">
                    SAP Qty = Unrestricted + Transit and Transfer + Blocked
                  </div>

                  {sapFileName && (
                    <div className="text-xs font-bold font-mono text-emerald-800 mb-3">
                      ✓ {sapFileName} ({sapData?.length} baris)
                    </div>
                  )}
                </div>

                <label className="w-full py-2.5 px-3 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={14} />
                  <span>{sapData ? 'Ganti File SAP' : 'Pilih File SAP'}</span>
                  <input type="file" accept=".xlsx, .xls" onChange={handleSapFileUpload} className="hidden" />
                </label>
              </div>

              {/* Card 2: Form SO Terisi */}
              <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                soData ? 'bg-emerald-50/40 border-emerald-500' : 'bg-slate-50 border-dashed border-slate-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      2. Form SO Terisi Fisik (.xlsx)
                    </span>
                    {soData && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 m-0 mb-3">
                    Hasil export Generator Form SO (Mendukung multi-sheet otomatis).
                  </p>

                  <div className="bg-slate-900 text-white font-mono text-[10px] p-2 rounded-lg mb-3">
                    Kolom Wajib: Item Code · SLoc · Fisik
                  </div>

                  {soFileName && (
                    <div className="text-xs font-bold font-mono text-emerald-800 mb-2">
                      ✓ {soFileName} ({soData?.length} baris)
                    </div>
                  )}

                  {/* Fisik Chip Selector */}
                  {soNumCols.length > 1 && (
                    <div className="mb-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Pilih Kolom Fisik:</span>
                      <div className="flex flex-wrap gap-1">
                        {soNumCols.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleSelectSoFisikCol(c)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                              soFisikCol === c ? 'bg-blue-900 text-white border-blue-950' : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <label className="w-full py-2.5 px-3 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={14} />
                  <span>{soData ? 'Ganti Form SO' : 'Pilih Form SO Terisi'}</span>
                  <input type="file" accept=".xlsx, .xls" onChange={handleSoFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* JOIN Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!sapData || !soData}
                onClick={handleExecuteJoin}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                  sapData && soData
                    ? 'bg-blue-900 hover:bg-blue-950 text-white active:scale-98'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw size={15} />
                <span>JOIN & Proses Rekonsiliasi Data</span>
              </button>
            </div>
          </div>

          {/* Panel 2: Hasil JOIN & Preview Table */}
          {joinedRows.length > 0 && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-mono font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">Hasil JOIN & Rekonsiliasi Selisih</h3>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Data siap dicetak ke format resmi Berita Acara Stock Opname.
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Item</div>
                  <div className="text-lg font-black font-mono text-slate-900">{joinedRows.length}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total SAP</div>
                  <div className="text-lg font-black font-mono text-slate-900">{baStats.totalSAP.toLocaleString('id-ID')}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Fisik</div>
                  <div className="text-lg font-black font-mono text-slate-900">{baStats.totalFisik.toLocaleString('id-ID')}</div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  baStats.totalSelisih !== 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <div className="text-[10px] uppercase font-bold">Total Selisih</div>
                  <div className="text-lg font-black font-mono">
                    {baStats.totalSelisih > 0 ? `+${baStats.totalSelisih.toLocaleString('id-ID')}` : baStats.totalSelisih.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  baStats.berselisih > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <div className="text-[10px] uppercase font-bold">Item Selisih</div>
                  <div className="text-lg font-black font-mono">{baStats.berselisih}</div>
                </div>
              </div>

              {/* Unmatched Warning */}
              {unmatchedList.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                  <strong>Perhatian:</strong> Terdapat <b>{unmatchedList.length}</b> item SAP yang tidak ditemukan di Form SO (Kuantitas fisik diisi 0):
                  <div className="text-[11px] font-mono mt-1 text-amber-800">
                    {unmatchedList.slice(0, 5).join(', ')}{unmatchedList.length > 5 ? '…' : ''}
                  </div>
                </div>
              )}

              {/* Search Bar & Admin Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={baSearch}
                    onChange={(e) => setBaSearch(e.target.value)}
                    placeholder="Cari Material, Deskripsi, atau SLoc..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleClearAllBa}
                    disabled={joinedRows.length === 0}
                    className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Khusus Admin: Kosongkan tabel rekonsiliasi"
                  >
                    <Trash2 size={14} />
                    <span>Reset Tabel Rekonsiliasi</span>
                  </button>
                )}
              </div>

              {/* Admin Bulk Action Banner */}
              {isAdmin && selectedBaNos.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-red-50 border-2 border-red-200 rounded-xl animate-in fade-in duration-150 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse shrink-0"></span>
                    <div>
                      <span className="text-xs font-black text-red-950 uppercase tracking-wide">
                        Mode Admin: {selectedBaNos.length} Dari {filteredJoinedRows.length} Baris Dipilih
                      </span>
                      <p className="text-[11px] text-red-700 font-medium m-0">
                        Hapus baris hasil rekonsiliasi terpilih sekaligus.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedBaNos([])}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-2xs"
                    >
                      Batal Pilihan
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDeleteBa}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span>Hapus Massal Terpilih ({selectedBaNos.length})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Table Preview */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold sticky top-0">
                    <tr>
                      {isAdmin && (
                        <th className="p-2 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredJoinedRows.length > 0 && selectedBaNos.length === filteredJoinedRows.length}
                            onChange={() => handleToggleSelectAllBa(filteredJoinedRows.map(r => r.no))}
                            title="Pilih Semua (Admin)"
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                          />
                        </th>
                      )}
                      <th className="p-2 w-10 text-center">NO</th>
                      <th className="p-2 w-16 text-center">SLoc</th>
                      <th className="p-2 w-28">Material</th>
                      <th className="p-2 min-w-[200px]">Material Description</th>
                      <th className="p-2 w-14 text-center">Bun</th>
                      <th className="p-2 w-20 text-right">SAP</th>
                      <th className="p-2 w-20 text-right">Fisik</th>
                      <th className="p-2 w-20 text-right">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredJoinedRows.slice(0, 100).map(r => {
                      const isSelected = selectedBaNos.includes(r.no);
                      return (
                        <tr key={r.no} className={`transition-colors ${isSelected ? 'bg-red-50/70 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                          {isAdmin && (
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectBa(r.no)}
                                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                                title="Pilih baris"
                              />
                            </td>
                          )}
                          <td className="p-2 text-center text-slate-400">{r.no}</td>
                          <td className="p-2 text-center font-bold text-blue-900">{r.sloc}</td>
                          <td className="p-2">{r.material}</td>
                          <td className="p-2 font-sans">{r.desc}</td>
                          <td className="p-2 text-center text-slate-500">{r.bun}</td>
                          <td className="p-2 text-right">{r.sapQty.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right">{r.fisik.toLocaleString('id-ID')}</td>
                          <td className={`p-2 text-right font-bold ${
                            r.selisih > 0 ? 'text-emerald-600' : r.selisih < 0 ? 'text-red-600' : 'text-slate-400'
                          }`}>
                            {r.selisih > 0 ? `+${r.selisih.toLocaleString('id-ID')}` : r.selisih.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Menampilkan {Math.min(100, filteredJoinedRows.length)} dari {filteredJoinedRows.length} baris hasil rekonsiliasi.
              </div>
            </div>
          )}

          {/* Panel 3: Keterangan Berita Acara & Action */}
          {joinedRows.length > 0 && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 font-mono font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">Keterangan Berita Acara</h3>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Narasi pembuka dan informasi penandatanganan dokumen BA.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Narasi / Kalimat Pembuka:</label>
                  <textarea
                    rows={3}
                    value={baNarasi}
                    onChange={(e) => setBaNarasi(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-sans"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    *Token <code>[TGL]</code> akan otomatis diganti dengan format tanggal resmi saat diexport/dicetak.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal BA:</label>
                    <input
                      type="date"
                      value={baTgl}
                      onChange={(e) => setBaTgl(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Gudang / Lokasi:</label>
                    <input
                      type="text"
                      value={baGudang}
                      onChange={(e) => setBaGudang(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ukuran Kertas:</label>
                    <select
                      value={baPaperSize}
                      onChange={(e) => setBaPaperSize(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">Letter (216 × 279 mm)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadBaExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Download size={15} />
                  <span>Download Excel Berita Acara</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode('ba')}
                  className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Eye size={15} />
                  <span>Pratinjau & Cetak PDF ({joinedRows.length} Item)</span>
                </button>

                <button
                  type="button"
                  onClick={resetBaModule}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Mulai Ulang
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL PRATINJAU & PRINT FULLSCREEN (FORM SO & BERITA ACARA) */}
      {/* ============================================================ */}
      {previewMode !== 'none' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xs flex flex-col overflow-hidden animate-fade-in text-black">
          {/* Topbar Action */}
          <div className="bg-slate-900 text-white p-3.5 px-6 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {previewMode === 'form' ? 'Pratinjau Form Hitung Stock Opname' : 'Pratinjau Berita Acara Stock Opname'}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                {previewMode === 'form' ? `${selectedSlocs.size} SLOC · ${formPaperSize}` : `${joinedRows.length} Item · ${baPaperSize}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode('none')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Kembali Edit</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Scrollable Printable Pages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200">
            <div className="max-w-4xl mx-auto space-y-8 print:space-y-0">
              {/* PRINT VIEW FORM SO */}
              {previewMode === 'form' && (
                <>
                  {Array.from<string>(selectedSlocs).sort().map(sloc => {
                    const s = slocSummary[sloc];
                    if (!s) return null;

                    const groupsToRender = uploadFormat === 'mb52' 
                      ? ['FG', 'PACKAGING'].filter(g => (s.groups[g]?.rows || []).length > 0)
                      : ['ALL'];

                    return groupsToRender.map(grp => {
                      const rowsToRender = grp === 'ALL' ? s.rows : s.groups[grp].rows;
                      const totalQty = rowsToRender.reduce((sum: number, r: any) => sum + r.lastQty, 0);

                      return (
                        <div key={`${sloc}-${grp}`} className="bg-white p-6 sm:p-8 rounded-lg shadow-xl print:shadow-none print:p-0 print:m-0 border border-slate-300 font-sans text-xs space-y-4 print:page-break-after-always">
                          {/* Kop Form */}
                          <table className="w-full border-collapse border-2 border-black text-center font-bold">
                            <tbody>
                              <tr>
                                <td className="border-2 border-black p-2 w-20">
                                  <img src={LOGO_URL} alt="Logo" className="max-h-10 mx-auto object-contain" />
                                </td>
                                <td className="border-2 border-black p-2 text-sm sm:text-base font-black tracking-wide">
                                  FORMULIR STOCK OPNAME INTERNAL
                                </td>
                                <td className="border-2 border-black p-2 w-40 text-xs">
                                  LOGISTIK DEPARTEMEN
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="border-2 border-black p-1 text-[11px] font-mono tracking-wider">
                                  {formDocNo}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Meta Information */}
                          <table className="w-full border-collapse border-2 border-black text-[11px]">
                            <tbody>
                              <tr>
                                <td className="border border-black p-1 font-bold w-16">Plant</td>
                                <td className="border border-black p-1 w-32 font-bold">{formPlant}</td>
                                <td className="border border-black p-1 font-bold w-24 text-center">PIC SO 1</td>
                                <td className="border border-black p-1">{formPic1}</td>
                              </tr>
                              <tr>
                                <td className="border border-black p-1 font-bold">SLoc</td>
                                <td className="border border-black p-1 font-bold">{sloc} {grp !== 'ALL' ? `(${grp})` : ''}</td>
                                <td className="border border-black p-1 font-bold text-center">PIC SO 2</td>
                                <td className="border border-black p-1">{formPic2}</td>
                              </tr>
                              <tr>
                                <td className="border border-black p-1 font-bold">Tgl</td>
                                <td className="border border-black p-1 font-bold">{formTgl ? fmtTglID(formTgl) : ''}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                              </tr>
                              <tr>
                                <td className="border border-black p-1 font-bold">Area</td>
                                <td className="border border-black p-1 font-bold">{formArea}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Table Data */}
                          <table className="w-full border-collapse border-2 border-black text-[10px]">
                            <thead>
                              <tr className="bg-slate-100 font-bold text-center">
                                <th className="border border-black p-1 w-8">NO</th>
                                <th className="border border-black p-1 w-24">Location</th>
                                <th className="border border-black p-1 w-28">Item Code</th>
                                <th className="border border-black p-1 text-left">Item Name</th>
                                <th className="border border-black p-1 w-14">SLoc</th>
                                <th className="border border-black p-1 w-16">Last Qty</th>
                                <th className="border border-black p-1 w-20">Fisik</th>
                                <th className="border border-black p-1 w-28">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rowsToRender.map((r: any, idx: number) => (
                                <tr key={idx} className="text-center font-mono">
                                  <td className="border border-black p-1">{idx + 1}</td>
                                  <td className="border border-black p-1 text-left font-sans">{r.location || '-'}</td>
                                  <td className="border border-black p-1 text-left">{r.itemCode || r.material}</td>
                                  <td className="border border-black p-1 text-left font-sans">{r.itemName || r.desc}</td>
                                  <td className="border border-black p-1 font-bold">{r.sloc}</td>
                                  <td className="border border-black p-1 text-right font-bold">{r.lastQty.toLocaleString('id-ID')}</td>
                                  <td className="border border-black p-1"></td>
                                  <td className="border border-black p-1 font-sans"></td>
                                </tr>
                              ))}
                              <tr className="font-bold bg-slate-50 text-[11px]">
                                <td colSpan={5} className="border border-black p-1 text-right pr-2">Total</td>
                                <td className="border border-black p-1 text-right font-mono">{totalQty.toLocaleString('id-ID')}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Signatures */}
                          <div className="pt-4">
                            <table className="w-full text-center text-[10px]">
                              <tbody>
                                <tr className="font-bold">
                                  <td className="w-1/3 pb-12">Pelaksana</td>
                                  <td className="w-1/3 pb-12">Mengetahui</td>
                                  <td className="w-1/3 pb-12">Menyetujui</td>
                                </tr>
                                <tr className="font-bold">
                                  <td className="px-6"><div className="border-t border-black pt-1">Inventory</div></td>
                                  <td className="px-6"><div className="border-t border-black pt-1">SPv Log Distribusi</div></td>
                                  <td className="px-6"><div className="border-t border-black pt-1">Manager Log Distribusi</div></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })}
                </>
              )}

              {/* PRINT VIEW BERITA ACARA */}
              {previewMode === 'ba' && (
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl print:shadow-none print:p-0 print:m-0 border border-slate-300 font-sans text-xs space-y-4">
                  {/* Header BA */}
                  <table className="w-full border-collapse border-2 border-black text-center font-bold">
                    <tbody>
                      <tr>
                        <td className="border-2 border-black p-2 w-20">
                          <img src={LOGO_URL} alt="Logo" className="max-h-10 mx-auto object-contain" />
                        </td>
                        <td className="border-2 border-black p-2 text-sm sm:text-base font-black tracking-wide">
                          BERITA ACARA STOCK OPNAME
                        </td>
                        <td className="border-2 border-black p-2 w-40 text-xs">
                          LOGISTIK DEPARTEMEN
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Narasi BA */}
                  <div className="border-2 border-black border-t-0 p-3 text-[11px] leading-relaxed">
                    {getCompiledNarasi()}
                  </div>

                  {/* Data Table */}
                  <table className="w-full border-collapse border-2 border-black text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-black p-1 w-8">NO</th>
                        <th className="border border-black p-1 w-14">SLoc</th>
                        <th className="border border-black p-1 w-24">Material</th>
                        <th className="border border-black p-1 text-left">Material Description</th>
                        <th className="border border-black p-1 w-10">Bun</th>
                        <th className="border border-black p-1 w-16">SAP</th>
                        <th className="border border-black p-1 w-16">Fisik</th>
                        <th className="border border-black p-1 w-16">Selisih</th>
                        <th className="border border-black p-1 w-24">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {joinedRows.map((r, idx) => (
                        <tr key={idx} className="text-center font-mono">
                          <td className="border border-black p-1">{r.no}</td>
                          <td className="border border-black p-1 font-bold">{r.sloc}</td>
                          <td className="border border-black p-1 text-left">{r.material}</td>
                          <td className="border border-black p-1 text-left font-sans">{r.desc}</td>
                          <td className="border border-black p-1">{r.bun}</td>
                          <td className="border border-black p-1 text-right">{r.sapQty.toLocaleString('id-ID')}</td>
                          <td className="border border-black p-1 text-right">{r.fisik.toLocaleString('id-ID')}</td>
                          <td className={`border border-black p-1 text-right font-bold ${
                            r.selisih > 0 ? 'text-emerald-700' : r.selisih < 0 ? 'text-red-700' : ''
                          }`}>
                            {r.selisih > 0 ? `+${r.selisih.toLocaleString('id-ID')}` : r.selisih.toLocaleString('id-ID')}
                          </td>
                          <td className="border border-black p-1 font-sans">{r.ket}</td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-slate-50 text-[11px]">
                        <td colSpan={5} className="border border-black p-1 text-right pr-2">Total</td>
                        <td className="border border-black p-1 text-right font-mono">{baStats.totalSAP.toLocaleString('id-ID')}</td>
                        <td className="border border-black p-1 text-right font-mono">{baStats.totalFisik.toLocaleString('id-ID')}</td>
                        <td className={`border border-black p-1 text-right font-mono ${
                          baStats.totalSelisih > 0 ? 'text-emerald-700' : baStats.totalSelisih < 0 ? 'text-red-700' : ''
                        }`}>
                          {baStats.totalSelisih > 0 ? `+${baStats.totalSelisih.toLocaleString('id-ID')}` : baStats.totalSelisih.toLocaleString('id-ID')}
                        </td>
                        <td className="border border-black p-1"></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="pt-6">
                    <table className="w-full text-center text-[10px]">
                      <tbody>
                        <tr className="font-bold">
                          <td className="w-1/3 pb-12">Pelaksana</td>
                          <td className="w-1/3 pb-12">Mengetahui</td>
                          <td className="w-1/3 pb-12">Menyetujui</td>
                        </tr>
                        <tr className="font-bold">
                          <td className="px-6"><div className="border-t border-black pt-1">Inventory</div></td>
                          <td className="px-6"><div className="border-t border-black pt-1">SPv Log Distribusi</div></td>
                          <td className="px-6"><div className="border-t border-black pt-1">Manager Log Distribusi</div></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
