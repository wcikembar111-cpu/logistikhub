import { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { useLinks, useTodos, useAuth, useBroadcast } from './hooks/useSupabase';
import { useInactivityLock } from './hooks/useInactivityLock';
import { BroadcastBar } from './components/broadcast/BroadcastBar';
import { FloatingRobotBroadcast } from './components/broadcast/FloatingRobotBroadcast';
import { FloatingTodoBroadcast } from './components/todo/FloatingTodoBroadcast';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { ToolsGrid } from './components/ToolsGrid';
import { ToolWorkspacePage } from './components/tools/ToolWorkspacePage';
import { QrItem } from './components/BatchQrSection';
import { Sidebar } from './components/Sidebar';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { isPinUnlocked } from './utils/pinAuth';
import { LinkData, MainToolTab } from './types';

// Lazy Loaded Modals for Ultra-Fast Initial Page Load
const BroadcastModal = lazy(() => import('./components/broadcast/BroadcastModal').then(m => ({ default: m.BroadcastModal })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const LinkModal = lazy(() => import('./components/LinkModal').then(m => ({ default: m.LinkModal })));
const AdminUserModal = lazy(() => import('./components/AdminUserModal').then(m => ({ default: m.AdminUserModal })));

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
  const { user, role, isAdmin, isSuperAdmin, isOperator, logout } = useAuth();
  
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

  const [showLogin, setShowLogin] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
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
    if (!isSuperAdmin) return;
    setEditingLink(null);
    setShowLinkModal(true);
  };

  const handleOpenEditLink = (link: LinkData) => {
    if (!isSuperAdmin) return;
    setEditingLink(link);
    setShowLinkModal(true);
  };

  const handleSaveLink = async (data: Omit<LinkData, 'id'>) => {
    if (!isSuperAdmin) return;
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

  const handleLockApplication = () => {
    lockNow();
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <>
      {/* If locked, present the 6-Digit PIN Screen */}
      {!unlocked && (
        <PinLockScreen onUnlocked={() => setUnlocked(true)} />
      )}

      <div className={`flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-bg-body text-black ${!unlocked ? 'pointer-events-none' : ''}`}>
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
                onLogout={logout} 
                onLockApp={handleLockApplication}
                onManageUsers={isAdmin ? () => setShowAdminUserModal(true) : undefined}
                sessionTimeoutMinutes={timeoutMinutes}
                onChangeSessionTimeout={updateTimeoutMinutes}
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
                  if (!isSuperAdmin) return;
                  deleteLink(id);
                }}
                onManageUsers={() => setShowAdminUserModal(true)}
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
              onLockApp={handleLockApplication}
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

      {/* Robot Melayang Pembawa Pesan Siaran - Tampil di Semua Kondisi termasuk saat PIN Terkunci */}
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
            onDeleteMessage={isAdmin ? deleteBroadcastMessage : undefined}
            onClearAll={isAdmin ? clearAllBroadcastMessages : undefined}
            initialSenderName={replyRecipient}
            isAdmin={isAdmin}
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

        {showAdminUserModal && (
          <AdminUserModal 
            onClose={() => setShowAdminUserModal(false)} 
          />
        )}
      </Suspense>
    </>
  );
}
