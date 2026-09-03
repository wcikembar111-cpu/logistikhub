import { ErrorBoundary } from './common/ErrorBoundary';
import { QrItem } from './BatchQrSection';
import { MainToolTab, LogisticsTab } from '../types';

import { QrGeneratorHoneywellModule } from './logistics/QrGeneratorHoneywellModule';
import { EdCheckerModule } from './logistics/EdCheckerModule';
import { StockOpnameModule } from './logistics/StockOpnameModule';
import { SnGeneratorModule } from './logistics/SnGeneratorModule';
import { BatchCheckerModule } from './logistics/BatchCheckerModule';
import { PromosiModule } from './logistics/PromosiModule';
import { SuratJalanModule } from './logistics/SuratJalanModule';
import { ReturInventoryModule } from './logistics/ReturInventoryModule';
import { MonitoringPemusnahanModule } from './logistics/MonitoringPemusnahanModule';
import { DataPemusnahanModule } from './logistics/DataPemusnahanModule';
import { OutboundLrgModule } from './logistics/OutboundLrgModule';

export type { MainToolTab, LogisticsTab };

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
        {/* ACTIVE TOOL MODULE RENDERING WITH ERROR BOUNDARY */}
        <div className="w-full">
          <ErrorBoundary 
            key={activeTool} 
            fallbackTitle="Gagal Membuka Menu Modul"
            fallbackMessage="Terjadi kendala saat memuat data modul ini. Silakan klik tombol di bawah untuk mencoba kembali."
          >
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
            {activeTool === 'outbound-lrg' && <OutboundLrgModule />}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

