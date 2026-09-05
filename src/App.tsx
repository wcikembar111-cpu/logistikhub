import { useState, useMemo } from 'react';
import { useLinks, useTodos, useAuth, useBroadcast } from './hooks/useSupabase';
import { FloatingRobotCompanion } from './components/broadcast/FloatingRobotCompanion';
import { FloatingRobotBroadcast } from './components/broadcast/FloatingRobotBroadcast';
import { FloatingTodoBroadcast } from './components/todo/FloatingTodoBroadcast';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { ToolsGrid } from './components/ToolsGrid';
import { ToolWorkspacePage } from './components/tools/ToolWorkspacePage';
import { QrItem } from './components/BatchQrSection';
import { Sidebar } from './components/Sidebar';
import { PublicTodoDrawer } from './components/todo/PublicTodoDrawer';
import { LoginPage } from './components/auth/LoginPage';
import { LoginModal } from './components/auth/LoginModal';
import { InactivityWarningModal } from './components/auth/InactivityWarningModal';
import { UserManagementModal } from './components/auth/UserManagementModal';
import { SqlScriptModal } from './components/auth/SqlScriptModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { InitialDLogo } from './components/common/InitialDLogo';
import { LinkData, MainToolTab } from './types';
import { Warehouse, Loader2, PanelLeftOpen } from 'lucide-react';

import { BroadcastModal } from './components/broadcast/BroadcastModal';
import { LinkModal } from './components/LinkModal';

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

  // Modern Navigation & Drawer States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTodoDrawerOpen, setIsTodoDrawerOpen] = useState(false);

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
      <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white relative">
        
        {/* Modern Left Sidebar (Tools & Utilitas + Navigasi Utama) */}
        <Sidebar 
          activeTool={activeWorkspaceTool}
          onSelectTool={(tool) => {
            setActiveWorkspaceTool(tool);
            setCurrentView('tool-workspace');
          }}
          currentView={currentView}
          onNavigateHome={() => setCurrentView('home')}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          currentUser={user}
          isAdmin={isAdmin}
        />

        {/* Main Content Area (Bergeser mulus saat Sidebar Kiri terbuka) */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 transition-all duration-200 no-scrollbar min-w-0 ${isSidebarOpen ? 'lg:ml-[270px] xl:ml-[280px]' : 'lg:ml-0'}`}>
          
          {/* Floating Reopen Button if Sidebar is Closed */}
          {!isSidebarOpen && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs border border-slate-200 flex items-center gap-2 transition-all cursor-pointer hover:shadow-xs"
                title="Buka Sidebar Navigasi & Tools"
              >
                <PanelLeftOpen size={15} className="text-blue-600" />
                <span>Buka Sidebar Tools</span>
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
                onOpenTodo={() => setIsTodoDrawerOpen(true)}
                onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onOpenLogin={() => setShowLoginModal(true)}
                onOpenUserManagement={() => setShowUserManagementModal(true)}
                onLogout={() => logout('manual')}
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

              {/* 2. Daftar Aplikasi & Sistem (Menu Grid Tetap di Halaman Utama) */}
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
            </ErrorBoundary>
          ) : (
            /* VIEW 2: HALAMAN KHUSUS TOOLS & UTILITAS (Dedicated Workspace Page) */
            <ErrorBoundary 
              fallbackTitle="Gagal Membuka Workspace Modul" 
              onReset={() => setCurrentView('home')}
            >
              <ToolWorkspacePage
                activeTool={activeWorkspaceTool}
                onSelectTool={(tool) => setActiveWorkspaceTool(tool)}
                onBackToHome={() => setCurrentView('home')}
                batchQrItems={batchQrItems}
                onSetBatchQrItems={setBatchQrItems}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* Public Todo Drawer (Slide-over di Kanan - Terpisah Bersih dari Sidebar Kiri) */}
        <PublicTodoDrawer 
          isOpen={isTodoDrawerOpen}
          onClose={() => setIsTodoDrawerOpen(false)}
          todos={todos}
          loading={todosLoading}
          isAdmin={isAdmin}
          currentUser={user}
          onAddTodo={addTodo}
          onUpdateStatus={updateTodoStatus}
          onUpdateTodo={updateTodo}
          onDeleteTodo={deleteTodo}
          onDeleteCompletedTodos={deleteCompletedTodos}
          onRefresh={() => {}} 
        />
      </div>

      {/* Robot Popups & Broadcast Notifiers - Hanya Tampil di Halaman Utama */}
      {currentView === 'home' && (
        <>
          {/* Robot Melayang Pembawa Pesan Siaran Masuk */}
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
              setIsTodoDrawerOpen(true);
            }}
            soundEnabled={broadcastSoundEnabled}
          />
        </>
      )}

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
      </ErrorBoundary>
    </>
  );
}

