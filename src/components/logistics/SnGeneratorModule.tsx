import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Barcode, 
  Copy, 
  Download, 
  Check, 
  RefreshCw, 
  Eraser, 
  FileSpreadsheet, 
  UploadCloud, 
  Search, 
  Info,
  Sparkles,
  Layers,
  ArrowDownToLine,
  FileDown
} from 'lucide-react';
import { generateSerialNumberList, generateSerialNumberFromRows, SnInboundItem } from '../../utils/logisticsCalculations';
import { useNotification } from '../../context/NotificationContext';

export function SnGeneratorModule() {
  const { showToast } = useNotification();
  const [inputText, setInputText] = useState("");
  const [generatedList, setGeneratedList] = useState<SnInboundItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedSnIndex, setCopiedSnIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template columns sesuai image
  const TEMPLATE_HEADERS = [
    'Bin Loc',
    'No SKU',
    'Nama Item',
    'Quantity',
    'Expired Date',
    'Batch',
    'Vendor Batch',
    'Destination Name'
  ];

  // 1. Fungsi Download Template Excel sesuai format di image
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Bin Loc': 'A01B02C1',
        'No SKU': '21104501',
        'Nama Item': 'KINO SAMANTHA HAIR OIL 50ML',
        'Quantity': 120,
        'Expired Date': '2026-12-31',
        'Batch': 'L911346N',
        'Vendor Batch': 'VB-2024-001',
        'Destination Name': 'GUDANG CIKEMBAR'
      },
      {
        'Bin Loc': 'A01B02C2',
        'No SKU': '21104502',
        'Nama Item': 'OLIVE OIL SOFT PACK 100ML',
        'Quantity': 80,
        'Expired Date': '2027-06-15',
        'Batch': 'K821105M',
        'Vendor Batch': 'VB-2024-002',
        'Destination Name': 'GUDANG TRANSIT'
      },
      {
        'Bin Loc': 'BIN-0901',
        'No SKU': '21104503',
        'Nama Item': 'PAPER TOWEL ABSORBENT 2PLY',
        'Quantity': 200,
        'Expired Date': '2028-01-20',
        'Batch': 'P901234X',
        'Vendor Batch': 'VB-2024-003',
        'Destination Name': 'DISTRIBUTION CENTER'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: TEMPLATE_HEADERS });
    
    // Lebar kolom rapi
    ws['!cols'] = [
      { wch: 15 }, // Bin Loc
      { wch: 15 }, // No SKU
      { wch: 35 }, // Nama Item
      { wch: 12 }, // Quantity
      { wch: 16 }, // Expired Date
      { wch: 15 }, // Batch
      { wch: 18 }, // Vendor Batch
      { wch: 25 }  // Destination Name
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Inbound SN');
    XLSX.writeFile(wb, 'Template_Inbound_Serial_Number.xlsx');
    showToast('Download Template', 'Template Excel Inbound SN berhasil diunduh', 'success');
  };

  // 2. Fungsi Load Sample Data ke Text Input
  const handleLoadSampleData = () => {
    const sampleText = [
      TEMPLATE_HEADERS.join('\t'),
      'A01B02C1\t21104501\tKINO SAMANTHA HAIR OIL 50ML\t120\t2026-12-31\tL911346N\tVB-2024-001\tGUDANG CIKEMBAR',
      'A01B02C2\t21104502\tOLIVE OIL SOFT PACK 100ML\t80\t2027-06-15\tK821105M\tVB-2024-002\tGUDANG TRANSIT',
      'BIN-0901\t21104503\tPAPER TOWEL ABSORBENT 2PLY\t200\t2028-01-20\tP901234X\tVB-2024-003\tDISTRIBUTION CENTER',
      'B02A01C4\t21104504\tCAP KAKI TIGA LARUTAN 200ML\t150\t2026-10-10\tL923411N\tVB-2024-004\tGUDANG CIKEMBAR'
    ].join('\n');
    setInputText(sampleText);
    showToast('Contoh Dimuat', 'Data sampel inbound berhasil dimasukkan ke form', 'info');
  };

  // 3. Fungsi Parse File Excel / CSV yang diunggah
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Baca sebagai 2D array baris dan kolom
        const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (sheetData.length === 0) {
          showToast('Error', 'File Excel kosong atau tidak terbaca', 'error');
          return;
        }

        // Cari header index
        let headerRowIdx = 0;
        let foundHeader = false;
        for (let i = 0; i < Math.min(sheetData.length, 5); i++) {
          const rowStr = sheetData[i].map(c => String(c).toLowerCase()).join(' ');
          if (rowStr.includes('bin loc') || rowStr.includes('sku') || rowStr.includes('nama item')) {
            headerRowIdx = i;
            foundHeader = true;
            break;
          }
        }

        const headers = foundHeader ? sheetData[headerRowIdx].map(h => String(h).trim().toLowerCase()) : [];
        const dataRows = sheetData.slice(foundHeader ? headerRowIdx + 1 : 0);

        const findCol = (aliases: string[], fallbackIdx: number) => {
          if (foundHeader) {
            const idx = headers.findIndex(h => aliases.some(a => h.includes(a)));
            return idx !== -1 ? idx : fallbackIdx;
          }
          return fallbackIdx;
        };

        const binIdx = findCol(['bin loc', 'bin', 'lokasi', 'location'], 0);
        const skuIdx = findCol(['no sku', 'sku', 'material', 'item code', 'kode item', 'kode barang'], 1);
        const nameIdx = findCol(['nama item', 'item name', 'nama barang', 'description', 'deskripsi'], 2);
        const qtyIdx = findCol(['quantity', 'qty', 'jumlah', 'pcs'], 3);
        const edIdx = findCol(['expired date', 'expired', 'ed', 'exp date', 'sled'], 4);
        const batchIdx = findCol(['batch', 'no batch', 'lot'], 5);
        const vendorBatchIdx = findCol(['vendor batch', 'vendor_batch', 'v batch', 'batch vendor'], 6);
        const destIdx = findCol(['destination name', 'destination', 'tujuan', 'nama tujuan', 'dest'], 7);

        const parsedItems: Partial<SnInboundItem>[] = [];
        const linesForText: string[] = [TEMPLATE_HEADERS.join('\t')];

        dataRows.forEach(row => {
          if (!row || row.every(c => !String(c).trim())) return;
          
          const binLoc = String(row[binIdx] ?? '').trim();
          const noSku = String(row[skuIdx] ?? '').trim();
          const namaItem = String(row[nameIdx] ?? '').trim();
          const quantity = row[qtyIdx] !== undefined ? String(row[qtyIdx]).trim() : '';
          
          let expiredDate = String(row[edIdx] ?? '').trim();
          // Jika format serial date dari Excel numeric (misal 45000)
          if (/^\d{5}$/.test(expiredDate)) {
            try {
              const dateObj = XLSX.SSF.parse_date_code(parseInt(expiredDate, 10));
              if (dateObj) {
                expiredDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
              }
            } catch (err) {
              // ignore
            }
          }

          const batch = String(row[batchIdx] ?? '').trim();
          const vendorBatch = String(row[vendorBatchIdx] ?? '').trim();
          const destinationName = String(row[destIdx] ?? '').trim();

          if (binLoc || noSku || namaItem || batch) {
            parsedItems.push({
              binLoc,
              noSku,
              namaItem,
              quantity,
              expiredDate,
              batch,
              vendorBatch,
              destinationName
            });

            linesForText.push([binLoc, noSku, namaItem, quantity, expiredDate, batch, vendorBatch, destinationName].join('\t'));
          }
        });

        if (parsedItems.length > 0) {
          setInputText(linesForText.join('\n'));
          const generated = generateSerialNumberFromRows(parsedItems);
          setGeneratedList(generated);
          showToast('Import Berhasil', `Berhasil memuat ${generated.length} data dan menghasilkan Serial Number unik!`, 'success');
        } else {
          showToast('Data Kosong', 'Tidak ada data valid yang ditemukan pada file Excel', 'warning');
        }

      } catch (err) {
        console.error(err);
        showToast('Error', 'Gagal memproses file Excel: ' + (err as Error).message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4. Generate Serial Number dari Text Input
  const handleGenerateSN = () => {
    if (!inputText.trim()) {
      setGeneratedList([]);
      showToast('Perhatian', 'Masukkan teks data inbound atau unggah file template Excel', 'info');
      return;
    }

    const results = generateSerialNumberList(inputText);
    if (results.length === 0) {
      showToast('Perhatian', 'Tidak ada baris data yang valid untuk di-generate', 'warning');
      return;
    }

    setGeneratedList(results);
    showToast('Sukses', `Berhasil menghasilkan ${results.length} Serial Number Unik Anti-Duplikat.`, 'success');
  };

  // 5. Bersihkan Input & Hasil
  const handleClear = () => {
    setInputText('');
    setGeneratedList([]);
    setSearchTerm('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Bersih', 'Area input dan hasil generator Serial Number telah dibersihkan', 'info');
  };

  // 6. Copy Tabel lengkap ke Clipboard (Format TSV siap paste ke Excel)
  const handleCopyTable = () => {
    if (generatedList.length === 0) return;
    const headerLine = ['No', 'Serial Number', ...TEMPLATE_HEADERS].join('\t');
    const tableText = [
      headerLine,
      ...generatedList.map((item, idx) => [
        idx + 1,
        item.sn,
        item.binLoc || '',
        item.noSku || '',
        item.namaItem || '',
        item.quantity || '',
        item.expiredDate || '',
        item.batch || '',
        item.vendorBatch || '',
        item.destinationName || ''
      ].join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Tersalin', 'Seluruh data dengan Serial Number berhasil disalin ke clipboard', 'success');
  };

  // 7. Copy Satu SN Saja
  const handleCopySingleSn = (sn: string, index: number) => {
    navigator.clipboard.writeText(sn);
    setCopiedSnIndex(index);
    setTimeout(() => setCopiedSnIndex(null), 1500);
    showToast('Tersalin', `Serial Number ${sn} disalin`, 'success');
  };

  // 8. Download Excel Hasil Generate (Sesuai Kolom Template + Kolom Serial Number)
  const handleDownloadExcel = () => {
    if (generatedList.length === 0) return;

    // Menghasilkan format kolom persis template + kolom Serial Number
    const exportData = generatedList.map((item, idx) => ({
      'No': idx + 1,
      'Serial Number': item.sn,
      'Bin Loc': item.binLoc || '',
      'No SKU': item.noSku || '',
      'Nama Item': item.namaItem || '',
      'Quantity': typeof item.quantity === 'number' ? item.quantity : (Number(item.quantity) || item.quantity || ''),
      'Expired Date': item.expiredDate || '',
      'Batch': item.batch || '',
      'Vendor Batch': item.vendorBatch || '',
      'Destination Name': item.destinationName || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Konfigurasi lebar kolom rapi
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 28 }, // Serial Number
      { wch: 15 }, // Bin Loc
      { wch: 15 }, // No SKU
      { wch: 35 }, // Nama Item
      { wch: 12 }, // Quantity
      { wch: 16 }, // Expired Date
      { wch: 15 }, // Batch
      { wch: 18 }, // Vendor Batch
      { wch: 25 }  // Destination Name
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Inbound SN');
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Inbound_Serial_Number_${timestamp}.xlsx`);
    showToast('Export Sukses', 'File Excel hasil Serial Number berhasil diunduh', 'success');
  };

  // Filter hasil pencarian
  const filteredList = generatedList.filter(item => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.sn.toLowerCase().includes(q) ||
      item.binLoc.toLowerCase().includes(q) ||
      item.noSku.toLowerCase().includes(q) ||
      item.namaItem.toLowerCase().includes(q) ||
      String(item.batch || '').toLowerCase().includes(q) ||
      String(item.vendorBatch || '').toLowerCase().includes(q) ||
      String(item.destinationName || '').toLowerCase().includes(q)
    );
  });

  // Hitung total Qty
  const totalQty = generatedList.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const uniqueSkus = new Set(generatedList.map(i => i.noSku).filter(Boolean)).size;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Quick Template Action */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-mono font-bold tracking-wide border border-blue-400/30">
                INBOUND SERIAL NUMBER GENERATOR
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                <Sparkles size={10} />
                Anti-Duplikat Unik
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
              Generator Serial Number Inbound FGKINO
            </h2>
            <p className="text-xs text-blue-200/90 leading-relaxed max-w-3xl">
              Unduh template Excel dengan 8 kolom standar, isi data inbound, lalu generate Serial Number otomatis: <br />
              <code className="text-amber-300 font-mono bg-blue-950/80 px-1.5 py-0.5 rounded text-[11px]">
                FGKINO-YYMMDD[BinLoc8Digit][RandNum4Digit]
              </code>
            </p>
          </div>

          {/* Action Download Template */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 border border-emerald-400/40"
              title="Download File Template Excel dengan 8 Kolom Standar"
            >
              <FileDown size={16} />
              <span>Download Template Excel</span>
            </button>
          </div>
        </div>

        {/* Kolom Standar Visual Pills */}
        <div className="mt-4 pt-3 border-t border-blue-800/60 flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-blue-300 font-semibold flex items-center gap-1 mr-1">
            <Layers size={13} />
            Struktur 8 Kolom Template:
          </span>
          {TEMPLATE_HEADERS.map((col, idx) => (
            <span 
              key={idx}
              className="px-2 py-0.5 bg-white/10 text-white rounded-md font-mono text-[10.5px] border border-white/10"
            >
              {idx + 1}. {col}
            </span>
          ))}
        </div>
      </div>

      {/* Input Section (Upload & Direct Paste) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 m-0 flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-blue-900" />
              Input Data Inbound (Upload Excel atau Tempel Teks)
            </h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Unggah file template yang sudah diisi atau salin-tempel baris dari Excel (Tab / CSV).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
              title="Isi contoh data untuk mencoba"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Muat Contoh</span>
            </button>

            {inputText && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-red-600 hover:text-red-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all hover:bg-red-50"
              >
                <Eraser size={13} />
                <span>Bersihkan</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateSN}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-950 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 border border-blue-800"
            >
              <RefreshCw size={14} />
              <span>Generate Serial Number</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Excel Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-3.5 sm:p-4 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-blue-600 bg-blue-50/70 scale-[0.99]' 
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-slate-600">
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-900 flex items-center justify-center shadow-2xs shrink-0">
              <UploadCloud size={20} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold text-slate-800 m-0">
                Klik untuk unggah file Excel / CSV hasil isi template, atau seret file ke sini
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                Mendukung .xlsx, .xls, .csv dengan 8 kolom template. Otomatis menghasilkan SN.
              </p>
            </div>
          </div>
        </div>

        {/* Textarea for Direct Paste */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Atau Salin & Tempel Langsung dari Spreadsheet:</span>
            {inputText && (
              <span className="text-[11px] font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {inputText.split('\n').filter(r => r.trim()).length} baris terdeteksi
              </span>
            )}
          </div>
          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Bin Loc\tNo SKU\tNama Item\tQuantity\tExpired Date\tBatch\tVendor Batch\tDestination Name\nA01B02C1\t21104501\tKINO SAMANTHA HAIR OIL 50ML\t120\t2026-12-31\tL911346N\tVB-2024-001\tGUDANG CIKEMBAR\nA01B02C2\t21104502\tOLIVE OIL SOFT PACK 100ML\t80\t2027-06-15\tK821105M\tVB-2024-002\tGUDANG TRANSIT`}
            className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Generated Results Section */}
      {generatedList.length > 0 && (
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          {/* Header Stats & Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">
                  Hasil Generator Serial Number
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold font-mono">
                  {generatedList.length} Item
                </span>
                {totalQty > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                    Total Qty: {totalQty.toLocaleString('id-ID')}
                  </span>
                )}
                {uniqueSkus > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {uniqueSkus} Unik SKU
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 m-0">
                Format kolom disesuaikan dengan template inbound dan ditambahkan kolom Serial Number.
              </p>
            </div>

            {/* Actions: Search, Copy, Download */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari SN, SKU, Item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCopyTable}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                title="Salin semua kolom ke Clipboard"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin!' : 'Salin Tabel'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Download file Excel lengkap dengan kolom Serial Number"
              >
                <Download size={14} />
                <span>Download Excel (Hasil + SN)</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[460px] overflow-y-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[950px]">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 border-b border-slate-200 w-12 text-center">#</th>
                  <th className="p-2.5 border-b border-slate-200 text-blue-950 font-extrabold min-w-[210px]">
                    Serial Number (SN)
                  </th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[100px]">Bin Loc</th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[100px]">No SKU</th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[200px]">Nama Item</th>
                  <th className="p-2.5 border-b border-slate-200 text-right min-w-[80px]">Quantity</th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[110px]">Expired Date</th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[100px]">Batch</th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[120px]">Vendor Batch</th>
                  <th className="p-2.5 border-b border-slate-200 min-w-[150px]">Destination Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400 italic">
                      Tidak ada data yang cocok dengan pencarian "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 font-mono">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-950 border border-blue-200/80 px-2 py-0.5 rounded-md font-bold text-[11.5px]">
                          <span>{item.sn}</span>
                          <button
                            type="button"
                            onClick={() => handleCopySingleSn(item.sn, idx)}
                            className="text-blue-600 hover:text-blue-800 cursor-pointer p-0.5 hover:bg-blue-100 rounded transition-all"
                            title="Salin Serial Number ini"
                          >
                            {copiedSnIndex === idx ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-slate-800">
                        {item.binLoc || '-'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {item.noSku || '-'}
                      </td>
                      <td className="p-2.5 text-slate-800 font-medium">
                        {item.namaItem || '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {item.quantity !== undefined && item.quantity !== '' ? item.quantity : '-'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {item.expiredDate || '-'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-800 font-semibold">
                        {item.batch || '-'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                        {item.vendorBatch || '-'}
                      </td>
                      <td className="p-2.5 text-slate-700">
                        {item.destinationName || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary Footer */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 pt-2">
            <span>
              Menampilkan {filteredList.length} dari total {generatedList.length} baris data Serial Number
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download size={13} />
                <span>Unduh Hasil (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

