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
import { LoginPage } from './components/auth/LoginPage';
import { LoginModal } from './components/auth/LoginModal';
import { InactivityWarningModal } from './components/auth/InactivityWarningModal';
import { UserManagementModal } from './components/auth/UserManagementModal';
import { SqlScriptModal } from './components/auth/SqlScriptModal';
import { LinkData, MainToolTab } from './types';
import { Warehouse, Loader2 } from 'lucide-react';

// Lazy Loaded Modals for Ultra-Fast Initial Page Load
const BroadcastModal = lazy(() => import('./components/broadcast/BroadcastModal').then(m => ({ default: m.BroadcastModal })));
const LinkModal = lazy(() => import('./components/LinkModal').then(m => ({ default: m.LinkModal })));

export default function App() {
  // Page View Routing State: 'home' (Halaman Utama) or 'tool-workspace' (Halaman Khusus Tools & Utilitas)
  const [currentView, setCurrentView] = useState<'home' | 'tool-workspace'>('home');

  const { user, loading: authLoading, isAdmin, logout } = useAuth();
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

  // Auth Modals State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showSqlScriptModal, setShowSqlScriptModal] = useState(false);
  
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

  // 1. Loading state saat inisialisasi sesi otentikasi dari LocalStorage/Database
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="relative flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 border border-blue-400/30 flex items-center justify-center shadow-2xl shadow-blue-900/50 text-amber-300 animate-pulse">
            <Warehouse size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white tracking-tight">Kino Logistics Studio</h2>
            <p className="text-xs text-slate-400 font-medium">Memeriksa status sesi & keamanan pengguna...</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/40 px-3.5 py-1.5 rounded-full mt-2">
            <Loader2 size={14} className="animate-spin text-blue-400" />
            <span>Memuat Portal Logistik</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Proteksi Halaman: Pengguna WAJIB Login Terlebih Dahulu Sebelum Dapat Masuk ke Halaman Utama
  if (!user) {
    return (
      <>
        <LoginPage onOpenSqlScript={() => setShowSqlScriptModal(true)} />
        <SqlScriptModal 
          isOpen={showSqlScriptModal}
          onClose={() => setShowSqlScriptModal(false)}
        />
      </>
    );
  }

  // 3. Tampilan Halaman Utama (Main Dashboard & Workspace) setelah berhasil Login
  return (
    <>
      <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white">
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
                isSuperAdmin={isAdmin}
                isOperator={!isAdmin}
                todos={todos}
                onOpenTodo={() => setIsSidebarOpen(true)}
                onOpenLogin={() => setShowLoginModal(true)}
                onOpenUserManagement={() => setShowUserManagementModal(true)}
                onLogout={() => logout('manual')}
              />

              <LinkGrid 
                links={links} 
                loading={linksLoading}
                isAdmin={isAdmin}
                isSuperAdmin={isAdmin}
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

      {/* Auth Modals & Inactivity Warning */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <UserManagementModal
        isOpen={showUserManagementModal}
        onClose={() => setShowUserManagementModal(false)}
      />

      <SqlScriptModal 
        isOpen={showSqlScriptModal}
        onClose={() => setShowSqlScriptModal(false)}
      />

      <InactivityWarningModal />

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

