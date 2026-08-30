import React from 'react';
import { 
  Home, 
  QrCode, 
  Calendar, 
  Layers, 
  Barcode, 
  ArrowRightLeft, 
  PackageCheck, 
  FileText, 
  Undo2,
  Flame
} from 'lucide-react';
import { EmbeddedToolsWorkspace } from '../EmbeddedToolsWorkspace';
import { QrItem } from '../BatchQrSection';
import { MainToolTab } from '../../types';

interface ToolWorkspacePageProps {
  activeTool: MainToolTab;
  onSelectTool: (tool: MainToolTab) => void;
  onBackToHome: () => void;
  batchQrItems: QrItem[];
  onSetBatchQrItems: (items: QrItem[]) => void;
}

const toolMetadata: Record<MainToolTab, { title: string; category: string; icon: React.ReactNode; iconBg: string }> = {
  'qr-generator': {
    title: 'Generator QR Code',
    category: 'Satuan & Massal',
    icon: <QrCode size={18} className="text-white" />,
    iconBg: 'bg-blue-900'
  },
  'ed-checker': {
    title: 'Cek Expired Date',
    category: 'ED & DOY Calculator',
    icon: <Calendar size={18} className="text-white" />,
    iconBg: 'bg-orange-500'
  },
  'stock-opname': {
    title: 'Stock Opname Suite',
    category: 'LARGO to SAP & BA SO',
    icon: <Layers size={18} className="text-white" />,
    iconBg: 'bg-blue-900'
  },
  'sn-generator': {
    title: 'Generator Serial No',
    category: 'Unique Anti-Duplicate',
    icon: <Barcode size={18} className="text-white" />,
    iconBg: 'bg-blue-800'
  },
  'batch-checker': {
    title: 'Batch Checker',
    category: 'LARGO vs SAP Compare',
    icon: <ArrowRightLeft size={18} className="text-white" />,
    iconBg: 'bg-orange-500'
  },
  'promosi': {
    title: 'Penerimaan Promosi',
    category: 'Penerimaan Barang Promosi',
    icon: <PackageCheck size={18} className="text-white" />,
    iconBg: 'bg-orange-500'
  },
  'surat-jalan': {
    title: 'Surat Jalan Ekspedisi',
    category: 'Buat, Cetak & Rekap SJ',
    icon: <FileText size={18} className="text-white" />,
    iconBg: 'bg-blue-900'
  },
  'retur-inventory': {
    title: 'Retur Inventory',
    category: 'Pengajuan & Tracking Retur',
    icon: <Undo2 size={18} className="text-white" />,
    iconBg: 'bg-rose-600'
  },
  'monitoring-pemusnahan': {
    title: 'Monitoring Pemusnahan',
    category: 'WH-CKB 27 Kolom Data',
    icon: <Flame size={18} className="text-white" />,
    iconBg: 'bg-amber-600'
  },
  'data-pemusnahan': {
    title: 'Data Pemusnahan',
    category: 'Spreadsheet GAS 26 Kolom',
    icon: <Flame size={18} className="text-white" />,
    iconBg: 'bg-orange-600'
  }
};

export function ToolWorkspacePage({
  activeTool,
  onSelectTool,
  onBackToHome,
  batchQrItems,
  onSetBatchQrItems
}: ToolWorkspacePageProps) {
  const currentMeta = toolMetadata[activeTool] || toolMetadata['qr-generator'];

  return (
    <div className="w-full pb-16 animate-fade-in">
      {/* Top Dedicated Navigation Bar - Minimalist Blue, Orange, White */}
      <div className="bg-white p-3 sm:p-3.5 mb-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        
        {/* Left: HOME Icon-Only Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-10 h-10 rounded-xl bg-white hover:bg-blue-50 text-blue-900 hover:text-orange-600 border border-slate-200 hover:border-orange-300 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
            title="Kembali ke Halaman Utama"
            aria-label="Kembali ke Halaman Utama"
          >
            <Home size={18} />
          </button>

          {/* Active Application Info */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className={`w-8 h-8 rounded-xl ${currentMeta.iconBg} flex items-center justify-center shadow-2xs text-white shrink-0`}>
              {currentMeta.icon}
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                Tools & Utilitas
              </div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight mt-0.5">
                {currentMeta.title}
              </div>
            </div>
          </div>
        </div>

        {/* Active Application Info on Right as well if needed */}
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Main Workspace Container - Purely focused on the single selected tool */}
      <EmbeddedToolsWorkspace
        activeTool={activeTool}
        onSelectTool={onSelectTool}
        onCloseWorkspace={onBackToHome}
        onSetBatchItems={onSetBatchQrItems}
      />
    </div>
  );
}
