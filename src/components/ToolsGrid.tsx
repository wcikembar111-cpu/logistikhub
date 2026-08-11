import React from 'react';
import { QrCode, Wrench, Sparkles, Layers } from 'lucide-react';

interface ToolsGridProps {
  onOpenQrGenerator: () => void;
}

export function ToolsGrid({ onOpenQrGenerator }: ToolsGridProps) {
  const tools = [
    {
      id: 'qr-generator',
      title: 'Generator QR Code',
      category: 'Satuan & Massal',
      icon: <QrCode size={26} className="text-white drop-shadow-sm" />,
      style: 'bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-950 text-white shadow-indigo-600/35 ring-1 ring-indigo-400/30',
      action: onOpenQrGenerator,
      badge: 'Baru'
    }
  ];

  return (
    <div className="mt-10 pt-6 border-t border-slate-300/60">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center">
            <Wrench size={18} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 m-0 drop-shadow-sm">
            Daftar Tools & Utilitas
          </h2>
        </div>
        <div className="bg-white/50 border border-white/60 shadow-sm rounded-full px-4 py-1.5 font-bold text-[11px] text-blue-900 tracking-wider backdrop-blur-sm flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-500" />
          <span>Tools Internal</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-5 pb-6">
        {tools.map((t) => (
          <div
            key={t.id}
            onClick={t.action}
            title={`${t.title} - ${t.category}`}
            className="glass-box p-3.5 sm:p-4 flex flex-col items-center justify-center relative min-h-[120px] sm:min-h-[135px] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:bg-white/90 hover:border-blue-400 cursor-pointer group bg-white/30 overflow-hidden text-slate-800 rounded-2xl sm:rounded-3xl"
          >
            {/* Visual shine gradient effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/0 via-white/30 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Badge Baru */}
            {t.badge && (
              <span className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-2xs">
                {t.badge}
              </span>
            )}

            {/* Main Icon Tile */}
            <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] flex items-center justify-center shrink-0 shadow-md ${t.style} transition-all duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-lg border border-white/40 overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none rounded-[20px]" />
              <div className="absolute -top-5 -left-5 w-10 h-10 bg-white/35 rounded-full blur-md pointer-events-none" />
              <span className="relative z-10">{t.icon}</span>
            </div>

            {/* Title Info */}
            <div className="w-full text-center mt-2.5 px-1 pointer-events-none">
              <h4 className="font-medium text-xs sm:text-[13px] text-slate-800 m-0 tracking-wide leading-snug break-words group-hover:text-blue-900 transition-colors duration-200 capitalize">
                {t.title}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
