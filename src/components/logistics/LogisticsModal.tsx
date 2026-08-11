import React, { useState, useEffect } from 'react';
import { X, Calendar, Layers, Barcode, ArrowRightLeft, PackageCheck } from 'lucide-react';
import { EdCheckerModule } from './EdCheckerModule';
import { StockOpnameModule } from './StockOpnameModule';
import { SnGeneratorModule } from './SnGeneratorModule';
import { BatchCheckerModule } from './BatchCheckerModule';

export type LogisticsTab = 'ed-checker' | 'stock-opname' | 'sn-generator' | 'batch-checker';

interface LogisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LogisticsTab;
}

export function LogisticsModal({ isOpen, onClose, initialTab = 'ed-checker' }: LogisticsModalProps) {
  const [activeTab, setActiveTab] = useState<LogisticsTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="glass-box !bg-white/95 p-5 sm:p-7 rounded-3xl max-w-5xl w-full shadow-2xl border border-blue-300 relative max-h-[92vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-center shadow-md">
              <PackageCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">Logistik & Warehouse Suite</h3>
              <p className="text-xs text-slate-500 m-0">Modul otomatisasi pergudangan, ED, Stock Opname, Serial Number & Batch Reconciliation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 my-4 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveTab('ed-checker')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ed-checker'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Calendar size={15} />
            <span>Cek Expired Date</span>
          </button>

          <button
            onClick={() => setActiveTab('stock-opname')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'stock-opname'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Layers size={15} />
            <span>Stock Opname Suite</span>
          </button>

          <button
            onClick={() => setActiveTab('sn-generator')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'sn-generator'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Barcode size={15} />
            <span>Serial Number Gen</span>
          </button>

          <button
            onClick={() => setActiveTab('batch-checker')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'batch-checker'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ArrowRightLeft size={15} />
            <span>Batch Checker</span>
          </button>
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'ed-checker' && <EdCheckerModule />}
          {activeTab === 'stock-opname' && <StockOpnameModule />}
          {activeTab === 'sn-generator' && <SnGeneratorModule />}
          {activeTab === 'batch-checker' && <BatchCheckerModule />}
        </div>
      </div>
    </div>
  );
}
