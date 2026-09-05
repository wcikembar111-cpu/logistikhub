import React, { useState, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  Table as TableIcon, 
  RefreshCw, 
  Download, 
  Upload, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  Layers, 
  Box, 
  Tags, 
  Trophy, 
  AlertTriangle, 
  X, 
  FileText, 
  PieChart as PieIcon, 
  Mic, 
  MicOff, 
  QrCode, 
  Check, 
  ArrowUpDown, 
  Clock, 
  Filter, 
  Sparkles, 
  Copy, 
  FileDown, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { ReturInventoryItem } from '../../types';
import { InventoryQrScannerModal } from './InventoryQrScannerModal';
import { 
  parseQuantity, 
  parseExcelDate, 
  findHeaderRowAndMap, 
  calculateExpiryStatus, 
  COLOR_PALETTE, 
  DEMO_RETUR_DATA 
} from './retur/returCalculations';
import { ReturProcessingModal, ProcessingStep } from './retur/ReturProcessingModal';

export type DashboardDimension = 'by_ed' | 'category' | 'location' | 'sloc' | 'status_ed';
export type FilterEdStatus = 'ALL' | 'EXPIRED' | 'NEAR_ED' | 'SAFE' | 'VARIANCE';

export function ReturInventoryModule() {
  const { showToast, showConfirm } = useNotification();

  // Navigation & View
  const [activeTab, setActiveTab] = useState<'dashboard' | 'data'>('dashboard');
  const [analysisDimension, setAnalysisDimension] = useState<DashboardDimension>('by_ed');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterEdStatus>('ALL');

  // Generator In-Memory Data (NO DATABASE, NO LOCALSTORAGE SYNC)
  const [returData, setReturData] = useState<ReturInventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string>('-');

  // Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<ProcessingStep>({
    title: 'Menyiapkan Generator...',
    desc: 'Memvalidasi data inventori retur',
    percent: 0
  });
  const [processingFileName, setProcessingFileName] = useState<string>('');

  // Upload & Drag-Drop State
  const [uploadPreview, setUploadPreview] = useState<ReturInventoryItem[] | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<'no' | 'last_qty_pcs' | 'qty_convert_ctn' | 'expired' | 'diffDays'>('no');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Voice Search & QR Scanner
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  const formatNumber = (num?: number | string | null, maxFraction = 2) => {
    if (num === undefined || num === null || num === '' || isNaN(Number(num))) return '0';
    return Number(num).toLocaleString('id-ID', { maximumFractionDigits: maxFraction });
  };

  // Helper generator sound
  const playChime = (type: 'start' | 'finish') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'start' ? 587.33 : 880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext unavailable
    }
  };

  // Voice Search Handler
  const handleToggleVoiceSearch = () => {
    const SpeechRec = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      showToast('Tidak Didukung', 'Browser Anda belum mendukung input suara. Gunakan Chrome atau Edge.', 'warning');
      return;
    }

    if (isListeningVoice) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'id-ID';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        playChime('start');
        showToast('Mendengarkan...', 'Sebutkan kode SKU, nama barang, rak, atau batch...', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        if (transcript) {
          setSearchQuery(transcript);
          setCurrentPage(1);
          if (activeTab !== 'data') setActiveTab('data');
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
        playChime('finish');
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleQrScanHit = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setSearchQuery(clean);
    setCurrentPage(1);
    setActiveTab('data');
    setShowQrScannerModal(false);
    showToast('QR Terpindai', `Menampilkan data untuk: "${clean}"`, 'success');
  };

  // ==========================================
  // EXCEL PARSING & GENERATOR PROCESSING
  // ==========================================

  const runProcessingAnimationSequence = async (fileName: string, totalRows: number): Promise<void> => {
    setProcessingFileName(fileName);
    setIsProcessing(true);

    // Step 1: Reading
    setProcessStep({
      title: 'Membaca Struktur File...',
      desc: 'Menganalisis lembar kerja dan memverifikasi baris data',
      percent: 25
    });
    await new Promise(r => setTimeout(r, 200));

    // Step 2: Mapping
    setProcessStep({
      title: 'Memetakan 22 Kolom Baku...',
      desc: 'Mencocokkan Item Code, Batch, Lokasi, dan Tanggal ED',
      percent: 50
    });
    await new Promise(r => setTimeout(r, 220));

    // Step 3: Conversions & Variance
    setProcessStep({
      title: 'Kalkulasi Konversi CTN & PCS...',
      desc: 'Memvalidasi kuantitas fisik dan selisih terhadap kuantitas awal',
      percent: 75
    });
    await new Promise(r => setTimeout(r, 200));

    // Step 4: Status ED & Summary
    setProcessStep({
      title: 'Menyusun Analisis & Ringkasan...',
      desc: `Mengagregasikan ${totalRows} baris data ke dashboard generator`,
      percent: 100
    });
    await new Promise(r => setTimeout(r, 280));

    playChime('finish');
    setIsProcessing(false);
  };

  const processExcelFile = (file: File) => {
    if (!file) return;
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          showToast('File Kosong', 'Tidak ada worksheet terdeteksi dalam file ini.', 'warning');
          return;
        }

        const ws = wb.Sheets[firstSheet];
        const jsonArr: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!jsonArr || jsonArr.length === 0) {
          showToast('File Kosong', 'File Excel tidak berisi data.', 'warning');
          return;
        }

        const { headerIndex, columnMap } = findHeaderRowAndMap(jsonArr);
        const dataRows = jsonArr.slice(headerIndex + 1);

        const getVal = (r: any[], field: string): any => {
          const colIdx = columnMap[field];
          if (colIdx !== undefined && r[colIdx] !== undefined) {
            return r[colIdx];
          }
          return '';
        };

        const parsed: ReturInventoryItem[] = [];

        dataRows.forEach((r, idx) => {
          if (!r || r.length === 0) return;

          const itemCode = String(getVal(r, 'item_code') || '').trim();
          const itemName = String(getVal(r, 'item_name') || '').trim();

          // Skip completely empty rows
          if (!itemCode && !itemName && !r.some(c => c !== '')) return;

          const firstQty = parseQuantity(getVal(r, 'first_qty'));
          const lastQtyPcs = parseQuantity(getVal(r, 'last_qty_pcs'));
          let qtyConvertCtn = parseQuantity(getVal(r, 'qty_convert_ctn'));

          let category = String(getVal(r, 'category') || '').trim();
          if (!category) category = 'REGULER';

          let byEd = String(getVal(r, 'by_ed') || '').trim();
          if (!byEd || byEd.toLowerCase() === 'unassigned') {
            if (category && category !== 'REGULER' && category !== '-') {
              byEd = category;
            } else if (itemName) {
              const words = itemName.split(/\s+/);
              byEd = words.slice(0, 2).join(' ').toUpperCase();
            } else {
              byEd = 'Unassigned';
            }
          }

          const expired = parseExcelDate(getVal(r, 'expired'));

          parsed.push({
            id: `ret-${idx + 1}-${Date.now()}`,
            no: getVal(r, 'no') || (parsed.length + 1),
            item_code: itemCode || `SKU-${parsed.length + 1}`,
            item_name: itemName || `Item Retur ${parsed.length + 1}`,
            category,
            location: String(getVal(r, 'location') || 'GUDANG').trim(),
            location_type: String(getVal(r, 'location_type') || 'RACK').trim(),
            first_qty: firstQty,
            last_qty_pcs: lastQtyPcs,
            uom: String(getVal(r, 'uom') || 'PCS').trim().toUpperCase(),
            qty_convert_ctn: qtyConvertCtn,
            uom_convert: String(getVal(r, 'uom_convert') || 'CTN').trim().toUpperCase(),
            lpn_serial: String(getVal(r, 'lpn_serial') || '').trim(),
            batch: String(getVal(r, 'batch') || '').trim(),
            vendor_batch: String(getVal(r, 'vendor_batch') || '').trim(),
            sloc: String(getVal(r, 'sloc') || '8A04').trim().toUpperCase(),
            expired,
            destination_code: String(getVal(r, 'destination_code') || '').trim(),
            qc_code: String(getVal(r, 'qc_code') || 'PASS').trim(),
            user_tally: String(getVal(r, 'user_tally') || '').trim(),
            shelf_life: String(getVal(r, 'shelf_life') || '').trim(),
            source: String(getVal(r, 'source') || 'INBOUND').trim(),
            by_ed: byEd
          });
        });

        if (parsed.length === 0) {
          showToast('Data Kosong', 'Tidak ada baris data retur valid ditemukan.', 'warning');
          return;
        }

        setUploadPreview(parsed);
        showToast('File Terbaca', `${parsed.length} baris data retur siap diproses ke generator`, 'info');
      } catch (err: any) {
        console.error('Excel parse error:', err);
        showToast('Gagal Membaca File', err.message || 'Format file Excel tidak sesuai', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
        processExcelFile(file);
      } else {
        showToast('Format Salah', 'Gunakan file .xlsx, .xls, atau .csv', 'warning');
      }
    }
  };

  // Commit Preview to Workspace with Animation
  const handleCommitPreview = async (mode: 'append' | 'replace') => {
    if (!uploadPreview || uploadPreview.length === 0) return;

    const nextData = mode === 'replace' ? [...uploadPreview] : [...returData, ...uploadPreview];
    
    // Trigger animated processing sequence
    await runProcessingAnimationSequence(uploadFileName || 'Data Upload', uploadPreview.length);

    setReturData(nextData);
    setUploadPreview(null);
    setUploadFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    const now = new Date();
    setLastGeneratedAt(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    showToast(
      'Generator Berhasil Diproses',
      `${uploadPreview.length} data retur berhasil diproses ke dalam ringkasan metrik & tabel analisis!`,
      'success'
    );
  };

  // Load Demo / Sample Generator Data
  const handleLoadDemoData = async () => {
    await runProcessingAnimationSequence('Sample_Retur_Demo.xlsx', DEMO_RETUR_DATA.length);
    setReturData(DEMO_RETUR_DATA);
    const now = new Date();
    setLastGeneratedAt(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    showToast('Data Demo Dimuat', `${DEMO_RETUR_DATA.length} baris data contoh siap dianalisis di generator`, 'success');
  };

  // Clear workspace
  const handleResetWorkspace = () => {
    showConfirm({
      title: 'Reset Workspace Generator',
      message: 'Bersihkan seluruh data yang saat ini dianalisis di generator? (Data generator bersifat mandiri dan tidak terhubung database)',
      confirmText: 'Ya, Bersihkan',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        setReturData([]);
        setUploadPreview(null);
        setUploadFileName('');
        setSearchQuery('');
        showToast('Workspace Bersih', 'Seluruh data generator telah dikosongkan', 'info');
      }
    });
  };

  // ==========================================
  // METRICS, AGGREGATIONS & CALCULATION LOGIC
  // ==========================================

  const {
    dimensionList,
    grandTotalLastQtyPcs,
    grandTotalQtyConvertCtn,
    grandTotalFirstQty,
    grandTotalVariancePcs,
    topGroup,
    totalUniqueSKUs,
    totalUniqueBatches,
    totalUniqueLocations,
    totalUniqueSlocs,
    expiredStats,
    averagePcsPerCtn
  } = useMemo(() => {
    const map: Record<string, {
      key: string;
      lastQtyPcs: number;
      qtyConvertCtn: number;
      firstQty: number;
      variancePcs: number;
      count: number;
      expiredCount: number;
      nearEdCount: number;
      safeCount: number;
    }> = {};

    let totalPcs = 0;
    let totalCtn = 0;
    let totalFirst = 0;
    let totalVar = 0;

    const skuSet = new Set<string>();
    const batchSet = new Set<string>();
    const locSet = new Set<string>();
    const slocSet = new Set<string>();

    let expiredCount = 0;
    let criticalNearEdCount = 0;
    let nearEdCount = 0;
    let mediumEdCount = 0;
    let safeCount = 0;
    let unknownEdCount = 0;

    let expiredPcs = 0;
    let criticalPcs = 0;
    let nearEdPcs = 0;

    returData.forEach(item => {
      const pcs = Number(item.last_qty_pcs) || 0;
      const ctn = Number(item.qty_convert_ctn) || 0;
      const first = Number(item.first_qty) || 0;
      const variance = pcs - first;

      totalPcs += pcs;
      totalCtn += ctn;
      totalFirst += first;
      totalVar += variance;

      if (item.item_code) skuSet.add(item.item_code.trim().toUpperCase());
      if (item.batch) batchSet.add(item.batch.trim().toUpperCase());
      if (item.location) locSet.add(item.location.trim().toUpperCase());
      if (item.sloc) slocSet.add(item.sloc.trim().toUpperCase());

      // Expiry status analysis
      const expAnalysis = calculateExpiryStatus(item.expired);
      if (expAnalysis.status === 'EXPIRED') {
        expiredCount++;
        expiredPcs += pcs;
      } else if (expAnalysis.status === 'CRITICAL') {
        criticalNearEdCount++;
        criticalPcs += pcs;
      } else if (expAnalysis.status === 'NEAR_ED') {
        nearEdCount++;
        nearEdPcs += pcs;
      } else if (expAnalysis.status === 'MEDIUM') {
        mediumEdCount++;
      } else if (expAnalysis.status === 'SAFE') {
        safeCount++;
      } else {
        unknownEdCount++;
      }

      // Group Key Resolution
      let key = '';
      if (analysisDimension === 'by_ed') {
        key = (item.by_ed || '').trim() || (item.category || '').trim() || 'Unassigned';
      } else if (analysisDimension === 'category') {
        key = (item.category || '').trim() || 'Tanpa Kategori';
      } else if (analysisDimension === 'location') {
        key = (item.location || '').trim() || 'Tanpa Lokasi';
      } else if (analysisDimension === 'sloc') {
        key = (item.sloc || '').trim() || '8A04';
      } else if (analysisDimension === 'status_ed') {
        key = expAnalysis.label.split('(')[0].trim();
      }

      if (!key) key = 'Unassigned';

      if (!map[key]) {
        map[key] = {
          key,
          lastQtyPcs: 0,
          qtyConvertCtn: 0,
          firstQty: 0,
          variancePcs: 0,
          count: 0,
          expiredCount: 0,
          nearEdCount: 0,
          safeCount: 0
        };
      }

      map[key].lastQtyPcs += pcs;
      map[key].qtyConvertCtn += ctn;
      map[key].firstQty += first;
      map[key].variancePcs += variance;
      map[key].count += 1;

      if (expAnalysis.status === 'EXPIRED') map[key].expiredCount += 1;
      else if (expAnalysis.status === 'CRITICAL' || expAnalysis.status === 'NEAR_ED') map[key].nearEdCount += 1;
      else if (expAnalysis.status === 'SAFE') map[key].safeCount += 1;
    });

    let list = Object.values(map).sort((a, b) => b.lastQtyPcs - a.lastQtyPcs).map((item, idx) => ({
      ...item,
      pctPcs: totalPcs > 0 ? (item.lastQtyPcs / totalPcs) * 100 : 0,
      pctCtn: totalCtn > 0 ? (item.qtyConvertCtn / totalCtn) * 100 : 0,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
    }));

    if (dashboardSearch.trim()) {
      const q = dashboardSearch.trim().toLowerCase();
      list = list.filter(item => item.key.toLowerCase().includes(q));
    }

    const avgPcsPerCtn = totalCtn > 0 ? Math.round((totalPcs / totalCtn) * 100) / 100 : 0;

    return {
      dimensionList: list,
      grandTotalLastQtyPcs: totalPcs,
      grandTotalQtyConvertCtn: totalCtn,
      grandTotalFirstQty: totalFirst,
      grandTotalVariancePcs: totalVar,
      topGroup: list.length > 0 ? list[0] : null,
      totalUniqueSKUs: skuSet.size,
      totalUniqueBatches: batchSet.size,
      totalUniqueLocations: locSet.size,
      totalUniqueSlocs: slocSet.size,
      expiredStats: {
        expiredCount,
        criticalNearEdCount,
        nearEdCount,
        mediumEdCount,
        safeCount,
        unknownEdCount,
        totalRiskCount: expiredCount + criticalNearEdCount + nearEdCount,
        expiredPcs,
        criticalPcs,
        nearEdPcs,
        totalRiskPcs: expiredPcs + criticalPcs + nearEdPcs
      },
      averagePcsPerCtn: avgPcsPerCtn
    };
  }, [returData, analysisDimension, dashboardSearch]);

  // Filtered & Sorted Table Rows
  const filteredData = useMemo(() => {
    let rows = [...returData];

    // Status Filter Chip
    if (statusFilter !== 'ALL') {
      rows = rows.filter(item => {
        const exp = calculateExpiryStatus(item.expired);
        if (statusFilter === 'EXPIRED') return exp.status === 'EXPIRED';
        if (statusFilter === 'NEAR_ED') return exp.status === 'CRITICAL' || exp.status === 'NEAR_ED';
        if (statusFilter === 'SAFE') return exp.status === 'SAFE' || exp.status === 'MEDIUM';
        if (statusFilter === 'VARIANCE') return (Number(item.last_qty_pcs) || 0) !== (Number(item.first_qty) || 0);
        return true;
      });
    }

    // Text Search Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(d => 
        (d.item_code && d.item_code.toLowerCase().includes(q)) ||
        (d.item_name && d.item_name.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q)) ||
        (d.location && d.location.toLowerCase().includes(q)) ||
        (d.by_ed && String(d.by_ed).toLowerCase().includes(q)) ||
        (d.batch && d.batch.toLowerCase().includes(q)) ||
        (d.sloc && d.sloc.toLowerCase().includes(q)) ||
        (d.lpn_serial && d.lpn_serial.toLowerCase().includes(q)) ||
        (d.expired && d.expired.toLowerCase().includes(q))
      );
    }

    // Sort
    rows.sort((a, b) => {
      let valA: any = a[sortField as keyof ReturInventoryItem];
      let valB: any = b[sortField as keyof ReturInventoryItem];

      if (sortField === 'diffDays') {
        const expA = calculateExpiryStatus(a.expired).diffDays ?? 99999;
        const expB = calculateExpiryStatus(b.expired).diffDays ?? 99999;
        return sortOrder === 'asc' ? expA - expB : expB - expA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return rows;
  }, [returData, statusFilter, searchQuery, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const handleSortToggle = (field: 'no' | 'last_qty_pcs' | 'qty_convert_ctn' | 'expired' | 'diffDays') => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // ==========================================
  // EXCEL EXPORT & TEMPLATE GENERATOR
  // ==========================================

  const handleDownloadTemplate = () => {
    const headers = [
      ['No', 'Item Code', 'Item Name', 'Category', 'Location', 'Location Type', 'First Qty', 'Last Qty Pcs', 'Uom', 'Qty Convert Ctn', 'Uom Convert', 'LPN/Serial Number', 'Batch', 'Vendor Batch', 'SLOC', 'Expired', 'Destination Code', 'QC Code', 'User Tally', 'Shelf Life', 'Source', 'By ED']
    ];
    const sampleRows = [
      [1, 'ITEM-001', 'KINO CAP PANDA LIANG TEH', 'BEVERAGE', 'LOC-A1', 'RACK', 2400, 2400, 'PCS', 100, 'CTN', 'LPN-001', 'B240810', 'VB-01', '8A04', '2026-10-15', 'DST-01', 'QC-PASS', 'CHECKER-A', '24 Bulan', 'INBOUND', 'CAP PANDA'],
      [2, 'ITEM-002', 'KINO SAMANTHA HAIR DYE', 'COSMETIC', 'LOC-B2', 'SHELF', 1500, 1500, 'PCS', 30, 'CTN', 'LPN-002', 'SM24011', 'VB-02', '8A04', '2026-08-20', 'DST-02', 'EXPIRED', 'CHECKER-B', '36 Bulan', 'INBOUND', 'SAMANTHA']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
    ws['!cols'] = Array(22).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Retur');
    XLSX.writeFile(wb, 'Template_Generator_Retur_Inventory.xlsx');
    showToast('Template Diunduh', 'Template Excel 22 kolom baku siap diisi', 'success');
  };

  const handleDownloadExcel = async () => {
    if (returData.length === 0) {
      showToast('Data Kosong', 'Tidak ada data retur untuk diekspor', 'warning');
      return;
    }

    // Trigger visual export processing
    setProcessingFileName('Laporan_Analisis_Retur.xlsx');
    setIsProcessing(true);
    setProcessStep({
      title: 'Menyusun Workbook Excel...',
      desc: 'Membuat sheet data lengkap, pivot By ED, dan status expired',
      percent: 40
    });

    await new Promise(r => setTimeout(r, 250));

    // Sheet 1: Detailed Items
    const rows = returData.map((item, idx) => {
      const expAnalysis = calculateExpiryStatus(item.expired);
      const first = Number(item.first_qty) || 0;
      const last = Number(item.last_qty_pcs) || 0;
      return {
        'No': item.no || idx + 1,
        'Item Code': item.item_code || '',
        'Item Name': item.item_name || '',
        'Category': item.category || '',
        'Location': item.location || '',
        'Location Type': item.location_type || '',
        'First Qty': first,
        'Last Qty Pcs': last,
        'Selisih Pcs': last - first,
        'Uom': item.uom || 'PCS',
        'Qty Convert Ctn': item.qty_convert_ctn || 0,
        'Uom Convert': item.uom_convert || 'CTN',
        'LPN/Serial Number': item.lpn_serial || '',
        'Batch': item.batch || '',
        'Vendor Batch': item.vendor_batch || '',
        'SLOC': item.sloc || '',
        'Expired': item.expired || '',
        'Sisa Hari ED': expAnalysis.diffDays !== null ? expAnalysis.diffDays : '',
        'Status ED': expAnalysis.label,
        'Destination Code': item.destination_code || '',
        'QC Code': item.qc_code || '',
        'User Tally': item.user_tally || '',
        'Shelf Life': item.shelf_life || '',
        'Source': item.source || '',
        'By ED': item.by_ed || ''
      };
    });

    // Sheet 2: Summary by Dimension
    const summaryRows = dimensionList.map((d, i) => ({
      'No': i + 1,
      'Grup': d.key,
      'Jumlah Baris': d.count,
      'Last Qty Pcs': d.lastQtyPcs,
      'Qty Convert Ctn': d.qtyConvertCtn,
      'First Qty': d.firstQty,
      'Selisih Pcs': d.variancePcs,
      'Share Pcs (%)': Number(d.pctPcs.toFixed(2)),
      'Share Ctn (%)': Number(d.pctCtn.toFixed(2)),
      'Item Expired': d.expiredCount,
      'Item Near ED': d.nearEdCount,
      'Item Aman': d.safeCount
    }));

    setProcessStep({
      title: 'Menyelesaikan File Excel...',
      desc: 'Merapikan format kolom dan menyimpan file',
      percent: 90
    });
    await new Promise(r => setTimeout(r, 180));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(rows);
    ws1['!cols'] = Array(25).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws1, 'Data_Analisis_Retur');

    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2['!cols'] = Array(12).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary_By_Grup');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Laporan_Analisis_Retur_${dateStr}.xlsx`);

    setIsProcessing(false);
    playChime('finish');
    showToast('Ekspor Berhasil', 'Laporan Excel multi-sheet berhasil diunduh', 'success');
  };

  // Quick Copy Text Summary
  const handleCopySummaryText = () => {
    if (returData.length === 0) {
      showToast('Data Kosong', 'Tidak ada data untuk disalin', 'warning');
      return;
    }

    const text = `📦 *RINGKASAN GENERATOR RETUR INVENTORY*
📅 Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
───────────────────────────
• Total Record: ${returData.length} baris
• Total Fisik: ${formatNumber(grandTotalLastQtyPcs)} PCS
• Total Konversi: ${formatNumber(grandTotalQtyConvertCtn)} Karton (CTN)
• Total SKU Unik: ${totalUniqueSKUs} SKU
• Total Lokasi: ${totalUniqueLocations} Rak
• Total SLOC: ${totalUniqueSlocs} Sloc

⚠️ *Status Kedaluwarsa:*
• Expired: ${expiredStats.expiredCount} item (${formatNumber(expiredStats.expiredPcs)} PCS)
• Critical & Near ED (≤90 hr): ${expiredStats.criticalNearEdCount + expiredStats.nearEdCount} item (${formatNumber(expiredStats.criticalPcs + expiredStats.nearEdPcs)} PCS)
• Aman (>90 hr): ${expiredStats.safeCount + expiredStats.mediumEdCount} item

🏆 *Top 3 Grup (${analysisDimension.toUpperCase()}):*
${dimensionList.slice(0, 3).map((d, i) => `${i + 1}. ${d.key}: ${formatNumber(d.lastQtyPcs)} PCS (${d.pctPcs.toFixed(1)}%)`).join('\n')}
───────────────────────────
_Diproses otomatis melalui Tools Generator Retur WH-CKB_`;

    navigator.clipboard.writeText(text);
    showToast('Tersalin!', 'Ringkasan analisis berhasil disalin ke clipboard', 'success');
  };

  // Preview Stats
  const previewStats = useMemo(() => {
    if (!uploadPreview) return null;
    let totalPcs = 0;
    let totalCtn = 0;
    const cats = new Set<string>();
    uploadPreview.forEach(r => {
      totalPcs += Number(r.last_qty_pcs) || 0;
      totalCtn += Number(r.qty_convert_ctn) || 0;
      if (r.by_ed) cats.add(r.by_ed);
    });
    return {
      count: uploadPreview.length,
      totalPcs,
      totalCtn,
      categoriesCount: cats.size
    };
  }, [uploadPreview]);

  return (
    <div className="w-full space-y-4">
      {/* PROCESSING ANIMATION OVERLAY MODAL */}
      <ReturProcessingModal 
        isOpen={isProcessing}
        step={processStep}
        fileName={processingFileName}
        rowCount={uploadPreview ? uploadPreview.length : returData.length}
      />

      {/* TOP HEADER - GENERATOR TOOL IDENTITY (NO DATABASE, NO SYNC) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 m-0 leading-tight">
                Generator Retur Inventory
              </h3>
              {/* Generator Standalone Badge */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                <Sparkles size={11} className="text-rose-600" />
                <span>Tools Generator</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
                <span>In-Memory &bull; Bebas Database</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Generator analisis kuantitas fisik (PCS), konversi CTN, breakdown By ED, & audit kedaluwarsa mandiri
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
          {/* Quick Voice & QR buttons */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isListeningVoice
                  ? 'bg-red-600 text-white animate-pulse shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
              title="Cari dengan Suara (Voice)"
            >
              {isListeningVoice ? <MicOff size={14} className="animate-bounce" /> : <Mic size={14} className="text-rose-600" />}
              <span className="hidden sm:inline">{isListeningVoice ? 'Mendengarkan...' : 'Suara'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrScannerModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Scan QR Code / Barcode Produk"
            >
              <QrCode size={14} className="text-emerald-700" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={14} />
              <span>Ringkasan Metrik</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon size={14} />
              <span>Data Retur ({returData.length})</span>
            </button>
          </div>

          {/* Quick Demo & Reset Buttons */}
          {returData.length === 0 ? (
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Muat Data Sampel untuk Mencoba Generator"
            >
              <Sparkles size={13} />
              <span>Coba Demo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResetWorkspace}
              className="p-2 rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-slate-600 hover:text-red-600 shadow-2xs transition-all cursor-pointer shrink-0"
              title="Bersihkan Workspace Generator"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW A: DASHBOARD ANALISIS DENGAN DIMENSI & SUMMARY       */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Dimension Selector & Export / Copy Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-rose-600" />
                <span>Dimensi Breakdown:</span>
              </span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('by_ed')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'by_ed'
                      ? 'bg-white text-rose-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By ED
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('category')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'category'
                      ? 'bg-white text-rose-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kategori
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('location')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'location'
                      ? 'bg-white text-rose-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lokasi Rak
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('sloc')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'sloc'
                      ? 'bg-white text-rose-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SLOC
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('status_ed')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'status_ed'
                      ? 'bg-white text-rose-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Status Kedaluwarsa
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
              <div className="relative flex-1 sm:w-48">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                  placeholder="Filter grup..."
                  className="w-full pl-7 pr-7 py-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
                {dashboardSearch && (
                  <button
                    type="button"
                    onClick={() => setDashboardSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopySummaryText}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Salin Ringkasan Teks ke Clipboard"
              >
                <Copy size={13} />
                <span>Salin Ringkasan</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Unduh Laporan Excel Lengkap"
              >
                <Download size={13} />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </div>

          {/* TOP 5 ACCURATE SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Card 1: Total Last Qty Pcs */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 border border-blue-200">
                <Layers size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Fisik (PCS)
                </div>
                <div className="text-base sm:text-lg font-black text-blue-950 leading-tight mt-0.5 truncate font-mono">
                  {formatNumber(grandTotalLastQtyPcs)} <span className="text-[10px] font-bold text-blue-700">PCS</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  Awal: {formatNumber(grandTotalFirstQty)} PCS
                </div>
              </div>
            </div>

            {/* Card 2: Total Convert CTN */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <Box size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Konversi Karton
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 leading-tight mt-0.5 truncate font-mono">
                  {formatNumber(grandTotalQtyConvertCtn)} <span className="text-[10px] font-bold text-emerald-600">CTN</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  Rasio: ~{averagePcsPerCtn} PCS/CTN
                </div>
              </div>
            </div>

            {/* Card 3: Selisih / Variance */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                grandTotalVariancePcs === 0
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : grandTotalVariancePcs < 0
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <ArrowUpDown size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Selisih Fisik vs Awal
                </div>
                <div className={`text-base sm:text-lg font-black leading-tight mt-0.5 truncate font-mono ${
                  grandTotalVariancePcs === 0
                    ? 'text-slate-800'
                    : grandTotalVariancePcs < 0
                    ? 'text-red-700'
                    : 'text-emerald-700'
                }`}>
                  {grandTotalVariancePcs > 0 ? `+${formatNumber(grandTotalVariancePcs)}` : formatNumber(grandTotalVariancePcs)} <span className="text-[10px] font-bold">PCS</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {grandTotalVariancePcs === 0 ? 'Kuantitas cocok (100%)' : 'Ada perbedaan kuantitas'}
                </div>
              </div>
            </div>

            {/* Card 4: SKU & Lokasi */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Tags size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Keragaman Inventori
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                  {totalUniqueSKUs} <span className="text-[10px] font-bold text-slate-500">SKU</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {totalUniqueBatches} Batch &bull; {totalUniqueLocations} Rak
                </div>
              </div>
            </div>

            {/* Card 5: Top Grup */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3 col-span-2 lg:col-span-1">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                <Trophy size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Grup Terbesar ({analysisDimension.toUpperCase()})
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5 truncate" title={topGroup?.key}>
                  {topGroup?.key || '-'}
                </div>
                <div className="text-[10.5px] font-bold text-purple-700 font-mono truncate">
                  {formatNumber(topGroup?.lastQtyPcs)} PCS ({topGroup ? topGroup.pctPcs.toFixed(1) : 0}%)
                </div>
              </div>
            </div>
          </div>

          {/* AGING & EXPIRY STATUS RISK ALERT BANNER */}
          {expiredStats.totalRiskCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <div className="text-xs text-rose-950 font-semibold leading-relaxed">
                  <span>Peringatan Masa Simpan: Ditemukan </span>
                  <strong className="text-red-700 font-mono">{expiredStats.expiredCount} item EXPIRED ({formatNumber(expiredStats.expiredPcs)} PCS)</strong>
                  <span> dan </span>
                  <strong className="text-rose-800 font-mono">{expiredStats.criticalNearEdCount + expiredStats.nearEdCount} item Near ED ≤ 90 hari ({formatNumber(expiredStats.criticalPcs + expiredStats.nearEdPcs)} PCS)</strong>.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('EXPIRED');
                    setActiveTab('data');
                  }}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  Lihat Expired
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('NEAR_ED');
                    setActiveTab('data');
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  Lihat Near ED
                </button>
              </div>
            </div>
          )}

          {/* CHARTS & DISTRIBUTION BREAKDOWN ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Bar Chart - 7 Cols */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={15} className="text-rose-600" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">
                        Distribusi Kuantitas per {analysisDimension === 'by_ed' ? 'By ED' : analysisDimension === 'category' ? 'Kategori' : analysisDimension === 'location' ? 'Lokasi Rak' : analysisDimension === 'sloc' ? 'SLOC' : 'Status ED'}
                      </h4>
                      <p className="text-[11px] text-slate-500 m-0 hidden sm:block">Perbandingan kuantitas fisik (PCS) dan porsi persentase</p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    {dimensionList.length} Grup
                  </span>
                </div>

                {dimensionList.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg gap-2">
                    <span>Belum ada data retur yang dimuat.</span>
                    <button
                      type="button"
                      onClick={handleLoadDemoData}
                      className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 hover:bg-rose-100 cursor-pointer"
                    >
                      Muat Contoh Data Retur
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {dimensionList.map((item) => (
                      <div key={item.key} className="space-y-0.5 group hover:bg-slate-50/80 p-1 rounded-md transition-colors">
                        <div className="flex justify-between items-center text-[11px] sm:text-xs">
                          <span className="font-bold text-slate-800 truncate max-w-[55%] sm:max-w-[65%]" title={item.key}>
                            {item.key}
                          </span>
                          <span className="font-bold font-mono text-blue-950 shrink-0 text-right">
                            {formatNumber(item.lastQtyPcs)} <span className="text-[10px] text-slate-400 font-normal">PCS ({item.pctPcs.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/80">
                          <div
                            className="h-full rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${Math.max(item.pctPcs, 1.5)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
                <span>Akumulasi: <strong className="text-slate-700">{formatNumber(grandTotalLastQtyPcs)} PCS</strong></span>
                <span className="text-slate-500">Porsi Terbesar: <strong className="text-purple-700">{topGroup?.key || '-'}</strong></span>
              </div>
            </div>

            {/* Right Donut Visualizer - 5 Cols */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PieIcon size={15} className="text-slate-600" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">Proporsi Share (%)</h4>
                      <p className="text-[11px] text-slate-500 m-0 hidden sm:block">Distribusi porsi volume terhadap total</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Share</span>
                </div>

                {/* Donut Style Radial Visualizer */}
                <div className="my-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-center gap-4">
                  <div className="relative w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="4.2"
                      />
                      {(() => {
                        let accumulated = 0;
                        return dimensionList.map((item) => {
                          const strokeDasharray = `${item.pctPcs} ${100 - item.pctPcs}`;
                          const strokeDashoffset = -accumulated;
                          accumulated += item.pctPcs;
                          return (
                            <circle
                              key={item.key}
                              cx="18"
                              cy="18"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="4.2"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-black text-slate-900 leading-none font-mono">
                        {dimensionList.length}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-tight mt-0.5">Grup</span>
                    </div>
                  </div>

                  <div className="text-left space-y-0.5 min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fisik:</div>
                    <div className="text-sm sm:text-base font-black text-blue-950 font-mono leading-tight truncate">
                      {formatNumber(grandTotalLastQtyPcs)} <span className="text-[10px] font-bold text-blue-700">PCS</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-700 font-mono leading-tight truncate">
                      {formatNumber(grandTotalQtyConvertCtn)} <span className="text-[10px] font-semibold text-emerald-600">CTN</span>
                    </div>
                  </div>
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {dimensionList.slice(0, 10).map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5 text-[11px] p-1 rounded-md hover:bg-slate-50 transition-colors">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700 truncate" title={item.key}>{item.key}</span>
                      <span className="text-slate-400 font-bold font-mono text-[10px] ml-auto shrink-0">{item.pctPcs.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                <span>Generator Terakhir:</span>
                <span className="font-semibold text-slate-600">{lastGeneratedAt !== '-' ? `${lastGeneratedAt} WIB` : '-'}</span>
              </div>
            </div>
          </div>

          {/* SUMMARY PIVOT TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <TableIcon size={15} className="text-rose-600" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">
                    Tabel Ringkasan Berdasarkan {analysisDimension === 'by_ed' ? 'By ED' : analysisDimension === 'category' ? 'Kategori' : analysisDimension === 'location' ? 'Lokasi Rak' : analysisDimension === 'sloc' ? 'SLOC' : 'Status ED'}
                  </h4>
                  <p className="text-[11px] text-slate-500 m-0">Rekapitulasi total PCS, konversi karton, selisih, dan persentase</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  Total: <strong className="text-rose-700">{dimensionList.length}</strong> Baris Grup
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[320px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-800 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] z-10">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3 min-w-[140px]">
                      {analysisDimension === 'by_ed' ? 'Grup By ED' : analysisDimension === 'category' ? 'Kategori Produk' : analysisDimension === 'location' ? 'Lokasi Rak' : analysisDimension === 'sloc' ? 'SLOC Gudang' : 'Status Kedaluwarsa'}
                    </th>
                    <th className="py-2 px-3 text-right min-w-[80px]">Baris</th>
                    <th className="py-2 px-3 text-right min-w-[100px]">Last Qty (PCS)</th>
                    <th className="py-2 px-3 text-right min-w-[100px]">Konversi (CTN)</th>
                    <th className="py-2 px-3 text-right min-w-[90px]">Selisih</th>
                    <th className="py-2 px-3 min-w-[120px]">% Last Qty</th>
                    <th className="py-2 px-3 min-w-[120px]">% Convert CTN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-[11px]">
                  {dimensionList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        Belum ada data di generator. Unggah file Excel atau klik "Coba Demo" di atas.
                      </td>
                    </tr>
                  ) : (
                    dimensionList.map((item, idx) => (
                      <tr key={item.key} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 truncate" title={item.key}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                            <span>{item.key}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {item.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">
                          {formatNumber(item.lastQtyPcs)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatNumber(item.qtyConvertCtn)}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${
                          item.variancePcs === 0 ? 'text-slate-500' : item.variancePcs < 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {item.variancePcs > 0 ? `+${formatNumber(item.variancePcs)}` : formatNumber(item.variancePcs)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-700 w-11 text-right text-[10.5px]">
                              {item.pctPcs.toFixed(1)}%
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${item.pctPcs}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-700 w-11 text-right text-[10.5px]">
                              {item.pctCtn.toFixed(1)}%
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${item.pctCtn}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {dimensionList.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-extrabold z-10 text-xs">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                        GRAND TOTAL
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {returData.length} baris
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-950">
                        {formatNumber(grandTotalLastQtyPcs)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-900">
                        {formatNumber(grandTotalQtyConvertCtn)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                        grandTotalVariancePcs === 0 ? 'text-slate-700' : grandTotalVariancePcs < 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        {grandTotalVariancePcs > 0 ? `+${formatNumber(grandTotalVariancePcs)}` : formatNumber(grandTotalVariancePcs)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">100.0%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">100.0%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: DATA RETUR TABLE, SMART UPLOAD & GENERATOR RUN    */}
      {/* ========================================================= */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* DRAG-AND-DROP UPLOAD ZONE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs shrink-0">
                  <Upload size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 m-0">Generator Input: Unggah File Excel / CSV</h4>
                  <p className="text-xs text-slate-500 m-0">
                    Mendukung Drag-and-Drop file inventori retur dengan deteksi cerdas 22 kolom baku
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh Format Template Excel 22 Kolom"
                >
                  <FileSpreadsheet size={14} />
                  <span>Template Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh Data & Hasil Analisis ke Excel"
                >
                  <Download size={14} />
                  <span>Ekspor Excel</span>
                </button>

                {returData.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetWorkspace}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Kosongkan Data Generator"
                  >
                    <Trash2 size={14} />
                    <span>Reset Data</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-rose-600 bg-rose-50/80 scale-[1.01]'
                  : 'border-slate-300 hover:border-rose-500 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelSelected}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                <Upload size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {uploadFileName ? `File Terpilih: "${uploadFileName}"` : 'Tarik & Lepaskan File Excel/CSV di sini, atau Klik untuk Memilih'}
                </span>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                  Format yang didukung: .xlsx, .xls, .csv. Sistem otomatis memetakan kolom No, Kode Item, Qty, Batch, Expired, By ED.
                </p>
              </div>
            </div>

            {/* Upload Preview Box */}
            {uploadPreview && previewStats && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                    <span className="text-xs font-bold text-rose-950">
                      Pratinjau Data Unggahan ({previewStats.count} Baris Terdeteksi)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadPreview(null);
                      setUploadFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Tutup pratinjau"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded-lg border border-rose-100">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total Baris</span>
                    <div className="font-bold text-slate-900 font-mono">{previewStats.count} baris</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total Fisik PCS</span>
                    <div className="font-bold text-blue-950 font-mono">{formatNumber(previewStats.totalPcs)} PCS</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total Konversi CTN</span>
                    <div className="font-bold text-emerald-700 font-mono">{formatNumber(previewStats.totalCtn)} CTN</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Kategori By ED</span>
                    <div className="font-bold text-purple-700 font-mono">{previewStats.categoriesCount} grup</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleCommitPreview('append')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>+ Tambahkan ke Workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCommitPreview('replace')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    <span>Generate & Muat Data Baru</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MAIN DATA TABLE & SEARCH */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Filter Chips & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-xl">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Cari Item Code, Nama Barang, Lokasi, By ED, Batch..."
                      className="w-full pl-8 pr-8 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Hapus pencarian"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleVoiceSearch}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isListeningVoice
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                    }`}
                    title="Cari Data dengan Suara"
                  >
                    {isListeningVoice ? <MicOff size={15} className="animate-bounce" /> : <Mic size={15} className="text-rose-600" />}
                    <span className="hidden md:inline">{isListeningVoice ? 'Mendengarkan...' : 'Suara'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrScannerModal(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Scan QR Code / Barcode"
                  >
                    <QrCode size={15} />
                    <span className="hidden md:inline">Scan QR</span>
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-slate-500">
                  <span>
                    Menampilkan <strong>{filteredData.length}</strong> dari <strong>{returData.length}</strong> data
                  </span>
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter size={11} /> Filter Status:
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Semua ({returData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('EXPIRED')}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'EXPIRED'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  Expired ({expiredStats.expiredCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('NEAR_ED')}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'NEAR_ED'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Near ED &le;90 hr ({expiredStats.criticalNearEdCount + expiredStats.nearEdCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('SAFE')}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'SAFE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Aman ({expiredStats.safeCount + expiredStats.mediumEdCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('VARIANCE')}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'VARIANCE'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  Ada Selisih Fisik
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-800 font-bold border-b border-slate-200 z-10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th 
                      onClick={() => handleSortToggle('no')}
                      className="py-2.5 px-3 w-12 text-center cursor-pointer hover:bg-slate-200"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>No</span>
                        {sortField === 'no' && <ArrowUpDown size={11} />}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 min-w-[110px]">Item Code</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Item Name</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Category</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Location</th>
                    <th 
                      onClick={() => handleSortToggle('last_qty_pcs')}
                      className="py-2.5 px-3 text-right min-w-[100px] cursor-pointer hover:bg-slate-200"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Last Qty (PCS)</span>
                        {sortField === 'last_qty_pcs' && <ArrowUpDown size={11} />}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSortToggle('qty_convert_ctn')}
                      className="py-2.5 px-3 text-right min-w-[90px] cursor-pointer hover:bg-slate-200"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>CTN</span>
                        {sortField === 'qty_convert_ctn' && <ArrowUpDown size={11} />}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">Selisih</th>
                    <th className="py-2.5 px-3 min-w-[95px]">Batch</th>
                    <th 
                      onClick={() => handleSortToggle('diffDays')}
                      className="py-2.5 px-3 min-w-[120px] cursor-pointer hover:bg-slate-200"
                    >
                      <div className="flex items-center gap-1">
                        <span>Expired Date</span>
                        {sortField === 'diffDays' && <ArrowUpDown size={11} />}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 min-w-[120px]">By ED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-[11px]">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400">
                        {searchQuery || statusFilter !== 'ALL'
                          ? 'Tidak ada data retur yang cocok dengan filter.'
                          : 'Belum ada data retur. Unggah file Excel atau klik "Coba Demo" di atas.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, idx) => {
                      const expAnalysis = calculateExpiryStatus(item.expired);
                      const first = Number(item.first_qty) || 0;
                      const last = Number(item.last_qty_pcs) || 0;
                      const diff = last - first;

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                            {item.item_code || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.item_name || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-medium text-[10px]">
                              {item.category || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {item.location || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatNumber(last)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-bold">
                            {formatNumber(item.qty_convert_ctn)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            diff === 0 ? 'text-slate-400' : diff < 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10.5px] text-slate-600">
                            {item.batch || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono text-[10.5px] text-slate-700">
                                {item.expired ? item.expired.slice(0, 10) : '-'}
                              </span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] border w-fit mt-0.5 ${expAnalysis.badgeClass}`}>
                                {expAnalysis.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md font-bold text-[10px] border border-rose-200">
                              {item.by_ed || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 flex justify-between items-center bg-slate-50/50 text-xs">
                <span className="text-slate-500">
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total {filteredData.length} baris)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <InventoryQrScannerModal
        isOpen={showQrScannerModal}
        onClose={() => setShowQrScannerModal(false)}
        onScanSuccess={handleQrScanHit}
      />
    </div>
  );
}
