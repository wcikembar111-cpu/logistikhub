import React, { useState, useMemo } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
  Warehouse,
  Database,
  Coins,
  Boxes,
  HelpCircle,
  ArrowRightLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TriRelasiItem, TriRelasiSummary, MatchStatus } from '../../../types/triRelasi';

interface LargoSapComparisonViewProps {
  items: TriRelasiItem[];
  summary: TriRelasiSummary;
  sourceName?: string;
  lastSyncTime?: string;
}

export function LargoSapComparisonView({
  items,
  summary,
  sourceName = 'Google Spreadsheet',
  lastSyncTime
}: LargoSapComparisonViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [onlyVariances, setOnlyVariances] = useState(false);
  const [sortField, setSortField] = useState<'absVariance' | 'largoStock' | 'sapStock' | 'valueVariance' | 'itemCode'>('absVariance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Toggle row expansion
  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCodes(new Set(items.map(i => i.itemCode)));
  };

  const collapseAll = () => {
    setExpandedCodes(new Set());
  };

  // Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Variance only toggle
    if (onlyVariances) {
      result = result.filter(item => item.matchStatus !== 'MATCH');
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      result = result.filter(item => item.matchStatus === filterStatus);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.itemCode.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.largoBatches.some(b => b.batch.toLowerCase().includes(q) || b.location.toLowerCase().includes(q)) ||
          item.sapBatches.some(b => b.batch.toLowerCase().includes(q) || b.sloc.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortField === 'absVariance') {
        aVal = a.absVariance;
        bVal = b.absVariance;
      } else if (sortField === 'largoStock') {
        aVal = a.largoStock;
        bVal = b.largoStock;
      } else if (sortField === 'sapStock') {
        aVal = a.sapStock;
        bVal = b.sapStock;
      } else if (sortField === 'valueVariance') {
        aVal = Math.abs(a.valueVariance);
        bVal = Math.abs(b.valueVariance);
      } else if (sortField === 'itemCode') {
        return sortDirection === 'asc'
          ? a.itemCode.localeCompare(b.itemCode)
          : b.itemCode.localeCompare(a.itemCode);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [items, searchQuery, filterStatus, onlyVariances, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    if (isPrintMode) return filteredItems;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage, isPrintMode]);

  // Chart Data: Top 8 SKUs by absolute variance
  const topVarianceChartData = useMemo(() => {
    return [...items]
      .filter(i => i.absVariance > 0)
      .sort((a, b) => b.absVariance - a.absVariance)
      .slice(0, 8)
      .map(item => ({
        name: item.itemCode,
        fullName: item.productName,
        'Stok Fisik (Largo)': item.largoStock,
        'Stok Sistem (SAP)': item.sapStock,
        'Selisih (Delta)': item.stockVariance
      }));
  }, [items]);

  // Pie Chart: Status Breakdown
  const statusPieData = useMemo(() => {
    return [
      { name: 'Cocok (Match)', value: summary.matchCount, color: '#10B981' },
      { name: 'Largo Surplus', value: summary.largoSurplusCount, color: '#3B82F6' },
      { name: 'SAP Surplus', value: summary.sapSurplusCount, color: '#F59E0B' },
      { name: 'Hanya di Largo', value: summary.onlyLargoCount, color: '#8B5CF6' },
      { name: 'Hanya di SAP', value: summary.onlySapCount, color: '#EF4444' }
    ].filter(d => d.value > 0);
  }, [summary]);

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Perbandingan SKU
    const reportData = filteredItems.map((item, idx) => ({
      No: idx + 1,
      'Kode Material / Item': item.itemCode,
      'Nama Material / Deskripsi': item.productName,
      Kategori: item.category,
      Satuan: item.uom,
      'Stok Fisik Largo (Last Qty)': item.largoStock,
      'Stok Sistem SAP (Unres)': item.sapStock,
      'Selisih Fisik - SAP': item.stockVariance,
      'Absolut Selisih': item.absVariance,
      'Status Kesesuaian':
        item.matchStatus === 'MATCH'
          ? 'MATCH'
          : item.matchStatus === 'LARGO_SURPLUS'
          ? 'LARGO SURPLUS (Fisik > SAP)'
          : item.matchStatus === 'SAP_SURPLUS'
          ? 'SAP SURPLUS (SAP > Fisik)'
          : item.matchStatus === 'ONLY_LARGO'
          ? 'HANYA DI LARGO'
          : 'HANYA DI SAP',
      'SAP Blocked Stock': item.sapBlockedStock,
      'SAP Transit Stock': item.sapTrfStock,
      'Harga Satuan SAP': item.sapPrice,
      'Estimasi Nilai Varian (Rp)': item.valueVariance,
      'Jumlah Batch Largo': item.largoBatches.length,
      'Jumlah Batch SAP': item.sapBatches.length
    }));

    const wsSummary = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Perbandingan_Largo_SAP');

    // Sheet 2: Cross-check Batch
    const batchComparisonRows: any[] = [];
    filteredItems.forEach(item => {
      // Largo batches
      item.largoBatches.forEach(lb => {
        batchComparisonRows.push({
          Sumber: 'Sheet Largo',
          'Kode Produk': item.itemCode,
          'Nama Produk': item.productName,
          Batch: lb.batch,
          'Vendor Batch': lb.vendorBatch,
          'Lokasi / Plant': lb.location,
          SLOC: lb.sloc,
          'Kuantitas (Last Qty)': lb.qty,
          'Qty Convert': lb.qtyConvert,
          'Expired Date': lb.expiredDate,
          'LPN / Serial': lb.lpn
        });
      });
      // SAP batches
      item.sapBatches.forEach(sb => {
        batchComparisonRows.push({
          Sumber: 'Sheet SAP',
          'Kode Produk': item.itemCode,
          'Nama Produk': item.productName,
          Batch: sb.batch,
          'Vendor Batch': sb.vendorBatch,
          'Lokasi / Plant': sb.plant,
          SLOC: sb.sloc,
          'Kuantitas (Unres)': sb.unresStock,
          'Qty Convert': '-',
          'Expired Date': sb.sled,
          'LPN / Serial': '-'
        });
      });
    });

    if (batchComparisonRows.length > 0) {
      const wsBatches = XLSX.utils.json_to_sheet(batchComparisonRows);
      XLSX.utils.book_append_sheet(wb, wsBatches, 'Rincian_Batch_Komparasi');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Perbandingan_Sheet_Largo_vs_SAP_${dateStr}.xlsx`);
  };

  // Export to CSV
  const exportToCsv = () => {
    const csvRows = [
      [
        'No',
        'Kode Material',
        'Deskripsi Material',
        'Satuan',
        'Stok Fisik Largo',
        'Stok Sistem SAP',
        'Selisih',
        'Status',
        'SAP Blocked Stock',
        'Estimasi Nilai Varian'
      ].join(',')
    ];

    filteredItems.forEach((item, idx) => {
      csvRows.push(
        [
          idx + 1,
          `"${item.itemCode}"`,
          `"${item.productName.replace(/"/g, '""')}"`,
          `"${item.uom}"`,
          item.largoStock,
          item.sapStock,
          item.stockVariance,
          `"${item.matchStatus}"`,
          item.sapBlockedStock,
          item.valueVariance
        ].join(',')
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Perbandingan_Largo_vs_SAP_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Top Header - Clean, Ringkas, Tanpa Fill Warna */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Boxes size={20} className="text-blue-600" />
              <span>Perbandingan Largo vs SAP</span>
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {items.length} SKU Total
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Komparasi stok fisik gudang Largo dengan sistem ERP SAP.
            </p>
          </div>

          {/* Export & Print */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={exportToExcel}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download Hasil Perbandingan Format Excel (.xlsx)"
            >
              <Download size={14} className="text-blue-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={exportToCsv}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV"
            >
              <FileSpreadsheet size={14} className="text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cetak atau simpan sebagai PDF"
            >
              <Printer size={14} className="text-slate-600" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Reconciliation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Match Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Kesesuaian (Match)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {summary.matchRatePct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <strong>{summary.matchCount}</strong> dari {summary.totalSkus} SKU persis sesuai (0 selisih)
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>SKU Berselisih</span>
            <span className="font-bold text-rose-600">{summary.varianceCount} SKU</span>
          </div>
        </div>

        {/* Card 2: Total Stok Fisik Largo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Total Fisik (Sheet Largo)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Warehouse size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {summary.totalLargoStock.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              Stok fisik aktual gudang (Kolom Last Qty)
            </div>
          </div>
          <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-xs text-slate-600">
            <span>Largo Qty Convert (Siap)</span>
            <span className="font-bold text-emerald-700">{summary.totalLargoQtyConvert.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 3: Total Stok Sistem SAP */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Sistem (Sheet SAP)</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Database size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {summary.totalSapStock.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Unrestricted Stock pencatatan sistem ERP
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>SAP Blocked Stock</span>
            <span className="font-bold text-slate-700">{summary.totalSapBlocked.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 4: Net Variance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Selisih (Largo - SAP)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              summary.totalVariance === 0
                ? 'bg-emerald-50 text-emerald-600'
                : summary.totalVariance > 0
                ? 'bg-blue-50 text-blue-600'
                : 'bg-rose-50 text-rose-600'
            }`}>
              <Scale size={18} />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black ${
              summary.totalVariance === 0
                ? 'text-emerald-600'
                : summary.totalVariance > 0
                ? 'text-blue-600'
                : 'text-rose-600'
            }`}>
              {summary.totalVariance > 0 ? `+${summary.totalVariance.toLocaleString('id-ID')}` : summary.totalVariance.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Largo Surplus: <strong>{summary.largoSurplusCount}</strong></span>
              <span>•</span>
              <span>SAP Surplus: <strong>{summary.sapSurplusCount}</strong></span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Hanya di 1 Sistem</span>
            <span className="font-semibold text-slate-700">Largo ({summary.onlyLargoCount}) / SAP ({summary.onlySapCount})</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Bar Chart & Discrepancy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Top SKU Variance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top 8 SKU dengan Selisih Terbesar (Fisik vs SAP)</h3>
              <p className="text-xs text-slate-500">Perbandingan kuantitas fisik di Largo terhadap sistem SAP</p>
            </div>
            <div className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
              Komparasi Langsung
            </div>
          </div>

          <div className="h-64 w-full">
            {topVarianceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVarianceChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toLocaleString('id-ID')}`, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Stok Fisik (Largo)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Stok Sistem (SAP)" fill="#64748B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-emerald-600 font-semibold">
                Semua SKU cocok sempurna tanpa selisih (100% Match)!
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Distribusi Status Kesesuaian</h3>
            <p className="text-xs text-slate-500">Klasifikasi SKU hasil rekonsiliasi Largo vs SAP</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} SKU`, name]}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 text-center">Belum ada data</div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {statusPieData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </span>
                <span className="font-bold text-slate-800 font-mono">
                  {item.value} SKU ({((item.value / items.length) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kode material, deskripsi, batch, sloc..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Only Variances */}
            <button
              type="button"
              onClick={() => {
                setOnlyVariances(prev => !prev);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                onlyVariances
                  ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertCircle size={14} />
              <span>Hanya Selisih ({summary.varianceCount})</span>
            </button>

            {/* Status Select */}
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status ({items.length})</option>
              <option value="MATCH">Cocok Sempurna / Match ({summary.matchCount})</option>
              <option value="LARGO_SURPLUS">Largo Surplus ({summary.largoSurplusCount})</option>
              <option value="SAP_SURPLUS">SAP Surplus ({summary.sapSurplusCount})</option>
              <option value="ONLY_LARGO">Hanya di Largo ({summary.onlyLargoCount})</option>
              <option value="ONLY_SAP">Hanya di SAP ({summary.onlySapCount})</option>
            </select>

            {/* Sort Field */}
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="absVariance">Urut: Selisih Terbesar</option>
              <option value="largoStock">Urut: Stok Fisik Largo</option>
              <option value="sapStock">Urut: Stok Sistem SAP</option>
              <option value="valueVariance">Urut: Nilai Varian (Rp)</option>
              <option value="itemCode">Urut: Kode Material A-Z</option>
            </select>

            <button
              type="button"
              onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Balik arah urutan"
            >
              <ArrowUpDown size={15} />
            </button>

            {/* Expand / Collapse All */}
            <button
              type="button"
              onClick={expandedCodes.size > 0 ? collapseAll : expandAll}
              className="px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
            >
              {expandedCodes.size > 0 ? 'Tutup Detail' : 'Buka Semua Batch'}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3.5 w-10 text-center">Batch</th>
                <th className="p-3.5 min-w-[120px]">Kode Material</th>
                <th className="p-3.5 min-w-[220px]">Deskripsi Material</th>
                <th className="p-3.5 text-center min-w-[70px]">UOM</th>
                <th className="p-3.5 text-right min-w-[120px] bg-blue-50 text-blue-950 font-black">
                  Fisik (Largo)
                  <span className="block text-[10px] font-normal text-blue-700">Last Qty</span>
                </th>
                <th className="p-3.5 text-right min-w-[120px] bg-slate-100 text-slate-900 font-black">
                  Sistem (SAP)
                  <span className="block text-[10px] font-normal text-slate-600">Unres. Stock</span>
                </th>
                <th className="p-3.5 text-right min-w-[110px] font-bold">
                  Selisih (Delta)
                  <span className="block text-[10px] font-normal text-slate-400">Largo - SAP</span>
                </th>
                <th className="p-3.5 text-center min-w-[130px]">Status Kesesuaian</th>
                <th className="p-3.5 text-right min-w-[100px] text-slate-500">
                  SAP Blocked
                  <span className="block text-[10px] font-normal text-slate-400">Terkunci</span>
                </th>
                <th className="p-3.5 text-right min-w-[120px] text-slate-600">
                  Estimasi Varian
                  <span className="block text-[10px] font-normal text-slate-400">Rupiah (Rp)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400">
                    Tidak ada data produk yang cocok dengan pencarian atau filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const isExpanded = expandedCodes.has(item.itemCode);
                  const isMatch = item.matchStatus === 'MATCH';
                  const isSurplusLargo = item.matchStatus === 'LARGO_SURPLUS';
                  const isSurplusSap = item.matchStatus === 'SAP_SURPLUS';

                  return (
                    <React.Fragment key={item.itemCode}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-slate-50/60' : ''}`}>
                        {/* Expand Button */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.itemCode)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                            title="Bandingkan rincian batch Largo & SAP"
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>

                        {/* Item Code */}
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {item.itemCode}
                        </td>

                        {/* Product Name */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.category}
                          </div>
                        </td>

                        {/* UOM */}
                        <td className="p-3 text-center font-mono text-slate-600">
                          {item.uom}
                        </td>

                        {/* Fisik Largo */}
                        <td className="p-3 text-right font-mono font-black bg-blue-50/40 text-blue-950 text-sm">
                          {item.largoStock.toLocaleString('id-ID')}
                        </td>

                        {/* Sistem SAP */}
                        <td className="p-3 text-right font-mono font-black bg-slate-100/40 text-slate-900 text-sm">
                          {item.sapStock.toLocaleString('id-ID')}
                        </td>

                        {/* Delta Selisih */}
                        <td className="p-3 text-right font-mono font-bold">
                          {isMatch ? (
                            <span className="text-emerald-600">0</span>
                          ) : item.stockVariance > 0 ? (
                            <span className="text-blue-600">+{item.stockVariance.toLocaleString('id-ID')}</span>
                          ) : (
                            <span className="text-rose-600">{item.stockVariance.toLocaleString('id-ID')}</span>
                          )}
                        </td>

                        {/* Status Kesesuaian */}
                        <td className="p-3 text-center">
                          {item.matchStatus === 'MATCH' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>Cocok (Match)</span>
                            </span>
                          ) : item.matchStatus === 'LARGO_SURPLUS' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <TrendingUp size={12} />
                              <span>Fisik &gt; SAP</span>
                            </span>
                          ) : item.matchStatus === 'SAP_SURPLUS' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <TrendingDown size={12} />
                              <span>SAP &gt; Fisik</span>
                            </span>
                          ) : item.matchStatus === 'ONLY_LARGO' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <span>Hanya di Largo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span>Hanya di SAP</span>
                            </span>
                          )}
                        </td>

                        {/* SAP Blocked */}
                        <td className="p-3 text-right font-mono text-slate-500">
                          {item.sapBlockedStock > 0 ? item.sapBlockedStock.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Estimasi Varian Finansial */}
                        <td className="p-3 text-right font-mono text-slate-700">
                          {item.valueVariance !== 0 ? (
                            <span className={item.valueVariance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                              Rp {Math.abs(item.valueVariance).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Comparison Detail: Largo Batches vs SAP Batches Side-by-Side */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Left Column: Largo Batches */}
                              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Warehouse size={16} className="text-blue-600" />
                                    <h4 className="text-xs font-bold text-slate-900">
                                      Batch di Sheet Largo (Fisik) — {item.largoBatches.length} Baris
                                    </h4>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-blue-700">
                                    Total: {item.largoStock.toLocaleString('id-ID')} {item.uom}
                                  </span>
                                </div>

                                {item.largoBatches.length === 0 ? (
                                  <div className="text-xs text-slate-400 py-3 text-center">
                                    Tidak ada data batch pada sheet Largo
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-blue-50/50 text-slate-600 font-semibold border-b border-blue-100 text-[11px]">
                                        <tr>
                                          <th className="p-1.5">Batch</th>
                                          <th className="p-1.5">Lokasi</th>
                                          <th className="p-1.5">SLOC</th>
                                          <th className="p-1.5 text-right">Last Qty</th>
                                          <th className="p-1.5 text-right text-emerald-700">Qty Convert</th>
                                          <th className="p-1.5">Exp Date</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                        {item.largoBatches.map((b, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-1.5 font-bold text-slate-800">{b.batch || '-'}</td>
                                            <td className="p-1.5 text-slate-600">{b.location || '-'}</td>
                                            <td className="p-1.5 text-slate-600">{b.sloc || '-'}</td>
                                            <td className="p-1.5 text-right font-bold text-slate-900">
                                              {b.qty.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-1.5 text-right text-emerald-700 font-semibold">
                                              {b.qtyConvert ? b.qtyConvert.toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="p-1.5 text-slate-500">{b.expiredDate || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: SAP Batches */}
                              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Database size={16} className="text-slate-700" />
                                    <h4 className="text-xs font-bold text-slate-900">
                                      Batch di Sheet SAP (Sistem) — {item.sapBatches.length} Baris
                                    </h4>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-slate-800">
                                    Total: {item.sapStock.toLocaleString('id-ID')} {item.uom}
                                  </span>
                                </div>

                                {item.sapBatches.length === 0 ? (
                                  <div className="text-xs text-slate-400 py-3 text-center">
                                    Tidak ada data batch pada sheet SAP
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                                        <tr>
                                          <th className="p-1.5">Batch</th>
                                          <th className="p-1.5">Plant</th>
                                          <th className="p-1.5">SLOC</th>
                                          <th className="p-1.5 text-right">Unres Stock</th>
                                          <th className="p-1.5 text-right text-rose-600">Blocked</th>
                                          <th className="p-1.5">SLED</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                        {item.sapBatches.map((b, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-1.5 font-bold text-slate-800">{b.batch || '-'}</td>
                                            <td className="p-1.5 text-slate-600">{b.plant || '-'}</td>
                                            <td className="p-1.5 text-slate-600">{b.sloc || '-'}</td>
                                            <td className="p-1.5 text-right font-bold text-slate-900">
                                              {b.unresStock.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-1.5 text-right text-rose-600">
                                              {b.blockedStock > 0 ? b.blockedStock.toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="p-1.5 text-slate-500">{b.sled || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
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

        {/* Pagination Footer */}
        {!isPrintMode && filteredItems.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Menampilkan</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>dari <strong>{filteredItems.length}</strong> SKU</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 font-bold font-mono">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
