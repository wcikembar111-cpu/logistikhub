import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Printer, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Copy, 
  Sliders, 
  Eye, 
  Check, 
  FileText, 
  Layers, 
  Download, 
  ArrowLeft, 
  ArrowRight,
  ExternalLink,
  Upload,
  Search,
  AlertCircle,
  Info,
  FileCode,
  RotateCw
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export interface TextLabelItem {
  id: string;
  body: string;
  copies?: number;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type TextWeight = '400' | '600' | '700' | '800';
export type LabelBorderStyle = 'none' | 'thin' | 'thick' | 'dashed';
export type Orientation = 'landscape' | 'portrait';
export type LabelRotation = 0 | 90;

const QUICK_TEMPLATES = [
  {
    name: 'HOLD / KARANTINA',
    body: 'HOLD / KARANTINA\nJANGAN DILETAKKAN DI RAK\nMENUNGGU KEPUTUSAN QA',
    align: 'center' as TextAlignment,
    fontSize: 26,
    weight: '800' as TextWeight,
    border: 'none' as LabelBorderStyle
  },
  {
    name: 'LOKASI RAK',
    body: 'RAK A-04-12\nLEVEL 2 · SLOT B',
    align: 'center' as TextAlignment,
    fontSize: 34,
    weight: '800' as TextWeight,
    border: 'none' as LabelBorderStyle
  },
  {
    name: 'REPACKING AREA',
    body: 'BARANG REPACKING\nSTATUS: DALAM PROSES\nPIC: OPERATOR REPACK',
    align: 'center' as TextAlignment,
    fontSize: 24,
    weight: '700' as TextWeight,
    border: 'none' as LabelBorderStyle
  },
  {
    name: 'FRAGILE / HATI-HATI',
    body: 'FRAGILE\nMUDAH PECAH!\nJANGAN DIBANTING\nMAKSIMAL TUMPUKAN 4 CTN',
    align: 'center' as TextAlignment,
    fontSize: 26,
    weight: '800' as TextWeight,
    border: 'none' as LabelBorderStyle
  },
  {
    name: 'SAMPLE RETENSI',
    body: 'SAMPLE RETENSI LAB\nNO SPPJ: SPPJ-2026-X\nTIDAK UNTUK DIJUAL',
    align: 'left' as TextAlignment,
    fontSize: 22,
    weight: '700' as TextWeight,
    border: 'none' as LabelBorderStyle
  },
  {
    name: 'PALET TRANSIT',
    body: 'PALET TRANSIT CABANG\nTUJUAN: DC SURABAYA\nJML: 45 CARTON',
    align: 'center' as TextAlignment,
    fontSize: 26,
    weight: '800' as TextWeight,
    border: 'none' as LabelBorderStyle
  }
];

export function Pm42TextPrintModule() {
  const { showToast } = useNotification();

  // Mode: Satuan (Single) vs Massal (Batch)
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Input Data - Mode Satuan (Murni Isi Teks Label)
  const [singleBody, setSingleBody] = useState<string>('CONTOH TEKS LABEL PM42\nNOMOR RAK: A-01-01');
  const [singleCopies, setSingleCopies] = useState<number>(1);

  // Input Data - Mode Batch (Murni Isi Teks per Baris)
  const [batchRawText, setBatchRawText] = useState<string>(
    'LOKASI RAK A-01-01\nLOKASI RAK A-01-02\nLOKASI RAK A-01-03\nLOKASI RAK A-01-04\nLOKASI RAK A-01-05'
  );
  const [batchDelimiter, setBatchDelimiter] = useState<'newline' | 'separator'>('newline');
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [selectedBatchIndices, setSelectedBatchIndices] = useState<Set<number>>(new Set());
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');

  // Orientasi Landscape (100x80 mm) vs Portrait (80x100 mm)
  const [orientation, setOrientation] = useState<Orientation>('landscape');

  // Pilihan Putar 90 Derajat (0 = Normal, 90 = Putar 90 Derajat searah jarum jam)
  const [rotation, setRotation] = useState<LabelRotation>(0);

  // Tanpa Border Luar
  const [borderStyle, setBorderStyle] = useState<LabelBorderStyle>('none');

  // Margin ruang aman cetak
  const [leftMarginMm, setLeftMarginMm] = useState<number>(4); 
  const [rightMarginMm, setRightMarginMm] = useState<number>(4);
  const [topMarginMm, setTopMarginMm] = useState<number>(6);
  const [bottomMarginMm, setBottomMarginMm] = useState<number>(6);

  const [fontSize, setFontSize] = useState<number>(26);
  const [alignment, setAlignment] = useState<TextAlignment>('center');
  const [fontWeight, setFontWeight] = useState<TextWeight>('700');
  const [lineHeight, setLineHeight] = useState<number>(1.3);
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'capitalize'>('none');
  const [fontFamily, setFontFamily] = useState<'sans' | 'mono'>('sans');

  // Modal Dialogs & States
  const [showZplModal, setShowZplModal] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);

  // Dimensi Fisik Kertas PM42 (SN 8x10 = 80 x 100 mm)
  const paperWidthMm = orientation === 'landscape' ? 100 : 80;
  const paperHeightMm = orientation === 'landscape' ? 80 : 100;

  // Parsing Data Batch menjadi item terstruktur (Murni Isi Teks)
  const batchItems = useMemo<TextLabelItem[]>(() => {
    if (!batchRawText.trim()) return [];

    let entries: string[] = [];
    if (batchDelimiter === 'separator') {
      entries = batchRawText
        .split(/\n?---+\n?/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
    } else {
      entries = batchRawText
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }

    return entries.map((entry, idx) => ({
      id: `batch-${idx + 1}`,
      body: entry,
      copies: 1
    }));
  }, [batchRawText, batchDelimiter]);

  // Sync selected indices when batch items count changes
  React.useEffect(() => {
    if (batchItems.length > 0) {
      setSelectedBatchIndices(new Set(batchItems.map((_, i) => i)));
      if (activePreviewIndex >= batchItems.length) {
        setActivePreviewIndex(0);
      }
    } else {
      setSelectedBatchIndices(new Set());
      setActivePreviewIndex(0);
    }
  }, [batchItems.length]);

  // Mendapatkan label yang aktif di preview saat ini (Murni Teks)
  const currentPreviewItem: TextLabelItem = useMemo(() => {
    if (mode === 'single') {
      return {
        id: 'single-1',
        body: singleBody || 'Ketik teks di panel editor sebelah kiri',
        copies: singleCopies
      };
    } else {
      if (batchItems.length > 0 && batchItems[activePreviewIndex]) {
        return batchItems[activePreviewIndex];
      }
      return {
        id: 'empty',
        body: 'Belum ada data batch teks'
      };
    }
  }, [mode, singleBody, singleCopies, batchItems, activePreviewIndex]);

  // Mengumpulkan seluruh daftar label yang akan dicetak
  const getItemsToPrint = (specificItems?: TextLabelItem[]): TextLabelItem[] => {
    if (specificItems && specificItems.length > 0) {
      return specificItems;
    }

    if (mode === 'single') {
      const copies = Math.max(1, singleCopies);
      const items: TextLabelItem[] = [];
      const textToPrint = singleBody.trim() || 'Label Teks';
      for (let i = 0; i < copies; i++) {
        items.push({
          id: `single-${i + 1}`,
          body: textToPrint,
          copies: 1
        });
      }
      return items;
    } else {
      if (batchItems.length === 0) return [];
      if (selectedBatchIndices.size === 0) return batchItems;
      return batchItems.filter((_, idx) => selectedBatchIndices.has(idx));
    }
  };

  // Helper Escape HTML
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Format teks body untuk HTML (mempertahankan baris kosong dan spasi)
  const formatBodyHtml = (text: string) => {
    return text
      .split('\n')
      .map(line => line.trim() === '' ? '&nbsp;' : escapeHtml(line))
      .join('<br/>');
  };

  // Menghasilkan Dokumen HTML Cetak Bersih: Murni Teks, Tanpa Header, Tanpa Border Luar, Tanpa "Dicetak"
  const generatePrintHtml = (items: TextLabelItem[]): string => {
    const fontFamCss = fontFamily === 'mono' 
      ? 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace' 
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    const textTransformCss = textTransform;

    const labelsHtml = items.map((item) => {
      const formattedBody = formatBodyHtml(item.body);

      return `
        <div class="label-page">
          <div class="label-box ${rotation === 90 ? 'rot-90' : 'rot-0'}">
            <div class="lbl-body">
              ${formattedBody}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <title>Cetak Teks Honeywell PM42 (${paperWidthMm}x${paperHeightMm}mm - Rotasi ${rotation}°)</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      size: ${paperWidthMm}mm ${paperHeightMm}mm;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: ${fontFamCss};
      color: #000000;
      width: ${paperWidthMm}mm;
    }
    .label-page {
      width: ${paperWidthMm}mm;
      height: ${paperHeightMm}mm;
      max-width: ${paperWidthMm}mm;
      max-height: ${paperHeightMm}mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: ${topMarginMm}mm;
      padding-right: ${rightMarginMm}mm;
      padding-bottom: ${bottomMarginMm}mm;
      padding-left: ${leftMarginMm}mm;
      overflow: hidden;
      background: #ffffff;
      box-sizing: border-box;
      border: none !important;
    }
    .label-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .label-box {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      background: #ffffff;
      box-sizing: border-box;
      padding: 1mm;
      margin: 0;
      overflow: hidden;
      border: none !important; /* TANPA BORDER LUAR */
    }
    .label-box.rot-0 {
      width: 100%;
      height: 100%;
      flex: 1;
    }
    /* Pilihan Putar 90 Derajat */
    .label-box.rot-90 {
      transform: rotate(90deg);
      transform-origin: center center;
      width: calc(${paperHeightMm}mm - ${topMarginMm + bottomMarginMm}mm);
      height: calc(${paperWidthMm}mm - ${leftMarginMm + rightMarginMm}mm);
      flex-shrink: 0;
    }
    .lbl-body {
      font-size: ${fontSize}px;
      font-weight: ${fontWeight};
      text-align: ${alignment};
      line-height: ${lineHeight};
      text-transform: ${textTransformCss};
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 1mm 0;
      overflow: hidden;
    }
    @media screen {
      body {
        background: #0f172a;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        min-height: 100vh;
        width: 100%;
      }
      .no-print-toolbar {
        position: sticky;
        top: 10px;
        z-index: 999;
        background: #1e293b;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        width: 100%;
        max-width: 580px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        border: 1px solid #334155;
      }
      .print-btn-action {
        background: #2563eb;
        color: #ffffff;
        font-weight: bold;
        border: none;
        padding: 9px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s;
      }
      .print-btn-action:hover {
        background: #1d4ed8;
      }
      .label-page {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        background: #ffffff;
        border-radius: 2px;
      }
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div>
      <div style="font-weight: 700; font-size: 13px; color: #f8fafc;">Siap Cetak Honeywell PM42</div>
      <div style="font-size: 11px; color: #94a3b8;">
        ${items.length} Label &bull; ${paperWidthMm}x${paperHeightMm} mm &bull; Rotasi: ${rotation}° &bull; Tanpa Border
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="print-btn-action" onclick="window.print()">
        &#128438; Buka Dialog Printer
      </button>
      <button class="print-btn-action" style="background: #475569;" onclick="window.close()">
        Tutup
      </button>
    </div>
  </div>
  ${labelsHtml}
  <script>
    // Trigger window.print() TEPAT 1 KALI SAJA (mencegah dialog terbuka berulang kali / sampai 4 kali)
    var isPrintInvoked = false;
    function runSinglePrint() {
      if (isPrintInvoked) return;
      isPrintInvoked = true;
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    }

    if (document.readyState === 'complete') {
      setTimeout(runSinglePrint, 250);
    } else {
      window.addEventListener('load', function() {
        setTimeout(runSinglePrint, 250);
      });
    }
  </script>
</body>
</html>`;
  };

  // =========================================================================
  // SISTEM EKSEKUSI CETAK SEKALI TEKAN (LANGSUNG PRINT KE HONEYWELL PM42)
  // =========================================================================

  // Eksekusi Panggilan Dialog Printer Sistem Sekali Tekan (Direct 1x Click)
  const executeSystemPrint = (specificItems?: TextLabelItem[]) => {
    const items = getItemsToPrint(specificItems);
    if (items.length === 0) {
      showToast('Perhatian', 'Tidak ada data teks label untuk dicetak', 'info');
      return;
    }

    const htmlContent = generatePrintHtml(items);

    // Metode 1: Popup Window (Membuka jendela cetak yang otomatis memanggil print dialog 1 kali)
    try {
      const printWin = window.open('', '_blank', 'width=850,height=700');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        showToast('Mencetak PM42', `Mengirim ${items.length} label ke dialog printer Honeywell PM42`, 'success');
        return;
      }
    } catch (e) {
      console.warn('Popup print blocked, falling back to offscreen frame', e);
    }

    // Metode 2: Hidden but Rendered Frame jika browser memblokir popup
    try {
      let printFrame = document.getElementById('pm42-direct-print-frame') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'pm42-direct-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.left = '-9999px';
        printFrame.style.top = '-9999px';
        printFrame.style.width = '800px';
        printFrame.style.height = '800px';
        printFrame.style.opacity = '0';
        printFrame.style.pointerEvents = 'none';
        document.body.appendChild(printFrame);
      }
      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          showToast('Mencetak PM42', `Membuka dialog cetak untuk ${items.length} label teks`, 'info');
        }, 350);
        return;
      }
    } catch (err) {
      console.error('Frame print failed', err);
    }

    // Metode 3: Tab baru via Blob URL jika popup dan iframe dicegah
    openPrintNewTab(specificItems);
  };

  // Buka Halaman Cetak di Tab Baru (Opsi cadangan alternatif jika popup dicegah browser)
  const openPrintNewTab = (specificItems?: TextLabelItem[]) => {
    const items = getItemsToPrint(specificItems);
    if (items.length === 0) return;
    const htmlContent = generatePrintHtml(items);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    showToast('Halaman Cetak Terbuka', 'Tab cetak baru telah dibuka', 'success');
  };

  // Handle Import File (.txt / .csv / .xlsx)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          const lines = rows
            .map(row => row.filter(cell => cell !== undefined && cell !== null && cell !== '').join(' - '))
            .filter(line => line.trim().length > 0);

          if (lines.length > 0) {
            setBatchRawText(lines.join('\n'));
            setMode('batch');
            showToast('File Berhasil Diimpor', `${lines.length} baris dimuat dari ${file.name}`, 'success');
          } else {
            showToast('Gagal', 'File Excel kosong atau format tidak sesuai', 'warning');
          }
        } catch (err) {
          console.error(err);
          showToast('Error', 'Gagal membaca file Excel', 'danger');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          setBatchRawText(text.trim());
          setMode('batch');
          showToast('File Berhasil Diimpor', `Teks dari ${file.name} berhasil dimuat ke batch`, 'success');
        }
      };
      reader.readAsText(file);
    }

    e.target.value = '';
  };

  // Generate ZPL Command Script PM42 (Murni Isi Teks, Rotasi 90°, Tanpa Border)
  const generateZplCode = (): string => {
    const items = getItemsToPrint();
    const dotsPerMm = 8; // 203 DPI = 8 dots/mm PM42

    const pageWidthDots = paperWidthMm * dotsPerMm;
    const pageHeightDots = paperHeightMm * dotsPerMm;

    const topMarginDots = topMarginMm * dotsPerMm;
    const leftMarginDots = leftMarginMm * dotsPerMm;

    let zplOutput = ``;

    items.forEach((item) => {
      zplOutput += `^XA\n`;
      zplOutput += `^PW${pageWidthDots}\n`;
      zplOutput += `^LL${pageHeightDots}\n`;
      zplOutput += `^LH0,0\n`;
      // Rotasi 90 Derajat di ZPL: ^POR (Rotated) vs ^PON (Normal)
      zplOutput += rotation === 90 ? `^POR\n` : `^PON\n`;
      zplOutput += `^MNY\n`; // Gap sensing Honeywell PM42
      zplOutput += `^PR4,4\n`; // Print speed 4 ips

      // Body lines (Murni Teks saja)
      const bodyLines = item.body.split('\n');
      let currentY = topMarginDots + 25;
      bodyLines.forEach((line) => {
        zplOutput += `^FO${leftMarginDots + 16},${currentY}^A0N,${fontSize * 2},${fontSize * 2}^FB${pageWidthDots - (leftMarginDots * 2) - 32},1,0,${alignment === 'center' ? 'C' : alignment === 'right' ? 'R' : 'L'}^FD${line}^FS\n`;
        currentY += fontSize * 2 + 10;
      });

      zplOutput += `^PQ1,0,1,Y\n`;
      zplOutput += `^XZ\n\n`;
    });

    return zplOutput;
  };

  const handleCopyZpl = () => {
    const zpl = generateZplCode();
    navigator.clipboard.writeText(zpl);
    setCopiedZpl(true);
    showToast('Tersalin', 'Kode perintah cetak PM42 berhasil disalin ke clipboard', 'success');
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  const handleDownloadZplFile = () => {
    const zpl = generateZplCode();
    const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PM42_Text_Print_${Date.now()}.zpl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File Diunduh', 'File perintah ZPL PM42 berhasil diunduh', 'success');
  };

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    if (mode === 'single') {
      setSingleBody(tpl.body);
      setAlignment(tpl.align);
      setFontSize(tpl.fontSize);
      setFontWeight(tpl.weight);
      setBorderStyle('none');
      showToast('Template Diterapkan', `Template "${tpl.name}" berhasil dimuat`, 'success');
    } else {
      setBatchRawText(tpl.body);
      setAlignment(tpl.align);
      setFontSize(tpl.fontSize);
      setFontWeight(tpl.weight);
      setBorderStyle('none');
      showToast('Template Diterapkan', `Template "${tpl.name}" diterapkan ke mode batch`, 'success');
    }
  };

  // Toggle selection batch items
  const toggleSelectBatchItem = (idx: number) => {
    const next = new Set(selectedBatchIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedBatchIndices(next);
  };

  const selectAllBatchItems = () => {
    setSelectedBatchIndices(new Set(batchItems.map((_, i) => i)));
  };

  const deselectAllBatchItems = () => {
    setSelectedBatchIndices(new Set());
  };

  // Filtered batch items for table search
  const filteredBatchItems = useMemo(() => {
    if (!batchSearchTerm.trim()) return batchItems;
    const term = batchSearchTerm.toLowerCase();
    return batchItems.filter(item => item.body.toLowerCase().includes(term));
  }, [batchItems, batchSearchTerm]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Toolbar & Breadcrumb */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold">
              <Printer size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Print Teks Label Honeywell PM42
                </h1>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Thermal 203 DPI
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Tanpa Border Luar
                </span>
                {rotation === 90 && (
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <RotateCw size={10} />
                    Putar 90°
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cetak isi teks murni pada stiker roll PM42 ({paperWidthMm}x{paperHeightMm} mm) &bull; Sekali tekan langsung cetak
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer"
            >
              <Info size={14} />
              Panduan PM42
            </button>

            <button
              onClick={() => setShowZplModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Lihat kode perintah raw PM42"
            >
              <FileCode size={14} />
              Raw ZPL
            </button>

            {/* TOMBOL UTAMA CETAK PM42 (SEKALI TEKAN LANGSUNG PRINT) */}
            <button
              onClick={() => executeSystemPrint()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 rounded-lg transition-all shadow-md cursor-pointer"
              title="Sekali tekan langsung buka dialog cetak PM42"
            >
              <Printer size={16} />
              <span>PRINT PM42 ({getItemsToPrint().length} LABEL)</span>
            </button>
          </div>
        </div>

        {/* Petunjuk Singkat Pengaturan Printer PM42 */}
        {showGuide && (
          <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-xs text-slate-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <div className="p-1 rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0 mt-0.5">
                <AlertCircle size={15} />
              </div>
              <div>
                <div className="font-extrabold text-amber-950 text-xs">Pengaturan Wajib di Layar Printer PM42 & Browser:</div>
                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                  Agar hasil print keluar sempurna tanpa terpotong sensor kertas:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px]">
              <div className="p-2.5 bg-white/90 rounded-lg border border-amber-200">
                <span className="font-bold text-blue-900 block mb-1">✅ 1. Di Layar LCD Printer PM42:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  <li>Masuk ke <strong>Menu &gt; Settings &gt; System Settings &gt; General &gt; Command Language</strong>.</li>
                  <li>Ubah ke <strong className="text-emerald-700">Autosense</strong> atau <strong>Direct Protocol</strong>.</li>
                  <li>Lakukan <strong>Media Calibration</strong> jika jeda kertas lompat.</li>
                </ul>
              </div>

              <div className="p-2.5 bg-white/90 rounded-lg border border-amber-200">
                <span className="font-bold text-slate-900 block mb-1">⚙️ 2. Di Jendela Dialog Print Browser (Ctrl+P):</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  <li><strong>Tujuan / Destination:</strong> Pilih printer <strong>Honeywell PM42</strong>.</li>
                  <li><strong>Ukuran Kertas:</strong> Pilih <strong>80 x 100 mm</strong> (SN 8x10) atau <strong>100 x 80 mm</strong>.</li>
                  <li><strong>Margin:</strong> Atur ke <strong>None / 0 mm</strong>.</li>
                  <li><strong>Skala:</strong> Atur ke <strong>100% (Default)</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs (Single vs Batch) */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setMode('single')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Satuan (Single Text)
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                mode === 'batch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Mode Massal (Batch Baris)</span>
              {batchItems.length > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                  {batchItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Preset Template Cepat Gudang */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mr-1">
              Template Cepat:
            </span>
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => applyTemplate(tpl)}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-md whitespace-nowrap transition-colors cursor-pointer"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace: 2-Kolom (Editor & Konfigurasi di Kiri, Live Preview di Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI (7/12): INPUT TEXT & CONTROLS */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* TEXT INPUT CARD (Hanya Isi Teks Label) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                {mode === 'single' ? 'Input Isi Teks Label' : 'Input Daftar Teks Massal (Batch)'}
              </h2>

              {mode === 'batch' && (
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-200">
                    <Upload size={12} />
                    <span>Import File (.txt/.csv/.xlsx)</span>
                    <input 
                      type="file" 
                      accept=".txt,.csv,.xlsx,.xls" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-500">Pemisah:</span>
                    <select
                      value={batchDelimiter}
                      onChange={(e) => setBatchDelimiter(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs font-medium text-slate-700"
                    >
                      <option value="newline">Per Baris Baru</option>
                      <option value="separator">Pemisah '---'</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Isi Teks Label Utama */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  {mode === 'single' ? 'Isi Teks Label Utama' : 'Daftar Teks Tiap Label (1 Baris = 1 Label)'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {mode === 'single' ? `${singleBody.length} karakter` : `${batchItems.length} label terdeteksi`}
                </span>
              </div>
              <textarea
                rows={mode === 'single' ? 6 : 8}
                value={mode === 'single' ? singleBody : batchRawText}
                onChange={(e) => mode === 'single' ? setSingleBody(e.target.value) : setBatchRawText(e.target.value)}
                placeholder={mode === 'single' 
                  ? 'Ketik isi teks label di sini...\nGunakan Enter untuk baris baru.' 
                  : 'Ketik baris label di sini:\nRAK A-01-01\nRAK A-01-02\nRAK A-01-03'
                }
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
              />
            </div>

            {/* Jumlah Salinan (Single Mode) */}
            {mode === 'single' && (
              <div className="pt-1 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Jumlah Salinan Label:</span>
                  <span className="text-[11px] text-slate-400">Berapa lembar label ini ingin dicetak</span>
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={singleCopies}
                    onChange={(e) => setSingleCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* BATCH ITEMS LIST TABLE (Hanya pada mode batch) */}
          {mode === 'batch' && batchItems.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Daftar Label Batch ({selectedBatchIndices.size} dari {batchItems.length} Terpilih)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllBatchItems}
                    className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllBatchItems}
                    className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Search filter inside batch */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={batchSearchTerm}
                  onChange={(e) => setBatchSearchTerm(e.target.value)}
                  placeholder="Cari teks di dalam daftar batch..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                />
              </div>

              {/* Batch list cards */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {filteredBatchItems.map((item) => {
                  const originalIndex = batchItems.findIndex(b => b.id === item.id);
                  const isChecked = selectedBatchIndices.has(originalIndex);
                  const isActive = activePreviewIndex === originalIndex;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-medium'
                          : isChecked
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectBatchItem(originalIndex)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                          #{originalIndex + 1}
                        </span>
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-slate-800 truncate block">
                            {item.body.replace(/\n/g, ' · ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActivePreviewIndex(originalIndex)}
                          className="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                          title="Lihat Pratinjau Kertas"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => executeSystemPrint([item])}
                          className="px-2.5 py-1 text-[11px] rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                          title="Sekali tekan langsung cetak label ini"
                        >
                          <Printer size={11} />
                          Print Ini
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. FORMATTING, ORIENTASI & PILIHAN PUTAR 90 DERAJAT */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              Format Teks, Orientasi & Rotasi 90°
            </h2>

            {/* PENGATURAN PILIHAN PUTAR 90 DERAJAT */}
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs">
                  <RotateCw size={15} className="text-blue-700" />
                  <span>Pilihan Putar 90 Derajat (Rotasi Teks):</span>
                </div>
                <span className="text-[10px] font-bold bg-white text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                  {rotation === 90 ? 'Aktif (90° Searah Jarum Jam)' : 'Normal (0°)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRotation(0)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    rotation === 0
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Normal (0°) - Sesuai Kertas
                </button>

                <button
                  type="button"
                  onClick={() => setRotation(90)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    rotation === 90
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs ring-2 ring-blue-400'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <RotateCw size={13} />
                  <span>Putar 90 Derajat (90°)</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-600 m-0">
                Pilihan <strong>Putar 90°</strong> akan memutar seluruh teks sebesar 90 derajat searah jarum jam sehingga teks dapat dicetak melintang pada roll kertas stiker PM42.
              </p>
            </div>

            {/* Quick Size Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  Ukuran Huruf Teks Utama: <span className="text-blue-700 font-bold">{fontSize}px</span>
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Kecil', size: 18 },
                    { label: 'Sedang', size: 26 },
                    { label: 'Besar', size: 34 },
                    { label: 'Jumbo', size: 46 },
                    { label: 'Raksasa', size: 58 }
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setFontSize(p.size)}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        fontSize === p.size
                          ? 'bg-blue-700 text-white font-bold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min={12}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Alignment, Weight & Capitalize */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {/* Text Align */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Perataan Teks
                </label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setAlignment('left')}
                    className={`flex-1 p-2 flex justify-center transition-colors cursor-pointer ${
                      alignment === 'left' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Kiri"
                  >
                    <AlignLeft size={15} />
                  </button>
                  <button
                    onClick={() => setAlignment('center')}
                    className={`flex-1 p-2 flex justify-center transition-colors cursor-pointer ${
                      alignment === 'center' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Tengah"
                  >
                    <AlignCenter size={15} />
                  </button>
                  <button
                    onClick={() => setAlignment('right')}
                    className={`flex-1 p-2 flex justify-center transition-colors cursor-pointer ${
                      alignment === 'right' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Kanan"
                  >
                    <AlignRight size={15} />
                  </button>
                  <button
                    onClick={() => setAlignment('justify')}
                    className={`flex-1 p-2 flex justify-center transition-colors cursor-pointer ${
                      alignment === 'justify' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Kanan Kiri"
                  >
                    <AlignJustify size={15} />
                  </button>
                </div>
              </div>

              {/* Font Weight */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Ketebalan Teks
                </label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(e.target.value as TextWeight)}
                  className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="400">Regular (400)</option>
                  <option value="600">Medium (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extra Bold (800)</option>
                </select>
              </div>

              {/* Huruf Kapital */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Kapitalisasi
                </label>
                <select
                  value={textTransform}
                  onChange={(e) => setTextTransform(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="none">Sesuai Ketikan</option>
                  <option value="uppercase">HURUF BESAR (KAPITAL)</option>
                  <option value="capitalize">Huruf Besar Tiap Kata</option>
                </select>
              </div>
            </div>

            {/* PENGATURAN ORIENTASI KERTAS (Landscape 100x80 vs Portrait 80x100) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ukuran Kertas Roll PM42:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-left transition-all cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Landscape (100 x 80 mm)</span>
                    {orientation === 'landscape' && <Check size={14} className="text-blue-700" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                    Standar Lebar 100mm
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-left transition-all cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Portrait (80 x 100 mm)</span>
                    {orientation === 'portrait' && <Check size={14} className="text-blue-700" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                    Standar SN 8x10 (Lebar 80mm)
                  </span>
                </button>
              </div>
            </div>

            {/* Konfirmasi Status: Tanpa Border Luar & Tanpa Header */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600" />
                <span>Format Bersih Siap Cetak:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
                <li><strong>Murni Teks:</strong> Hanya teks yang Anda ketik yang dicetak (tanpa header tambahan).</li>
                <li><strong>Tanpa Border Luar:</strong> Tidak ada garis kotak tepi pada label.</li>
                <li><strong>Sekali Tekan Langsung Cetak:</strong> Dialog printer langsung dipanggil tanpa popup ganda.</li>
                <li><strong>Rotasi Teks:</strong> {rotation === 90 ? 'Diputar 90 Derajat (Melintang)' : 'Posisi Normal (0°)'}.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (5/12): WYSIWYG LIVE PREVIEW PADA KERTAS HONEYWELL PM42 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs sticky top-4">
            
            {/* Header Preview & Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Eye size={14} className="text-blue-600" />
                  Pratinjau Kertas PM42 ({paperWidthMm}x${paperHeightMm} mm)
                </h3>
                <span className="text-[11px] text-slate-500">
                  {paperWidthMm} x {paperHeightMm} mm &bull; Rotasi: {rotation}° &bull; Murni Teks
                </span>
              </div>

              {mode === 'batch' && batchItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setActivePreviewIndex(prev => Math.max(0, prev - 1))}
                    disabled={activePreviewIndex === 0}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    title="Label Sebelumnya"
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <span className="text-[11px] font-bold text-slate-700">
                    {activePreviewIndex + 1} / {batchItems.length}
                  </span>
                  <button
                    onClick={() => setActivePreviewIndex(prev => Math.min(batchItems.length - 1, prev + 1))}
                    disabled={activePreviewIndex >= batchItems.length - 1}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                    title="Label Berikutnya"
                  >
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* SIMULASI FISIK KERTAS LABEL PM42 (MURNI TEKS, TANPA BORDER LUAR, DENGAN ROTASI 90°) */}
            <div className="my-4 p-4 bg-slate-900/90 rounded-xl flex items-center justify-center overflow-hidden min-h-[340px]">
              {/* Kontainer Lembar Kertas Stiker */}
              <div
                style={{
                  width: `${paperWidthMm * 3.3}px`,
                  height: `${paperHeightMm * 3.3}px`,
                  paddingTop: `${topMarginMm * 3.3}px`,
                  paddingRight: `${rightMarginMm * 3.3}px`,
                  paddingBottom: `${bottomMarginMm * 3.3}px`,
                  paddingLeft: `${leftMarginMm * 3.3}px`,
                  fontFamily: fontFamily === 'mono' ? 'monospace' : 'sans-serif'
                }}
                className="bg-white text-black shadow-2xl rounded-xs flex items-center justify-center transition-all duration-150 box-border relative overflow-hidden"
              >
                {/* Kontainer Teks yang diputar bila rotation === 90 */}
                <div 
                  style={{
                    transform: rotation === 90 ? 'rotate(90deg)' : 'none',
                    transformOrigin: 'center center',
                    width: rotation === 90 ? `${(paperHeightMm - (topMarginMm + bottomMarginMm)) * 3.3}px` : '100%',
                    height: rotation === 90 ? `${(paperWidthMm - (leftMarginMm + rightMarginMm)) * 3.3}px` : '100%'
                  }}
                  className="flex flex-col justify-center p-1 box-border overflow-hidden transition-transform duration-200"
                >
                  {/* Isi Teks Label Utama Murni */}
                  <div 
                    style={{
                      fontSize: `${fontSize * 0.9}px`,
                      fontWeight: fontWeight,
                      textAlign: alignment,
                      lineHeight: lineHeight,
                      textTransform: textTransform
                    }}
                    className="flex-1 flex flex-col justify-center text-black py-1 overflow-hidden"
                  >
                    {currentPreviewItem.body.split('\n').map((line, lIdx) => (
                      <div key={lIdx} className="break-words">
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badge visual rotasi 90 derajat */}
                {rotation === 90 && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 font-bold text-[8px] px-1.5 py-0.5 rounded shadow select-none flex items-center gap-0.5 pointer-events-none">
                    <RotateCw size={9} />
                    ROTASI 90°
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary Info */}
            <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span>Ukuran Kertas:</span>
                <span className="font-semibold text-slate-800">
                  {paperWidthMm} x {paperHeightMm} mm
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rotasi Teks:</span>
                <span className="font-bold text-blue-700">
                  {rotation === 90 ? 'Diputar 90 Derajat (Clockwise)' : 'Normal (0°)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Format Garis:</span>
                <span className="font-bold text-emerald-700">
                  Murni Tanpa Border Luar
                </span>
              </div>
            </div>

            {/* Print Action: Tombol Sekali Tekan Langsung Print */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => executeSystemPrint()}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-sm"
                title="Sekali tekan langsung cetak ke printer Honeywell PM42"
              >
                <Printer size={18} />
                <span>PRINT KE HONEYWELL PM42 ({getItemsToPrint().length})</span>
              </button>

              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={() => openPrintNewTab()}
                  className="text-[11px] text-slate-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>Buka di tab baru jika browser memblokir dialog printer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL ZPL / DIRECT PROTOCOL COMMAND PM42 */}
      {/* ========================================================================= */}
      {showZplModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Script Perintah Printer Honeywell PM42 (ZPL)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orientasi: {orientation.toUpperCase()} &bull; Rotasi: {rotation}° &bull; Tanpa Border &bull; Lebar: {paperWidthMm}x{paperHeightMm}mm
                </p>
              </div>
              <button
                onClick={() => setShowZplModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
                {generateZplCode()}
              </pre>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-500">
                Format: Zebra Programming Language (ZPL II) &bull; 203 DPI PM42
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadZplFile}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Download size={13} />
                  Download .ZPL
                </button>
                <button
                  onClick={handleCopyZpl}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {copiedZpl ? <Check size={14} /> : <Copy size={14} />}
                  {copiedZpl ? 'Berhasil Disalin!' : 'Salin Script'}
                </button>
                <button
                  onClick={() => setShowZplModal(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
