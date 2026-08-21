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
  FileText
} from 'lucide-react';
import { supabase } from '../../supabase';
import { useNotification } from '../../context/NotificationContext';
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

function computeStatus(item: Partial<MonitoringPemusnahanItem>): 'SELESAI' | 'PROSES' {
  const isKirim = String(item.kirim_dokumen_bap_ke_ho || '').toUpperCase() === 'CLOSE';
  const isAppr = String(item.completed_approval || '').toUpperCase() === 'CLOSE';
  const isBa = String(item.completed_ba || '').toUpperCase() === 'CLOSE';
  const isMigo = String(item.completed_migo || '').toUpperCase() === 'CLOSE';
  const isKapsul = String(item.check_kapsul || '').toUpperCase() === 'CLOSE';

  return (isKirim && isAppr && isBa && isMigo && isKapsul) ? 'SELESAI' : 'PROSES';
}

export function MonitoringPemusnahanModule() {
  const { showToast, showConfirm } = useNotification();
  const [dataList, setDataList] = useState<MonitoringPemusnahanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      const { data, error } = await supabase
        .from('monitoring_pemusnahan')
        .select('*')
        .order('tahun', { ascending: false });

      if (error) {
        const local = localStorage.getItem('logistics_monitoring_pemusnahan');
        setDataList(local ? JSON.parse(local) : []);
      } else if (data) {
        setDataList(data.map(d => ({ ...d, status: computeStatus(d) })));
      }
    } catch (e: any) {
      console.error(e);
      const local = localStorage.getItem('logistics_monitoring_pemusnahan');
      setDataList(local ? JSON.parse(local) : []);
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

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataList.filter(item => {
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
  }, [dataList, selectedYear, selectedStatus, searchQuery]);

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
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const computed = computeStatus(inlineDraft);
      const updatedItem: MonitoringPemusnahanItem = {
        ...inlineDraft,
        status: computed,
        last_update: nowStr
      } as MonitoringPemusnahanItem;

      let nextList = [];
      if (editingRowId === 'NEW') {
        nextList = [updatedItem, ...dataList];
        await supabase.from('monitoring_pemusnahan').insert([updatedItem]);
      } else {
        nextList = dataList.map(d => d.id === editingRowId ? updatedItem : d);
        await supabase.from('monitoring_pemusnahan').update(updatedItem).eq('id', editingRowId);
      }

      setDataList(nextList);
      localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));
      setEditingRowId(null);
      setInlineDraft({});
      showToast('Tersimpan', 'Data monitoring pemusnahan berhasil disimpan!', 'success');
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
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const isNew = !formModalItem.id;
      const id = isNew 
        ? `TRX-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase().slice(-4)}`
        : formModalItem.id!;

      const fullItem: MonitoringPemusnahanItem = {
        ...formModalItem,
        id,
        status: computeStatus(formModalItem),
        last_update: nowStr
      } as MonitoringPemusnahanItem;

      let nextList = [];
      if (isNew) {
        nextList = [fullItem, ...dataList];
        await supabase.from('monitoring_pemusnahan').insert([fullItem]);
      } else {
        nextList = dataList.map(d => d.id === id ? fullItem : d);
        await supabase.from('monitoring_pemusnahan').update(fullItem).eq('id', id);
      }

      setDataList(nextList);
      localStorage.setItem('logistics_monitoring_pemusnahan', JSON.stringify(nextList));
      setFormModalOpen(false);
      showToast('Sukses', `Data pengajuan (${id}) berhasil disimpan`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Info', 'Data tersimpan di penyimpanan lokal browser', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Delete Row
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

      {/* Toolbar Filter & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
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
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={fetchMonitoringData}
            disabled={loading}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs transition-all cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-900' : ''} />
          </button>
        </div>
      </div>

      {/* Main Wide Scrollable Table (27 Columns) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-medium">
          <span>
            💡 Petunjuk: Tabel dapat digeser horizontal hingga <strong>26 kolom data lengkap</strong> (Kolom terakhir: LAST_UPDATE).
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => handleScroll('left')} className="p-1 hover:text-blue-900"><ArrowLeft size={14} /></button>
            <button onClick={() => handleScroll('right')} className="p-1 hover:text-blue-900"><ArrowRight size={14} /></button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[2800px]">
            <thead className="sticky top-0 bg-blue-50/95 backdrop-blur-xs text-blue-950 font-bold border-b border-slate-200 z-20 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="sticky left-0 bg-blue-100/90 py-3 px-3 text-center w-28 z-30 shadow-xs border-r border-blue-200">
                  AKSI
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
                <th className="py-3 px-3 min-w-[160px]">LAST_UPDATE</th>
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
                  <td className="p-1.5 text-slate-400">-</td>
                </tr>
              )}

              {/* Data Rows */}
              {filteredRecords.length === 0 && editingRowId !== 'NEW' ? (
                <tr>
                  <td colSpan={26} className="py-8 text-center text-slate-400">
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
                        <td className="p-1.5 text-slate-400">{r.last_update || '-'}</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky left-0 bg-white hover:bg-slate-50 py-2.5 px-2 text-center z-10 border-r border-slate-200">
                        <div className="flex items-center justify-center gap-1">
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
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 font-mono">{r.last_update || '-'}</td>
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
    </div>
  );
}
