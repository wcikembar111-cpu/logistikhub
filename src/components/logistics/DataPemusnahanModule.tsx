import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Plus,
  Edit2,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  FileSpreadsheet,
  Layers,
  Box,
  Coins,
  Download,
  UploadCloud,
  ArrowUpDown,
  Database,
  AlertCircle,
  AlertTriangle,
  Copy,
  Code2,
  ExternalLink,
  Table as TableIcon,
  Filter,
  Check,
  Calendar,
  Sparkles,
  ClipboardPaste
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useSupabase';
import { DataPemusnahanItem } from '../../types';

const STORAGE_KEY = 'ckb_data_pemusnahan_items_v1';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycby5KFkXtBiXWEJ1G7CSLhRippGbA-k8WbV4QQFyNfur1ktnS6oNbcnsboFrBCLVXlxN/exec';
const DEFAULT_SHEET_NAME = 'Pemusnahan';

// Initial sample data based on user specification
const INITIAL_SAMPLE_DATA: DataPemusnahanItem[] = [
  {
    id: 'seed-pms-0313',
    id_pemusnahan: 'PMS-20260827-8791-0313',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 4,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0314',
    id_pemusnahan: 'PMS-20260827-8791-0314',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0315',
    id_pemusnahan: 'PMS-20260827-8791-0315',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0316',
    id_pemusnahan: 'PMS-20260827-8791-0316',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0317',
    id_pemusnahan: 'PMS-20260827-8791-0317',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0318',
    id_pemusnahan: 'PMS-20260827-8791-0318',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0319',
    id_pemusnahan: 'PMS-20260827-8791-0319',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0320',
    id_pemusnahan: 'PMS-20260827-8791-0320',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0321',
    id_pemusnahan: 'PMS-20260827-8791-0321',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  },
  {
    id: 'seed-pms-0322',
    id_pemusnahan: 'PMS-20260827-8791-0322',
    item_code: 'FG16146.838.0100.P',
    nama_barang: 'CLICK TP WHITE+BACTERIA TEA JASM 100G TB',
    kategori: '-',
    lokasi: 'CKB-FG1-AF-11-1A',
    tipe_lokasi: '-',
    qty_awal: 0,
    qty_akhir: 8,
    uom: 'TUB',
    qty_convert: 0,
    uom_convert: 'Car',
    lpn_sn: 'FGKINO3',
    batch: '911573',
    vendor_batch: '911573',
    sloc: '8A03',
    expired_date: '03/07/2026',
    kode_tujuan: '-',
    status_qc: '-',
    user_tally: '-',
    shelf_life: '-',
    sumber: '-',
    tujuan: 'Pengajuan Sept 26 - W1',
    user_input: 'Dede  Administrator',
    tanggal_update: '27/08/2026',
    status: '-',
    catatan: '-'
  }
];

function generateId(): string {
  return 'pms-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
}

function normalizeKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseItemFromRow(row: Record<string, any> | any[], idx: number): DataPemusnahanItem {
  // If row is a raw array, convert to indexed object or map directly
  const isArr = Array.isArray(row);

  const getVal = (possibleKeys: string[], colIndex: number, defaultVal = '-'): string => {
    if (isArr) {
      if (row[colIndex] !== undefined && row[colIndex] !== null && String(row[colIndex]).trim() !== '') {
        return String(row[colIndex]).trim();
      }
    } else if (typeof row === 'object' && row !== null) {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return String(row[key]).trim();
        }
      }
      // Also try normalized comparison
      const normKeys = possibleKeys.map(k => normalizeKey(k));
      for (const rk of Object.keys(row)) {
        const nRk = normalizeKey(rk);
        if (normKeys.includes(nRk) && row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return String(row[rk]).trim();
        }
      }
      // Check numerical key fallback e.g. row[0]
      if (row[colIndex] !== undefined && row[colIndex] !== null && String(row[colIndex]).trim() !== '') {
        return String(row[colIndex]).trim();
      }
    }
    return defaultVal;
  };

  const getNum = (possibleKeys: string[], colIndex: number, defaultNum = 0): number => {
    const raw = getVal(possibleKeys, colIndex, '');
    if (!raw) return defaultNum;
    const clean = raw.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? defaultNum : num;
  };

  // The exact 26 columns in spreadsheet:
  // 1: ID Pemusnahan (Col 0)
  // 2: Item Code (Col 1)
  // 3: Nama Barang (Col 2)
  // 4: Kategori (Col 3)
  // 5: Lokasi (Col 4)
  // 6: Tipe Lokasi (Col 5)
  // 7: Qty Awal (Col 6)
  // 8: Qty Akhir (Col 7)
  // 9: UOM (Col 8)
  // 10: Qty Convert (Col 9)
  // 11: UOM Convert (Col 10)
  // 12: LPN / SN (Col 11)
  // 13: Batch (Col 12)
  // 14: Vendor Batch (Col 13)
  // 15: SLOC (Col 14)
  // 16: Expired Date (Col 15)
  // 17: Kode Tujuan (Col 16)
  // 18: Status QC (Col 17)
  // 19: User Tally (Col 18)
  // 20: Shelf Life (Col 19)
  // 21: Sumber (Col 20)
  // 22: Tujuan (Col 21)
  // 23: User Input (Col 22)
  // 24: Tanggal Update (Col 23)
  // 25: Status (Col 24)
  // 26: Catatan / Note (Col 25)

  const idPms = getVal(['ID Pemusnahan', 'id_pemusnahan', 'ID_Pemusnahan', 'ID PMS', 'idPemusnahan', 'ID'], 0, `PMS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(idx + 1).padStart(4, '0')}`);
  const itemCode = getVal(['Item Code', 'item_code', 'ItemCode', 'Material', 'Kode Barang', 'SKU'], 1, '-');
  const namaBarang = getVal(['Nama Barang', 'nama_barang', 'NamaBarang', 'Deskripsi', 'Description', 'Material Description'], 2, '-');
  const kategori = getVal(['Kategori', 'kategori', 'Category'], 3, '-');
  const lokasi = getVal(['Lokasi', 'lokasi', 'Location', 'Bin', 'Rak'], 4, '-');
  const tipeLokasi = getVal(['Tipe Lokasi', 'tipe_lokasi', 'TipeLokasi', 'Location Type'], 5, '-');
  const qtyAwal = getNum(['Qty Awal', 'qty_awal', 'QtyAwal', 'First Qty', 'Qty Awal (Pcs)'], 6, 0);
  const qtyAkhir = getNum(['Qty Akhir', 'qty_akhir', 'QtyAkhir', 'Last Qty', 'Qty', 'Qty (Pcs)'], 7, 0);
  const uom = getVal(['UOM', 'uom', 'Satuan', 'Unit'], 8, 'PCS');
  const qtyConvert = getNum(['Qty Convert', 'qty_convert', 'QtyConvert', 'Qty Ctn', 'Carton'], 9, 0);
  const uomConvert = getVal(['UOM Convert', 'uom_convert', 'UOMConvert', 'Satuan Convert'], 10, '-');
  const lpnSn = getVal(['LPN / SN', 'lpn_sn', 'LPN', 'SN', 'LPN/SN', 'Pallet'], 11, '-');
  const batch = getVal(['Batch', 'batch', 'Kode Batch', 'Lot', 'Batch Number'], 12, '-');
  const vendorBatch = getVal(['Vendor Batch', 'vendor_batch', 'VendorBatch', 'Batch Vendor'], 13, batch);
  const sloc = getVal(['SLOC', 'sloc', 'SLoc', 'Storage Location', 'Gudang'], 14, '8A03');
  const expiredDate = getVal(['Expired Date', 'expired_date', 'ExpiredDate', 'ED', 'SLED', 'Kadaluarsa'], 15, '-');
  const kodeTujuan = getVal(['Kode Tujuan', 'kode_tujuan', 'KodeTujuan'], 16, '-');
  const statusQc = getVal(['Status QC', 'status_qc', 'StatusQC', 'QC'], 17, '-');
  const userTally = getVal(['User Tally', 'user_tally', 'UserTally', 'Tally'], 18, '-');
  const shelfLife = getVal(['Shelf Life', 'shelf_life', 'ShelfLife'], 19, '-');
  const sumber = getVal(['Sumber', 'sumber', 'Source'], 20, '-');
  const tujuan = getVal(['Tujuan', 'tujuan', 'Destination', 'Pengajuan'], 21, '-');
  const userInput = getVal(['User Input', 'user_input', 'UserInput', 'User', 'Admin'], 22, 'Dede Administrator');
  const tanggalUpdate = getVal(['Tanggal Update', 'tanggal_update', 'TanggalUpdate', 'Date', 'Tanggal'], 23, new Date().toLocaleDateString('id-ID'));
  const status = getVal(['Status', 'status'], 24, '-');
  const catatan = getVal(['Catatan / Note', 'catatan', 'Catatan', 'Note', 'Catatan / Note', 'Keterangan'], 25, '-');

  const rowObj = !isArr && typeof row === 'object' && row !== null ? row : {};

  return {
    id: rowObj.id || generateId(),
    id_pemusnahan: idPms,
    item_code: itemCode,
    nama_barang: namaBarang,
    kategori,
    lokasi,
    tipe_lokasi: tipeLokasi,
    qty_awal: qtyAwal,
    qty_akhir: qtyAkhir,
    uom,
    qty_convert: qtyConvert,
    uom_convert: uomConvert,
    lpn_sn: lpnSn,
    batch,
    vendor_batch: vendorBatch,
    sloc,
    expired_date: expiredDate,
    kode_tujuan: kodeTujuan,
    status_qc: statusQc,
    user_tally: userTally,
    shelf_life: shelfLife,
    sumber,
    tujuan,
    user_input: userInput,
    tanggal_update: tanggalUpdate,
    status,
    catatan
  };
}

export function DataPemusnahanModule() {
  const { showToast, showConfirm } = useNotification();
  const { isAdmin } = useAuth();

  const [items, setItems] = useState<DataPemusnahanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [selectedTujuan, setSelectedTujuan] = useState<string>('all');
  const [selectedSloc, setSelectedSloc] = useState<string>('all');
  const [selectedUom, setSelectedUom] = useState<string>('all');

  // View Mode: 'utama' | 'operasional' | 'lengkap'
  const [viewMode, setViewMode] = useState<'utama' | 'operasional' | 'lengkap'>('utama');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selected row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [showPullGasModal, setShowPullGasModal] = useState(false);
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Form states
  const [editingItem, setEditingItem] = useState<DataPemusnahanItem | null>(null);
  const [detailItem, setDetailItem] = useState<DataPemusnahanItem | null>(null);
  const [formData, setFormData] = useState<Partial<DataPemusnahanItem>>({});

  // GAS Pull Form States
  const [gasUrl, setGasUrl] = useState(DEFAULT_GAS_URL);
  const [sheetName, setSheetName] = useState(DEFAULT_SHEET_NAME);
  const [pullMode, setPullMode] = useState<'overwrite' | 'append'>('overwrite');
  const [isPullingGas, setIsPullingGas] = useState(false);
  const [pullStatusMsg, setPullStatusMsg] = useState('');
  const [pasteRawText, setPasteRawText] = useState('');
  const [gasActiveTab, setGasActiveTab] = useState<'api' | 'paste' | 'script'>('api');

  // Render badge helper for status
  const renderStatusBadge = (statusStr?: string) => {
    const s = String(statusStr || '-').trim();
    const upper = s.toUpperCase();
    if (
      upper === 'SELESAI' || 
      upper === 'CLOSE' || 
      upper === 'CLOSED' || 
      upper === 'DONE' || 
      upper === 'ACC' || 
      upper === 'DISETUJUI' || 
      upper === 'SUDAH' ||
      upper === 'OK'
    ) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1">
          <CheckCircle2 size={11} className="text-emerald-600" />
          {s}
        </span>
      );
    }
    if (
      upper === 'PROSES' || 
      upper === 'PENGAJUAN' || 
      upper === 'OPEN' || 
      upper.includes('PROSES') || 
      upper.includes('BAP') ||
      upper.includes('REVIEW')
    ) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          {s}
        </span>
      );
    }
    if (upper === 'DITOLAK' || upper === 'REJECT' || upper === 'BATAL') {
      return (
        <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-800 border border-red-200 font-bold text-[11px] inline-flex items-center gap-1">
          <AlertTriangle size={11} className="text-red-500" />
          {s}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
        {s || '-'}
      </span>
    );
  };

  // Load Initial Data from localStorage or Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Try fetching from Supabase table public.data_pemusnahan
      if (supabase) {
        const { data, error } = await supabase
          .from('data_pemusnahan')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setItems(data as DataPemusnahanItem[]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // Ignore parse error
        }
      }

      // 3. Fallback to Initial Sample Data
      setItems(INITIAL_SAMPLE_DATA);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_DATA));
    } catch (err) {
      console.error('Gagal memuat data pemusnahan:', err);
      setItems(INITIAL_SAMPLE_DATA);
    } finally {
      setLoading(false);
    }
  };

  // Sync to Supabase & localStorage
  const persistItems = async (newItems: DataPemusnahanItem[], notify = false) => {
    setItems(newItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));

    if (supabase) {
      try {
        setSyncingCloud(true);
        // Upsert items into Supabase
        const { error } = await supabase
          .from('data_pemusnahan')
          .upsert(newItems, { onConflict: 'id' });

        if (error) {
          console.warn('Supabase sync note:', error.message);
        } else if (notify) {
          showToast('Tersimpan di Cloud', 'Data berhasil disinkronkan ke Supabase', 'success');
        }
      } catch (e) {
        console.error('Gagal sinkronisasi Supabase:', e);
      } finally {
        setSyncingCloud(false);
      }
    }
  };

  // Full Push to Supabase
  const handleFullSyncToCloud = async () => {
    if (!supabase) {
      showToast('Offline Mode', 'Supabase belum terkonfigurasi. Data tersimpan di penyimpanan lokal browser.', 'info');
      return;
    }
    setSyncingCloud(true);
    try {
      const { error } = await supabase
        .from('data_pemusnahan')
        .upsert(items, { onConflict: 'id' });

      if (error) {
        showToast('Info Database', `Tabel belum ada atau akses terbatas: ${error.message}. Klik "SQL Schema" untuk melihat panduan setup.`, 'warning');
      } else {
        showToast('Sinkronisasi Sukses', `${items.length} baris data berhasil disinkronkan ke tabel Supabase.`, 'success');
      }
    } catch (err: any) {
      showToast('Gagal', err.message || 'Terjadi kesalahan sinkronisasi', 'danger');
    } finally {
      setSyncingCloud(false);
    }
  };

  // Handle GAS Pull
  const handlePullFromGas = async () => {
    setIsPullingGas(true);
    setPullStatusMsg('Menghubungkan ke Google Apps Script...');

    try {
      let rawData: any = null;

      // 1. Try server proxy first
      try {
        const res = await fetch('/api/fetch-gas-pemusnahan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gasUrl: gasUrl.trim(),
            sheetName: sheetName.trim(),
            action: 'read'
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            rawData = json.data;
          } else if (json.data && json.data.data && Array.isArray(json.data.data)) {
            rawData = json.data.data;
          } else if (json.fullResponse?.data && Array.isArray(json.fullResponse.data)) {
            rawData = json.fullResponse.data;
          } else if (json.text) {
            // Check if returned CSV text or JSON string
            try {
              const parsed = JSON.parse(json.text);
              if (Array.isArray(parsed)) rawData = parsed;
              else if (Array.isArray(parsed?.data)) rawData = parsed.data;
            } catch {
              const parsedCsv = parseCsvText(json.text);
              if (parsedCsv.length > 0) rawData = parsedCsv;
            }
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch attempt note:', proxyErr);
      }

      // 2. Direct browser fetch if proxy returned no data
      if (!rawData) {
        setPullStatusMsg('Mencoba koneksi langsung browser...');
        const urlObj = new URL(gasUrl.trim());
        urlObj.searchParams.set('sheet', sheetName.trim());
        urlObj.searchParams.set('action', 'read');

        const directRes = await fetch(urlObj.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (directRes.ok) {
          const data = await directRes.json();
          if (Array.isArray(data)) {
            rawData = data;
          } else if (data.data && Array.isArray(data.data)) {
            rawData = data.data;
          }
        }
      }

      // 3. Process pulled data
      if (rawData && Array.isArray(rawData) && rawData.length > 0) {
        const parsedItems: DataPemusnahanItem[] = rawData.map((row: any, idx: number) => parseItemFromRow(row, idx));

        let finalItems: DataPemusnahanItem[] = [];
        if (pullMode === 'overwrite') {
          finalItems = parsedItems;
        } else {
          // Append - Avoid exact duplicate by id_pemusnahan
          const existingIds = new Set(items.map(i => i.id_pemusnahan));
          const newEntries = parsedItems.filter(i => !existingIds.has(i.id_pemusnahan));
          finalItems = [...items, ...newEntries];
        }

        await persistItems(finalItems, true);
        showToast('Berhasil Tarik Data', `Sukses memuat ${parsedItems.length} baris data dari Google Sheet "${sheetName}"`, 'success');
        setShowPullGasModal(false);
        setPullStatusMsg('');
      } else {
        throw new Error('Format data dari Google Apps Script belum mengembalikan array baris. Pastikan fungsi doGet() di Google Apps Script mengembalikan JSON array data.');
      }
    } catch (err: any) {
      console.error('Pull GAS error:', err);
      setPullStatusMsg(`Gagal: ${err.message || 'Tidak dapat menarik data'}`);
      showToast('Gagal Tarik Data', err.message || 'Pastikan Google Apps Script di-deploy sebagai Web App dengan akses "Anyone"', 'danger');
    } finally {
      setIsPullingGas(false);
    }
  };

  // Parse raw pasted CSV / TSV text
  const parseCsvText = (text: string): Record<string, any>[] => {
    if (!text || !text.trim()) return [];
    try {
      const wb = XLSX.read(text, { type: 'string' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      return XLSX.utils.sheet_to_json<Record<string, any>>(ws);
    } catch {
      return [];
    }
  };

  // Handle Paste Import
  const handleImportPastedText = async () => {
    if (!pasteRawText.trim()) {
      showToast('Peringatan', 'Silakan tempel teks CSV atau copy-an sel spreadsheet terlebih dahulu.', 'warning');
      return;
    }

    try {
      const parsedRows = parseCsvText(pasteRawText);
      if (parsedRows.length === 0) {
        showToast('Gagal', 'Tidak ada baris data yang berhasil terbaca dari teks.', 'danger');
        return;
      }

      const parsedItems: DataPemusnahanItem[] = parsedRows.map((row, idx) => parseItemFromRow(row, idx));

      let finalItems: DataPemusnahanItem[] = [];
      if (pullMode === 'overwrite') {
        finalItems = parsedItems;
      } else {
        const existingIds = new Set(items.map(i => i.id_pemusnahan));
        const newEntries = parsedItems.filter(i => !existingIds.has(i.id_pemusnahan));
        finalItems = [...items, ...newEntries];
      }

      await persistItems(finalItems, true);
      showToast('Import Sukses', `Berhasil memproses ${parsedItems.length} baris data dari teks.`, 'success');
      setShowPullGasModal(false);
      setPasteRawText('');
    } catch (err: any) {
      showToast('Gagal', err.message || 'Gagal memproses data teks', 'danger');
    }
  };

  // Handle File Upload (.xlsx / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (rows.length === 0) {
          showToast('Kosong', 'File Excel tidak memiliki baris data', 'warning');
          return;
        }

        const parsedItems = rows.map((r, idx) => parseItemFromRow(r, idx));
        const finalItems = [...items, ...parsedItems];
        await persistItems(finalItems, true);
        showToast('Upload Sukses', `Berhasil menambahkan ${parsedItems.length} data dari file Excel`, 'success');
      } catch (err: any) {
        showToast('Gagal', 'Gagal membaca file: ' + err.message, 'danger');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      showToast('Perhatian', 'Tidak ada data untuk diekspor', 'warning');
      return;
    }

    const exportRows = filteredItems.map((item, idx) => ({
      'No': idx + 1,
      'Tujuan / Pengajuan': item.tujuan,
      'Nama Barang': item.nama_barang,
      'Qty Akhir': item.qty_akhir,
      'UOM': item.uom,
      'Batch': item.batch,
      'Expired Date': item.expired_date,
      'LPN / SN': item.lpn_sn,
      'Status': item.status,
      'Item Code': item.item_code,
      'ID Pemusnahan': item.id_pemusnahan,
      'Kategori': item.kategori,
      'Lokasi': item.lokasi,
      'Tipe Lokasi': item.tipe_lokasi,
      'Qty Awal': item.qty_awal,
      'Qty Convert': item.qty_convert,
      'UOM Convert': item.uom_convert,
      'Vendor Batch': item.vendor_batch,
      'SLOC': item.sloc,
      'Kode Tujuan': item.kode_tujuan,
      'Status QC': item.status_qc,
      'User Tally': item.user_tally,
      'Shelf Life': item.shelf_life,
      'Sumber': item.sumber,
      'User Input': item.user_input,
      'Tanggal Update': item.tanggal_update,
      'Catatan / Note': item.catatan
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pemusnahan');
    XLSX.writeFile(wb, `Data_Pemusnahan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Export Berhasil', `File Excel berisi ${filteredItems.length} baris telah diunduh.`, 'success');
  };

  // Open Form for Add / Edit
  const handleOpenAddModal = () => {
    setEditingItem(null);
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID');
    const idPms = `PMS-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}-${String(items.length + 1).padStart(4, '0')}`;

    setFormData({
      id_pemusnahan: idPms,
      item_code: '',
      nama_barang: '',
      kategori: '-',
      lokasi: 'CKB-FG1-AF-11-1A',
      tipe_lokasi: '-',
      qty_awal: 0,
      qty_akhir: 1,
      uom: 'PCS',
      qty_convert: 0,
      uom_convert: 'Car',
      lpn_sn: 'FGKINO3',
      batch: '',
      vendor_batch: '',
      sloc: '8A03',
      expired_date: '-',
      kode_tujuan: '-',
      status_qc: '-',
      user_tally: '-',
      shelf_life: '-',
      sumber: '-',
      tujuan: 'Pengajuan Sept 26 - W1',
      user_input: 'Dede Administrator',
      tanggal_update: dateStr,
      status: '-',
      catatan: '-'
    });
    setShowItemFormModal(true);
  };

  const handleOpenEditModal = (item: DataPemusnahanItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowItemFormModal(true);
  };

  const handleSaveForm = async () => {
    if (!formData.item_code?.trim() || !formData.nama_barang?.trim()) {
      showToast('Perhatian', 'Kode Item dan Nama Barang wajib diisi', 'warning');
      return;
    }

    if (editingItem) {
      // Update
      const updatedList = items.map(i => i.id === editingItem.id ? { ...i, ...formData } as DataPemusnahanItem : i);
      await persistItems(updatedList, true);
      showToast('Tersimpan', 'Data pemusnahan berhasil diperbarui', 'success');
    } else {
      // Add new
      const newItem: DataPemusnahanItem = {
        id: generateId(),
        id_pemusnahan: formData.id_pemusnahan || `PMS-${Date.now()}`,
        item_code: formData.item_code || '-',
        nama_barang: formData.nama_barang || '-',
        kategori: formData.kategori || '-',
        lokasi: formData.lokasi || '-',
        tipe_lokasi: formData.tipe_lokasi || '-',
        qty_awal: Number(formData.qty_awal) || 0,
        qty_akhir: Number(formData.qty_akhir) || 0,
        uom: formData.uom || 'PCS',
        qty_convert: Number(formData.qty_convert) || 0,
        uom_convert: formData.uom_convert || '-',
        lpn_sn: formData.lpn_sn || '-',
        batch: formData.batch || '-',
        vendor_batch: formData.vendor_batch || formData.batch || '-',
        sloc: formData.sloc || '8A03',
        expired_date: formData.expired_date || '-',
        kode_tujuan: formData.kode_tujuan || '-',
        status_qc: formData.status_qc || '-',
        user_tally: formData.user_tally || '-',
        shelf_life: formData.shelf_life || '-',
        sumber: formData.sumber || '-',
        tujuan: formData.tujuan || '-',
        user_input: formData.user_input || 'Admin',
        tanggal_update: formData.tanggal_update || new Date().toLocaleDateString('id-ID'),
        status: formData.status || '-',
        catatan: formData.catatan || '-'
      };
      const updatedList = [newItem, ...items];
      await persistItems(updatedList, true);
      showToast('Ditambahkan', 'Item baru berhasil ditambahkan', 'success');
    }
    setShowItemFormModal(false);
  };

  const handleDeleteItem = (id: string) => {
    showConfirm({
      title: 'Hapus Item',
      message: 'Apakah Anda yakin ingin menghapus data pemusnahan ini?',
      type: 'danger',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        const updated = items.filter(i => i.id !== id);
        await persistItems(updated, true);
        if (supabase) {
          await supabase.from('data_pemusnahan').delete().eq('id', id);
        }
        showToast('Dihapus', 'Data pemusnahan berhasil dihapus', 'info');
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showConfirm({
      title: 'Hapus Massal',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} item terpilih?`,
      type: 'danger',
      confirmText: 'Hapus Semua',
      cancelText: 'Batal',
      onConfirm: async () => {
        const idSet = new Set(selectedIds);
        const updated = items.filter(i => !idSet.has(i.id));
        await persistItems(updated, true);
        if (supabase) {
          await supabase.from('data_pemusnahan').delete().in('id', selectedIds);
        }
        setSelectedIds([]);
        showToast('Dihapus', `${selectedIds.length} item berhasil dihapus`, 'info');
      }
    });
  };

  // Filter Unique Options
  const uniqueTujuan = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.tujuan).filter(Boolean))).sort();
    return list;
  }, [items]);

  const uniqueSloc = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.sloc).filter(Boolean))).sort();
    return list;
  }, [items]);

  const uniqueUom = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.uom).filter(Boolean))).sort();
    return list;
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter(item => {
      // Search
      const matchSearch =
        !q ||
        item.id_pemusnahan.toLowerCase().includes(q) ||
        item.item_code.toLowerCase().includes(q) ||
        item.nama_barang.toLowerCase().includes(q) ||
        item.batch.toLowerCase().includes(q) ||
        item.sloc.toLowerCase().includes(q) ||
        item.lokasi.toLowerCase().includes(q) ||
        item.lpn_sn.toLowerCase().includes(q) ||
        item.tujuan.toLowerCase().includes(q) ||
        item.user_input.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Filter Tujuan
      if (selectedTujuan !== 'all' && item.tujuan !== selectedTujuan) return false;

      // Filter SLOC
      if (selectedSloc !== 'all' && item.sloc !== selectedSloc) return false;

      // Filter UOM
      if (selectedUom !== 'all' && item.uom !== selectedUom) return false;

      return true;
    });
  }, [items, searchQuery, selectedTujuan, selectedSloc, selectedUom]);

  // Statistics
  const totalQtyAkhir = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (Number(curr.qty_akhir) || 0), 0);
  }, [filteredItems]);

  const totalBatchCount = useMemo(() => {
    return new Set(filteredItems.map(i => i.batch).filter(b => b && b !== '-')).size;
  }, [filteredItems]);

  // Paginated Items
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Select all on current page
  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.includes(i.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedItems.map(i => i.id));
      setSelectedIds(selectedIds.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedItems.map(i => i.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // SQL Script for Copy
  const SQL_SCRIPT = `-- =========================================================
-- SKEMA TABEL SUPABASE: public.data_pemusnahan (26 KOLOM)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.data_pemusnahan (
    id VARCHAR(100) PRIMARY KEY,
    id_pemusnahan VARCHAR(100) NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    nama_barang VARCHAR(255) NOT NULL,
    kategori VARCHAR(100) DEFAULT '-',
    lokasi VARCHAR(100) DEFAULT '-',
    tipe_lokasi VARCHAR(100) DEFAULT '-',
    qty_awal NUMERIC(15,2) DEFAULT 0,
    qty_akhir NUMERIC(15,2) DEFAULT 0,
    uom VARCHAR(50) DEFAULT 'PCS',
    qty_convert NUMERIC(15,2) DEFAULT 0,
    uom_convert VARCHAR(50) DEFAULT '-',
    lpn_sn VARCHAR(100) DEFAULT '-',
    batch VARCHAR(100) DEFAULT '-',
    vendor_batch VARCHAR(100) DEFAULT '-',
    sloc VARCHAR(50) DEFAULT '8A03',
    expired_date VARCHAR(100) DEFAULT '-',
    kode_tujuan VARCHAR(100) DEFAULT '-',
    status_qc VARCHAR(100) DEFAULT '-',
    user_tally VARCHAR(100) DEFAULT '-',
    shelf_life VARCHAR(100) DEFAULT '-',
    sumber VARCHAR(100) DEFAULT '-',
    tujuan VARCHAR(150) DEFAULT '-',
    user_input VARCHAR(150) DEFAULT '-',
    tanggal_update VARCHAR(100) DEFAULT '-',
    status VARCHAR(100) DEFAULT '-',
    catatan TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performa query & pencarian
CREATE INDEX IF NOT EXISTS idx_data_pms_id_pms ON public.data_pemusnahan(id_pemusnahan);
CREATE INDEX IF NOT EXISTS idx_data_pms_item_code ON public.data_pemusnahan(item_code);
CREATE INDEX IF NOT EXISTS idx_data_pms_batch ON public.data_pemusnahan(batch);
CREATE INDEX IF NOT EXISTS idx_data_pms_sloc ON public.data_pemusnahan(sloc);
CREATE INDEX IF NOT EXISTS idx_data_pms_tujuan ON public.data_pemusnahan(tujuan);

-- Akses RLS & Izin Anonim
ALTER TABLE public.data_pemusnahan DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.data_pemusnahan TO anon, authenticated;

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'data_pemusnahan'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.data_pemusnahan;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;`;

  const GAS_CODE_SAMPLE = `// GOOGLE APPS SCRIPT (GAS) WEB APP UNTUK SHEET "Pemusnahan"
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (e && e.parameter && e.parameter.sheet) || "Pemusnahan";
    
    // Cari sheet dengan trimming spasi
    var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName(sheetName.trim()) || ss.getSheetByName(" Pemusnahan ") || ss.getSheets()[0];
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Sheet tidak ditemukan"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var result = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var header = String(headers[j]).trim();
        if (header) {
          obj[header] = row[j];
        }
      }
      result.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      total: result.length,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & HERO SECTION */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm border border-blue-800/80">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0 ring-4 ring-white/10">
              <Flame size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight">
                  Data Pemusnahan
                </h2>
                <span className="bg-amber-500/30 text-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-400/40">
                  26 Kolom Spreadsheet
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-400/30 flex items-center gap-1">
                  <Database size={10} /> GAS Webhook Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100/90 m-0 mt-1 font-medium">
                Pusat data detail barang pemusnahan, integrasi Google Sheet (GAS), dan sinkronisasi database Supabase
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Tarik Data GAS Button */}
            <button
              onClick={() => {
                setGasActiveTab('api');
                setShowPullGasModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              title="Tarik data otomatis dari Google Apps Script / Spreadsheet"
            >
              <Download size={15} />
              <span>Tarik Data Spreadsheet</span>
            </button>

            {/* Tambah Manual Button */}
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border border-white/20"
              title="Tambah baris pemusnahan baru"
            >
              <Plus size={15} />
              <span>Tambah Item</span>
            </button>

            {/* SQL Script View Button */}
            <button
              onClick={() => setShowSqlModal(true)}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-white/15"
              title="Lihat & Salin SQL Schema Supabase"
            >
              <Code2 size={15} />
              <span className="hidden sm:inline">SQL Schema</span>
            </button>

            {/* Cloud Sync Button */}
            <button
              onClick={handleFullSyncToCloud}
              disabled={syncingCloud}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/15"
              title="Sinkronkan seluruh data ke cloud Supabase"
            >
              <RefreshCw size={15} className={syncingCloud ? 'animate-spin text-amber-300' : ''} />
            </button>
          </div>
        </div>

        {/* 2. KPI METRICS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/15">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
              <TableIcon size={12} /> Total Baris Item
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {filteredItems.length.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
              <Box size={12} /> Total Qty Akhir
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
              {totalQtyAkhir.toLocaleString('id-ID')} <span className="text-xs font-bold text-white/80">Pcs</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
              <Layers size={12} /> Batch Unik
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {totalBatchCount.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10">
            <div className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
              <Calendar size={12} /> Tujuan / Pengajuan
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
              {uniqueTujuan.length} <span className="text-xs font-bold text-white/80">Batch</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS (SEARCH, FILTERS, VIEW MODES, BULK ACTIONS) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari ID Pemusnahan, SKU, Nama Barang, Batch, SLOC, Lokasi..."
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tujuan */}
            <select
              value={selectedTujuan}
              onChange={(e) => {
                setSelectedTujuan(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Tujuan ({uniqueTujuan.length})</option>
              {uniqueTujuan.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Filter SLOC */}
            <select
              value={selectedSloc}
              onChange={(e) => {
                setSelectedSloc(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua SLOC ({uniqueSloc.length})</option>
              {uniqueSloc.map(s => (
                <option key={s} value={s}>SLOC {s}</option>
              ))}
            </select>

            {/* Filter UOM */}
            <select
              value={selectedUom}
              onChange={(e) => {
                setSelectedUom(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua UOM</option>
              {uniqueUom.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: View Modes & Export/Import Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('utama')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'utama' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tampilan Utama (8 Kolom)
            </button>
            <button
              onClick={() => setViewMode('operasional')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'operasional' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operasional
            </button>
            <button
              onClick={() => setViewMode('lengkap')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'lengkap' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lengkap (26 Kolom Spreadsheet)
            </button>
          </div>

          {/* Action Buttons: Bulk Delete & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-all cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Hapus {selectedIds.length} Baris</span>
              </button>
            )}

            {/* Upload File Button */}
            <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200">
              <UploadCloud size={13} className="text-slate-600" />
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN DATA TABLE (CUSTOM ORDER & DENSE DESIGN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="rounded text-blue-900 cursor-pointer"
                    title="Pilih semua baris pada halaman ini"
                  />
                </th>
                <th className="p-3 whitespace-nowrap text-slate-400">#</th>

                {/* 1. Tujuan / Pengajuan */}
                <th className="p-3 whitespace-nowrap">Tujuan / Pengajuan</th>

                {/* 2. Nama Barang */}
                <th className="p-3 whitespace-nowrap min-w-[220px]">Nama Barang</th>

                {/* 3. Qty Akhir */}
                <th className="p-3 whitespace-nowrap text-right">Qty Akhir</th>

                {/* 4. UOM */}
                <th className="p-3 whitespace-nowrap text-center">UOM</th>

                {/* 5. Batch */}
                <th className="p-3 whitespace-nowrap">Batch</th>

                {/* 6. Expired Date */}
                <th className="p-3 whitespace-nowrap">Expired Date</th>

                {/* 7. LPN / SN */}
                <th className="p-3 whitespace-nowrap">LPN / SN</th>

                {/* 8. Status */}
                <th className="p-3 whitespace-nowrap">Status</th>

                {/* Operasional extra columns */}
                {viewMode === 'operasional' && (
                  <>
                    <th className="p-3 whitespace-nowrap">Lokasi</th>
                    <th className="p-3 whitespace-nowrap text-center">SLOC</th>
                    <th className="p-3 whitespace-nowrap">User Input</th>
                    <th className="p-3 whitespace-nowrap">Catatan</th>
                  </>
                )}

                {/* Lengkap extra columns (all remaining 26 columns) */}
                {viewMode === 'lengkap' && (
                  <>
                    <th className="p-3 whitespace-nowrap">ID Pemusnahan</th>
                    <th className="p-3 whitespace-nowrap">Item Code</th>
                    <th className="p-3 whitespace-nowrap">Kategori</th>
                    <th className="p-3 whitespace-nowrap">Lokasi</th>
                    <th className="p-3 whitespace-nowrap">Tipe Lokasi</th>
                    <th className="p-3 whitespace-nowrap text-right">Qty Awal</th>
                    <th className="p-3 whitespace-nowrap text-right">Qty Convert</th>
                    <th className="p-3 whitespace-nowrap">UOM Convert</th>
                    <th className="p-3 whitespace-nowrap">Vendor Batch</th>
                    <th className="p-3 whitespace-nowrap text-center">SLOC</th>
                    <th className="p-3 whitespace-nowrap">Kode Tujuan</th>
                    <th className="p-3 whitespace-nowrap">Status QC</th>
                    <th className="p-3 whitespace-nowrap">User Tally</th>
                    <th className="p-3 whitespace-nowrap">Shelf Life</th>
                    <th className="p-3 whitespace-nowrap">Sumber</th>
                    <th className="p-3 whitespace-nowrap">User Input</th>
                    <th className="p-3 whitespace-nowrap">Tanggal Update</th>
                    <th className="p-3 whitespace-nowrap">Catatan / Note</th>
                  </>
                )}

                <th className="p-3 text-center whitespace-nowrap sticky right-0 bg-slate-100 z-10 shadow-l">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={30} className="p-8 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto text-blue-900 mb-2" />
                    Memuat data pemusnahan...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={30} className="p-12 text-center text-slate-400">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                      <Flame size={24} />
                    </div>
                    <div className="font-bold text-slate-700 text-sm">Tidak ada data pemusnahan</div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Klik "Tarik Data Spreadsheet" untuk mengambil data dari Google Apps Script'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          className="rounded text-blue-900 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{globalIdx}</td>
                      
                      {/* 1. Tujuan / Pengajuan */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold text-[11px] border border-amber-200 inline-block shadow-2xs">
                          {item.tujuan || '-'}
                        </span>
                      </td>

                      {/* 2. Nama Barang */}
                      <td className="p-3 min-w-[200px] max-w-[280px]">
                        <div className="font-bold text-slate-900 leading-snug line-clamp-2" title={item.nama_barang}>
                          {item.nama_barang || '-'}
                        </div>
                        {item.item_code && item.item_code !== '-' && (
                          <div className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">
                            SKU: {item.item_code}
                          </div>
                        )}
                      </td>

                      {/* 3. Qty Akhir */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className="font-mono font-black text-blue-900 text-sm">
                          {Number(item.qty_akhir || 0).toLocaleString('id-ID')}
                        </span>
                      </td>

                      {/* 4. UOM */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-extrabold text-[11px] border border-slate-200">
                          {item.uom || 'PCS'}
                        </span>
                      </td>

                      {/* 5. Batch */}
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800">
                          {item.batch || '-'}
                        </span>
                      </td>

                      {/* 6. Expired Date */}
                      <td className="p-3 font-mono text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>{item.expired_date || '-'}</span>
                        </div>
                      </td>

                      {/* 7. LPN / SN */}
                      <td className="p-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-700 border border-slate-200 text-[11px]">
                          {item.lpn_sn || '-'}
                        </span>
                      </td>

                      {/* 8. Status */}
                      <td className="p-3 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Operasional extra columns */}
                      {viewMode === 'operasional' && (
                        <>
                          <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{item.lokasi || '-'}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-extrabold text-[10px] border border-blue-200">
                              {item.sloc || '-'}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-700">{item.user_input || '-'}</td>
                          <td className="p-3 max-w-[150px] truncate text-slate-600" title={item.catatan}>{item.catatan || '-'}</td>
                        </>
                      )}

                      {/* Lengkap extra columns */}
                      {viewMode === 'lengkap' && (
                        <>
                          <td className="p-3 font-mono font-bold text-blue-950 whitespace-nowrap">
                            <span
                              onClick={() => {
                                navigator.clipboard.writeText(item.id_pemusnahan);
                                showToast('Disalin', `ID ${item.id_pemusnahan} disalin ke clipboard`, 'info');
                              }}
                              className="hover:underline cursor-pointer flex items-center gap-1 group"
                              title="Klik untuk menyalin ID"
                            >
                              {item.id_pemusnahan}
                              <Copy size={11} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{item.item_code}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.kategori}</td>
                          <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{item.lokasi}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.tipe_lokasi}</td>
                          <td className="p-3 text-right font-mono text-slate-600">{item.qty_awal}</td>
                          <td className="p-3 text-right font-mono text-slate-600">{item.qty_convert}</td>
                          <td className="p-3 text-slate-600 whitespace-nowrap">{item.uom_convert}</td>
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{item.vendor_batch}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-extrabold text-[10px] border border-blue-200">
                              {item.sloc}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.kode_tujuan}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.status_qc}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.user_tally}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.shelf_life}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{item.sumber}</td>
                          <td className="p-3 whitespace-nowrap text-slate-700">{item.user_input}</td>
                          <td className="p-3 whitespace-nowrap font-mono text-slate-600">{item.tanggal_update}</td>
                          <td className="p-3 max-w-[150px] truncate text-slate-600" title={item.catatan}>{item.catatan}</td>
                        </>
                      )}

                      {/* Action Buttons */}
                      <td className="p-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/40 z-10 shadow-l">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setDetailItem(item);
                              setShowDetailModal(true);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Lihat Detail Lengkap 26 Kolom"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Menampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>dari <strong>{filteredItems.length}</strong> total baris</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="px-3 font-bold text-slate-800">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Halaman Selanjutnya"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. MODAL TARIK DATA GAS / SPREADSHEET */}
      {showPullGasModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 sm:p-7 rounded-2xl max-w-2xl w-full shadow-2xl border border-amber-300 relative overflow-hidden text-left max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                    Tarik Data dari Spreadsheet / Google Apps Script
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    Ambil data sheet "Pemusnahan" secara langsung atau tempel data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPullGasModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab selector */}
            <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100">
              <button
                onClick={() => setGasActiveTab('api')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  gasActiveTab === 'api' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ExternalLink size={13} />
                <span>Koneksi URL GAS</span>
              </button>
              <button
                onClick={() => setGasActiveTab('paste')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  gasActiveTab === 'paste' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardPaste size={13} />
                <span>Tempel Data Langsung</span>
              </button>
              <button
                onClick={() => setGasActiveTab('script')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  gasActiveTab === 'script' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Code2 size={13} />
                <span>Script GAS (Deploy Guide)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 space-y-4 flex-1">
              {gasActiveTab === 'api' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      URL Google Apps Script (Web App Exec):
                    </label>
                    <input
                      type="text"
                      value={gasUrl}
                      onChange={(e) => setGasUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Sheet:
                      </label>
                      <input
                        type="text"
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="Pemusnahan"
                        className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mode Impor:
                      </label>
                      <select
                        value={pullMode}
                        onChange={(e) => setPullMode(e.target.value as any)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="overwrite">Timpa Seluruh Data (Overwrite)</option>
                        <option value="append">Tambah / Gabungkan Data Baru (Append)</option>
                      </select>
                    </div>
                  </div>

                  {pullStatusMsg && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <RefreshCw size={14} className={isPullingGas ? 'animate-spin text-amber-600 shrink-0' : 'text-amber-600 shrink-0'} />
                      <span>{pullStatusMsg}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Database size={13} className="text-blue-700" />
                      Informasi Integrasi Google Sheet
                    </div>
                    <p className="text-[11px] text-blue-800 m-0">
                      Sistem akan menarik data secara otomatis dan memetakan 26 kolom (ID Pemusnahan, SKU, Qty, Batch, SLOC, Expired Date, Tujuan, dll.) langsung ke tabel dan database.
                    </p>
                  </div>
                </div>
              )}

              {gasActiveTab === 'paste' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tempel (Paste) Data dari Excel / Google Sheet / CSV:
                    </label>
                    <textarea
                      rows={8}
                      value={pasteRawText}
                      onChange={(e) => setPasteRawText(e.target.value)}
                      placeholder={`"ID Pemusnahan","Item Code","Nama Barang","Kategori","Lokasi",...\nPMS-20260827-8791-0313\tFG16146.838.0100.P\tCLICK TP WHITE...\n`}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mode Impor:
                    </label>
                    <select
                      value={pullMode}
                      onChange={(e) => setPullMode(e.target.value as any)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="overwrite">Timpa Seluruh Data (Overwrite)</option>
                      <option value="append">Tambah / Gabungkan Data Baru (Append)</option>
                    </select>
                  </div>
                </div>
              )}

              {gasActiveTab === 'script' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 m-0">
                    Gunakan kode Google Apps Script berikut jika Anda membuat endpoint Web App baru di spreadsheet Anda:
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                      {GAS_CODE_SAMPLE}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(GAS_CODE_SAMPLE);
                        showToast('Disalin', 'Script Google Apps Script disalin ke clipboard', 'success');
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                    >
                      <Copy size={12} /> Salin Script
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowPullGasModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>

              {gasActiveTab === 'api' && (
                <button
                  onClick={handlePullFromGas}
                  disabled={isPullingGas}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isPullingGas ? 'animate-spin' : ''} />
                  <span>{isPullingGas ? 'Menarik Data...' : 'Tarik Data Sekarang'}</span>
                </button>
              )}

              {gasActiveTab === 'paste' && (
                <button
                  onClick={handleImportPastedText}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <ClipboardPaste size={14} />
                  <span>Proses Teks Tempelan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DETAIL 26 KOLOM */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 sm:p-7 rounded-2xl max-w-3xl w-full shadow-2xl border border-blue-200 relative overflow-hidden text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                    Detail Lengkap Data Pemusnahan (26 Kolom)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono m-0 font-bold">
                    {detailItem.id_pemusnahan}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">1. ID Pemusnahan</span>
                  <span className="text-xs font-mono font-bold text-blue-950">{detailItem.id_pemusnahan}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">2. Item Code (SKU)</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{detailItem.item_code}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-1 sm:col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">3. Nama Barang</span>
                  <span className="text-xs font-bold text-slate-900">{detailItem.nama_barang}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">4. Kategori</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.kategori}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">5. Lokasi</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{detailItem.lokasi}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">6. Tipe Lokasi</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.tipe_lokasi}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">7. Qty Awal</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{detailItem.qty_awal}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 block uppercase">8. Qty Akhir</span>
                  <span className="text-sm font-mono font-black text-blue-950">{detailItem.qty_akhir}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">9. UOM</span>
                  <span className="text-xs font-bold text-slate-800">{detailItem.uom}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">10. Qty Convert</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{detailItem.qty_convert}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">11. UOM Convert</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.uom_convert}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">12. LPN / SN</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{detailItem.lpn_sn}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">13. Batch</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{detailItem.batch}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">14. Vendor Batch</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{detailItem.vendor_batch}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 block uppercase">15. SLOC</span>
                  <span className="text-xs font-bold text-blue-900">{detailItem.sloc}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">16. Expired Date</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{detailItem.expired_date}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">17. Kode Tujuan</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.kode_tujuan}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">18. Status QC</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.status_qc}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">19. User Tally</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.user_tally}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">20. Shelf Life</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.shelf_life}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">21. Sumber</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.sumber}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 block uppercase">22. Tujuan / Pengajuan</span>
                  <span className="text-xs font-bold text-amber-950">{detailItem.tujuan}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">23. User Input</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.user_input}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">24. Tanggal Update</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{detailItem.tanggal_update}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">25. Status</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.status}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">26. Catatan / Note</span>
                  <span className="text-xs font-semibold text-slate-800">{detailItem.catatan}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleOpenEditModal(detailItem);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Edit2 size={14} /> Edit Data Ini
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL ADD / EDIT FORM */}
      {showItemFormModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 sm:p-7 rounded-2xl max-w-3xl w-full shadow-2xl border border-blue-200 relative overflow-hidden text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md">
                  {editingItem ? <Edit2 size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                    {editingItem ? 'Edit Item Data Pemusnahan' : 'Tambah Item Pemusnahan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    Lengkapi kolom rincian barang pemusnahan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowItemFormModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Pemusnahan:</label>
                  <input
                    type="text"
                    value={formData.id_pemusnahan || ''}
                    onChange={(e) => setFormData({ ...formData, id_pemusnahan: e.target.value })}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code (SKU) *:</label>
                  <input
                    type="text"
                    value={formData.item_code || ''}
                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                    placeholder="Contoh: FG16146.838.0100.P"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Barang *:</label>
                  <input
                    type="text"
                    value={formData.nama_barang || ''}
                    onChange={(e) => setFormData({ ...formData, nama_barang: e.target.value })}
                    placeholder="Contoh: CLICK TP WHITE+BACTERIA TEA"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi:</label>
                  <input
                    type="text"
                    value={formData.lokasi || ''}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    placeholder="Contoh: CKB-FG1-AF-11-1A"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qty Akhir:</label>
                  <input
                    type="number"
                    value={formData.qty_akhir ?? ''}
                    onChange={(e) => setFormData({ ...formData, qty_akhir: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-extrabold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UOM (Satuan):</label>
                  <input
                    type="text"
                    value={formData.uom || ''}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    placeholder="TUB, PCS, BT, SCH, etc"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch:</label>
                  <input
                    type="text"
                    value={formData.batch || ''}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    placeholder="Contoh: 911573"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SLOC:</label>
                  <input
                    type="text"
                    value={formData.sloc || ''}
                    onChange={(e) => setFormData({ ...formData, sloc: e.target.value })}
                    placeholder="8A03"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expired Date:</label>
                  <input
                    type="text"
                    value={formData.expired_date || ''}
                    onChange={(e) => setFormData({ ...formData, expired_date: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">LPN / SN:</label>
                  <input
                    type="text"
                    value={formData.lpn_sn || ''}
                    onChange={(e) => setFormData({ ...formData, lpn_sn: e.target.value })}
                    placeholder="FGKINO3"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan / Pengajuan:</label>
                  <input
                    type="text"
                    value={formData.tujuan || ''}
                    onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                    placeholder="Pengajuan Sept 26 - W1"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status:</label>
                  <input
                    type="text"
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    placeholder="Contoh: Selesai, Proses, Open"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">User Input:</label>
                  <input
                    type="text"
                    value={formData.user_input || ''}
                    onChange={(e) => setFormData({ ...formData, user_input: e.target.value })}
                    placeholder="Dede Administrator"
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Note:</label>
                  <input
                    type="text"
                    value={formData.catatan || ''}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    placeholder="Keterangan tambahan..."
                    className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowItemFormModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveForm}
                className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save size={14} /> Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL SQL SCHEMA & SETUP GUIDE */}
      {showSqlModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 sm:p-7 rounded-2xl max-w-2xl w-full shadow-2xl border border-blue-300 relative overflow-hidden text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-md">
                  <Code2 size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                    Skrip SQL Supabase untuk Data Pemusnahan
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    Jalankan skrip ini di SQL Editor dashboard Supabase Anda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-3 flex-1">
              <div className="relative">
                <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[380px] leading-relaxed">
                  {SQL_SCRIPT}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SQL_SCRIPT);
                    showToast('Disalin', 'Skrip SQL Supabase berhasil disalin!', 'success');
                  }}
                  className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Copy size={13} /> Salin SQL
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Langkah Eksekusi:
                </div>
                <ol className="list-decimal list-inside text-[11px] text-emerald-800 space-y-0.5 m-0 pl-1">
                  <li>Buka Dashboard Supabase Anda &rarr; Pilih Menu <strong>SQL Editor</strong></li>
                  <li>Klik tombol <strong>Salin SQL</strong> di atas, lalu tempel pada editor</li>
                  <li>Klik tombol <strong>Run</strong> untuk membuat tabel <code>public.data_pemusnahan</code></li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
