import React from 'react';
import { X, QrCode } from 'lucide-react';
import { QrGeneratorHoneywellModule } from './logistics/QrGeneratorHoneywellModule';
import { QrItem } from './BatchQrSection';

interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetBatchItems: (items: QrItem[]) => void;
  existingBatchCount: number;
}

export function QrGeneratorModal({ isOpen, onClose, onSetBatchItems }: QrGeneratorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white p-4 sm:p-6 rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 relative max-h-[94vh] flex flex-col overflow-hidden text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-2xs shrink-0">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 m-0">
                Generator QR Code & Print Honeywell PM42
              </h3>
              <p className="text-xs text-slate-500 m-0">
                Standard Thermal Label Printing (203 DPI / 8 dots·mm) & Direct Protocol / ZPL II
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
          <QrGeneratorHoneywellModule onExportBatchItems={onSetBatchItems} />
        </div>
      </div>
    </div>
  );
}
