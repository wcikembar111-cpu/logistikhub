import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Bold, 
  Copy, 
  Trash2, 
  Plus, 
  RotateCw, 
  Sliders, 
  Eye, 
  Check, 
  FileText, 
  Sparkles, 
  Layers, 
  Settings2, 
  Download, 
  ArrowLeft, 
  ArrowRight,
  Maximize2,
  Tag,
  AlertCircle,
  HelpCircle,
  SplitSquareVertical
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export interface TextLabelItem {
  id: string;
  header?: string;
  body: string;
  footer?: string;
  copies?: number;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type TextWeight = '400' | '600' | '700' | '800';
export type LabelBorderStyle = 'none' | 'thin' | 'thick' | 'dashed';
export type Orientation = 'landscape' | 'portrait';

const QUICK_TEMPLATES = [
  {
    name: 'HOLD / KARANTINA',
    header: 'STATUS QUALITY CONTROL',
    body: 'HOLD / KARANTINA\nJANGAN DILETAKKAN DI RAK\nMENUNGGU KEPUTUSAN QA',
    footer: 'WH CIKEMBAR · LOGISTIK',
    align: 'center' as TextAlignment,
    fontSize: 26,
    weight: '800' as TextWeight,
    border: 'thick' as LabelBorderStyle
  },
  {
    name: 'LOKASI RAK',
    header: 'AREA PENYIMPANAN GUDANG',
    body: 'RAK A-04-12\nLEVEL 2 · SLOT B',
    footer: 'ZONE FINISHED GOODS',
    align: 'center' as TextAlignment,
    fontSize: 34,
    weight: '800' as TextWeight,
    border: 'thin' as LabelBorderStyle
  },
  {
    name: 'REPACKING AREA',
    header: 'PROSES PRODUKSI / REPACK',
    body: 'BARANG REPACKING\nSTATUS: DALAM PROSES\nPIC: OPERATOR REPACK',
    footer: 'SUITE REPACK LOGISTIK',
    align: 'center' as TextAlignment,
    fontSize: 24,
    weight: '700' as TextWeight,
    border: 'thin' as LabelBorderStyle
  },
  {
    name: 'FRAGILE / HATI-HATI',
    header: 'PERINGATAN PENANGANAN',
    body: 'FRAGILE\nMUDAH PECAH!\nJANGAN DIBANTING\nMAKSIMAL TUMPUKAN 4 CTN',
    footer: 'STANDARD HANDLING SAFETY',
    align: 'center' as TextAlignment,
    fontSize: 26,
    weight: '800' as TextWeight,
    border: 'thick' as LabelBorderStyle
  },
  {
    name: 'SAMPLE RETENSI',
    header: 'SAMPEL QC / AUDIT',
    body: 'SAMPLE RETENSI LAB\nNO SPPJ: SPPJ-2026-X\nTIDAK UNTUK DIJUAL',
    footer: 'QC PASS · GUDANG LOGISTIK',
    align: 'left' as TextAlignment,
    fontSize: 22,
    weight: '700' as TextWeight,
    border: 'thin' as LabelBorderStyle
  },
  {
    name: 'PALET TRANSIT',
    header: 'DISTRIBUSI ANTAR CABANG',
    body: 'PALET TRANSIT CABANG\nTUJUAN: DC SURABAYA\nJML: 45 CARTON',
    footer: 'OUTBOUND DISPATCH M081',
    align: 'center' as TextAlignment,
    fontSize: 26,
    weight: '800' as TextWeight,
    border: 'thin' as LabelBorderStyle
  }
];

export function Pm42TextPrintModule() {
  const { showToast } = useNotification();

  // Mode: Satuan (Single) vs Massal (Batch)
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Input Data - Mode Satuan
  const [singleHeader, setSingleHeader] = useState<string>('');
  const [singleBody, setSingleBody] = useState<string>('CONTOH TEKS LABEL PM42\nGUDANG LOGISTIK CIKEMBAR\nNOMOR RAK: A-01-01');
  const [singleFooter, setSingleFooter] = useState<string>('');
  const [singleCopies, setSingleCopies] = useState<number>(1);
  const [includeTimestamp, setIncludeTimestamp] = useState<boolean>(true);

  // Input Data - Mode Batch
  const [batchRawText, setBatchRawText] = useState<string>(
    'LOKASI RAK A-01-01\nLOKASI RAK A-01-02\nLOKASI RAK A-01-03\nLOKASI RAK A-01-04\nLOKASI RAK A-01-05'
  );
  const [batchHeaderPrefix, setBatchHeaderPrefix] = useState<string>('');
  const [batchFooterText, setBatchFooterText] = useState<string>('');
  const [batchDelimiter, setBatchDelimiter] = useState<'newline' | 'separator'>('newline');
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [selectedBatchIndices, setSelectedBatchIndices] = useState<Set<number>>(new Set());

  // Layout & Formatting PM42 (Ukuran Kertas 80x100 mm standar Honeywell PM42)
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [topMarginMm, setTopMarginMm] = useState<number>(10); // 10mm margin atas persis seperti menu QR PM42
  const [sideMarginMm, setSideMarginMm] = useState<number>(4); // 4mm margin kiri/kanan
  const [fontSize, setFontSize] = useState<number>(24);
  const [headerFontSize, setHeaderFontSize] = useState<number>(12);
  const [footerFontSize, setFooterFontSize] = useState<number>(11);
  const [alignment, setAlignment] = useState<TextAlignment>('center');
  const [fontWeight, setFontWeight] = useState<TextWeight>('700');
  const [lineHeight, setLineHeight] = useState<number>(1.3);
  const [borderStyle, setBorderStyle] = useState<LabelBorderStyle>('thin');
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'capitalize'>('none');
  const [fontFamily, setFontFamily] = useState<'sans' | 'mono'>('sans');

  // Modal Dialogs
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showZplModal, setShowZplModal] = useState<boolean>(false);
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);

  // Dimensi Kertas Fisik PM42 (SN 8x10 = 80 x 100 mm)
  const paperWidthMm = orientation === 'landscape' ? 100 : 80;
  const paperHeightMm = orientation === 'landscape' ? 80 : 100;

  // Parsing Data Batch menjadi item terstruktur
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
      id: `batch-${idx + 1}-${Date.now()}`,
      header: batchHeaderPrefix.trim() || undefined,
      body: entry,
      footer: batchFooterText.trim() || (includeTimestamp ? new Date().toLocaleDateString('id-ID') : undefined),
      copies: 1
    }));
  }, [batchRawText, batchDelimiter, batchHeaderPrefix, batchFooterText, includeTimestamp]);

  // Sync selected indices when batch items change
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

  // Mendapatkan label yang aktif di preview saat ini
  const currentPreviewItem: TextLabelItem = useMemo(() => {
    if (mode === 'single') {
      return {
        id: 'single-1',
        header: singleHeader.trim() || undefined,
        body: singleBody || 'Ketik teks di panel editor sebelah kiri',
        footer: singleFooter.trim() || (includeTimestamp ? `Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : undefined),
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
  }, [mode, singleHeader, singleBody, singleFooter, singleCopies, includeTimestamp, batchItems, activePreviewIndex]);

  // Mengumpulkan seluruh daftar label yang akan dicetak
  const getItemsToPrint = (): TextLabelItem[] => {
    if (mode === 'single') {
      const copies = Math.max(1, singleCopies);
      const items: TextLabelItem[] = [];
      for (let i = 0; i < copies; i++) {
        items.push({
          id: `single-${i + 1}`,
          header: singleHeader.trim() || undefined,
          body: singleBody.trim() || 'Label Teks',
          footer: singleFooter.trim() || (includeTimestamp ? `Dicetak: ${new Date().toLocaleDateString('id-ID')}` : undefined),
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

  // Menghasilkan HTML Khusus Printer Honeywell PM42
  const generatePrintHtml = (items: TextLabelItem[]): string => {
    const borderCss = 
      borderStyle === 'thin' ? '1px solid #000000' :
      borderStyle === 'thick' ? '2.5px solid #000000' :
      borderStyle === 'dashed' ? '1.5px dashed #000000' : 'none';

    const fontFamCss = fontFamily === 'mono' 
      ? 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace' 
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    const textTransformCss = textTransform;

    const labelsHtml = items.map((item, idx) => {
      const formattedBody = escapeHtml(item.body).replace(/\n/g, '<br/>');
      const formattedHeader = item.header ? `<div class="lbl-header">${escapeHtml(item.header)}</div><div class="lbl-divider"></div>` : '';
      const formattedFooter = item.footer ? `<div class="lbl-divider-bottom"></div><div class="lbl-footer">${escapeHtml(item.footer)}</div>` : '';

      return `
        <div class="label-page">
          <div class="label-box ${borderStyle !== 'none' ? 'has-border' : ''}">
            ${formattedHeader}
            <div class="lbl-body">
              ${formattedBody}
            </div>
            ${formattedFooter}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Teks Honeywell PM42 (${paperWidthMm}x${paperHeightMm}mm)</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page {
            size: ${paperWidthMm}mm ${paperHeightMm}mm;
            margin: 0mm !important;
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
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: stretch;
            justify-content: flex-start;
            padding: ${topMarginMm}mm ${sideMarginMm}mm 3mm ${sideMarginMm}mm;
            overflow: hidden;
            background: #ffffff;
            box-sizing: border-box;
          }
          .label-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .label-box {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: space-between;
            background: #ffffff;
            box-sizing: border-box;
            overflow: hidden;
            padding: 2mm 3mm;
          }
          .label-box.has-border {
            border: ${borderCss};
            border-radius: 1mm;
          }
          .lbl-header {
            font-size: ${headerFontSize}px;
            font-weight: 700;
            text-align: ${alignment};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.2;
            word-break: break-word;
            flex-shrink: 0;
          }
          .lbl-divider {
            width: 100%;
            height: 0;
            border-bottom: 1px solid #000000;
            margin-top: 1.5mm;
            margin-bottom: 2mm;
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
          }
          .lbl-divider-bottom {
            width: 100%;
            height: 0;
            border-bottom: 1px solid #000000;
            margin-top: 2mm;
            margin-bottom: 1.5mm;
            flex-shrink: 0;
          }
          .lbl-footer {
            font-size: ${footerFontSize}px;
            font-weight: 600;
            text-align: ${alignment};
            letter-spacing: 0.3px;
            line-height: 1.2;
            word-break: break-word;
            flex-shrink: 0;
          }
          @media screen {
            body {
              background: #0f172a;
              padding: 24px;
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
              max-width: 520px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
              border: 1px solid #334155;
            }
            .print-btn-action {
              background: #0284c7;
              color: #ffffff;
              font-weight: bold;
              border: none;
              padding: 8px 18px;
              border-radius: 10px;
              cursor: pointer;
              font-size: 13px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              transition: background 0.15s;
            }
            .print-btn-action:hover {
              background: #0369a1;
            }
            .label-page {
              box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
              background: #ffffff;
              border-radius: 4px;
              border: 1px solid #cbd5e1;
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
            <div style="font-size: 11px; color: #94a3b8;">${items.length} Label &bull; ${paperWidthMm}x${paperHeightMm} mm (${orientation.toUpperCase()})</div>
          </div>
          <button class="print-btn-action" onclick="window.print()">
            &#128438; Buka Dialog Printer
          </button>
        </div>
        ${labelsHtml}
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 300);
          });
        </script>
      </body>
      </html>
    `;
  };

  // Eksekusi Print via Hidden Iframe (Mencegah Popup Blocker di browser)
  const handlePrint = () => {
    const items = getItemsToPrint();
    if (items.length === 0) {
      showToast('Perhatian', 'Tidak ada data teks untuk dicetak', 'info');
      return;
    }

    const htmlContent = generatePrintHtml(items);

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      showToast('Siap Cetak', `${items.length} label teks dikirim ke printer Honeywell PM42`, 'success');

      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 45000);
    }, 400);
  };

  // Eksekusi Print Preview Modal
  const handleOpenPrintPreview = () => {
    const items = getItemsToPrint();
    if (items.length === 0) {
      showToast('Perhatian', 'Tidak ada data teks untuk dicetak', 'info');
      return;
    }
    setShowPrintModal(true);
  };

  // Generate ZPL / Direct Protocol Command Script PM42
  const generateZplCode = (): string => {
    const items = getItemsToPrint();
    const dotsPerMm = 8; // 203 DPI = 8 dots/mm
    const labelWidthDots = paperWidthMm * dotsPerMm;
    const labelHeightDots = paperHeightMm * dotsPerMm;
    const topMarginDots = topMarginMm * dotsPerMm;

    let zplOutput = `^XA\n^PW${labelWidthDots}\n^LL${labelHeightDots}\n^LH0,0\n\n`;

    items.forEach((item, idx) => {
      zplOutput += `^FX --- LABEL ${idx + 1} ---\n`;
      if (item.header) {
        zplOutput += `^FO${sideMarginMm * dotsPerMm},${topMarginDots}^A0N,${headerFontSize * 2},${headerFontSize * 2}^FD${item.header}^FS\n`;
        zplOutput += `^FO${sideMarginMm * dotsPerMm},${topMarginDots + 30}^GB${labelWidthDots - (sideMarginMm * dotsPerMm * 2)},2,2^FS\n`;
      }

      // Body lines
      const bodyLines = item.body.split('\n');
      let currentY = topMarginDots + (item.header ? 50 : 20);
      bodyLines.forEach((line) => {
        zplOutput += `^FO${sideMarginMm * dotsPerMm},${currentY}^A0N,${fontSize * 2},${fontSize * 2}^FB${labelWidthDots - (sideMarginMm * dotsPerMm * 2)},1,0,${alignment === 'center' ? 'C' : alignment === 'right' ? 'R' : 'L'}^FD${line}^FS\n`;
        currentY += fontSize * 2 + 10;
      });

      if (item.footer) {
        zplOutput += `^FO${sideMarginMm * dotsPerMm},${labelHeightDots - 40}^A0N,${footerFontSize * 2},${footerFontSize * 2}^FD${item.footer}^FS\n`;
      }
      zplOutput += `^XZ\n\n^XA\n`;
    });

    zplOutput = zplOutput.replace(/\n\^XA\n$/, '');
    return zplOutput;
  };

  const handleCopyZpl = () => {
    const zpl = generateZplCode();
    navigator.clipboard.writeText(zpl);
    setCopiedZpl(true);
    showToast('Tersalin', 'Kode perintah cetak PM42 berhasil disalin ke clipboard', 'success');
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    if (mode === 'single') {
      setSingleHeader(tpl.header);
      setSingleBody(tpl.body);
      setSingleFooter(tpl.footer);
      setAlignment(tpl.align);
      setFontSize(tpl.fontSize);
      setFontWeight(tpl.weight);
      setBorderStyle(tpl.border);
      showToast('Template Diterapkan', `Template "${tpl.name}" berhasil dimuat`, 'success');
    } else {
      setBatchRawText(tpl.body);
      setBatchHeaderPrefix(tpl.header);
      setBatchFooterText(tpl.footer);
      setAlignment(tpl.align);
      setFontSize(tpl.fontSize);
      setFontWeight(tpl.weight);
      setBorderStyle(tpl.border);
      showToast('Template Diterapkan', `Template "${tpl.name}" diterapkan ke mode batch`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Modul */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Type size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Print Teks Label Honeywell PM42</h1>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Area Cetak PM42 80x100 mm
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cetak teks kustom multi-baris pada gulungan kertas label Honeywell PM42 yang terkalibrasi persis dengan area menu QR Code.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowZplModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Lihat kode perintah raw PM42"
            >
              <FileText size={14} />
              Command PM42
            </button>
            <button
              onClick={handleOpenPrintPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-300"
            >
              <Eye size={14} />
              Preview Layar
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
            >
              <Printer size={14} />
              Cetak ke PM42
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs (Single vs Batch) */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setMode('single')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Satuan (Single Text)
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'batch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Massal (Batch Baris)
              {batchItems.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
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
                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-md whitespace-nowrap transition-colors"
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
          
          {/* A. TEXT INPUT CARD */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                {mode === 'single' ? 'Input Teks Label Satuan' : 'Input Daftar Teks Massal (Batch)'}
              </h2>
              {mode === 'batch' && (
                <div className="flex items-center gap-2 text-xs">
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
              )}
            </div>

            {/* Optional Header Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul / Header Atas (Opsional)
              </label>
              <input
                type="text"
                value={mode === 'single' ? singleHeader : batchHeaderPrefix}
                onChange={(e) => mode === 'single' ? setSingleHeader(e.target.value) : setBatchHeaderPrefix(e.target.value)}
                placeholder="Contoh: STATUS QUALITY CONTROL atau PT KINO INDONESIA"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>

            {/* Main Body Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {mode === 'single' ? 'Teks Utama Label (Multi-baris)' : 'Daftar Teks (Satu baris = Satu label kertas PM42)'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {mode === 'single' 
                    ? `${singleBody.length} karakter · ${singleBody.split('\n').length} baris` 
                    : `${batchItems.length} label terdeteksi`}
                </span>
              </div>
              <textarea
                rows={mode === 'single' ? 6 : 9}
                value={mode === 'single' ? singleBody : batchRawText}
                onChange={(e) => mode === 'single' ? setSingleBody(e.target.value) : setBatchRawText(e.target.value)}
                placeholder={
                  mode === 'single'
                    ? 'Ketik isi teks label di sini...\nBisa menggunakan beberapa baris.\nSesuaikan ukuran font di panel bawah.'
                    : 'Ketik atau paste teks di sini:\nLOKASI RAK A-01-01\nLOKASI RAK A-01-02\nLOKASI RAK A-01-03'
                }
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 resize-y leading-relaxed"
              />
            </div>

            {/* Optional Footer Input & Copies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Footer / Keterangan Bawah (Opsional)
                </label>
                <input
                  type="text"
                  value={mode === 'single' ? singleFooter : batchFooterText}
                  onChange={(e) => mode === 'single' ? setSingleFooter(e.target.value) : setBatchFooterText(e.target.value)}
                  placeholder="Contoh: WH CIKEMBAR · LOGISTIK"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>

              {mode === 'single' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Lembar Salinan (Copies)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={singleCopies}
                      onChange={(e) => setSingleCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                    />
                    <span className="text-xs text-slate-500">lembar label PM42</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center h-full pt-6">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimestamp}
                      onChange={(e) => setIncludeTimestamp(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Sertakan tanggal cetak otomatis pada footer
                  </label>
                </div>
              )}
            </div>

            {mode === 'single' && (
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimestamp}
                    onChange={(e) => setIncludeTimestamp(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Sertakan tanggal cetak otomatis jika footer kosong
                </label>
              </div>
            )}
          </div>

          {/* B. FORMATTING & AREA CETAK PM42 CONTROLS */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              Format Teks & Area Kertas Honeywell PM42
            </h2>

            {/* Quick Size Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  Ukuran Huruf Teks Utama: <span className="text-blue-700 font-bold">{fontSize}px</span>
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Kecil', size: 16 },
                    { label: 'Sedang', size: 24 },
                    { label: 'Besar', size: 34 },
                    { label: 'Jumbo', size: 48 },
                    { label: 'Raksasa', size: 60 }
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setFontSize(p.size)}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
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

            {/* Alignment, Weight & Style Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {/* Text Align */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Perataan Teks
                </label>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setAlignment('left')}
                    className={`flex-1 p-2 flex justify-center transition-colors ${
                      alignment === 'left' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Kiri"
                  >
                    <AlignLeft size={15} />
                  </button>
                  <button
                    onClick={() => setAlignment('center')}
                    className={`flex-1 p-2 flex justify-center transition-colors ${
                      alignment === 'center' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Tengah"
                  >
                    <AlignCenter size={15} />
                  </button>
                  <button
                    onClick={() => setAlignment('right')}
                    className={`flex-1 p-2 flex justify-center transition-colors ${
                      alignment === 'right' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Rata Kanan"
                  >
                    <AlignRight size={15} />
                  </button>
                  <button
                    onClick={() => setAlignment('justify')}
                    className={`flex-1 p-2 flex justify-center transition-colors ${
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

              {/* Border Label */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Garis Tepi Label
                </label>
                <select
                  value={borderStyle}
                  onChange={(e) => setBorderStyle(e.target.value as LabelBorderStyle)}
                  className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="none">Tanpa Border</option>
                  <option value="thin">Border Tipis (1px)</option>
                  <option value="thick">Border Tebal (2.5px)</option>
                  <option value="dashed">Border Putus-putus</option>
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

            {/* PM42 Paper Margins & Orientation */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Orientation */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Orientasi Kertas PM42
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      orientation === 'landscape'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Landscape (100x80)
                  </button>
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      orientation === 'portrait'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Portrait (80x100)
                  </button>
                </div>
              </div>

              {/* Top Margin (Sensor Gap PM42) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Margin Atas: <span className="font-bold text-blue-700">{topMarginMm}mm</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Standar 10mm</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={topMarginMm}
                  onChange={(e) => setTopMarginMm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Side Margin */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Margin Samping: <span className="font-bold text-blue-700">{sideMarginMm}mm</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Default 4mm</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={sideMarginMm}
                  onChange={(e) => setSideMarginMm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Font Family Choice */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Gaya Font Teks:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontFamily('sans')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                    fontFamily === 'sans'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sans-Serif (Standar Jelas)
                </button>
                <button
                  onClick={() => setFontFamily('mono')}
                  className={`px-3 py-1 text-xs font-semibold font-mono rounded-md border ${
                    fontFamily === 'mono'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Monospace (Kode / Serial)
                </button>
              </div>
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
                  Pratinjau Kertas PM42 (80x100 mm)
                </h3>
                <span className="text-[11px] text-slate-500">
                  {paperWidthMm} x {paperHeightMm} mm · {orientation.toUpperCase()}
                </span>
              </div>

              {mode === 'batch' && batchItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setActivePreviewIndex(prev => Math.max(0, prev - 1))}
                    disabled={activePreviewIndex === 0}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
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
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                    title="Label Berikutnya"
                  >
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* SIMULASI FISIK KERTAS LABEL PM42 */}
            <div className="my-4 p-4 bg-slate-900/90 rounded-xl flex items-center justify-center overflow-hidden">
              <div
                style={{
                  width: `${paperWidthMm * 3.4}px`,
                  height: `${paperHeightMm * 3.4}px`,
                  paddingTop: `${topMarginMm * 3.4}px`,
                  paddingLeft: `${sideMarginMm * 3.4}px`,
                  paddingRight: `${sideMarginMm * 3.4}px`,
                  paddingBottom: `${3 * 3.4}px`,
                  fontFamily: fontFamily === 'mono' ? 'monospace' : 'sans-serif'
                }}
                className="bg-white text-black shadow-2xl rounded-xs flex flex-col justify-between transition-all duration-150 box-border relative overflow-hidden"
              >
                {/* Visual Label Border Box */}
                <div 
                  className={`w-full h-full flex flex-col justify-between p-2.5 box-border overflow-hidden ${
                    borderStyle === 'thin' ? 'border border-black' :
                    borderStyle === 'thick' ? 'border-2 border-black' :
                    borderStyle === 'dashed' ? 'border border-dashed border-black' : ''
                  }`}
                >
                  {/* Header */}
                  {currentPreviewItem.header && (
                    <div className="w-full flex-shrink-0">
                      <div 
                        style={{ 
                          fontSize: `${headerFontSize * 0.9}px`,
                          textAlign: alignment 
                        }} 
                        className="font-bold uppercase tracking-wider text-black line-clamp-2"
                      >
                        {currentPreviewItem.header}
                      </div>
                      <div className="w-full h-0 border-b border-black my-1" />
                    </div>
                  )}

                  {/* Body Text Utama */}
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

                  {/* Footer */}
                  {currentPreviewItem.footer && (
                    <div className="w-full flex-shrink-0">
                      <div className="w-full h-0 border-b border-black my-1" />
                      <div 
                        style={{ 
                          fontSize: `${footerFontSize * 0.9}px`,
                          textAlign: alignment 
                        }} 
                        className="font-semibold text-black tracking-wide truncate"
                      >
                        {currentPreviewItem.footer}
                      </div>
                    </div>
                  )}
                </div>

                {/* Indikator Sensor Gap PM42 di Pinggir */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400/20 border-b border-amber-500/30 text-[8px] text-amber-700 text-center font-mono select-none pointer-events-none">
                  Area Margin Sensor Atas ({topMarginMm}mm)
                </div>
              </div>
            </div>

            {/* Quick Summary Info */}
            <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span>Ukuran Kertas Label:</span>
                <span className="font-semibold text-slate-800">
                  {paperWidthMm} x {paperHeightMm} mm ({presetSizeText(paperWidthMm, paperHeightMm)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Label Siap Cetak:</span>
                <span className="font-bold text-blue-700">
                  {getItemsToPrint().length} Lembar Label
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Margin Sensor PM42:</span>
                <span className="font-medium text-slate-700">Top {topMarginMm}mm · Side {sideMarginMm}mm</span>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handlePrint}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Printer size={16} />
                Cetak {getItemsToPrint().length} Label Sekarang
              </button>

              <button
                onClick={handleOpenPrintPreview}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors text-xs border border-slate-200"
              >
                <Eye size={14} />
                Buka Jendela Fullscreen Preview
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 3. MODAL FULLSCREEN PRINT PREVIEW */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 text-white w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Printer size={16} className="text-blue-400" />
                  Pratinjau Hasil Cetak Honeywell PM42
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Menampilkan {getItemsToPrint().length} label ({paperWidthMm}x{paperHeightMm} mm) sesuai tata letak printer PM42 fisik.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Printer size={14} />
                  Cetak Sekarang
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable Label List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex flex-col items-center gap-6">
              {getItemsToPrint().map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Label {idx + 1} dari {getItemsToPrint().length}
                  </span>
                  <div
                    style={{
                      width: `${paperWidthMm * 3.2}px`,
                      height: `${paperHeightMm * 3.2}px`,
                      paddingTop: `${topMarginMm * 3.2}px`,
                      paddingLeft: `${sideMarginMm * 3.2}px`,
                      paddingRight: `${sideMarginMm * 3.2}px`,
                      paddingBottom: `${3 * 3.2}px`,
                      fontFamily: fontFamily === 'mono' ? 'monospace' : 'sans-serif'
                    }}
                    className="bg-white text-black rounded-xs shadow-xl flex flex-col justify-between box-border overflow-hidden"
                  >
                    <div 
                      className={`w-full h-full flex flex-col justify-between p-2 box-border overflow-hidden ${
                        borderStyle === 'thin' ? 'border border-black' :
                        borderStyle === 'thick' ? 'border-2 border-black' :
                        borderStyle === 'dashed' ? 'border border-dashed border-black' : ''
                      }`}
                    >
                      {item.header && (
                        <div className="w-full flex-shrink-0">
                          <div 
                            style={{ 
                              fontSize: `${headerFontSize * 0.9}px`,
                              textAlign: alignment 
                            }} 
                            className="font-bold uppercase tracking-wider text-black line-clamp-2"
                          >
                            {item.header}
                          </div>
                          <div className="w-full h-0 border-b border-black my-1" />
                        </div>
                      )}

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
                        {item.body.split('\n').map((line, lIdx) => (
                          <div key={lIdx} className="break-words">
                            {line || '\u00A0'}
                          </div>
                        ))}
                      </div>

                      {item.footer && (
                        <div className="w-full flex-shrink-0">
                          <div className="w-full h-0 border-b border-black my-1" />
                          <div 
                            style={{ 
                              fontSize: `${footerFontSize * 0.9}px`,
                              textAlign: alignment 
                            }} 
                            className="font-semibold text-black tracking-wide truncate"
                          >
                            {item.footer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL ZPL / DIRECT PROTOCOL COMMAND PM42 */}
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
                  Gunakan perintah ini untuk direct print via telnet/IP printer atau software barcode print.
                </p>
              </div>
              <button
                onClick={() => setShowZplModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
                {generateZplCode()}
              </pre>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Format: Zebra Programming Language (ZPL II) · 203 DPI PM42
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyZpl}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copiedZpl ? <Check size={14} /> : <Copy size={14} />}
                  {copiedZpl ? 'Berhasil Disalin!' : 'Salin Script'}
                </button>
                <button
                  onClick={() => setShowZplModal(false)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors"
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

function presetSizeText(w: number, h: number): string {
  if ((w === 100 && h === 80) || (w === 80 && h === 100)) {
    return 'Standar SN 8x10';
  }
  return `${w}x${h} mm`;
}
