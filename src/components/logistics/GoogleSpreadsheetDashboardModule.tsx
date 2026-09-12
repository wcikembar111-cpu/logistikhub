import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  Clock,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Trash2,
  ExternalLink,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  X,
  Eye,
  Warehouse,
  Building2,
  Target,
  Boxes,
  Percent,
  Calendar,
  PackageCheck
} from 'lucide-react';
import { TriRelasiDashboardView } from './triRelasi/TriRelasiDashboardView';
import { TargetMonitoringReportView } from './triRelasi/TargetMonitoringReportView';
import { LargoSapComparisonView } from './triRelasi/LargoSapComparisonView';
import { reconcileTriRelasi } from '../../utils/triRelasiReconciliation';
import {
  TriRelasiItem,
  TriRelasiSummary,
  LargoRow,
  SapRow,
  TargetRow
} from '../../types/triRelasi';

interface ColumnMapping {
  statusCol: string;
  categoryCol: string;
  valueCol: string;
  dateCol: string;
}

const STORAGE_KEY_URL = 'google_spreadsheet_dashboard_url';
const STORAGE_KEY_DATA = 'google_spreadsheet_cached_data';
const STORAGE_KEY_MAP = 'google_spreadsheet_cached_map';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export function GoogleSpreadsheetDashboardModule() {
  // State
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_URL);
    if (saved && (saved.includes('1o8hWUAK6DO1rmggbiRaRNfT7On4c9RhrHR6X07nqZm4') || saved.includes('901676227'))) {
      localStorage.removeItem(STORAGE_KEY_URL);
      return '';
    }
    return saved || '';
  });
  const [tableData, setTableData] = useState<Record<string, any>[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Exclude obsolete mock data if it was cached previously
        if (Array.isArray(parsed) && parsed.some((r: any) => r['No Dokumen'] === 'DO-2026-001' || r['Nama Barang'] === 'Eskulin Cologne 125ml')) {
          localStorage.removeItem(STORAGE_KEY_DATA);
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [rawWorkbook, setRawWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [sourceType, setSourceType] = useState<'spreadsheet' | 'file'>('spreadsheet');
  const [sourceName, setSourceName] = useState<string>('Google Spreadsheet Live');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Tri-Relasi State (Largo <-> SAP <-> Target) - strictly computed from spreadsheet sheets
  const [triRelasiResult, setTriRelasiResult] = useState<{
    items: TriRelasiItem[];
    summary: TriRelasiSummary;
  } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'tri-relasi' | 'target-monitoring' | 'largo-sap' | 'explorer'>('tri-relasi');
  const [detectedLargoSheet, setDetectedLargoSheet] = useState<string | undefined>(undefined);
  const [detectedSapSheet, setDetectedSapSheet] = useState<string | undefined>(undefined);
  const [detectedTargetSheet, setDetectedTargetSheet] = useState<string | undefined>(undefined);
  const [largoRowsCount, setLargoRowsCount] = useState<number>(0);
  const [sapRowsCount, setSapRowsCount] = useState<number>(0);
  const [targetRowsCount, setTargetRowsCount] = useState<number>(0);

  // Loading & Alerts
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<Record<string, any> | null>(null);

  // Filters & Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [autoSyncMinutes, setAutoSyncMinutes] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect Column Names directly from spreadsheet rows
  const availableColumns = useMemo(() => {
    if (tableData.length === 0) return [];
    const colSet = new Set<string>();
    const limit = Math.min(tableData.length, 100);
    for (let i = 0; i < limit; i++) {
      const row = tableData[i];
      if (row) {
        Object.keys(row).forEach(k => {
          if (k && !k.startsWith('__EMPTY')) {
            colSet.add(k);
          }
        });
      }
    }
    return Array.from(colSet);
  }, [tableData]);

  // Dynamic Column Mapping for Visualizations
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAP);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      statusCol: '',
      categoryCol: '',
      valueCol: '',
      dateCol: ''
    };
  });

  // Auto-detect columns if not mapped
  useEffect(() => {
    if (availableColumns.length === 0) return;

    setMapping(prev => {
      const updated = { ...prev };

      // Detect Status Column
      if (!updated.statusCol || !availableColumns.includes(updated.statusCol)) {
        const found = availableColumns.find(col =>
          /status|state|kondisi|hasil|flag/i.test(col)
        );
        if (found) updated.statusCol = found;
      }

      // Detect Category Column
      if (!updated.categoryCol || !availableColumns.includes(updated.categoryCol)) {
        const found = availableColumns.find(col =>
          /kategori|category|group|kelompok|tipe|jenis|material\s*group|klasifikasi/i.test(col)
        );
        if (found) updated.categoryCol = found;
      }

      // Detect Value/Quantity Column
      if (!updated.valueCol || !availableColumns.includes(updated.valueCol)) {
        const found = availableColumns.find(col =>
          /qty|kuantitas|quantity|total\s*pcs|amount|jumlah|nilai|vol/i.test(col)
        );
        if (found) updated.valueCol = found;
        else {
          // Fallback to any numeric column
          const numCol = availableColumns.find(col => {
            const val = tableData[0]?.[col];
            return typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '');
          });
          if (numCol) updated.valueCol = numCol;
        }
      }

      // Detect Date Column
      if (!updated.dateCol || !availableColumns.includes(updated.dateCol)) {
        const found = availableColumns.find(col =>
          /tanggal|tgl|date|posting|waktu|created/i.test(col)
        );
        if (found) updated.dateCol = found;
      }

      localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(updated));
      return updated;
    });
  }, [availableColumns, tableData]);

  // Parse raw XLSX workbook into table data
  const processWorkbook = (wb: XLSX.WorkBook, sheetToUse?: string) => {
    setRawWorkbook(wb);
    setAvailableSheets(wb.SheetNames);

    // 1. Tri-Relasi Multi-Sheet Detection (largo, sap, target)
    const largoSheet = wb.SheetNames.find(s => /largo/i.test(s.trim()));
    const sapSheet = wb.SheetNames.find(s => /^sap$|sap[\s_-]/i.test(s.trim()) || /sap/i.test(s.trim()));
    const targetSheetMatch = wb.SheetNames.find(s => /target/i.test(s.trim()));

    setDetectedLargoSheet(largoSheet);
    setDetectedSapSheet(sapSheet);
    setDetectedTargetSheet(targetSheetMatch);

    if (largoSheet || sapSheet || targetSheetMatch) {
      const lRows = largoSheet
        ? (XLSX.utils.sheet_to_json(wb.Sheets[largoSheet], { defval: '' }) as LargoRow[])
        : [];
      const sRows = sapSheet
        ? (XLSX.utils.sheet_to_json(wb.Sheets[sapSheet], { defval: '' }) as SapRow[])
        : [];
      const tRows = targetSheetMatch
        ? (XLSX.utils.sheet_to_json(wb.Sheets[targetSheetMatch], { defval: '' }) as TargetRow[])
        : [];

      setLargoRowsCount(lRows.length);
      setSapRowsCount(sRows.length);
      setTargetRowsCount(tRows.length);

      const reconciled = reconcileTriRelasi(lRows, sRows, tRows);
      setTriRelasiResult(reconciled);
      setActiveMainTab('tri-relasi');
    } else {
      setTriRelasiResult(null);
      setActiveMainTab('explorer');
    }

    // 2. Choose sheet to display in the single sheet viewer
    const sheetToDisplay = sheetToUse && wb.SheetNames.includes(sheetToUse)
      ? sheetToUse
      : largoSheet || wb.SheetNames[0];

    setActiveSheetName(sheetToDisplay);
    const worksheet = wb.Sheets[sheetToDisplay];

    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd'
    }) as Record<string, any>[];

    if (rawRows.length === 0) {
      setTableData([]);
      setErrorMessage(`Sheet "${sheetToDisplay}" kosong atau belum memiliki baris data. Anda dapat memilih sheet lain di atas.`);
      return;
    }

    setTableData(rawRows);
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(rawRows));
    } catch {
      // ignore storage quota
    }
    setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    setCurrentPage(1);
  };

  // Reset and clear loaded spreadsheet data and cache
  const clearSpreadsheetData = () => {
    setTableData([]);
    setRawWorkbook(null);
    setAvailableSheets([]);
    setActiveSheetName('');
    setTriRelasiResult(null);
    setDetectedLargoSheet(undefined);
    setDetectedSapSheet(undefined);
    setDetectedTargetSheet(undefined);
    setLargoRowsCount(0);
    setSapRowsCount(0);
    setTargetRowsCount(0);
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.removeItem(STORAGE_KEY_MAP);
    setSuccessMessage('Data spreadsheet dan cache telah dibersihkan.');
    setErrorMessage(null);
  };

  // Parse CSV text into table data
  const processCsv = (csvText: string) => {
    const wb = XLSX.read(csvText, { type: 'string', cellDates: true });
    processWorkbook(wb);
  };

  // Fetch Google Spreadsheet
  const fetchFromGoogleSpreadsheet = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl || spreadsheetUrl).trim();
    if (!urlToFetch) {
      setErrorMessage('Silakan masukkan tautan Google Spreadsheet terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      localStorage.setItem(STORAGE_KEY_URL, urlToFetch);

      // Strategy 1: Server-side proxy (supports full multi-sheet XLSX extraction)
      let serverSuccess = false;
      try {
        const res = await fetch('/api/fetch-google-spreadsheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToFetch, format: 'xlsx' })
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.success) {
            serverSuccess = true;
            if (json.base64) {
              const wb = XLSX.read(json.base64, { type: 'base64', cellDates: true });
              processWorkbook(wb);
              setSourceType('spreadsheet');
              setSourceName(`Google Sheets (${json.sheetId ? json.sheetId.slice(0, 8) + '...' : 'Live'})`);
              setSuccessMessage(`Berhasil menyinkronkan ${wb.SheetNames.length} sheet dari Google Spreadsheet.`);
              return;
            } else if (json.csv) {
              processCsv(json.csv);
              setSourceType('spreadsheet');
              setSourceName(`Google Sheets (GID: ${json.gid || '0'})`);
              setSuccessMessage('Berhasil menyinkronkan data sheet dari Google Spreadsheet.');
              return;
            }
          }
        }
      } catch (srvErr) {
        console.warn('Server spreadsheet proxy notice:', srvErr);
      }

      // Strategy 2: Direct browser-side fetch fallback (uses client CORS & cookies)
      if (!serverSuccess) {
        const pubMatch = urlToFetch.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
        if (pubMatch) {
          const pubId = pubMatch[1];
          try {
            const directPubUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv&_t=${Date.now()}`;
            const directRes = await fetch(directPubUrl, { mode: 'cors' });
            if (directRes.ok) {
              const csv = await directRes.text();
              if (csv && !csv.includes('<!DOCTYPE') && !csv.includes('<html') && csv.trim().length > 10) {
                processCsv(csv);
                setSourceType('spreadsheet');
                setSourceName(`Google Sheets Pub (${pubId.slice(0, 8)}...)`);
                setSuccessMessage('Berhasil menyinkronkan data sheet publik Google Spreadsheet!');
                return;
              }
            }
          } catch {
            // direct pub fetch failed
          }
        } else {
          let fallbackSheetId = '';
          let fallbackGid = '0';
          const idMatch = urlToFetch.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (idMatch && idMatch[1] !== 'e') {
            fallbackSheetId = idMatch[1];
          } else {
            const driveMatch = urlToFetch.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
            if (driveMatch) fallbackSheetId = driveMatch[1];
          }
          const gidMatch = urlToFetch.match(/[#&?]gid=([0-9]+)/);
          if (gidMatch) fallbackGid = gidMatch[1];

          if (fallbackSheetId) {
            try {
              const directUrl = `https://docs.google.com/spreadsheets/d/${fallbackSheetId}/gviz/tq?tqx=out:csv&gid=${fallbackGid}&_t=${Date.now()}`;
              const directRes = await fetch(directUrl, { mode: 'cors' });
              if (directRes.ok) {
                const csv = await directRes.text();
                if (csv && !csv.includes('<!DOCTYPE') && !csv.includes('<html') && csv.trim().length > 10) {
                  processCsv(csv);
                  setSourceType('spreadsheet');
                  setSourceName(`Google Sheets (Live GID: ${fallbackGid})`);
                  setSuccessMessage('Berhasil menyinkronkan data langsung dari Google Spreadsheet!');
                  return;
                }
              }
            } catch {
              // direct browser fetch failed
            }
          }
        }
      }

      // If all strategies fail, inform the user with actionable instructions
      console.warn('Google Sheets sync notice: Spreadsheet belum dapat diakses publik atau memerlukan izin.');
      setErrorMessage(
        "Google Spreadsheet tidak dapat diakses atau dibagikan secara privat. Pastikan akses Google Sheets telah disetel ke 'Siapa saja yang memiliki link' (Anyone with the link) dengan peran Pelihat (Viewer), atau unggah file Excel/CSV langsung dari komputer."
      );
    } catch (err: any) {
      console.warn('Google Sheets sync exception notice:', err?.message || err);
      setErrorMessage(err?.message || 'Terjadi kendala saat mengunduh data dari Google Spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        processWorkbook(wb);
        setSourceType('file');
        setSourceName(file.name);
        setSuccessMessage(`Berhasil memuat file "${file.name}" (${wb.SheetNames.length} sheet).`);
      } catch (err: any) {
        setErrorMessage(`Gagal membaca file spreadsheet: ${err.message}`);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file lokal.');
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // Switch Sheet
  const handleSheetChange = (newSheet: string) => {
    if (!rawWorkbook) return;
    try {
      processWorkbook(rawWorkbook, newSheet);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Auto-fetch real spreadsheet on initial mount if URL is configured and no data loaded yet
  useEffect(() => {
    if (spreadsheetUrl && tableData.length === 0 && !triRelasiResult && !isLoading) {
      fetchFromGoogleSpreadsheet(spreadsheetUrl);
    }
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (autoSyncMinutes <= 0 || sourceType !== 'spreadsheet' || !spreadsheetUrl) return;

    const interval = setInterval(() => {
      fetchFromGoogleSpreadsheet();
    }, autoSyncMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoSyncMinutes, sourceType, spreadsheetUrl]);

  // Calculate Unique Values for Filters
  const uniqueStatuses = useMemo(() => {
    if (!mapping.statusCol) return [];
    const set = new Set<string>();
    tableData.forEach(row => {
      const val = row[mapping.statusCol];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        set.add(String(val).trim());
      }
    });
    return Array.from(set);
  }, [tableData, mapping.statusCol]);

  const uniqueCategories = useMemo(() => {
    if (!mapping.categoryCol) return [];
    const set = new Set<string>();
    tableData.forEach(row => {
      const val = row[mapping.categoryCol];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        set.add(String(val).trim());
      }
    });
    return Array.from(set);
  }, [tableData, mapping.categoryCol]);

  // KPI Metrics Calculation
  const kpi = useMemo(() => {
    const totalRows = tableData.length;
    let totalValue = 0;
    let validValueCount = 0;
    const statusCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    tableData.forEach(row => {
      // Calculate Total Value
      if (mapping.valueCol) {
        const rawVal = row[mapping.valueCol];
        const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) {
          totalValue += num;
          validValueCount++;
        }
      }

      // Status
      if (mapping.statusCol) {
        const s = String(row[mapping.statusCol] || 'Tidak Diketahui').trim();
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }

      // Category
      if (mapping.categoryCol) {
        const c = String(row[mapping.categoryCol] || 'Lainnya').trim();
        categoryCounts[c] = (categoryCounts[c] || 0) + 1;
      }
    });

    // Top status
    let topStatus = '-';
    let topStatusCount = 0;
    Object.entries(statusCounts).forEach(([st, cnt]) => {
      if (cnt > topStatusCount) {
        topStatus = st;
        topStatusCount = cnt;
      }
    });

    // Top category
    let topCategory = '-';
    let topCategoryCount = 0;
    Object.entries(categoryCounts).forEach(([cat, cnt]) => {
      if (cnt > topCategoryCount) {
        topCategory = cat;
        topCategoryCount = cnt;
      }
    });

    return {
      totalRows,
      totalValue,
      validValueCount,
      topStatus,
      topStatusCount,
      topCategory,
      topCategoryCount
    };
  }, [tableData, mapping]);

  // Chart Data Preparation: Status Breakdown
  const statusChartData = useMemo(() => {
    if (!mapping.statusCol) return [];
    const counts: Record<string, number> = {};
    tableData.forEach(row => {
      const s = String(row[mapping.statusCol] || 'Lainnya').trim();
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tableData, mapping.statusCol]);

  // Chart Data Preparation: Top Categories by Quantity/Count
  const categoryChartData = useMemo(() => {
    if (!mapping.categoryCol) return [];
    const sums: Record<string, number> = {};

    tableData.forEach(row => {
      const cat = String(row[mapping.categoryCol] || 'Lainnya').trim();
      let val = 1;
      if (mapping.valueCol) {
        const num = parseFloat(String(row[mapping.valueCol]).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) val = num;
      }
      sums[cat] = (sums[cat] || 0) + val;
    });

    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, total]) => ({ name, total }));
  }, [tableData, mapping.categoryCol, mapping.valueCol]);

  // Chart Data Preparation: Date Trend or Sample distribution
  const trendChartData = useMemo(() => {
    if (!mapping.dateCol) {
      // Group by index chunks if no date column
      const chunks: { label: string; date?: string; count: number; value: number }[] = [];
      const chunkSize = Math.max(1, Math.ceil(tableData.length / 8));
      for (let i = 0; i < tableData.length; i += chunkSize) {
        const slice = tableData.slice(i, i + chunkSize);
        let valSum = 0;
        slice.forEach(r => {
          if (mapping.valueCol) {
            const num = parseFloat(String(r[mapping.valueCol]).replace(/[^0-9.-]+/g, ''));
            if (!isNaN(num)) valSum += num;
          }
        });
        chunks.push({
          label: `Brs ${i + 1}-${Math.min(i + chunkSize, tableData.length)}`,
          count: slice.length,
          value: valSum || slice.length
        });
      }
      return chunks;
    }

    const byDate: Record<string, { label: string; date: string; value: number; count: number }> = {};
    tableData.forEach(row => {
      const d = String(row[mapping.dateCol] || '').slice(0, 10);
      if (!d) return;
      let val = 1;
      if (mapping.valueCol) {
        const num = parseFloat(String(row[mapping.valueCol]).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) val = num;
      }
      if (!byDate[d]) {
        byDate[d] = { label: d, date: d, value: 0, count: 0 };
      }
      byDate[d].value += val;
      byDate[d].count += 1;
    });

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  }, [tableData, mapping.dateCol, mapping.valueCol]);

  // Filtered and Sorted Table Data
  const filteredData = useMemo(() => {
    return tableData.filter(row => {
      // Search term
      if (searchTerm) {
        const match = Object.values(row).some(v =>
          String(v).toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!match) return false;
      }

      // Status filter
      if (filterStatus !== 'ALL' && mapping.statusCol) {
        if (String(row[mapping.statusCol] || '').trim() !== filterStatus) return false;
      }

      // Category filter
      if (filterCategory !== 'ALL' && mapping.categoryCol) {
        if (String(row[mapping.categoryCol] || '').trim() !== filterCategory) return false;
      }

      return true;
    });
  }, [tableData, searchTerm, filterStatus, filterCategory, mapping]);

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      const numA = parseFloat(valA);
      const numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export filtered data to Excel
  const exportToExcel = () => {
    if (sortedData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(sortedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeSheetName || 'DashboardData');
    const fileName = `Export_Spreadsheet_${activeSheetName || 'Data'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Extract Sheet ID for display
  const parsedSheetId = useMemo(() => {
    const m = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  }, [spreadsheetUrl]);

  return (
    <div id="google-spreadsheet-dashboard-module" className="w-full space-y-5 animate-fade-in text-slate-800">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Ecomm
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Live Cloud Sync
                </span>
                {sourceType === 'spreadsheet' && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Sheets Aktif
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Visualisasi data dan KPI real-time dari tautan Google Spreadsheet E-Commerce atau file spreadsheet lokal
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Panduan sharing Google Sheets"
            >
              <HelpCircle size={15} className="text-slate-500" />
              <span>Panduan Link</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sesuaikan pemetaan kolom untuk grafik dan KPI"
            >
              <SlidersHorizontal size={15} />
              <span>Petakan Kolom</span>
            </button>

            {tableData.length > 0 && (
              <button
                type="button"
                onClick={clearSpreadsheetData}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Bersihkan cache dan putuskan data saat ini"
              >
                <Trash2 size={15} className="text-slate-400 hover:text-rose-600" />
                <span>Reset Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Connection Bar & Input */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Google Sheets URL Input */}
          <div className="lg:col-span-8 flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                <FileSpreadsheet size={17} />
              </div>
              <input
                type="url"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="Tempel link Google Spreadsheet (contoh: https://docs.google.com/spreadsheets/d/...)"
                className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
              />
              {spreadsheetUrl && (
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSpreadsheetUrl('');
                      localStorage.removeItem(STORAGE_KEY_URL);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Hapus tautan"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchFromGoogleSpreadsheet()}
              disabled={isLoading || !spreadsheetUrl.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0 disabled:cursor-not-allowed"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
          </div>

          {/* Local File Upload & Auto-Sync selector */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80"
              title="Upload file spreadsheet lokal dari komputer"
            >
              <UploadCloud size={15} className="text-slate-600" />
              <span className="truncate">Upload File Excel / CSV</span>
            </button>

            {/* Auto-sync Interval */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 shrink-0">
              <Clock size={13} className="text-slate-400" />
              <select
                value={autoSyncMinutes}
                onChange={(e) => setAutoSyncMinutes(Number(e.target.value))}
                className="text-xs bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer"
                title="Pilih interval sinkronisasi otomatis"
              >
                <option value={0}>Manual</option>
                <option value={1}>1 Mnt</option>
                <option value={5}>5 Mnt</option>
                <option value={15}>15 Mnt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sheet Selector & Status Meta Pill */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <FileSpreadsheet size={14} className="text-emerald-600" />
              Sumber: <strong className="text-slate-800">{sourceName}</strong>
            </span>
            {parsedSheetId && (
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-mono">
                ID: {parsedSheetId.slice(0, 10)}...
              </span>
            )}
            <span className="text-slate-300">•</span>
            <span>Sheet:</span>
            {availableSheets.length > 1 ? (
              <div className="flex items-center gap-1">
                {availableSheets.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSheetChange(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeSheetName === s
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {activeSheetName}
              </strong>
            )}
          </div>

          <div className="flex items-center gap-3">
            {spreadsheetUrl.includes('docs.google.com') && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-medium hover:underline"
              >
                <span>Buka di Google Sheets</span>
                <ExternalLink size={12} />
              </a>
            )}
            {lastSyncTime && (
              <span>Sync terakhir: <strong className="text-slate-700">{lastSyncTime}</strong></span>
            )}
            <span>Total: <strong className="text-slate-700">{tableData.length} baris</strong></span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={19} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-900 text-sm leading-tight">{errorMessage}</p>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  Pastikan spreadsheet telah disetel ke <strong>"Siapa saja yang memiliki link"</strong> dengan peran <strong>Pelihat (Viewer)</strong>, atau pilih file Excel/CSV lokal dari komputer Anda.
                </p>

                {/* Quick Action Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <UploadCloud size={14} />
                    <span>Pilih File Excel / CSV (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-800 font-medium text-xs border border-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={14} />
                    <span>Panduan Setting Link Publik</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-100 transition-colors"
                title="Tutup pesan"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Navigation: Tri-Relasi or All Detected Sheets from Spreadsheet */}
      {(availableSheets.length > 0 || triRelasiResult) && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
          {triRelasiResult && (
            <>
              {/* Tab 1: Tri-Relasi All-in-one */}
              <button
                type="button"
                onClick={() => setActiveMainTab('tri-relasi')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'tri-relasi'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Layers size={15} className={activeMainTab === 'tri-relasi' ? 'text-indigo-400' : 'text-indigo-600'} />
                <span>Tri-Relasi</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeMainTab === 'tri-relasi' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  Ringkasan
                </span>
              </button>

              {/* Tab 2: Monitoring Target (Qty Convert) */}
              <button
                type="button"
                onClick={() => setActiveMainTab('target-monitoring')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'target-monitoring'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Target size={15} className={activeMainTab === 'target-monitoring' ? 'text-emerald-300' : 'text-emerald-600'} />
                <span>Monitoring Target</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeMainTab === 'target-monitoring' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {triRelasiResult.summary.targetReadyFulfilledPct.toFixed(0)}%
                </span>
              </button>

              {/* Tab 3: Perbandingan Largo vs SAP */}
              <button
                type="button"
                onClick={() => setActiveMainTab('largo-sap')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'largo-sap'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Boxes size={15} className={activeMainTab === 'largo-sap' ? 'text-blue-300' : 'text-blue-600'} />
                <span>Largo vs SAP</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeMainTab === 'largo-sap' ? 'bg-blue-800 text-blue-100' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {triRelasiResult.summary.matchRatePct.toFixed(0)}%
                </span>
              </button>
            </>
          )}

          {/* Dynamic Sheet Buttons directly from Spreadsheet */}
          {availableSheets.map((sheetName) => {
            const isActive = activeMainTab === 'explorer' && activeSheetName === sheetName;
            const isLargo = /largo/i.test(sheetName);
            const isSap = /^sap$|sap[\s_-]/i.test(sheetName) || /sap/i.test(sheetName);
            const isTarget = /target/i.test(sheetName);

            let rowCount = 0;
            if (isLargo && largoRowsCount > 0) rowCount = largoRowsCount;
            else if (isSap && sapRowsCount > 0) rowCount = sapRowsCount;
            else if (isTarget && targetRowsCount > 0) rowCount = targetRowsCount;
            else if (activeSheetName === sheetName) rowCount = tableData.length;

            return (
              <button
                key={sheetName}
                type="button"
                onClick={() => {
                  setActiveMainTab('explorer');
                  handleSheetChange(sheetName);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm ring-2 ring-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isLargo ? <Warehouse size={14} /> : isSap ? <Building2 size={14} /> : isTarget ? <Target size={14} /> : <FileSpreadsheet size={14} />}
                <span>Sheet: {sheetName}</span>
                {rowCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {rowCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {tableData.length === 0 && !triRelasiResult ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <FileSpreadsheet size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Belum Ada Data Spreadsheet Terhubung</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Aplikasi membaca seluruh data secara langsung dari Google Spreadsheet atau file Excel/CSV lokal tanpa mock / data dummy. Nama sheet, kolom, dan isi tabel dibaca secara otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <FileSpreadsheet size={16} />
                <span>Opsi 1: Google Spreadsheet</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tempel link Google Spreadsheet pada kolom input di atas lalu klik tombol <strong>Sinkronkan</strong>. Pastikan akses disetel ke <em>"Siapa saja yang memiliki link"</em> dengan peran <em>"Pelihat"</em>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                <UploadCloud size={16} />
                <span>Opsi 2: Upload File Excel / CSV</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gunakan tombol <strong>Upload File</strong> di atas untuk membaca file <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code> langsung dari perangkat Anda.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <UploadCloud size={16} />
              <span>Upload File Excel / CSV Sekarang</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <HelpCircle size={16} />
              <span>Panduan Akses Spreadsheet</span>
            </button>
          </div>
        </div>
      ) : activeMainTab === 'tri-relasi' && triRelasiResult ? (
        <TriRelasiDashboardView
          items={triRelasiResult.items}
          summary={triRelasiResult.summary}
          sourceName={sourceName}
          lastSyncTime={lastSyncTime}
        />
      ) : activeMainTab === 'target-monitoring' && triRelasiResult ? (
        <TargetMonitoringReportView
          items={triRelasiResult.items}
          summary={triRelasiResult.summary}
          sourceName={sourceName}
          lastSyncTime={lastSyncTime}
        />
      ) : activeMainTab === 'largo-sap' && triRelasiResult ? (
        <LargoSapComparisonView
          items={triRelasiResult.items}
          summary={triRelasiResult.summary}
          sourceName={sourceName}
          lastSyncTime={lastSyncTime}
        />
      ) : (
        <>
          {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Data Records */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Baris Data</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{kpi.totalRows.toLocaleString()}</h3>
            <span className="text-xs text-slate-500">catatan</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {filteredData.length !== kpi.totalRows
              ? `${filteredData.length} baris sesuai filter`
              : 'Seluruh baris aktif pada sheet'}
          </p>
        </div>

        {/* Total Value / Quantity */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total {mapping.valueCol || 'Kuantitas'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-emerald-700">
              {kpi.totalValue > 0 ? kpi.totalValue.toLocaleString() : '-'}
            </h3>
            <span className="text-xs text-slate-500">volume</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {mapping.valueCol ? `Kolom: ${mapping.valueCol}` : 'Belum dipetakan'}
          </p>
        </div>

        {/* Top Status */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Terbanyak</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <PieChartIcon size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-slate-900 truncate" title={kpi.topStatus}>
              {kpi.topStatus}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpi.topStatusCount > 0 ? `${kpi.topStatusCount} baris (${Math.round((kpi.topStatusCount / (kpi.totalRows || 1)) * 100)}%)` : '-'}
          </p>
        </div>

        {/* Top Category */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori Teratas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-slate-900 truncate" title={kpi.topCategory}>
              {kpi.topCategory}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpi.topCategoryCount > 0 ? `${kpi.topCategoryCount} frekuensi data` : '-'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Status Distribution (Donut) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <PieChartIcon size={16} className="text-emerald-600" />
              Distribusi Status
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              {mapping.statusCol ? `(${mapping.statusCol})` : ''}
            </span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-4">
                <p className="text-xs text-slate-400">Kolom Status belum ditentukan.</p>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Pilih Kolom Status
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Category Volume Breakdown (Bar Chart) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 size={16} className="text-emerald-600" />
              Analisis Kategori Teratas
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              {mapping.categoryCol ? `Berdasarkan ${mapping.categoryCol}` : ''}
            </span>
          </div>

          <div className="h-56 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400">Kolom Kategori belum dipilih.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Tren Waktu & Distribusi Baris */}
        <div className="lg:col-span-12 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-emerald-600" />
              Tren Aktivitas & Volume Data
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              {mapping.dateCol ? `Berdasarkan Tanggal (${mapping.dateCol})` : 'Distribusi Segmen Baris'}
            </span>
          </div>

          <div className="h-44 w-full">
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Volume / Nilai"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400">Data tidak cukup untuk menampilkan grafik tren.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={15} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari semua kolom..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Quick Status Filter */}
            {uniqueStatuses.length > 0 && (
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  {uniqueStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Category Filter */}
            {uniqueCategories.length > 0 && (
              <div className="relative hidden md:block">
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  {uniqueCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToExcel}
              disabled={sortedData.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh data tabel saat ini ke format Excel"
            >
              <Download size={14} />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                {availableColumns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="p-3 hover:bg-slate-100 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      {sortField === col ? (
                        sortDirection === 'asc' ? <ChevronUp size={13} className="text-emerald-600" /> : <ChevronDown size={13} className="text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">•</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={idx} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{actualIndex}</td>
                      {availableColumns.map((col) => {
                        const val = row[col];
                        const isStatus = col === mapping.statusCol;
                        return (
                          <td key={col} className="p-3 whitespace-nowrap">
                            {isStatus && val ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {String(val)}
                              </span>
                            ) : (
                              String(val !== undefined && val !== null ? val : '')
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRowDetail(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Lihat Detail Lengkap Baris"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={availableColumns.length + 2} className="p-8 text-center text-slate-400">
                    Tidak ada baris data yang cocok dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>dari <strong>{sortedData.length}</strong> total baris</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Modal 1: Panduan Link Google Spreadsheet */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HelpCircle size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Cara Menggunakan Google Spreadsheet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 max-h-[70vh] overflow-y-auto pr-1">
              <p className="font-medium text-slate-800">
                Aplikasi ini membaca data Google Spreadsheet secara real-time (read-only):
              </p>

              {/* Step by step for Google Sheets */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  Langkah Berbagi Google Spreadsheet:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                  <li>Buka dokumen <strong>Google Spreadsheet</strong> Anda di browser.</li>
                  <li>Klik tombol <strong className="text-emerald-700">Bagikan (Share)</strong> di pojok kanan atas.</li>
                  <li>Di bagian <strong>Akses umum</strong>, ubah menjadi: <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">Siapa saja yang memiliki link</span> dengan peran <strong>Pelihat (Viewer)</strong>.</li>
                  <li>Klik <strong>Salin Link</strong> (Copy Link).</li>
                  <li>Tempelkan ke input di atas dan klik tombol <strong>Sinkronkan</strong>.</li>
                </ol>
              </div>

              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
                <p className="font-bold">✨ Mendukung Banyak Sheet (Multi-Sheet):</p>
                <p>
                  Jika file spreadsheet Anda memiliki lebih dari 1 sheet, aplikasi akan membaca seluruh sheet secara otomatis sehingga Anda dapat berpindah sheet hanya dengan 1 klik pada tab di atas!
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <p className="font-bold">⚡ Pilihan Offline (Pilih File):</p>
                <p>
                  Anda juga dapat menggunakan tombol <strong>Pilih File Excel / CSV</strong> untuk langsung membuka file spreadsheet dari komputer Anda kapan saja tanpa koneksi internet.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Pemetaan Kolom Kustom */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <SlidersHorizontal size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Pemetaan Kolom Dashboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pilih kolom dari spreadsheet Anda yang ingin dijadikan rujukan grafik status, kategori, tanggal, dan nilai kuantitas.
            </p>

            <div className="space-y-3 text-xs">
              {/* Status Column */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kolom Status:</label>
                <select
                  value={mapping.statusCol}
                  onChange={(e) => setMapping(prev => ({ ...prev, statusCol: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">-- Tidak Dipetakan --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Category Column */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kolom Kategori / Group:</label>
                <select
                  value={mapping.categoryCol}
                  onChange={(e) => setMapping(prev => ({ ...prev, categoryCol: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">-- Tidak Dipetakan --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Value / Numeric Column */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kolom Kuantitas / Angka (Qty):</label>
                <select
                  value={mapping.valueCol}
                  onChange={(e) => setMapping(prev => ({ ...prev, valueCol: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">-- Tidak Dipetakan --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Date Column */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kolom Tanggal (Date):</label>
                <select
                  value={mapping.dateCol}
                  onChange={(e) => setMapping(prev => ({ ...prev, dateCol: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">-- Tidak Dipetakan --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(mapping));
                  setShowConfigModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Detail Baris */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Detail Baris Data</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 text-xs">
              {Object.entries(selectedRowDetail).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row sm:items-baseline justify-between py-1.5 border-b border-slate-50 gap-1">
                  <span className="font-bold text-slate-500 w-1/3">{k}:</span>
                  <span className="text-slate-800 font-medium break-all flex-1">{String(v || '-')}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
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
