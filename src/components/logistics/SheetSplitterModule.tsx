import React, { useState, useMemo, useRef } from 'react';
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
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { playBroadcastSound } from '../../utils/broadcastSound';

interface ParsedRow {
  [key: string]: any;
}

export function SheetSplitterModule() {
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<ParsedRow[]>([]);
  const [slocColumn, setSlocColumn] = useState<string>('');
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
  const [downloadMode, setDownloadMode] = useState<'all' | 'single'>('all');
  const [selectedDownloadSloc, setSelectedDownloadSloc] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect SLOC column from list of headers
  const autoDetectSlocColumn = (columnNames: string[]): string => {
    if (!columnNames || columnNames.length === 0) return '';
    // Priority 1: Exact matches for "sloc", "storage_location", "storage location"
    const exactMatch = columnNames.find(c => {
      const lower = c.trim().toLowerCase();
      return lower === 'sloc' || lower === 'storage location' || lower === 'storage_location' || lower === 'storageloc';
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
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

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

      setFileName(file.name);
      setFileSize(file.size);
      setHeaders(detectedHeaders);
      setAllRows(jsonData);
      setSlocColumn(detectedSloc);
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
    const sampleHeaders = ['Material', 'Deskripsi_Barang', 'SLOC', 'Batch', 'Qty_Pcs', 'UoM', 'Status'];
    const sampleRows: ParsedRow[] = [
      { Material: 'FG-100201', Deskripsi_Barang: 'Larutan Jeruk Nipis 200ml', SLOC: '1001', Batch: 'B260901', Qty_Pcs: 120, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-100202', Deskripsi_Barang: 'Larutan Jambu 200ml', SLOC: '1001', Batch: 'B260902', Qty_Pcs: 85, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-200105', Deskripsi_Barang: 'Kino Candy Kopi Susu', SLOC: '1002', Batch: 'B260903', Qty_Pcs: 340, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-200108', Deskripsi_Barang: 'Kino Candy Mint Fresh', SLOC: '1002', Batch: 'B260904', Qty_Pcs: 210, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-300401', Deskripsi_Barang: 'Ellips Hair Vitamin Morrocan', SLOC: '8A12', Batch: 'B260905', Qty_Pcs: 450, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-300402', Deskripsi_Barang: 'Ellips Hair Vitamin Smooth', SLOC: '8A12', Batch: 'B260906', Qty_Pcs: 310, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-400901', Deskripsi_Barang: 'Cap Kaki Tiga Lychee Can', SLOC: '1200', Batch: 'B260907', Qty_Pcs: 95, UoM: 'PCS', Status: 'Quarantine' },
      { Material: 'FG-400902', Deskripsi_Barang: 'Cap Kaki Tiga Original Can', SLOC: '1200', Batch: 'B260908', Qty_Pcs: 140, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-500101', Deskripsi_Barang: 'Ovale Facial Mask Bengkoang', SLOC: '1800', Batch: 'B260909', Qty_Pcs: 75, UoM: 'PCS', Status: 'Available' },
      { Material: 'FG-600201', Deskripsi_Barang: 'Sleek Baby Bottle Cleanser', SLOC: '', Batch: 'B260910', Qty_Pcs: 60, UoM: 'PCS', Status: 'Unassigned' },
      { Material: 'FG-600202', Deskripsi_Barang: 'Sleek Baby Laundry Liquid', SLOC: '', Batch: 'B260911', Qty_Pcs: 45, UoM: 'PCS', Status: 'Unassigned' },
      { Material: 'FG-700101', Deskripsi_Barang: 'Ristra Peeling Treatment', SLOC: '1001', Batch: 'B260912', Qty_Pcs: 190, UoM: 'PCS', Status: 'Available' }
    ];

    setFileName('Sample_Stock_Logistik.xlsx');
    setFileSize(14500);
    setHeaders(sampleHeaders);
    setAllRows(sampleRows);
    setSlocColumn('SLOC');
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
    setSelectedPreviewSheet('ALL');
    setSearchQuery('');
    setExportSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Group rows by mapped sheet name (strict 4 characters)
  const groupedSheets = useMemo(() => {
    if (!slocColumn || allRows.length === 0) {
      return { sheetMap: new Map<string, ParsedRow[]>(), sheetList: [] };
    }

    const map = new Map<string, ParsedRow[]>();
    const usedNames = new Set<string>();

    allRows.forEach(row => {
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
  }, [allRows, slocColumn, unassignedSlocName, maxSheetNameLength]);

  // Rows currently visible in preview
  const previewRows = useMemo(() => {
    let source: ParsedRow[] = [];
    if (selectedPreviewSheet === 'ALL') {
      source = allRows;
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
  }, [allRows, groupedSheets, selectedPreviewSheet, searchQuery]);

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
    if (allRows.length === 0 || !slocColumn) {
      alert('Tidak ada data atau kolom SLOC belum dipilih.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1. Pilihan A: Sheet pertama adalah "ALL DATA" (atau nama yang dikonfigurasi <= 4 karakter, e.g. DATA)
      if (includeAllDataSheet) {
        const cleanAllSheetName = sanitizeSheetName(allDataSheetName || 'DATA', maxSheetNameLength);
        const wsAll = XLSX.utils.json_to_sheet(allRows);
        wsAll['!cols'] = calculateAutoColWidths(allRows, headers);
        XLSX.utils.book_append_sheet(wb, wsAll, cleanAllSheetName);
      }

      // 2. Tambahkan sheet-sheet per SLOC (masing-masing 4 karakter)
      groupedSheets.sheetList.forEach(sheetName => {
        // Jangan duplikat jika sheet name sama dengan allDataSheetName
        const targetSheetName = sheetName === sanitizeSheetName(allDataSheetName || 'DATA', maxSheetNameLength) 
          ? `${sheetName}_S`.substring(0, maxSheetNameLength) 
          : sheetName;

        const rowsForSheet = groupedSheets.sheetMap.get(sheetName) || [];
        const wsSloc = XLSX.utils.json_to_sheet(rowsForSheet);
        wsSloc['!cols'] = calculateAutoColWidths(rowsForSheet, headers);
        XLSX.utils.book_append_sheet(wb, wsSloc, targetSheetName);
      });

      const outputFileName = generateExportFileName();
      XLSX.writeFile(wb, outputFileName);

      playBroadcastSound('announcement');
      setExportSuccessMessage(`File "${outputFileName}" berhasil dibuat dengan ${groupedSheets.sheetList.length + (includeAllDataSheet ? 1 : 0)} sheet!`);
    } catch (err: any) {
      alert(`Gagal membuat file Excel: ${err.message || 'Unknown error'}`);
    }
  };

  // Generate and Download Excel for a Single Selected SLOC (Only 1 sheet, filename matching the SLOC)
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
      const wsSloc = XLSX.utils.json_to_sheet(rowsForSheet);
      wsSloc['!cols'] = calculateAutoColWidths(rowsForSheet, headers);
      
      // HANYA 1 SHEET yang dibuat sesuai SLOC yang dipilih
      XLSX.utils.book_append_sheet(wb, wsSloc, cleanSheetName);

      const outputFileName = generateSingleExportFileName(cleanSheetName);
      XLSX.writeFile(wb, outputFileName);

      playBroadcastSound('announcement');
      setExportSuccessMessage(`File "${outputFileName}" berhasil diunduh (1 Sheet: ${cleanSheetName}, ${rowsForSheet.length} baris)!`);
    } catch (err: any) {
      alert(`Gagal membuat file Excel SLOC ${effectiveSloc}: ${err.message || 'Unknown error'}`);
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                  Role: Bebas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload file Excel, otomatis pecah baris data menjadi multi-sheet per kode SLOC (maks 4 karakter) dalam 1 file baru siap unduh.
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
              Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. Sistem akan otomatis mendeteksi kolom SLOC.
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
                <span className="text-emerald-700 font-bold">{allRows.length} Baris</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Kolom:</span>
                <span className="text-slate-700 font-semibold">{headers.length} Kolom</span>
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
                Pilih kolom yang berisi kode SLOC (Storage Location).
              </p>
            </div>

            {/* Configuration Options */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              {/* DOWNLOAD MODE SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilihan Mode Download:
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDownloadMode('all')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      downloadMode === 'all'
                        ? 'bg-white text-emerald-800 shadow-2xs border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers size={13} className={downloadMode === 'all' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Semua SLOC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadMode('single');
                      if (!selectedDownloadSloc && groupedSheets.sheetList.length > 0) {
                        setSelectedDownloadSloc(groupedSheets.sheetList[0]);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      downloadMode === 'single'
                        ? 'bg-white text-blue-800 shadow-2xs border border-blue-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet size={13} className={downloadMode === 'single' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>1 SLOC Saja</span>
                  </button>
                </div>
              </div>

              {/* OPTIONS BASED ON SELECTED MODE */}
              {downloadMode === 'all' ? (
                <div className="space-y-2.5">
                  {/* Option A Toggle: Include All Data sheet */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-800">Sheet Pertama: ALL DATA</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Sertakan 1 sheet data lengkap (Opsi A) sebelum sheet per SLOC.
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
              ) : (
                /* SINGLE SLOC DOWNLOAD CONFIGURATION */
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
              {downloadMode === 'all' ? (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download Semua SLOC ({groupedSheets.sheetList.length + (includeAllDataSheet ? 1 : 0)} Sheet)</span>
                </button>
              ) : (
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
                title={downloadMode === 'all' ? generateExportFileName() : generateSingleExportFileName(selectedDownloadSloc || groupedSheets.sheetList[0])}
              >
                Output: {downloadMode === 'all' ? generateExportFileName() : generateSingleExportFileName(selectedDownloadSloc || groupedSheets.sheetList[0])}
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
                  {allRows.length}
                </span>
              </button>

              {/* SLOC individual chips */}
              {groupedSheets.sheetList.map(sheetCode => {
                const count = groupedSheets.sheetMap.get(sheetCode)?.length || 0;
                const isSelected = selectedPreviewSheet === sheetCode;
                const isNoSloc = sheetCode === (unassignedSlocName || 'NOSL');

                return (
                  <button
                    key={sheetCode}
                    type="button"
                    onClick={() => {
                      setSelectedPreviewSheet(sheetCode);
                      setSelectedDownloadSloc(sheetCode);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? isNoSloc 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                          : 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : isNoSloc
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    <span>{sheetCode}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : isNoSloc ? 'bg-amber-200/80 text-amber-900' : 'bg-emerald-200/80 text-emerald-900'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* PREVIEW TABLE CONTAINER */}
            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[260px] bg-slate-50/30">
              <div className="p-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Table size={13} className="text-slate-500" />
                  <span>Preview Sheet: </span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedPreviewSheet === 'ALL' ? (allDataSheetName || 'DATA') : selectedPreviewSheet}
                  </span>
                  <span className="text-slate-400">({previewRows.length} baris data)</span>
                </div>
                
                {/* QUICK DOWNLOAD BUTTON ON PREVIEW */}
                <div className="flex items-center gap-2">
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
                      {headers.map(h => (
                        <th 
                          key={h} 
                          className={`py-2 px-3 whitespace-nowrap ${
                            h === slocColumn ? 'bg-emerald-100/70 text-emerald-900 font-black' : ''
                          }`}
                        >
                          {h}
                          {h === slocColumn && ' (SLOC)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 bg-white">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={headers.length + 1} className="py-8 text-center text-slate-400">
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
                            {headers.map(h => (
                              <td 
                                key={h} 
                                className={`py-1.5 px-3 whitespace-nowrap text-slate-700 ${
                                  h === slocColumn 
                                    ? 'bg-emerald-50/40 font-bold text-emerald-800' 
                                    : ''
                                }`}
                              >
                                {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '' ? (
                                  String(row[h])
                                ) : (
                                  <span className="text-slate-300 italic text-[11px]">-</span>
                                )}
                              </td>
                            ))}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">1. Deteksi Cerdas Kolom SLOC</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sistem otomatis mencari header bernama "sloc", "storage location", atau "gudang" (tidak sensitif huruf besar/kecil). Anda juga bisa memilih kolom secara manual melalui dropdown.
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">2. Aturan Nama Sheet 4 Karakter</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sesuai standar SLOC SAP (misal 1001, 8A12), nama sheet dipotong maksimal 4 karakter dan dibersihkan dari simbol terlarang Excel. Baris tanpa SLOC dikelompokkan ke sheet "NOSL".
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-0.5">3. Pilihan Download: Semua vs 1 SLOC</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Semua SLOC:</strong> Menghasilkan file multi-sheet <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono">[NamaFile]_BY_SLOC_[yymmdd].xlsx</code>.<br />
              <strong>1 SLOC Saja:</strong> Menghasilkan file 1 sheet bernama SLOC tersebut, dengan nama file <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono">[NamaFile]_[SLOC]_[yymmdd].xlsx</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
