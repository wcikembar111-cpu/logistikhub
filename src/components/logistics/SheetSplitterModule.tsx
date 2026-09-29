import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  SlidersHorizontal, 
  Check, 
  ChevronRight, 
  Sparkles,
  Info,
  ArrowRight,
  Filter,
  FileCheck2,
  Table,
  Eye,
  Database,
  Calendar,
  CheckSquare,
  Square,
  CheckCheck,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { playBroadcastSound } from '../../utils/broadcastSound';

interface ParsedRow {
  [key: string]: any;
}

/**
 * Extract yyyy/mm format from any expired date value
 * Handles Excel serial numbers, Date instances, ISO dates, DD/MM/YYYY, text month names, etc.
 */
export function extractYearMonthFromDate(val: any): string {
  if (val === undefined || val === null) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return `${y}/${m}`;
  }

  let s = String(val).trim();
  if (!s) return '';

  // Check Excel serial number (numeric or 5-digit string like 45980)
  if (typeof val === 'number' || /^\d{5}$/.test(s)) {
    const num = typeof val === 'number' ? val : parseInt(s, 10);
    if (num >= 20000 && num <= 70000) {
      // Excel epoch: 1899-12-30
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${y}/${m}`;
      }
    }
  }

  // Already yyyy/mm or yyyy-mm
  const ymMatch = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (ymMatch) {
    return `${ymMatch[1]}/${ymMatch[2].padStart(2, '0')}`;
  }

  // mm/yyyy or mm-yyyy
  const myMatch = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (myMatch) {
    return `${myMatch[2]}/${myMatch[1].padStart(2, '0')}`;
  }

  // yyyy-mm-dd or yyyy/mm/dd or yyyy.mm.dd (with optional time or T...)
  const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = parseInt(ymdMatch[2], 10);
    return `${year}/${String(month).padStart(2, '0')}`;
  }

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    let month = p2;
    // If p2 > 12 and p1 <= 12, format was MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      month = p1;
    }
    return `${year}/${String(month).padStart(2, '0')}`;
  }

  // yyyymmdd (8 digits)
  const compactMatch = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}/${compactMatch[2]}`;
  }

  // Month names like "15-Aug-2026" or "Nov 2026" or "10 Oktober 2026"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
    jul: '07', agu: '08', ags: '08', aug: '08', sep: '09', okt: '10', oct: '10',
    nop: '11', nov: '11', des: '12', dec: '12'
  };
  const yearMatch = s.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    const y = yearMatch[1];
    const lower = s.toLowerCase();
    for (const [key, mm] of Object.entries(monthMap)) {
      if (lower.includes(key)) {
        return `${y}/${mm}`;
      }
    }
  }

  // Fallback to standard JS Date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 1990 && y <= 2100) {
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}/${m}`;
    }
  }

  return '';
}

export function SheetSplitterModule() {
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<ParsedRow[]>([]);
  const [slocColumn, setSlocColumn] = useState<string>('');
  const [expiredDateColumn, setExpiredDateColumn] = useState<string>('');
  const [sourceColumn, setSourceColumn] = useState<string>('Source');
  const [autoFormatSourceFromEd, setAutoFormatSourceFromEd] = useState<boolean>(true);
  const [unassignedSlocName, setUnassignedSlocName] = useState<string>('NOSL');
  const [maxSheetNameLength, setMaxSheetNameLength] = useState<number>(4);
  const [includeAllDataSheet, setIncludeAllDataSheet] = useState<boolean>(true);
  const [allDataSheetName, setAllDataSheetName] = useState<string>('DATA');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedPreviewSheet, setSelectedPreviewSheet] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [downloadMode, setDownloadMode] = useState<'all' | 'custom' | 'single'>('all');
  const [selectedDownloadSloc, setSelectedDownloadSloc] = useState<string>('');
  const [selectedSlocs, setSelectedSlocs] = useState<string[]>([]);
  const [slocFilterText, setSlocFilterText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect SLOC column from list of headers
  const autoDetectSlocColumn = (columnNames: string[]): string => {
    if (!columnNames || columnNames.length === 0) return '';
    // Priority 1: Exact matches for "sloc", "storage_location", "storage location"
    const exactMatch = columnNames.find(c => {
      const lower = c.trim().toLowerCase();
      return lower === 'sloc' || lower === 'storage location' || lower === 'storage_location' || lower === 'storageloc' || lower === 'slc';
    });
    if (exactMatch) return exactMatch;

    // Priority 2: Contains "sloc"
    const containsSloc = columnNames.find(c => c.trim().toLowerCase().includes('sloc'));
    if (containsSloc) return containsSloc;

    // Priority 3: Contains "storage" or "gudang" or "lokasi"
    const generalMatch = columnNames.find(c => {
      const lower = c.trim().toLowerCase();
      return lower.includes('storage') || lower.includes('gudang') || lower.includes('lokasi') || lower.includes('location');
    });
    if (generalMatch) return generalMatch;

    // Fallback: first column
    return columnNames[0];
  };

  // Auto-detect Expired Date column from headers
  const autoDetectExpiredDateColumn = (columnNames: string[]): string => {
    if (!columnNames || columnNames.length === 0) return '';
    
    // Priority 1: Exact / clean matches for "expireddate", "expirydate", "expdate", "ed", etc.
    const exactMatch = columnNames.find(c => {
      const clean = c.trim().toLowerCase().replace(/[_\s\-\.]/g, '');
      return ['expireddate', 'expirydate', 'expirationdate', 'tglexpired', 'tanggalkadaluarsa', 'expdate', 'tangled', 'tgled'].includes(clean);
    });
    if (exactMatch) return exactMatch;

    // Priority 2: Contains "expired" or "expiry" or "kadaluarsa" or "sled"
    const containsExpired = columnNames.find(c => {
      const lower = c.trim().toLowerCase();
      return lower.includes('expired') || lower.includes('expiry') || lower.includes('kadaluarsa') || lower.includes('sled');
    });
    if (containsExpired) return containsExpired;

    // Priority 3: Contains "ed" as standalone token or header name
    const edMatch = columnNames.find(c => {
      const lower = c.trim().toLowerCase();
      return lower === 'ed' || /\b(ed)\b/i.test(lower);
    });
    if (edMatch) return edMatch;

    return '';
  };

  // Auto-detect Source column from headers
  const autoDetectSourceColumn = (columnNames: string[]): string => {
    if (!columnNames || columnNames.length === 0) return 'Source';
    const match = columnNames.find(c => {
      const lower = c.trim().toLowerCase();
      return lower === 'source' || lower === 'src' || lower === 'sumber';
    });
    return match || 'Source';
  };

  // Sanitize sheet name for Excel rules (forbidden: \ / ? * [ ] : and max chars)
  const sanitizeSheetName = (rawName: string, maxLen: number = 4): string => {
    let clean = (rawName || '').replace(/[\/\\?*\[\]:]/g, '_').trim();
    if (!clean) clean = unassignedSlocName || 'NOSL';
    // Uppercase for clean SAP code style (e.g. 1001, 8A12)
    clean = clean.toUpperCase();
    if (clean.length > maxLen) {
      clean = clean.substring(0, maxLen);
    }
    return clean;
  };

  // Process raw workbook file
  const processFile = async (file: File) => {
    setIsLoading(true);
    setExportSuccessMessage(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('File Excel tidak memiliki sheet yang valid.');
      }

      // Read first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: ParsedRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        throw new Error('Sheet pertama pada file ini kosong atau tidak memiliki baris data.');
      }

      // Extract unique headers
      const detectedHeaders: string[] = [];
      jsonData.forEach(row => {
        Object.keys(row).forEach(key => {
          if (!detectedHeaders.includes(key)) {
            detectedHeaders.push(key);
          }
        });
      });

      const detectedSloc = autoDetectSlocColumn(detectedHeaders);
      const detectedEd = autoDetectExpiredDateColumn(detectedHeaders);
      const detectedSource = autoDetectSourceColumn(detectedHeaders);

      setFileName(file.name);
      setFileSize(file.size);
      setHeaders(detectedHeaders);
      setAllRows(jsonData);
      setSlocColumn(detectedSloc);
      setExpiredDateColumn(detectedEd);
      setSourceColumn(detectedSource);
      setSelectedPreviewSheet('ALL');
      setCurrentPage(1);

      playBroadcastSound('info');
    } catch (err: any) {
      alert(`Gagal membaca file Excel: ${err.message || 'Format tidak didukung'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Demo sample dataset loader for instant testing
  const handleLoadSampleData = () => {
    const sampleHeaders = ['Material', 'Deskripsi_Barang', 'SLOC', 'Batch', 'Expired Date', 'Qty_Pcs', 'UoM', 'Source', 'Status'];
    const sampleRows: ParsedRow[] = [
      { Material: 'FG-100201', Deskripsi_Barang: 'Larutan Jeruk Nipis 200ml', SLOC: '1001', Batch: 'B260901', 'Expired Date': '2026-11-15', Qty_Pcs: 120, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-100202', Deskripsi_Barang: 'Larutan Jambu 200ml', SLOC: '1001', Batch: 'B260902', 'Expired Date': '2026-12-30', Qty_Pcs: 85, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-200105', Deskripsi_Barang: 'Kino Candy Kopi Susu', SLOC: '1002', Batch: 'B260903', 'Expired Date': '2027-04-18', Qty_Pcs: 340, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-200108', Deskripsi_Barang: 'Kino Candy Mint Fresh', SLOC: '1002', Batch: 'B260904', 'Expired Date': '2027-05-22', Qty_Pcs: 210, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-300401', Deskripsi_Barang: 'Ellips Hair Vitamin Morrocan', SLOC: '8A12', Batch: 'B260905', 'Expired Date': '2026-08-20', Qty_Pcs: 450, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-300402', Deskripsi_Barang: 'Ellips Hair Vitamin Smooth', SLOC: '8A12', Batch: 'B260906', 'Expired Date': '2026-09-10', Qty_Pcs: 310, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-400901', Deskripsi_Barang: 'Cap Kaki Tiga Lychee Can', SLOC: '1200', Batch: 'B260907', 'Expired Date': '2026-10-05', Qty_Pcs: 95, UoM: 'PCS', Source: '', Status: 'Quarantine' },
      { Material: 'FG-400902', Deskripsi_Barang: 'Cap Kaki Tiga Original Can', SLOC: '1200', Batch: 'B260908', 'Expired Date': '2026-10-28', Qty_Pcs: 140, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-500101', Deskripsi_Barang: 'Ovale Facial Mask Bengkoang', SLOC: '1800', Batch: 'B260909', 'Expired Date': '2027-02-14', Qty_Pcs: 75, UoM: 'PCS', Source: '', Status: 'Available' },
      { Material: 'FG-600201', Deskripsi_Barang: 'Sleek Baby Bottle Cleanser', SLOC: '', Batch: 'B260910', 'Expired Date': '2027-08-30', Qty_Pcs: 60, UoM: 'PCS', Source: '', Status: 'Unassigned' },
      { Material: 'FG-600202', Deskripsi_Barang: 'Sleek Baby Laundry Liquid', SLOC: '', Batch: 'B260911', 'Expired Date': '2027-09-15', Qty_Pcs: 45, UoM: 'PCS', Source: '', Status: 'Unassigned' },
      { Material: 'FG-700101', Deskripsi_Barang: 'Ristra Peeling Treatment', SLOC: '1001', Batch: 'B260912', 'Expired Date': '2026-07-25', Qty_Pcs: 190, UoM: 'PCS', Source: '', Status: 'Available' }
    ];

    setFileName('Sample_Stock_Logistik.xlsx');
    setFileSize(15200);
    setHeaders(sampleHeaders);
    setAllRows(sampleRows);
    setSlocColumn('SLOC');
    setExpiredDateColumn('Expired Date');
    setSourceColumn('Source');
    setSelectedPreviewSheet('ALL');
    setCurrentPage(1);
    setExportSuccessMessage(null);
    playBroadcastSound('info');
  };

  // Reset all state
  const handleClear = () => {
    setFileName('');
    setFileSize(0);
    setHeaders([]);
    setAllRows([]);
    setSlocColumn('');
    setExpiredDateColumn('');
    setSourceColumn('Source');
    setSelectedPreviewSheet('ALL');
    setSearchQuery('');
    setExportSuccessMessage(null);
    setSelectedSlocs([]);
    setSlocFilterText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Transformed rows: Replace Source cell value with yyyy/mm from Expired Date
  const processedRows = useMemo(() => {
    if (!autoFormatSourceFromEd || !expiredDateColumn || allRows.length === 0) {
      return allRows;
    }
    const targetSourceKey = sourceColumn || 'Source';
    return allRows.map(row => {
      const edVal = row[expiredDateColumn];
      const ym = extractYearMonthFromDate(edVal);
      return {
        ...row,
        [targetSourceKey]: ym || (row[targetSourceKey] !== undefined ? String(row[targetSourceKey]) : '')
      };
    });
  }, [allRows, autoFormatSourceFromEd, expiredDateColumn, sourceColumn]);

  // Effective headers list: ensuring Source column exists and is ordered cleanly
  const effectiveHeaders = useMemo(() => {
    if (!autoFormatSourceFromEd || !expiredDateColumn || headers.length === 0) {
      return headers;
    }
    const targetSourceKey = sourceColumn || 'Source';
    if (headers.includes(targetSourceKey)) {
      return headers;
    }
    // If Source was not present in raw headers, insert right after expiredDateColumn or at end
    const edIdx = headers.indexOf(expiredDateColumn);
    if (edIdx !== -1) {
      const copy = [...headers];
      copy.splice(edIdx + 1, 0, targetSourceKey);
      return copy;
    }
    return [...headers, targetSourceKey];
  }, [headers, autoFormatSourceFromEd, expiredDateColumn, sourceColumn]);

  // Group rows by mapped sheet name (strict 4 characters) using processed rows
  const groupedSheets = useMemo(() => {
    if (!slocColumn || processedRows.length === 0) {
      return { sheetMap: new Map<string, ParsedRow[]>(), sheetList: [] };
    }

    const map = new Map<string, ParsedRow[]>();
    const usedNames = new Set<string>();

    processedRows.forEach(row => {
      const rawVal = row[slocColumn];
      let sheetName = '';

      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
        sheetName = sanitizeSheetName(unassignedSlocName || 'NOSL', maxSheetNameLength);
      } else {
        sheetName = sanitizeSheetName(String(rawVal).trim(), maxSheetNameLength);
      }

      if (!sheetName) sheetName = 'NOSL';

      if (!map.has(sheetName)) {
        map.set(sheetName, []);
        usedNames.add(sheetName);
      }
      map.get(sheetName)!.push(row);
    });

    // Sort sheet names alphabetically (numbers first, then letters)
    const sortedSheetNames = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return {
      sheetMap: map,
      sheetList: sortedSheetNames
    };
  }, [processedRows, slocColumn, unassignedSlocName, maxSheetNameLength]);

  // Synchronize selectedSlocs when groupedSheets.sheetList updates
  useEffect(() => {
    if (groupedSheets.sheetList.length > 0) {
      setSelectedSlocs(prev => {
        // Keep valid existing selections
        const valid = prev.filter(s => groupedSheets.sheetList.includes(s));
        return valid.length > 0 ? valid : groupedSheets.sheetList;
      });
    } else {
      setSelectedSlocs([]);
    }
  }, [groupedSheets.sheetList]);

  // Toggle selection for a single SLOC
  const toggleSlocSelection = (slocCode: string) => {
    setSelectedSlocs(prev =>
      prev.includes(slocCode) ? prev.filter(s => s !== slocCode) : [...prev, slocCode]
    );
  };

  // Select all SLOCs
  const handleSelectAllSlocs = () => {
    setSelectedSlocs([...groupedSheets.sheetList]);
  };

  // Deselect all SLOCs
  const handleDeselectAllSlocs = () => {
    setSelectedSlocs([]);
  };

  // Total rows count for currently selected SLOCs
  const selectedRowsCount = useMemo(() => {
    let total = 0;
    selectedSlocs.forEach(s => {
      total += groupedSheets.sheetMap.get(s)?.length || 0;
    });
    return total;
  }, [selectedSlocs, groupedSheets.sheetMap]);

  // Rows currently visible in preview
  const previewRows = useMemo(() => {
    let source: ParsedRow[] = [];
    if (selectedPreviewSheet === 'ALL') {
      source = processedRows;
    } else {
      source = groupedSheets.sheetMap.get(selectedPreviewSheet) || [];
    }

    if (!searchQuery.trim()) return source;

    const query = searchQuery.toLowerCase().trim();
    return source.filter(row => {
      return Object.values(row).some(val => 
        String(val ?? '').toLowerCase().includes(query)
      );
    });
  }, [processedRows, groupedSheets, selectedPreviewSheet, searchQuery]);

  // Paginated preview rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return previewRows.slice(start, start + pageSize);
  }, [previewRows, currentPage, pageSize]);

  const totalPages = Math.ceil(previewRows.length / pageSize) || 1;

  // Format file name for all SLOC: [NamaFileAsli]_BY_SLOC_[yymmdd].xlsx
  const generateExportFileName = (): string => {
    const rawBaseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'DATA_EXPORT';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yymmdd = `${yy}${mm}${dd}`;

    return `${rawBaseName}_BY_SLOC_${yymmdd}.xlsx`;
  };

  // Format file name for single SLOC: [NamaFileAsli]_[SLOC]_[yymmdd].xlsx
  const generateSingleExportFileName = (targetSloc: string): string => {
    const rawBaseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'DATA_EXPORT';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yymmdd = `${yy}${mm}${dd}`;
    const cleanSloc = sanitizeSheetName(targetSloc || 'SLOC', maxSheetNameLength);

    return `${rawBaseName}_${cleanSloc}_${yymmdd}.xlsx`;
  };

  // Format file name for custom selected SLOCs: [NamaFileAsli]_[N]SLOC_[yymmdd].xlsx
  const generateCustomExportFileName = (chosenSlocs: string[]): string => {
    const rawBaseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'DATA_EXPORT';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yymmdd = `${yy}${mm}${dd}`;

    if (chosenSlocs.length === 1) {
      const cleanSloc = sanitizeSheetName(chosenSlocs[0], maxSheetNameLength);
      return `${rawBaseName}_${cleanSloc}_${yymmdd}.xlsx`;
    }
    if (chosenSlocs.length <= 3) {
      const slocsJoined = chosenSlocs.map(s => sanitizeSheetName(s, maxSheetNameLength)).join('_');
      return `${rawBaseName}_SLOC_${slocsJoined}_${yymmdd}.xlsx`;
    }
    return `${rawBaseName}_${chosenSlocs.length}SLOC_${yymmdd}.xlsx`;
  };

  // Helper to calculate column widths automatically
  const calculateAutoColWidths = (data: ParsedRow[], colHeaders: string[]) => {
    return colHeaders.map(col => {
      let maxLen = col.length;
      // sample up to 100 rows for performance
      const sample = data.slice(0, 100);
      sample.forEach(row => {
        const val = row[col];
        if (val !== undefined && val !== null) {
          const strLen = String(val).length;
          if (strLen > maxLen) maxLen = strLen;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
  };

  // Generate and Download Excel for All SLOCs
  const handleExportExcel = () => {
    if (processedRows.length === 0 || !slocColumn) {
      alert('Tidak ada data atau kolom SLOC belum dipilih.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet pertama: ALL DATA
      if (includeAllDataSheet) {
        const cleanAllSheetName = sanitizeSheetName(allDataSheetName || 'DATA', maxSheetNameLength);
        const wsAll = XLSX.utils.json_to_sheet(processedRows, { header: effectiveHeaders });
        wsAll['!cols'] = calculateAutoColWidths(processedRows, effectiveHeaders);
        XLSX.utils.book_append_sheet(wb, wsAll, cleanAllSheetName);
      }

      // 2. Tambahkan sheet-sheet per SLOC (masing-masing 4 karakter)
      groupedSheets.sheetList.forEach(sheetName => {
        const targetSheetName = sheetName === sanitizeSheetName(allDataSheetName || 'DATA', maxSheetNameLength) 
          ? `${sheetName}_S`.substring(0, maxSheetNameLength) 
          : sheetName;

        const rowsForSheet = groupedSheets.sheetMap.get(sheetName) || [];
        const wsSloc = XLSX.utils.json_to_sheet(rowsForSheet, { header: effectiveHeaders });
        wsSloc['!cols'] = calculateAutoColWidths(rowsForSheet, effectiveHeaders);
        XLSX.utils.book_append_sheet(wb, wsSloc, targetSheetName);
      });

      const outputFileName = generateExportFileName();
      XLSX.writeFile(wb, outputFileName);

      playBroadcastSound('announcement');
      setExportSuccessMessage(`File "${outputFileName}" berhasil dibuat dengan ${groupedSheets.sheetList.length + (includeAllDataSheet ? 1 : 0)} sheet! (Kolom Source terisi yyyy/mm dari Expired Date)`);
    } catch (err: any) {
      alert(`Gagal membuat file Excel: ${err.message || 'Unknown error'}`);
    }
  };

  // Generate and Download Excel for a Single Selected SLOC (Only 1 sheet)
  const handleExportSingleSloc = (targetSloc?: string) => {
    const effectiveSloc = targetSloc || selectedDownloadSloc || (groupedSheets.sheetList.length > 0 ? groupedSheets.sheetList[0] : '');

    if (!effectiveSloc) {
      alert('Silakan pilih kode SLOC yang ingin di-download terlebih dahulu.');
      return;
    }

    const rowsForSheet = groupedSheets.sheetMap.get(effectiveSloc) || [];
    if (rowsForSheet.length === 0) {
      alert(`Tidak ada data untuk SLOC "${effectiveSloc}".`);
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const cleanSheetName = sanitizeSheetName(effectiveSloc, maxSheetNameLength);
      const wsSloc = XLSX.utils.json_to_sheet(rowsForSheet, { header: effectiveHeaders });
      wsSloc['!cols'] = calculateAutoColWidths(rowsForSheet, effectiveHeaders);
      
      XLSX.utils.book_append_sheet(wb, wsSloc, cleanSheetName);

      const outputFileName = generateSingleExportFileName(cleanSheetName);
      XLSX.writeFile(wb, outputFileName);

      playBroadcastSound('announcement');
      setExportSuccessMessage(`File "${outputFileName}" berhasil diunduh (1 Sheet: ${cleanSheetName}, ${rowsForSheet.length} baris)! (Kolom Source terisi yyyy/mm dari Expired Date)`);
    } catch (err: any) {
      alert(`Gagal membuat file Excel SLOC ${effectiveSloc}: ${err.message || 'Unknown error'}`);
    }
  };

  // Generate and Download Excel for User-Selected SLOCs (Can be 1 or more SLOCs)
  const handleExportCustomSlocs = () => {
    if (selectedSlocs.length === 0) {
      alert('Silakan pilih minimal 1 kode SLOC yang ingin di-download.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const sortedSelectedSlocs = [...selectedSlocs].sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true })
      );

      // 1. Optional Sheet ALL DATA: only rows belonging to selected SLOCs
      if (includeAllDataSheet && sortedSelectedSlocs.length > 1) {
        const cleanAllSheetName = sanitizeSheetName(allDataSheetName || 'DATA', maxSheetNameLength);
        const filteredRows = processedRows.filter(row => {
          const rawVal = row[slocColumn];
          const rowSloc = (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')
            ? sanitizeSheetName(unassignedSlocName || 'NOSL', maxSheetNameLength)
            : sanitizeSheetName(String(rawVal).trim(), maxSheetNameLength);
          return sortedSelectedSlocs.includes(rowSloc);
        });

        if (filteredRows.length > 0) {
          const wsAll = XLSX.utils.json_to_sheet(filteredRows, { header: effectiveHeaders });
          wsAll['!cols'] = calculateAutoColWidths(filteredRows, effectiveHeaders);
          XLSX.utils.book_append_sheet(wb, wsAll, cleanAllSheetName);
        }
      }

      // 2. Add individual sheet for each selected SLOC
      let totalRowsExported = 0;
      sortedSelectedSlocs.forEach(sheetName => {
        const targetSheetName = sheetName === sanitizeSheetName(allDataSheetName || 'DATA', maxSheetNameLength) 
          ? `${sheetName}_S`.substring(0, maxSheetNameLength) 
          : sheetName;

        const rowsForSheet = groupedSheets.sheetMap.get(sheetName) || [];
        totalRowsExported += rowsForSheet.length;
        const wsSloc = XLSX.utils.json_to_sheet(rowsForSheet, { header: effectiveHeaders });
        wsSloc['!cols'] = calculateAutoColWidths(rowsForSheet, effectiveHeaders);
        XLSX.utils.book_append_sheet(wb, wsSloc, targetSheetName);
      });

      const outputFileName = generateCustomExportFileName(sortedSelectedSlocs);
      XLSX.writeFile(wb, outputFileName);

      playBroadcastSound('announcement');
      setExportSuccessMessage(
        `File "${outputFileName}" berhasil diunduh (${sortedSelectedSlocs.length} sheet SLOC${includeAllDataSheet && sortedSelectedSlocs.length > 1 ? ' + 1 sheet DATA' : ''}, total ${totalRowsExported} baris)! (Kolom Source terisi yyyy/mm dari Expired Date)`
      );
    } catch (err: any) {
      alert(`Gagal membuat file Excel SLOC terpilih: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-2xs shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                  Sheet Spliter
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
                  Generator SLOC
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Source: yyyy/mm ED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload file Excel, otomatis pecah baris data menjadi multi-sheet per kode SLOC (maks 4 karakter), dan isi kolom <strong>Source</strong> dengan format <strong>yyyy/mm</strong> dari <strong>Expired Date</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {allRows.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Contoh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* UPLOAD & CONFIGURATION SECTION */}
      {allRows.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
              : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs">
              <Upload size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Klik atau Seret File Excel ke Sini
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. Sistem otomatis mendeteksi kolom SLOC dan mengisi kolom <strong>Source</strong> dengan nilai <strong>yyyy/mm</strong> dari kolom <strong>Expired Date</strong>.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs transition">
              <Upload size={14} />
              <span>Pilih File dari Komputer</span>
            </div>
          </div>
        </div>
      ) : (
        /* FILE LOADED & CONFIGURATION PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* FILE INFO & SLOC COLUMN SELECTOR */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs lg:col-span-1 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck2 size={16} className="text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Informasi File & Pengaturan
                </h2>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                Terbaca
              </span>
            </div>

            {/* File details card */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-medium">Nama File:</span>
                <span className="text-slate-800 font-bold text-right truncate max-w-[180px]" title={fileName}>
                  {fileName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Ukuran:</span>
                <span className="text-slate-700 font-semibold">{(fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Baris:</span>
                <span className="text-emerald-700 font-bold">{processedRows.length} Baris</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Kolom:</span>
                <span className="text-slate-700 font-semibold">{effectiveHeaders.length} Kolom</span>
              </div>
            </div>

            {/* Column SLOC selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Kolom Referensi SLOC</span>
                <span className="text-[10px] font-normal text-emerald-600 flex items-center gap-1">
                  <Check size={11} /> Auto-detect
                </span>
              </label>
              <select
                value={slocColumn}
                onChange={(e) => setSlocColumn(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
              >
                {headers.map(h => (
                  <option key={h} value={h}>
                    {h} {h.toLowerCase().includes('sloc') ? '★ (Terdeteksi SLOC)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Pilih kolom pemecah sheet (Storage Location).
              </p>
            </div>

            {/* SOURCE & EXPIRED DATE TRANSFORMATION CARD */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-900">
                    Otomatis Isi Kolom "Source"
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoFormatSourceFromEd}
                  onChange={(e) => setAutoFormatSourceFromEd(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                  title="Aktifkan penggantian isi kolom Source dengan yyyy/mm dari Expired Date"
                />
              </div>

              <p className="text-[10px] text-indigo-800/90 leading-tight">
                Mengambil angka <strong>yyyy/mm</strong> dari kolom Expired Date lalu menuliskannya ke kolom <strong>Source</strong> pada hasil download Excel.
              </p>

              {autoFormatSourceFromEd && (
                <div className="space-y-2 pt-1 border-t border-indigo-200/60">
                  <div>
                    <label className="text-[11px] font-semibold text-indigo-950 flex items-center justify-between mb-1">
                      <span>Kolom Expired Date</span>
                      {expiredDateColumn && (
                        <span className="text-[9px] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-medium">
                          Terdeteksi
                        </span>
                      )}
                    </label>
                    <select
                      value={expiredDateColumn}
                      onChange={(e) => setExpiredDateColumn(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="">-- Pilih Kolom Expired Date --</option>
                      {headers.map(h => {
                        const isEd = h.toLowerCase().includes('exp') || h.toLowerCase().includes('ed') || h.toLowerCase().includes('kadaluarsa');
                        return (
                          <option key={h} value={h}>
                            {h} {isEd ? '★ (Terdeteksi ED)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-indigo-950 block mb-1">
                      Target Kolom Output (Default: Source)
                    </label>
                    <input
                      type="text"
                      value={sourceColumn}
                      onChange={(e) => setSourceColumn(e.target.value)}
                      placeholder="Source"
                      className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Options */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              {/* DOWNLOAD MODE SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilihan Mode Download:
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDownloadMode('all')}
                    className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      downloadMode === 'all'
                        ? 'bg-white text-emerald-800 shadow-2xs border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={13} className={downloadMode === 'all' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="truncate">Semua SLOC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDownloadMode('custom');
                      if (selectedSlocs.length === 0 && groupedSheets.sheetList.length > 0) {
                        setSelectedSlocs([...groupedSheets.sheetList]);
                      }
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      downloadMode === 'custom'
                        ? 'bg-white text-indigo-800 shadow-2xs border border-indigo-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckSquare size={13} className={downloadMode === 'custom' ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className="truncate">Pilih ({selectedSlocs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDownloadMode('single');
                      if (!selectedDownloadSloc && groupedSheets.sheetList.length > 0) {
                        setSelectedDownloadSloc(groupedSheets.sheetList[0]);
                      }
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      downloadMode === 'single'
                        ? 'bg-white text-blue-800 shadow-2xs border border-blue-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet size={13} className={downloadMode === 'single' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="truncate">1 SLOC</span>
                  </button>
                </div>
              </div>

              {/* OPTIONS BASED ON SELECTED MODE */}
              {downloadMode === 'all' && (
                <div className="space-y-2.5">
                  {/* Option A Toggle: Include All Data sheet */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-800">Sheet Pertama: ALL DATA</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Sertakan 1 sheet data lengkap sebelum sheet per SLOC.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeAllDataSheet}
                      onChange={(e) => setIncludeAllDataSheet(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Unassigned Sloc name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Sheet Tanpa SLOC
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={unassignedSlocName}
                        onChange={(e) => setUnassignedSlocName(e.target.value.toUpperCase().slice(0, 4))}
                        className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 uppercase"
                        placeholder="NOSL"
                      />
                      <span className="text-[9px] text-slate-400">Default: NOSL (4 char)</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nama Sheet Lengkap
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={allDataSheetName}
                        onChange={(e) => setAllDataSheetName(e.target.value.toUpperCase().slice(0, 4))}
                        className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 text-slate-800 uppercase"
                        placeholder="DATA"
                      />
                      <span className="text-[9px] text-slate-400">Sheet ALL (4 char)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MULTI-SLOC CUSTOM SELECTION */}
              {downloadMode === 'custom' && (
                <div className="space-y-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-indigo-600" />
                      <span>Pilih SLOC untuk Di-download:</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {selectedSlocs.length} / {groupedSheets.sheetList.length} Dipilih
                    </span>
                  </div>

                  {/* Quick action buttons: Pilih Semua / Batal Semua */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllSlocs}
                        className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCheck size={12} />
                        <span>Pilih Semua</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllSlocs}
                        className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <XCircle size={12} />
                        <span>Batal Semua</span>
                      </button>
                    </div>

                    {groupedSheets.sheetList.length > 4 && (
                      <input
                        type="text"
                        value={slocFilterText}
                        onChange={(e) => setSlocFilterText(e.target.value)}
                        placeholder="Cari SLOC..."
                        className="text-[11px] px-2 py-1 bg-white border border-indigo-200 rounded-lg w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                      />
                    )}
                  </div>

                  {/* Scrollable list of SLOCs */}
                  <div className="max-h-44 overflow-y-auto pr-1 space-y-1 bg-white rounded-lg border border-indigo-200/70 p-1.5">
                    {groupedSheets.sheetList
                      .filter(code => !slocFilterText || code.toLowerCase().includes(slocFilterText.toLowerCase()))
                      .map(code => {
                        const isChecked = selectedSlocs.includes(code);
                        const count = groupedSheets.sheetMap.get(code)?.length || 0;
                        return (
                          <label
                            key={code}
                            className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition text-xs select-none ${
                              isChecked 
                                ? 'bg-indigo-50/90 text-indigo-950 font-bold border border-indigo-200/60' 
                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSlocSelection(code)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="font-mono">{code}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                              {count} baris
                            </span>
                          </label>
                        );
                      })}
                  </div>

                  {/* Include ALL DATA sheet toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-indigo-200/80">
                    <div className="pr-1">
                      <div className="text-[11px] font-bold text-slate-800">Sertakan Sheet ALL DATA</div>
                      <div className="text-[9px] text-slate-500">
                        Sheet gabungan hanya untuk SLOC yang dipilih.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeAllDataSheet}
                      onChange={(e) => setIncludeAllDataSheet(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Selected summary */}
                  <div className="text-[11px] text-indigo-950 font-semibold flex items-center justify-between pt-0.5">
                    <span>Total Terpilih:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded">
                      {selectedRowsCount} baris ({selectedSlocs.length} SLOC)
                    </span>
                  </div>
                </div>
              )}

              {/* SINGLE SLOC DOWNLOAD CONFIGURATION */}
              {downloadMode === 'single' && (
                <div className="space-y-2 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
                  <label className="text-xs font-bold text-blue-900 block">
                    Pilih SLOC yang Ingin Di-download:
                  </label>
                  <select
                    value={selectedDownloadSloc || (groupedSheets.sheetList[0] || '')}
                    onChange={(e) => {
                      setSelectedDownloadSloc(e.target.value);
                      setSelectedPreviewSheet(e.target.value);
                    }}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  >
                    {groupedSheets.sheetList.map(code => {
                      const count = groupedSheets.sheetMap.get(code)?.length || 0;
                      return (
                        <option key={code} value={code}>
                          SLOC: {code} ({count} baris data)
                        </option>
                      );
                    })}
                  </select>
                  <div className="text-[10px] text-blue-700/90 leading-tight">
                    File Excel hasil unduhan <strong>hanya memiliki 1 sheet</strong> dengan nama sesuai kode SLOC yang dipilih (maks 4 karakter).
                  </div>
                </div>
              )}
            </div>

            {/* DOWNLOAD BUTTON */}
            <div className="pt-2">
              {downloadMode === 'all' && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download Semua SLOC ({groupedSheets.sheetList.length + (includeAllDataSheet ? 1 : 0)} Sheet)</span>
                </button>
              )}

              {downloadMode === 'custom' && (
                <button
                  type="button"
                  disabled={selectedSlocs.length === 0}
                  onClick={handleExportCustomSlocs}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
                >
                  <Download size={15} />
                  <span>
                    {selectedSlocs.length === 0 
                      ? 'Pilih Minimal 1 SLOC' 
                      : `Download ${selectedSlocs.length} SLOC Terpilih (${selectedSlocs.length + (includeAllDataSheet && selectedSlocs.length > 1 ? 1 : 0)} Sheet)`
                    }
                  </span>
                </button>
              )}

              {downloadMode === 'single' && (
                <button
                  type="button"
                  onClick={() => handleExportSingleSloc(selectedDownloadSloc || groupedSheets.sheetList[0])}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download Excel SLOC {selectedDownloadSloc || groupedSheets.sheetList[0]} (1 Sheet)</span>
                </button>
              )}

              <div 
                className="mt-1.5 text-[10px] text-center text-slate-500 font-mono truncate" 
                title={
                  downloadMode === 'all' 
                    ? generateExportFileName() 
                    : downloadMode === 'custom'
                      ? generateCustomExportFileName(selectedSlocs)
                      : generateSingleExportFileName(selectedDownloadSloc || groupedSheets.sheetList[0])
                }
              >
                Output: {
                  downloadMode === 'all' 
                    ? generateExportFileName() 
                    : downloadMode === 'custom'
                      ? generateCustomExportFileName(selectedSlocs)
                      : generateSingleExportFileName(selectedDownloadSloc || groupedSheets.sheetList[0])
                }
              </div>
            </div>

            {/* Success message banner */}
            {exportSuccessMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 animate-fade-in">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{exportSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* SLOC BREAKDOWN & PREVIEW DATA */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs lg:col-span-2 space-y-3.5 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Daftar Sheet SLOC yang Dihasilkan
                </h2>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  {groupedSheets.sheetList.length} Kode SLOC
                </span>
              </div>

              {/* Quick search input */}
              <div className="relative w-full sm:w-48">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari di preview..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>
            </div>

            {/* SLOC TABS / CHIPS */}
            <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 max-h-28 overflow-y-auto pr-1">
              {/* Tab ALL DATA */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPreviewSheet('ALL');
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedPreviewSheet === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <span>SEMUA DATA ({allDataSheetName || 'DATA'})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  selectedPreviewSheet === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {processedRows.length}
                </span>
              </button>

              {/* SLOC individual chips */}
              {groupedSheets.sheetList.map(sheetCode => {
                const count = groupedSheets.sheetMap.get(sheetCode)?.length || 0;
                const isSelected = selectedPreviewSheet === sheetCode;
                const isCheckedForDownload = selectedSlocs.includes(sheetCode);
                const isNoSloc = sheetCode === (unassignedSlocName || 'NOSL');

                return (
                  <div
                    key={sheetCode}
                    className={`inline-flex items-center rounded-xl overflow-hidden border transition shadow-2xs ${
                      isSelected
                        ? isNoSloc 
                          ? 'border-amber-600 bg-amber-600 text-white' 
                          : 'border-emerald-600 bg-emerald-600 text-white'
                        : isNoSloc
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : isCheckedForDownload
                            ? 'border-indigo-200 bg-white text-slate-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewSheet(sheetCode);
                        setSelectedDownloadSloc(sheetCode);
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                    >
                      <span>{sheetCode}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected 
                          ? 'bg-white/25 text-white' 
                          : isNoSloc ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count}
                      </span>
                    </button>

                    {/* Quick checkbox button on chip */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSlocSelection(sheetCode);
                      }}
                      title={isCheckedForDownload ? `Keluarkan ${sheetCode} dari pilihan download` : `Masukkan ${sheetCode} ke pilihan download`}
                      className={`px-1.5 py-1.5 text-xs transition cursor-pointer flex items-center justify-center border-l ${
                        isSelected
                          ? 'border-white/30 hover:bg-black/10 text-white'
                          : isCheckedForDownload
                            ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                            : 'bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200'
                      }`}
                    >
                      {isCheckedForDownload ? <Check size={11} className="stroke-[3]" /> : <Square size={11} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* PREVIEW TABLE CONTAINER */}
            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[260px] bg-slate-50/30">
              <div className="p-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-semibold flex-wrap">
                  <Table size={13} className="text-slate-500" />
                  <span>Preview Sheet: </span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedPreviewSheet === 'ALL' ? (allDataSheetName || 'DATA') : selectedPreviewSheet}
                  </span>
                  <span className="text-slate-400">({previewRows.length} baris data)</span>

                  {autoFormatSourceFromEd && expiredDateColumn && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[10px] border border-indigo-200">
                      <Calendar size={11} />
                      {sourceColumn || 'Source'}: yyyy/mm dari {expiredDateColumn}
                    </span>
                  )}
                </div>
                
                {/* QUICK DOWNLOAD BUTTON ON PREVIEW */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedPreviewSheet !== 'ALL' && (
                    <label 
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition select-none ${
                        selectedSlocs.includes(selectedPreviewSheet)
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                      title="Sertakan SLOC ini dalam download multi-SLOC"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSlocs.includes(selectedPreviewSheet)}
                        onChange={() => toggleSlocSelection(selectedPreviewSheet)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Pilih untuk Download</span>
                    </label>
                  )}

                  {selectedPreviewSheet !== 'ALL' ? (
                    <button
                      type="button"
                      onClick={() => handleExportSingleSloc(selectedPreviewSheet)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                      title={`Download hanya SLOC ${selectedPreviewSheet} (1 sheet)`}
                    >
                      <Download size={12} />
                      <span>Download SLOC {selectedPreviewSheet} (1 Sheet)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                      title="Download seluruh SLOC dalam 1 file"
                    >
                      <Download size={12} />
                      <span>Download Semua ({groupedSheets.sheetList.length} SLOC)</span>
                    </button>
                  )}

                  {selectedSlocs.length > 0 && selectedSlocs.length < groupedSheets.sheetList.length && (
                    <button
                      type="button"
                      onClick={handleExportCustomSlocs}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                      title={`Download ${selectedSlocs.length} SLOC yang telah Anda pilih`}
                    >
                      <CheckSquare size={12} />
                      <span>Download {selectedSlocs.length} SLOC Terpilih</span>
                    </button>
                  )}

                  <div className="text-[11px] text-slate-500 pl-1 border-l border-slate-200">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto flex-1 max-h-[300px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center text-slate-400">#</th>
                      {effectiveHeaders.map(h => {
                        const isSloc = h === slocColumn;
                        const isSource = autoFormatSourceFromEd && (h === sourceColumn || h.toLowerCase() === 'source');
                        const isEd = h === expiredDateColumn;

                        return (
                          <th 
                            key={h} 
                            className={`py-2 px-3 whitespace-nowrap ${
                              isSloc 
                                ? 'bg-emerald-100/70 text-emerald-900 font-black' 
                                : isSource
                                  ? 'bg-indigo-100/80 text-indigo-900 font-black'
                                  : isEd
                                    ? 'bg-amber-100/60 text-amber-900 font-bold'
                                    : ''
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <span>{h}</span>
                              {isSloc && <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded font-bold">SLOC</span>}
                              {isSource && <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1 rounded font-bold">yyyy/mm</span>}
                              {isEd && <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded font-bold">ED</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 bg-white">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={effectiveHeaders.length + 1} className="py-8 text-center text-slate-400">
                          Tidak ada baris data yang cocok dengan filter atau pencarian.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, idx) => {
                        const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition">
                            <td className="py-1.5 px-3 text-center text-slate-400 text-[11px]">
                              {globalIndex}
                            </td>
                            {effectiveHeaders.map(h => {
                              const isSloc = h === slocColumn;
                              const isSource = autoFormatSourceFromEd && (h === sourceColumn || h.toLowerCase() === 'source');
                              const isEd = h === expiredDateColumn;

                              return (
                                <td 
                                  key={h} 
                                  className={`py-1.5 px-3 whitespace-nowrap text-slate-700 ${
                                    isSloc 
                                      ? 'bg-emerald-50/40 font-bold text-emerald-800' 
                                      : isSource
                                        ? 'bg-indigo-50/50 font-bold text-indigo-800 font-mono'
                                        : isEd
                                          ? 'bg-amber-50/30 text-amber-900'
                                          : ''
                                  }`}
                                >
                                  {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '' ? (
                                    String(row[h])
                                  ) : (
                                    <span className="text-slate-300 italic text-[11px]">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="p-2 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 cursor-pointer"
                  >
                    Sebelumnya
                  </button>

                  <span className="text-slate-500 font-medium">
                    Halaman {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 cursor-pointer"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PEDOMAN / CARA KERJA SISTEM */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Info size={14} className="text-blue-600" />
          <span>Aturan & Alur Pemecahan Sheet (Sheet Spliter by SLOC)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">1. Deteksi Cerdas Kolom SLOC</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sistem otomatis mencari header bernama "sloc", "storage location", atau "gudang". Anda juga bisa memilih kolom secara manual melalui dropdown.
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">2. Aturan Nama Sheet 4 Karakter</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sesuai standar SLOC SAP (misal 1001, 8A12), nama sheet dipotong maksimal 4 karakter dan dibersihkan dari simbol terlarang Excel. Baris tanpa SLOC dikelompokkan ke sheet "NOSL".
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">3. Format Source: yyyy/mm dari ED</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pada file Excel hasil download, isi kolom <strong>Source</strong> otomatis diganti dengan format tahun/bulan (<strong>yyyy/mm</strong>) yang diekstrak dari kolom <strong>Expired Date</strong>.
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">4. Pilihan Download Fleksibel</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Semua SLOC:</strong> Seluruh sheet SLOC dalam 1 file.<br />
              <strong>Pilih SLOC (Multi):</strong> Checklist SLOC mana saja yang ingin diunduh (bisa 1, 2, atau lebih).<br />
              <strong>1 SLOC:</strong> Ekspor cepat khusus 1 sheet SLOC pilihan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
