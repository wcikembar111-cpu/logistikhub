import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Download, Printer, Trash2, Search, Copy, Check, QrCode, Sliders, X, Tag, ExternalLink } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export interface QrItem {
  id: string;
  label: string;
  value: string;
  dataUrl: string;
}

interface BatchQrSectionProps {
  items: QrItem[];
  onClear: () => void;
  onOpenModal: () => void;
}

const THERMAL_SIZES = {
  '100x80': { widthMm: 100, heightMm: 80, qrMm: 38, label: '100 x 80 mm (Honeywell PM42 Landscape)' },
  '80x100': { widthMm: 80, heightMm: 100, qrMm: 38, label: '80 x 100 mm (WMS Portrait)' },
  '50x30': { widthMm: 50, heightMm: 30, qrMm: 20, label: '50 x 30 mm (Rak / Bin)' },
  '70x50': { widthMm: 70, heightMm: 50, qrMm: 28, label: '70 x 50 mm (Karton / Box)' },
  '100x150': { widthMm: 100, heightMm: 150, qrMm: 45, label: '100 x 150 mm (Pallet / Ekspedisi)' }
};

export function BatchQrSection({ items, onClear, onOpenModal }: BatchQrSectionProps) {
  const { showToast } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Printing State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [labelSize, setLabelSize] = useState<keyof typeof THERMAL_SIZES>('100x80');
  const [orgHeader, setOrgHeader] = useState('CKB LOGISTIK');
  const [showItemLabel, setShowItemLabel] = useState(true);
  const [showItemValue, setShowItemValue] = useState(true);

  // Hidden print iframe
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  if (!items || items.length === 0) return null;

  const filteredItems = items.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadSingle = (item: QrItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    const safeName = (item.label || item.value).replace(/[^a-z0-9]/gi, '_').substring(0, 30).toLowerCase();
    link.download = `qrcode_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sukses', `QR Code "${item.label}" berhasil diunduh`, 'success');
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Tersalin', 'Teks QR Code berhasil disalin', 'success');
  };

  const handleDownloadZip = async () => {
    if (items.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("qrcode_massal");

      items.forEach((item, idx) => {
        const base64Data = item.dataUrl.replace(/^data:image\/png;base64,/, "");
        const safeName = (item.label || item.value).replace(/[^a-z0-9]/gi, '_').substring(0, 30).toLowerCase();
        folder?.file(`${idx + 1}_${safeName}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `qrcode_batch_${items.length}_items_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Sukses', `Berhasil mengunduh ${items.length} QR Code dalam format ZIP`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal', 'Gagal membuat file ZIP', 'danger');
    } finally {
      setIsZipping(false);
    }
  };

  // -------------------------------------------------------------
  // DUAL-CHANNEL ROBUST PRINT ENGINE (POPUP + IFRAME)
  // -------------------------------------------------------------
  const buildPrintHtml = (targets: QrItem[]) => {
    const config = THERMAL_SIZES[labelSize] || THERMAL_SIZES['100x80'];

    const labelsHtml = targets.map((item) => `
      <div class="label-page">
        ${orgHeader ? `<div class="label-header">${orgHeader}</div>` : ''}
        ${showItemLabel && item.label ? `<div class="item-title">${item.label}</div>` : ''}
        <div class="label-body">
          <img src="${item.dataUrl}" alt="QR" class="qr-img" />
        </div>
        ${showItemValue && item.value ? `<div class="label-footer">SN: ${item.value}</div>` : ''}
      </div>
    `).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cetak Stiker Honeywell PM42</title>
  <style>
    @page {
      size: ${config.widthMm}mm ${config.heightMm}mm;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Univers", Arial, sans-serif;
    }
    .label-page {
      width: ${config.widthMm}mm;
      height: ${config.heightMm}mm;
      page-break-after: always;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 2.5mm 3.5mm;
      background: #ffffff;
      box-sizing: border-box;
      overflow: hidden;
      text-align: center;
    }
    .label-header {
      width: 100%;
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 0.8mm;
    }
    .item-title {
      font-size: 8pt;
      font-weight: 800;
      line-height: 1.15;
      margin-top: 0.8mm;
      text-transform: uppercase;
      word-break: break-word;
    }
    .label-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5mm 0;
      width: 100%;
    }
    .qr-img {
      width: ${config.qrMm}mm;
      height: ${config.qrMm}mm;
      object-fit: contain;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .label-footer {
      width: 100%;
      border-top: 1.5px solid #000000;
      padding-top: 0.8mm;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      word-break: break-all;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      .label-page {
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        border: 1px dashed #cbd5e1;
      }
    }
  </style>
</head>
<body>
  ${labelsHtml}
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

  const executePrint = (targets: QrItem[]) => {
    if (targets.length === 0) {
      showToast('Peringatan', 'Tidak ada stiker untuk dicetak', 'warning');
      return;
    }

    const html = buildPrintHtml(targets);

    // Channel 1: Window Popup
    try {
      const pWin = window.open('', '_blank', 'width=850,height=700');
      if (pWin) {
        pWin.document.open();
        pWin.document.write(html);
        pWin.document.close();
        showToast('Mencetak', `Mengirim ${targets.length} stiker ke printer Honeywell PM42`, 'success');
        return;
      }
    } catch (e) {
      console.warn('Popup blocked, using iframe fallback', e);
    }

    // Channel 2: Hidden Iframe
    try {
      if (printIframeRef.current) {
        const doc = printIframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          setTimeout(() => {
            printIframeRef.current?.contentWindow?.focus();
            printIframeRef.current?.contentWindow?.print();
          }, 350);
          showToast('Mencetak', `Mencetak ${targets.length} stiker via fallback channel`, 'info');
        }
      }
    } catch (err) {
      console.error(err);
      window.print();
    }
  };

  const handlePrintSingleSticker = (item: QrItem) => {
    executePrint([item]);
  };

  const handlePrintAllStickers = () => {
    executePrint(filteredItems);
  };

  return (
    <div className="mt-10 pt-8 border-t-2 border-dashed border-blue-300/80 scroll-mt-6" id="qr-batch-results">
      {/* Hidden Fallback Iframe */}
      <iframe
        ref={printIframeRef}
        title="Batch Print Iframe"
        className="hidden"
        style={{ position: 'fixed', right: '100%', bottom: '100%', width: 0, height: 0, border: 0 }}
      />

      {/* Header bar (Exact Image 2 Design) */}
      <div className="glass-box p-5 sm:p-6 !rounded-3xl border border-blue-200 shadow-lg mb-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <QrCode size={26} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold m-0 text-white">
                  Hasil Generasi QR Code Massal
                </h3>
                <span className="bg-amber-500 text-slate-950 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                  {items.length} Item
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1 m-0">
                Ukuran QR Code jernih untuk scanner & siap cetak Stiker Thermal Honeywell PM42
              </p>
            </div>
          </div>

          {/* Actions toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenModal}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <QrCode size={15} />
              <span>Tambah / Edit Batch</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              title="Pengaturan Ukuran Label"
            >
              <Sliders size={14} />
              <span className="hidden sm:inline">Ukuran: {labelSize}</span>
            </button>

            <button
              onClick={handlePrintAllStickers}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Cetak Stiker Label Honeywell PM42"
            >
              <Printer size={15} />
              <span>Cetak Honeywell PM42</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              <Download size={15} />
              <span>{isZipping ? 'Membuat ZIP...' : 'Unduh Semua (ZIP)'}</span>
            </button>

            <button
              onClick={onClear}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 transition-all cursor-pointer ml-1"
              title="Sembunyikan / Hapus Hasil"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {items.length > 3 && (
          <div className="mt-4 pt-4 border-t border-white/15 flex items-center">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari dari ${items.length} QR Code...`}
                className="w-full bg-slate-800/80 text-white border border-white/20 rounded-xl pl-10 pr-4 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid of Large Directly Scannable QR Codes (Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-8">
        {filteredItems.map((item, idx) => (
          <div 
            key={item.id} 
            className="glass-box p-5 !rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-200 bg-white/95 flex flex-col items-center justify-between text-center relative group"
          >
            <span className="absolute top-3 left-3 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
              #{idx + 1}
            </span>

            {/* QR Image Container - Big & Crisp */}
            <div className="w-full flex justify-center mt-3 mb-2 p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner group-hover:border-blue-400 transition-colors">
              <img 
                src={item.dataUrl} 
                alt={item.label} 
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
              />
            </div>

            {/* QR Code Text / Label Section */}
            <div className="w-full my-2 space-y-1.5 text-left px-1">
              {item.label && (
                <div className="font-extrabold text-xs text-slate-800 truncate" title={item.label}>
                  {item.label}
                </div>
              )}
              
              <div 
                className="font-mono font-bold text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 break-all leading-relaxed"
                title={item.value}
              >
                {item.value}
              </div>
            </div>

            {/* Card Actions */}
            <div className="w-full flex items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopyText(item.value, item.id)}
                className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Salin Teks"
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
                onClick={() => handlePrintSingleSticker(item)}
                className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-emerald-200 shadow-2xs active:scale-95"
                title="Cetak Stiker ke Printer Honeywell PM42"
              >
                <Printer size={13} />
                <span>Cetak Stiker</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadSingle(item)}
                className="py-1.5 px-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs ml-auto active:scale-95"
                title="Unduh PNG"
              >
                <Download size={13} />
                <span>PNG</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* HONEYWELL PM42 PRINT OPTION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl max-w-xl w-full shadow-2xl border border-emerald-300 relative text-left">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 m-0">Pengaturan Cetak Honeywell PM42</h3>
                  <p className="text-xs text-slate-500 m-0">Ukuran label thermal 203 DPI / 8 dots·mm</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Ukuran Label / Stiker Thermal:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(THERMAL_SIZES) as Array<keyof typeof THERMAL_SIZES>).map((key) => {
                    const preset = THERMAL_SIZES[key];
                    const isSelected = labelSize === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLabelSize(key)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-extrabold text-xs flex items-center justify-between">
                          <span>{preset.label}</span>
                          {isSelected && <Check size={14} className="text-emerald-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

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

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showItemLabel}
                    onChange={(e) => setShowItemLabel(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Tampilkan Judul/Nama</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showItemValue}
                    onChange={(e) => setShowItemValue(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Tampilkan Nilai LPN / SN</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3.5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPrintModal(false);
                  handlePrintAllStickers();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Cetak ({filteredItems.length} Stiker)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
