import React, { useState, useEffect, lazy, Suspense } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { 
  Wrench, QrCode, Calendar, Layers, Barcode, ArrowRightLeft, PackageCheck, FileText, Undo2, Flame,
  X, Maximize2, RefreshCw, Download, Upload, Copy, Check, Eye, Eraser, Trash2, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { LogisticsTab } from './logistics/LogisticsModal';
import { LazyFallback } from './common/LazyFallback';
import { useNotification } from '../context/NotificationContext';
import { QrItem } from './BatchQrSection';

const QrGeneratorHoneywellModule = lazy(() => import('./logistics/QrGeneratorHoneywellModule').then(m => ({ default: m.QrGeneratorHoneywellModule })));
const EdCheckerModule = lazy(() => import('./logistics/EdCheckerModule').then(m => ({ default: m.EdCheckerModule })));
const StockOpnameModule = lazy(() => import('./logistics/StockOpnameModule').then(m => ({ default: m.StockOpnameModule })));
const SnGeneratorModule = lazy(() => import('./logistics/SnGeneratorModule').then(m => ({ default: m.SnGeneratorModule })));
const BatchCheckerModule = lazy(() => import('./logistics/BatchCheckerModule').then(m => ({ default: m.BatchCheckerModule })));
const PromosiModule = lazy(() => import('./logistics/PromosiModule').then(m => ({ default: m.PromosiModule })));
const SuratJalanModule = lazy(() => import('./logistics/SuratJalanModule').then(m => ({ default: m.SuratJalanModule })));
const ReturInventoryModule = lazy(() => import('./logistics/ReturInventoryModule').then(m => ({ default: m.ReturInventoryModule })));
const MonitoringPemusnahanModule = lazy(() => import('./logistics/MonitoringPemusnahanModule').then(m => ({ default: m.MonitoringPemusnahanModule })));

export type MainToolTab = 'qr-generator' | LogisticsTab;

interface EmbeddedToolsWorkspaceProps {
  activeTool: MainToolTab;
  onSelectTool: (tool: MainToolTab) => void;
  onOpenModal: (tool: MainToolTab) => void;
  onCloseWorkspace?: () => void;
  onSetBatchItems: (items: QrItem[]) => void;
}

export function EmbeddedToolsWorkspace({ 
  activeTool, 
  onSelectTool, 
  onOpenModal, 
  onCloseWorkspace,
  onSetBatchItems 
}: EmbeddedToolsWorkspaceProps) {
  const { showToast } = useNotification();

  // QR Generator Local State inside Main Page
  const [qrMode, setQrMode] = useState<'single' | 'batch'>('single');
  const [singleText, setSingleText] = useState('');
  const [singleDataUrl, setSingleDataUrl] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [copied, setCopied] = useState(false);

  const [batchText, setBatchText] = useState('');
  const [batchItems, setBatchItems] = useState<QrItem[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Single QR Generator Effect
  useEffect(() => {
    if (activeTool !== 'qr-generator' || qrMode !== 'single') return;
    if (!singleText.trim()) {
      setSingleDataUrl('');
      return;
    }

    QRCode.toDataURL(singleText, {
      width: 500,
      margin: 2,
      color: { dark: fgColor, light: bgColor }
    })
      .then(url => setSingleDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
  }, [singleText, fgColor, bgColor, activeTool, qrMode]);

  // Batch QR Generator Logic
  const generateBatchQrs = async () => {
    const lines = batchText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setBatchItems([]);
      return;
    }

    setIsGeneratingBatch(true);
    const results: QrItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let label = line;
      let value = line;

      if (line.includes(',')) {
        const parts = line.split(',');
        label = parts[0].trim();
        value = parts.slice(1).join(',').trim();
      } else if (line.includes(';')) {
        const parts = line.split(';');
        label = parts[0].trim();
        value = parts.slice(1).join(';').trim();
      }

      if (!value) value = label;

      try {
        const url = await QRCode.toDataURL(value, {
          width: 500,
          margin: 2,
          color: { dark: fgColor, light: bgColor }
        });
        results.push({
          id: `qr-main-${i}-${Date.now()}`,
          label,
          value,
          dataUrl: url
        });
      } catch (err) {
        console.error(`Error generating batch QR:`, err);
      }
    }

    setBatchItems(results);
    setIsGeneratingBatch(false);
  };

  useEffect(() => {
    if (activeTool === 'qr-generator' && qrMode === 'batch') {
      generateBatchQrs();
    }
  }, [activeTool, qrMode, fgColor, bgColor]);

  const handleDownloadSingle = () => {
    if (!singleDataUrl) return;
    const link = document.createElement('a');
    link.href = singleDataUrl;
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil', 'QR Code diunduh ke komputer', 'success');
  };

  const handleCopySingle = async () => {
    if (!singleDataUrl) return;
    try {
      const response = await fetch(singleDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Tersalin', 'Gambar QR Code disalin', 'success');
    } catch {
      showToast('Info', 'Gunakan tombol Unduh PNG', 'info');
    }
  };

  const handleDownloadBatchZip = async () => {
    if (batchItems.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("qrcode_batch");

      batchItems.forEach((item, idx) => {
        const base64Data = item.dataUrl.replace(/^data:image\/png;base64,/, "");
        const safeName = (item.label || item.value).replace(/[^a-z0-9]/gi, '_').substring(0, 30).toLowerCase();
        folder?.file(`${idx + 1}_${safeName}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `qrcode_batch_${batchItems.length}_items_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Sukses', `Berhasil mengunduh ${batchItems.length} QR Code dalam file ZIP`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal', 'Gagal membuat file ZIP', 'danger');
    } finally {
      setIsZipping(false);
    }
  };

  const handleSendToBatchSection = () => {
    if (batchItems.length === 0) return;
    onSetBatchItems(batchItems);
    showToast('Tampil', `${batchItems.length} QR Code dikirim ke Seksi Batch Halaman Utama`, 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBatchText(text);
        showToast('File Dimuat', `File ${file.name} berhasil dimuat`, 'info');
      }
    };
    reader.readAsText(file);
  };

  const toolsList: { id: MainToolTab; title: string; icon: React.ReactNode; style: string }[] = [
    {
      id: 'qr-generator',
      title: 'Generator QR Code',
      icon: <QrCode size={16} />,
      style: 'from-indigo-600 to-blue-800'
    },
    {
      id: 'ed-checker',
      title: 'Cek Expired Date',
      icon: <Calendar size={16} />,
      style: 'from-emerald-600 to-teal-800'
    },
    {
      id: 'stock-opname',
      title: 'Stock Opname Suite',
      icon: <Layers size={16} />,
      style: 'from-blue-700 to-slate-900'
    },
    {
      id: 'sn-generator',
      title: 'Generator Serial No',
      icon: <Barcode size={16} />,
      style: 'from-purple-600 to-violet-900'
    },
    {
      id: 'batch-checker',
      title: 'Batch Checker',
      icon: <ArrowRightLeft size={16} />,
      style: 'from-amber-600 to-orange-800'
    },
    {
      id: 'promosi',
      title: 'Barang Promosi',
      icon: <PackageCheck size={16} />,
      style: 'from-orange-600 to-amber-800'
    },
    {
      id: 'surat-jalan',
      title: 'Surat Jalan Studio',
      icon: <FileText size={16} />,
      style: 'from-blue-600 to-indigo-800'
    },
    {
      id: 'retur-inventory',
      title: 'Retur Inventory',
      icon: <Undo2 size={16} />,
      style: 'from-rose-600 to-red-800'
    },
    {
      id: 'monitoring-pemusnahan',
      title: 'Monitoring Pemusnahan',
      icon: <Flame size={16} />,
      style: 'from-amber-600 to-orange-800'
    }
  ];

  const currentToolInfo = toolsList.find(t => t.id === activeTool) || toolsList[0];

  return (
    <div id="main-page-tool-workspace" className="w-full scroll-mt-6 animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-4 sm:p-6">
        {/* ACTIVE TOOL MODULE RENDERING */}
        <div className="w-full">
          <Suspense fallback={<LazyFallback title="Memuat lembar kerja modul..." />}>
            {activeTool === 'qr-generator' && (
              <QrGeneratorHoneywellModule onExportBatchItems={onSetBatchItems} />
            )}
            {activeTool === 'ed-checker' && <EdCheckerModule />}
            {activeTool === 'stock-opname' && <StockOpnameModule />}
            {activeTool === 'sn-generator' && <SnGeneratorModule />}
            {activeTool === 'batch-checker' && <BatchCheckerModule />}
            {activeTool === 'promosi' && <PromosiModule />}
            {activeTool === 'surat-jalan' && <SuratJalanModule />}
            {activeTool === 'retur-inventory' && <ReturInventoryModule />}
            {activeTool === 'monitoring-pemusnahan' && <MonitoringPemusnahanModule />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
