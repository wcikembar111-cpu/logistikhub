import { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { useLinks, useTodos, useAuth, useBroadcast } from './hooks/useSupabase';
import { useInactivityLock } from './hooks/useInactivityLock';
import { BroadcastBar } from './components/broadcast/BroadcastBar';
import { FloatingRobotBroadcast } from './components/broadcast/FloatingRobotBroadcast';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { ToolsGrid } from './components/ToolsGrid';
import { ToolWorkspacePage } from './components/tools/ToolWorkspacePage';
import { QrItem } from './components/BatchQrSection';
import { Sidebar } from './components/Sidebar';
import { MainToolTab } from './components/EmbeddedToolsWorkspace';
import { LogisticsTab } from './components/logistics/LogisticsModal';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { isPinUnlocked, lockApp } from './utils/pinAuth';
import { LinkData } from './types';

// Lazy Loaded Modals and Workspaces for Ultra-Fast Initial Page Load
const BroadcastModal = lazy(() => import('./components/broadcast/BroadcastModal').then(m => ({ default: m.BroadcastModal })));
const QrGeneratorModal = lazy(() => import('./components/QrGeneratorModal').then(m => ({ default: m.QrGeneratorModal })));
const LogisticsModal = lazy(() => import('./components/logistics/LogisticsModal').then(m => ({ default: m.LogisticsModal })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const LinkModal = lazy(() => import('./components/LinkModal').then(m => ({ default: m.LinkModal })));

export default function App() {
  // 6-Digit PIN Screen Lock State
  const [unlocked, setUnlocked] = useState<boolean>(() => isPinUnlocked());

  // Handle auto-lock / manual lock callback
  const handleLockTriggered = useCallback(() => {
    setUnlocked(false);
  }, []);

  // Inactivity Auto-Lock Hook (Default: 15 minutes without interaction)
  const { timeoutMinutes, updateTimeoutMinutes, lockNow } = useInactivityLock({
    onLock: handleLockTriggered,
    enabled: unlocked
  });

  // Page View Routing State: 'home' (Halaman Utama) or 'tool-workspace' (Halaman Khusus Tools & Utilitas)
  const [currentView, setCurrentView] = useState<'home' | 'tool-workspace'>('home');

  const { links, loading: linksLoading, addLink, updateLink, deleteLink } = useLinks();
  const { todos, loading: todosLoading, addTodo, updateTodoStatus, updateTodo, deleteTodo, deleteCompletedTodos } = useTodos();
  const { isAdmin, logout } = useAuth();
  
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
    toggleSound: toggleBroadcastSound 
  } = useBroadcast();

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [replyRecipient, setReplyRecipient] = useState<string>('');

  const [showLogin, setShowLogin] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [logisticsTab, setLogisticsTab] = useState<LogisticsTab>('ed-checker');
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

  const handleLockApplication = () => {
    lockNow();
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // If locked, present the 6-Digit PIN Screen
  if (!unlocked) {
    return <PinLockScreen onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-bg-body text-black">
      <div className={`flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 transition-all duration-400 no-scrollbar min-w-0 ${isSidebarOpen ? 'lg:mr-[360px] xl:mr-[380px]' : ''}`}>
        
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
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={requestNotificationPermission}
          isNotificationSupported={isNotificationSupported}
        />
        
        {/* VIEW 1: HALAMAN UTAMA (Main Dashboard) */}
        {currentView === 'home' ? (
          <>
            <Hero 
              isAdmin={isAdmin} 
              onLogin={() => setShowLogin(true)} 
              onLogout={logout} 
              onLockApp={handleLockApplication}
              sessionTimeoutMinutes={timeoutMinutes}
              onChangeSessionTimeout={updateTimeoutMinutes}
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
              onSelectTool={(tool) => {
                setActiveWorkspaceTool(tool);
                setCurrentView('tool-workspace');
              }}
              onOpenModal={handleOpenToolModal}
            />
          </>
        ) : (
          /* VIEW 2: HALAMAN KHUSUS TOOLS & UTILITAS (Dedicated Workspace Page) */
          <ToolWorkspacePage
            activeTool={activeWorkspaceTool}
            onSelectTool={(tool) => setActiveWorkspaceTool(tool)}
            onBackToHome={() => setCurrentView('home')}
            onOpenModal={handleOpenToolModal}
            onLockApp={handleLockApplication}
            batchQrItems={batchQrItems}
            onSetBatchQrItems={setBatchQrItems}
          />
        )}
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
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
            isNotificationSupported={isNotificationSupported}
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
