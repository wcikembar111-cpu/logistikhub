import React, { useState, useMemo } from 'react';
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
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Boxes,
  Building2,
  Target,
  ArrowUpDown,
  Filter,
  PackageCheck,
  Percent,
  Calendar,
  Warehouse
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  TriRelasiItem,
  TriRelasiSummary,
  MatchStatus,
  TargetFulfillmentStatus
} from '../../../types/triRelasi';

interface TriRelasiDashboardViewProps {
  items: TriRelasiItem[];
  summary: TriRelasiSummary;
  sourceName?: string;
  lastSyncTime?: string;
}

const MATCH_COLORS: Record<MatchStatus, string> = {
  MATCH: '#10B981',        // Emerald
  LARGO_SURPLUS: '#F59E0B',// Amber
  SAP_SURPLUS: '#3B82F6',  // Blue
  ONLY_LARGO: '#8B5CF6',   // Purple
  ONLY_SAP: '#EC4899'      // Pink
};

export function TriRelasiDashboardView({
  items,
  summary,
  sourceName = 'Google Spreadsheet',
  lastSyncTime
}: TriRelasiDashboardViewProps) {
  // State for Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>('ALL');
  const [filterTargetStatus, setFilterTargetStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof TriRelasiItem>('totalTargetQty');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Toggle row expansion
  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.itemCode.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.largoBatches.some(b => b.batch.toLowerCase().includes(q) || b.location.toLowerCase().includes(q)) ||
          item.sapBatches.some(b => b.batch.toLowerCase().includes(q) || b.plant.toLowerCase().includes(q))
      );
    }

    // Match status filter
    if (filterMatchStatus !== 'ALL') {
      result = result.filter(item => item.matchStatus === filterMatchStatus);
    }

    // Target status filter
    if (filterTargetStatus !== 'ALL') {
      if (filterTargetStatus === 'HAS_TARGET') {
        result = result.filter(item => item.hasTarget);
      } else if (filterTargetStatus === 'FULFILLED') {
        result = result.filter(item => item.overallTargetStatus === 'FULFILLED');
      } else if (filterTargetStatus === 'PARTIAL') {
        result = result.filter(item => item.overallTargetStatus === 'PARTIAL');
      } else if (filterTargetStatus === 'LOW_OR_EMPTY') {
        result = result.filter(
          item => item.overallTargetStatus === 'LOW' || item.overallTargetStatus === 'EMPTY'
        );
      }
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal === null || aVal === undefined) aVal = -Infinity;
      if (bVal === null || bVal === undefined) bVal = -Infinity;

      if (typeof aVal === 'string') {
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc'
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    });

    return result;
  }, [items, searchQuery, filterMatchStatus, filterTargetStatus, sortField, sortDirection]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Chart Data: Top 8 SKU Comparison (Stock Largo vs Stock SAP)
  const chartStockData = useMemo(() => {
    return items.slice(0, 8).map(it => ({
      name: it.itemCode,
      product: it.productName.length > 20 ? it.productName.slice(0, 18) + '...' : it.productName,
      'Stock Largo': it.largoStock,
      'Stock SAP': it.sapStock,
      'Target Sep': it.targetSepQty,
      'Target Oct': it.targetOctQty
    }));
  }, [items]);

  // Chart Data: Match Status Pie
  const chartMatchPieData = useMemo(() => {
    return [
      { name: 'Match 100%', value: summary.matchCount, color: MATCH_COLORS.MATCH },
      { name: 'Largo Surplus', value: summary.varianceCount, color: MATCH_COLORS.LARGO_SURPLUS },
      { name: 'Hanya di Largo', value: summary.onlyLargoCount, color: MATCH_COLORS.ONLY_LARGO },
      { name: 'Hanya di SAP', value: summary.onlySapCount, color: MATCH_COLORS.ONLY_SAP }
    ].filter(d => d.value > 0);
  }, [summary]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredItems.map(it => ({
      'Kode Produk (SKU)': it.itemCode,
      'Nama Produk': it.productName,
      'Kategori': it.category,
      'Satuan': it.uom,
      'Stock Largo (Pcs)': it.largoStock,
      'Stock SAP Unres (Pcs)': it.sapStock,
      'Selisih (Largo - SAP)': it.stockVariance,
      'Status Match': it.matchStatus,
      'Target SEP 26 (Qty)': it.targetSepQty,
      '% Target SEP dari Largo': it.targetSepPctLargo ? `${it.targetSepPctLargo.toFixed(1)}%` : '-',
      '% Target SEP dari SAP': it.targetSepPctSap ? `${it.targetSepPctSap.toFixed(1)}%` : '-',
      'Target OCT 26 (Qty)': it.targetOctQty,
      '% Target OCT dari Largo': it.targetOctPctLargo ? `${it.targetOctPctLargo.toFixed(1)}%` : '-',
      '% Target OCT dari SAP': it.targetOctPctSap ? `${it.targetOctPctSap.toFixed(1)}%` : '-',
      'Total Target (Sep+Oct)': it.totalTargetQty,
      '% Total Target dari Largo': it.totalTargetPctLargo ? `${it.totalTargetPctLargo.toFixed(1)}%` : '-',
      '% Total Target dari SAP': it.totalTargetPctSap ? `${it.totalTargetPctSap.toFixed(1)}%` : '-',
      'Status Kesiapan Target': it.overallTargetStatus
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Tri-Relasi');
    XLSX.writeFile(wb, `Rekap_Tri_Relasi_Largo_SAP_Target_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSort = (field: keyof TriRelasiItem) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderFulfillmentBadge = (pct: number | null, isLargo = true) => {
    if (pct === null) {
      return <span className="text-slate-400 text-xs italic">No Target</span>;
    }
    const colorClass =
      pct >= 100
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
        : pct >= 50
        ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
        : 'bg-rose-50 text-rose-700 border-rose-200 font-medium';

    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] border ${colorClass}`}>
          {pct.toFixed(1)}%
        </span>
        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              pct >= 100
                ? isLargo ? 'bg-emerald-500' : 'bg-blue-500'
                : pct >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const renderMatchBadge = (status: MatchStatus, variance: number) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={12} />
            <span>Match 100% (0)</span>
          </span>
        );
      case 'LARGO_SURPLUS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={12} />
            <span>Largo +{variance.toLocaleString('id-ID')}</span>
          </span>
        );
      case 'SAP_SURPLUS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <AlertTriangle size={12} />
            <span>SAP +{Math.abs(variance).toLocaleString('id-ID')}</span>
          </span>
        );
      case 'ONLY_LARGO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <span>Hanya di Largo</span>
          </span>
        );
      case 'ONLY_SAP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-300">
            <span>Hanya di SAP</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Layers size={12} />
                Multi-Sheet Tri-Relasi Engine
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">
                Sumber: <strong className="text-white">{sourceName}</strong>
              </span>
              {lastSyncTime && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-300">Sync: {lastSyncTime}</span>
                </>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Rekonsiliasi Stock Largo ⟷ SAP ⟷ Target Kuantitas</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Sinkronisasi data real-time dari 3 sheet: identifikasi varians fisik (Largo) vs sistem (SAP) serta persentase pemenuhan kuota target produksi (SEP &apos;26 &amp; OCT &apos;26).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              title="Download Excel Rekap Tri-Relasi"
            >
              <Download size={16} />
              <span>Ekspor Rekap Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total SKU */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Total SKU Relasi</span>
            <Boxes size={16} className="text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {summary.totalSkus.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{summary.matchCount} Match</span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">{summary.varianceCount} Selisih</span>
          </div>
        </div>

        {/* Card 2: Match Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Stock Match Rate</span>
            <Percent size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600">
            {summary.matchRatePct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Net Selisih: <strong className={summary.totalVariance === 0 ? 'text-emerald-600' : 'text-amber-600'}>
              {summary.totalVariance > 0 ? `+${summary.totalVariance.toLocaleString('id-ID')}` : summary.totalVariance.toLocaleString('id-ID')} Pcs
            </strong>
          </div>
        </div>

        {/* Card 3: Stock Largo */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Total Stock Largo</span>
            <Warehouse size={16} className="text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-700">
            {summary.totalLargoStock.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Berdasarkan <strong>Last Qty</strong>
          </div>
        </div>

        {/* Card 4: Stock SAP */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Total Stock SAP</span>
            <Building2 size={16} className="text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700">
            {summary.totalSapStock.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Unres. Stock (Blocked: {summary.totalSapBlocked.toLocaleString('id-ID')})
          </div>
        </div>

        {/* Card 5: Target SEP '26 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Target SEP &apos;26</span>
            <Target size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {summary.totalTargetSep.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold" title="Pemenuhan dari Stock Largo">
              Largo: {summary.targetSepFulfilledPctLargo.toFixed(0)}%
            </span>
            <span className="text-blue-700 font-semibold" title="Pemenuhan dari Stock SAP">
              SAP: {summary.targetSepFulfilledPctSap.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Card 6: Target OCT '26 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Target OCT &apos;26</span>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {summary.totalTargetOct.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold" title="Pemenuhan dari Stock Largo">
              Largo: {summary.targetOctFulfilledPctLargo.toFixed(0)}%
            </span>
            <span className="text-blue-700 font-semibold" title="Pemenuhan dari Stock SAP">
              SAP: {summary.targetOctFulfilledPctSap.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Stock Comparison Largo vs SAP (Span 2) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Perbandingan Stock Fisik (Largo) vs Sistem (SAP) - Top SKU
              </h3>
              <p className="text-xs text-slate-500">
                Membandingkan kuantitas fisik gudang (Last Qty) dengan stok tak terbatas SAP (Unres. Stock)
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Top 8 SKU
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStockData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    `${Number(val).toLocaleString('id-ID')} Pcs`,
                    name
                  ]}
                  labelFormatter={(lbl: string) => {
                    const item = items.find(i => i.itemCode === lbl);
                    return `${lbl} - ${item?.productName || ''}`;
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Stock Largo" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stock SAP" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Match Status Breakdown (Span 1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Distribusi Status Rekonsiliasi
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Rasio kesesuaian data antara sheet Largo dan SAP
            </p>
          </div>

          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartMatchPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartMatchPieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: string) => [
                    `${val} SKU (${((Number(val) / summary.totalSkus) * 100).toFixed(1)}%)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-800">{summary.matchRatePct.toFixed(0)}%</span>
              <span className="text-[10px] text-slate-500 font-semibold">Match Rate</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Match 100%:
              </span>
              <strong className="text-slate-800">{summary.matchCount} SKU</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Ada Selisih:
              </span>
              <strong className="text-slate-800">{summary.varianceCount} SKU</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Hanya di Largo:
              </span>
              <strong className="text-slate-800">{summary.onlyLargoCount} SKU</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                Hanya di SAP:
              </span>
              <strong className="text-slate-800">{summary.onlySapCount} SKU</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari SKU, Nama Produk, Batch, Lokasi..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Match Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter size={13} className="text-slate-400" />
              <span className="text-slate-500 font-medium">Status Match:</span>
              <select
                value={filterMatchStatus}
                onChange={e => {
                  setFilterMatchStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua ({items.length})</option>
                <option value="MATCH">Match 100% ({summary.matchCount})</option>
                <option value="LARGO_SURPLUS">Largo Surplus</option>
                <option value="SAP_SURPLUS">SAP Surplus</option>
                <option value="ONLY_LARGO">Hanya di Largo ({summary.onlyLargoCount})</option>
                <option value="ONLY_SAP">Hanya di SAP ({summary.onlySapCount})</option>
              </select>
            </div>

            {/* Target Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Target size={13} className="text-slate-400" />
              <span className="text-slate-500 font-medium">Target:</span>
              <select
                value={filterTargetStatus}
                onChange={e => {
                  setFilterTargetStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Target</option>
                <option value="HAS_TARGET">Ada Target Kuantitas</option>
                <option value="FULFILLED">Tercapai (&gt;=100%)</option>
                <option value="PARTIAL">Parsial (50-99%)</option>
                <option value="LOW_OR_EMPTY">Kurang / Kosong (&lt;50%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation & Target Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <PackageCheck size={18} className="text-emerald-600" />
              <span>Tabel Tri-Relasi: Largo ⟷ SAP ⟷ Target Kuantitas</span>
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredItems.length} dari {items.length} SKU terdaftar
            </p>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Klik tanda panah untuk melihat detail batch &amp; lokasi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th
                  onClick={() => handleSort('itemCode')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Kode (SKU)</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('productName')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Produk</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('largoStock')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock Largo</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sapStock')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Stock SAP</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('absVariance')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Status Relasi</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('targetSepQty')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Target SEP &apos;26</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>% Target SEP</span>
                  <div className="text-[10px] text-slate-400 font-normal">Largo | SAP</div>
                </th>
                <th
                  onClick={() => handleSort('targetOctQty')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Target OCT &apos;26</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span>% Target OCT</span>
                  <div className="text-[10px] text-slate-400 font-normal">Largo | SAP</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const isExpanded = expandedCodes.has(item.itemCode);
                  return (
                    <React.Fragment key={item.itemCode}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.itemCode)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Tampilkan detail batch & lokasi"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {item.itemCode}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-semibold text-slate-800 truncate" title={item.productName}>
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.category} • {item.uom}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-indigo-700">
                          {item.largoStock.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-blue-700">
                          {item.sapStock.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {renderMatchBadge(item.matchStatus, item.stockVariance)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {item.targetSepQty > 0 ? (
                            item.targetSepQty.toLocaleString('id-ID')
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.targetSepQty > 0 ? (
                            <div className="flex items-center gap-2 justify-center">
                              <div title="Target SEP terpenuhi dari Stock Largo">
                                {renderFulfillmentBadge(item.targetSepPctLargo, true)}
                              </div>
                              <span className="text-slate-300">|</span>
                              <div title="Target SEP terpenuhi dari Stock SAP">
                                {renderFulfillmentBadge(item.targetSepPctSap, false)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-slate-300">-</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {item.targetOctQty > 0 ? (
                            item.targetOctQty.toLocaleString('id-ID')
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.targetOctQty > 0 ? (
                            <div className="flex items-center gap-2 justify-center">
                              <div title="Target OCT terpenuhi dari Stock Largo">
                                {renderFulfillmentBadge(item.targetOctPctLargo, true)}
                              </div>
                              <span className="text-slate-300">|</span>
                              <div title="Target OCT terpenuhi dari Stock SAP">
                                {renderFulfillmentBadge(item.targetOctPctSap, false)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-slate-300">-</div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-y border-slate-200">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                                  <Warehouse size={15} className="text-emerald-600" />
                                  <span>Detail Relasi &amp; Batch: {item.itemCode} - {item.productName}</span>
                                </h4>
                                <span className="text-xs text-slate-500 font-mono">
                                  Largo: {item.largoRowsCount} baris | SAP: {item.sapRowsCount} baris
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Largo Batches */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                    <span className="font-bold text-indigo-700 text-xs flex items-center gap-1.5">
                                      <Warehouse size={14} />
                                      Data Fisik Largo (Gudang)
                                    </span>
                                    <span className="text-xs font-bold text-indigo-800">
                                      Total: {item.largoStock.toLocaleString('id-ID')} Pcs
                                    </span>
                                  </div>

                                  {item.largoBatches.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Tidak ada catatan batch di sheet Largo.</p>
                                  ) : (
                                    <div className="overflow-x-auto max-h-44 overflow-y-auto text-[11px]">
                                      <table className="w-full text-left">
                                        <thead className="text-slate-400 uppercase font-semibold border-b border-slate-100">
                                          <tr>
                                            <th className="py-1">Batch</th>
                                            <th className="py-1">Lokasi</th>
                                            <th className="py-1">SLOC</th>
                                            <th className="py-1">ED</th>
                                            <th className="py-1 text-right">Last Qty</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {item.largoBatches.map((b, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                              <td className="py-1 font-mono text-slate-800">{b.batch}</td>
                                              <td className="py-1 text-slate-600">{b.location}</td>
                                              <td className="py-1 text-slate-500">{b.sloc}</td>
                                              <td className="py-1 text-slate-500">{b.expiredDate}</td>
                                              <td className="py-1 text-right font-bold text-indigo-700">
                                                {b.qty.toLocaleString('id-ID')}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                {/* SAP Batches */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                    <span className="font-bold text-blue-700 text-xs flex items-center gap-1.5">
                                      <Building2 size={14} />
                                      Data Sistem SAP (ERP)
                                    </span>
                                    <span className="text-xs font-bold text-blue-800">
                                      Unres: {item.sapStock.toLocaleString('id-ID')} Pcs
                                    </span>
                                  </div>

                                  {item.sapBatches.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Tidak ada catatan batch di sheet SAP.</p>
                                  ) : (
                                    <div className="overflow-x-auto max-h-44 overflow-y-auto text-[11px]">
                                      <table className="w-full text-left">
                                        <thead className="text-slate-400 uppercase font-semibold border-b border-slate-100">
                                          <tr>
                                            <th className="py-1">Batch</th>
                                            <th className="py-1">Plant</th>
                                            <th className="py-1">SLOC</th>
                                            <th className="py-1">SLED</th>
                                            <th className="py-1 text-right">Unres</th>
                                            <th className="py-1 text-right">Blocked</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {item.sapBatches.map((b, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                              <td className="py-1 font-mono text-slate-800">{b.batch}</td>
                                              <td className="py-1 text-slate-600">{b.plant}</td>
                                              <td className="py-1 text-slate-500">{b.sloc}</td>
                                              <td className="py-1 text-slate-500">{b.sled}</td>
                                              <td className="py-1 text-right font-bold text-blue-700">
                                                {b.unresStock.toLocaleString('id-ID')}
                                              </td>
                                              <td className="py-1 text-right text-slate-500">
                                                {b.blockedStock.toLocaleString('id-ID')}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Target Fulfillment Analysis */}
                              {item.hasTarget && (
                                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3 text-emerald-950">
                                  <div className="flex items-center gap-2">
                                    <Target size={16} className="text-emerald-700 shrink-0" />
                                    <span>
                                      <strong>Analisis Kuota Target:</strong> Target SEP ({item.targetSepQty.toLocaleString('id-ID')}) &amp; OCT ({item.targetOctQty.toLocaleString('id-ID')})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span>
                                      Defisit SEP (Largo): <strong className={item.largoStock >= item.targetSepQty ? 'text-emerald-700' : 'text-rose-600'}>
                                        {item.largoStock >= item.targetSepQty ? 'Terpenuhi (Aman)' : `Kurang ${(item.targetSepQty - item.largoStock).toLocaleString('id-ID')} Pcs`}
                                      </strong>
                                    </span>
                                    <span>
                                      Defisit OCT (Largo): <strong className={item.largoStock >= item.targetOctQty ? 'text-emerald-700' : 'text-amber-600'}>
                                        {item.largoStock >= item.targetOctQty ? 'Terpenuhi (Aman)' : `Kurang ${(item.targetOctQty - item.largoStock).toLocaleString('id-ID')} Pcs`}
                                      </strong>
                                    </span>
                                  </div>
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

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredItems.length)} dari {filteredItems.length} SKU
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Halaman {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
