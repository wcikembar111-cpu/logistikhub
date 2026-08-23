import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  QrCode,
  Printer,
  Download,
  Upload,
  Trash2,
  Plus,
  Search,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Sliders,
  ShieldCheck,
  ExternalLink,
  Layers,
  FileCode,
  CheckCircle2,
  X,
  Tag,
  Edit3,
  Sparkles
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useSupabase';
import { QrLabelItem, LabelPresetSize } from '../../types';

interface QrGeneratorHoneywellModuleProps {
  onExportBatchItems?: (items: any[]) => void;
}

// Preset Dimensions for Honeywell PM42 & Thermal Printers
const DIMENSIONS_MAP: Record<LabelPresetSize, { widthMm: number; heightMm: number; label: string; desc: string }> = {
  '100x80': { widthMm: 100, heightMm: 80, label: '100 x 80 mm', desc: 'Standar Honeywell PM42 Landscape (Default WMS)' },
  '80x100': { widthMm: 80, heightMm: 100, label: '80 x 100 mm', desc: 'Standar WMS Portrait' },
  '50x30': { widthMm: 50, heightMm: 30, label: '50 x 30 mm', desc: 'Label Rak / Bin Location' },
  '70x50': { widthMm: 70, heightMm: 50, label: '70 x 50 mm', desc: 'Label Karton / Outer Box' },
  '100x150': { widthMm: 100, heightMm: 150, label: '100 x 150 mm', desc: 'Label Pallet / Shipping Airwaybill' }
};

// Initial Sample Items matching the user's high-fidelity WMS logistics data
const INITIAL_SAMPLE_ITEMS: Omit<QrLabelItem, 'id' | 'dataUrl' | 'createdAt'>[] = [
  {
    itemCode: 'FG1571K.237.0',
    itemName: 'PIA100 BIG SIZE COKLAT 40G SCH',
    lpn: 'FGKINO-260721083640130427',
    batch: 'POC1696',
    ed: '17/06/2027'
  },
  {
    itemCode: 'FG1571K.237.0',
    itemName: 'PIA100 BIG SIZE COKLAT 40G SCH',
    lpn: 'FGKINO-260721083626810427',
    batch: 'POB1816',
    ed: '25/06/2027'
  },
  {
    itemCode: 'FG1571K.237.0',
    itemName: 'PIA100 BIG SIZE COKLAT 40G SCH',
    lpn: 'FGKINO-260721083712852427',
    batch: 'POB1706',
    ed: '18/06/2027'
  },
  {
    itemCode: 'FG1571K.237.0',
    itemName: 'PIA100 BIG SIZE COKLAT 40G SCH',
    lpn: 'FGKINO-260721083719264427',
    batch: 'POC1696',
    ed: '17/06/2027'
  },
  {
    itemCode: 'FG1571K.237.0',
    itemName: 'PIA100 ASSORTED 138G PCH REG',
    lpn: 'FGKINO-260717030214',
    batch: 'POC1696',
    ed: '17/06/2027'
  },
  {
    itemCode: 'FG1571K.237.0',
    itemName: 'PIA100 ASSORTED 138G PCH REG',
    lpn: 'FGKINO-260717025937',
    batch: 'POB1816',
    ed: '25/06/2027'
  }
];

export function QrGeneratorHoneywellModule({ onExportBatchItems }: QrGeneratorHoneywellModuleProps) {
  const { showToast } = useNotification();
  const { isAdmin } = useAuth();

  // Label Configuration & Geometrics
  const [labelSize, setLabelSize] = useState<LabelPresetSize>('100x80');
  const [qrSizeMm, setQrSizeMm] = useState<number>(38);
  const [leftMarginMm, setLeftMarginMm] = useState<number>(0);
  const [topMarginMm, setTopMarginMm] = useState<number>(0.5);
  const [showItemCode, setShowItemCode] = useState<boolean>(true);
  const [showItemName, setShowItemName] = useState<boolean>(true);
  const [showBatchInfo, setShowBatchInfo] = useState<boolean>(true);
  const [showEdInfo, setShowEdInfo] = useState<boolean>(true);
  const [orgHeader, setOrgHeader] = useState<string>('CKB LOGISTIK');
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  // Items State
  const [items, setItems] = useState<QrLabelItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals
  const [showBatchInputModal, setShowBatchInputModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRawScriptModal, setShowRawScriptModal] = useState(false);
  const [editingItem, setEditingItem] = useState<QrLabelItem | null>(null);

  // Batch input fields inside modal
  const [batchInputMode, setBatchInputMode] = useState<'wms-multi' | 'single'>('wms-multi');
  const [rawInputText, setRawInputText] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleCode, setSingleCode] = useState('');
  const [singleLpn, setSingleLpn] = useState('');
  const [singleBatch, setSingleBatch] = useState('');
  const [singleEd, setSingleEd] = useState('');
  const [autoPrefix, setAutoPrefix] = useState('');

  // Refs for printing
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentDimension = DIMENSIONS_MAP[labelSize] || DIMENSIONS_MAP['100x80'];

  // QR Code generator helper
  const generateQrDataUrl = async (text: string, ecLevel: 'L' | 'M' | 'Q' | 'H'): Promise<string> => {
    try {
      return await QRCode.toDataURL(text || 'EMPTY', {
        width: 600,
        margin: 1,
        errorCorrectionLevel: ecLevel,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('QR Code generation error:', err);
      return '';
    }
  };

  // Helper to load sample WMS data into input textarea (only when requested by user)
  const loadSampleWmsData = () => {
    const sampleRows = INITIAL_SAMPLE_ITEMS.map(
      (it) => `${it.itemCode}\t${it.itemName}\t1\tPCS\tBOX\tLOC-01\tA-01\t100\t50\tKG\t${it.lpn}\t${it.batch}\t2025-01-01\t2025-01-01\t${it.ed}`
    ).join('\n');
    setRawInputText(sampleRows);
    showToast('Data Contoh Dimuat', 'Data format WMS 15-kolom telah dimasukkan ke kotak input', 'info');
  };

  // -------------------------------------------------------------
  // 1. PARSER ENGINE (WMS 15-Kolom, CSV, Tab, Excel)
  // -------------------------------------------------------------
  const parseRawData = (text: string): Omit<QrLabelItem, 'id' | 'dataUrl' | 'createdAt'>[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsed: Omit<QrLabelItem, 'id' | 'dataUrl' | 'createdAt'>[] = [];

    const isHeaderLine = (line: string): boolean => {
      const lower = line.toLowerCase();
      return (
        (lower.includes('item code') || lower.includes('kode barang') || lower.includes('material')) &&
        (lower.includes('name') || lower.includes('lpn') || lower.includes('serial') || lower.includes('batch'))
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && isHeaderLine(line)) continue;

      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map(c => c.trim());
      } else if (line.includes('|')) {
        cols = line.split('|').map(c => c.trim());
      } else if (line.includes(';')) {
        cols = line.split(';').map(c => c.trim());
      } else if (line.includes(',')) {
        cols = line.split(',').map(c => c.trim());
      } else {
        cols = [line.trim()];
      }

      // Check WMS 15 columns (Col 1=Code, 2=Name, 11=LPN, 12=Batch, 15=ED)
      if (cols.length >= 11) {
        const itemCode = cols[0] || '';
        const itemName = cols[1] || '';
        let lpn = cols[10] || '';
        const batch = cols[11] || '';
        const ed = cols[14] || cols[13] || '';

        if (autoPrefix && lpn && !lpn.startsWith(autoPrefix)) {
          lpn = `${autoPrefix}${lpn}`;
        }

        if (lpn || itemCode || itemName) {
          parsed.push({
            itemCode: itemCode || '-',
            itemName: itemName || 'LOGISTICS ITEM',
            lpn: lpn || itemCode,
            batch: batch || '-',
            ed: ed || '-'
          });
        }
      } else if (cols.length >= 4) {
        let lpn = cols[2] || cols[0];
        if (autoPrefix && lpn && !lpn.startsWith(autoPrefix)) {
          lpn = `${autoPrefix}${lpn}`;
        }
        parsed.push({
          itemCode: cols[0] || '-',
          itemName: cols[1] || 'ITEM BARANG',
          lpn: lpn,
          batch: cols[3] || '-',
          ed: cols[4] || '-'
        });
      } else if (cols.length === 2 || cols.length === 3) {
        let lpn = cols[1] || cols[0];
        if (autoPrefix && lpn && !lpn.startsWith(autoPrefix)) {
          lpn = `${autoPrefix}${lpn}`;
        }
        parsed.push({
          itemCode: cols[0].length <= 16 && /^[A-Z0-9_.-]+$/i.test(cols[0]) ? cols[0] : '-',
          itemName: cols[0] || 'LABEL BARANG',
          lpn: lpn,
          batch: cols[2] || '-',
          ed: '-'
        });
      } else if (cols.length === 1 && cols[0]) {
        let lpn = cols[0];
        if (autoPrefix && !lpn.startsWith(autoPrefix)) {
          lpn = `${autoPrefix}${lpn}`;
        }
        parsed.push({
          itemCode: '-',
          itemName: lpn,
          lpn: lpn,
          batch: '-',
          ed: '-'
        });
      }
    }

    return parsed;
  };

  const handleProcessBatchInput = async () => {
    setIsProcessing(true);
    try {
      if (batchInputMode === 'single') {
        if (!singleLpn.trim() && !singleName.trim()) {
          showToast('Peringatan', 'Masukkan Nama Barang atau Nilai LPN', 'warning');
          setIsProcessing(false);
          return;
        }

        const lpn = singleLpn.trim() || singleName.trim();
        const finalLpn = autoPrefix && !lpn.startsWith(autoPrefix) ? `${autoPrefix}${lpn}` : lpn;
        const dataUrl = await generateQrDataUrl(finalLpn, errorCorrectionLevel);

        const newItem: QrLabelItem = {
          id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          itemCode: singleCode.trim() || '-',
          itemName: singleName.trim() || finalLpn,
          lpn: finalLpn,
          batch: singleBatch.trim() || '-',
          ed: singleEd.trim() || '-',
          dataUrl,
          createdAt: Date.now()
        };

        setItems(prev => [newItem, ...prev]);
        setShowBatchInputModal(false);
        setSingleName('');
        setSingleCode('');
        setSingleLpn('');
        setSingleBatch('');
        setSingleEd('');
        showToast('Berhasil', '1 QR Code baru berhasil dibuat', 'success');
      } else {
        if (!rawInputText.trim()) {
          showToast('Peringatan', 'Silakan tempel data teks terlebih dahulu', 'warning');
          setIsProcessing(false);
          return;
        }

        const rawRows = parseRawData(rawInputText);
        if (rawRows.length === 0) {
          showToast('Info', 'Tidak ada baris data valid yang ditemukan', 'info');
          setIsProcessing(false);
          return;
        }

        const generatedItems: QrLabelItem[] = [];
        for (const row of rawRows) {
          const id = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const dataUrl = await generateQrDataUrl(row.lpn, errorCorrectionLevel);
          generatedItems.push({
            ...row,
            id,
            dataUrl,
            createdAt: Date.now()
          });
        }

        setItems(prev => [...generatedItems, ...prev]);
        setRawInputText('');
        setShowBatchInputModal(false);
        showToast('Berhasil', `Berhasil menambahkan ${generatedItems.length} label QR Code`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal', 'Terjadi kesalahan saat memproses QR Code', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    if (fileExt === 'xlsx' || fileExt === 'xls') {
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          setRawInputText(csvText);
          showToast('File Terbaca', `Berhasil membaca sheet "${firstSheetName}" (${file.name})`, 'success');
        } catch (err) {
          console.error(err);
          showToast('Gagal Membaca File', 'File Excel tidak valid atau rusak', 'danger');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setRawInputText(text || '');
        showToast('File Terbaca', `Berhasil memuat file teks "${file.name}"`, 'success');
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -------------------------------------------------------------
  // 2. PRINTING ENGINE (HONEYWELL PM42 THERMAL 203 DPI)
  // -------------------------------------------------------------
  const buildPrintHtmlDocument = (targets: QrLabelItem[]) => {
    const { widthMm, heightMm } = currentDimension;

    const cardsHtml = targets.map((item) => {
      return `
        <div class="label-page">
          <!-- Zone 1: Header -->
          <div class="label-header">
            <div class="org-badge">${orgHeader || 'CKB LOGISTIK'}</div>
            ${showItemCode && item.itemCode && item.itemCode !== '-' ? `<div class="item-code">${item.itemCode}</div>` : ''}
            ${showItemName ? `<div class="item-name">${item.itemName}</div>` : ''}
          </div>

          <!-- Zone 2: QR Code Body -->
          <div class="label-body">
            <img src="${item.dataUrl}" alt="QR" class="qr-image" />
          </div>

          <!-- Zone 3: Footer Stack -->
          <div class="label-footer">
            <div class="sn-line">SN/LPN: ${item.lpn}</div>
            <div class="meta-line">
              ${showBatchInfo && item.batch && item.batch !== '-' ? `<span>BATCH: ${item.batch}</span>` : '<span></span>'}
              ${showEdInfo && item.ed && item.ed !== '-' ? `<span>EXP: ${item.ed}</span>` : '<span></span>'}
            </div>
          </div>
        </div>
      `;
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cetak Label Termal Honeywell PM42</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm !important;
    }
    @page :first {
      margin: 0mm !important;
    }
    @page :left {
      margin: 0mm !important;
    }
    @page :right {
      margin: 0mm !important;
    }
    *, *:before, *:after {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: ${widthMm}mm !important;
      min-width: ${widthMm}mm !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Univers", Arial, sans-serif !important;
      text-rendering: optimizeLegibility !important;
      -webkit-font-smoothing: antialiased !important;
      overflow: hidden !important;
    }
    .label-page {
      width: ${widthMm}mm !important;
      height: ${heightMm}mm !important;
      max-width: ${widthMm}mm !important;
      max-height: ${heightMm}mm !important;
      page-break-after: always !important;
      page-break-inside: avoid !important;
      break-after: page !important;
      break-inside: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      align-items: stretch !important;
      padding-top: ${topMarginMm}mm !important;
      padding-bottom: 1mm !important;
      padding-left: ${leftMarginMm}mm !important;
      padding-right: 1mm !important;
      margin: 0 !important;
      margin-left: 0 !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .label-header {
      width: 100% !important;
      text-align: center !important;
      border-bottom: 2px solid #000000 !important;
      padding-bottom: 1.2mm !important;
      margin-bottom: 1mm !important;
    }
    .org-badge {
      font-size: 8.5pt !important;
      font-weight: 900 !important;
      letter-spacing: 0.8px !important;
      text-transform: uppercase !important;
      line-height: 1.2 !important;
    }
    .item-code {
      font-size: 9.5pt !important;
      font-weight: 900 !important;
      font-family: monospace, "Courier New", Courier !important;
      margin-top: 0.5mm !important;
      letter-spacing: 0.5px !important;
      line-height: 1.2 !important;
    }
    .item-name {
      font-size: 8pt !important;
      font-weight: 800 !important;
      line-height: 1.15 !important;
      margin-top: 0.5mm !important;
      text-transform: uppercase !important;
      word-break: break-word !important;
    }
    .label-body {
      flex: 1 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0.5mm 0 !important;
      width: 100% !important;
      overflow: hidden !important;
    }
    .qr-image {
      width: ${qrSizeMm}mm !important;
      height: ${qrSizeMm}mm !important;
      max-height: calc(${heightMm}mm - 38mm) !important;
      max-width: 100% !important;
      object-fit: contain !important;
      image-rendering: pixelated !important;
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
    }
    .label-footer {
      width: 100% !important;
      border-top: 2px solid #000000 !important;
      padding-top: 1.2mm !important;
      margin-top: 1mm !important;
      text-align: center !important;
    }
    .sn-line {
      font-family: monospace, "Courier New", Courier !important;
      font-size: 8.5pt !important;
      font-weight: 900 !important;
      letter-spacing: 0.3px !important;
      word-break: break-all !important;
      line-height: 1.2 !important;
    }
    .meta-line {
      display: flex !important;
      justify-content: space-between !important;
      padding: 0 1mm !important;
      font-family: monospace, "Courier New", Courier !important;
      font-size: 7.5pt !important;
      font-weight: 900 !important;
      margin-top: 0.5mm !important;
      line-height: 1.2 !important;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }
      .label-page {
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        border: 1px dashed #94a3b8;
      }
    }
  </style>
</head>
<body>
  ${cardsHtml}
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
  };

  const executeDirectPrint = (targets: QrLabelItem[]) => {
    if (targets.length === 0) {
      showToast('Peringatan', 'Tidak ada label untuk dicetak', 'warning');
      return;
    }

    const htmlContent = buildPrintHtmlDocument(targets);

    // Channel 1: Window Popup
    try {
      const printWindow = window.open('', '_blank', 'width=850,height=700');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        showToast('Mencetak', `Mengirim ${targets.length} label ke printer Honeywell PM42`, 'success');
        return;
      }
    } catch (e) {
      console.warn('Popup print blocked, switching to Iframe fallback channel', e);
    }

    // Channel 2: Hidden Iframe Fallback
    try {
      if (printIframeRef.current) {
        const doc = printIframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
          setTimeout(() => {
            printIframeRef.current?.contentWindow?.focus();
            printIframeRef.current?.contentWindow?.print();
          }, 350);
          showToast('Mencetak', `Mencetak ${targets.length} label via fallback channel`, 'info');
        }
      }
    } catch (err) {
      console.error(err);
      window.print();
    }
  };

  const handlePrintSingle = (item: QrLabelItem) => {
    executeDirectPrint([item]);
  };

  const handlePrintAll = () => {
    if (filteredItems.length === 0) {
      showToast('Peringatan', 'Tidak ada data label untuk dicetak', 'warning');
      return;
    }
    executeDirectPrint(filteredItems);
  };

  // -------------------------------------------------------------
  // 3. DIGITAL EXPORTS (ZIP & EXCEL)
  // -------------------------------------------------------------
  const handleDownloadSinglePng = (item: QrLabelItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    const safeName = (item.itemName || item.lpn).replace(/[^a-z0-9]/gi, '_').substring(0, 30).toLowerCase();
    link.download = `qr_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sukses', `QR Code "${item.itemName}" berhasil diunduh`, 'success');
  };

  const handleDownloadZip = async () => {
    if (filteredItems.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("qrcode_honeywell_massal");

      filteredItems.forEach((item, idx) => {
        const base64Data = item.dataUrl.replace(/^data:image\/png;base64,/, "");
        const safeName = (item.itemName || item.lpn).replace(/[^a-z0-9]/gi, '_').substring(0, 30).toLowerCase();
        folder?.file(`${idx + 1}_${safeName}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `qrcode_batch_${filteredItems.length}_items_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Sukses', `Berhasil mengunduh ${filteredItems.length} QR Code dalam format ZIP`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal', 'Gagal membuat file ZIP', 'danger');
    } finally {
      setIsZipping(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      showToast('Peringatan', 'Tidak ada data untuk diekspor', 'warning');
      return;
    }

    const exportData = filteredItems.map((item, idx) => ({
      'No': idx + 1,
      'Item Code': item.itemCode,
      'Item Name': item.itemName,
      'LPN / Isi QR Code': item.lpn,
      'Batch No': item.batch,
      'Exp Date': item.ed,
      'Ukuran Label': currentDimension.label
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QR_Code_Honeywell');
    XLSX.writeFile(wb, `QR_Code_Batch_${Date.now()}.xlsx`);
    showToast('Ekspor Excel', 'Data berhasil diekspor ke Excel (.xlsx)', 'success');
  };

  const handleCopyLpn = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Tersalin', 'Nilai LPN berhasil disalin', 'success');
  };

  const handleDeleteItem = (id: string) => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hapus label QR Code khusus untuk Admin.', 'danger');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    showToast('Dihapus', 'Label berhasil dihapus', 'info');
  };

  const handleClearAll = () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Kosongkan daftar label QR khusus untuk Admin.', 'danger');
      return;
    }
    if (items.length === 0) return;
    if (window.confirm('Hapus semua label dari daftar antrean?')) {
      setItems([]);
      showToast('Bersih', 'Semua label berhasil dihapus', 'info');
    }
  };

  const handleSaveEdit = async (updated: QrLabelItem) => {
    const nextUrl = await generateQrDataUrl(updated.lpn, errorCorrectionLevel);
    setItems(prev => prev.map(item => item.id === updated.id ? { ...updated, dataUrl: nextUrl } : item));
    setEditingItem(null);
    showToast('Tersimpan', 'Data label berhasil diperbarui', 'success');
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      i =>
        i.itemName.toLowerCase().includes(q) ||
        i.lpn.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        i.batch.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      {/* Hidden Iframe for Direct Printing Fallback */}
      <iframe
        ref={printIframeRef}
        title="Print Fallback Iframe"
        className="hidden"
        style={{ position: 'fixed', right: '100%', bottom: '100%', width: 0, height: 0, border: 0 }}
      />

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.txt,.csv"
        className="hidden"
      />

      {/* ============================================================ */}
      {/* TOP HEADER TOOLBAR (CLEAN, LIGHTWEIGHT & MODERN) */}
      {/* ============================================================ */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs text-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-700 shadow-2xs">
              <QrCode size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold m-0 text-slate-900 tracking-tight">
                  Generator QR Code & Cetak Honeywell PM42
                </h3>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {filteredItems.length} Item
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Pencetakan stiker termal presisi 203 DPI, scanner-ready, dan ekspor instan
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBatchInputModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              <Plus size={15} />
              <span>Tambah / Edit Batch</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Pengaturan Ukuran Label & Header"
            >
              <Sliders size={14} />
              <span className="hidden sm:inline">Ukuran: {currentDimension.label}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={filteredItems.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Cetak Semua Stiker ke Printer Honeywell PM42"
            >
              <Printer size={15} />
              <span>Cetak Honeywell PM42</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={filteredItems.length === 0 || isZipping}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Download size={15} />
              <span>{isZipping ? 'Membuat ZIP...' : 'Unduh ZIP'}</span>
            </button>

            {isAdmin && items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer ml-1"
                title="Sembunyikan / Kosongkan Hasil (Admin)"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Search bar & Secondary tools */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari dari ${items.length} QR Code...`}
              className="w-full bg-slate-50 hover:bg-white text-slate-800 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRawScriptModal(true)}
              disabled={filteredItems.length === 0}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
            >
              <FileCode size={13} className="text-amber-600" />
              <span>Script DP / ZPL</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD GRID VIEW (DIRECTLY SCANNABLE ON-SCREEN & INSTANT PRINT) */}
      {/* ============================================================ */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200 shadow-2xs space-y-3">
          <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-700 mx-auto flex items-center justify-center border border-blue-100">
            <QrCode size={26} />
          </div>
          <h4 className="text-base font-bold text-slate-800 m-0">
            {items.length === 0 ? 'Belum Ada Data Label QR Code' : 'Tidak Ada Label yang Cocok'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {items.length === 0
              ? 'Mulai dengan klik Tambah / Edit Batch untuk menempel data 15-kolom WMS, file Excel/CSV, atau membuat label satuan.'
              : `Pencarian "${searchQuery}" tidak menemukan item yang cocok.`}
          </p>
          <button
            type="button"
            onClick={() => {
              if (items.length === 0) {
                setShowBatchInputModal(true);
              } else {
                setSearchQuery('');
              }
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            {items.length === 0 ? <Plus size={14} /> : <RefreshCw size={14} />}
            <span>{items.length === 0 ? 'Tambah / Edit Batch Data' : 'Reset Pencarian'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-8">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white p-4 !rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col items-center justify-between text-center relative group"
            >
              {/* Badge Number */}
              <span className="absolute top-3 left-3 bg-slate-50 text-slate-500 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                #{idx + 1}
              </span>

              {/* Edit / Delete quick buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="Edit Data Baris"
                >
                  <Edit3 size={13} />
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Hapus Label Ini (Admin)"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* QR Image Container - Big, Crisp & Directly Scannable */}
              <div className="w-full flex justify-center mt-3 mb-2 p-2.5 bg-slate-50/60 rounded-xl border border-slate-200 group-hover:border-blue-300 transition-colors">
                <img
                  src={item.dataUrl}
                  alt={item.itemName || item.lpn}
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded"
                />
              </div>

              {/* QR Code Text / Label Section */}
              <div className="w-full my-2 space-y-1.5 text-left px-0.5">
                {/* Item Name / Title */}
                <div
                  className="font-bold text-xs text-slate-900 truncate"
                  title={item.itemName}
                >
                  {item.itemName || 'ITEM BARANG'}
                </div>

                {/* Monospaced LPN Container */}
                <div
                  className="font-mono font-bold text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all leading-relaxed"
                  title={item.lpn}
                >
                  {item.lpn}
                </div>

                {/* Optional Metadata Row (Item Code, Batch, ED) */}
                {(item.batch !== '-' || item.ed !== '-' || (item.itemCode && item.itemCode !== '-')) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5 px-0.5">
                    {item.batch !== '-' && <span>B: {item.batch}</span>}
                    {item.ed !== '-' && <span>EXP: {item.ed}</span>}
                  </div>
                )}
              </div>

              {/* Card Actions: Salin, Cetak Stiker, PNG */}
              <div className="w-full flex items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopyLpn(item.lpn, item.id)}
                  className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Salin Nilai LPN ke Clipboard"
                >
                  {copiedId === item.id ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copiedId === item.id ? 'Tersalin' : 'Salin'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintSingle(item)}
                  className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-emerald-200 shadow-2xs active:scale-95"
                  title="Cetak Stiker ke Printer Honeywell PM42"
                >
                  <Printer size={13} />
                  <span>Cetak Stiker</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSinglePng(item)}
                  className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-blue-200 shadow-2xs active:scale-95 ml-auto"
                  title="Unduh Gambar PNG"
                >
                  <Download size={13} />
                  <span>PNG</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: TAMBAH / EDIT BATCH (WMS 15-KOLOM & EXCEL) */}
      {/* ============================================================ */}
      {showBatchInputModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white p-5 sm:p-6 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 relative max-h-[92vh] flex flex-col overflow-hidden text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 m-0">Tambah / Edit Batch QR Code</h3>
                  <p className="text-xs text-slate-500 m-0">Mendukung format WMS 15-kolom, tabulasi Excel, dan input satuan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchInputModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 custom-scrollbar">
              {/* Mode Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setBatchInputMode('wms-multi')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    batchInputMode === 'wms-multi' ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Layers size={14} />
                  <span>Format Massal / WMS 15-Kolom</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBatchInputMode('single')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    batchInputMode === 'single' ? 'bg-white text-blue-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <QrCode size={14} />
                  <span>Input QR Satuan</span>
                </button>
              </div>

              {/* Prefix Option */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auto-Prefix Nilai LPN (Opsional):
                  </label>
                  <input
                    type="text"
                    value={autoPrefix}
                    onChange={(e) => setAutoPrefix(e.target.value)}
                    placeholder="Contoh: FGKINO- atau LPN-"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Error Correction Level:
                  </label>
                  <select
                    value={errorCorrectionLevel}
                    onChange={(e) => setErrorCorrectionLevel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    <option value="L">Level L (7% Recovery - Densitas Rendah)</option>
                    <option value="M">Level M (15% Recovery - Standar Industri)</option>
                    <option value="Q">Level Q (25% Recovery - Kualitas Tinggi)</option>
                    <option value="H">Level H (30% Recovery - Maksimal)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Row WMS Input */}
              {batchInputMode === 'wms-multi' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-700">
                      Tempel Data Tabel WMS / Salinan Excel (1 Baris per Label):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadSampleWmsData}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold hover:bg-orange-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles size={12} />
                        <span>Contoh WMS 15 Kolom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Upload size={12} />
                        <span>Upload Excel/CSV</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={rawInputText}
                    onChange={(e) => setRawInputText(e.target.value)}
                    placeholder="Tempel baris data WMS (Kolom 1: Item Code, Kolom 2: Nama Barang, Kolom 11: LPN, Kolom 12: Batch, Kolom 15: ED)..."
                    className="w-full p-3 font-mono text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 m-0">
                    Otomatis mengenali delimiter Tabulasi Excel, Pipe (|), Titik Koma (;), dan Koma (,).
                  </p>
                </div>
              ) : (
                /* Single QR Form */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Barang / Label: *
                    </label>
                    <input
                      type="text"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="Contoh: PIA100 BIG SIZE COKLAT 40G SCH"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nilai LPN / Isi QR Code: *
                    </label>
                    <input
                      type="text"
                      value={singleLpn}
                      onChange={(e) => setSingleLpn(e.target.value)}
                      placeholder="Contoh: FGKINO-260721083640130427"
                      className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kode Item / SKU:
                    </label>
                    <input
                      type="text"
                      value={singleCode}
                      onChange={(e) => setSingleCode(e.target.value)}
                      placeholder="Contoh: FG1571K.237.0"
                      className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor Batch:
                    </label>
                    <input
                      type="text"
                      value={singleBatch}
                      onChange={(e) => setSingleBatch(e.target.value)}
                      placeholder="Contoh: POC1696"
                      className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Expired Date (ED):
                    </label>
                    <input
                      type="text"
                      value={singleEd}
                      onChange={(e) => setSingleEd(e.target.value)}
                      placeholder="Contoh: 17/06/2027"
                      className="w-full px-3 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setShowBatchInputModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessBatchInput}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Generate ke Card Grid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: PENGATURAN UKURAN LABEL & HONEYWELL PM42 */}
      {/* ============================================================ */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white p-5 sm:p-6 rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 relative text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shadow-2xs">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 m-0">Pengaturan Cetak Honeywell PM42</h3>
                  <p className="text-xs text-slate-500 m-0">Konfigurasi geometri thermal stiker (203 DPI / 8 dots·mm)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Presets Grid */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Pilih Ukuran Label / Kertas Thermal:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(DIMENSIONS_MAP) as LabelPresetSize[]).map((key) => {
                    const preset = DIMENSIONS_MAP[key];
                    const isSelected = labelSize === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setLabelSize(key);
                          if (key === '100x80') setQrSizeMm(38);
                          else if (key === '80x100') setQrSizeMm(42);
                          else if (key === '70x50') setQrSizeMm(26);
                          else if (key === '50x30') setQrSizeMm(16);
                          else if (key === '100x150') setQrSizeMm(55);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{preset.label}</span>
                          {isSelected && <Check size={14} className="text-emerald-600" />}
                        </div>
                        <span className="text-[11px] text-slate-500 font-normal">{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Offset & Position Calibration (Mempet Kiri) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders size={13} className="text-blue-600" />
                    <span>Kalibrasi Posisi Cetak (Mempet Kiri)</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                    {leftMarginMm === 0 ? '0 mm (Flush Left / Mempet)' : `${leftMarginMm} mm`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span>Margin Kiri (Offset X):</span>
                      <span className="font-mono font-bold text-slate-900">{leftMarginMm} mm</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setLeftMarginMm(val)}
                          className={`flex-1 py-1 text-[11px] rounded font-bold border transition-colors cursor-pointer ${
                            leftMarginMm === val
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {val === 0 ? '0mm (Pas)' : `${val}mm`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span>Margin Atas (Offset Y):</span>
                      <span className="font-mono font-bold text-slate-900">{topMarginMm} mm</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 0.5, 1, 2].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTopMarginMm(val)}
                          className={`flex-1 py-1 text-[11px] rounded font-bold border transition-colors cursor-pointer ${
                            topMarginMm === val
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {val}mm
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Org */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Organisasi / Header Stiker:
                </label>
                <input
                  type="text"
                  value={orgHeader}
                  onChange={(e) => setOrgHeader(e.target.value)}
                  placeholder="Contoh: CKB LOGISTIK"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-600 outline-none font-bold"
                />
              </div>

              {/* Size Slider */}
              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Ukuran Dimensi QR Code:</span>
                  <span className="text-emerald-700 font-mono">{qrSizeMm} mm</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={55}
                  value={qrSizeMm}
                  onChange={(e) => setQrSizeMm(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Honeywell PM42 Print Dialog Best Practice Tips */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-slate-700 space-y-1">
                <div className="font-bold text-blue-900 text-[11px] flex items-center gap-1.5">
                  <Printer size={13} />
                  <span>Petunjuk Dialog Cetak Browser (Agar Tidak Terpotong):</span>
                </div>
                <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5 m-0">
                  <li><strong>Margins / Margin:</strong> Pilih <em>None / Tidak Ada (0)</em></li>
                  <li><strong>Headers & Footers:</strong> <em>Hapus centang / Nonaktifkan</em></li>
                  <li><strong>Ukuran Kertas:</strong> Pilih sesuai ukuran stiker ({currentDimension.label})</li>
                </ul>
              </div>

              {/* Checkboxes */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showItemCode}
                    onChange={(e) => setShowItemCode(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Tampilkan Kode Item</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showItemName}
                    onChange={(e) => setShowItemName(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Tampilkan Nama Barang</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBatchInfo}
                    onChange={(e) => setShowBatchInfo(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Tampilkan Nomor Batch</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEdInfo}
                    onChange={(e) => setShowEdInfo(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Tampilkan Expired Date</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  handlePrintAll();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Simpan & Cetak Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: INLINE ITEM EDIT */}
      {/* ============================================================ */}
      {editingItem && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white p-5 sm:p-6 rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 relative text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 m-0">Edit Data Label QR</h3>
                  <p className="text-xs text-slate-500 m-0">Perbarui informasi teks dan barcode label</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang:</label>
                <input
                  type="text"
                  value={editingItem.itemName}
                  onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nilai LPN / Isi QR Code:</label>
                <input
                  type="text"
                  value={editingItem.lpn}
                  onChange={(e) => setEditingItem({ ...editingItem, lpn: e.target.value })}
                  className="w-full px-3 py-2 font-mono bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Item:</label>
                  <input
                    type="text"
                    value={editingItem.itemCode}
                    onChange={(e) => setEditingItem({ ...editingItem, itemCode: e.target.value })}
                    className="w-full px-2.5 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch:</label>
                  <input
                    type="text"
                    value={editingItem.batch}
                    onChange={(e) => setEditingItem({ ...editingItem, batch: e.target.value })}
                    className="w-full px-2.5 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exp Date:</label>
                  <input
                    type="text"
                    value={editingItem.ed}
                    onChange={(e) => setEditingItem({ ...editingItem, ed: e.target.value })}
                    className="w-full px-2.5 py-2 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(editingItem)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: RAW PROTOCOL SCRIPTS (DP & ZPL) */}
      {/* ============================================================ */}
      {showRawScriptModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white p-5 sm:p-6 rounded-2xl max-w-2xl w-full shadow-xl border border-slate-200 relative text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shadow-2xs">
                  <FileCode size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 m-0">Native Machine Print Commands</h3>
                  <p className="text-xs text-slate-500 m-0">Honeywell Direct Protocol (.dp) & Zebra ZPL II (.zpl)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRawScriptModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed m-0">
                Gunakan berkas script ini jika Anda menghubungkan printer Honeywell PM42 melalui Serial COM Port, Raw Socket TCP/IP Port 9100, atau Print Server.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs m-0">Honeywell Direct Protocol (.dp)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 m-0">Bahasa native printer Honeywell PM42 / Intermec.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const { widthMm, heightMm } = currentDimension;
                      const widthDots = Math.round(widthMm * 8);
                      const heightDots = Math.round(heightMm * 8);
                      const commands = [
                        `CLL`,
                        `OPTIMIZE "BATCH" ON`,
                        `MEDIA TYPE "LABEL WITH GAPS"`,
                        `MEDIA SIZE ${widthDots} DOTS, ${heightDots} DOTS`,
                        ...filteredItems.map(item => `CLL\nFONT "UniversBold", 11\nPP 30, 40\nPT "${item.itemName}"\nBARCODE "QR", 5, 2, 4\nPP 280, 160\nPB "${item.lpn}"\nFONT "Monospace", 10\nPP 100, 520\nPT "SN: ${item.lpn}"\nPF 1`)
                      ].join('\n');
                      const blob = new Blob([commands], { type: 'text/plain;charset=utf-8' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `Honeywell_PM42_${Date.now()}.dp`;
                      link.click();
                      showToast('DP Diunduh', 'File .dp berhasil diunduh', 'success');
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={13} />
                    <span>Unduh File .dp</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs m-0">Zebra ZPL II / ZSim (.zpl)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 m-0">Emulasi ZSim Zebra pada Honeywell PM42.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const { widthMm, heightMm } = currentDimension;
                      const widthDots = Math.round(widthMm * 8);
                      const heightDots = Math.round(heightMm * 8);
                      const commands = filteredItems.map(item => `^XA\n^PW${widthDots}\n^LL${heightDots}\n^FO30,30^A0N,24,24^FD${item.itemName}^FS\n^FO260,140^BQN,2,5,Q,7^FDMA,${item.lpn}^FS\n^FO60,500^A0N,22,22^FDSN: ${item.lpn}^FS\n^PQ1,0,1,Y\n^XZ`).join('\n');
                      const blob = new Blob([commands], { type: 'text/plain;charset=utf-8' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `ZSim_ZPL_PM42_${Date.now()}.zpl`;
                      link.click();
                      showToast('ZPL Diunduh', 'File .zpl berhasil diunduh', 'success');
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={13} />
                    <span>Unduh File .zpl</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowRawScriptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
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
