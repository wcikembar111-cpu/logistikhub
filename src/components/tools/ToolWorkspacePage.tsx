import React, { Suspense, lazy } from 'react';
import { 
  Home, 
  Wrench, 
  QrCode, 
  Calendar, 
  Layers, 
  Barcode, 
  ArrowRightLeft, 
  PackageCheck, 
  FileText, 
  ExternalLink,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { MainToolTab, EmbeddedToolsWorkspace } from '../EmbeddedToolsWorkspace';
import { BatchQrSection, QrItem } from '../BatchQrSection';
import { LazyFallback } from '../common/LazyFallback';

interface ToolWorkspacePageProps {
  activeTool: MainToolTab;
  onSelectTool: (tool: MainToolTab) => void;
  onBackToHome: () => void;
  onOpenModal: (tool: MainToolTab) => void;
  onLockApp?: () => void;
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
  }
};

export function ToolWorkspacePage({
  activeTool,
  onSelectTool,
  onBackToHome,
  onOpenModal,
  onLockApp,
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

        {/* Right: Actions (Lock PIN + Pop-Up Trigger) */}
        <div className="flex items-center gap-2">
          {onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="px-3 py-2 rounded-xl bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold text-xs border border-slate-200 hover:border-orange-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Kunci / Logout Aplikasi kembali ke Layar PIN"
            >
              <KeyRound size={13} className="text-orange-500" />
              <span className="hidden sm:inline">Kunci PIN</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenModal(activeTool)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 font-semibold text-xs border border-slate-200 hover:border-blue-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Buka dalam mode Pop-up Modal terpisah"
          >
            <ExternalLink size={13} className="text-blue-900" />
            <span className="hidden sm:inline">Layar Pop-Up</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Container - Purely focused on the single selected tool */}
      <Suspense fallback={<LazyFallback title="Menyiapkan Lembar Kerja..." minHeight="min-h-[400px]" />}>
        <EmbeddedToolsWorkspace
          activeTool={activeTool}
          onSelectTool={onSelectTool}
          onOpenModal={onOpenModal}
          onCloseWorkspace={onBackToHome}
          onSetBatchItems={onSetBatchQrItems}
        />
      </Suspense>
    </div>
  );
}
