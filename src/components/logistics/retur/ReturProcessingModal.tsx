import React from 'react';
import { Loader2, CheckCircle2, Cpu, Sparkles, FileSpreadsheet, Layers, BarChart3 } from 'lucide-react';

export interface ProcessingStep {
  title: string;
  desc: string;
  percent: number;
}

interface ReturProcessingModalProps {
  isOpen: boolean;
  step: ProcessingStep;
  fileName?: string;
  rowCount?: number;
}

export function ReturProcessingModal({
  isOpen,
  step,
  fileName,
  rowCount
}: ReturProcessingModalProps) {
  if (!isOpen) return null;

  const isComplete = step.percent >= 100;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col items-center text-center p-6 sm:p-7 relative">
        {/* Animated Background Aura */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Central Icon with Processing Animation */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isComplete 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' 
              : 'bg-gradient-to-tr from-blue-900 via-indigo-900 to-rose-900 text-white shadow-xl shadow-blue-900/20'
          }`}>
            {isComplete ? (
              <CheckCircle2 size={38} className="animate-in zoom-in-50 duration-200" />
            ) : (
              <div className="relative flex items-center justify-center">
                <Cpu size={34} className="animate-pulse" />
                <div className="absolute -top-1.5 -right-1.5">
                  <Sparkles size={16} className="text-amber-300 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {!isComplete && (
            <div className="absolute -inset-2 rounded-3xl border-2 border-dashed border-blue-500/40 animate-spin" style={{ animationDuration: '8s' }} />
          )}
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2.5 bg-blue-50 text-blue-900 border border-blue-200">
          {!isComplete ? (
            <>
              <Loader2 size={12} className="animate-spin text-blue-700" />
              <span>Sedang Memproses Generator...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span>Analisis Selesai</span>
            </>
          )}
        </div>

        {/* Step Title & Description */}
        <h3 className="text-lg font-black text-slate-900 m-0 tracking-tight leading-snug">
          {step.title}
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs leading-relaxed">
          {step.desc}
        </p>

        {/* File & Row Meta if present */}
        {(fileName || (rowCount !== undefined && rowCount > 0)) && (
          <div className="mt-3 py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium flex items-center gap-2">
            <FileSpreadsheet size={13} className="text-blue-700 shrink-0" />
            <span className="truncate max-w-[200px]" title={fileName}>{fileName || 'Data Retur'}</span>
            {rowCount !== undefined && rowCount > 0 && (
              <span className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                {rowCount} baris
              </span>
            )}
          </div>
        )}

        {/* Progress Bar Container */}
        <div className="w-full mt-5 space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-bold">
            <span className="text-slate-400">Progres Generator</span>
            <span className="font-mono text-blue-900">{Math.round(step.percent)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div 
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isComplete
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(step.percent, 5))}%` }}
            />
          </div>
        </div>

        {/* Step Indicator Bullets */}
        <div className="grid grid-cols-4 gap-1.5 w-full mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
          <div className={`flex flex-col items-center gap-1 ${step.percent >= 25 ? 'text-blue-900 font-bold' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${step.percent >= 25 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <span>Format</span>
          </div>
          <div className={`flex flex-col items-center gap-1 ${step.percent >= 50 ? 'text-blue-900 font-bold' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${step.percent >= 50 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <span>22 Kolom</span>
          </div>
          <div className={`flex flex-col items-center gap-1 ${step.percent >= 75 ? 'text-blue-900 font-bold' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${step.percent >= 75 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <span>Konversi & ED</span>
          </div>
          <div className={`flex flex-col items-center gap-1 ${step.percent >= 100 ? 'text-emerald-700 font-bold' : ''}`}>
            <span className={`w-2 h-2 rounded-full ${step.percent >= 100 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <span>Summary</span>
          </div>
        </div>
      </div>
    </div>
  );
}
