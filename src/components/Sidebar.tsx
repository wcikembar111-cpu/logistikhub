import React, { useState, useMemo } from 'react';
import { 
  Wrench,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  QrCode,
  Calendar,
  Layers,
  Barcode,
  ArrowRightLeft,
  PackageCheck,
  FileText,
  Undo2,
  Flame,
  Database,
  Truck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown
} from 'lucide-react';
import { MainToolTab } from '../types';
import { InitialDLogo } from './common/InitialDLogo';

export interface ToolItemDef {
  id: MainToolTab;
  title: string;
  category: string;
  group: 'barcode' | 'audit' | 'doc' | 'disposal';
  hasDatabase: boolean;
  desc: string;
  keywords: string;
  icon: React.ReactNode;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
}

export const TOOLS_LIST: ToolItemDef[] = [
  // ==========================================
  // 1. MENU TERHUBUNG DATABASE (SUPABASE)
  // ==========================================
  {
    id: 'surat-jalan',
    title: 'Surat Jalan',
    category: 'Buat, Cetak & Rekap SJ',
    group: 'doc',
    hasDatabase: true,
    desc: 'Pembuatan surat jalan ekspedisi, cetak otomatis, dan rekapan tersimpan ke database',
    keywords: 'surat jalan delivery order sj cetak rekap buat kirim expedisi driver pengiriman database supabase',
    icon: <FileText size={15} className="text-white" />,
    iconBg: 'bg-blue-700',
    badge: 'Database',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'promosi',
    title: 'Penerimaan Promosi',
    category: 'Penerimaan Barang Promosi',
    group: 'doc',
    hasDatabase: true,
    desc: 'Manajemen pencatatan & penerimaan barang promosi tersimpan di database',
    keywords: 'promosi promo penerimaan barang bonus merchandise hadiah receiving logistik database supabase',
    icon: <PackageCheck size={15} className="text-white" />,
    iconBg: 'bg-teal-600',
    badge: 'Database',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'monitoring-pemusnahan',
    title: 'Monitoring Pemusnahan',
    category: 'WH-CKB 27 Kolom Data',
    group: 'disposal',
    hasDatabase: true,
    desc: 'Pipeline monitoring barang afkir/pemusnahan WH-CKB Z87 BAP & migo tersimpan di database',
    keywords: 'monitoring pemusnahan ckb z87 bap ba migo sj kapsul disposal musnah barang afkir database supabase',
    icon: <Flame size={15} className="text-white" />,
    iconBg: 'bg-amber-600',
    badge: 'Database',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'data-pemusnahan',
    title: 'Data Pemusnahan',
    category: 'Spreadsheet GAS & DB',
    group: 'disposal',
    hasDatabase: true,
    desc: 'Integrasi Google Apps Script 26 kolom penarikan data pemusnahan real-time & database',
    keywords: 'data pemusnahan spreadsheet google sheet gas tarik data 26 kolom item code sku batch sloc tujuan database supabase',
    icon: <Database size={15} className="text-white" />,
    iconBg: 'bg-emerald-600',
    badge: 'Live DB',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },

  // ==========================================
  // 2. TOOLS & GENERATOR (TANPA DATABASE)
  // ==========================================
  {
    id: 'qr-generator',
    title: 'Generator QR Code',
    category: 'Satuan & Massal Honeywell',
    group: 'barcode',
    hasDatabase: false,
    desc: 'Pembuat label QR code satuan & massal Honeywell, export PNG & PDF (Offline/Generator)',
    keywords: 'qr code barcode generator cetak buat link scanner bulk export png pdf honeywell offline tanpa database',
    icon: <QrCode size={15} className="text-white" />,
    iconBg: 'bg-blue-600',
    badge: 'Generator',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'sn-generator',
    title: 'Generator Serial No',
    category: 'Unique Anti-Duplicate',
    group: 'barcode',
    hasDatabase: false,
    desc: 'Pembuat nomor seri unik anti duplikasi dengan format barcode kustom',
    keywords: 'generator serial number sn no unique barcode anti duplicate acak urut offline tanpa database',
    icon: <Barcode size={15} className="text-white" />,
    iconBg: 'bg-sky-600',
    badge: 'Generator',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  {
    id: 'ed-checker',
    title: 'Cek Expired Date',
    category: 'ED & DOY Calculator',
    group: 'audit',
    hasDatabase: false,
    desc: 'Kalkulator tanggal kedaluwarsa, Day of Year (DOY), dan sisa masa simpan',
    keywords: 'expired date ed doy calculator kedaluwarsa tanggal sisa hari exp hitung shelf life kalkulator',
    icon: <Calendar size={15} className="text-white" />,
    iconBg: 'bg-amber-500',
    badge: 'Kalkulator',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'stock-opname',
    title: 'Stock Opname Suite',
    category: 'LARGO to SAP & BA SO',
    group: 'audit',
    hasDatabase: false,
    desc: 'Rekonsiliasi data fisik vs sistem LARGO ke SAP dan pembuatan Berita Acara',
    keywords: 'stock opname so suite largo sap ba berita acara selisih audit fisik gudang rekonsiliasi',
    icon: <Layers size={15} className="text-white" />,
    iconBg: 'bg-indigo-600',
    badge: 'Audit',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'batch-checker',
    title: 'Batch Checker',
    category: 'LARGO vs SAP Compare',
    group: 'audit',
    hasDatabase: false,
    desc: 'Cek perbandingan nomor batch dan kuantitas antara LARGO dengan SAP',
    keywords: 'batch checker largo vs sap compare cek selisih perbandingan data rekonsiliasi',
    icon: <ArrowRightLeft size={15} className="text-white" />,
    iconBg: 'bg-orange-500',
    badge: 'Komparasi',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    id: 'outbound-lrg',
    title: 'OutboundLRG',
    category: 'Template Transfer SAP 1200/1800',
    group: 'doc',
    hasDatabase: false,
    desc: 'Konversi data Excel LARGO ke 14 kolom template SAP Outbound 1200 & 1800',
    keywords: 'outbound lrg outboundlrg sap transfer 1200 1800 to plant sloc distribusi sukabumi m081 konversi converter',
    icon: <Truck size={15} className="text-white" />,
    iconBg: 'bg-blue-600',
    badge: 'Konverter',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'retur-inventory',
    title: 'Retur Inventory',
    category: 'Pengajuan & Tracking Retur',
    group: 'doc',
    hasDatabase: true,
    desc: 'Sistem pengajuan retur barang near ED, rusak kemasan, COGS & database cloud inventori',
    keywords: 'retur inventory return pengembalian barang cogs sku batch ed near rusak kemasan klaim database supabase',
    icon: <Undo2 size={15} className="text-white" />,
    iconBg: 'bg-rose-500',
    badge: 'Database',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
];

const GROUP_LABELS: Record<string, string> = {
  barcode: 'QR & Barcode',
  audit: 'Audit & Inventori',
  doc: 'Dokumen & Distribusi',
  disposal: 'Pemusnahan Barang'
};

interface SidebarProps {
  activeTool?: MainToolTab | null;
  onSelectTool?: (tool: MainToolTab) => void;
  currentView?: 'home' | 'tool-workspace';
  onNavigateHome?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  currentUser?: { email?: string; username?: string; nama?: string; nama_lengkap?: string; role?: string } | null;
  isAdmin?: boolean;
}

export function Sidebar({
  activeTool,
  onSelectTool,
  currentView = 'home',
  onNavigateHome,
  isOpen,
  onToggle,
  currentUser,
  isAdmin = false
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDbExpanded, setIsDbExpanded] = useState(true);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);

  // Filter tools based on search query, partitioned into Database Connected and Generator tools
  const { dbTools, generatorTools, totalMatches } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filterFn = (item: ToolItemDef) => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
      );
    };

    const db = TOOLS_LIST.filter(item => item.hasDatabase && filterFn(item));
    const gen = TOOLS_LIST.filter(item => !item.hasDatabase && filterFn(item));

    return {
      dbTools: db,
      generatorTools: gen,
      totalMatches: db.length + gen.length
    };
  }, [searchQuery]);

  const handleToolClick = (toolId: MainToolTab) => {
    if (onSelectTool) {
      onSelectTool(toolId);
    }
    // On mobile screens, auto-close sidebar on item selection
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    }
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  // Helper renderer for individual tool navigation button
  const renderToolButton = (tool: ToolItemDef) => {
    const isActive = currentView === 'tool-workspace' && activeTool === tool.id;

    return (
      <button
        key={tool.id}
        onClick={() => handleToolClick(tool.id)}
        className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer group border ${
          isActive
            ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/70 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-6 h-6 rounded-lg ${tool.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
            {tool.icon}
          </div>
          <span className="text-xs font-semibold truncate block">
            {tool.title}
          </span>
        </div>

        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop (Lightweight & Subtle) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-[85] lg:hidden transition-opacity duration-200 cursor-pointer backdrop-blur-xs"
          onClick={onToggle}
          title="Klik untuk menutup Sidebar Navigasi"
        />
      )}

      {/* Main Left Sidebar */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-[260px] sm:w-[270px] bg-slate-50/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none text-slate-800 border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out z-[90] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/70 flex items-center justify-between gap-2.5 shrink-0">
          <div 
            onClick={handleHomeClick}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            title="Kembali ke Beranda Dashboard"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-400/30 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform p-1">
              <InitialDLogo className="w-5.5 h-5.5" glow />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-black text-slate-900 tracking-wide truncate leading-tight m-0 uppercase">
                  LOGISTIK PORTAL
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate m-0">
                WH-CKB &bull; Tools & Utilitas
              </p>
            </div>
          </div>

          {/* Toggle / Close Button */}
          <button 
            type="button"
            onClick={onToggle}
            className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Tutup / Sembunyikan Sidebar Kiri"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-2.5 border-b border-slate-200/60">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu & tools..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {/* 1. Main Navigation Section */}
          <div className="space-y-1">
            <div className="px-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Navigasi Utama
            </div>

            <button
              onClick={handleHomeClick}
              className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                currentView === 'home'
                  ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/70 font-semibold shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  currentView === 'home' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <LayoutGrid size={14} />
                </div>
                <span className="text-xs truncate font-semibold block">
                  Daftar Aplikasi & Sistem
                </span>
              </div>

              {currentView === 'home' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
              )}
            </button>
          </div>

          {/* 2. Menu Terhubung Database Section */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Database size={12} className="text-emerald-600 shrink-0" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  Terhubung Database ({dbTools.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDbExpanded(!isDbExpanded)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                title={isDbExpanded ? 'Perkecil grup Database' : 'Bentangkan grup Database'}
              >
                <ChevronDown size={13} className={`transition-transform duration-200 ${isDbExpanded ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            </div>

            {isDbExpanded && (
              <div className="space-y-1">
                {dbTools.length === 0 ? (
                  <div className="text-center py-3 px-2 bg-white/70 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-medium">
                    Tidak ada menu database yang cocok
                  </div>
                ) : (
                  dbTools.map(renderToolButton)
                )}
              </div>
            )}
          </div>

          {/* 3. Tools Generator Section (Tanpa Database) */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Wrench size={12} className="text-blue-600 shrink-0" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  Tools Generator ({generatorTools.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                title={isToolsExpanded ? 'Perkecil grup Generator' : 'Bentangkan grup Generator'}
              >
                <ChevronDown size={13} className={`transition-transform duration-200 ${isToolsExpanded ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            </div>

            {isToolsExpanded && (
              <div className="space-y-1">
                {generatorTools.length === 0 ? (
                  <div className="text-center py-3 px-2 bg-white/70 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-medium">
                    Tidak ada tools generator yang cocok
                  </div>
                ) : (
                  generatorTools.map(renderToolButton)
                )}
              </div>
            )}
          </div>

          {/* Global Empty State when searching */}
          {totalMatches === 0 && (
            <div className="text-center py-5 px-3 bg-white rounded-xl border border-slate-200/70">
              <Search size={16} className="mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-bold text-slate-600 m-0">Menu tidak ditemukan</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Coba cari kata kunci lainnya</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer: User Status & System Info */}
        <div className="p-2.5 border-t border-slate-200/70 bg-white/40 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs">
                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username || 'Operator Logistik'}
                </div>
                <div className="text-[9px] text-slate-500 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Sistem Online &bull; Aktif</span>
                </div>
              </div>
            </div>

            <button
              onClick={onToggle}
              className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              title="Perkecil / Tutup Sidebar Kiri"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
