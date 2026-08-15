import { useState, useMemo, lazy, Suspense } from 'react';
import { useLinks, useTodos, useAuth, useBroadcast } from './hooks/useSupabase';
import { QuranTicker } from './components/QuranTicker';
import { BroadcastBar } from './components/broadcast/BroadcastBar';
import { FloatingRobotBroadcast } from './components/broadcast/FloatingRobotBroadcast';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { ToolsGrid } from './components/ToolsGrid';
import { BatchQrSection, QrItem } from './components/BatchQrSection';
import { Sidebar } from './components/Sidebar';
import { MainToolTab } from './components/EmbeddedToolsWorkspace';
import { LogisticsTab } from './components/logistics/LogisticsModal';
import { LazyFallback } from './components/common/LazyFallback';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { LinkData } from './types';

// Lazy Loaded Modals and Workspaces for Ultra-Fast Initial Page Load
const EmbeddedToolsWorkspace = lazy(() => import('./components/EmbeddedToolsWorkspace').then(m => ({ default: m.EmbeddedToolsWorkspace })));
const BroadcastModal = lazy(() => import('./components/broadcast/BroadcastModal').then(m => ({ default: m.BroadcastModal })));
const QrGeneratorModal = lazy(() => import('./components/QrGeneratorModal').then(m => ({ default: m.QrGeneratorModal })));
const LogisticsModal = lazy(() => import('./components/logistics/LogisticsModal').then(m => ({ default: m.LogisticsModal })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const LinkModal = lazy(() => import('./components/LinkModal').then(m => ({ default: m.LinkModal })));

export default function App() {
  const { links, loading: linksLoading, addLink, updateLink, deleteLink } = useLinks();
  const { todos, loading: todosLoading, addTodo, updateTodoStatus, updateTodo, deleteTodo, deleteCompletedTodos } = useTodos();
  const { isAdmin, logout } = useAuth();
  
  // Realtime Broadcast Hook
  const { 
    messages: broadcastMessages, 
    loading: broadcastLoading, 
    incomingBroadcast, 
    soundEnabled: broadcastSoundEnabled, 
    sendBroadcast, 
    deleteMessage: deleteBroadcastMessage, 
    clearAllMessages: clearAllBroadcastMessages, 
    dismissIncomingBroadcast, 
    toggleSound: toggleBroadcastSound 
  } = useBroadcast();

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [replyRecipient, setReplyRecipient] = useState<string>('');

  const [showLogin, setShowLogin] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [logisticsTab, setLogisticsTab] = useState<LogisticsTab>('ed-checker');
  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<MainToolTab | null>('qr-generator');
  const [batchQrItems, setBatchQrItems] = useState<QrItem[]>([]);
  const [editingLink, setEditingLink] = useState<LinkData | null>(null);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    links.forEach(l => {
      if (l.category) cats.add(l.category.toUpperCase());
    });
    return Array.from(cats).sort();
  }, [links]);

  const handleOpenAddLink = () => {
    setEditingLink(null);
    setShowLinkModal(true);
  };

  const handleOpenEditLink = (link: LinkData) => {
    setEditingLink(link);
    setShowLinkModal(true);
  };

  const handleSaveLink = async (data: Omit<LinkData, 'id'>) => {
    if (editingLink) {
      await updateLink(editingLink.id, data);
    } else {
      await addLink(data);
    }
    setShowLinkModal(false);
  };

  const handleOpenToolModal = (tool: MainToolTab) => {
    if (tool === 'qr-generator') {
      setShowQrModal(true);
    } else {
      setLogisticsTab(tool as LogisticsTab);
      setShowLogisticsModal(true);
    }
  };

  const handleReplyBroadcast = (senderName: string) => {
    setReplyRecipient(senderName);
    setShowBroadcastModal(true);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-bg-body text-black">
      <div className={`flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 transition-all duration-400 no-scrollbar min-w-0 ${isSidebarOpen ? 'lg:mr-[360px] xl:mr-[380px]' : ''}`}>
        
        {/* Realtime Quran Ticker */}
        <QuranTicker />
        
        {/* Tombol & Bar Siaran Antar-Perangkat (Broadcast) */}
        <BroadcastBar 
          onOpenBroadcastModal={() => {
            setReplyRecipient('');
            setShowBroadcastModal(true);
          }}
          latestBroadcast={broadcastMessages[0] || null}
          messageCount={broadcastMessages.length}
          soundEnabled={broadcastSoundEnabled}
          onToggleSound={toggleBroadcastSound}
        />
        
        <Hero 
          isAdmin={isAdmin} 
          onLogin={() => setShowLogin(true)} 
          onLogout={logout} 
          todos={todos}
          onOpenTodo={() => setIsSidebarOpen(true)}
        />

        <LinkGrid 
          links={links} 
          loading={linksLoading}
          isAdmin={isAdmin} 
          onAdd={handleOpenAddLink}
          onEdit={handleOpenEditLink}
          onDelete={deleteLink}
        />

        <ToolsGrid 
          activeTool={activeWorkspaceTool}
          onSelectTool={(tool) => setActiveWorkspaceTool(tool)}
          onOpenModal={handleOpenToolModal}
        />

        {activeWorkspaceTool && (
          <Suspense fallback={<LazyFallback title="Menyiapkan Lembar Kerja..." minHeight="min-h-[300px]" />}>
            <EmbeddedToolsWorkspace 
              activeTool={activeWorkspaceTool}
              onSelectTool={(tool) => setActiveWorkspaceTool(tool)}
              onOpenModal={handleOpenToolModal}
              onCloseWorkspace={() => setActiveWorkspaceTool(null)}
              onSetBatchItems={(items) => setBatchQrItems(items)}
            />
          </Suspense>
        )}

        <BatchQrSection 
          items={batchQrItems} 
          onClear={() => setBatchQrItems([])} 
          onOpenModal={() => setShowQrModal(true)} 
        />
      </div>

      <Sidebar 
        todos={todos}
        loading={todosLoading}
        isAdmin={isAdmin}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onAddTodo={addTodo}
        onUpdateStatus={updateTodoStatus}
        onUpdateTodo={updateTodo}
        onDeleteTodo={deleteTodo}
        onDeleteCompletedTodos={deleteCompletedTodos}
        onRefresh={() => {}} 
      />

      {/* Robot Melayang Pembawa Pesan Siaran */}
      <FloatingRobotBroadcast
        broadcast={incomingBroadcast}
        onClose={dismissIncomingBroadcast}
        onReply={handleReplyBroadcast}
        soundEnabled={broadcastSoundEnabled}
      />

      {/* PWA Install Prompt Banner & Offline Detector */}
      <PwaInstallPrompt />

      {/* Lazy Modals Suspense Container */}
      <Suspense fallback={null}>
        {showBroadcastModal && (
          <BroadcastModal
            isOpen={showBroadcastModal}
            onClose={() => setShowBroadcastModal(false)}
            messages={broadcastMessages}
            loading={broadcastLoading}
            soundEnabled={broadcastSoundEnabled}
            onToggleSound={toggleBroadcastSound}
            onSend={sendBroadcast}
            onDeleteMessage={isAdmin ? deleteBroadcastMessage : undefined}
            onClearAll={isAdmin ? clearAllBroadcastMessages : undefined}
            initialSenderName={replyRecipient}
            isAdmin={isAdmin}
          />
        )}

        {showQrModal && (
          <QrGeneratorModal 
            isOpen={showQrModal} 
            onClose={() => setShowQrModal(false)} 
            onSetBatchItems={(items) => setBatchQrItems(items)}
            existingBatchCount={batchQrItems.length}
          />
        )}

        {showLogisticsModal && (
          <LogisticsModal
            isOpen={showLogisticsModal}
            onClose={() => setShowLogisticsModal(false)}
            initialTab={logisticsTab}
          />
        )}

        {showLogin && (
          <LoginModal 
            onClose={() => setShowLogin(false)} 
            onSuccess={() => setShowLogin(false)} 
          />
        )}

        {showLinkModal && (
          <LinkModal 
            link={editingLink}
            existingCategories={existingCategories}
            onClose={() => setShowLinkModal(false)}
            onSave={handleSaveLink}
          />
        )}
      </Suspense>
    </div>
  );
}
