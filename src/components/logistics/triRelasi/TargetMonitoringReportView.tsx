import React, { useState, useMemo, useRef } from 'react';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Boxes,
  ArrowUpDown,
  Filter,
  PackageCheck,
  Percent,
  Warehouse,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info
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
import { TriRelasiItem, TriRelasiSummary } from '../../../types/triRelasi';

interface TargetMonitoringReportViewProps {
  items: TriRelasiItem[];
  summary: TriRelasiSummary;
  sourceName?: string;
  lastSyncTime?: string;
}

export function TargetMonitoringReportView({
  items,
  summary,
  sourceName = 'Google Spreadsheet',
  lastSyncTime
}: TargetMonitoringReportViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReadiness, setFilterReadiness] = useState<'ALL' | 'FULL_READY' | 'PARTIAL_READY' | 'NOT_READY' | 'SURPLUS'>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'SEP' | 'OCT'>('ALL');
  const [sortField, setSortField] = useState<'deficit' | 'readinessPct' | 'targetQty' | 'readyQty' | 'itemCode'>('deficit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Target-specific items (SKUs that have targets defined, or all items with Qty Convert)
  const targetItems = useMemo(() => {
    return items.filter(item => item.hasTarget || item.largoQtyConvert > 0);
  }, [items]);

  // Toggle row expansion for batch details
  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCodes(new Set(targetItems.map(i => i.itemCode)));
  };

  const collapseAll = () => {
    setExpandedCodes(new Set());
  };

  // Filter & Sort items
  const filteredItems = useMemo(() => {
    let result = [...targetItems];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.itemCode.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.largoBatches.some(b => b.batch.toLowerCase().includes(q) || b.location.toLowerCase().includes(q))
      );
    }

    // Filter readiness status
    if (filterReadiness === 'FULL_READY') {
      result = result.filter(item => item.targetReadinessStatus === 'FULL_READY');
    } else if (filterReadiness === 'PARTIAL_READY') {
      result = result.filter(item => item.targetReadinessStatus === 'PARTIAL_READY');
    } else if (filterReadiness === 'NOT_READY') {
      result = result.filter(item => item.targetReadinessStatus === 'NOT_READY');
    } else if (filterReadiness === 'SURPLUS') {
      result = result.filter(item => item.targetSurplusQty > 0);
    }

    // Filter period
    if (filterPeriod === 'SEP') {
      result = result.filter(item => item.targetSepQty > 0);
    } else if (filterPeriod === 'OCT') {
      result = result.filter(item => item.targetOctQty > 0);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortField === 'deficit') {
        aVal = a.targetDeficitQty;
        bVal = b.targetDeficitQty;
      } else if (sortField === 'readinessPct') {
        aVal = a.targetReadyPct ?? -1;
        bVal = b.targetReadyPct ?? -1;
      } else if (sortField === 'targetQty') {
        aVal = a.totalTargetQty;
        bVal = b.totalTargetQty;
      } else if (sortField === 'readyQty') {
        aVal = a.largoQtyConvert;
        bVal = b.largoQtyConvert;
      } else if (sortField === 'itemCode') {
        return sortDirection === 'asc'
          ? a.itemCode.localeCompare(b.itemCode)
          : b.itemCode.localeCompare(a.itemCode);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [targetItems, searchQuery, filterReadiness, filterPeriod, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    if (isPrintMode) return filteredItems;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage, isPrintMode]);

  // Chart Data: Top 8 SKUs by Target with Qty Convert
  const topTargetChartData = useMemo(() => {
    return [...targetItems]
      .filter(i => i.totalTargetQty > 0)
      .sort((a, b) => b.totalTargetQty - a.totalTargetQty)
      .slice(0, 8)
      .map(item => ({
        name: item.itemCode,
        fullName: item.productName,
        'Target Kuantitas': item.totalTargetQty,
        'Qty Convert Siap (Largo)': item.largoQtyConvert,
        'Defisit Kebutuhan': item.targetDeficitQty
      }));
  }, [targetItems]);

  // Status Pie Data
  const statusPieData = useMemo(() => {
    return [
      { name: 'Siap Penuh (≥100%)', value: summary.targetReadyCount, color: '#10B981' },
      { name: 'Siap Sebagian (1-99%)', value: summary.targetPartialReadyCount, color: '#F59E0B' },
      { name: 'Belum Siap (0%)', value: summary.targetNotReadyCount, color: '#EF4444' }
    ].filter(d => d.value > 0);
  }, [summary]);

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Laporan Kesiapan Target (Summary per SKU)
    const reportData = filteredItems.map((item, idx) => ({
      No: idx + 1,
      'Kode Produk': item.itemCode,
      'Nama Produk': item.productName,
      Kategori: item.category,
      Satuan: item.uom,
      'Satuan Konversi': item.largoUomConvert || '-',
      'Target SEP': item.targetSepQty,
      'Target OCT': item.targetOctQty,
      'Total Target': item.totalTargetQty,
      'Qty Convert Siap (Largo)': item.largoQtyConvert,
      'Stok Fisik Aktual (Largo Last Qty)': item.largoStock,
      '% Kesiapan': item.targetReadyPct !== null ? `${item.targetReadyPct.toFixed(1)}%` : '0%',
      'Sisa Kebutuhan (Defisit)': item.targetDeficitQty,
      'Kelebihan (Surplus)': item.targetSurplusQty,
      Status:
        item.targetReadinessStatus === 'FULL_READY'
          ? 'Siap Penuh (≥100%)'
          : item.targetReadinessStatus === 'PARTIAL_READY'
          ? 'Siap Sebagian'
          : 'Belum Siap (0%)',
      'Jumlah Batch Largo': item.largoBatches.length
    }));

    const wsSummary = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Laporan_Monitoring_Target');

    // Sheet 2: Rincian Batch Largo Penyumbang Qty Convert
    const batchData: any[] = [];
    filteredItems.forEach(item => {
      item.largoBatches.forEach(b => {
        batchData.push({
          'Kode Produk': item.itemCode,
          'Nama Produk': item.productName,
          Batch: b.batch,
          'Vendor Batch': b.vendorBatch,
          Lokasi: b.location,
          SLOC: b.sloc,
          'Qty Convert (Siap)': b.qtyConvert,
          'Uom Convert': b.uomConvert,
          'Stok Fisik (Last Qty)': b.qty,
          'Expired Date': b.expiredDate,
          'LPN / Serial': b.lpn
        });
      });
    });

    if (batchData.length > 0) {
      const wsBatches = XLSX.utils.json_to_sheet(batchData);
      XLSX.utils.book_append_sheet(wb, wsBatches, 'Detail_Batch_Largo');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Laporan_Monitoring_Target_Largo_${dateStr}.xlsx`);
  };

  // Export to CSV
  const exportToCsv = () => {
    const csvRows = [
      [
        'No',
        'Kode Produk',
        'Nama Produk',
        'Kategori',
        'Satuan',
        'Target SEP',
        'Target OCT',
        'Total Target',
        'Qty Convert Siap',
        'Stok Fisik Largo',
        'Persen Kesiapan',
        'Sisa Defisit',
        'Status'
      ].join(',')
    ];

    filteredItems.forEach((item, idx) => {
      csvRows.push(
        [
          idx + 1,
          `"${item.itemCode}"`,
          `"${item.productName.replace(/"/g, '""')}"`,
          `"${item.category}"`,
          `"${item.uom}"`,
          item.targetSepQty,
          item.targetOctQty,
          item.totalTargetQty,
          item.largoQtyConvert,
          item.largoStock,
          item.targetReadyPct !== null ? `${item.targetReadyPct.toFixed(1)}%` : '0%',
          item.targetDeficitQty,
          `"${item.targetReadinessStatus}"`
        ].join(',')
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Monitoring_Target_${new Date().toISOString().split('T')[0]}.csv`);
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
              <Target size={20} className="text-emerald-600" />
              <span>Monitoring Target (Qty Convert)</span>
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {targetItems.length} SKU
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemenuhan target produksi berdasarkan Qty Convert Largo.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={exportToExcel}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download Laporan Format Excel (.xlsx)"
            >
              <Download size={14} className="text-emerald-600" />
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

      {/* KPI Cards: Target Readiness Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Target */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Target Kuantitas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {summary.totalTargetCombined.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Sep: <strong>{summary.totalTargetSep.toLocaleString('id-ID')}</strong></span>
              <span>•</span>
              <span>Oct: <strong>{summary.totalTargetOct.toLocaleString('id-ID')}</strong></span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>SKU Bertarget</span>
            <span className="font-bold text-slate-800">{targetItems.filter(i => i.hasTarget).length} Produk</span>
          </div>
        </div>

        {/* Card 2: Total Qty Convert Siap (Largo) */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-3 relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Sudah Siap (Qty Convert)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PackageCheck size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">
              {summary.totalLargoQtyConvert.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-emerald-700 mt-1 font-semibold flex items-center gap-1.5">
              <span>{summary.targetReadyFulfilledPct.toFixed(1)}% Terpenuhi dari Target</span>
            </div>
          </div>
          <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
            <span>Stok Fisik Total (Last Qty)</span>
            <span className="font-bold">{summary.totalLargoStock.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 3: Sisa Defisit Target */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs space-y-3 bg-gradient-to-br from-white to-rose-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Sisa Kebutuhan (Defisit)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700">
              {summary.totalTargetDeficit.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-rose-600 mt-1">
              Kekurangan kuantitas yang belum dikonversi di Largo
            </div>
          </div>
          <div className="pt-2 border-t border-rose-100 flex items-center justify-between text-xs text-rose-800">
            <span>Kelebihan / Surplus</span>
            <span className="font-bold text-emerald-700">+{summary.totalTargetSurplus.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Card 4: SKU Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Kesiapan SKU</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Siap Penuh (≥100%)
              </span>
              <strong className="font-mono">{summary.targetReadyCount} SKU</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Siap Sebagian (1-99%)
              </span>
              <strong className="font-mono">{summary.targetPartialReadyCount} SKU</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Belum Siap (0%)
              </span>
              <strong className="font-mono">{summary.targetNotReadyCount} SKU</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total SKU Target</span>
            <span className="font-bold text-slate-800">{targetItems.length} SKU</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Bar Chart & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Target vs Qty Convert */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Perbandingan Top Target vs Qty Convert Siap</h3>
              <p className="text-xs text-slate-500">Menampilkan 8 SKU dengan kuantitas target tertinggi</p>
            </div>
            <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 font-medium">
              Qty Convert Largo
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTargetChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${Number(val).toLocaleString('id-ID')}`, name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Target Kuantitas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Qty Convert Siap (Largo)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Defisit Kebutuhan" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Status Kesiapan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Distribusi Status Kesiapan SKU</h3>
            <p className="text-xs text-slate-500">Persentase SKU berdasarkan keterpenuhan target</p>
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
              <div className="text-xs text-slate-400 text-center">Belum ada data target</div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {statusPieData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </span>
                <span className="font-bold text-slate-800 font-mono">
                  {item.value} SKU ({((item.value / targetItems.length) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
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
              placeholder="Cari kode produk konv, nama, batch..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Readiness Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFilterReadiness('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterReadiness === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({targetItems.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterReadiness('FULL_READY');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterReadiness === 'FULL_READY' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Siap Penuh ({summary.targetReadyCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterReadiness('PARTIAL_READY');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterReadiness === 'PARTIAL_READY' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Sebagian ({summary.targetPartialReadyCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterReadiness('NOT_READY');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterReadiness === 'NOT_READY' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Belum Siap ({summary.targetNotReadyCount})
              </button>
            </div>

            {/* Period Filter */}
            <select
              value={filterPeriod}
              onChange={e => {
                setFilterPeriod(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Periode</option>
              <option value="SEP">Target September</option>
              <option value="OCT">Target Oktober</option>
            </select>

            {/* Sort Field */}
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="deficit">Urut: Defisit Terbesar</option>
              <option value="readinessPct">Urut: % Kesiapan</option>
              <option value="targetQty">Urut: Target Tertinggi</option>
              <option value="readyQty">Urut: Qty Convert Tertinggi</option>
              <option value="itemCode">Urut: Kode Produk</option>
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

      {/* Detailed Table Report */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3.5 w-10 text-center">Detail</th>
                <th className="p-3.5 min-w-[120px]">Kode Produk Konv</th>
                <th className="p-3.5 min-w-[220px]">Nama Produk Konv</th>
                <th className="p-3.5 text-center min-w-[80px]">Satuan</th>
                <th className="p-3.5 text-right min-w-[95px] bg-blue-50/50 text-blue-950">Target SEP</th>
                <th className="p-3.5 text-right min-w-[95px] bg-blue-50/50 text-blue-950">Target OCT</th>
                <th className="p-3.5 text-right min-w-[110px] bg-blue-100/60 text-blue-950 font-black">Total Target</th>
                <th className="p-3.5 text-right min-w-[125px] bg-emerald-50 text-emerald-950 font-black">
                  Qty Convert Siap
                  <span className="block text-[10px] font-normal text-emerald-700">Sheet Largo</span>
                </th>
                <th className="p-3.5 text-right min-w-[100px] text-slate-600">
                  Stok Fisik
                  <span className="block text-[10px] font-normal text-slate-400">Last Qty</span>
                </th>
                <th className="p-3.5 text-center min-w-[150px]">Kesiapan (%)</th>
                <th className="p-3.5 text-right min-w-[110px] bg-rose-50/40 text-rose-950 font-bold">
                  Sisa Kebutuhan
                  <span className="block text-[10px] font-normal text-rose-600">Defisit</span>
                </th>
                <th className="p-3.5 text-center min-w-[120px]">Status Kesiapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-slate-400">
                    Tidak ada data target atau produk yang cocok dengan pencarian dan filter saat ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isExpanded = expandedCodes.has(item.itemCode);
                  const readyPct = item.targetReadyPct ?? 0;
                  const hasDeficit = item.targetDeficitQty > 0;

                  return (
                    <React.Fragment key={item.itemCode}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-slate-50/60' : ''}`}>
                        {/* Toggle Button */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.itemCode)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                            title="Tampilkan rincian batch di Largo"
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
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{item.category}</span>
                            {item.largoUomConvert && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-600 font-mono">Konv: {item.largoUomConvert}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Satuan */}
                        <td className="p-3 text-center font-mono text-slate-600">
                          {item.uom}
                        </td>

                        {/* Target SEP */}
                        <td className="p-3 text-right font-mono bg-blue-50/30 text-blue-900">
                          {item.targetSepQty > 0 ? item.targetSepQty.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Target OCT */}
                        <td className="p-3 text-right font-mono bg-blue-50/30 text-blue-900">
                          {item.targetOctQty > 0 ? item.targetOctQty.toLocaleString('id-ID') : '-'}
                        </td>

                        {/* Total Target */}
                        <td className="p-3 text-right font-mono font-black bg-blue-100/40 text-blue-950">
                          {item.totalTargetQty.toLocaleString('id-ID')}
                        </td>

                        {/* Qty Convert Siap */}
                        <td className="p-3 text-right font-mono font-black bg-emerald-50 text-emerald-800 text-sm">
                          {item.largoQtyConvert.toLocaleString('id-ID')}
                        </td>

                        {/* Stok Fisik (Last Qty) */}
                        <td className="p-3 text-right font-mono text-slate-600">
                          {item.largoStock.toLocaleString('id-ID')}
                        </td>

                        {/* Progress Bar & Readiness Pct */}
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-slate-700">
                                {item.targetReadyPct !== null ? `${item.targetReadyPct.toFixed(1)}%` : '0%'}
                              </span>
                              {item.targetSurplusQty > 0 && (
                                <span className="text-[10px] text-emerald-600 font-semibold">
                                  +{item.targetSurplusQty}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  readyPct >= 100
                                    ? 'bg-emerald-500'
                                    : readyPct >= 50
                                    ? 'bg-amber-500'
                                    : readyPct > 0
                                    ? 'bg-orange-500'
                                    : 'bg-rose-400'
                                }`}
                                style={{ width: `${Math.min(100, readyPct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Sisa Kebutuhan (Defisit) */}
                        <td className="p-3 text-right font-mono bg-rose-50/30 font-bold text-rose-700">
                          {hasDeficit ? item.targetDeficitQty.toLocaleString('id-ID') : (
                            <span className="text-emerald-600 font-semibold text-xs">Lengkap (0)</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 text-center">
                          {item.targetReadinessStatus === 'FULL_READY' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              <span>Siap Penuh</span>
                            </span>
                          ) : item.targetReadinessStatus === 'PARTIAL_READY' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} />
                              <span>Siap Sebagian</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle size={12} />
                              <span>Belum Siap</span>
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Batch Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={12} className="p-4 sm:p-5">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Warehouse size={16} className="text-emerald-600" />
                                  <h4 className="text-xs font-bold text-slate-800">
                                    Rincian Batch & Lokasi di Sheet Largo yang Menyumbang Qty Convert ({item.largoBatches.length} Batch)
                                  </h4>
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  SKU: <strong>{item.itemCode}</strong> — {item.productName}
                                </span>
                              </div>

                              {item.largoBatches.length === 0 ? (
                                <div className="text-xs text-slate-400 py-3 text-center">
                                  Tidak ada catatan batch di sheet Largo untuk produk ini.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                      <tr>
                                        <th className="p-2">Batch</th>
                                        <th className="p-2">Vendor Batch</th>
                                        <th className="p-2">Lokasi</th>
                                        <th className="p-2">SLOC</th>
                                        <th className="p-2 text-right bg-emerald-50 text-emerald-950 font-bold">Qty Convert (Siap)</th>
                                        <th className="p-2">UOM Convert</th>
                                        <th className="p-2 text-right">Stok Fisik (Last Qty)</th>
                                        <th className="p-2">Expired Date</th>
                                        <th className="p-2">LPN / Serial</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                      {item.largoBatches.map((b, bIdx) => (
                                        <tr key={bIdx} className="hover:bg-slate-50">
                                          <td className="p-2 font-bold text-slate-800">{b.batch || '-'}</td>
                                          <td className="p-2 text-slate-600">{b.vendorBatch || '-'}</td>
                                          <td className="p-2 text-slate-600">{b.location || '-'}</td>
                                          <td className="p-2 text-slate-600">{b.sloc || '-'}</td>
                                          <td className="p-2 text-right font-black bg-emerald-50 text-emerald-800">
                                            {b.qtyConvert ? b.qtyConvert.toLocaleString('id-ID') : '0'}
                                          </td>
                                          <td className="p-2 text-slate-600 font-sans">{b.uomConvert || item.uom}</td>
                                          <td className="p-2 text-right text-slate-700">{b.qty.toLocaleString('id-ID')}</td>
                                          <td className="p-2 text-slate-600">{b.expiredDate || '-'}</td>
                                          <td className="p-2 text-slate-400">{b.lpn || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
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
              <span>dari <strong>{filteredItems.length}</strong> produk</span>
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
