import { useState, useMemo, lazy, Suspense } from 'react';
import { useLinks, useTodos, useAuth, useBroadcast } from './hooks/useSupabase';
import { BroadcastBar } from './components/broadcast/BroadcastBar';
import { FloatingRobotBroadcast } from './components/broadcast/FloatingRobotBroadcast';
import { FloatingTodoBroadcast } from './components/todo/FloatingTodoBroadcast';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { ToolsGrid } from './components/ToolsGrid';
import { ToolWorkspacePage } from './components/tools/ToolWorkspacePage';
import { QrItem } from './components/BatchQrSection';
import { Sidebar } from './components/Sidebar';
import { LinkData, MainToolTab } from './types';

// Lazy Loaded Modals for Ultra-Fast Initial Page Load
const BroadcastModal = lazy(() => import('./components/broadcast/BroadcastModal').then(m => ({ default: m.BroadcastModal })));
const LinkModal = lazy(() => import('./components/LinkModal').then(m => ({ default: m.LinkModal })));

export default function App() {
  // Page View Routing State: 'home' (Halaman Utama) or 'tool-workspace' (Halaman Khusus Tools & Utilitas)
  const [currentView, setCurrentView] = useState<'home' | 'tool-workspace'>('home');

  const { links, loading: linksLoading, addLink, updateLink, deleteLink } = useLinks();
  const { 
    todos, 
    loading: todosLoading, 
    addTodo, 
    updateTodoStatus, 
    updateTodo, 
    deleteTodo, 
    deleteCompletedTodos,
    incomingNewTodo,
    dismissIncomingTodo
  } = useTodos();
  const { user, isAdmin, isSuperAdmin, isOperator } = useAuth();
  
  // Realtime Broadcast Hook
  const { 
    messages: broadcastMessages, 
    loading: broadcastLoading, 
    incomingBroadcast, 
    soundEnabled: broadcastSoundEnabled, 
    notificationPermission,
    isNotificationSupported,
    requestNotificationPermission,
    sendBroadcast, 
    deleteMessage: deleteBroadcastMessage, 
    clearAllMessages: clearAllBroadcastMessages, 
    dismissIncomingBroadcast, 
    toggleSound: toggleBroadcastSound,
    externalConfig: broadcastExternalConfig,
    updateExternalConfig: updateBroadcastExternalConfig,
    testExternalConnection: testBroadcastExternalConnection,
    syncStatus: broadcastSyncStatus,
    isExternalConfigured: isBroadcastExternalConfigured
  } = useBroadcast();

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [replyRecipient, setReplyRecipient] = useState<string>('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<MainToolTab>('qr-generator');
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

  const handleReplyBroadcast = (senderName: string) => {
    setReplyRecipient(senderName);
    setShowBroadcastModal(true);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <>
      <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-bg-body text-black">
        <div className={`flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 transition-all duration-400 no-scrollbar min-w-0 ${currentView === 'home' && isSidebarOpen ? 'lg:mr-[360px] xl:mr-[380px]' : ''}`}>
          
          {/* Tombol & Bar Siaran Antar-Perangkat (Broadcast) - Hanya di Halaman Utama */}
          {currentView === 'home' && (
            <BroadcastBar 
              onOpenBroadcastModal={() => {
                setReplyRecipient('');
                setShowBroadcastModal(true);
              }}
              latestBroadcast={broadcastMessages[0] || null}
              messageCount={broadcastMessages.length}
              soundEnabled={broadcastSoundEnabled}
              onToggleSound={toggleBroadcastSound}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={requestNotificationPermission}
              isNotificationSupported={isNotificationSupported}
            />
          )}
          
          {/* VIEW 1: HALAMAN UTAMA (Main Dashboard) */}
          {currentView === 'home' ? (
            <>
              <Hero 
                user={user}
                isAdmin={isAdmin} 
                isSuperAdmin={isSuperAdmin}
                isOperator={isOperator}
                todos={todos}
                onOpenTodo={() => setIsSidebarOpen(true)}
              />

              <LinkGrid 
                links={links} 
                loading={linksLoading}
                isAdmin={isAdmin}
                isSuperAdmin={isSuperAdmin}
                onAdd={handleOpenAddLink}
                onEdit={handleOpenEditLink}
                onDelete={(id) => {
                  deleteLink(id);
                }}
              />

              <ToolsGrid 
                activeTool={activeWorkspaceTool}
                onSelectTool={(tool) => {
                  setActiveWorkspaceTool(tool);
                  setCurrentView('tool-workspace');
                }}
              />
            </>
          ) : (
            /* VIEW 2: HALAMAN KHUSUS TOOLS & UTILITAS (Dedicated Workspace Page) */
            <ToolWorkspacePage
              activeTool={activeWorkspaceTool}
              onSelectTool={(tool) => setActiveWorkspaceTool(tool)}
              onBackToHome={() => setCurrentView('home')}
              batchQrItems={batchQrItems}
              onSetBatchQrItems={setBatchQrItems}
            />
          )}
        </div>

        {/* Sidebar Public Todo - Hanya di Halaman Utama */}
        {currentView === 'home' && (
          <Sidebar 
            todos={todos}
            loading={todosLoading}
            isAdmin={isAdmin}
            currentUser={user}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onAddTodo={addTodo}
            onUpdateStatus={updateTodoStatus}
            onUpdateTodo={updateTodo}
            onDeleteTodo={deleteTodo}
            onDeleteCompletedTodos={deleteCompletedTodos}
            onRefresh={() => {}} 
          />
        )}
      </div>

      {/* Robot Melayang Pembawa Pesan Siaran */}
      <FloatingRobotBroadcast
        broadcast={incomingBroadcast}
        onClose={dismissIncomingBroadcast}
        onReply={handleReplyBroadcast}
        soundEnabled={broadcastSoundEnabled}
      />

      {/* Siaran Popup Tugas Baru Public Todo ke Semua Perangkat */}
      <FloatingTodoBroadcast
        incomingTodo={incomingNewTodo}
        onClose={dismissIncomingTodo}
        onOpenTodo={() => {
          dismissIncomingTodo();
          setCurrentView('home');
          setIsSidebarOpen(true);
        }}
        soundEnabled={broadcastSoundEnabled}
      />

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
            onDeleteMessage={deleteBroadcastMessage}
            onClearAll={clearAllBroadcastMessages}
            initialSenderName={replyRecipient}
            isAdmin={isAdmin}
            currentUser={user}
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
            isNotificationSupported={isNotificationSupported}
            externalConfig={broadcastExternalConfig}
            onUpdateExternalConfig={updateBroadcastExternalConfig}
            onTestExternalConnection={testBroadcastExternalConnection}
            syncStatus={broadcastSyncStatus}
            isExternalConfigured={isBroadcastExternalConfigured}
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
    </>
  );
}
