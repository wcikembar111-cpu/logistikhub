import React, { Suspense, lazy } from 'react';
import { 
  ArrowLeft, 
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

const toolMetadata: Record<MainToolTab, { title: string; category: string; icon: React.ReactNode; color: string }> = {
  'qr-generator': {
    title: 'Generator QR Code',
    category: 'Satuan & Massal',
    icon: <QrCode size={18} className="text-white" />,
    color: 'from-indigo-600 to-blue-700'
  },
  'ed-checker': {
    title: 'Cek Expired Date',
    category: 'ED & DOY Calculator',
    icon: <Calendar size={18} className="text-white" />,
    color: 'from-emerald-600 to-teal-700'
  },
  'stock-opname': {
    title: 'Stock Opname Suite',
    category: 'LARGO to SAP & BA SO',
    icon: <Layers size={18} className="text-white" />,
    color: 'from-blue-700 to-indigo-800'
  },
  'sn-generator': {
    title: 'Generator Serial No',
    category: 'Unique Anti-Duplicate',
    icon: <Barcode size={18} className="text-white" />,
    color: 'from-purple-600 to-violet-800'
  },
  'batch-checker': {
    title: 'Batch Checker',
    category: 'LARGO vs SAP Compare',
    icon: <ArrowRightLeft size={18} className="text-white" />,
    color: 'from-amber-600 to-orange-700'
  },
  'promosi': {
    title: 'Penerimaan Promosi',
    category: 'Penerimaan Barang Promosi',
    icon: <PackageCheck size={18} className="text-white" />,
    color: 'from-orange-600 to-amber-600'
  },
  'surat-jalan': {
    title: 'Surat Jalan Ekspedisi',
    category: 'Buat, Cetak & Rekap SJ',
    icon: <FileText size={18} className="text-white" />,
    color: 'from-blue-600 to-indigo-700'
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

  const allTools: MainToolTab[] = [
    'qr-generator',
    'ed-checker',
    'stock-opname',
    'sn-generator',
    'batch-checker',
    'promosi',
    'surat-jalan'
  ];

  return (
    <div className="w-full pb-16 animate-fade-in">
      {/* Top Sticky Navigation Bar */}
      <div className="bg-white p-3 sm:p-4 mb-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Prominent Back to Home Button */}
        <button
          type="button"
          onClick={onBackToHome}
          className="group px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <Home size={15} />
          <span>Kembali ke Halaman Utama</span>
        </button>

        {/* Center: Current Tool Header Pill */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs">
          <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${currentMeta.color} flex items-center justify-center shadow-xs text-white`}>
            {currentMeta.icon}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase leading-none">
              Tools & Utilitas Aktif
            </div>
            <div className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">
              {currentMeta.title}
            </div>
          </div>
        </div>

        {/* Right: Actions (Lock PIN + Pop-Up Trigger) */}
        <div className="flex items-center gap-2">
          {onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-950 hover:text-white font-bold text-xs border border-indigo-200 hover:border-indigo-600 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Kunci / Logout Aplikasi kembali ke Layar PIN"
            >
              <KeyRound size={13} className="text-indigo-600 hover:text-white" />
              <span className="hidden sm:inline">Kunci PIN</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenModal(activeTool)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-900 font-bold text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Buka dalam mode Pop-up Modal terpisah"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Buka Pop-up</span>
          </button>
        </div>
      </div>

      {/* Fast Switcher Tabs across All Tools */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Sparkles size={12} className="text-amber-500" />
          <span>Pilih Tool:</span>
        </span>
        {allTools.map((t) => {
          const meta = toolMetadata[t];
          const isSelected = activeTool === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelectTool(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-blue-900 text-white shadow-md ring-2 ring-blue-400/40'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>{meta.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Container */}
      <Suspense fallback={<LazyFallback title="Menyiapkan Lembar Kerja..." minHeight="min-h-[400px]" />}>
        <EmbeddedToolsWorkspace
          activeTool={activeTool}
          onSelectTool={onSelectTool}
          onOpenModal={onOpenModal}
          onCloseWorkspace={onBackToHome}
          onSetBatchItems={onSetBatchQrItems}
        />
      </Suspense>

      {/* QR Batch Results Section (displayed on this dedicated page when QR tool is active) */}
      {activeTool === 'qr-generator' && batchQrItems.length > 0 && (
        <div className="mt-6">
          <BatchQrSection
            items={batchQrItems}
            onClear={() => onSetBatchQrItems([])}
            onOpenModal={() => onOpenModal('qr-generator')}
          />
        </div>
      )}
    </div>
  );
}
