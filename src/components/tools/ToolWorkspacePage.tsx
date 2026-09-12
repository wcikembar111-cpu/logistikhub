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
  Flame,
  Truck,
  FileSpreadsheet,
  Cloud,
  Radio,
  Volume2,
  VolumeX,
  Wrench,
  ListTodo,
  Calculator
} from 'lucide-react';
import { EmbeddedToolsWorkspace } from '../EmbeddedToolsWorkspace';
import { QrItem } from '../BatchQrSection';
import { MainToolTab, BroadcastMessage } from '../../types';
import { BroadcastBar } from '../broadcast/BroadcastBar';
import { FloatingRobotCompanion } from '../broadcast/FloatingRobotCompanion';

interface ToolWorkspacePageProps {
  activeTool: MainToolTab;
  onSelectTool: (tool: MainToolTab) => void;
  onBackToHome: () => void;
  batchQrItems: QrItem[];
  onSetBatchQrItems: (items: QrItem[]) => void;
  latestBroadcast?: BroadcastMessage | null;
  broadcastCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenBroadcast?: () => void;
  onShowBroadcastPopup?: () => void;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => Promise<any>;
  isNotificationSupported?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isTodoOpen?: boolean;
  onToggleTodo?: () => void;
  todoCount?: number;
  currentUser?: any;
  isAdmin?: boolean;
  onSendBroadcast?: (data: any) => Promise<any>;
  recentMessages?: BroadcastMessage[];
  onDeleteMessage?: (id: string) => Promise<void>;
}

const toolMetadata: Record<MainToolTab, { title: string; category: string; icon: React.ReactNode; iconBg: string }> = {
  'voice-calculator': {
    title: 'Kalkulator Suara',
    category: 'Hitung Voice & Akumulator',
    icon: <Calculator size={18} className="text-white" />,
    iconBg: 'bg-indigo-600'
  },
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
    category: 'Analisis & Generator Retur',
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
  },
  'outbound-lrg': {
    title: 'OutboundLRG',
    category: 'Template Transfer SAP 1200/1800',
    icon: <Truck size={18} className="text-white" />,
    iconBg: 'bg-blue-600'
  },
  'match-grfg-repack': {
    title: 'Match GRFG Repack',
    category: 'Cek Selisih MB51 Order',
    icon: <FileSpreadsheet size={18} className="text-white" />,
    iconBg: 'bg-emerald-600'
  },
  'spreadsheet-dashboard': {
    title: 'Ecomm',
    category: 'Live Sync & Visualisasi KPI',
    icon: <FileSpreadsheet size={18} className="text-white" />,
    iconBg: 'bg-emerald-600'
  },
  'onedrive-dashboard': {
    title: 'Ecomm',
    category: 'Live Sync & Visualisasi KPI',
    icon: <FileSpreadsheet size={18} className="text-white" />,
    iconBg: 'bg-emerald-600'
  }
};

export function ToolWorkspacePage({
  activeTool,
  onSelectTool,
  onBackToHome,
  batchQrItems,
  onSetBatchQrItems,
  latestBroadcast,
  broadcastCount = 0,
  soundEnabled = true,
  onToggleSound,
  onOpenBroadcast,
  onShowBroadcastPopup,
  notificationPermission,
  onRequestNotificationPermission,
  isNotificationSupported,
  isSidebarOpen = true,
  onToggleSidebar,
  isTodoOpen = false,
  onToggleTodo,
  todoCount = 0,
  currentUser,
  isAdmin,
  onSendBroadcast,
  recentMessages,
  onDeleteMessage
}: ToolWorkspacePageProps) {
  const currentMeta = toolMetadata[activeTool] || toolMetadata['qr-generator'];

  return (
    <div className="w-full pb-16 animate-fade-in">
      {/* Top Dedicated Navigation Bar - Minimalist Blue, Orange, White */}
      <div className="bg-white p-2.5 sm:p-3 mb-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5 flex-wrap">
        
        {/* Left: HOME Button + Sidebar Toggle + Active Application Info */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-blue-50 text-blue-900 hover:text-orange-600 border border-slate-200 hover:border-orange-300 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
            title="Kembali ke Halaman Utama"
            aria-label="Kembali ke Halaman Utama"
          >
            <Home size={18} />
          </button>

          {/* Single Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
                isSidebarOpen
                  ? 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200/80'
                  : 'bg-white hover:bg-blue-50 text-blue-900 border-slate-200 hover:border-blue-300'
              }`}
              title={isSidebarOpen ? 'Tutup Sidebar Tools & Utilitas' : 'Buka Sidebar Tools & Utilitas'}
            >
              <Wrench size={13} className="text-blue-700" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}</span>
            </button>
          )}

          {/* Active Application Info */}
          <div className="flex items-center gap-2 pl-1 min-w-0">
            <div className={`w-8 h-8 rounded-xl ${currentMeta.iconBg} flex items-center justify-center shadow-2xs text-white shrink-0`}>
              {currentMeta.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">
                Tools & Utilitas
              </div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm leading-tight mt-0.5 truncate">
                {currentMeta.title}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Public Todo Toggle & Non-obstructive Robot Mascot */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Single Public Todo Toggle Button */}
          {onToggleTodo && (
            <button
              type="button"
              onClick={onToggleTodo}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs relative ${
                isTodoOpen
                  ? 'bg-orange-100 text-orange-950 border-orange-300 ring-1 ring-orange-400'
                  : 'bg-white hover:bg-orange-50 text-orange-900 border-slate-200 hover:border-orange-300'
              }`}
              title={isTodoOpen ? 'Tutup Public Todo' : 'Buka Public Todo Tim'}
            >
              <ListTodo size={13} className="text-orange-700" />
              <span className="hidden sm:inline">{isTodoOpen ? 'Tutup Todo' : 'Public Todo'}</span>
              {todoCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-[9px] font-black">
                  {todoCount}
                </span>
              )}
            </button>
          )}

          {/* Robot Companion - Positioned in the header, never obstructs workspace content */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/80 px-2 py-1 rounded-xl shadow-2xs">
            <FloatingRobotCompanion 
              onSendBroadcast={onSendBroadcast || (async () => {})}
              latestBroadcast={latestBroadcast || null}
              recentMessages={recentMessages || []}
              soundEnabled={soundEnabled}
              onToggleSound={onToggleSound || (() => {})}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onDeleteMessage={onDeleteMessage}
              mode="inline"
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
            />
            <div className="hidden md:block text-left pr-1 select-none">
              <div className="text-[10px] font-black text-blue-900 leading-none">KinoBot</div>
              <div className="text-[9px] text-slate-500 font-medium leading-tight">Asisten Logistik</div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Intercom Bar - Muncul di semua posisi tools workspace */}
      <div className="mb-4">
        <BroadcastBar
          onOpenBroadcastModal={onOpenBroadcast || (() => {})}
          latestBroadcast={latestBroadcast || null}
          messageCount={broadcastCount}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound || (() => {})}
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={onRequestNotificationPermission}
          isNotificationSupported={isNotificationSupported}
        />
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
