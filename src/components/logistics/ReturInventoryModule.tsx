import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Database,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '../../supabase';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useSupabase';
import { ReturInventoryItem } from '../../types';

const COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
];

export const RETUR_INVENTORY_SQL_SCRIPT = `-- SCRIPT TABEL RETUR INVENTORY & UPDATE SCHEMA LENGKAP
CREATE TABLE IF NOT EXISTS public.retur_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  no TEXT,
  item_code TEXT,
  item_name TEXT,
  category TEXT,
  location TEXT,
  location_type TEXT,
  first_qty NUMERIC DEFAULT 0,
  last_qty_pcs NUMERIC DEFAULT 0,
  uom TEXT DEFAULT 'PCS',
  qty_convert_ctn NUMERIC DEFAULT 0,
  uom_convert TEXT DEFAULT 'CTN',
  lpn_serial TEXT,
  batch TEXT,
  vendor_batch TEXT,
  sloc TEXT,
  expired TEXT,
  destination_code TEXT,
  qc_code TEXT,
  user_tally TEXT,
  shelf_life TEXT,
  source TEXT,
  by_ed TEXT
);

-- Pastikan semua kolom terdaftar jika tabel sudah ada sebelumnya
ALTER TABLE public.retur_inventory
  ADD COLUMN IF NOT EXISTS no TEXT,
  ADD COLUMN IF NOT EXISTS item_code TEXT,
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS location_type TEXT,
  ADD COLUMN IF NOT EXISTS first_qty NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_qty_pcs NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS qty_convert_ctn NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom_convert TEXT DEFAULT 'CTN',
  ADD COLUMN IF NOT EXISTS lpn_serial TEXT,
  ADD COLUMN IF NOT EXISTS batch TEXT,
  ADD COLUMN IF NOT EXISTS vendor_batch TEXT,
  ADD COLUMN IF NOT EXISTS sloc TEXT,
  ADD COLUMN IF NOT EXISTS expired TEXT,
  ADD COLUMN IF NOT EXISTS destination_code TEXT,
  ADD COLUMN IF NOT EXISTS qc_code TEXT,
  ADD COLUMN IF NOT EXISTS user_tally TEXT,
  ADD COLUMN IF NOT EXISTS shelf_life TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS by_ed TEXT;

-- Row Level Security (RLS) & Akses
ALTER TABLE public.retur_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read retur_inventory" ON public.retur_inventory;
DROP POLICY IF EXISTS "Public Insert retur_inventory" ON public.retur_inventory;
DROP POLICY IF EXISTS "Public Update retur_inventory" ON public.retur_inventory;
DROP POLICY IF EXISTS "Public Delete retur_inventory" ON public.retur_inventory;

CREATE POLICY "Public Read retur_inventory" ON public.retur_inventory FOR SELECT USING (true);
CREATE POLICY "Public Insert retur_inventory" ON public.retur_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update retur_inventory" ON public.retur_inventory FOR UPDATE USING (true);
CREATE POLICY "Public Delete retur_inventory" ON public.retur_inventory FOR DELETE USING (true);

-- Muat ulang schema cache PostgREST
NOTIFY pgrst, 'reload schema';`;

export function ReturInventoryModule() {
  const { showToast, showConfirm } = useNotification();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'data'>('dashboard');
  const [returData, setReturData] = useState<ReturInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('-');
  const [uploadPreview, setUploadPreview] = useState<ReturInventoryItem[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const formatNumber = (num?: number | string | null) => {
    if (num === undefined || num === null || num === '' || isNaN(Number(num))) return '0';
    return Number(num).toLocaleString('id-ID', { maximumFractionDigits: 3 });
  };

  const fetchReturData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('retur_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const local = localStorage.getItem('logistics_retur_inventory');
        setReturData(local ? JSON.parse(local) : []);
      } else if (data) {
        setReturData(data);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }));
    } catch (e: any) {
      console.error(e);
      const local = localStorage.getItem('logistics_retur_inventory');
      setReturData(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturData();

    // Listen to live realtime changes
    const channel = supabase
      .channel('retur_inventory_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retur_inventory' }, () => {
        fetchReturData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Aggregated By ED data for Dashboard
  const { byEdList, grandTotalLastQtyPcs, grandTotalQtyConvertCtn, topKategori } = useMemo(() => {
    const map: Record<string, { byEd: string; lastQtyPcs: number; qtyConvertCtn: number }> = {};
    let totalPcs = 0;
    let totalCtn = 0;

    returData.forEach(item => {
      let byEd = (item.by_ed || 'Unassigned').trim();
      if (!byEd) byEd = 'Unassigned';

      const pcs = Number(item.last_qty_pcs) || 0;
      const ctn = Number(item.qty_convert_ctn) || 0;

      if (!map[byEd]) {
        map[byEd] = { byEd, lastQtyPcs: 0, qtyConvertCtn: 0 };
      }
      map[byEd].lastQtyPcs += pcs;
      map[byEd].qtyConvertCtn += ctn;
      totalPcs += pcs;
      totalCtn += ctn;
    });

    const list = Object.values(map).sort((a, b) => b.lastQtyPcs - a.lastQtyPcs).map((item, idx) => ({
      ...item,
      pctPcs: totalPcs > 0 ? (item.lastQtyPcs / totalPcs) * 100 : 0,
      pctCtn: totalCtn > 0 ? (item.qtyConvertCtn / totalCtn) * 100 : 0,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
    }));

    return {
      byEdList: list,
      grandTotalLastQtyPcs: totalPcs,
      grandTotalQtyConvertCtn: totalCtn,
      topKategori: list.length > 0 ? list[0] : null
    };
  }, [returData]);

  // Filtered Retur Data
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
      (d.sloc && d.sloc.toLowerCase().includes(q))
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

  // Excel Download Template
  const handleDownloadTemplate = () => {
    const headers = [
      ['No', 'Item Code', 'Item Name', 'Category', 'Location', 'Location Type', 'First Qty', 'Last Qty Pcs', 'Uom', 'Qty Convert Ctn', 'Uom Convert', 'LPN/Serial Number', 'Batch', 'Vendor Batch', 'SLOC', 'Expired', 'Destination Code', 'QC Code', 'User Tally', 'Shelf Life', 'Source', 'By ED']
    ];
    const sampleRow = [
      1, 'ITEM-001', 'MT ABSTRACT PROD 1', 'CAT-A', 'LOC-01', 'RACK', 400000, 380382, 'PCS', 3803.82, 'CTN', 'LPN001', 'BT240101', 'VB01', '8A04', '2026-12-31', 'DST-01', 'QC-PASS', 'TALLY-A', '24 Bulan', 'INBOUND', 'MT ABSTRACT'
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, sampleRow]);
    ws['!cols'] = Array(22).fill({ wch: 16 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Retur');
    XLSX.writeFile(wb, 'Template_Upload_Retur_Inventory.xlsx');
    showToast('Template Siap', 'File Template Excel berhasil diunduh', 'success');
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
    ws['!cols'] = Array(22).fill({ wch: 16 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Retur');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Data_Retur_Inventory_${dateStr}.xlsx`);
    showToast('Berhasil', 'Data retur inventory berhasil diekspor ke Excel', 'success');
  };

  // Excel File Upload Handler
  const handleExcelSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonArr: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (jsonArr.length > 0 && (String(jsonArr[0][0]).toLowerCase().includes('no') || String(jsonArr[0][1]).toLowerCase().includes('code'))) {
          jsonArr.shift();
        }

        const parsed: ReturInventoryItem[] = jsonArr.filter(r => r && r.length > 1).map((r, i) => ({
          no: r[0] || i + 1,
          item_code: String(r[1] || ''),
          item_name: String(r[2] || ''),
          category: String(r[3] || ''),
          location: String(r[4] || ''),
          location_type: String(r[5] || ''),
          first_qty: parseFloat(r[6]) || 0,
          last_qty_pcs: parseFloat(r[7]) || 0,
          uom: String(r[8] || 'PCS'),
          qty_convert_ctn: parseFloat(r[9]) || 0,
          uom_convert: String(r[10] || 'CTN'),
          lpn_serial: String(r[11] || ''),
          batch: String(r[12] || ''),
          vendor_batch: String(r[13] || ''),
          sloc: String(r[14] || '8A04'),
          expired: String(r[15] || ''),
          destination_code: String(r[16] || ''),
          qc_code: String(r[17] || ''),
          user_tally: String(r[18] || ''),
          shelf_life: String(r[19] || ''),
          source: String(r[20] || ''),
          by_ed: String(r[21] || 'Unassigned')
        }));

        setUploadPreview(parsed);
        showToast('File Terbaca', `${parsed.length} baris data retur siap diunggah`, 'info');
      } catch (err: any) {
        showToast('Gagal Membaca File', err.message || 'Format file Excel tidak sesuai', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Helper to insert chunks with automatic missing column pruning
  const insertChunkWithAutoPrune = async (rows: Record<string, any>[]) => {
    let payload = rows.map(r => ({ ...r }));
    const omittedColumns: string[] = [];
    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      const { error } = await supabase.from('retur_inventory').insert(payload);
      if (!error) {
        return { success: true, omittedColumns };
      }

      // Check if error is due to missing column in Supabase schema
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        if (!omittedColumns.includes(missingCol)) {
          omittedColumns.push(missingCol);
        }
        // Remove missing column from all rows in payload
        payload = payload.map(row => {
          const next = { ...row };
          delete next[missingCol];
          return next;
        });
        console.warn(`[Auto-Prune] Column '${missingCol}' not found in Supabase schema. Retrying without it...`);
        continue;
      }

      return { success: false, error: error.message, omittedColumns };
    }

    return { success: false, error: 'Max retries reached', omittedColumns };
  };

  const handleCommitUpload = async (mode: 'append' | 'replace') => {
    if (!uploadPreview || uploadPreview.length === 0) return;

    setLoading(true);
    try {
      // 1. If replace mode, clear existing database records
      if (mode === 'replace') {
        const { error: delErr } = await supabase
          .from('retur_inventory')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (delErr) {
          console.warn('Supabase delete existing error:', delErr);
        }
      }

      // 2. Prepare insert payloads
      const insertPayload = uploadPreview.map(item => ({
        no: item.no ? String(item.no) : '',
        item_code: String(item.item_code || ''),
        item_name: String(item.item_name || ''),
        category: String(item.category || ''),
        location: String(item.location || ''),
        location_type: String(item.location_type || ''),
        first_qty: Number(item.first_qty) || 0,
        last_qty_pcs: Number(item.last_qty_pcs) || 0,
        uom: String(item.uom || 'PCS'),
        qty_convert_ctn: Number(item.qty_convert_ctn) || 0,
        uom_convert: String(item.uom_convert || 'CTN'),
        lpn_serial: String(item.lpn_serial || ''),
        batch: String(item.batch || ''),
        vendor_batch: String(item.vendor_batch || ''),
        sloc: String(item.sloc || '8A04'),
        expired: String(item.expired || ''),
        destination_code: String(item.destination_code || ''),
        qc_code: String(item.qc_code || ''),
        user_tally: String(item.user_tally || ''),
        shelf_life: String(item.shelf_life || ''),
        source: String(item.source || ''),
        by_ed: String(item.by_ed || 'Unassigned')
      }));

      // 3. Batch insert in chunks with auto-pruning
      const CHUNK_SIZE = 100;
      let hasDbError = false;
      let dbErrorMessage = '';
      const allOmittedCols: string[] = [];

      for (let i = 0; i < insertPayload.length; i += CHUNK_SIZE) {
        const chunk = insertPayload.slice(i, i + CHUNK_SIZE);
        const res = await insertChunkWithAutoPrune(chunk);

        if (!res.success) {
          hasDbError = true;
          dbErrorMessage = res.error || 'Gagal menyimpan ke database';
          break;
        } else if (res.omittedColumns && res.omittedColumns.length > 0) {
          res.omittedColumns.forEach(c => {
            if (!allOmittedCols.includes(c)) allOmittedCols.push(c);
          });
        }
      }

      if (hasDbError) {
        showToast('Peringatan Database', `Gagal simpan ke Supabase (${dbErrorMessage}). Data disimpan sementara di browser.`, 'warning');
        let nextData = mode === 'replace' ? [...uploadPreview] : [...uploadPreview, ...returData];
        localStorage.setItem('logistics_retur_inventory', JSON.stringify(nextData));
        setReturData(nextData);
      } else {
        if (allOmittedCols.length > 0) {
          showToast(
            'Tersimpan dengan Catatan', 
            `${uploadPreview.length} data tersimpan ke Supabase! (Catatan: Kolom '${allOmittedCols.join(', ')}' belum ada di tabel Supabase. Klik 'SQL Database' untuk menyesuaikan schema).`, 
            'info'
          );
        } else {
          showToast('Berhasil Tersimpan', `${uploadPreview.length} baris data retur berhasil disimpan ke Database Supabase!`, 'success');
        }
        await fetchReturData();
      }

      setUploadPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      console.error('Upload handler exception:', e);
      showToast('Error', e.message || 'Terjadi kesalahan saat menyimpan data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Selection Handlers (Khusus Admin)
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(r => r.id));
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
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} baris data retur yang dipilih secara permanen dari database?`,
      confirmText: `Ya, Hapus ${selectedIds.length} Data`,
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('retur_inventory')
            .delete()
            .in('id', selectedIds);

          if (error) {
            console.error('Bulk delete error:', error);
            showToast('Gagal Hapus DB', error.message, 'danger');
          } else {
            showToast('Sukses Hapus Massal', `${selectedIds.length} data retur berhasil dihapus dari database!`, 'success');
          }
        } catch (e: any) {
          console.error(e);
        }

        const nextData = returData.filter(d => !selectedIds.includes(d.id));
        setReturData(nextData);
        localStorage.setItem('logistics_retur_inventory', JSON.stringify(nextData));
        setSelectedIds([]);
        setLoading(false);
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
      message: `Hapus item "${item.item_code} - ${item.item_name || ''}" dari database?`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          await supabase.from('retur_inventory').delete().eq('id', item.id);
        } catch {}
        const nextData = returData.filter(d => d.id !== item.id);
        setReturData(nextData);
        localStorage.setItem('logistics_retur_inventory', JSON.stringify(nextData));
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
      message: `PERINGATAN: Anda akan menghapus SELURUH (${returData.length}) data retur inventory dari database. Aksi ini tidak dapat dibatalkan. Lanjutkan?`,
      confirmText: 'Ya, Kosongkan Semua',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          await supabase.from('retur_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch {}
        localStorage.removeItem('logistics_retur_inventory');
        setReturData([]);
        setSelectedIds([]);
        setLoading(false);
        showToast('Dibersihkan', 'Seluruh data retur berhasil dikosongkan dari database', 'info');
      }
    });
  };

  return (
    <div className="w-full space-y-5">
      {/* Top Header Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0 leading-tight">
              Retur Inventory Suite
            </h3>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Dashboard Analisis Kategori By ED & Database Inventori Retur
            </p>
          </div>
        </div>

        {/* Tab Buttons & Refresh */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
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
              <span>Dashboard By ED</span>
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
            onClick={() => {
              setSqlModalOpen(true);
              setCopiedSql(false);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Lihat Script SQL Supabase untuk tabel retur_inventory"
          >
            <Database size={13} className="text-blue-900" />
            <span className="hidden sm:inline">SQL Database</span>
          </button>

          <button
            type="button"
            onClick={fetchReturData}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Refresh data dari database"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-900' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* VIEW A: DASHBOARD BY ED */}
      {activeTab === 'dashboard' && (
        <div className="space-y-3 sm:space-y-3.5 animate-in fade-in duration-200">
          {/* Top 4 KPI Cards - Ultra Compact & Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Card 1: Total Last Qty Pcs */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 xl:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs">
                <Layers size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Last Qty Pcs
                </div>
                <div className="text-sm sm:text-base xl:text-lg font-black text-blue-950 leading-tight mt-0.5 truncate font-mono">
                  {formatNumber(grandTotalLastQtyPcs)} <span className="text-[11px] font-bold text-blue-700">PCS</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">Akumulasi kuantitas fisik</div>
              </div>
            </div>

            {/* Card 2: Total Convert Ctn */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 xl:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
                <Box size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Convert Ctn
                </div>
                <div className="text-sm sm:text-base xl:text-lg font-black text-emerald-700 leading-tight mt-0.5 truncate font-mono">
                  {formatNumber(grandTotalQtyConvertCtn)} <span className="text-[11px] font-bold text-emerald-600">CTN</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">Total konversi karton</div>
              </div>
            </div>

            {/* Card 3: Jumlah Kategori By ED */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 xl:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/80 shadow-2xs">
                <Tags size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Kategori By ED
                </div>
                <div className="text-sm sm:text-base xl:text-lg font-black text-slate-900 leading-tight mt-0.5">
                  {byEdList.length} <span className="text-[11px] font-bold text-slate-500">Grup</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">Klasifikasi kategori ED</div>
              </div>
            </div>

            {/* Card 4: Kategori Terbesar */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 sm:p-3 xl:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/80 shadow-2xs">
                <Trophy size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Kategori Terbesar
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5 truncate" title={topKategori?.byEd}>
                  {topKategori?.byEd || '-'}
                </div>
                <div className="text-[10.5px] font-bold text-purple-700 font-mono truncate">
                  {formatNumber(topKategori?.lastQtyPcs)} PCS ({topKategori ? topKategori.pctPcs.toFixed(1) : 0}%)
                </div>
              </div>
            </div>
          </div>

          {/* Middle Charts & Distribution Row - Compact Desktop Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Bar Chart - 7 Cols on lg, 7 on xl */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={15} className="text-blue-900" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">Last Qty Pcs per By ED</h4>
                      <p className="text-[11px] text-slate-500 m-0 hidden sm:block">Perbandingan kuantitas fisik antar kategori</p>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                    {byEdList.length} Kategori
                  </span>
                </div>

                {byEdList.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg">
                    Belum ada data retur.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] xl:max-h-[300px] 2xl:max-h-[340px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {byEdList.map((item) => (
                      <div key={item.byEd} className="space-y-0.5 group hover:bg-slate-50/80 p-1 rounded-md transition-colors">
                        <div className="flex justify-between items-center text-[11px] sm:text-xs">
                          <span className="font-bold text-slate-800 truncate max-w-[55%] sm:max-w-[65%]" title={item.byEd}>
                            {item.byEd}
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
                <span>Total: <strong className="text-slate-700">{formatNumber(grandTotalLastQtyPcs)} PCS</strong></span>
                <span className="text-slate-500">Rasio tertinggi: <strong className="text-purple-700">{topKategori?.byEd || '-'}</strong></span>
              </div>
            </div>

            {/* Right Distribution Breakdown - 5 Cols on lg, 5 on xl */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2.5 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PieIcon size={15} className="text-slate-600" />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">Distribusi Last Qty (%)</h4>
                      <p className="text-[11px] text-slate-500 m-0 hidden sm:block">Porsi persentase per kategori</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Share %</span>
                </div>

                {/* Donut Style Radial Visualizer - Compact */}
                <div className="my-2 p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-center gap-4 sm:gap-5">
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
                        return byEdList.map((item) => {
                          const strokeDasharray = `${item.pctPcs} ${100 - item.pctPcs}`;
                          const strokeDashoffset = -accumulated;
                          accumulated += item.pctPcs;
                          return (
                            <circle
                              key={item.byEd}
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
                        {byEdList.length}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-tight mt-0.5">Kategori</span>
                    </div>
                  </div>

                  <div className="text-left space-y-0.5 min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Akumulasi:</div>
                    <div className="text-sm sm:text-base font-black text-blue-950 font-mono leading-tight truncate">
                      {formatNumber(grandTotalLastQtyPcs)} <span className="text-[10px] font-bold text-blue-700">PCS</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-700 font-mono leading-tight truncate">
                      {formatNumber(grandTotalQtyConvertCtn)} <span className="text-[10px] font-semibold text-emerald-600">CTN</span>
                    </div>
                  </div>
                </div>

                {/* Legend list - Dense 2 Columns / Responsive */}
                <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-[140px] xl:max-h-[170px] overflow-y-auto pr-1 custom-scrollbar">
                  {byEdList.map((item) => (
                    <div key={item.byEd} className="flex items-center gap-1.5 text-[11px] p-1 rounded-md hover:bg-slate-50 transition-colors">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700 truncate" title={item.byEd}>{item.byEd}</span>
                      <span className="text-slate-400 font-bold font-mono text-[10px] ml-auto shrink-0">{item.pctPcs.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                <span>Update:</span>
                <span className="font-semibold text-slate-600 truncate max-w-[180px]">{lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Bottom Table: Summary Table By ED - Compact Responsive with Sticky Header */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <TableIcon size={15} className="text-blue-900" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 m-0 leading-tight">Ringkasan Data By ED</h4>
                  <p className="text-[11px] text-slate-500 m-0">Rekapitulasi total kuantitas PCS dan karton konversi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  Total: <strong className="text-blue-900">{byEdList.length}</strong> Kategori
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[320px] xl:max-h-[400px] 2xl:max-h-[480px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-blue-50/95 backdrop-blur-xs text-blue-950 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] z-10">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3 min-w-[140px]">By ED</th>
                    <th className="py-2 px-3 text-right min-w-[100px]">Last Qty Pcs</th>
                    <th className="py-2 px-3 text-right min-w-[100px]">Qty Convert Ctn</th>
                    <th className="py-2 px-3 min-w-[140px]">% Last Qty Pcs</th>
                    <th className="py-2 px-3 min-w-[140px]">% Qty Convert Ctn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800 text-[11px] sm:text-xs">
                  {byEdList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Tidak ada data retur yang tersedia.
                      </td>
                    </tr>
                  ) : (
                    byEdList.map((item, idx) => (
                      <tr key={item.byEd} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-1.5 sm:py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 sm:py-2 px-3 font-bold text-slate-900 truncate" title={item.byEd}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                            <span>{item.byEd}</span>
                          </div>
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 text-right font-mono font-bold text-blue-950">
                          {formatNumber(item.lastQtyPcs)}
                        </td>
                        <td className="py-1.5 sm:py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatNumber(item.qtyConvertCtn)}
                        </td>
                        <td className="py-1.5 sm:py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-700 w-11 text-right text-[10.5px]">
                              {item.pctPcs.toFixed(2)}%
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-200/80">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${item.pctPcs}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 sm:py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-700 w-11 text-right text-[10.5px]">
                              {item.pctCtn.toFixed(2)}%
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden border border-slate-200/80">
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
                {byEdList.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-extrabold z-10">
                    <tr>
                      <td colSpan={2} className="py-2 sm:py-2.5 px-3 uppercase tracking-wider text-[11px]">
                        GRAND TOTAL
                      </td>
                      <td className="py-2 sm:py-2.5 px-3 text-right font-mono text-blue-950 text-xs sm:text-sm">
                        {formatNumber(grandTotalLastQtyPcs)}
                      </td>
                      <td className="py-2 sm:py-2.5 px-3 text-right font-mono text-emerald-900 text-xs sm:text-sm">
                        {formatNumber(grandTotalQtyConvertCtn)}
                      </td>
                      <td className="py-2 sm:py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">100.00%</td>
                      <td className="py-2 sm:py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">100.00%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: DATA RETUR TABLE & UPLOAD */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* UPLOAD & MANAGEMENT CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shadow-2xs shrink-0">
                  <Upload size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 m-0">Upload File Excel Data Retur</h4>
                  <p className="text-xs text-slate-500 m-0">Mendukung format .xlsx, .xls, .csv (22 Kolom Baku)</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Unduh format template Excel"
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

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Kosongkan seluruh data"
                >
                  <Trash2 size={14} />
                  <span>Kosongkan</span>
                </button>
              </div>
            </div>

            {/* File Input */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelSelected}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-950 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1"
              />
            </div>

            {/* Upload Preview Box */}
            {uploadPreview && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-950">
                    Pratinjau Data ({uploadPreview.length} Baris Terdeteksi)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="overflow-x-auto max-h-48 border border-blue-200 rounded-lg bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                        <th className="p-2">No</th>
                        <th className="p-2">Item Code</th>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Last Qty</th>
                        <th className="p-2">By ED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {uploadPreview.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td className="p-2">{r.no}</td>
                          <td className="p-2 font-mono font-bold text-slate-800">{r.item_code}</td>
                          <td className="p-2">{r.item_name}</td>
                          <td className="p-2">{r.location}</td>
                          <td className="p-2 font-mono font-bold text-blue-900">{formatNumber(r.last_qty_pcs)}</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded font-semibold text-[10px]">{r.by_ed}</span></td>
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
                    className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    + Tambahkan ke Data
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCommitUpload('replace')}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Hapus Lama & Upload Baru
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Record</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{dataStats.totalRecords}</div>
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

            {/* Search Input Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari Item Code, Item Name, Location, By ED, Batch..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-600 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Menampilkan <strong>{filteredData.length}</strong> data
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto max-h-[500px]">
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
                      <td colSpan={isAdmin ? 12 : 10} className="py-8 text-center text-slate-400">
                        {searchQuery ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data retur.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, idx) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr key={item.id || idx} className={`transition-colors ${isSelected ? 'bg-red-50/70 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}>
                          {isAdmin && (
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id)}
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
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
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

      {/* SQL Setup Modal */}
      {sqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold m-0 leading-tight">Script SQL Supabase: Tabel Retur Inventory</h4>
                  <p className="text-[11px] text-slate-400 m-0">Salin & jalankan script di Supabase SQL Editor untuk memperbarui struktur tabel & schema cache</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <p className="font-bold mb-1">Panduan Cepat:</p>
                <ol className="list-decimal ml-4 space-y-0.5 text-[11.5px] text-blue-800">
                  <li>Buka <strong>Supabase Dashboard</strong> &gt; pilih project Anda.</li>
                  <li>Klik menu <strong>SQL Editor</strong> di bilah kiri.</li>
                  <li>Klik <strong>New Query</strong>, tempel (Paste) script SQL di bawah ini.</li>
                  <li>Klik tombol hijau <strong>Run</strong> untuk mengeksekusi script.</li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between bg-slate-800 px-3.5 py-2 rounded-t-xl text-xs text-slate-300 font-mono">
                  <span>retur_inventory_schema.sql</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(RETUR_INVENTORY_SQL_SCRIPT);
                      setCopiedSql(true);
                      showToast('Tersalin!', 'Script SQL berhasil disalin ke clipboard', 'success');
                      setTimeout(() => setCopiedSql(false), 3000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {copiedSql ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                    <span>{copiedSql ? 'Tersalin!' : 'Salin Script SQL'}</span>
                  </button>
                </div>
                <pre className="m-0 p-3.5 bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed rounded-b-xl overflow-x-auto max-h-[260px] border border-slate-800 selection:bg-blue-500 selection:text-white">
                  {RETUR_INVENTORY_SQL_SCRIPT}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Otomatis menambahkan kolom yang hilang & reload schema PostgREST.
              </span>
              <button
                type="button"
                onClick={() => setSqlModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer"
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
