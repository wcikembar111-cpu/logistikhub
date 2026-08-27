import React, { lazy, Suspense } from 'react';
import { LazyFallback } from './common/LazyFallback';
import { QrItem } from './BatchQrSection';
import { MainToolTab, LogisticsTab } from '../types';

export type { MainToolTab, LogisticsTab };

const QrGeneratorHoneywellModule = lazy(() => import('./logistics/QrGeneratorHoneywellModule').then(m => ({ default: m.QrGeneratorHoneywellModule })));
const EdCheckerModule = lazy(() => import('./logistics/EdCheckerModule').then(m => ({ default: m.EdCheckerModule })));
const StockOpnameModule = lazy(() => import('./logistics/StockOpnameModule').then(m => ({ default: m.StockOpnameModule })));
const SnGeneratorModule = lazy(() => import('./logistics/SnGeneratorModule').then(m => ({ default: m.SnGeneratorModule })));
const BatchCheckerModule = lazy(() => import('./logistics/BatchCheckerModule').then(m => ({ default: m.BatchCheckerModule })));
const PromosiModule = lazy(() => import('./logistics/PromosiModule').then(m => ({ default: m.PromosiModule })));
const SuratJalanModule = lazy(() => import('./logistics/SuratJalanModule').then(m => ({ default: m.SuratJalanModule })));
const ReturInventoryModule = lazy(() => import('./logistics/ReturInventoryModule').then(m => ({ default: m.ReturInventoryModule })));
const MonitoringPemusnahanModule = lazy(() => import('./logistics/MonitoringPemusnahanModule').then(m => ({ default: m.MonitoringPemusnahanModule })));
const DataPemusnahanModule = lazy(() => import('./logistics/DataPemusnahanModule').then(m => ({ default: m.DataPemusnahanModule })));

interface EmbeddedToolsWorkspaceProps {
  activeTool: MainToolTab;
  onSelectTool: (tool: MainToolTab) => void;
  onCloseWorkspace?: () => void;
  onSetBatchItems: (items: QrItem[]) => void;
}

export function EmbeddedToolsWorkspace({ 
  activeTool, 
  onSetBatchItems 
}: EmbeddedToolsWorkspaceProps) {
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
            {activeTool === 'data-pemusnahan' && <DataPemusnahanModule />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

