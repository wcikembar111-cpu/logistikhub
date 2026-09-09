import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useLinks, useTodos, useAuth, useBroadcast, useMenuVisibility } from './hooks/useSupabase';
import { FloatingRobotCompanion } from './components/broadcast/FloatingRobotCompanion';
import { FloatingRobotBroadcast } from './components/broadcast/FloatingRobotBroadcast';
import { FloatingTodoBroadcast } from './components/todo/FloatingTodoBroadcast';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { ToolWorkspacePage } from './components/tools/ToolWorkspacePage';
import { QrItem } from './components/BatchQrSection';
import { Sidebar } from './components/Sidebar';
import { PublicTodoDrawer } from './components/todo/PublicTodoDrawer';
import { LoginPage } from './components/auth/LoginPage';
import { LoginModal } from './components/auth/LoginModal';
import { InactivityWarningModal } from './components/auth/InactivityWarningModal';
import { UserManagementModal } from './components/auth/UserManagementModal';
import { SqlScriptModal } from './components/auth/SqlScriptModal';
import { MenuVisibilityModal } from './components/common/MenuVisibilityModal';
import { PinSecurityModal } from './components/common/PinSecurityModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { InitialDLogo } from './components/common/InitialDLogo';
import { LinkData, MainToolTab, BroadcastMessage } from './types';
import { Warehouse, Loader2, PanelLeftOpen } from 'lucide-react';

import { BroadcastBar } from './components/broadcast/BroadcastBar';
import { BroadcastModal } from './components/broadcast/BroadcastModal';
import { LinkModal } from './components/LinkModal';
import { playBroadcastSound } from './utils/broadcastSound';

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
    dismissIncomingTodo,
    refreshTodos
  } = useTodos();

  // Menu Visibility Hook (Realtime Supabase + PIN 399339)
  const {
    hiddenMenuIds,
    hideMenu,
    unhideMenu,
    toggleMenuVisibility,
    unhideAllMenus,
    isRealtimeConnected: isMenuRealtimeConnected
  } = useMenuVisibility();

  const [showMenuVisibilityModal, setShowMenuVisibilityModal] = useState(false);
  const [pinSecurityModalConfig, setPinSecurityModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    description?: string;
    actionType: 'visibility' | 'hide' | 'unhide' | 'default';
    targetName?: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    actionType: 'visibility',
    onSuccess: () => {}
  });

  const handleOpenMenuVisibility = () => {
    setPinSecurityModalConfig({
      isOpen: true,
      actionType: 'visibility',
      title: 'Otorisasi Kelola Visibilitas Menu',
      subtitle: 'Masukkan PIN Keamanan untuk membuka manajemen hide & unhide menu.',
      description: 'PIN Keamanan ( 399339 ) diperlukan untuk mengatur menu yang tampil pada Sidebar & Grid.',
      onSuccess: () => {
        setPinSecurityModalConfig(prev => ({ ...prev, isOpen: false }));
        setShowMenuVisibilityModal(true);
      }
    });
  };

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

  // Modern Navigation & Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTodoDrawerOpen, setIsTodoDrawerOpen] = useState(true);

  const handleReplyPopupBroadcast = (senderName: string) => {
    dismissIncomingBroadcast();
    setReplyRecipient(senderName);
    setShowBroadcastModal(true);
  };

  const handleOpenTool = (tool: MainToolTab) => {
    setActiveWorkspaceTool(tool);
    setCurrentView('tool-workspace');
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
  };

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

  // 1. Loading state saat inisialisasi sesi otentikasi dari LocalStorage/Database
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="relative flex flex-col items-center gap-5 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-400/40 flex items-center justify-center shadow-2xl shadow-blue-900/60 p-2.5 animate-pulse">
            <InitialDLogo className="w-11 h-11" glow />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white tracking-tight">Logistik Tools</h2>
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
        <LoginPage 
          onOpenSqlScript={() => setShowSqlScriptModal(true)}
          broadcastMessages={broadcastMessages}
          incomingBroadcast={incomingBroadcast}
          broadcastSoundEnabled={broadcastSoundEnabled}
          onToggleBroadcastSound={toggleBroadcastSound}
          onSendBroadcast={sendBroadcast}
          onDismissIncomingBroadcast={dismissIncomingBroadcast}
        />
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
      <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-gradient-to-br from-white via-blue-50/20 to-sky-50/30 text-slate-800 selection:bg-blue-600 selection:text-white relative">
        
        {/* Modern Left Sidebar (Tools & Utilitas + Navigasi Utama) */}
        <Sidebar 
          activeTool={activeWorkspaceTool}
          onSelectTool={(tool) => handleOpenTool(tool)}
          currentView={currentView}
          onNavigateHome={handleNavigateHome}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          currentUser={user}
          isAdmin={isAdmin}
          hiddenMenuIds={hiddenMenuIds}
          onOpenMenuVisibility={handleOpenMenuVisibility}
          latestBroadcast={broadcastMessages[0] || null}
          broadcastCount={broadcastMessages.length}
          onOpenBroadcast={() => setShowBroadcastModal(true)}
          onMenuSelectWithBroadcast={(toolId) => handleOpenTool(toolId)}
          onNavigateHomeWithBroadcast={handleNavigateHome}
        />

        {/* Main Content Area (Bergeser mulus saat Sidebar Kiri terbuka dan Todo Kanan aktif) */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 transition-all duration-300 no-scrollbar min-w-0 ${
          isSidebarOpen ? 'lg:ml-[270px] xl:ml-[280px]' : 'lg:ml-0'
        } ${
          isTodoDrawerOpen ? '2xl:mr-[410px]' : '2xl:mr-0'
        }`}>
          
          {/* Floating Reopen Button if Sidebar is Closed */}
          {!isSidebarOpen && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-white via-blue-50 to-blue-100/70 hover:from-white hover:to-blue-100 text-blue-900 text-xs font-bold shadow-2xs border border-blue-200 flex items-center gap-2 transition-all cursor-pointer hover:shadow-xs"
                title="Buka Sidebar Tools & Utilitas"
              >
                <PanelLeftOpen size={15} className="text-blue-600" />
                <span>Buka Sidebar Tools & Utilitas</span>
              </button>
            </div>
          )}

          {/* VIEW 1: HALAMAN UTAMA (Main Dashboard) */}
          {currentView === 'home' ? (
            <ErrorBoundary fallbackTitle="Gagal Menampilkan Dashboard Utama">
              {/* 1. Header Utama: Profil Pengguna & Ucapan Selamat */}
              <Hero 
                user={user}
                isAdmin={isAdmin} 
                isSuperAdmin={isAdmin}
                isOperator={!isAdmin}
                todos={todos}
                onOpenTodo={() => setIsTodoDrawerOpen(prev => !prev)}
                onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onOpenLogin={() => setShowLoginModal(true)}
                onOpenUserManagement={() => setShowUserManagementModal(true)}
                onLogout={() => logout('manual')}
                onOpenMenuVisibility={handleOpenMenuVisibility}
                hiddenMenuCount={hiddenMenuIds.length}
                renderAvatarSlot={(isSpeaking) => (
                  <FloatingRobotCompanion 
                    onSendBroadcast={sendBroadcast}
                    latestBroadcast={broadcastMessages[0] || null}
                    recentMessages={broadcastMessages}
                    soundEnabled={broadcastSoundEnabled}
                    onToggleSound={toggleBroadcastSound}
                    currentUser={user}
                    isAdmin={isAdmin}
                    onDeleteMessage={deleteBroadcastMessage}
                    isSidebarOpen={isSidebarOpen}
                    mode="profile-avatar"
                    isSpeaking={isSpeaking}
                  />
                )}
              />

              {/* Pesan Siaran Intercom Bar di Halaman Utama */}
              <div className="mb-4">
                <BroadcastBar 
                  onOpenBroadcastModal={() => setShowBroadcastModal(true)}
                  latestBroadcast={broadcastMessages[0] || null}
                  messageCount={broadcastMessages.length}
                  soundEnabled={broadcastSoundEnabled}
                  onToggleSound={toggleBroadcastSound}
                  notificationPermission={notificationPermission}
                  onRequestNotificationPermission={requestNotificationPermission}
                  isNotificationSupported={isNotificationSupported}
                />
              </div>

              {/* 2. Daftar Aplikasi & Sistem (Menu Grid di Halaman Utama) */}
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
                hiddenMenuIds={hiddenMenuIds}
                onHideMenu={(id) => hideMenu(id)}
                onUnhideMenu={(id) => unhideMenu(id)}
                onOpenMenuVisibility={handleOpenMenuVisibility}
              />
            </ErrorBoundary>
          ) : (
            /* VIEW 2: HALAMAN KHUSUS TOOLS & UTILITAS (Dedicated Workspace Page) */
            <ErrorBoundary 
              fallbackTitle="Gagal Membuka Workspace Modul" 
              onReset={() => handleNavigateHome()}
            >
              <ToolWorkspacePage
                activeTool={activeWorkspaceTool}
                onSelectTool={(tool) => handleOpenTool(tool)}
                onBackToHome={handleNavigateHome}
                batchQrItems={batchQrItems}
                onSetBatchQrItems={setBatchQrItems}
                latestBroadcast={broadcastMessages[0] || null}
                broadcastCount={broadcastMessages.length}
                soundEnabled={broadcastSoundEnabled}
                onToggleSound={toggleBroadcastSound}
                onOpenBroadcast={() => setShowBroadcastModal(true)}
                notificationPermission={notificationPermission}
                onRequestNotificationPermission={requestNotificationPermission}
                isNotificationSupported={isNotificationSupported}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* Public Todo di Kanan Layar (Docked Right Panel dengan Tombol Buka/Tutup) */}
        <PublicTodoDrawer 
          isOpen={isTodoDrawerOpen}
          onClose={() => setIsTodoDrawerOpen(false)}
          onToggle={() => setIsTodoDrawerOpen(prev => !prev)}
          todos={todos}
          loading={todosLoading}
          isAdmin={isAdmin}
          currentUser={user}
          onAddTodo={addTodo}
          onUpdateStatus={updateTodoStatus}
          onUpdateTodo={updateTodo}
          onDeleteTodo={deleteTodo}
          onDeleteCompletedTodos={deleteCompletedTodos}
          onRefresh={refreshTodos} 
        />
      </div>

      {/* Floating Robot Companion saat di Tool Workspace */}
      {currentView === 'tool-workspace' && (
        <FloatingRobotCompanion 
          onSendBroadcast={sendBroadcast}
          latestBroadcast={broadcastMessages[0] || null}
          recentMessages={broadcastMessages}
          soundEnabled={broadcastSoundEnabled}
          onToggleSound={toggleBroadcastSound}
          currentUser={user}
          isAdmin={isAdmin}
          onDeleteMessage={deleteBroadcastMessage}
          isSidebarOpen={isSidebarOpen}
          mode="floating-bottom"
        />
      )}

      {/* Robot Popups & Broadcast Notifiers - Hanya Tampil Saat Ada Pesan Masuk Realtime */}
      <FloatingRobotBroadcast
        broadcast={incomingBroadcast}
        onClose={dismissIncomingBroadcast}
        onReply={handleReplyPopupBroadcast}
        soundEnabled={broadcastSoundEnabled}
      />

      {/* Siaran Popup Tugas Baru Public Todo ke Semua Perangkat */}
      <FloatingTodoBroadcast
        incomingTodo={incomingNewTodo}
        onClose={dismissIncomingTodo}
        onOpenTodo={() => {
          dismissIncomingTodo();
          setIsTodoDrawerOpen(true);
        }}
        soundEnabled={broadcastSoundEnabled}
      />

      {/* Auth Modals & Inactivity Warning */}
      <ErrorBoundary fallbackTitle="Gagal Membuka Modal Autentikasi">
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
      </ErrorBoundary>

      {/* Modals Container */}
      <ErrorBoundary fallbackTitle="Gagal Membuka Modal Interaktif">
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

        {/* Modal Manajemen Hide & Unhide Menu Realtime (PIN: 399339) */}
        {showMenuVisibilityModal && (
          <MenuVisibilityModal
            isOpen={showMenuVisibilityModal}
            onClose={() => setShowMenuVisibilityModal(false)}
            links={links}
            hiddenMenuIds={hiddenMenuIds}
            onToggleMenu={(id, _title, _isCurrentlyHidden) => {
              toggleMenuVisibility(id);
            }}
            onUnhideAll={unhideAllMenus}
            isRealtimeConnected={isMenuRealtimeConnected}
          />
        )}

        {/* PIN Security Modal untuk Otorisasi Menu & Fitur Sensitif (PIN: 399339) */}
        <PinSecurityModal 
          isOpen={pinSecurityModalConfig.isOpen}
          onClose={() => setPinSecurityModalConfig(prev => ({ ...prev, isOpen: false }))}
          onSuccess={pinSecurityModalConfig.onSuccess}
          title={pinSecurityModalConfig.title}
          subtitle={pinSecurityModalConfig.subtitle}
          description={pinSecurityModalConfig.description}
          targetName={pinSecurityModalConfig.targetName}
          actionType={pinSecurityModalConfig.actionType}
        />
      </ErrorBoundary>
    </>
  );
}

