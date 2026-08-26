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
  Clock,
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  FileSpreadsheet,
  Layers,
  Box,
  Coins,
  PieChart as PieIcon,
  Check,
  Building,
  FileText,
  UploadCloud,
  Download,
  ArrowUpDown,
  CheckCheck,
  Database,
  AlertCircle,
  AlertTriangle,
  FileCheck2,
  Server,
  Cloud,
  Copy,
  HelpCircle,
  Code2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useSupabase';
import { MonitoringPemusnahanItem } from '../../types';

const PIPELINE_STEPS = [
  { key: 'no_pengajuan', label: 'Pengajuan Awal' },
  { key: 'no_persetujuan', label: 'Persetujuan SCM' },
  { key: 'no_penolakan_qa', label: 'Penolakan QA' },
  { key: 'approved_head_log', label: 'Approved Head Logistic' },
  { key: 'approved_ho_direksi', label: 'Approved HO Direksi' },
  { key: 'serah_terima_gudang_reject', label: 'Serah Terima Gudang Reject' },
  { key: 'acc_teams_bap', label: 'ACC Teams BAP' },
  { key: 'kirim_dokumen_bap_ke_ho', label: 'Kirim Dokumen BAP ke HO' },
  { key: 'musnah_sistem_z87', label: 'Musnah Sistem (Z87)' },
  { key: 'completed_approval', label: 'Completed Approval' },
  { key: 'completed_ba', label: 'Completed BA' },
  { key: 'completed_migo', label: 'Completed MIGO' },
  { key: 'sj_kapsul', label: 'SJ Kapsul' },
  { key: 'bap_kapsul', label: 'BAP Kapsul' },
  { key: 'check_kapsul', label: 'Check Kapsul' }
];

function parseNumeric(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  let str = String(val).trim();
  // Remove currency prefix and whitespace
  str = str.replace(/^Rp\.?\s*/i, '').replace(/\s+/g, '');
  if (!str) return 0;
  // Indonesian style: 48.500.000,00 or 15.420
  if (/\.\d{3}/.test(str) && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/\.\d{3}/.test(str) && !str.includes(',')) {
    // 48.500.000
    str = str.replace(/\./g, '');
  } else if (/,\d{3}/.test(str) && !str.includes('.')) {
    // 48,500,000
    str = str.replace(/,/g, '');
  } else {
    str = str.replace(/,/g, '.');
  }
  const clean = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

function computeStatus(item: Partial<MonitoringPemusnahanItem>): 'SELESAI' | 'PROSES' {
  const isKirim = String(item.kirim_dokumen_bap_ke_ho || '').toUpperCase() === 'CLOSE';
  const isAppr = String(item.completed_approval || '').toUpperCase() === 'CLOSE';
  const isBa = String(item.completed_ba || '').toUpperCase() === 'CLOSE';
  const isMigo = String(item.completed_migo || '').toUpperCase() === 'CLOSE';
  const isKapsul = String(item.check_kapsul || '').toUpperCase() === 'CLOSE';

  return (isKirim && isAppr && isBa && isMigo && isKapsul) ? 'SELESAI' : 'PROSES';
}

function cleanStatusVal(val: any): 'OPEN' | 'CLOSE' {
  if (val === undefined || val === null) return 'OPEN';
  const s = String(val).trim().toUpperCase();
  if (
    ['CLOSE', 'CLOSED', 'SELESAI', 'DONE', 'YA', 'YES', 'TRUE', '1', 'OK', 'V', '✓', 'SUDAH', 'ACC', 'SUDAH KIRIM', 'SUDAH ACC', 'TERKIRIM'].includes(s) ||
    s.startsWith('CLOSE') ||
    s.startsWith('SELESAI') ||
    s.startsWith('DONE') ||
    s.startsWith('ACC') ||
    s.startsWith('SUDAH')
  ) {
    return 'CLOSE';
  }
  return 'OPEN';
}

function toDatabaseItem(item: Partial<MonitoringPemusnahanItem>, idx?: number): MonitoringPemusnahanItem {
  const baseTime = Date.now() + (idx || 0) * 10;
  const nowIso = new Date(baseTime).toISOString();
  const cleanId = item.id && String(item.id).trim()
    ? String(item.id).trim().slice(0, 100)
    : `TRX-${nowIso.slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}-${String((idx || 0) + 1).padStart(4, '0')}`;

  return {
    id: cleanId,
    tahun: Number(item.tahun) || new Date().getFullYear(),
    bulan_pengajuan: String(item.bulan_pengajuan || `Pengajuan ${(idx || 0) + 1}`).trim().slice(0, 150),
    qty_pcs: parseNumeric(item.qty_pcs),
    value: parseNumeric(item.value),
    cogs: parseNumeric(item.cogs),
    sloc: String(item.sloc || '8A04').trim().slice(0, 50),
    location: String(item.location || 'Cikembar').trim().slice(0, 100),
    kategori: String(item.kategori || 'REGULER').trim().slice(0, 100),
    no_persetujuan: String(item.no_persetujuan || 'OPEN').trim().slice(0, 150),
    no_pengajuan: String(item.no_pengajuan || 'OPEN').trim().slice(0, 150),
    no_penolakan_qa: String(item.no_penolakan_qa || 'OPEN').trim().slice(0, 150),
    approved_head_log: String(item.approved_head_log || 'OPEN').trim().slice(0, 255),
    approved_ho_direksi: String(item.approved_ho_direksi || 'OPEN').trim().slice(0, 255),
    serah_terima_gudang_reject: String(item.serah_terima_gudang_reject || 'OPEN').trim().slice(0, 255),
    acc_teams_bap: String(item.acc_teams_bap || 'OPEN').trim().slice(0, 255),
    kirim_dokumen_bap_ke_ho: cleanStatusVal(item.kirim_dokumen_bap_ke_ho),
    musnah_sistem_z87: String(item.musnah_sistem_z87 || 'OPEN').trim().slice(0, 255),
    completed_approval: cleanStatusVal(item.completed_approval),
    completed_ba: cleanStatusVal(item.completed_ba),
    completed_migo: cleanStatusVal(item.completed_migo),
    sj_kapsul: String(item.sj_kapsul || 'OPEN').trim().slice(0, 150),
    bap_kapsul: String(item.bap_kapsul || 'OPEN').trim().slice(0, 150),
    check_kapsul: cleanStatusVal(item.check_kapsul),
    keterangan: String(item.keterangan || '').trim(),
    status: computeStatus(item),
    created_at: item.created_at || nowIso,
    last_update: nowIso
  };
}

export function MonitoringPemusnahanModule() {
  const { showToast, showConfirm } = useNotification();
  const { isAdmin } = useAuth();
  const [dataList, setDataList] = useState<MonitoringPemusnahanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'db' | 'year-desc' | 'qty-desc' | 'value-desc'>('db');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Excel Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreview, setUploadPreview] = useState<MonitoringPemusnahanItem[] | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStageText, setUploadStageText] = useState('');
  const [sqlGuideModalOpen, setSqlGuideModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [uploadResultStatus, setUploadResultStatus] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    recordsCount: number;
    dbSynced: boolean;
    timestamp: string;
  } | null>(null);

  // Inline editing / draft state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<Partial<MonitoringPemusnahanItem>>({});

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalItem, setFormModalItem] = useState<Partial<MonitoringPemusnahanItem>>({});
  const [detailModalItem, setDetailModalItem] = useState<MonitoringPemusnahanItem | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num?: number | string | null) => {
    if (num === undefined || num === null || num === '' || isNaN(Number(num))) return '0';
    return Number(num).toLocaleString('id-ID', { maximumFractionDigits: 0 });
  };

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      // Urutkan sesuai urutan baris database (created_at ASC) agar tidak teracak oleh kolom ID
      let { data, error } = await supabase
        .from('monitoring_pemusnahan')
        .select('*')
        .order('created_at', { ascending: true, nullsFirst: false });

      if (error) {
        // Fallback jika database belum memiliki kolom created_at
        const fallback = await supabase
          .from('monitoring_pemusnahan')
          .select('*');
        if (!fallback.error && fallback.data) {
          data = fallback.data;
          error = null;
        }
      }

      if (error || !data) {
        const local = localStorage.getItem('logistics_monitoring_pemusnahan');
        if (local) {
          try {
            setDataList(JSON.parse(local));
          } catch {
            setDataList([]);
          }
        }
      } else if (data && data.length > 0) {
        // Natural database order
        const mapped = data.map(d => ({ ...d, status: computeStatus(d) }));
        setDataList(mapped);
        localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(mapped));
      } else {
        // Data is empty array from Supabase, check if local storage has existing records
        const local = localStorage.getItem('logistics_monitoring_pemusnahan');
        if (local) {
          try {
            const parsedLocal = JSON.parse(local);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              setDataList(parsedLocal);
            } else {
              setDataList([]);
            }
          } catch {
            setDataList([]);
          }
        } else {
          setDataList([]);
        }
      }
    } catch (e: any) {
      console.error('Fetch error:', e);
      const local = localStorage.getItem('logistics_monitoring_pemusnahan');
      if (local) {
        try {
          setDataList(JSON.parse(local));
        } catch {
          setDataList([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    // Listen to live realtime changes
    const channel = supabase
      .channel('monitoring_pemusnahan_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoring_pemusnahan' }, () => {
        fetchMonitoringData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered & Sorted dataset (Defaults strictly to database order)
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let records = dataList.filter(item => {
      if (selectedYear !== 'all' && String(item.tahun) !== selectedYear) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (q) {
        const searchPool = [
          item.bulan_pengajuan, item.no_pengajuan, item.no_persetujuan, item.no_penolakan_qa,
          item.approved_head_log, item.approved_ho_direksi, item.serah_terima_gudang_reject,
          item.acc_teams_bap, item.musnah_sistem_z87, item.sj_kapsul, item.bap_kapsul,
          item.sloc, item.location, item.kategori, item.keterangan
        ].map(v => String(v || '').toLowerCase()).join(' ');
        if (!searchPool.includes(q)) return false;
      }
      return true;
    });

    // Apply sorting if user chooses other options; otherwise keep exact database order
    if (sortMode === 'year-desc') {
      records = [...records].sort((a, b) => (Number(b.tahun) || 0) - (Number(a.tahun) || 0));
    } else if (sortMode === 'qty-desc') {
      records = [...records].sort((a, b) => (Number(b.qty_pcs) || 0) - (Number(a.qty_pcs) || 0));
    } else if (sortMode === 'value-desc') {
      records = [...records].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    }

    return records;
  }, [dataList, selectedYear, selectedStatus, searchQuery, sortMode]);

  // Dynamic Year list
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    dataList.forEach(d => { if (d.tahun) set.add(Number(d.tahun)); });
    return Array.from(set).sort((a, b) => b - a);
  }, [dataList]);

  // Aggregate KPI Calculations
  const kpiStats = useMemo(() => {
    const totalPengajuan = filteredRecords.length;
    const totalQty = filteredRecords.reduce((sum, r) => sum + (Number(r.qty_pcs) || 0), 0);
    const totalValue = filteredRecords.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    const totalCogs = filteredRecords.reduce((sum, r) => sum + (Number(r.cogs) || 0), 0);
    const selesaiCount = filteredRecords.filter(r => r.status === 'SELESAI').length;
    const prosesCount = totalPengajuan - selesaiCount;
    const pctSelesai = totalPengajuan > 0 ? Math.round((selesaiCount / totalPengajuan) * 100) : 0;

    return {
      totalPengajuan,
      totalQty,
      totalValue,
      totalCogs,
      selesaiCount,
      prosesCount,
      pctSelesai
    };
  }, [filteredRecords]);

  // Scroll helpers
  const handleScroll = (dir: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    if (dir === 'left') {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  // Start Inline Edit
  const handleStartInlineEdit = (item: MonitoringPemusnahanItem) => {
    setEditingRowId(item.id);
    setInlineDraft({ ...item });
  };

  // Add New Inline Draft Row
  const handleAddNewInlineRow = () => {
    const newId = `TRX-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const draft: MonitoringPemusnahanItem = {
      id: newId,
      tahun: new Date().getFullYear(),
      bulan_pengajuan: '',
      qty_pcs: 0,
      value: 0,
      cogs: 0,
      sloc: '8A04',
      location: 'Cikembar',
      kategori: 'REGULER',
      no_persetujuan: 'OPEN',
      no_pengajuan: 'OPEN',
      no_penolakan_qa: 'OPEN',
      approved_head_log: 'OPEN',
      approved_ho_direksi: 'OPEN',
      serah_terima_gudang_reject: 'OPEN',
      acc_teams_bap: 'OPEN',
      kirim_dokumen_bap_ke_ho: 'OPEN',
      musnah_sistem_z87: 'OPEN',
      completed_approval: 'OPEN',
      completed_ba: 'OPEN',
      completed_migo: 'OPEN',
      sj_kapsul: 'OPEN',
      bap_kapsul: 'OPEN',
      check_kapsul: 'OPEN',
      keterangan: '',
      status: 'PROSES',
      last_update: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    setEditingRowId('NEW');
    setInlineDraft(draft);
  };

  const handleCancelInlineEdit = () => {
    setEditingRowId(null);
    setInlineDraft({});
  };

  const handleSaveInlineEdit = async () => {
    if (!inlineDraft.bulan_pengajuan || !inlineDraft.bulan_pengajuan.trim()) {
      showToast('Perhatian', 'Bulan Pengajuan wajib diisi', 'warning');
      return;
    }

    setLoading(true);
    try {
      const updatedItem = toDatabaseItem(inlineDraft);

      const { error } = editingRowId === 'NEW'
        ? await supabase.from('monitoring_pemusnahan').upsert(updatedItem, { onConflict: 'id' })
        : await supabase.from('monitoring_pemusnahan').update(updatedItem).eq('id', editingRowId);

      // Always maintain synchronous local cache with sequence preserved
      const nextList = editingRowId === 'NEW'
        ? [...dataList, updatedItem]
        : dataList.map(d => d.id === editingRowId ? updatedItem : d);
      setDataList(nextList);
      localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));

      if (error) {
        console.warn('Supabase save error:', error);
        showToast('Tersimpan Lokal', `Data tersimpan di tabel lokal. Server: ${error.message}`, 'warning');
      } else {
        await fetchMonitoringData();
        showToast('Tersimpan di Cloud', 'Data monitoring pemusnahan berhasil tersimpan di database Supabase!', 'success');
      }

      setEditingRowId(null);
      setInlineDraft({});
    } catch (e: any) {
      console.error(e);
      showToast('Tersimpan Lokal', 'Data disimpan di penyimpanan lokal browser', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Open Form Modal (Add / Edit)
  const handleOpenFormModal = (item?: MonitoringPemusnahanItem) => {
    if (item) {
      setFormModalItem({ ...item });
    } else {
      setFormModalItem({
        id: '',
        tahun: new Date().getFullYear(),
        bulan_pengajuan: '',
        qty_pcs: 0,
        value: 0,
        cogs: 0,
        sloc: '8A04',
        location: 'Cikembar',
        kategori: 'REGULER',
        no_persetujuan: 'OPEN',
        no_pengajuan: 'OPEN',
        no_penolakan_qa: 'OPEN',
        approved_head_log: 'OPEN',
        approved_ho_direksi: 'OPEN',
        serah_terima_gudang_reject: 'OPEN',
        acc_teams_bap: 'OPEN',
        kirim_dokumen_bap_ke_ho: 'OPEN',
        musnah_sistem_z87: 'OPEN',
        completed_approval: 'OPEN',
        completed_ba: 'OPEN',
        completed_migo: 'OPEN',
        sj_kapsul: 'OPEN',
        bap_kapsul: 'OPEN',
        check_kapsul: 'OPEN',
        keterangan: '',
        status: 'PROSES'
      });
    }
    setFormModalOpen(true);
  };

  const handleSaveFormModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModalItem.bulan_pengajuan || !formModalItem.bulan_pengajuan.trim()) {
      showToast('Perhatian', 'Bulan Pengajuan wajib diisi', 'warning');
      return;
    }

    setLoading(true);
    try {
      const isNew = !formModalItem.id;
      const fullItem = toDatabaseItem(formModalItem);
      const id = fullItem.id;

      const { error } = isNew
        ? await supabase.from('monitoring_pemusnahan').upsert(fullItem, { onConflict: 'id' })
        : await supabase.from('monitoring_pemusnahan').update(fullItem).eq('id', id);

      // Update local state immediately with sequence preserved
      const nextList = isNew
        ? [...dataList, fullItem]
        : dataList.map(d => d.id === id ? fullItem : d);
      setDataList(nextList);
      localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));

      if (error) {
        console.warn('Supabase form save error:', error);
        showToast('Tersimpan Lokal', `Data tersimpan di tabel. Server: ${error.message}`, 'warning');
      } else {
        await fetchMonitoringData();
        showToast('Sukses di Cloud', `Data pengajuan (${id}) tersimpan di database Supabase!`, 'success');
      }

      setFormModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast('Info', 'Data tersimpan di penyimpanan lokal browser', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Excel: Download Template (.xlsx)
  const handleDownloadTemplate = () => {
    const headers = [
      [
        'TAHUN', 'BULAN_PENGAJUAN', 'QTY_PCS', 'VALUE', 'COGS', 'SLOC', 'LOCATION', 'KATEGORI',
        'NO_PERSETUJUAN', 'NO_PENGAJUAN', 'NO_PENOLAKAN_QA', 'APPROVED_HEAD_LOG', 'APPROVED_HO_DIREKSI',
        'SERAH_TERIMA_GUDANG_REJECT', 'ACC_TEAMS_BAP', 'KIRIM_DOKUMEN_BAP_KE_HO', 'MUSNAH_SISTEM_Z87',
        'COMPLETED_APPROVAL', 'COMPLETED_BA', 'COMPLETED_MIGO', 'SJ_KAPSUL', 'BAP_KAPSUL',
        'CHECK_KAPSUL', 'KETERANGAN'
      ]
    ];
    const sampleRows = [
      [
        2026, 'Pengajuan Jan W1 - 26', 15420, 48500000, 32100000, '8A04', 'Cikembar', 'REGULER',
        'SCM/APP/2026/01/001', 'PGJ/CKB/2026/01/001', '-', 'APP-HEAD-01', 'APP-DIR-01',
        'ST-REJ-260101', 'ACC-BAP-01', 'CLOSE', 'Z87-202601-09',
        'CLOSE', 'CLOSE', 'CLOSE', 'SJ-KAP-001', 'BAP-KAP-001',
        'CLOSE', 'Pemusnahan Batch Expired Awal Tahun'
      ],
      [
        2026, 'Pengajuan Feb W2 - 26', 8200, 24600000, 16400000, '8A04', 'Cikembar', 'REGULER',
        'SCM/APP/2026/02/004', 'PGJ/CKB/2026/02/004', 'QA/REJ/2026/02/001', 'APP-HEAD-02', 'OPEN',
        'OPEN', 'OPEN', 'OPEN', 'OPEN',
        'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN',
        'OPEN', 'Dalam proses persetujuan Direksi'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
    ws['!cols'] = Array(24).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Monitoring');
    XLSX.writeFile(wb, 'Template_Upload_Monitoring_Pemusnahan.xlsx');
    showToast('Template Terunduh', 'Template Excel Monitoring Pemusnahan siap digunakan.', 'success');
  };

  // Excel: Export Current Records to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      showToast('Data Kosong', 'Tidak ada data untuk diekspor ke Excel', 'warning');
      return;
    }

    const rows = filteredRecords.map((r, idx) => ({
      'NO': idx + 1,
      'TAHUN': r.tahun,
      'BULAN_PENGAJUAN': r.bulan_pengajuan,
      'QTY_PCS': r.qty_pcs,
      'VALUE': r.value,
      'COGS': r.cogs,
      'SLOC': r.sloc,
      'LOCATION': r.location,
      'KATEGORI': r.kategori,
      'NO_PERSETUJUAN': r.no_persetujuan,
      'NO_PENGAJUAN': r.no_pengajuan,
      'NO_PENOLAKAN_QA': r.no_penolakan_qa,
      'APPROVED_HEAD_LOG': r.approved_head_log,
      'APPROVED_HO_DIREKSI': r.approved_ho_direksi,
      'SERAH_TERIMA_GUDANG_REJECT': r.serah_terima_gudang_reject,
      'ACC_TEAMS_BAP': r.acc_teams_bap,
      'KIRIM_DOKUMEN_BAP_KE_HO': r.kirim_dokumen_bap_ke_ho,
      'MUSNAH_SISTEM_Z87': r.musnah_sistem_z87,
      'COMPLETED_APPROVAL': r.completed_approval,
      'COMPLETED_BA': r.completed_ba,
      'COMPLETED_MIGO': r.completed_migo,
      'SJ_KAPSUL': r.sj_kapsul,
      'BAP_KAPSUL': r.bap_kapsul,
      'CHECK_KAPSUL': r.check_kapsul,
      'KETERANGAN': r.keterangan,
      'STATUS': r.status,
      'LAST_UPDATE': r.last_update
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Array(27).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring_Pemusnahan');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Data_Monitoring_Pemusnahan_${dateStr}.xlsx`);
    showToast('Ekspor Berhasil', `${filteredRecords.length} data monitoring pemusnahan berhasil diekspor ke Excel.`, 'success');
  };

  // Excel: Handle File Upload & Parse (.xlsx, .xls, .csv)
  const handleExcelSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawJsonArr: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rawJsonArr || rawJsonArr.length === 0) {
          showToast('File Kosong', 'File Excel yang dipilih tidak memiliki data baris.', 'warning');
          return;
        }

        // Filter out completely empty rows
        const nonEmptyRows = rawJsonArr.filter(r => 
          Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== '')
        );

        if (nonEmptyRows.length === 0) {
          showToast('File Kosong', 'Tidak ada data terbaca dalam file Excel.', 'warning');
          return;
        }

        // Helper to normalize header string for comparisons
        const normalizeKey = (str: any) => 
          String(str || '')
            .toUpperCase()
            .replace(/[\s_\-\/\(\)\.\:]+/g, '')
            .trim();

        // 1. Find best matching header row among the first 10 rows
        let bestHeaderIdx = -1;
        let maxMatchCount = 0;
        const keySignatures = [
          'TAHUN', 'YEAR', 'THN',
          'BULAN', 'PERIODE', 'BULANPENGAJUAN',
          'QTY', 'PCS', 'JUMLAH', 'QUANTITY',
          'VALUE', 'NILAI', 'RP', 'HARGA', 'NOMINAL',
          'COGS', 'HPP',
          'SLOC', 'GUDANG', 'STORAGELOCATION',
          'LOCATION', 'LOKASI', 'PLANT',
          'KATEGORI', 'CATEGORY',
          'NOPERSETUJUAN', 'PERSETUJUAN',
          'NOPENGAJUAN', 'PENGAJUAN',
          'NOPENOLAKANQA', 'PENOLAKANQA', 'QAREJECT', 'QA',
          'APPROVEDHEADLOG', 'HEADLOG',
          'APPROVEDHODIREKSI', 'HODIREKSI', 'DIREKSI',
          'SERAHTERIMAGUDANGREJECT', 'SERAHTERIMA', 'GUDANGREJECT',
          'ACCTEAMSBAP', 'ACCTEAMS', 'TEAMSBAP',
          'KIRIMDOKUMENBAPKEHO', 'KIRIMBAP', 'KIRIMHO',
          'MUSNAHSISTEMZ87', 'MUSNAHSISTEM', 'Z87',
          'COMPLETEDAPPROVAL', 'APPROVAL',
          'COMPLETEDBA',
          'COMPLETEDMIGO', 'MIGO',
          'SJKAPSUL',
          'BAPKAPSUL',
          'CHECKKAPSUL', 'CEKKAPSUL',
          'KETERANGAN', 'REMARK', 'CATATAN', 'NOTES'
        ];

        const searchLimit = Math.min(nonEmptyRows.length, 10);
        for (let r = 0; r < searchLimit; r++) {
          const rowKeys = (nonEmptyRows[r] || []).map(normalizeKey);
          let matchCount = 0;
          rowKeys.forEach(k => {
            if (k && keySignatures.some(sig => k === sig || k.includes(sig))) {
              matchCount++;
            }
          });
          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestHeaderIdx = r;
          }
        }

        let headerRow: string[] = [];
        let dataRows: any[][] = [];

        if (bestHeaderIdx !== -1 && maxMatchCount >= 2) {
          headerRow = (nonEmptyRows[bestHeaderIdx] || []).map(normalizeKey);
          dataRows = nonEmptyRows.slice(bestHeaderIdx + 1);
        } else {
          // No clear header row detected; assume all rows are data (using standard column positions)
          headerRow = [];
          dataRows = nonEmptyRows;
        }

        // Two-phase column finder:
        // Pass 1: exact match
        // Pass 2: strict targeted token match
        const findCol = (exactKeys: string[], tokenKeys: string[] = []) => {
          if (headerRow.length === 0) return -1;
          const exactNorm = exactKeys.map(normalizeKey);
          for (let i = 0; i < headerRow.length; i++) {
            const h = headerRow[i];
            if (!h) continue;
            if (exactNorm.includes(h)) return i;
          }
          if (tokenKeys.length > 0) {
            const tokenNorm = tokenKeys.map(normalizeKey);
            for (let i = 0; i < headerRow.length; i++) {
              const h = headerRow[i];
              if (!h) continue;
              for (const tok of tokenNorm) {
                if (tok && h.includes(tok)) return i;
              }
            }
          }
          return -1;
        };

        const colTahun = findCol(['TAHUN', 'YEAR', 'THN'], ['TAHUN', 'YEAR']);
        const colBulan = findCol(['BULAN_PENGAJUAN', 'BULANPENGAJUAN', 'BULAN', 'PERIODE', 'BULAN_PERIODE', 'PENGAJUAN_BULAN'], ['BULANPENGAJUAN', 'BULAN', 'PERIODE']);
        const colQty = findCol(['QTY_PCS', 'QTYPCS', 'QTY', 'JUMLAH_PCS', 'JUMLAHPCS', 'QUANTITY', 'PCS', 'TOTAL_PCS'], ['QTY', 'JUMLAH', 'QUANTITY', 'PCS']);
        const colValue = findCol(['VALUE', 'NILAI', 'RP', 'TOTAL_VALUE', 'HARGA', 'NOMINAL', 'NILAI_RP', 'VALUER'], ['VALUE', 'NILAI', 'NOMINAL']);
        const colCogs = findCol(['COGS', 'HPP', 'COGS_RP', 'HPP_RP', 'COST'], ['COGS', 'HPP', 'COST']);
        const colSloc = findCol(['SLOC', 'GUDANG', 'STORAGE_LOCATION', 'STORAGELOCATION', 'KODE_SLOC'], ['SLOC', 'STORAGELOC']);
        const colLocation = findCol(['LOCATION', 'LOKASI', 'PLANT', 'SITE', 'AREA', 'LOKASI_GUDANG'], ['LOCATION', 'LOKASI', 'PLANT']);
        const colKategori = findCol(['KATEGORI', 'CATEGORY', 'JENIS', 'JENIS_BARANG', 'TIPE'], ['KATEGORI', 'CATEGORY']);
        const colNoPersetujuan = findCol(['NO_PERSETUJUAN', 'NOPERSETUJUAN', 'PERSETUJUAN_SCM', 'PERSETUJUANSCM', 'PERSETUJUAN'], ['PERSETUJUAN']);
        const colNoPengajuan = findCol(['NO_PENGAJUAN', 'NOPENGAJUAN', 'PENGAJUAN_AWAL', 'PENGAJUANAWAL', 'NO_DOKUMEN_PENGAJUAN'], ['NOPENGAJUAN', 'PENGAJUANAWAL']);
        const colNoPenolakanQa = findCol(['NO_PENOLAKAN_QA', 'PENOLAKAN_QA', 'NOPENOLAKANQA', 'QA_REJECT', 'PENOLAKANQA', 'QA'], ['PENOLAKAN', 'QAREJECT', 'QA']);
        const colApprovedHeadLog = findCol(['APPROVED_HEAD_LOG', 'APPROVEDHEADLOG', 'HEAD_LOG', 'HEADLOG', 'HEAD_LOGISTIC', 'APPROVED_HEAD_LOGISTIC'], ['HEADLOG', 'HEADLOGISTIC']);
        const colApprovedHoDireksi = findCol(['APPROVED_HO_DIREKSI', 'APPROVEDHODIREKSI', 'HO_DIREKSI', 'HODIREKSI', 'DIREKSI', 'APPROVED_DIREKSI'], ['HODIREKSI', 'DIREKSI']);
        const colSerahTerima = findCol(['SERAH_TERIMA_GUDANG_REJECT', 'SERAHTERIMAGUDANGREJECT', 'SERAH_TERIMA', 'SERAHTERIMA', 'GUDANG_REJECT', 'GUDANGREJECT', 'ST_REJECT'], ['SERAHTERIMA', 'GUDANGREJECT']);
        const colAccTeamsBap = findCol(['ACC_TEAMS_BAP', 'ACCTEAMSBAP', 'ACC_TEAMS', 'ACCTEAMS', 'TEAMS_BAP', 'TEAMSBAP', 'ACC_BAP', 'ACCBAP'], ['ACCTEAM', 'TEAMSBAP']);
        const colKirimBap = findCol(['KIRIM_DOKUMEN_BAP_KE_HO', 'KIRIMDOKUMENBAPKEHO', 'KIRIM_DOKUMEN_BAP', 'KIRIM_BAP_KE_HO', 'KIRIM_BAP', 'KIRIMBAP', 'KIRIM_HO'], ['KIRIMBAP', 'KIRIMDOKUMEN', 'KIRIMHO']);
        const colMusnahZ87 = findCol(['MUSNAH_SISTEM_Z87', 'MUSNAHSISTEMZ87', 'MUSNAH_SISTEM', 'MUSNAHSISTEM', 'Z87', 'MUSNAH_Z87', 'SISTEM_Z87'], ['Z87', 'MUSNAHSISTEM']);
        const colCompAppr = findCol(['COMPLETED_APPROVAL', 'COMPLETEDAPPROVAL', 'COMP_APPROVAL', 'STATUS_APPROVAL', 'APPROVAL_COMPLETED'], ['COMPLETEDAPPROVAL', 'COMPAPPROVAL']);
        const colCompBa = findCol(['COMPLETED_BA', 'COMPLETEDBA', 'STATUS_BA', 'BA_COMPLETED', 'COMP_BA'], ['COMPLETEDBA', 'COMPBA']);
        const colCompMigo = findCol(['COMPLETED_MIGO', 'COMPLETEDMIGO', 'STATUS_MIGO', 'MIGO_COMPLETED', 'COMP_MIGO'], ['COMPLETEDMIGO', 'COMPMIGO', 'MIGO']);
        const colSjKapsul = findCol(['SJ_KAPSUL', 'SJKAPSUL', 'NO_SJ_KAPSUL', 'SURAT_JALAN_KAPSUL'], ['SJKAPSUL', 'SURATJALANKAPSUL']);
        const colBapKapsul = findCol(['BAP_KAPSUL', 'BAPKAPSUL', 'NO_BAP_KAPSUL', 'BERITA_ACARA_KAPSUL'], ['BAPKAPSUL', 'BERITAACARAKAPSUL']);
        const colCheckKapsul = findCol(['CHECK_KAPSUL', 'CHECKKAPSUL', 'CEK_KAPSUL', 'CEKKAPSUL', 'STATUS_KAPSUL'], ['CHECKKAPSUL', 'CEKKAPSUL']);
        const colKeterangan = findCol(['KETERANGAN', 'CATATAN', 'REMARK', 'REMARKS', 'NOTES', 'NOTE', 'DESKRIPSI'], ['KETERANGAN', 'CATATAN', 'REMARK', 'NOTE']);

        const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const parsed: MonitoringPemusnahanItem[] = [];

        dataRows.forEach((r, idx) => {
          if (!r || r.length === 0) return;
          const hasContent = r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '');
          if (!hasContent) return;

          const getVal = (colIdx: number, defaultPos: number) => {
            if (colIdx >= 0 && colIdx < r.length && r[colIdx] !== undefined && r[colIdx] !== null) {
              return r[colIdx];
            }
            if (defaultPos >= 0 && defaultPos < r.length && r[defaultPos] !== undefined && r[defaultPos] !== null) {
              return r[defaultPos];
            }
            return '';
          };

          const rawTahun = getVal(colTahun, 0);
          const rawBulan = getVal(colBulan, 1);
          const rawQty = getVal(colQty, 2);
          const rawValue = getVal(colValue, 3);
          const rawCogs = getVal(colCogs, 4);

          const parsedTahun = parseNumeric(rawTahun) || new Date().getFullYear();
          const parsedBulan = String(rawBulan || '').trim() || `Pengajuan Baris #${idx + 1}`;
          const parsedQty = parseNumeric(rawQty);
          const parsedVal = parseNumeric(rawValue);
          const parsedCogs = parseNumeric(rawCogs);

          const cleanStatusVal = (val: any) => {
            if (val === undefined || val === null) return 'OPEN';
            const s = String(val).trim().toUpperCase();
            if (['CLOSE', 'CLOSED', 'SELESAI', 'DONE', 'YA', 'YES', 'TRUE', '1', 'OK', 'V', '✓', 'SUDAH', 'ACC'].includes(s)) {
              return 'CLOSE';
            }
            return s || 'OPEN';
          };

          const itemDraft: Partial<MonitoringPemusnahanItem> = {
            id: `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
            tahun: parsedTahun,
            bulan_pengajuan: parsedBulan,
            qty_pcs: parsedQty,
            value: parsedVal,
            cogs: parsedCogs,
            sloc: String(getVal(colSloc, 5) || '8A04').trim(),
            location: String(getVal(colLocation, 6) || 'Cikembar').trim(),
            kategori: String(getVal(colKategori, 7) || 'REGULER').trim(),
            no_persetujuan: String(getVal(colNoPersetujuan, 8) || 'OPEN').trim(),
            no_pengajuan: String(getVal(colNoPengajuan, 9) || 'OPEN').trim(),
            no_penolakan_qa: String(getVal(colNoPenolakanQa, 10) || 'OPEN').trim(),
            approved_head_log: String(getVal(colApprovedHeadLog, 11) || 'OPEN').trim(),
            approved_ho_direksi: String(getVal(colApprovedHoDireksi, 12) || 'OPEN').trim(),
            serah_terima_gudang_reject: String(getVal(colSerahTerima, 13) || 'OPEN').trim(),
            acc_teams_bap: String(getVal(colAccTeamsBap, 14) || 'OPEN').trim(),
            kirim_dokumen_bap_ke_ho: cleanStatusVal(getVal(colKirimBap, 15)),
            musnah_sistem_z87: String(getVal(colMusnahZ87, 16) || 'OPEN').trim(),
            completed_approval: cleanStatusVal(getVal(colCompAppr, 17)),
            completed_ba: cleanStatusVal(getVal(colCompBa, 18)),
            completed_migo: cleanStatusVal(getVal(colCompMigo, 19)),
            sj_kapsul: String(getVal(colSjKapsul, 20) || 'OPEN').trim(),
            bap_kapsul: String(getVal(colBapKapsul, 21) || 'OPEN').trim(),
            check_kapsul: cleanStatusVal(getVal(colCheckKapsul, 22)),
            keterangan: String(getVal(colKeterangan, 23) || '').trim()
          };

          parsed.push(toDatabaseItem(itemDraft, idx));
        });

        if (parsed.length === 0) {
          showToast('Data Tidak Ditemukan', 'Tidak ada baris data valid yang terbaca dalam file Excel.', 'warning');
          return;
        }

        setUploadPreview(parsed);
        setUploadModalOpen(true);
        showToast('File Terbaca', `${parsed.length} baris data berhasil diparsing. Silakan tinjau dan simpan ke database.`, 'info');
      } catch (err: any) {
        console.error('Error reading Excel:', err);
        showToast('Gagal Membaca File', err.message || 'Format file Excel tidak dapat dibaca.', 'danger');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Excel: Commit parsed upload rows into Supabase / Local
  const handleCommitUpload = async (mode: 'append' | 'replace') => {
    if (!uploadPreview || uploadPreview.length === 0) return;

    if (mode === 'replace' && !isAdmin) {
      showToast('Akses Ditolak', 'Mode Gantikan Semua Data (Replace) hanya dapat dilakukan oleh Admin.', 'danger');
      return;
    }

    setIsUploadingBatch(true);
    setUploadProgress(5);
    setUploadStageText('Menyiapkan dan membersihkan struktur data...');

    // 1. Prepare sanitized database-ready records
    const cleanRecords: MonitoringPemusnahanItem[] = uploadPreview.map((item, idx) => toDatabaseItem(item, idx));

    // 2. Immediately update local state & local storage so user sees data in table instantly
    setUploadProgress(15);
    setUploadStageText('Menyimpan ke memori tabel lokal...');
    const nextList = mode === 'replace' ? [...cleanRecords] : [...dataList, ...cleanRecords];
    setDataList(nextList);
    localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));

    // 3. Batch upsert to Supabase
    let dbSuccess = true;
    let dbErrorMsg = '';
    const totalRecords = cleanRecords.length;

    try {
      if (mode === 'replace') {
        setUploadProgress(25);
        setUploadStageText('Membersihkan rekaman lama di database Supabase...');
        const { error: delErr } = await supabase
          .from('monitoring_pemusnahan')
          .delete()
          .neq('id', '___empty_dummy_never_match___');
        if (delErr) {
          console.warn('Replace delete warning:', delErr);
        }
      }

      // Upsert in chunks of 25 to prevent payload limit issues
      const chunkSize = 25;
      const totalChunks = Math.ceil(totalRecords / chunkSize);
      let processedCount = 0;

      for (let i = 0; i < cleanRecords.length; i += chunkSize) {
        const chunk = cleanRecords.slice(i, i + chunkSize);
        const currentChunkNum = Math.floor(i / chunkSize) + 1;
        
        setUploadStageText(`Menyinkronkan batch ${currentChunkNum} dari ${totalChunks} (${Math.min(i + chunkSize, totalRecords)}/${totalRecords} baris) ke database Supabase...`);
        
        let { error: insErr } = await supabase
          .from('monitoring_pemusnahan')
          .upsert(chunk, { onConflict: 'id' });

        if (insErr) {
          console.warn('Upsert onConflict error, attempting standard upsert/insert...', insErr);
          const fallbackRes = await supabase
            .from('monitoring_pemusnahan')
            .upsert(chunk);
          insErr = fallbackRes.error;
        }

        if (insErr) {
          console.error('Batch upsert chunk error:', insErr);
          dbSuccess = false;
          dbErrorMsg = insErr.message || 'Gagal menyimpan ke server database';
          break;
        }

        processedCount += chunk.length;
        const calcProgress = Math.min(95, 30 + Math.round((processedCount / totalRecords) * 65));
        setUploadProgress(calcProgress);
      }

      if (dbSuccess) {
        setUploadProgress(100);
        setUploadStageText('Finalisasi dan sinkronisasi data tabel...');
        await fetchMonitoringData();
      }
      // Small pause for visual feedback
      await new Promise(res => setTimeout(res, 300));
    } catch (e: any) {
      console.error('Supabase commit exception:', e);
      dbSuccess = false;
      dbErrorMsg = e.message || 'Koneksi database terputus';
    } finally {
      setIsUploadingBatch(false);
    }

    const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (dbSuccess) {
      setUploadResultStatus({
        type: 'success',
        title: 'Berhasil Masuk ke Database Supabase',
        message: `${totalRecords} baris data monitoring pemusnahan berhasil tersimpan permanen di cloud database Supabase (${mode === 'replace' ? 'Mode Replace Seluruh Data' : 'Mode Append Tambah Data'}).`,
        recordsCount: totalRecords,
        dbSynced: true,
        timestamp
      });

      showToast(
        'Upload Berhasil',
        `${totalRecords} data monitoring pemusnahan berhasil ${mode === 'replace' ? 'menggantikan seluruh database' : 'ditambahkan ke database dan tabel'}!`,
        'success'
      );
    } else {
      setUploadResultStatus({
        type: 'warning',
        title: 'Data Masuk Tabel Lokal (Gagal Cloud Sync)',
        message: `${totalRecords} data berhasil ditampilkan di tabel lokal & browser, namun gagal disinkronkan ke Supabase. Detail kendala: ${dbErrorMsg}`,
        recordsCount: totalRecords,
        dbSynced: false,
        timestamp
      });

      showToast(
        'Data Masuk ke Tabel',
        `${totalRecords} data berhasil masuk ke tabel. (Status Server: ${dbErrorMsg})`,
        'warning'
      );
    }

    setUploadModalOpen(false);
    setUploadPreview(null);
    setUploadProgress(0);
    setUploadStageText('');
  };

  // Sync All Table Data to Supabase (One-Click Push)
  const handleSyncAllToSupabase = async () => {
    if (dataList.length === 0) {
      showToast('Tabel Kosong', 'Tidak ada data di tabel untuk disinkronkan ke Supabase.', 'info');
      return;
    }

    setIsUploadingBatch(true);
    setUploadProgress(5);
    setUploadStageText('Menyiapkan dan memvalidasi seluruh baris tabel...');

    const cleanRecords: MonitoringPemusnahanItem[] = dataList.map((item, idx) => toDatabaseItem(item, idx));
    const totalRecords = cleanRecords.length;
    let dbSuccess = true;
    let dbErrorMsg = '';

    try {
      setUploadProgress(15);
      setUploadStageText('Menghubungkan ke server database Supabase...');

      const chunkSize = 25;
      const totalChunks = Math.ceil(totalRecords / chunkSize);
      let processedCount = 0;

      for (let i = 0; i < totalRecords; i += chunkSize) {
        const chunk = cleanRecords.slice(i, i + chunkSize);
        const currentChunkNum = Math.floor(i / chunkSize) + 1;

        setUploadStageText(`Menyinkronkan batch ${currentChunkNum} dari ${totalChunks} (${Math.min(i + chunkSize, totalRecords)}/${totalRecords} baris) ke database Supabase...`);

        let { error: insErr } = await supabase
          .from('monitoring_pemusnahan')
          .upsert(chunk, { onConflict: 'id' });

        if (insErr) {
          console.warn('Upsert onConflict error, retrying without onConflict...', insErr);
          const fallbackRes = await supabase
            .from('monitoring_pemusnahan')
            .upsert(chunk);
          insErr = fallbackRes.error;
        }

        if (insErr) {
          console.error('Batch sync error:', insErr);
          dbSuccess = false;
          dbErrorMsg = insErr.message || 'Gagal menyimpan ke server database';
          break;
        }

        processedCount += chunk.length;
        const calcProgress = Math.min(95, 20 + Math.round((processedCount / totalRecords) * 75));
        setUploadProgress(calcProgress);
      }

      if (dbSuccess) {
        setUploadProgress(100);
        setUploadStageText('Verifikasi pembacaan dari cloud database...');
        await fetchMonitoringData();
      }
      await new Promise(res => setTimeout(res, 300));
    } catch (e: any) {
      console.error('Sync exception:', e);
      dbSuccess = false;
      dbErrorMsg = e.message || 'Koneksi database terputus';
    } finally {
      setIsUploadingBatch(false);
      setUploadProgress(0);
      setUploadStageText('');
    }

    const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (dbSuccess) {
      setUploadResultStatus({
        type: 'success',
        title: 'Database Supabase Terupdate',
        message: `Seluruh ${totalRecords} data di tabel monitoring pemusnahan berhasil tersimpan secara permanen di database Supabase!`,
        recordsCount: totalRecords,
        dbSynced: true,
        timestamp
      });

      showToast(
        'Sinkronisasi Sukses',
        `${totalRecords} data monitoring pemusnahan berhasil tersimpan di database Supabase!`,
        'success'
      );
    } else {
      setUploadResultStatus({
        type: 'warning',
        title: 'Sinkronisasi Database Terkendala',
        message: `Gagal mengirim ke Supabase: ${dbErrorMsg}. Klik tombol Bantuan SQL untuk memastikan tabel sudah dibuat di database.`,
        recordsCount: totalRecords,
        dbSynced: false,
        timestamp
      });

      showToast(
        'Gagal Sinkron DB',
        `Pesan server: ${dbErrorMsg}`,
        'danger'
      );
    }
  };

  // Selection Handlers (Khusus Admin)
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Delete Selected Rows (Khusus Admin)
  const handleBulkDelete = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Fungsi hapus massal khusus untuk Admin.', 'danger');
      return;
    }
    if (selectedIds.length === 0) {
      showToast('Pilih Data', 'Silakan pilih setidaknya satu baris data untuk dihapus.', 'info');
      return;
    }

    showConfirm({
      title: 'Konfirmasi Hapus Massal (Admin)',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} data monitoring pemusnahan yang dipilih secara permanen dari database?`,
      confirmText: `Ya, Hapus ${selectedIds.length} Data`,
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('monitoring_pemusnahan')
            .delete()
            .in('id', selectedIds);

          if (error) {
            console.error('Bulk delete error:', error);
            showToast('Gagal Hapus DB', error.message, 'danger');
          } else {
            showToast('Sukses Hapus Massal', `${selectedIds.length} data berhasil dihapus dari database!`, 'success');
          }
        } catch (e: any) {
          console.error(e);
        }

        const nextList = dataList.filter(d => !selectedIds.includes(d.id));
        setDataList(nextList);
        localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));
        setSelectedIds([]);
        setLoading(false);
      }
    });
  };

  // Delete All Rows (Khusus Admin)
  const handleDeleteAll = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Fungsi reset seluruh data khusus untuk Admin.', 'danger');
      return;
    }
    if (dataList.length === 0) {
      showToast('Data Kosong', 'Tidak ada data untuk dihapus.', 'info');
      return;
    }

    showConfirm({
      title: 'Hapus SEMUA Data Monitoring Pemusnahan (Admin)',
      message: `PERINGATAN: Aksi ini akan menghapus seluruh (${dataList.length}) data monitoring pemusnahan dari database. Aksi ini TIDAK DAPAT dibatalkan. Lanjutkan?`,
      confirmText: 'Ya, Kosongkan Semua',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          const allIds = dataList.map(d => d.id);
          const { error } = await supabase
            .from('monitoring_pemusnahan')
            .delete()
            .in('id', allIds);

          if (error) {
            showToast('Gagal Hapus DB', error.message, 'danger');
          } else {
            showToast('Tabel Dikosongkan', 'Seluruh data monitoring pemusnahan berhasil dikosongkan.', 'success');
          }
        } catch (e: any) {
          console.error(e);
        }

        setDataList([]);
        localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify([]));
        setSelectedIds([]);
        setLoading(false);
      }
    });
  };

  // Delete Single Row
  const handleDeleteRow = (id: string) => {
    const target = dataList.find(d => d.id === id);
    showConfirm({
      title: 'Hapus Data Monitoring',
      message: `Hapus pengajuan "${target?.bulan_pengajuan || id}" dari database?`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          await supabase.from('monitoring_pemusnahan').delete().eq('id', id);
        } catch {}
        const nextList = dataList.filter(d => d.id !== id);
        setDataList(nextList);
        localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));
        setSelectedIds(prev => prev.filter(x => x !== id));
        setLoading(false);
        showToast('Dihapus', 'Data pengajuan berhasil dihapus', 'info');
      }
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Pengajuan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL PENGAJUAN
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-200 shadow-2xs">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 leading-tight">
              {kpiStats.totalPengajuan} <span className="text-xs font-bold text-slate-500">Berkas</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Seluruh periode filter</div>
          </div>
        </div>

        {/* Card 2: Total Qty Pcs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL QTY PCS
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Box size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 leading-tight truncate">
              {formatNumber(kpiStats.totalQty)} <span className="text-xs font-bold text-emerald-600">pcs</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Pcs fisik dimusnahkan</div>
          </div>
        </div>

        {/* Card 3: Total Value & COGS */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
              TOTAL VALUE (RP)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-2xs">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-blue-950 leading-tight truncate">
              Rp {formatNumber(kpiStats.totalValue)}
            </div>
            <div className="text-[11px] text-blue-800 font-semibold mt-0.5 truncate">
              COGS: Rp {formatNumber(kpiStats.totalCogs)}
            </div>
          </div>
        </div>

        {/* Card 4: Status Pipeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              STATUS PIPELINE
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-2xs">
              <PieIcon size={16} />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 leading-tight mb-1">
              {kpiStats.pctSelesai}% <span className="text-xs font-semibold text-slate-500">Selesai</span>
            </div>
            {/* Split bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${kpiStats.pctSelesai}%` }}
                title={`Selesai: ${kpiStats.selesaiCount}`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${100 - kpiStats.pctSelesai}%` }}
                title={`Proses: ${kpiStats.prosesCount}`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-600 mt-1">
              <span className="text-emerald-700">● Selesai {kpiStats.selesaiCount}</span>
              <span className="text-amber-700">● Proses {kpiStats.prosesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Excel File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleExcelSelected}
        className="hidden"
      />

      {/* Toolbar Filter & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col gap-3">
        {/* Top Row: Search & Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Sort Mode Filter (Urutan Database Default) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Database size={13} className="text-blue-900 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Urutan:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="text-xs font-bold bg-transparent outline-none text-blue-950 cursor-pointer"
                title="Urutan Tampilan Tabel"
              >
                <option value="db">Urutan Database (Bulan Pengajuan Sesuai Baris Database)</option>
                <option value="year-desc">Tahun Terbaru</option>
                <option value="qty-desc">Qty Terbanyak</option>
                <option value="value-desc">Nilai (Value) Terbesar</option>
              </select>
            </div>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
            >
              <option value="all">Semua Status</option>
              <option value="SELESAI">Selesai</option>
              <option value="PROSES">Proses</option>
            </select>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bulan pengajuan, no dokumen, SLOC..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-600 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <span className="text-[11px] font-bold text-slate-500 px-2 py-1 bg-slate-100 rounded-lg">
              {filteredRecords.length} / {dataList.length} data
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Scroll Nav */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all flex items-center gap-1 cursor-pointer"
                title="Gulir Tabel ke Sisi Kiri"
              >
                <ArrowLeft size={12} />
                <span>Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-all flex items-center gap-1 cursor-pointer"
                title="Gulir Tabel ke Kolom Terakhir (Kolom 27)"
              >
                <span>Kanan (Kolom 27)</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Excel Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Unggah Data dari File Excel (.xlsx / .xls / .csv)"
            >
              <UploadCloud size={14} />
              <span>Upload Data Excel</span>
            </button>

            {/* Sync All Local Table Data to Supabase */}
            <button
              type="button"
              onClick={handleSyncAllToSupabase}
              disabled={isUploadingBatch || dataList.length === 0}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Kirim dan sinkronkan seluruh data di tabel ke database Supabase"
            >
              <Server size={14} className={isUploadingBatch ? 'animate-spin' : ''} />
              <span>Sync ke Supabase</span>
              <span className="ml-0.5 px-1.5 py-0.2 bg-blue-800 text-[10px] rounded-full font-mono">
                {dataList.length}
              </span>
            </button>

            {/* Download Template */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Unduh Format Template Excel untuk Upload"
            >
              <Download size={13} />
              <span>Template</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Ekspor Data Tampil ke File Excel"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenFormModal()}
              className="px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Form Baru</span>
            </button>

            <button
              type="button"
              onClick={handleAddNewInlineRow}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-blue-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Inline</span>
            </button>

            <button
              type="button"
              onClick={() => setSqlGuideModalOpen(true)}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs transition-all cursor-pointer"
              title="Skrip SQL Tabel Database Supabase"
            >
              <Code2 size={14} className="text-indigo-600" />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={loading || dataList.length === 0}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Khusus Admin: Kosongkan seluruh data di database"
              >
                <Trash2 size={13} />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchMonitoringData}
              disabled={loading}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs transition-all cursor-pointer"
              title="Refresh data dari database"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-blue-900' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Database Feedback / Status Indicator */}
      {uploadResultStatus && (
        <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          uploadResultStatus.type === 'success'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : uploadResultStatus.type === 'warning'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-red-50/90 border-red-300 text-red-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              uploadResultStatus.type === 'success'
                ? 'bg-emerald-600 text-white shadow-xs'
                : uploadResultStatus.type === 'warning'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-red-600 text-white shadow-xs'
            }`}>
              {uploadResultStatus.type === 'success' ? (
                <CheckCheck size={20} />
              ) : uploadResultStatus.type === 'warning' ? (
                <AlertTriangle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-sm uppercase tracking-wide">
                  {uploadResultStatus.title}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  uploadResultStatus.dbSynced
                    ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-200 text-amber-900 border border-amber-300'
                }`}>
                  {uploadResultStatus.dbSynced ? '● Database Synced' : '▲ Local Storage Only'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {uploadResultStatus.timestamp}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">
                {uploadResultStatus.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={fetchMonitoringData}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Periksa sinkronisasi database terkini"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Verifikasi DB</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadResultStatus(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5 transition-all cursor-pointer"
              title="Tutup notifikasi status"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Live Upload Progress Indicator in Main View (When modal is syncing) */}
      {isUploadingBatch && (
        <div className="p-4 bg-blue-50/90 border-2 border-blue-300 rounded-2xl shadow-sm space-y-2 animate-in fade-in">
          <div className="flex justify-between items-center text-xs font-black text-blue-950">
            <span className="flex items-center gap-2">
              <Server size={16} className="animate-pulse text-blue-700" />
              <span>{uploadStageText || 'Sedang mengirimkan data ke database Supabase...'}</span>
            </span>
            <span className="font-mono bg-blue-200 text-blue-900 px-2 py-0.5 rounded-md text-xs font-black">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden p-0.5 border border-blue-200">
            <div
              className="bg-linear-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full shadow-inner"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Admin Bulk Action Banner */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl animate-in fade-in duration-150 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse shrink-0"></span>
            <div>
              <span className="text-xs font-black text-red-950 uppercase tracking-wide">
                Mode Admin: {selectedIds.length} Dari {filteredRecords.length} Data Dipilih
              </span>
              <p className="text-[11px] text-red-700 font-medium m-0">
                Pilih aksi massal untuk menghapus data terpilih sekaligus dari database.
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

      {/* Main Wide Scrollable Table (25 Columns) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-medium">
          <span>
            💡 Petunjuk: Tabel dapat digeser horizontal hingga <strong>25 kolom data lengkap</strong> (Kolom terakhir: KETERANGAN).
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => handleScroll('left')} className="p-1 hover:text-blue-900"><ArrowLeft size={14} /></button>
            <button onClick={() => handleScroll('right')} className="p-1 hover:text-blue-900"><ArrowRight size={14} /></button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[2600px]">
            <thead className="sticky top-0 bg-blue-50/95 backdrop-blur-xs text-blue-950 font-bold border-b border-slate-200 z-20 uppercase tracking-wider text-[10px]">
              <tr>
                <th className={`sticky left-0 bg-blue-100/90 py-3 px-2 text-center z-30 shadow-xs border-r border-blue-200 ${isAdmin ? 'w-36' : 'w-28'}`}>
                  <div className="flex items-center justify-center gap-2">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                        onChange={handleToggleSelectAll}
                        title="Pilih Semua Baris (Admin)"
                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                      />
                    )}
                    <span>AKSI</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-20">TAHUN</th>
                <th className="py-3 px-3 min-w-[180px]">BULAN_PENGAJUAN</th>
                <th className="py-3 px-3 text-right min-w-[110px]">QTY_PCS</th>
                <th className="py-3 px-3 text-right min-w-[130px]">VALUE</th>
                <th className="py-3 px-3 text-right min-w-[130px]">COGS</th>
                <th className="py-3 px-3 min-w-[80px]">SLOC</th>
                <th className="py-3 px-3 min-w-[100px]">LOCATION</th>
                <th className="py-3 px-3 min-w-[100px]">KATEGORI</th>
                <th className="py-3 px-3 min-w-[160px]">NO_PERSETUJUAN</th>
                <th className="py-3 px-3 min-w-[160px]">NO_PENGAJUAN</th>
                <th className="py-3 px-3 min-w-[160px]">NO_PENOLAKAN_QA</th>
                <th className="py-3 px-3 min-w-[160px]">APPROVED_HEAD_LOG</th>
                <th className="py-3 px-3 min-w-[160px]">APPROVED_HO_DIREKSI</th>
                <th className="py-3 px-3 min-w-[190px]">SERAH_TERIMA_GUDANG_REJECT</th>
                <th className="py-3 px-3 min-w-[160px]">ACC_TEAMS_BAP</th>
                <th className="py-3 px-3 min-w-[130px]">KIRIM_DOKUMEN_BAP_KE_HO</th>
                <th className="py-3 px-3 min-w-[160px]">MUSNAH_SISTEM_Z87</th>
                <th className="py-3 px-3 min-w-[130px]">COMPLETED_APPROVAL</th>
                <th className="py-3 px-3 min-w-[130px]">COMPLETED_BA</th>
                <th className="py-3 px-3 min-w-[130px]">COMPLETED_MIGO</th>
                <th className="py-3 px-3 min-w-[150px]">SJ_KAPSUL</th>
                <th className="py-3 px-3 min-w-[150px]">BAP_KAPSUL</th>
                <th className="py-3 px-3 min-w-[130px]">CHECK_KAPSUL</th>
                <th className="py-3 px-3 min-w-[180px]">KETERANGAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {/* Inline Row Adding Form */}
              {editingRowId === 'NEW' && (
                <tr className="bg-emerald-50/60 border-2 border-emerald-300">
                  <td className="sticky left-0 bg-emerald-100 py-2 px-2 text-center z-20 border-r border-emerald-300">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={handleSaveInlineEdit}
                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 cursor-pointer shadow-2xs"
                        title="Simpan"
                      >
                        <Save size={11} /> Simpan
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelInlineEdit}
                        className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] cursor-pointer"
                        title="Batal"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </td>
                  <td className="p-1.5"><input type="number" value={inlineDraft.tahun || ''} onChange={e => setInlineDraft({...inlineDraft, tahun: parseInt(e.target.value) || 2026})} className="w-16 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.bulan_pengajuan || ''} onChange={e => setInlineDraft({...inlineDraft, bulan_pengajuan: e.target.value})} placeholder="Contoh: Pengajuan Jan W1 - 26" className="w-48 p-1 text-xs border rounded bg-white font-bold" /></td>
                  <td className="p-1.5"><input type="number" value={inlineDraft.qty_pcs || ''} onChange={e => setInlineDraft({...inlineDraft, qty_pcs: parseFloat(e.target.value) || 0})} className="w-24 p-1 text-xs border rounded bg-white text-right font-mono" /></td>
                  <td className="p-1.5"><input type="number" value={inlineDraft.value || ''} onChange={e => setInlineDraft({...inlineDraft, value: parseFloat(e.target.value) || 0})} className="w-28 p-1 text-xs border rounded bg-white text-right font-mono" /></td>
                  <td className="p-1.5"><input type="number" value={inlineDraft.cogs || ''} onChange={e => setInlineDraft({...inlineDraft, cogs: parseFloat(e.target.value) || 0})} className="w-28 p-1 text-xs border rounded bg-white text-right font-mono" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.sloc || ''} onChange={e => setInlineDraft({...inlineDraft, sloc: e.target.value})} className="w-16 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.location || ''} onChange={e => setInlineDraft({...inlineDraft, location: e.target.value})} className="w-24 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.kategori || ''} onChange={e => setInlineDraft({...inlineDraft, kategori: e.target.value})} className="w-24 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.no_persetujuan || ''} onChange={e => setInlineDraft({...inlineDraft, no_persetujuan: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.no_pengajuan || ''} onChange={e => setInlineDraft({...inlineDraft, no_pengajuan: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.no_penolakan_qa || ''} onChange={e => setInlineDraft({...inlineDraft, no_penolakan_qa: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.approved_head_log || ''} onChange={e => setInlineDraft({...inlineDraft, approved_head_log: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.approved_ho_direksi || ''} onChange={e => setInlineDraft({...inlineDraft, approved_ho_direksi: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.serah_terima_gudang_reject || ''} onChange={e => setInlineDraft({...inlineDraft, serah_terima_gudang_reject: e.target.value})} className="w-44 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.acc_teams_bap || ''} onChange={e => setInlineDraft({...inlineDraft, acc_teams_bap: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5">
                    <select value={inlineDraft.kirim_dokumen_bap_ke_ho || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, kirim_dokumen_bap_ke_ho: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.musnah_sistem_z87 || ''} onChange={e => setInlineDraft({...inlineDraft, musnah_sistem_z87: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5">
                    <select value={inlineDraft.completed_approval || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, completed_approval: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </td>
                  <td className="p-1.5">
                    <select value={inlineDraft.completed_ba || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, completed_ba: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </td>
                  <td className="p-1.5">
                    <select value={inlineDraft.completed_migo || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, completed_migo: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.sj_kapsul || ''} onChange={e => setInlineDraft({...inlineDraft, sj_kapsul: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.bap_kapsul || ''} onChange={e => setInlineDraft({...inlineDraft, bap_kapsul: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                  <td className="p-1.5">
                    <select value={inlineDraft.check_kapsul || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, check_kapsul: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </td>
                  <td className="p-1.5"><input type="text" value={inlineDraft.keterangan || ''} onChange={e => setInlineDraft({...inlineDraft, keterangan: e.target.value})} className="w-40 p-1 text-xs border rounded bg-white" /></td>
                </tr>
              )}

              {/* Data Rows */}
              {filteredRecords.length === 0 && editingRowId !== 'NEW' ? (
                <tr>
                  <td colSpan={25} className="py-8 text-center text-slate-400">
                    Tidak ada data monitoring pemusnahan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isEditing = editingRowId === r.id;

                  if (isEditing) {
                    return (
                      <tr key={r.id} className="bg-amber-50/70 border-2 border-amber-300">
                        <td className="sticky left-0 bg-amber-100 py-2 px-2 text-center z-20 border-r border-amber-300">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveInlineEdit}
                              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 cursor-pointer shadow-2xs"
                              title="Simpan"
                            >
                              <Save size={11} /> Simpan
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelInlineEdit}
                              className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] cursor-pointer"
                              title="Batal"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        </td>
                        <td className="p-1.5"><input type="number" value={inlineDraft.tahun || ''} onChange={e => setInlineDraft({...inlineDraft, tahun: parseInt(e.target.value) || 2026})} className="w-16 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.bulan_pengajuan || ''} onChange={e => setInlineDraft({...inlineDraft, bulan_pengajuan: e.target.value})} className="w-48 p-1 text-xs border rounded bg-white font-bold" /></td>
                        <td className="p-1.5"><input type="number" value={inlineDraft.qty_pcs || ''} onChange={e => setInlineDraft({...inlineDraft, qty_pcs: parseFloat(e.target.value) || 0})} className="w-24 p-1 text-xs border rounded bg-white text-right font-mono" /></td>
                        <td className="p-1.5"><input type="number" value={inlineDraft.value || ''} onChange={e => setInlineDraft({...inlineDraft, value: parseFloat(e.target.value) || 0})} className="w-28 p-1 text-xs border rounded bg-white text-right font-mono" /></td>
                        <td className="p-1.5"><input type="number" value={inlineDraft.cogs || ''} onChange={e => setInlineDraft({...inlineDraft, cogs: parseFloat(e.target.value) || 0})} className="w-28 p-1 text-xs border rounded bg-white text-right font-mono" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.sloc || ''} onChange={e => setInlineDraft({...inlineDraft, sloc: e.target.value})} className="w-16 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.location || ''} onChange={e => setInlineDraft({...inlineDraft, location: e.target.value})} className="w-24 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.kategori || ''} onChange={e => setInlineDraft({...inlineDraft, kategori: e.target.value})} className="w-24 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.no_persetujuan || ''} onChange={e => setInlineDraft({...inlineDraft, no_persetujuan: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.no_pengajuan || ''} onChange={e => setInlineDraft({...inlineDraft, no_pengajuan: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.no_penolakan_qa || ''} onChange={e => setInlineDraft({...inlineDraft, no_penolakan_qa: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.approved_head_log || ''} onChange={e => setInlineDraft({...inlineDraft, approved_head_log: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.approved_ho_direksi || ''} onChange={e => setInlineDraft({...inlineDraft, approved_ho_direksi: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.serah_terima_gudang_reject || ''} onChange={e => setInlineDraft({...inlineDraft, serah_terima_gudang_reject: e.target.value})} className="w-44 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.acc_teams_bap || ''} onChange={e => setInlineDraft({...inlineDraft, acc_teams_bap: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5">
                          <select value={inlineDraft.kirim_dokumen_bap_ke_ho || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, kirim_dokumen_bap_ke_ho: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSE">CLOSE</option>
                          </select>
                        </td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.musnah_sistem_z87 || ''} onChange={e => setInlineDraft({...inlineDraft, musnah_sistem_z87: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5">
                          <select value={inlineDraft.completed_approval || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, completed_approval: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSE">CLOSE</option>
                          </select>
                        </td>
                        <td className="p-1.5">
                          <select value={inlineDraft.completed_ba || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, completed_ba: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSE">CLOSE</option>
                          </select>
                        </td>
                        <td className="p-1.5">
                          <select value={inlineDraft.completed_migo || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, completed_migo: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSE">CLOSE</option>
                          </select>
                        </td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.sj_kapsul || ''} onChange={e => setInlineDraft({...inlineDraft, sj_kapsul: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.bap_kapsul || ''} onChange={e => setInlineDraft({...inlineDraft, bap_kapsul: e.target.value})} className="w-36 p-1 text-xs border rounded bg-white" /></td>
                        <td className="p-1.5">
                          <select value={inlineDraft.check_kapsul || 'OPEN'} onChange={e => setInlineDraft({...inlineDraft, check_kapsul: e.target.value})} className="p-1 text-xs border rounded bg-white font-bold">
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSE">CLOSE</option>
                          </select>
                        </td>
                        <td className="p-1.5"><input type="text" value={inlineDraft.keterangan || ''} onChange={e => setInlineDraft({...inlineDraft, keterangan: e.target.value})} className="w-40 p-1 text-xs border rounded bg-white" /></td>
                      </tr>
                    );
                  }

                  const isSelected = selectedIds.includes(r.id);

                  return (
                    <tr key={r.id} className={`transition-colors ${isSelected ? 'bg-red-50/70 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                      <td className={`sticky left-0 py-2.5 px-2 text-center z-10 border-r border-slate-200 ${isSelected ? 'bg-red-100/90' : 'bg-white hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-center gap-1.5">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(r.id)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                              title="Pilih data untuk aksi massal"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenFormModal(r)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Edit Form Lengkap"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartInlineEdit(r)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Edit Baris Inline"
                          >
                            <Layers size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailModalItem(r)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Lihat Detail Jejak Alur"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(r.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                            title="Hapus Pengajuan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{r.tahun}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.bulan_pengajuan}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(r.qty_pcs)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">Rp {formatNumber(r.value)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">Rp {formatNumber(r.cogs)}</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">{r.sloc}</span></td>
                      <td className="py-2.5 px-3 text-slate-700">{r.location}</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold text-[10px] border border-amber-200">{r.kategori}</span></td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.no_persetujuan || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.no_pengajuan || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.no_penolakan_qa || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.approved_head_log || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.approved_ho_direksi || '-'}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">{r.serah_terima_gudang_reject || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.acc_teams_bap || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${r.kirim_dokumen_bap_ke_ho === 'CLOSE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.kirim_dokumen_bap_ke_ho || 'OPEN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.musnah_sistem_z87 || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${r.completed_approval === 'CLOSE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.completed_approval || 'OPEN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${r.completed_ba === 'CLOSE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.completed_ba || 'OPEN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${r.completed_migo === 'CLOSE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.completed_migo || 'OPEN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.sj_kapsul || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.bap_kapsul || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${r.check_kapsul === 'CLOSE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.check_kapsul || 'OPEN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">{r.keterangan || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL (Jejak Alur Pemusnahan) */}
      {detailModalItem && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-start bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 m-0">{detailModalItem.bulan_pengajuan}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${detailModalItem.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {detailModalItem.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 m-0">
                  Tahun {detailModalItem.tahun} • SLOC {detailModalItem.sloc} • {detailModalItem.location} ({detailModalItem.kategori})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="text-slate-400 hover:text-slate-700 bg-slate-200/80 hover:bg-slate-300 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Top 3 Stats in Modal */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Qty Pcs</div>
                  <div className="text-sm font-extrabold text-slate-900">{formatNumber(detailModalItem.qty_pcs)} pcs</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[10px] font-bold text-blue-900 uppercase">Value (Rp)</div>
                  <div className="text-sm font-extrabold text-blue-950">Rp {formatNumber(detailModalItem.value)}</div>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">COGS (Rp)</div>
                  <div className="text-sm font-extrabold text-slate-700">Rp {formatNumber(detailModalItem.cogs)}</div>
                </div>
              </div>

              {/* Pipeline Trail Checklist */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Jejak Alur Proses Pemusnahan
                </h4>

                <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {PIPELINE_STEPS.map((step) => {
                    const val = (detailModalItem as any)[step.key];
                    const isPending = !val || String(val).trim() === '' || String(val).trim().toUpperCase() === 'OPEN';

                    return (
                      <div key={step.key} className="relative flex items-baseline justify-between text-xs">
                        <span className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isPending ? <Clock size={10} /> : <Check size={10} />}
                        </span>
                        <span className="font-bold text-slate-800 mr-2">{step.label}</span>
                        <span className={`font-mono text-right break-all ${isPending ? 'text-slate-400 italic' : 'text-slate-900 font-semibold'}`}>
                          {isPending ? 'Belum diproses' : String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {detailModalItem.keterangan && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Keterangan:</span>
                  <p className="m-0 mt-0.5 text-slate-600">{detailModalItem.keterangan}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (ADD / EDIT) */}
      {formModalOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">
                    {formModalItem.id ? `Edit Data Pengajuan (${formModalItem.bulan_pengajuan})` : 'Tambah Pengajuan Pemusnahan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 m-0">Isi rincian informasi dan status alur dokumen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-200/80 hover:bg-slate-300 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFormModal} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Section 1 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h5 className="font-bold text-blue-950 text-xs uppercase tracking-wider m-0">
                  1. Informasi Utama & Nilai Inventori
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tahun *</label>
                    <input
                      type="number"
                      required
                      value={formModalItem.tahun || ''}
                      onChange={e => setFormModalItem({...formModalItem, tahun: parseInt(e.target.value) || 2026})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Bulan Pengajuan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pengajuan Jan W1 - 26"
                      value={formModalItem.bulan_pengajuan || ''}
                      onChange={e => setFormModalItem({...formModalItem, bulan_pengajuan: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Qty Pcs</label>
                    <input
                      type="number"
                      value={formModalItem.qty_pcs || ''}
                      onChange={e => setFormModalItem({...formModalItem, qty_pcs: parseFloat(e.target.value) || 0})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Value (Rp)</label>
                    <input
                      type="number"
                      value={formModalItem.value || ''}
                      onChange={e => setFormModalItem({...formModalItem, value: parseFloat(e.target.value) || 0})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">COGS (Rp)</label>
                    <input
                      type="number"
                      value={formModalItem.cogs || ''}
                      onChange={e => setFormModalItem({...formModalItem, cogs: parseFloat(e.target.value) || 0})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SLOC</label>
                    <input
                      type="text"
                      value={formModalItem.sloc || ''}
                      onChange={e => setFormModalItem({...formModalItem, sloc: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={formModalItem.location || ''}
                      onChange={e => setFormModalItem({...formModalItem, location: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                    <input
                      type="text"
                      value={formModalItem.kategori || ''}
                      onChange={e => setFormModalItem({...formModalItem, kategori: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h5 className="font-bold text-blue-950 text-xs uppercase tracking-wider m-0">
                  2. Dokumen & Persetujuan
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No Persetujuan</label>
                    <input
                      type="text"
                      value={formModalItem.no_persetujuan || ''}
                      onChange={e => setFormModalItem({...formModalItem, no_persetujuan: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No Pengajuan</label>
                    <input
                      type="text"
                      value={formModalItem.no_pengajuan || ''}
                      onChange={e => setFormModalItem({...formModalItem, no_pengajuan: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No Penolakan QA</label>
                    <input
                      type="text"
                      value={formModalItem.no_penolakan_qa || ''}
                      onChange={e => setFormModalItem({...formModalItem, no_penolakan_qa: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Approved Head Log</label>
                    <input
                      type="text"
                      value={formModalItem.approved_head_log || ''}
                      onChange={e => setFormModalItem({...formModalItem, approved_head_log: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Approved HO Direksi</label>
                    <input
                      type="text"
                      value={formModalItem.approved_ho_direksi || ''}
                      onChange={e => setFormModalItem({...formModalItem, approved_ho_direksi: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Serah Terima Gudang Reject</label>
                    <input
                      type="text"
                      value={formModalItem.serah_terima_gudang_reject || ''}
                      onChange={e => setFormModalItem({...formModalItem, serah_terima_gudang_reject: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h5 className="font-bold text-blue-950 text-xs uppercase tracking-wider m-0">
                  3. Eksekusi Sistem & Checklist Completion
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ACC Teams BAP</label>
                    <input
                      type="text"
                      value={formModalItem.acc_teams_bap || ''}
                      onChange={e => setFormModalItem({...formModalItem, acc_teams_bap: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kirim Dokumen BAP ke HO</label>
                    <select
                      value={formModalItem.kirim_dokumen_bap_ke_ho || 'OPEN'}
                      onChange={e => setFormModalItem({...formModalItem, kirim_dokumen_bap_ke_ho: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Musnah Sistem Z87</label>
                    <input
                      type="text"
                      value={formModalItem.musnah_sistem_z87 || ''}
                      onChange={e => setFormModalItem({...formModalItem, musnah_sistem_z87: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Completed Approval</label>
                    <select
                      value={formModalItem.completed_approval || 'OPEN'}
                      onChange={e => setFormModalItem({...formModalItem, completed_approval: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Completed BA</label>
                    <select
                      value={formModalItem.completed_ba || 'OPEN'}
                      onChange={e => setFormModalItem({...formModalItem, completed_ba: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Completed MIGO</label>
                    <select
                      value={formModalItem.completed_migo || 'OPEN'}
                      onChange={e => setFormModalItem({...formModalItem, completed_migo: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SJ Kapsul</label>
                    <input
                      type="text"
                      value={formModalItem.sj_kapsul || ''}
                      onChange={e => setFormModalItem({...formModalItem, sj_kapsul: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">BAP Kapsul</label>
                    <input
                      type="text"
                      value={formModalItem.bap_kapsul || ''}
                      onChange={e => setFormModalItem({...formModalItem, bap_kapsul: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Check Kapsul</label>
                    <select
                      value={formModalItem.check_kapsul || 'OPEN'}
                      onChange={e => setFormModalItem({...formModalItem, check_kapsul: e.target.value})}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="CLOSE">CLOSE</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Keterangan / Catatan Tambahan</label>
                    <input
                      type="text"
                      value={formModalItem.keterangan || ''}
                      onChange={e => setFormModalItem({...formModalItem, keterangan: e.target.value})}
                      placeholder="Catatan tambahan..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Preview Modal */}
      {uploadModalOpen && uploadPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-800 rounded-xl">
                  <UploadCloud size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Pratinjau Data Upload Excel
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    File: <span className="font-bold underline">{uploadFileName}</span> — Terbaca <strong>{uploadPreview.length}</strong> baris data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadPreview(null);
                }}
                disabled={isUploadingBatch}
                className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Total Baris</span>
                  <div className="text-base font-black text-slate-900">{uploadPreview.length} Data</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Total Qty Pcs</span>
                  <div className="text-base font-black text-blue-950">
                    {formatNumber(uploadPreview.reduce((s, r) => s + (Number(r.qty_pcs) || 0), 0))} Pcs
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Total Value (Rp)</span>
                  <div className="text-base font-black text-emerald-950 truncate">
                    Rp {formatNumber(uploadPreview.reduce((s, r) => s + (Number(r.value) || 0), 0))}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Total COGS (Rp)</span>
                  <div className="text-base font-black text-amber-950 truncate">
                    Rp {formatNumber(uploadPreview.reduce((s, r) => s + (Number(r.cogs) || 0), 0))}
                  </div>
                </div>
              </div>

              {/* Progress Bar & Status Indicator when uploading */}
              {isUploadingBatch && (
                <div className="p-4 bg-blue-50/90 border-2 border-blue-200 rounded-2xl space-y-2.5 animate-in fade-in">
                  <div className="flex justify-between items-center text-xs font-black text-blue-950">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-blue-700 shrink-0" />
                      <span>{uploadStageText || 'Sedang memproses dan menyimpan data ke database Supabase...'}</span>
                    </span>
                    <span className="font-mono bg-blue-200 text-blue-900 px-2 py-0.5 rounded-md text-xs font-black">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden p-0.5 border border-blue-200">
                    <div
                      className="bg-linear-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800">
                    <span className="flex items-center gap-1.5">
                      <Server size={13} />
                      Target: Cloud Supabase & Local Table State
                    </span>
                    <span>Harap tunggu, proses sedang berjalan...</span>
                  </div>
                </div>
              )}

              {/* Data Table Sample Preview */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                    Tabel Pratinjau (Menampilkan {Math.min(uploadPreview.length, 10)} dari {uploadPreview.length} baris):
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Geser tabel untuk melihat kolom lainnya
                  </span>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-60 overflow-y-auto shadow-inner bg-white">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">No</th>
                        <th className="py-2 px-3">Tahun</th>
                        <th className="py-2 px-3">Bulan Pengajuan</th>
                        <th className="py-2 px-3 text-right">Qty (Pcs)</th>
                        <th className="py-2 px-3 text-right">Value (Rp)</th>
                        <th className="py-2 px-3 text-right">COGS (Rp)</th>
                        <th className="py-2 px-3">SLOC</th>
                        <th className="py-2 px-3">Lokasi</th>
                        <th className="py-2 px-3">Kategori</th>
                        <th className="py-2 px-3">No Pengajuan</th>
                        <th className="py-2 px-3">No Persetujuan</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {uploadPreview.slice(0, 10).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3">{r.tahun}</td>
                          <td className="py-2 px-3 font-bold text-blue-950">{r.bulan_pengajuan}</td>
                          <td className="py-2 px-3 text-right">{formatNumber(r.qty_pcs)}</td>
                          <td className="py-2 px-3 text-right">{formatNumber(r.value)}</td>
                          <td className="py-2 px-3 text-right">{formatNumber(r.cogs)}</td>
                          <td className="py-2 px-3 font-mono">{r.sloc}</td>
                          <td className="py-2 px-3">{r.location}</td>
                          <td className="py-2 px-3">{r.kategori}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{r.no_pengajuan}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{r.no_persetujuan}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              r.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {uploadPreview.length > 10 && (
                  <p className="text-[11px] text-slate-400 text-right mt-1 font-medium">
                    + {uploadPreview.length - 10} baris data lainnya akan ikut disimpan ke database.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer / Commit Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadPreview(null);
                }}
                disabled={isUploadingBatch}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 cursor-pointer w-full sm:w-auto"
              >
                Batal
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      showConfirm({
                        title: 'Gantikan Seluruh Data? (Replace)',
                        message: `PERINGATAN: Aksi ini akan menghapus data lama di database dan menggantikannya dengan ${uploadPreview.length} data baru dari file Excel. Lanjutkan?`,
                        confirmText: 'Ya, Gantikan Seluruh Data',
                        cancelText: 'Batal',
                        type: 'danger',
                        onConfirm: () => handleCommitUpload('replace')
                      });
                    }}
                    disabled={isUploadingBatch}
                    className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-bold text-xs cursor-pointer shadow-2xs transition-all flex items-center gap-1.5"
                    title="Khusus Admin: Ganti seluruh isi tabel dengan data Excel"
                  >
                    <Trash2 size={13} />
                    <span>Gantikan Seluruh Data (Replace)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCommitUpload('append')}
                  disabled={isUploadingBatch}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <CheckCheck size={15} />
                  <span>Tambahkan ke Database ({uploadPreview.length} Data)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup & Schema Helper Modal */}
      {sqlGuideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-800/80 border border-blue-700/50">
                  <Database size={20} className="text-blue-300" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">Skrip SQL Tabel Monitoring Pemusnahan</h3>
                  <p className="text-xs text-blue-200 font-medium">Jalankan di Supabase SQL Editor jika tabel belum dibuat atau ada kendala schema</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSqlGuideModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-medium leading-relaxed">
                💡 <span className="font-bold">Langkah Cepat:</span> Buka dashboard <b>Supabase</b> Anda &gt; menu <b>SQL Editor</b> &gt; tempel (paste) skrip di bawah ini &gt; klik <b>Run</b>.
              </div>

              <div className="relative group">
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed max-h-72 select-all">
{`-- 1. Buat Tabel monitoring_pemusnahan
CREATE TABLE IF NOT EXISTS public.monitoring_pemusnahan (
    id VARCHAR(100) PRIMARY KEY,
    tahun INT NOT NULL,
    bulan_pengajuan VARCHAR(150) NOT NULL,
    qty_pcs NUMERIC(15,2) DEFAULT 0,
    value NUMERIC(18,2) DEFAULT 0,
    cogs NUMERIC(18,2) DEFAULT 0,
    sloc VARCHAR(50) DEFAULT '8A04',
    location VARCHAR(100) DEFAULT 'Cikembar',
    kategori VARCHAR(100) DEFAULT 'REGULER',
    no_persetujuan VARCHAR(150) DEFAULT '',
    no_pengajuan VARCHAR(150) DEFAULT '',
    no_penolakan_qa VARCHAR(150) DEFAULT '',
    approved_head_log VARCHAR(255) DEFAULT '',
    approved_ho_direksi VARCHAR(255) DEFAULT '',
    serah_terima_gudang_reject VARCHAR(255) DEFAULT '',
    acc_teams_bap VARCHAR(255) DEFAULT '',
    kirim_dokumen_bap_ke_ho TEXT DEFAULT 'OPEN',
    musnah_sistem_z87 VARCHAR(255) DEFAULT '',
    completed_approval TEXT DEFAULT 'OPEN',
    completed_ba TEXT DEFAULT 'OPEN',
    completed_migo TEXT DEFAULT 'OPEN',
    sj_kapsul VARCHAR(150) DEFAULT '',
    bap_kapsul VARCHAR(150) DEFAULT '',
    check_kapsul TEXT DEFAULT 'OPEN',
    keterangan TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'PROSES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_update TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Nonaktifkan RLS & Berikan Hak Akses Penuh
ALTER TABLE public.monitoring_pemusnahan DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.monitoring_pemusnahan TO anon, authenticated;`}
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    const sqlText = `-- 1. Buat Tabel monitoring_pemusnahan
CREATE TABLE IF NOT EXISTS public.monitoring_pemusnahan (
    id VARCHAR(100) PRIMARY KEY,
    tahun INT NOT NULL,
    bulan_pengajuan VARCHAR(150) NOT NULL,
    qty_pcs NUMERIC(15,2) DEFAULT 0,
    value NUMERIC(18,2) DEFAULT 0,
    cogs NUMERIC(18,2) DEFAULT 0,
    sloc VARCHAR(50) DEFAULT '8A04',
    location VARCHAR(100) DEFAULT 'Cikembar',
    kategori VARCHAR(100) DEFAULT 'REGULER',
    no_persetujuan VARCHAR(150) DEFAULT '',
    no_pengajuan VARCHAR(150) DEFAULT '',
    no_penolakan_qa VARCHAR(150) DEFAULT '',
    approved_head_log VARCHAR(255) DEFAULT '',
    approved_ho_direksi VARCHAR(255) DEFAULT '',
    serah_terima_gudang_reject VARCHAR(255) DEFAULT '',
    acc_teams_bap VARCHAR(255) DEFAULT '',
    kirim_dokumen_bap_ke_ho TEXT DEFAULT 'OPEN',
    musnah_sistem_z87 VARCHAR(255) DEFAULT '',
    completed_approval TEXT DEFAULT 'OPEN',
    completed_ba TEXT DEFAULT 'OPEN',
    completed_migo TEXT DEFAULT 'OPEN',
    sj_kapsul VARCHAR(150) DEFAULT '',
    bap_kapsul VARCHAR(150) DEFAULT '',
    check_kapsul TEXT DEFAULT 'OPEN',
    keterangan TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'PROSES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_update TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Nonaktifkan RLS & Berikan Hak Akses Penuh
ALTER TABLE public.monitoring_pemusnahan DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.monitoring_pemusnahan TO anon, authenticated;`;
                    navigator.clipboard.writeText(sqlText);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Setelah run SQL di Supabase, klik tombol <b>Sync ke Supabase</b> di toolbar.
              </span>
              <button
                type="button"
                onClick={() => setSqlGuideModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-xs"
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
