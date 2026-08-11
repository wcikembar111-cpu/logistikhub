import React, { useState } from 'react';
import JSZip from 'jszip';
import { Download, Printer, Trash2, Search, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
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

export function BatchQrSection({ items, onClear, onOpenModal }: BatchQrSectionProps) {
  const { showToast } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-10 pt-8 border-t-2 border-dashed border-blue-300/80 scroll-mt-6" id="qr-batch-results">
      {/* Header bar */}
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
                Ukuran QR Code cukup besar & jernih agar mudah dipindai oleh scanner hp/barcode reader
              </p>
            </div>
          </div>

          {/* Actions toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenModal}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <QrCode size={15} />
              <span>Tambah / Edit Batch</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer size={15} />
              <span>Cetak / Print</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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

        {/* Search bar if many items */}
        {items.length > 4 && (
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

      {/* Grid of Large QR Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-8">
        {filteredItems.map((item, idx) => {
          const isUrl = item.value.startsWith('http://') || item.value.startsWith('https://');

          return (
            <div 
              key={item.id} 
              className="glass-box p-5 !rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-200 bg-white/90 flex flex-col items-center justify-between text-center relative group"
            >
              <span className="absolute top-3 left-3 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                #{idx + 1}
              </span>

              {/* QR Image Container - Big & Crisp */}
              <div className="w-full flex justify-center my-2 p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner group-hover:border-blue-400 transition-colors">
                <img 
                  src={item.dataUrl} 
                  alt={item.label} 
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                />
              </div>

              {/* QR Code Text / Label Section */}
              <div className="w-full my-2 space-y-1 text-left px-1">
                {item.label && item.label !== item.value && (
                  <div className="font-extrabold text-xs text-slate-800 truncate" title={item.label}>
                    {item.label}
                  </div>
                )}
                
                <div 
                  className="font-mono text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 break-all leading-relaxed max-h-24 overflow-y-auto"
                  title={item.value}
                >
                  {item.value}
                </div>
              </div>

              {/* Card Actions */}
              <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleCopyText(item.value, item.id)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Salin Teks"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin Teks</span>
                    </>
                  )}
                </button>

                {isUrl && (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all"
                    title="Buka Link di Tab Baru"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadSingle(item)}
                  className="flex-1 py-1.5 px-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Download size={13} />
                  <span>Unduh PNG</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
