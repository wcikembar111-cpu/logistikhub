import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FlaskConical,
  Search,
  Plus,
  RefreshCw,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Filter,
  X,
  Settings,
  Layers,
  ArrowUpDown,
  Calendar,
  User,
  FileSpreadsheet,
  Package,
  Sparkles,
  Info,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Hash,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MonitoringSampleItem } from '../../types';
import { useAuth } from '../../hooks/useSupabase';
import { useNotification } from '../../context/NotificationContext';

// Default configuration from PRD
const DEFAULT_SPREADSHEET_ID = '1o8hWUAK6DO1rmggbiRaRNfT7On4c9RhrHR6X07nqZm4';
const DEFAULT_SHEET_NAME = 'Sample';
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycby5KFkXtBiXWEJ1G7CSLhRippGbA-k8WbV4QQFyNfur1ktnS6oNbcnsboFrBCLVXlxN/exec';
const LOCAL_STORAGE_KEY = 'ckb_sample_monitoring_items_v1';
const CONFIG_STORAGE_KEY = 'ckb_sample_monitoring_config_v1';

export function SampleMonitoringModule() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useNotification();

  // Settings State
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SPREADSHEET_ID);
  const [sheetName, setSheetName] = useState(DEFAULT_SHEET_NAME);
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);

  // Data State
  const [items, setItems] = useState<MonitoringSampleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSE'>('ALL');
  const [filterWms, setFilterWms] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [filterSap, setFilterSap] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'tanggal' | 'no_sppj' | 'qty' | 'deskripsi'>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals State
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MonitoringSampleItem | null>(null);
  const [detailItem, setDetailItem] = useState<MonitoringSampleItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<MonitoringSampleItem>({
    status: 'OPEN',
    tanggal: getTodayDate(),
    no_sppj: '',
    id_barang: '',
    deskripsi: '',
    qty: 1,
    unit: 'CAR',
    wms: 'PENDING',
    sap: 'PENDING',
    pic: '',
    note: ''
  });

  // Load custom settings if any
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.spreadsheetId) setSpreadsheetId(parsed.spreadsheetId);
        if (parsed.sheetName) setSheetName(parsed.sheetName);
        if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  // Set default PIC to logged in user name
  useEffect(() => {
    if (user && !formData.pic) {
      const defaultPic = user.nama || user.username || user.email_google || '';
      setFormData(prev => ({ ...prev, pic: prev.pic || defaultPic }));
    }
  }, [user, formData.pic]);

  // Initial Data Fetch
  useEffect(() => {
    // 1. Try local cache first
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch fresh data from Google Spreadsheet
    fetchDataFromSpreadsheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheetId, sheetName]);

  // Helper to copy text to clipboard
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Disalin', `"${text}" berhasil disalin ke clipboard`, 'info');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Helper to parse date from Google Sheet value or formatted string
  const parseSheetDate = (raw: any, formatted?: string): string => {
    if (formatted && typeof formatted === 'string' && formatted.trim()) {
      return formatted.trim();
    }
    if (!raw) return '';
    const str = String(raw).trim();
    // Handle Date(2026, 9, 2)
    const match = str.match(/Date\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const year = match[1];
      const month = String(Number(match[2]) + 1).padStart(2, '0');
      const day = String(match[3]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return str;
  };

  // Fetch data using GViz Query API (fast read)
  const fetchDataFromSpreadsheet = async () => {
    setIsLoading(true);
    try {
      let text = '';
      
      // Attempt 1: Fetch via local proxy to avoid browser network restrictions
      try {
        const proxyRes = await fetch(`/api/sample/fetch?spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheetName=${encodeURIComponent(sheetName)}`);
        if (proxyRes.ok) {
          text = await proxyRes.text();
        }
      } catch {
        // Fallback to direct client fetch
      }

      // Attempt 2: Direct GViz query
      if (!text || !text.includes('google.visualization.Query.setResponse')) {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
        const res = await fetch(gvizUrl);
        text = await res.text();
      }

      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
      if (!match || !match[1]) {
        throw new Error('Format respon Google Sheets tidak valid.');
      }

      const json = JSON.parse(match[1]);
      if (json.status !== 'ok') {
        throw new Error(json.errors?.[0]?.message || 'Gagal membaca sheet');
      }

      const table = json.table || {};
      const cols: Array<{ id: string; label: string }> = table.cols || [];
      const rawRows: Array<{ c: Array<{ v: any; f?: string } | null> }> = table.rows || [];

      if (rawRows.length === 0) {
        setItems([]);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
        setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
        setIsLoading(false);
        return;
      }

      // Determine column indexes with fuzzy header matching
      let colIdxMap: Record<string, number> = {
        status: 0,
        tanggal: 1,
        no_sppj: 2,
        id_barang: 3,
        deskripsi: 4,
        qty: 5,
        unit: 6,
        wms: 7,
        sap: 8,
        pic: 9,
        note: 10
      };

      let dataRows = rawRows;

      // Check if row 0 has headers (parsedNumHeaders === 0 or cols[0].label is empty)
      const firstRowCols = rawRows[0]?.c || [];
      const firstCell = String(firstRowCols[0]?.v || '').trim().toUpperCase();
      const isFirstRowHeader = firstCell === 'SATUS' || firstCell === 'STATUS';

      if (isFirstRowHeader) {
        // Map columns from row 0
        firstRowCols.forEach((cell, idx) => {
          const val = String(cell?.v || '').trim().toUpperCase();
          if (val === 'STATUS' || val === 'SATUS') colIdxMap.status = idx;
          else if (val.includes('TANGGAL') || val.includes('DATE')) colIdxMap.tanggal = idx;
          else if (val.includes('SPPJ')) colIdxMap.no_sppj = idx;
          else if (val === 'ID' || val === 'SKU' || val === 'KODE') colIdxMap.id_barang = idx;
          else if (val.includes('DESK') || val.includes('NAMA')) colIdxMap.deskripsi = idx;
          else if (val.includes('QTY') || val.includes('JUMLAH')) colIdxMap.qty = idx;
          else if (val.includes('UNIT') || val.includes('SATUAN')) colIdxMap.unit = idx;
          else if (val === 'WMS') colIdxMap.wms = idx;
          else if (val === 'SAP') colIdxMap.sap = idx;
          else if (val === 'PIC' || val.includes('PETUGAS')) colIdxMap.pic = idx;
          else if (val.includes('NOTE') || val.includes('CATATAN')) colIdxMap.note = idx;
        });
        dataRows = rawRows.slice(1);
      } else if (cols.length > 0 && cols[0]?.label) {
        // Map columns from cols labels
        cols.forEach((col, idx) => {
          const val = String(col.label || '').trim().toUpperCase();
          if (val === 'STATUS' || val === 'SATUS') colIdxMap.status = idx;
          else if (val.includes('TANGGAL') || val.includes('DATE')) colIdxMap.tanggal = idx;
          else if (val.includes('SPPJ')) colIdxMap.no_sppj = idx;
          else if (val === 'ID' || val === 'SKU') colIdxMap.id_barang = idx;
          else if (val.includes('DESK') || val.includes('NAMA')) colIdxMap.deskripsi = idx;
          else if (val.includes('QTY') || val.includes('JUMLAH')) colIdxMap.qty = idx;
          else if (val.includes('UNIT') || val.includes('SATUAN')) colIdxMap.unit = idx;
          else if (val === 'WMS') colIdxMap.wms = idx;
          else if (val === 'SAP') colIdxMap.sap = idx;
          else if (val === 'PIC') colIdxMap.pic = idx;
          else if (val.includes('NOTE') || val.includes('CATATAN')) colIdxMap.note = idx;
        });
      }

      // Map rows to MonitoringSampleItem
      const parsedItems: MonitoringSampleItem[] = dataRows
        .filter(r => r && r.c && r.c.some(cell => cell !== null && cell.v !== null && cell.v !== ''))
        .map((r, index) => {
          const c = r.c || [];
          const getVal = (idx: number) => {
            const cell = c[idx];
            if (!cell) return '';
            return cell.f !== undefined ? cell.f : (cell.v !== null && cell.v !== undefined ? cell.v : '');
          };

          const rawStatus = String(getVal(colIdxMap.status) || 'OPEN').trim().toUpperCase();
          const cleanStatus = rawStatus === 'CLOSE' || rawStatus === 'CLOSED' ? 'CLOSE' : 'OPEN';
          const rawQty = getVal(colIdxMap.qty);
          const numQty = typeof rawQty === 'number' ? rawQty : (parseFloat(String(rawQty).replace(/,/g, '')) || 0);

          const rawDate = c[colIdxMap.tanggal]?.v;
          const formattedDate = c[colIdxMap.tanggal]?.f;
          const cleanDate = parseSheetDate(rawDate, formattedDate);

          return {
            id: `smp-${index + 1}-${Date.now().toString(36)}`,
            status: cleanStatus,
            tanggal: cleanDate,
            no_sppj: String(getVal(colIdxMap.no_sppj) || '').trim(),
            id_barang: String(getVal(colIdxMap.id_barang) || '').trim(),
            deskripsi: String(getVal(colIdxMap.deskripsi) || '').trim(),
            qty: numQty,
            unit: String(getVal(colIdxMap.unit) || 'CAR').trim().toUpperCase(),
            wms: String(getVal(colIdxMap.wms) || 'PENDING').trim().toUpperCase(),
            sap: String(getVal(colIdxMap.sap) || 'PENDING').trim().toUpperCase(),
            pic: String(getVal(colIdxMap.pic) || '').trim(),
            note: String(getVal(colIdxMap.note) || '').trim()
          };
        });

      setItems(parsedItems);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedItems));
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      showToast('Data Terbaca', `Berhasil memuat ${parsedItems.length} baris sample dari Google Sheets.`, 'success');
    } catch (err: any) {
      console.warn('Gagal membaca data dari Google Sheets:', err);
      showToast('Gagal Tarik Data', err.message || 'Periksa koneksi atau izin share spreadsheet.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync / Write back items to Google Sheets via Webhook
  const syncToSpreadsheet = async (newItems: MonitoringSampleItem[]): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const headers = [
        'STATUS', 'TANGGAL', 'NO. SPPJ', 'ID', 'DESKRIPSI', 'QTY', 'UNIT', 'WMS', 'SAP', 'PIC', 'NOTE'
      ];

      const rows = newItems.map(item => [
        item.status,
        item.tanggal,
        item.no_sppj,
        item.id_barang,
        item.deskripsi,
        item.qty,
        item.unit,
        item.wms,
        item.sap,
        item.pic,
        item.note
      ]);

      const payload = {
        sheetName,
        spreadsheetId,
        mode: 'overwrite',
        headers,
        rows
      };

      // 1. Try server proxy first
      let success = false;
      try {
        const proxyRes = await fetch('/api/sample/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl,
            ...payload
          })
        });
        if (proxyRes.ok) {
          const resJson = await proxyRes.json();
          if (resJson.status === 'success' || resJson.status === 'ok') {
            success = true;
          }
        }
      } catch {
        // Fallback to direct client call
      }

      // 2. Direct browser webhook call if proxy failed
      if (!success) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const resData = await response.json();
        if (resData.status === 'success' || resData.status === 'ok') {
          success = true;
        }
      }

      if (success) {
        setItems(newItems);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newItems));
        setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
        showToast('Sinkron Sukses', `${newItems.length} baris tersimpan ke Google Sheets "Sample".`, 'success');
        return true;
      } else {
        throw new Error('Webhook mengembalikan status belum sukses.');
      }
    } catch (err: any) {
      console.error('Error saat menyimpan ke Google Sheets:', err);
      // Still update locally for resilience
      setItems(newItems);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newItems));
      showToast('Tersimpan Lokal', 'Data disimpan di browser, namun sinkronisasi cloud tertunda: ' + (err.message || 'Koneksi lambat'), 'warning');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick Status Toggle on row click
  const handleToggleStatus = async (item: MonitoringSampleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = item.status.toUpperCase() === 'OPEN' ? 'CLOSE' : 'OPEN';
    const updatedItems = items.map(it => (it.id === item.id ? { ...it, status: newStatus } : it));

    // Optimistic update
    setItems(updatedItems);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedItems));

    // Send to Google Sheets
    await syncToSpreadsheet(updatedItems);
  };

  // Handle Form Submission (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.no_sppj.trim()) {
      showToast('Validasi Gagal', 'Nomor SPPJ wajib diisi!', 'warning');
      return;
    }
    if (!formData.id_barang.trim()) {
      showToast('Validasi Gagal', 'ID Barang / SKU wajib diisi!', 'warning');
      return;
    }
    if (!formData.deskripsi.trim()) {
      showToast('Validasi Gagal', 'Deskripsi barang wajib diisi!', 'warning');
      return;
    }
    if (!formData.qty || Number(formData.qty) <= 0) {
      showToast('Validasi Gagal', 'Kuantitas (QTY) minimal bernilai 1!', 'warning');
      return;
    }
    if (!formData.pic.trim()) {
      showToast('Validasi Gagal', 'Nama PIC wajib diisi!', 'warning');
      return;
    }

    const cleanItem: MonitoringSampleItem = {
      ...formData,
      status: formData.status.toUpperCase() === 'CLOSE' ? 'CLOSE' : 'OPEN',
      unit: (formData.unit || 'CAR').trim().toUpperCase(),
      wms: (formData.wms || 'PENDING').trim().toUpperCase(),
      sap: (formData.sap || 'PENDING').trim().toUpperCase(),
      qty: Number(formData.qty) || 1,
      id: editingItem?.id || `smp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };

    let updatedList: MonitoringSampleItem[];
    if (editingItem) {
      updatedList = items.map(i => (i.id === editingItem.id ? cleanItem : i));
    } else {
      updatedList = [cleanItem, ...items];
    }

    setShowFormModal(false);
    setEditingItem(null);

    await syncToSpreadsheet(updatedList);
  };

  // Delete an item
  const handleDeleteItem = (item: MonitoringSampleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'Hapus Catatan Sample?',
      message: `Apakah Anda yakin ingin menghapus data sample SPPJ "${item.no_sppj}" (${item.id_barang})? Tindakan ini akan menghapus data dari Spreadsheet.`,
      confirmText: 'Ya, Hapus Data',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        const remaining = items.filter(i => i.id !== item.id);
        await syncToSpreadsheet(remaining);
      }
    });
  };

  // Open Edit Form
  const handleOpenEdit = (item: MonitoringSampleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormData({ ...item });
    setShowFormModal(true);
  };

  // Open Add Form
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      status: 'OPEN',
      tanggal: getTodayDate(),
      no_sppj: '',
      id_barang: '',
      deskripsi: '',
      qty: 1,
      unit: 'CAR',
      wms: 'PENDING',
      sap: 'PENDING',
      pic: user?.nama || user?.username || user?.email_google || '',
      note: ''
    });
    setShowFormModal(true);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      showToast('Tidak Ada Data', 'Tidak ada data untuk diekspor.', 'warning');
      return;
    }

    try {
      const exportRows = filteredItems.map((item, idx) => ({
        'NO': idx + 1,
        'STATUS': item.status,
        'TANGGAL': item.tanggal,
        'NO. SPPJ': item.no_sppj,
        'ID BARANG': item.id_barang,
        'DESKRIPSI': item.deskripsi,
        'QTY': item.qty,
        'UNIT': item.unit,
        'WMS': item.wms,
        'SAP': item.sap,
        'PIC': item.pic,
        'NOTE': item.note
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto width
      const colWidths = [
        { wch: 6 },  // NO
        { wch: 10 }, // STATUS
        { wch: 14 }, // TANGGAL
        { wch: 20 }, // NO. SPPJ
        { wch: 22 }, // ID
        { wch: 40 }, // DESKRIPSI
        { wch: 8 },  // QTY
        { wch: 8 },  // UNIT
        { wch: 12 }, // WMS
        { wch: 12 }, // SAP
        { wch: 18 }, // PIC
        { wch: 35 }  // NOTE
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Gudang');

      const fileName = `Monitoring_Sample_Gudang_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast('Berhasil Ekspor', `File "${fileName}" siap diunduh.`, 'success');
    } catch (err: any) {
      showToast('Gagal Ekspor', err.message || 'Terjadi kesalahan saat mengekspor Excel.', 'danger');
    }
  };

  // Save Settings Modal
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      spreadsheetId: spreadsheetId.trim(),
      sheetName: sheetName.trim(),
      webhookUrl: webhookUrl.trim()
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    setShowSettingsModal(false);
    showToast('Pengaturan Disimpan', 'Konfigurasi Spreadsheet berhasil diperbarui.', 'success');
    fetchDataFromSpreadsheet();
  };

  // Reset Settings to Default PRD
  const handleResetSettings = () => {
    setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
    setSheetName(DEFAULT_SHEET_NAME);
    setWebhookUrl(DEFAULT_WEBHOOK_URL);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    showToast('Reset Default', 'Pengaturan dikembalikan ke konfigurasi bawaan PRD.', 'info');
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = items.length;
    const openCount = items.filter(i => i.status.toUpperCase() === 'OPEN').length;
    const closeCount = items.filter(i => i.status.toUpperCase() === 'CLOSE').length;
    const totalQty = items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
    const wmsPendingCount = items.filter(i => {
      const s = i.wms.toUpperCase();
      return !['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(s);
    }).length;
    const sapPendingCount = items.filter(i => {
      const s = i.sap.toUpperCase();
      return !['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(s);
    }).length;

    return {
      total,
      openCount,
      closeCount,
      totalQty,
      wmsPendingCount,
      sapPendingCount
    };
  }, [items]);

  // Unique units for filter dropdown
  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.unit) set.add(i.unit.toUpperCase());
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (filterStatus !== 'ALL') {
      result = result.filter(i => i.status.toUpperCase() === filterStatus);
    }

    // WMS filter
    if (filterWms === 'PENDING') {
      result = result.filter(i => !['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(i.wms.toUpperCase()));
    } else if (filterWms === 'DONE') {
      result = result.filter(i => ['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(i.wms.toUpperCase()));
    }

    // SAP filter
    if (filterSap === 'PENDING') {
      result = result.filter(i => !['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(i.sap.toUpperCase()));
    } else if (filterSap === 'DONE') {
      result = result.filter(i => ['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(i.sap.toUpperCase()));
    }

    // Unit filter
    if (filterUnit !== 'ALL') {
      result = result.filter(i => i.unit.toUpperCase() === filterUnit);
    }

    // Global Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(i => 
        i.no_sppj.toLowerCase().includes(q) ||
        i.id_barang.toLowerCase().includes(q) ||
        i.deskripsi.toLowerCase().includes(q) ||
        i.pic.toLowerCase().includes(q) ||
        i.wms.toLowerCase().includes(q) ||
        i.sap.toLowerCase().includes(q) ||
        i.note.toLowerCase().includes(q) ||
        i.tanggal.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'qty') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, filterStatus, filterWms, filterSap, filterUnit, searchQuery, sortField, sortOrder]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterWms('ALL');
    setFilterSap('ALL');
    setFilterUnit('ALL');
  };

  const hasActiveFilters = searchQuery || filterStatus !== 'ALL' || filterWms !== 'ALL' || filterSap !== 'ALL' || filterUnit !== 'ALL';

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-sm ring-4 ring-teal-50">
              <FlaskConical size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Monitoring Pengambilan Sample
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-full inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  Gsheets Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Tab: <strong className="text-slate-700">{sheetName}</strong></span>
                <span>•</span>
                <span>Sinkron Terakhir: <strong className="text-slate-700">{lastSyncedAt || 'Belum'}</strong></span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">11 Kolom Standar PRD</span>
              </p>
            </div>
          </div>

          {/* TOP ACTIONS */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchDataFromSpreadsheet()}
              disabled={isLoading || isSyncing}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Tarik pembaruan data dari Google Spreadsheet"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-teal-600' : 'text-slate-500'} />
              <span>{isLoading ? 'Memuat...' : 'Tarik Data'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={items.length === 0}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Unduh laporan dalam format Excel (.xlsx)"
            >
              <Download size={14} className="text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/60 text-teal-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Buka dokumen di Google Sheets (Tab Baru)"
            >
              <FileSpreadsheet size={14} className="text-teal-600" />
              <span>Google Sheet</span>
              <ExternalLink size={12} className="text-teal-500" />
            </a>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs transition-colors"
              title="Konfigurasi Spreadsheet ID & Webhook"
            >
              <Settings size={16} />
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} />
              <span>Tambah Sample</span>
            </button>
          </div>
        </div>

        {/* METRICS KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100">
          {/* Total Sample */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
              <span>Total Catatan</span>
              <Database size={13} className="text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-800">{metrics.total}</span>
              <span className="text-[11px] text-slate-500">item</span>
            </div>
          </div>

          {/* OPEN Sample */}
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/60">
            <div className="flex items-center justify-between text-amber-700 text-[11px] font-medium">
              <span>Status OPEN</span>
              <Clock size={13} className="text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-800">{metrics.openCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">berjalan</span>
            </div>
          </div>

          {/* CLOSE Sample */}
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/60">
            <div className="flex items-center justify-between text-emerald-700 text-[11px] font-medium">
              <span>Status CLOSE</span>
              <CheckCircle2 size={13} className="text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-800">{metrics.closeCount}</span>
              <span className="text-[11px] text-emerald-600 font-medium">selesai</span>
            </div>
          </div>

          {/* Total QTY */}
          <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/60">
            <div className="flex items-center justify-between text-blue-700 text-[11px] font-medium">
              <span>Total QTY</span>
              <Package size={13} className="text-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-blue-800">{metrics.totalQty.toLocaleString('id-ID')}</span>
              <span className="text-[11px] text-blue-600 font-medium">unit</span>
            </div>
          </div>

          {/* WMS Pending */}
          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-200/60">
            <div className="flex items-center justify-between text-rose-700 text-[11px] font-medium">
              <span>WMS Pending</span>
              <AlertTriangle size={13} className="text-rose-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-rose-800">{metrics.wmsPendingCount}</span>
              <span className="text-[11px] text-rose-600 font-medium">antrean</span>
            </div>
          </div>

          {/* SAP Pending */}
          <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-200/60">
            <div className="flex items-center justify-between text-purple-700 text-[11px] font-medium">
              <span>SAP Pending</span>
              <Layers size={13} className="text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-purple-800">{metrics.sapPendingCount}</span>
              <span className="text-[11px] text-purple-600 font-medium">antrean</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SPPJ, SKU ID, Deskripsi, PIC, Note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">Status: OPEN</option>
              <option value="CLOSE">Status: CLOSE</option>
            </select>
          </div>

          {/* WMS Filter */}
          <div className="md:col-span-2">
            <select
              value={filterWms}
              onChange={(e) => setFilterWms(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-700 font-medium"
            >
              <option value="ALL">Semua WMS</option>
              <option value="DONE">WMS: Selesai / OK</option>
              <option value="PENDING">WMS: Pending</option>
            </select>
          </div>

          {/* SAP Filter */}
          <div className="md:col-span-2">
            <select
              value={filterSap}
              onChange={(e) => setFilterSap(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-700 font-medium"
            >
              <option value="ALL">Semua SAP</option>
              <option value="DONE">SAP: Selesai / Posted</option>
              <option value="PENDING">SAP: Pending</option>
            </select>
          </div>

          {/* Unit Filter */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Unit</option>
              {uniqueUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
                title="Reset Semua Filter"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* RESULTS INFO BAR */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>Menampilkan <strong>{filteredItems.length}</strong> dari <strong>{items.length}</strong> baris sample</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-medium">
                Filter Aktif
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Urutkan:</span>
            <button
              onClick={() => {
                if (sortField === 'tanggal') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortField('tanggal'); setSortOrder('desc'); }
              }}
              className={`hover:text-slate-800 font-medium flex items-center gap-1 ${sortField === 'tanggal' ? 'text-teal-700' : 'text-slate-500'}`}
            >
              Tanggal {sortField === 'tanggal' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortField === 'qty') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortField('qty'); setSortOrder('desc'); }
              }}
              className={`hover:text-slate-800 font-medium flex items-center gap-1 ${sortField === 'qty' ? 'text-teal-700' : 'text-slate-500'}`}
            >
              QTY {sortField === 'qty' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading && items.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw size={28} className="animate-spin text-teal-600" />
            <p className="text-xs font-medium text-slate-600">Sedang menarik data dari Google Spreadsheet...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <FlaskConical size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {items.length === 0 ? 'Belum Ada Data Sample' : 'Data Tidak Ditemukan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {items.length === 0
                ? 'Spreadsheet tab "Sample" masih kosong atau baru diinisialisasi. Silakan tambah data sample pertama Anda.'
                : 'Tidak ada baris data yang cocok dengan kriteria pencarian atau filter yang dipilih.'}
            </p>
            {items.length === 0 ? (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus size={15} />
                <span>Tambah Sample Pertama</span>
              </button>
            ) : (
              <button
                onClick={resetAllFilters}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
                  <th className="py-3 px-3.5 text-center w-12">No</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">No. SPPJ</th>
                  <th className="py-3 px-3.5">ID / SKU</th>
                  <th className="py-3 px-3.5 min-w-[220px]">Deskripsi Barang</th>
                  <th className="py-3 px-3 text-center">QTY</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3.5 text-center">WMS</th>
                  <th className="py-3 px-3.5 text-center">SAP</th>
                  <th className="py-3 px-3.5">PIC</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Note</th>
                  <th className="py-3 px-3.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => {
                  const isOpen = item.status.toUpperCase() === 'OPEN';
                  const isWmsDone = ['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(item.wms.toUpperCase());
                  const isSapDone = ['OK', 'DONE', 'CLOSE', 'SELESAI', 'POSTED'].includes(item.sap.toUpperCase());

                  return (
                    <tr
                      key={item.id || idx}
                      onClick={() => {
                        setDetailItem(item);
                        setShowDetailModal(true);
                      }}
                      className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                    >
                      {/* 1. NO */}
                      <td className="py-3 px-3.5 text-center font-medium text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. STATUS (Clickable toggle) */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(item, e)}
                          title="Klik untuk mengubah status OPEN / CLOSE secara instan"
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 inline-flex items-center gap-1.5 ${
                            isOpen
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span>{item.status}</span>
                        </button>
                      </td>

                      {/* 3. TANGGAL */}
                      <td className="py-3 px-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {item.tanggal || '-'}
                      </td>

                      {/* 4. NO. SPPJ */}
                      <td className="py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{item.no_sppj}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.no_sppj, `sppj-${item.id}`)}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors"
                            title="Salin No. SPPJ"
                          >
                            {copiedKey === `sppj-${item.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* 5. ID BARANG / SKU */}
                      <td className="py-3 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {item.id_barang}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id_barang, `sku-${item.id}`)}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors"
                            title="Salin ID SKU"
                          >
                            {copiedKey === `sku-${item.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* 6. DESKRIPSI */}
                      <td className="py-3 px-3.5 text-slate-700 font-medium">
                        <div className="line-clamp-2 max-w-sm" title={item.deskripsi}>
                          {item.deskripsi}
                        </div>
                      </td>

                      {/* 7. QTY */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900 bg-slate-100/80 px-2 py-0.5 rounded text-[11px]">
                          {item.qty}
                        </span>
                      </td>

                      {/* 8. UNIT */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-semibold text-slate-600 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded">
                          {item.unit}
                        </span>
                      </td>

                      {/* 9. WMS */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${
                          isWmsDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.wms || 'PENDING'}
                        </span>
                      </td>

                      {/* 10. SAP */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${
                          isSapDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {item.sap || 'PENDING'}
                        </span>
                      </td>

                      {/* 11. PIC */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{item.pic || '-'}</span>
                        </div>
                      </td>

                      {/* 12. NOTE */}
                      <td className="py-3 px-3.5 text-slate-500">
                        <div className="line-clamp-1 max-w-[200px]" title={item.note}>
                          {item.note || '-'}
                        </div>
                      </td>

                      {/* 13. AKSI */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(item, e)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Edit Sample"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(item, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: TAMBAH / EDIT SAMPLE */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <FlaskConical size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingItem ? 'Edit Data Sample' : 'Tambah Pengambilan Sample Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Data akan otomatis tersinkron ke Google Spreadsheet tab &quot;Sample&quot;.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* STATUS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Alur <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-semibold"
                  >
                    <option value="OPEN">OPEN (Sedang Berjalan / Pending)</option>
                    <option value="CLOSE">CLOSE (Selesai & Administrasi Lengkap)</option>
                  </select>
                </div>

                {/* TANGGAL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Penarikan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NO. SPPJ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. SPPJ / Ref <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SPPJ/2026/10/001"
                    value={formData.no_sppj}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_sppj: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>

                {/* ID / SKU */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID / Kode SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: FG11026.218.0050.C"
                    value={formData.id_barang}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_barang: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              {/* DESKRIPSI */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Barang / Rincian Sample <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Nama produk lengkap, varian, atau rincian item sample"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* QTY */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kuantitas (QTY) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={formData.qty}
                    onChange={(e) => setFormData(prev => ({ ...prev, qty: Number(e.target.value) || 1 }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-bold"
                  />
                </div>

                {/* UNIT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan (Unit) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-semibold"
                    >
                      <option value="CAR">CAR (Karton)</option>
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="BTL">BTL (Botol)</option>
                      <option value="PCH">PCH (Pouch)</option>
                      <option value="BOX">BOX (Box)</option>
                      <option value="TUB">TUB (Tube)</option>
                      <option value="KRG">KRG (Karung)</option>
                      <option value="PAK">PAK (Pak)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WMS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status WMS
                  </label>
                  <select
                    value={formData.wms}
                    onChange={(e) => setFormData(prev => ({ ...prev, wms: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="OK">OK</option>
                    <option value="DONE">DONE</option>
                    <option value="CLOSE">CLOSE</option>
                  </select>
                </div>

                {/* SAP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status SAP
                  </label>
                  <select
                    value={formData.sap}
                    onChange={(e) => setFormData(prev => ({ ...prev, sap: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="POSTED">POSTED</option>
                    <option value="DONE">DONE</option>
                    <option value="CLOSE">CLOSE</option>
                  </select>
                </div>
              </div>

              {/* PIC */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PIC Petugas Gudang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nama petugas yang mengambil / menyerahkan sample"
                  value={formData.pic}
                  onChange={(e) => setFormData(prev => ({ ...prev, pic: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              {/* NOTE */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Operasional / Batch / Keterangan QC
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sample retain laboratorium QC batch 10RHA2516N, audit BPOM"
                  value={formData.note}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSyncing ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Sample'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL SAMPLE */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center">
                  <FlaskConical size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Detail Pengambilan Sample</h3>
                  <p className="text-xs text-slate-500 font-mono">{detailItem.no_sppj}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] block">Status Alur</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    detailItem.status.toUpperCase() === 'OPEN'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {detailItem.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Tanggal Penarikan</span>
                  <span className="font-semibold text-slate-800 mt-1 block">{detailItem.tanggal || '-'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1">ID SKU Barang</span>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-slate-800">
                  <span>{detailItem.id_barang}</span>
                  <button
                    onClick={() => handleCopy(detailItem.id_barang, 'detail-sku')}
                    className="p-1 text-slate-400 hover:text-teal-700"
                    title="Salin SKU"
                  >
                    {copiedKey === 'detail-sku' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Deskripsi Lengkap</span>
                <p className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 font-medium">
                  {detailItem.deskripsi}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-400 text-[10px] block">QTY</span>
                  <span className="text-base font-bold text-slate-800">{detailItem.qty}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-400 text-[10px] block">Unit</span>
                  <span className="text-base font-bold text-slate-800">{detailItem.unit}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-400 text-[10px] block">PIC</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5">{detailItem.pic || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Status WMS</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">{detailItem.wms}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Status SAP</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">{detailItem.sap}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Catatan Operasional</span>
                <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                  {detailItem.note || 'Tidak ada catatan khusus.'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => {
                  setShowDetailModal(false);
                  handleOpenEdit(detailItem, e);
                }}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 size={13} />
                <span>Edit Sample</span>
              </button>

              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENGATURAN SPREADSHEET & WEBHOOK */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Pengaturan Basis Data Spreadsheet</h3>
                  <p className="text-xs text-slate-500">Konfigurasi endpoint Google Sheets & Apps Script Webhook</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  ID dokumen pada URL Google Spreadsheet (/d/<strong>{'{ID}'}</strong>/edit)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sheet (Tab)
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Nama tab sheet tempat penyimpanan data (Standar: <strong>Sample</strong>)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Webhook Apps Script (POST)
                </label>
                <textarea
                  rows={2}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Endpoint Google Apps Script Web App untuk menyimpan dan sinkronisasi data.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Kembalikan ke Default</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
