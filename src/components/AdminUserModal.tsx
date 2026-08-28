import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Search, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Sparkles, 
  X,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { AdminUser } from '../types';
import { useAdminUsers, useAuth } from '../hooks/useSupabase';
import { useNotification } from '../context/NotificationContext';

interface AdminUserModalProps {
  onClose: () => void;
}

export function AdminUserModal({ onClose }: AdminUserModalProps) {
  const { user: currentAuthUser, isSuperAdmin, isAdmin } = useAuth();
  const { users, loading, fetchUsers, addUser, updateUser, deleteUser, toggleUserStatus } = useAdminUsers();
  const { showToast, showConfirm } = useNotification();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Create / Edit
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('admin');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formShowPin, setFormShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Quick PIN Reset Modal State
  const [pinResetTarget, setPinResetTarget] = useState<AdminUser | null>(null);
  const [quickNewPin, setQuickNewPin] = useState('');
  const [quickPinSubmitting, setQuickPinSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchUser = u.username.toLowerCase().includes(q);
      const matchNama = (u.nama_lengkap || '').toLowerCase().includes(q);
      const matchRole = (u.role || '').toLowerCase().includes(q);
      return matchUser || matchNama || matchRole;
    });
  }, [users, searchQuery]);

  const togglePinVisibility = (userIdOrName: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [userIdOrName]: !prev[userIdOrName]
    }));
  };

  const handleCopyPin = (pin: string, id: string) => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedId(id);
    showToast('PIN Disalin', `PIN ${pin} berhasil disalin ke clipboard`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setFormPin(randomPin);
    setFormShowPin(true);
    showToast('PIN Dibuat Otomatis', `PIN acak baru: ${randomPin}`, 'info');
  };

  const handleOpenEdit = (user: AdminUser) => {
    const isTargetSuperAdmin = user.role === 'superadmin' || user.username.toLowerCase() === 'superadmin';
    if (!isSuperAdmin && isTargetSuperAdmin) {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berhak mengedit profil akun Super Admin.', 'warning');
      return;
    }

    setEditingUser(user);
    setFormUsername(user.username);
    setFormNama(user.nama_lengkap || '');
    setFormPin(user.pin || '');
    setFormEmail(user.email || '');
    setFormRole(user.role || 'admin');
    setFormIsActive(user.is_active !== false);
    setFormError('');
    setActiveTab('create');
  };

  const handleResetForm = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormNama('');
    setFormPin('');
    setFormEmail('');
    setFormRole('admin');
    setFormIsActive(true);
    setFormError('');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUser = formUsername.trim().toLowerCase();
    const cleanPin = formPin.trim();

    if (!cleanUser) {
      setFormError('Username wajib diisi.');
      return;
    }

    if (!isSuperAdmin && formRole === 'superadmin') {
      setFormError('Hanya Super Admin yang berhak menetapkan peran Super Admin.');
      return;
    }

    if (editingUser) {
      const isTargetSuperAdmin = editingUser.role === 'superadmin' || editingUser.username.toLowerCase() === 'superadmin';
      if (!isSuperAdmin && isTargetSuperAdmin) {
        setFormError('Akses Ditolak: Anda tidak diizinkan memperbarui data akun Super Admin.');
        return;
      }
    }

    if (!editingUser && (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin))) {
      setFormError('PIN harus tepat 6 digit angka numerik (0-9).');
      return;
    }

    if (editingUser && cleanPin && (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin))) {
      setFormError('PIN harus tepat 6 digit angka numerik (0-9).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const id = editingUser.id || editingUser.username;
        await updateUser(id, {
          username: cleanUser,
          nama_lengkap: formNama.trim() || 'Administrator',
          email: formEmail.trim() || `${cleanUser}@kino.co.id`,
          role: formRole,
          is_active: formIsActive,
          ...(cleanPin ? { pin: cleanPin } : {})
        });
        showToast('Berhasil Diperbarui', `Data Pengguna ${cleanUser.toUpperCase()} berhasil disimpan.`, 'success');
      } else {
        await addUser({
          username: cleanUser,
          pin: cleanPin,
          nama_lengkap: formNama.trim() || 'Administrator',
          email: formEmail.trim() || `${cleanUser}@kino.co.id`,
          role: formRole,
          is_active: formIsActive
        });
        showToast('Pengguna Baru Ditambahkan', `User ${cleanUser.toUpperCase()} dengan PIN ${cleanPin} siap digunakan.`, 'success');
      }
      handleResetForm();
      setActiveTab('list');
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data Pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (user: AdminUser) => {
    const id = user.id || user.username;
    const isTargetSuperAdmin = user.role === 'superadmin' || user.username.toLowerCase() === 'superadmin';

    if (isTargetSuperAdmin) {
      showToast('Akses Ditolak', 'Akun Super Admin tidak boleh dihapus demi keamanan sistem.', 'warning');
      return;
    }

    if (user.username.toLowerCase() === 'admin') {
      showToast('Akses Ditolak', 'Akun Pengguna utama ("admin") tidak boleh dihapus demi keamanan.', 'warning');
      return;
    }

    if (!isSuperAdmin && isTargetSuperAdmin) {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berhak menghapus akun ini.', 'warning');
      return;
    }

    showConfirm({
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun user "${user.username.toUpperCase()}" (${user.nama_lengkap || 'User'})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus User',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteUser(id);
          showToast('User Dihapus', `Akun user ${user.username.toUpperCase()} telah dihapus.`, 'success');
        } catch (err: any) {
          showToast('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus.', 'error');
        }
      }
    });
  };

  const handleQuickResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetTarget) return;

    const isTargetSuperAdmin = pinResetTarget.role === 'superadmin' || pinResetTarget.username.toLowerCase() === 'superadmin';
    if (!isSuperAdmin && isTargetSuperAdmin) {
      showToast('Akses Ditolak', 'Hanya Super Admin yang berhak mengubah PIN akun Super Admin.', 'warning');
      setPinResetTarget(null);
      return;
    }

    const cleanPin = quickNewPin.trim();
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      showToast('PIN Tidak Valid', 'PIN baru harus tepat 6 digit angka.', 'warning');
      return;
    }

    setQuickPinSubmitting(true);
    try {
      const id = pinResetTarget.id || pinResetTarget.username;
      await updateUser(id, { pin: cleanPin });
      showToast('PIN Berhasil Diubah', `PIN untuk user ${pinResetTarget.username.toUpperCase()} sekarang: ${cleanPin}`, 'success');
      setPinResetTarget(null);
      setQuickNewPin('');
    } catch (err: any) {
      showToast('Gagal Ubah PIN', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setQuickPinSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 animate-in fade-in duration-150 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 text-slate-800 my-auto">
        
        {/* Modal Header */}
        <div className="border-b border-slate-200 px-5 sm:px-7 py-4 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg m-0">
                  Kelola User & PIN Login Awal
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                  Autentikasi Pengguna
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                Pengelolaan akun pengguna dan PIN 6 digit untuk otentikasi login
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs & Status Bar */}
        <div className="bg-slate-50/50 px-5 sm:px-7 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                handleResetForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>Daftar User ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                handleResetForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus size={14} />
              <span>{editingUser ? 'Edit User' : 'Tambah User Baru'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentAuthUser && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold">
                <span>{isSuperAdmin ? '👑' : '🛡️'}</span>
                <span>Login: <strong>{currentAuthUser.nama || currentAuthUser.nama_lengkap || currentAuthUser.username}</strong> ({currentAuthUser.role || (isSuperAdmin ? 'superadmin' : 'admin')})</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchUsers()}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs"
              title="Muat Ulang Data Pengguna"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : ''} />
              <span>Refresh</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Terhubung & Aktif</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 bg-white">
          
          {/* TAB 1: LIST USERS & PINS (BENTUK LIST) */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Search Bar & Quick Add */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari user berdasarkan username, nama lengkap, atau role..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    setActiveTab('create');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-all active:scale-98 shrink-0"
                >
                  <UserPlus size={15} />
                  <span>Tambah User Baru</span>
                </button>
              </div>

              {/* Users List Layout */}
              {loading && users.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs font-semibold">Menghubungkan dan memuat data user...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                  <UserCheck size={32} className="mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-800">Tidak ada data user yang cocok</p>
                  <p className="text-xs">Coba ganti kata kunci pencarian atau tambahkan akun baru.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredUsers.map((user) => {
                    const identifier = user.id || user.username;
                    const isDefaultAdmin = user.username.toLowerCase() === 'admin';
                    const isTargetSuperAdmin = user.role === 'superadmin' || user.username.toLowerCase() === 'superadmin';
                    const canModifyThisUser = isSuperAdmin || !isTargetSuperAdmin;
                    const isRevealed = !!revealedPins[identifier];
                    const pinValue = user.pin || '089739';

                    return (
                      <div
                        key={identifier}
                        className={`p-3.5 sm:p-4 rounded-xl bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:shadow-xs ${
                          user.is_active === false
                            ? 'border-red-200 bg-red-50/20 opacity-75'
                            : isTargetSuperAdmin
                            ? 'border-purple-300 bg-purple-50/20 ring-1 ring-purple-100'
                            : isDefaultAdmin
                            ? 'border-blue-300 bg-blue-50/20 ring-1 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Kolom Info User */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase shadow-2xs border shrink-0 ${
                            isTargetSuperAdmin
                              ? 'bg-purple-700 text-white border-purple-800'
                              : isDefaultAdmin 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {user.username.slice(0, 2)}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-slate-900 tracking-wide uppercase">
                                {user.username}
                              </span>
                              {isTargetSuperAdmin ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs">
                                  <span>👑</span> SUPER ADMIN (FULL AKSES)
                                </span>
                              ) : user.role === 'operator' ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                                  Operator
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                                  Admin
                                </span>
                              )}

                              {/* Status Badge */}
                              {canModifyThisUser ? (
                                <button
                                  type="button"
                                  onClick={() => toggleUserStatus(identifier, user.is_active !== false)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                    user.is_active !== false
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  }`}
                                  title={user.is_active !== false ? 'Klik untuk Nonaktifkan User' : 'Klik untuk Aktifkan User'}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                  <span>{user.is_active !== false ? 'AKTIF' : 'NONAKTIF'}</span>
                                </button>
                              ) : (
                                <span 
                                  className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border bg-purple-50 text-purple-800 border-purple-200 cursor-default" 
                                  title="Akun Super Admin Aktif (Hanya Super Admin yang dapat mengubah status)"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                  <span>AKTIF</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5 flex-wrap">
                              <span className="font-medium text-slate-700 truncate">
                                {user.nama_lengkap || 'User Kino'}
                              </span>
                              {user.email && (
                                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                                  • {user.email}
                                </span>
                              )}
                              {user.last_login && (
                                <span className="text-[10px] text-slate-400 hidden lg:inline">
                                  • Login: {new Date(user.last_login).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kolom PIN & Aksi */}
                        <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                          {/* PIN Box */}
                          {canModifyThisUser ? (
                            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                              <div className="p-1 rounded-md bg-white text-blue-600 border border-slate-200 shadow-2xs">
                                <KeyRound size={12} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">PIN:</span>
                              <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-slate-900 min-w-[54px]">
                                {isRevealed ? pinValue : '••••••'}
                              </span>

                              <button
                                type="button"
                                onClick={() => togglePinVisibility(identifier)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title={isRevealed ? 'Sembunyikan PIN' : 'Lihat Angka PIN'}
                              >
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyPin(pinValue, identifier)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title="Salin PIN"
                              >
                                {copiedId === identifier ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                            </div>
                          ) : (
                            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-50/50 border border-purple-200 flex items-center gap-2" title="PIN Super Admin Terlindungi">
                              <div className="p-1 rounded-md bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
                                <Lock size={12} />
                              </div>
                              <span className="text-[10px] font-bold text-purple-900 uppercase">PIN:</span>
                              <span className="font-mono text-xs font-bold tracking-widest text-slate-400">
                                ••••••
                              </span>
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                                Terlindungi
                              </span>
                            </div>
                          )}

                          {/* Tombol Aksi List */}
                          {canModifyThisUser ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPinResetTarget(user);
                                  setQuickNewPin('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all cursor-pointer border border-slate-200 shadow-2xs"
                                title="Ganti PIN untuk User ini"
                              >
                                Ubah PIN
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(user)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white"
                                title="Edit Data User"
                              >
                                <Edit3 size={13} />
                              </button>

                              {!isDefaultAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(user)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white"
                                  title="Hapus User"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold" title="Akun Super Admin dilindungi. Hanya Super Admin yang berhak mengubah.">
                              <Lock size={13} className="text-purple-600" />
                              <span>Terkunci</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE / EDIT USER FORM */}
          {activeTab === 'create' && (
            <div className="max-w-xl mx-auto bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="mb-5 pb-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase m-0">
                    {editingUser ? `Edit Data User: ${editingUser.username.toUpperCase()}` : 'Tambah User Baru'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 m-0">
                    {editingUser ? 'Perbarui informasi profil atau ganti PIN akses' : 'Buat akun baru dengan PIN 6 digit'}
                  </p>
                </div>
                {editingUser && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 mb-4">
                  <AlertCircle size={15} className="text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-4">
                
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="Contoh: dede, operator1, gudang_c"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Gunakan huruf kecil tanpa spasi (bisa angka, titik, strip).
                  </span>
                </div>

                {/* Nama Lengkap Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Lengkap / Jabatan
                  </label>
                  <input
                    type="text"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Dede Suparman"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Contoh: dede.suparman@kino.co.id"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                  />
                </div>

                {/* Role / Hak Akses Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Peran / Hak Akses (Role)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {isSuperAdmin ? (
                      <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                        formRole === 'superadmin' 
                          ? 'border-purple-600 bg-purple-50 text-purple-950 ring-1 ring-purple-600' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs flex items-center gap-1 text-purple-900">👑 Super Admin</span>
                          <input
                            type="radio"
                            name="role"
                            value="superadmin"
                            checked={formRole === 'superadmin'}
                            onChange={() => setFormRole('superadmin')}
                            className="text-purple-600"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight">Full akses kelola sistem, aplikasi & user</span>
                      </label>
                    ) : (
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-100/70 opacity-65 flex flex-col gap-1 select-none cursor-not-allowed">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs flex items-center gap-1 text-slate-600">
                            <Lock size={12} className="text-purple-600" /> Super Admin
                          </span>
                          <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                            Terkunci
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 leading-tight">Hanya Super Admin yang dapat menetapkan role ini</span>
                      </div>
                    )}

                    <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                      formRole === 'admin' 
                        ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs flex items-center gap-1 text-blue-900">🛡️ Admin</span>
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={formRole === 'admin'}
                          onChange={() => setFormRole('admin')}
                          className="text-blue-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">Kelola user, broadcast, todo & modul logistik</span>
                    </label>

                    <label className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                      formRole === 'operator' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600' 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs flex items-center gap-1 text-emerald-900">⚡ Operator</span>
                        <input
                          type="radio"
                          name="role"
                          value="operator"
                          checked={formRole === 'operator'}
                          onChange={() => setFormRole('operator')}
                          className="text-emerald-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight">Akses operasional standar & modul logistik</span>
                    </label>
                  </div>
                </div>

                {/* PIN 6 Digit Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      PIN Akses (6 Digit Angka) {editingUser ? '(Kosongkan jika tidak diubah)' : <span className="text-red-500">*</span>}
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPin}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Buat PIN Otomatis</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={formShowPin ? 'text' : 'password'}
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required={!editingUser}
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={editingUser ? '•••••• (Tetap PIN Lama)' : 'Ketik 6 Digit Angka'}
                      className="w-full pl-3.5 pr-24 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold tracking-widest text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />

                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormShowPin(!formShowPin)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                        title={formShowPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                      >
                        {formShowPin ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <span className="text-[11px] font-mono text-slate-400 font-bold pl-1 border-l border-slate-200">
                        {formPin.length}/6
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Aktif Switch */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Status Akun Aktif</span>
                      <span className="text-[11px] text-slate-500">User hanya dapat login jika status aktif</span>
                    </div>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2.5 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{editingUser ? 'Simpan Perubahan' : 'Buat User Baru'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleResetForm();
                      setActiveTab('list');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-5 sm:px-7 py-3 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Total User Terdaftar:</span>
            <span className="font-mono font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">{users.length} User</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* QUICK PIN RESET POPUP MODAL */}
      {pinResetTarget && (
        <div className="fixed inset-0 z-[1070] flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-200 text-slate-800 p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <KeyRound size={16} />
                </div>
                <h4 className="font-extrabold text-sm uppercase m-0 text-slate-900">
                  Ubah PIN User
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPinResetTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Masukkan PIN baru (6 digit angka) untuk user <strong className="text-blue-600 uppercase font-mono">{pinResetTarget.username}</strong>:
            </p>

            <form onSubmit={handleQuickResetPin} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  autoFocus
                  value={quickNewPin}
                  onChange={(e) => setQuickNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ketik 6 Digit Angka"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.floor(100000 + Math.random() * 900000).toString();
                    setQuickNewPin(rnd);
                  }}
                  className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Sparkles size={11} /> Acak PIN
                </button>
                <span>Panjang: {quickNewPin.length}/6</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={quickPinSubmitting || quickNewPin.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white uppercase shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {quickPinSubmitting ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
                <button
                  type="button"
                  onClick={() => setPinResetTarget(null)}
                  className="px-3 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
