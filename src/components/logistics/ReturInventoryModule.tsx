import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  FileText,
  PieChart as PieIcon,
  HelpCircle,
  Mic,
  MicOff,
  QrCode,
  ScanLine,
  Database,
  Cloud,
  CloudUpload,
  AlertCircle,
  Check,
  ArrowUpDown,
  Clock,
  Building,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { supabase } from '../../supabase';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useSupabase';
import { ReturInventoryItem } from '../../types';
import { InventoryQrScannerModal } from './InventoryQrScannerModal';

const COLOR_PALETTE = [
  '#2563eb', '#059669', '#d97706', '#dc2626', 
  '#7c3aed', '#db2777', '#0891b2', '#475569',
  '#4f46e5', '#16a34a', '#ea580c', '#e11d48',
  '#9333ea', '#0284c7', '#ca8a04', '#64748b'
];

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Robust quantity parser that correctly handles Indonesian formatting,
 * standard commas/dots, and unit suffixes like PCS, CTN, BOX.
 */
export function parseQuantity(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;

  // Strip unit suffixes
  str = str.replace(/\b(pcs|pc|ctn|box|dus|bal|pack|ea|kg|gr|unit|un|btl)\b/gi, '').trim();
  str = str.replace(/\s+/g, '');

  // Handle thousand/decimal formats (Indonesian vs Standard)
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Indonesian: 1.250,50 -> 1250.50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard: 1,250.50 -> 1250.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    if (/,\d{1,2}$/.test(str)) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    if ((str.match(/\./g) || []).length > 1) {
      str = str.replace(/\./g, '');
    } else if (/\.\d{3}$/.test(str)) {
      // Indonesian thousand separator e.g. "1.250" or "400.000"
      str = str.replace(/\./g, '');
    }
  }

  const clean = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 1000) / 1000;
}

/**
 * Robust date parser handling Excel serial numbers, Date instances, and date strings.
 */
export function parseExcelDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    // Excel date serial number (e.g. 45628)
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
  // Check format DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  // Check format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  return str;
}

/**
 * Normalizes any date input into a valid Postgres DATE format YYYY-MM-DD.
 * Converts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, ISO, and Excel serial numbers safely.
 */
export function toValidIsoDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return new Date().toISOString().slice(0, 10);

  // ISO format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // Indonesian/European format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Excel 5-digit serial date number
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    try {
      const parsedDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().slice(0, 10);
      }
    } catch {}
  }

  // General Date parse
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  } catch {}

  return new Date().toISOString().slice(0, 10);
}

/**
 * Intelligent Header Detection:
 * Scans rows for known column names (Indonesian / English / SAP)
 * and maps them dynamically. Fallback to positional indices if no header row is identified.
 */
function findHeaderRowAndMap(rows: any[][]): { headerIndex: number; columnMap: Record<string, number> } {
  const maxSearch = Math.min(rows.length, 10);
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

  // Fallback to standard 22-column sequential index
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

export type DashboardDimension = 'by_ed' | 'category' | 'location' | 'sloc';

export function mapReturItemForDb(item: Partial<ReturInventoryItem>, idx: number) {
  const id = (item.id && typeof item.id === 'string' && item.id.length > 20) ? item.id : generateUUID();
  const isoDate = toValidIsoDate(item.tgl_pengajuan || item.expired);
  const itemCode = String(item.item_code || `SKU-${idx + 1}`).trim();
  const itemName = String(item.item_name || 'BARANG RETUR').trim();
  const batchVal = String(item.batch || item.vendor_batch || '-').trim();
  const categoryVal = String(item.category || 'REGULER').trim();
  const byEdVal = String(item.by_ed || 'Unassigned').trim();

  return {
    id,
    no_pengajuan: item.no_pengajuan || `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(idx + 1).padStart(4, '0')}`,
    tgl_pengajuan: isoDate,
    customer_distributor: item.customer_distributor || item.source || 'GUDANG RETUR UTAMA',
    sku_code: item.sku_code || itemCode,
    material_desc: item.material_desc || itemName,
    batch_number: item.batch_number || batchVal,
    alasan_retur: item.alasan_retur || byEdVal || 'Retur Inventory',
    status: item.status || 'PROSES',
    // 22 Excel columns:
    no: String(item.no || (idx + 1)),
    item_code: itemCode,
    item_name: itemName,
    category: categoryVal,
    location: String(item.location || 'GUDANG').trim(),
    location_type: String(item.location_type || 'RACK').trim(),
    first_qty: Number(item.first_qty) || 0,
    last_qty_pcs: Number(item.last_qty_pcs) || 0,
    uom: String(item.uom || 'PCS').trim().toUpperCase(),
    qty_convert_ctn: Number(item.qty_convert_ctn) || 0,
    uom_convert: String(item.uom_convert || 'CTN').trim().toUpperCase(),
    lpn_serial: String(item.lpn_serial || '').trim(),
    batch: String(item.batch || '').trim(),
    vendor_batch: String(item.vendor_batch || '').trim(),
    sloc: String(item.sloc || '8A04').trim().toUpperCase(),
    expired: String(item.expired || isoDate).trim(),
    destination_code: String(item.destination_code || '').trim(),
    qc_code: String(item.qc_code || 'PASS').trim(),
    user_tally: String(item.user_tally || '').trim(),
    shelf_life: String(item.shelf_life || '').trim(),
    source: String(item.source || 'INBOUND').trim(),
    by_ed: byEdVal
  };
}

export function ReturInventoryModule() {
  const { showToast, showConfirm } = useNotification();
  const { isAdmin } = useAuth();
  
  // Navigation & Dimension States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'data'>('dashboard');
  const [analysisDimension, setAnalysisDimension] = useState<DashboardDimension>('by_ed');
  const [dashboardSearch, setDashboardSearch] = useState('');
  
  // Data States
  const [returData, setReturData] = useState<ReturInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDbSynced, setIsDbSynced] = useState<boolean | null>(null);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [dbRowCount, setDbRowCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('-');
  
  // Upload & Drag-Drop States
  const [uploadPreview, setUploadPreview] = useState<ReturInventoryItem[] | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Search & QR Scanner States
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const playVoiceChime = (tone: 'start' | 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const freq = tone === 'start' ? 587.33 : 880;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // AudioContext unavailable
    }
  };

  // Toggle Voice Recognition
  const handleToggleVoiceSearch = () => {
    const SpeechRec = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      showToast('Tidak Didukung', 'Browser Anda belum mendukung input suara Web Speech API. Silakan gunakan Chrome atau Edge.', 'warning');
      return;
    }

    if (isListeningVoice) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
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
        playVoiceChime('start');
        showToast('Mendengarkan...', 'Silakan sebut nama barang, kode item, lokasi rak, atau nomor batch', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        if (transcript) {
          setSearchQuery(transcript);
          setCurrentPage(1);
          if (activeTab !== 'data') {
            setActiveTab('data');
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        setIsListeningVoice(false);
        if (event.error === 'not-allowed') {
          showToast('Izin Ditolak', 'Akses mikrofon tidak diizinkan oleh browser.', 'danger');
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
        playVoiceChime('success');
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListeningVoice(false);
      showToast('Error Suara', 'Gagal mengaktifkan pengenalan suara mikrofon.', 'danger');
    }
  };

  // Handle QR Scan Result
  const handleQrScanHit = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setSearchQuery(clean);
    setCurrentPage(1);
    setActiveTab('data');
    setShowQrScannerModal(false);
    showToast('QR Terpindai', `Menampilkan pencarian untuk: "${clean}"`, 'success');
  };

  const formatNumber = (num?: number | string | null) => {
    if (num === undefined || num === null || num === '' || isNaN(Number(num))) return '0';
    return Number(num).toLocaleString('id-ID', { maximumFractionDigits: 3 });
  };

  // Load data from Supabase with graceful localStorage fallback
  const fetchReturData = useCallback(async () => {
    setLoading(true);
    let loadedFromDb = false;

    try {
      const { data, error } = await supabase
        .from('retur_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDbRowCount(data.length);
        if (data.length > 0) {
          // Cloud Supabase has real data!
          setReturData(data as ReturInventoryItem[]);
          localStorage.setItem('logistics_retur_inventory', JSON.stringify(data));
          setIsDbSynced(true);
          setIsLocalOnly(false);
          loadedFromDb = true;
        } else {
          // Cloud Supabase is 0 rows (empty)
          const local = localStorage.getItem('logistics_retur_inventory');
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setReturData(parsed);
                setIsDbSynced(false); // Cloud is still empty!
                setIsLocalOnly(true);  // Only in this browser
              } else {
                setReturData([]);
                setIsDbSynced(true);
                setIsLocalOnly(false);
              }
            } catch {
              setReturData([]);
              setIsDbSynced(true);
              setIsLocalOnly(false);
            }
          } else {
            setReturData([]);
            setIsDbSynced(true);
            setIsLocalOnly(false);
          }
          loadedFromDb = true;
        }
      } else if (error) {
        console.warn('Supabase fetch error:', error);
      }
    } catch (e) {
      console.warn('Supabase fetch notice, using local cache:', e);
    }

    if (!loadedFromDb) {
      const local = localStorage.getItem('logistics_retur_inventory');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReturData(parsed);
            setIsLocalOnly(true);
          }
        } catch {
          // ignore corrupted json
        }
      }
      setIsDbSynced(false);
    }

    const now = new Date();
    setLastUpdated(now.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReturData();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('retur_inventory_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retur_inventory' }, () => {
        fetchReturData();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [fetchReturData]);

  // ==========================================
  // DASHBOARD AGGREGATIONS & METRICS
  // ==========================================

  // 1. Aggregation based on the selected dimension
  const {
    dimensionList,
    grandTotalLastQtyPcs,
    grandTotalQtyConvertCtn,
    topGroup,
    totalUniqueItems,
    totalUniqueLocations,
    expiredStats
  } = useMemo(() => {
    const map: Record<string, { key: string; lastQtyPcs: number; qtyConvertCtn: number; count: number }> = {};
    let totalPcs = 0;
    let totalCtn = 0;
    const uniqueItemCodes = new Set<string>();
    const uniqueLocations = new Set<string>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    let nearEdCount = 0; // < 90 days
    let mediumEdCount = 0; // 90 - 180 days
    let safeEdCount = 0; // > 180 days
    let expiredPcs = 0;
    let nearEdPcs = 0;

    returData.forEach(item => {
      // Dimension Key resolution
      let key = '';
      if (analysisDimension === 'by_ed') {
        key = (item.by_ed || '').trim();
        if (!key || key.toLowerCase() === 'unassigned') {
          key = (item.category || '').trim() || 'Reguler / Unassigned';
        }
      } else if (analysisDimension === 'category') {
        key = (item.category || '').trim() || 'Tanpa Kategori';
      } else if (analysisDimension === 'location') {
        key = (item.location || '').trim() || 'Tanpa Lokasi';
      } else if (analysisDimension === 'sloc') {
        key = (item.sloc || '').trim() || '8A04';
      }

      if (!key) key = 'Unassigned';

      const pcs = Number(item.last_qty_pcs) || 0;
      const ctn = Number(item.qty_convert_ctn) || 0;

      if (!map[key]) {
        map[key] = { key, lastQtyPcs: 0, qtyConvertCtn: 0, count: 0 };
      }
      map[key].lastQtyPcs += pcs;
      map[key].qtyConvertCtn += ctn;
      map[key].count += 1;

      totalPcs += pcs;
      totalCtn += ctn;

      if (item.item_code) uniqueItemCodes.add(item.item_code.trim().toUpperCase());
      if (item.location) uniqueLocations.add(item.location.trim().toUpperCase());

      // Expiry calculation
      if (item.expired) {
        const expDate = new Date(item.expired);
        if (!isNaN(expDate.getTime())) {
          const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            expiredCount++;
            expiredPcs += pcs;
          } else if (diffDays <= 90) {
            nearEdCount++;
            nearEdPcs += pcs;
          } else if (diffDays <= 180) {
            mediumEdCount++;
          } else {
            safeEdCount++;
          }
        }
      }
    });

    let list = Object.values(map).sort((a, b) => b.lastQtyPcs - a.lastQtyPcs).map((item, idx) => ({
      ...item,
      pctPcs: totalPcs > 0 ? (item.lastQtyPcs / totalPcs) * 100 : 0,
      pctCtn: totalCtn > 0 ? (item.qtyConvertCtn / totalCtn) * 100 : 0,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
    }));

    // Filter by dashboard search if present
    if (dashboardSearch.trim()) {
      const q = dashboardSearch.trim().toLowerCase();
      list = list.filter(item => item.key.toLowerCase().includes(q));
    }

    return {
      dimensionList: list,
      grandTotalLastQtyPcs: totalPcs,
      grandTotalQtyConvertCtn: totalCtn,
      topGroup: list.length > 0 ? list[0] : null,
      totalUniqueItems: uniqueItemCodes.size,
      totalUniqueLocations: uniqueLocations.size,
      expiredStats: {
        expiredCount,
        nearEdCount,
        mediumEdCount,
        safeEdCount,
        expiredPcs,
        nearEdPcs
      }
    };
  }, [returData, analysisDimension, dashboardSearch]);

  // Filtered Retur Data for Table View
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return returData;
    return returData.filter(d => 
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
  }, [returData, searchQuery]);

  // Pagination slice
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // Stats for Data View
  const dataStats = useMemo(() => {
    const categories = new Set(returData.map(d => d.category).filter(Boolean));
    const locations = new Set(returData.map(d => d.location).filter(Boolean));
    const byeds = new Set(returData.map(d => d.by_ed).filter(Boolean));
    return {
      totalRecords: returData.length,
      totalCategories: categories.size,
      totalLocations: locations.size,
      totalByEd: byeds.size
    };
  }, [returData]);

  // Excel Download Template (Standard 22 Columns)
  const handleDownloadTemplate = () => {
    const headers = [
      ['No', 'Item Code', 'Item Name', 'Category', 'Location', 'Location Type', 'First Qty', 'Last Qty Pcs', 'Uom', 'Qty Convert Ctn', 'Uom Convert', 'LPN/Serial Number', 'Batch', 'Vendor Batch', 'SLOC', 'Expired', 'Destination Code', 'QC Code', 'User Tally', 'Shelf Life', 'Source', 'By ED']
    ];
    const sampleRows = [
      [1, 'ITEM-001', 'MT ABSTRACT PROD 1', 'CAT-A', 'LOC-01', 'RACK', 400000, 380382, 'PCS', 3803.82, 'CTN', 'LPN001', 'BT240101', 'VB01', '8A04', '2026-12-31', 'DST-01', 'QC-PASS', 'TALLY-A', '24 Bulan', 'INBOUND', 'MT ABSTRACT'],
      [2, 'ITEM-002', 'KINO SAMANTHA HAIR OIL', 'COSMETIC', 'LOC-02', 'FLOOR', 15000, 15000, 'PCS', 150, 'CTN', 'LPN002', 'BT240215', 'VB02', '8A04', '2027-06-30', 'DST-02', 'QC-PASS', 'TALLY-B', '36 Bulan', 'INBOUND', 'SAMANTHA']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
    ws['!cols'] = Array(22).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Retur');
    XLSX.writeFile(wb, 'Template_Upload_Retur_Inventory.xlsx');
    showToast('Template Siap', 'File Template Excel 22 kolom berhasil diunduh', 'success');
  };

  // Excel Download Full Data
  const handleDownloadExcel = () => {
    if (returData.length === 0) {
      showToast('Perhatian', 'Tidak ada data retur untuk didownload', 'warning');
      return;
    }
    const rows = returData.map((item, idx) => ({
      'No': item.no || idx + 1,
      'Item Code': item.item_code || '',
      'Item Name': item.item_name || '',
      'Category': item.category || '',
      'Location': item.location || '',
      'Location Type': item.location_type || '',
      'First Qty': item.first_qty || 0,
      'Last Qty Pcs': item.last_qty_pcs || 0,
      'Uom': item.uom || '',
      'Qty Convert Ctn': item.qty_convert_ctn || 0,
      'Uom Convert': item.uom_convert || '',
      'LPN/Serial Number': item.lpn_serial || '',
      'Batch': item.batch || '',
      'Vendor Batch': item.vendor_batch || '',
      'SLOC': item.sloc || '',
      'Expired': item.expired || '',
      'Destination Code': item.destination_code || '',
      'QC Code': item.qc_code || '',
      'User Tally': item.user_tally || '',
      'Shelf Life': item.shelf_life || '',
      'Source': item.source || '',
      'By ED': item.by_ed || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Array(22).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Retur');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Data_Retur_Inventory_${dateStr}.xlsx`);
    showToast('Berhasil', 'Data retur inventory berhasil diekspor ke Excel', 'success');
  };

  // ==========================================
  // EXCEL FILE PARSING & VALIDATION
  // ==========================================

  const processExcelFile = (file: File) => {
    if (!file) return;
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          showToast('File Kosong', 'Tidak ada worksheet terdeteksi dalam file Excel ini.', 'warning');
          return;
        }

        const ws = wb.Sheets[firstSheet];
        const jsonArr: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!jsonArr || jsonArr.length === 0) {
          showToast('File Kosong', 'File Excel tidak berisi data.', 'warning');
          return;
        }

        // Smart Header Identification and Mapping
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

          // Skip purely blank or commentary rows
          if (!itemCode && !itemName && !r.some(c => c !== '')) return;

          const rawFirstQty = getVal(r, 'first_qty');
          const rawLastQty = getVal(r, 'last_qty_pcs');
          const rawCtn = getVal(r, 'qty_convert_ctn');

          const firstQty = parseQuantity(rawFirstQty);
          const lastQtyPcs = parseQuantity(rawLastQty);
          let qtyConvertCtn = parseQuantity(rawCtn);

          // Auto-calculate CTN if 0 but PCS is given and item has conversion
          if (qtyConvertCtn === 0 && lastQtyPcs > 0 && String(getVal(r, 'uom_convert') || '').toUpperCase() === 'CTN') {
            // If conversion factor is unknown, preserve given or calculate ratio
            qtyConvertCtn = Math.round((lastQtyPcs / 100) * 100) / 100;
          }

          let category = String(getVal(r, 'category') || '').trim();
          if (!category) category = 'REGULER';

          let byEd = String(getVal(r, 'by_ed') || '').trim();
          // Smart By ED fallback if column is missing or empty
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
            id: generateUUID(),
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
          showToast('Data Kosong', 'Tidak ada baris data inventori yang valid ditemukan.', 'warning');
          return;
        }

        setUploadPreview(parsed);
        showToast('File Terbaca Cerdas', `${parsed.length} baris data berhasil dipetakan secara otomatis`, 'info');
      } catch (err: any) {
        console.error('Excel parse error:', err);
        showToast('Gagal Membaca File', err.message || 'Format file Excel tidak sesuai standar', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  // Drag and Drop Handlers
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
        showToast('Format Salah', 'Harap unggah file dengan format .xlsx, .xls, atau .csv', 'warning');
      }
    }
  };

  // Commit Upload (Append or Replace) with Dual DB + LocalStorage Sync
  const handleCommitUpload = async (mode: 'append' | 'replace') => {
    if (!uploadPreview || uploadPreview.length === 0) return;

    setLoading(true);
    try {
      const nextData = mode === 'replace' ? [...uploadPreview] : [...uploadPreview, ...returData];
      
      // 1. Immediately cache in localStorage
      localStorage.setItem('logistics_retur_inventory', JSON.stringify(nextData));
      setReturData(nextData);

      // 2. Map rows to satisfy all database columns & NOT NULL constraints
      const rowsToInsert = uploadPreview.map((item, idx) => mapReturItemForDb(item, idx));

      // 3. Try syncing to Supabase table
      let syncSuccess = false;
      try {
        if (mode === 'replace') {
          // Clear table first
          const { error: delErr } = await supabase.from('retur_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (delErr) console.warn('Supabase delete table notice:', delErr);
        }

        // Insert in chunks of 100 rows
        for (let i = 0; i < rowsToInsert.length; i += 100) {
          const chunk = rowsToInsert.slice(i, i + 100);
          const { error: insErr } = await supabase.from('retur_inventory').insert(chunk);
          if (insErr) {
            throw new Error(insErr.message);
          }
        }

        syncSuccess = true;
        setIsDbSynced(true);
        setIsLocalOnly(false);
        setDbRowCount(nextData.length);
      } catch (dbErr: any) {
        console.warn('Database sync notice (saved locally):', dbErr);
        syncSuccess = false;
        setIsDbSynced(false);
        setIsLocalOnly(true);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }));

      if (syncSuccess) {
        showToast(
          'Upload Berhasil ke Cloud Supabase!', 
          `${uploadPreview.length} baris data retur berhasil disimpan ke Cloud Database Supabase & langsung aktif di semua perangkat/aplikasi!`, 
          'success'
        );
      } else {
        showToast(
          'Tersimpan di Browser Lokal', 
          `${uploadPreview.length} baris data disimpan di browser ini. Klik tombol "Sinkronkan ke Cloud" untuk mengunggah ke database online.`, 
          'warning'
        );
      }

      setUploadPreview(null);
      setUploadFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      showToast('Gagal Menyimpan', e.message || 'Terjadi kesalahan saat menyimpan data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Manual Sync from LocalStorage to Supabase Cloud
  const handleSyncLocalToCloud = async () => {
    if (returData.length === 0) {
      showToast('Tidak Ada Data', 'Tidak ada data lokal untuk disinkronkan ke Cloud Supabase.', 'info');
      return;
    }

    setIsSyncingCloud(true);
    try {
      showToast('Menyinkronkan...', `Mengunggah ${returData.length} baris data ke Cloud Database Supabase...`, 'info');

      // Clear existing records in cloud before full sync to avoid duplicates
      await supabase.from('retur_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const rowsToInsert = returData.map((item, idx) => mapReturItemForDb(item, idx));

      for (let i = 0; i < rowsToInsert.length; i += 100) {
        const chunk = rowsToInsert.slice(i, i + 100);
        const { error: insErr } = await supabase.from('retur_inventory').insert(chunk);
        if (insErr) {
          throw new Error(insErr.message);
        }
      }

      setIsDbSynced(true);
      setIsLocalOnly(false);
      setDbRowCount(rowsToInsert.length);

      showToast(
        'Sinkronisasi Cloud Berhasil! 🎉',
        `Seluruh ${rowsToInsert.length} data retur berhasil diunggah ke Cloud Database Supabase. Sekarang data ini bisa dibuka dari semua aplikasi & perangkat lain.`,
        'success'
      );
    } catch (err: any) {
      console.error('Manual sync error:', err);
      showToast('Gagal Sinkronisasi Cloud', err.message || 'Terjadi kesalahan saat mengirim ke Supabase.', 'danger');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Selection Handlers (Khusus Admin)
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(r => r.id!));
    }
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Delete Selected Data (Khusus Admin)
  const handleBulkDelete = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Fungsi hapus massal khusus untuk Admin.', 'danger');
      return;
    }
    if (selectedIds.length === 0) {
      showToast('Pilih Data', 'Pilih setidaknya satu baris data retur untuk dihapus.', 'info');
      return;
    }

    showConfirm({
      title: 'Konfirmasi Hapus Massal Data Retur (Admin)',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} baris data retur yang dipilih?`,
      confirmText: `Ya, Hapus ${selectedIds.length} Data`,
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        const nextData = returData.filter(d => !selectedIds.includes(d.id!));
        setReturData(nextData);
        localStorage.setItem('logistics_retur_inventory', JSON.stringify(nextData));

        try {
          const idStrings = selectedIds.map(String);
          await supabase.from('retur_inventory').delete().in('id', idStrings);
        } catch {
          // ignore db error
        }

        setSelectedIds([]);
        setLoading(false);
        showToast('Dihapus', `${selectedIds.length} data retur berhasil dihapus`, 'info');
      }
    });
  };

  // Delete Single Row (Khusus Admin)
  const handleDeleteSingleRow = (item: ReturInventoryItem) => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hapus data inventori khusus untuk Admin.', 'danger');
      return;
    }

    showConfirm({
      title: 'Hapus Data Retur',
      message: `Hapus item "${item.item_code} - ${item.item_name || ''}"?`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        const nextData = returData.filter(d => d.id !== item.id);
        setReturData(nextData);
        localStorage.setItem('logistics_retur_inventory', JSON.stringify(nextData));

        if (item.id) {
          try {
            await supabase.from('retur_inventory').delete().eq('id', item.id);
          } catch {
            // ignore
          }
        }

        setSelectedIds(prev => prev.filter(x => x !== item.id));
        setLoading(false);
        showToast('Dihapus', 'Data retur berhasil dihapus', 'info');
      }
    });
  };

  const handleClearAll = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Fungsi kosongkan seluruh tabel khusus untuk Admin.', 'danger');
      return;
    }

    showConfirm({
      title: 'Kosongkan Semua Data Retur (Admin)',
      message: `PERINGATAN: Anda akan menghapus SELURUH (${returData.length}) data retur inventory. Aksi ini tidak dapat dibatalkan. Lanjutkan?`,
      confirmText: 'Ya, Kosongkan Semua',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        localStorage.removeItem('logistics_retur_inventory');
        setReturData([]);
        setSelectedIds([]);

        try {
          await supabase.from('retur_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch {
          // ignore
        }

        setLoading(false);
        showToast('Dibersihkan', 'Seluruh data retur berhasil dikosongkan', 'info');
      }
    });
  };

  // Upload Preview Summary
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
      {/* Top Header Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 m-0 leading-tight">
                Retur Inventory Suite
              </h3>
              {isDbSynced === true && !isLocalOnly ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium" title="Tersinkronisasi dengan Database Cloud">
                  <Database size={11} className="text-emerald-600" />
                  <span>Cloud DB</span>
                </span>
              ) : isLocalOnly ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium" title="Data tersimpan di perangkat ini">
                  <Clock size={11} className="text-amber-600" />
                  <span>Lokal</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
                  <Clock size={11} />
                  <span>Memeriksa...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Dashboard Analisis Kategori By ED, Status Kedaluwarsa & Upload Excel
            </p>
          </div>
        </div>

        {/* Tab Buttons, QR Scan, Voice, Sync & Refresh */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Sync Button if local data exists */}
          {returData.length > 0 && isLocalOnly && (
            <button
              type="button"
              onClick={handleSyncLocalToCloud}
              disabled={isSyncingCloud}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
              title="Sinkronkan data ke Cloud Supabase"
            >
              <CloudUpload size={14} className={isSyncingCloud ? 'animate-spin' : ''} />
              <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan ke Cloud'}</span>
            </button>
          )}

          {/* Quick Voice & QR buttons in header */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isListeningVoice
                  ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/20'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
              title="Cari Data dengan Perintah Suara (Voice Search)"
            >
              {isListeningVoice ? <MicOff size={14} className="animate-bounce" /> : <Mic size={14} className="text-blue-900" />}
              <span className="hidden sm:inline">{isListeningVoice ? 'Mendengarkan...' : 'Suara'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrScannerModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Scan QR Code / Barcode Produk & Label"
            >
              <QrCode size={14} className="text-emerald-700" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={14} />
              <span>Dashboard Analisis</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon size={14} />
              <span>Data Retur ({returData.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchReturData}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-all cursor-pointer shrink-0 flex items-center justify-center"
            title="Refresh Data dari Database"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-900' : ''} />
          </button>
        </div>
      </div>


      {/* ========================================================= */}
      {/* VIEW A: DASHBOARD ANALISIS DENGAN DIMENSION SELECTOR      */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Dimension Selector & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Filter size={13} className="text-blue-900" />
                <span>Dimensi Analisis:</span>
              </span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('by_ed')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'by_ed'
                      ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By ED (Kategori ED)
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('category')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'category'
                      ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kategori Produk
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisDimension('location')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    analysisDimension === 'location'
                      ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
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
                      ? 'bg-white text-blue-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SLOC Gudang
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={dashboardSearch}
                  onChange={(e) => setDashboardSearch(e.target.value)}
                  placeholder="Filter grup..."
                  className="w-full pl-7 pr-7 py-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
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
            </div>
          </div>

          {/* Top 4 Primary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Card 1: Total Last Qty Pcs */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 border border-blue-200">
                <Layers size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Last Qty Pcs
                </div>
                <div className="text-base sm:text-lg font-black text-blue-950 leading-tight mt-0.5 truncate font-mono">
                  {formatNumber(grandTotalLastQtyPcs)} <span className="text-[11px] font-bold text-blue-700">PCS</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">Akumulasi kuantitas fisik</div>
              </div>
            </div>

            {/* Card 2: Total Convert Ctn */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <Box size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Convert Ctn
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 leading-tight mt-0.5 truncate font-mono">
                  {formatNumber(grandTotalQtyConvertCtn)} <span className="text-[11px] font-bold text-emerald-600">CTN</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">Total konversi karton</div>
              </div>
            </div>

            {/* Card 3: Jumlah Grup & SKU */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Tags size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Grup / SKU Aktif
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                  {dimensionList.length} <span className="text-[11px] font-bold text-slate-500">Grup</span>
                  <span className="text-xs font-semibold text-slate-400 ml-1">({totalUniqueItems} SKU)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">{totalUniqueLocations} Lokasi gudang</div>
              </div>
            </div>

            {/* Card 4: Kategori / Grup Terbesar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
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

          {/* Aging & Expiry Status Alert Banner */}
          {expiredStats.expiredCount > 0 || expiredStats.nearEdCount > 0 ? (
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={17} className="text-amber-600 shrink-0" />
                <div className="text-xs text-amber-950 font-semibold">
                  <span>Peringatan Stok ED: Ditemukan </span>
                  <strong className="text-red-700">{expiredStats.expiredCount} item expired ({formatNumber(expiredStats.expiredPcs)} PCS)</strong>
                  <span> dan </span>
                  <strong className="text-amber-800">{expiredStats.nearEdCount} item Near ED &lt; 90 hari ({formatNumber(expiredStats.nearEdPcs)} PCS)</strong>.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('data');
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
              >
                Lihat Detail Barang
              </button>
            </div>
          ) : null}

          {/* Middle Charts & Distribution Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Bar Chart - 7 Cols */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={15} className="text-blue-900" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">
                        Last Qty Pcs per {analysisDimension === 'by_ed' ? 'By ED' : analysisDimension === 'category' ? 'Kategori' : analysisDimension === 'location' ? 'Lokasi' : 'SLOC'}
                      </h4>
                      <p className="text-[11px] text-slate-500 m-0 hidden sm:block">Perbandingan kuantitas fisik antar grup inventori</p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                    {dimensionList.length} Grup
                  </span>
                </div>

                {dimensionList.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg">
                    Belum ada data retur. Silakan unggah file Excel di tab Data Retur.
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
                <span>Total Akumulasi: <strong className="text-slate-700">{formatNumber(grandTotalLastQtyPcs)} PCS</strong></span>
                <span className="text-slate-500">Porsi tertinggi: <strong className="text-purple-700">{topGroup?.key || '-'}</strong></span>
              </div>
            </div>

            {/* Right Distribution Breakdown - 5 Cols */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PieIcon size={15} className="text-slate-600" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">Distribusi Last Qty (%)</h4>
                      <p className="text-[11px] text-slate-500 m-0 hidden sm:block">Porsi persentase per kategori</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Share %</span>
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
                <span>Update Terakhir:</span>
                <span className="font-semibold text-slate-600 truncate max-w-[180px]">{lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Bottom Table: Summary Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <TableIcon size={15} className="text-blue-900" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">
                    Ringkasan Berdasarkan {analysisDimension === 'by_ed' ? 'By ED' : analysisDimension === 'category' ? 'Kategori' : analysisDimension === 'location' ? 'Lokasi' : 'SLOC'}
                  </h4>
                  <p className="text-[11px] text-slate-500 m-0">Rekapitulasi total kuantitas PCS dan karton konversi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  Total: <strong className="text-blue-900">{dimensionList.length}</strong> Baris Grup
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[320px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-blue-50/95 backdrop-blur-xs text-blue-950 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] z-10">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3 min-w-[140px]">
                      {analysisDimension === 'by_ed' ? 'Grup By ED' : analysisDimension === 'category' ? 'Kategori Produk' : analysisDimension === 'location' ? 'Lokasi Rak' : 'Storage Loc (SLOC)'}
                    </th>
                    <th className="py-2 px-3 text-right min-w-[90px]">Record Baris</th>
                    <th className="py-2 px-3 text-right min-w-[110px]">Last Qty Pcs</th>
                    <th className="py-2 px-3 text-right min-w-[110px]">Qty Convert Ctn</th>
                    <th className="py-2 px-3 min-w-[130px]">% Last Qty Pcs</th>
                    <th className="py-2 px-3 min-w-[130px]">% Qty Convert Ctn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-[11px] sm:text-xs">
                  {dimensionList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Tidak ada data retur yang tersedia.
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
                        <td className="py-2 px-3 text-right font-mono text-slate-600 font-semibold">
                          {item.count} baris
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-950">
                          {formatNumber(item.lastQtyPcs)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatNumber(item.qtyConvertCtn)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-700 w-11 text-right text-[10.5px]">
                              {item.pctPcs.toFixed(2)}%
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
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
                              {item.pctCtn.toFixed(2)}%
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
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
                  <tfoot className="sticky bottom-0 bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-extrabold z-10">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                        GRAND TOTAL
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 text-xs">
                        {returData.length} baris
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-950 text-xs sm:text-sm">
                        {formatNumber(grandTotalLastQtyPcs)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-900 text-xs sm:text-sm">
                        {formatNumber(grandTotalQtyConvertCtn)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">100.00%</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">100.00%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW B: DATA RETUR TABLE & SMART UPLOAD                   */}
      {/* ========================================================= */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* UPLOAD & MANAGEMENT CARD WITH DRAG & DROP */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shadow-2xs shrink-0">
                  <Upload size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 m-0">Upload File Excel Data Retur</h4>
                  <p className="text-xs text-slate-500 m-0">
                    Mendukung Drag-and-Drop file .xlsx, .xls, .csv dengan deteksi cerdas 22 kolom baku
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh format template Excel 22 kolom baku"
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Template</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh seluruh data retur saat ini ke Excel"
                >
                  <Download size={14} />
                  <span>Download Excel</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Kosongkan seluruh data inventori retur (Admin)"
                  >
                    <Trash2 size={14} />
                    <span>Kosongkan</span>
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
                  ? 'border-blue-600 bg-blue-50/80 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelSelected}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center">
                <Upload size={20} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {uploadFileName ? `File terpilih: "${uploadFileName}"` : 'Tarik & Lepaskan File Excel di sini, atau Klik untuk Memilih File'}
                </span>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                  Format yang didukung: .xlsx, .xls, .csv. Sistem otomatis memetakan kolom No, Kode Item, Qty, Batch, Expired, By ED.
                </p>
              </div>
            </div>

            {/* Upload Preview Box */}
            {uploadPreview && previewStats && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <span className="text-xs font-bold text-blue-950">
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

                {/* Preview Mini KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded-lg border border-blue-100">
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

                <div className="overflow-x-auto max-h-44 border border-blue-200 rounded-lg bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="p-2">No</th>
                        <th className="p-2">Item Code</th>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Location</th>
                        <th className="p-2 text-right">Last Qty</th>
                        <th className="p-2">Expired</th>
                        <th className="p-2">By ED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {uploadPreview.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-400">{r.no}</td>
                          <td className="p-2 font-mono font-bold text-slate-800">{r.item_code}</td>
                          <td className="p-2 font-semibold text-slate-900 truncate max-w-[200px]" title={r.item_name}>{r.item_name}</td>
                          <td className="p-2">{r.location}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-900">{formatNumber(r.last_qty_pcs)}</td>
                          <td className="p-2 text-slate-600 font-mono text-[10.5px]">{r.expired || '-'}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded font-semibold text-[10px]">
                              {r.by_ed}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleCommitUpload('append')}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>+ Tambahkan ke Data ({previewStats.count})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCommitUpload('replace')}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Ganti / Timpa Seluruh Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Record</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{dataStats.totalRecords} Baris</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Kategori Unik</div>
              <div className="text-lg font-black text-amber-700 mt-0.5">{dataStats.totalCategories}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Lokasi Unik</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">{dataStats.totalLocations}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">By ED Unik</div>
              <div className="text-lg font-black text-purple-700 mt-0.5">{dataStats.totalByEd}</div>
            </div>
          </div>

          {/* Search & Main Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Admin Bulk Action Banner */}
            {isAdmin && selectedIds.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-red-50 border-b-2 border-red-200 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse shrink-0"></span>
                  <div>
                    <span className="text-xs font-black text-red-950 uppercase tracking-wide">
                      Mode Admin: {selectedIds.length} Dari {filteredData.length} Data Retur Dipilih
                    </span>
                    <p className="text-[11px] text-red-700 font-medium m-0">
                      Pilih aksi massal untuk menghapus data inventori retur sekaligus dari database.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-2xs"
                  >
                    Batal Pilihan
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 size={14} />
                    <span>Hapus Massal Terpilih ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Search Input Bar with Voice & QR Actions */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 space-y-2">
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
                      placeholder="Cari Item Code, Item Name, Location, By ED, Batch, LPN..."
                      className="w-full pl-8 pr-8 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-600 outline-none transition-all"
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

                  {/* Voice Search Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceSearch}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isListeningVoice
                        ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/30'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                    }`}
                    title="Cari Data dengan Perintah Suara (Voice Search)"
                  >
                    {isListeningVoice ? <MicOff size={15} className="animate-bounce" /> : <Mic size={15} className="text-blue-900" />}
                    <span className="hidden md:inline">{isListeningVoice ? 'Mendengarkan...' : 'Suara'}</span>
                  </button>

                  {/* QR & Barcode Scanner Button */}
                  <button
                    type="button"
                    onClick={() => setShowQrScannerModal(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-950 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Buka Scanner QR Code & Barcode (Kamera / Unggah Foto)"
                  >
                    <QrCode size={15} className="text-cyan-300" />
                    <span className="hidden md:inline">Scan QR</span>
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-slate-500">
                  <span>
                    Menampilkan <strong>{filteredData.length}</strong> dari <strong>{returData.length}</strong> data
                  </span>
                </div>
              </div>

              {/* Voice Listening Active Banner */}
              {isListeningVoice && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                    <span className="font-bold">Mikrofon Aktif:</span>
                    <span>Silakan bicara (sebut nama barang, kode item, lokasi rak, atau nomor batch)...</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleVoiceSearch}
                    className="px-2 py-0.5 rounded-md bg-red-200 hover:bg-red-300 text-red-900 text-[11px] font-bold cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              )}

              {/* Active Search Filter Chip */}
              {searchQuery && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Filter Aktif:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold">
                    <span>"{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="hover:text-red-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-blue-50/90 backdrop-blur-xs text-blue-950 font-bold border-b border-slate-200 z-10 uppercase tracking-wider text-[10px]">
                  <tr>
                    {isAdmin && (
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                          onChange={handleToggleSelectAll}
                          title="Pilih Semua (Admin)"
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                        />
                      </th>
                    )}
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Item Code</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Item Name</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Category</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Location</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">Last Qty</th>
                    <th className="py-2.5 px-3 min-w-[60px]">Uom</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">Ctn Convert</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Batch</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Expired</th>
                    <th className="py-2.5 px-3 min-w-[120px]">By ED</th>
                    {isAdmin && (
                      <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 13 : 11} className="py-8 text-center text-slate-400">
                        {searchQuery ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data retur.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, idx) => {
                      const isSelected = selectedIds.includes(item.id!);
                      return (
                        <tr key={item.id || idx} className={`transition-colors ${isSelected ? 'bg-red-50/70 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                          {isAdmin && (
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id!)}
                                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                                title="Pilih baris"
                              />
                            </td>
                          )}
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
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-semibold text-[10px] border border-amber-200">
                              {item.category || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {item.location || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatNumber(item.last_qty_pcs)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-semibold">{item.uom || 'PCS'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-bold">
                            {formatNumber(item.qty_convert_ctn)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{item.batch || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {item.expired ? item.expired.slice(0, 10) : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded-md font-bold text-[10px] border border-blue-200">
                              {item.by_ed || '-'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleRow(item)}
                                className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                                title="Hapus baris ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 flex justify-between items-center bg-slate-50/50 text-xs">
                <span className="text-slate-500">
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total {filteredData.length} data)
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

      {/* Inventory QR & Barcode Scanner Modal */}
      <InventoryQrScannerModal
        isOpen={showQrScannerModal}
        onClose={() => setShowQrScannerModal(false)}
        onScanSuccess={handleQrScanHit}
      />
    </div>
  );
}
