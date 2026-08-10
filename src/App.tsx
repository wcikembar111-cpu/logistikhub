import { useState, useMemo } from 'react';
import { useLinks, useTodos, useAuth } from './hooks/useSupabase';
import { Ticker } from './components/Ticker';
import { QuranTicker } from './components/QuranTicker';
import { Hero } from './components/Hero';
import { LinkGrid } from './components/LinkGrid';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { LinkModal } from './components/LinkModal';
import { LinkData } from './types';

export default function App() {
  const { links, loading: linksLoading, addLink, updateLink, deleteLink } = useLinks();
  const { todos, loading: todosLoading, addTodo, updateTodoStatus, deleteTodo, deleteCompletedTodos } = useTodos();
  const { isAdmin, logout } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen p-0 overflow-hidden text-[13px] font-sans bg-bg-body text-black">
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 transition-all duration-400 no-scrollbar min-w-0 ${isSidebarOpen ? 'lg:mr-[360px] xl:mr-[400px]' : ''}`}>
        
        <QuranTicker />
        
        {/* Ticker / Pengumuman ditempatkan tepat di bawah Quran */}
        <div className="mb-6">
          <Ticker isAdmin={isAdmin} />
        </div>
        
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
      </div>

      <Sidebar 
        todos={todos}
        loading={todosLoading}
        isAdmin={isAdmin}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onAddTodo={addTodo}
        onUpdateStatus={updateTodoStatus}
        onDeleteTodo={deleteTodo}
        onDeleteCompletedTodos={deleteCompletedTodos}
        onRefresh={() => {}} // Snapshot is real-time, no manual refresh needed, but we provide button
      />

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
    </div>
  );
}
