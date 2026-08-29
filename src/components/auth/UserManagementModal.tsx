import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  Check, 
  RefreshCw, 
  Lock, 
  Mail, 
  CheckSquare, 
  Square,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Delete as BackspaceIcon,
  Unlock
} from 'lucide-react';
import { supabase } from '../../supabase';
import { UserRecord, UserPermissions, UserRole, UserStatus } from '../../types';
import { useAuth } from '../../hooks/useSupabase';
import { useNotification } from '../../context/NotificationContext';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_PELAKSANA_PERMISSIONS } from '../../context/AuthContext';

const MASTER_SECURITY_PIN = '399339';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const { user: currentUser, refreshSession } = useAuth();
  const { showToast, showConfirm } = useNotification();

  // Security Gate PIN State (Wajib PIN 399339 sebelum memunculkan Daftar Pengguna & RBAC)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form State for Add / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Pelaksana');
  const [formStatus, setFormStatus] = useState<UserStatus>('Aktif');
  const [formAvatar, setFormAvatar] = useState('');
  const [formEmailGoogle, setFormEmailGoogle] = useState('');
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(DEFAULT_PELAKSANA_PERMISSIONS);
  const [formSaving, setFormSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUsers(data as UserRecord[]);
      } else if (error) {
        console.error('Error fetching users:', error);
      }
    } catch (err) {
      console.error('Error fetching users exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Selalu kunci kembali saat modal dibuka untuk kepastian keamanan
      setIsUnlocked(false);
      setPinInput('');
      setPinError('');
      setIsShaking(false);
      setShowPinInput(false);
      setIsEditing(false);
      const timer = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleVerifyPin = (pinToTest?: string) => {
    const currentPin = (pinToTest !== undefined ? pinToTest : pinInput).trim();
    if (!currentPin) {
      setPinError('Silakan masukkan PIN Keamanan');
      return;
    }

    if (currentPin === MASTER_SECURITY_PIN) {
      setIsUnlocked(true);
      setPinError('');
      setPinInput('');
      showToast('Akses Diberikan', 'Otorisasi PIN Super Admin berhasil diverifikasi.', 'success');
      fetchUsers();
    } else {
      setPinError('PIN Keamanan Salah! Akses Daftar Pengguna & RBAC Ditolak.');
      setIsShaking(true);
      showToast('Akses Ditolak', 'PIN Keamanan salah. Akses ditolak.', 'error');
      setTimeout(() => setIsShaking(false), 500);
      setPinInput('');
      pinInputRef.current?.focus();
    }
  };

  const handlePinKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + num;
      setPinInput(next);
      setPinError('');
      if (next.length === 6) {
        handleVerifyPin(next);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError('');
  };

  const handlePinClear = () => {
    setPinInput('');
    setPinError('');
    pinInputRef.current?.focus();
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerifyPin();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormUsername('');
    setFormNama('');
    setFormPin('');
    setFormRole('Pelaksana');
    setFormStatus('Aktif');
    setFormAvatar('');
    setFormEmailGoogle('');
    setFormPermissions(DEFAULT_PELAKSANA_PERMISSIONS);
  };

  const handleOpenEdit = (userItem: UserRecord) => {
    setIsEditing(true);
    setEditingId(userItem.id);
    setFormUsername(userItem.username);
    setFormNama(userItem.nama);
    setFormPin(userItem.pin);
    setFormRole(userItem.role);
    setFormStatus(userItem.status);
    setFormAvatar(userItem.avatar || '');
    setFormEmailGoogle(userItem.email_google || '');
    setFormPermissions(userItem.permissions || (userItem.role === 'Admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PELAKSANA_PERMISSIONS));
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormRole(newRole);
    if (newRole === 'Admin') {
      setFormPermissions(DEFAULT_ADMIN_PERMISSIONS);
    } else {
      setFormPermissions(DEFAULT_PELAKSANA_PERMISSIONS);
    }
  };

  const togglePermission = (permKey: keyof UserPermissions) => {
    setFormPermissions(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanNama = formNama.trim();
    const cleanPin = formPin.trim();

    if (!cleanUsername || !cleanNama || !cleanPin) {
      showToast('Perhatian', 'Username, Nama, dan PIN wajib diisi.', 'warning');
      return;
    }

    setFormSaving(true);
    try {
      const payload: Partial<UserRecord> = {
        username: cleanUsername,
        nama: cleanNama,
        pin: cleanPin,
        role: formRole,
        status: formStatus,
        avatar: formAvatar.trim(),
        email_google: formEmailGoogle.trim(),
        permissions: formPermissions
      };

      if (editingId) {
        // Update user
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editingId);

        if (error) {
          showToast('Gagal', 'Gagal memperbarui pengguna: ' + error.message, 'error');
        } else {
          showToast('Berhasil', `Akun @${cleanUsername} berhasil diperbarui!`, 'success');
          setIsEditing(false);
          fetchUsers();
          if (currentUser?.id === editingId) {
            refreshSession();
          }
        }
      } else {
        // Insert new user
        const { error } = await supabase
          .from('users')
          .insert([payload]);

        if (error) {
          if (error.code === '23505' || error.message.includes('unique')) {
            showToast('Perhatian', `Username @${cleanUsername} sudah digunakan. Silakan gunakan username lain.`, 'warning');
          } else {
            showToast('Gagal', 'Gagal menambahkan pengguna: ' + error.message, 'error');
          }
        } else {
          showToast('Berhasil', `Pengguna baru @${cleanUsername} berhasil dibuat!`, 'success');
          setIsEditing(false);
          fetchUsers();
        }
      }
    } catch (err: any) {
      showToast('Gagal', 'Terjadi kesalahan sistem: ' + (err?.message || 'Error'), 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleStatus = async (userItem: UserRecord) => {
    const nextStatus: UserStatus = userItem.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: nextStatus })
        .eq('id', userItem.id);

      if (error) {
        showToast('Gagal', 'Gagal mengubah status: ' + error.message, 'error');
      } else {
        showToast('Status Diperbarui', `Akun @${userItem.username} sekarang ${nextStatus}.`, 'info');
        fetchUsers();
        if (currentUser?.id === userItem.id) {
          refreshSession();
        }
      }
    } catch (err: any) {
      showToast('Gagal', err?.message || 'Error', 'error');
    }
  };

  const handleDelete = (userItem: UserRecord) => {
    if (userItem.username === 'admin') {
      showToast('Perhatian', 'Akun Administrator Utama tidak boleh dihapus.', 'warning');
      return;
    }

    if (currentUser?.id === userItem.id) {
      showToast('Perhatian', 'Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif.', 'warning');
      return;
    }

    showConfirm({
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun pengguna "@${userItem.username}" (${userItem.nama})? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus Akun',
      cancelLabel: 'Batal',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userItem.id);

          if (error) {
            showToast('Gagal', 'Gagal menghapus pengguna: ' + error.message, 'error');
          } else {
            showToast('Dihapus', `Akun @${userItem.username} berhasil dihapus.`, 'success');
            fetchUsers();
          }
        } catch (err: any) {
          showToast('Gagal', err?.message || 'Error', 'error');
        }
      }
    });
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.nama.toLowerCase().includes(search.toLowerCase()) ||
      (u.email_google || '').toLowerCase().includes(search.toLowerCase());
    
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col max-h-[92vh] animate-scale-up ${
          !isUnlocked ? 'max-w-md' : 'max-w-4xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-blue-600/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              {isUnlocked ? <Users size={22} /> : <Lock size={22} className="text-amber-300" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-blue-100">
                <ShieldCheck size={12} className="text-amber-300" />
                <span>{isUnlocked ? 'Manajemen Hak Akses & Akun' : 'Proteksi Keamanan RBAC'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white m-0 tracking-tight">
                {isUnlocked ? 'Daftar Pengguna & Permissions (RBAC)' : 'Verifikasi PIN Super Admin'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlocked(false);
                    setPinInput('');
                    showToast('Terkunci', 'Akses Kelola Pengguna telah dikunci kembali.', 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Kunci Kembali Akses User"
                >
                  <Lock size={13} />
                  <span className="hidden sm:inline">Kunci Akses</span>
                </button>
                <button 
                  type="button"
                  onClick={fetchUsers}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Segarkan Data"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: LOCKED VIEW (PIN Verification Gate) */}
        {!isUnlocked ? (
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto custom-scrollbar">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border-2 border-blue-200 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
                <KeyRound size={32} className="text-blue-600 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-blue-700 uppercase bg-blue-100/70 px-3 py-1 rounded-full border border-blue-200 inline-block mb-1.5">
                  Wajib Otorisasi PIN
                </span>
                <h3 className="text-lg font-black text-slate-800 m-0">
                  Masukkan PIN Keamanan
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-1 max-w-xs mx-auto font-medium">
                  Untuk mengelola Daftar Pengguna & konfigurasi Permissions (RBAC), silakan masukkan PIN Super Admin.
                </p>
              </div>
            </div>

            {/* PIN Input & Visual Feedback */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <input 
                  ref={pinInputRef}
                  type={showPinInput ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPinInput(val);
                    setPinError('');
                    if (val.length === 6) {
                      handleVerifyPin(val);
                    }
                  }}
                  onKeyDown={handlePinKeyDown}
                  placeholder="Masukkan PIN (6 Digit)"
                  className="w-full text-center text-xl sm:text-2xl font-mono tracking-widest px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-700/10 outline-none transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal font-bold"
                />
                <button 
                  type="button"
                  onClick={() => setShowPinInput(!showPinInput)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                  title={showPinInput ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  {showPinInput ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 6 Dots Indicator */}
              <div className="flex justify-center items-center gap-2 pt-1">
                {[0, 1, 2, 3, 4, 5].map(idx => (
                  <div 
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all duration-150 ${
                      idx < pinInput.length 
                        ? 'bg-blue-600 scale-110 shadow-xs' 
                        : 'bg-slate-200 border border-slate-300'
                    }`}
                  />
                ))}
              </div>

              {/* Error Message */}
              {pinError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 justify-center animate-in fade-in">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKeyPress(num)}
                  className="py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-lg sm:text-xl rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer flex items-center justify-center active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95 uppercase tracking-wider"
                title="Hapus Semua"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress('0')}
                className="py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-lg sm:text-xl rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer flex items-center justify-center active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinBackspace}
                className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-sm rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                title="Hapus Digit Terakhir"
              >
                <BackspaceIcon size={18} />
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleVerifyPin()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Unlock size={14} />
                <span>Buka Akses Pengguna</span>
              </button>
            </div>
          </div>
        ) : (
          /* Modal Body: UNLOCKED VIEW (User Management & RBAC Permissions Form) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {isEditing ? (
            /* FORM ADD / EDIT USER */
            <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    {editingId ? <Edit2 size={16} /> : <UserPlus size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 m-0">
                      {editingId ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
                    </h3>
                    <p className="text-[11px] text-slate-500 m-0">
                      Atur kredensial login, peran, dan hak akses granular JSONB.
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="misal: pelaksana1"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={formNama}
                    onChange={e => setFormNama(e.target.value)}
                    placeholder="misal: Ahmad Fauzi"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PIN Keamanan (4-6 Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={formPin}
                    onChange={e => setFormPin(e.target.value)}
                    placeholder="misal: 123456"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 font-mono focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Akun / Google
                  </label>
                  <input 
                    type="email"
                    value={formEmailGoogle}
                    onChange={e => setFormEmailGoogle(e.target.value)}
                    placeholder="misal: user@kino.co.id"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Peran (Role)
                  </label>
                  <select 
                    value={formRole}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                  >
                    <option value="Pelaksana">Pelaksana (Akses Terbatas)</option>
                    <option value="Admin">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Akun
                  </label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as UserStatus)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 outline-none"
                  >
                    <option value="Aktif">Aktif (Dapat Login)</option>
                    <option value="Nonaktif">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Hak Akses Granular (Permissions JSONB)
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {formRole === 'Admin' ? 'Mode Admin: Semua Izin Direkomendasikan Aktif' : 'Pilih izin yang diberikan'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  
                  <button 
                    type="button"
                    onClick={() => togglePermission('canInputIncoming')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formPermissions.canInputIncoming 
                        ? 'bg-blue-50 border-blue-300 text-blue-950' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {formPermissions.canInputIncoming ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">canInputIncoming</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Input barang masuk & penerimaan</div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => togglePermission('canTally')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formPermissions.canTally 
                        ? 'bg-blue-50 border-blue-300 text-blue-950' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {formPermissions.canTally ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">canTally</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Tally checker & stock opname</div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => togglePermission('canEditMasterBarang')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formPermissions.canEditMasterBarang 
                        ? 'bg-blue-50 border-blue-300 text-blue-950' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {formPermissions.canEditMasterBarang ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">canEditMasterBarang</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Kelola master data & tautan</div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => togglePermission('canManageUsers')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formPermissions.canManageUsers 
                        ? 'bg-purple-50 border-purple-300 text-purple-950' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {formPermissions.canManageUsers ? <CheckSquare size={16} className="text-purple-700" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">canManageUsers</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Kelola pengguna & hak akses</div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => togglePermission('canApproveQC')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formPermissions.canApproveQC 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {formPermissions.canApproveQC ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">canApproveQC</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Persetujuan QC & disposisi</div>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => togglePermission('canAccessDatabase')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      formPermissions.canAccessDatabase 
                        ? 'bg-amber-50 border-amber-300 text-amber-950' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {formPermissions.canAccessDatabase ? <CheckSquare size={16} className="text-amber-700" /> : <Square size={16} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">canAccessDatabase</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Akses konfigurasi Database/Sistem</div>
                    </div>
                  </button>

                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={formSaving}
                  className="px-6 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingId ? 'Simpan Perubahan' : 'Buat Pengguna'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* USER LIST & FILTERS */
            <>
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari username, nama, email..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-blue-900 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select 
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="all">Semua Peran</option>
                    <option value="Admin">Admin</option>
                    <option value="Pelaksana">Pelaksana</option>
                  </select>

                  <select 
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>

                  <button 
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-black shadow-2xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus size={15} />
                    <span>Tambah User</span>
                  </button>
                </div>
              </div>

              {/* Table User List */}
              {loading ? (
                <div className="text-center py-12 text-slate-500 font-semibold text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-blue-900" />
                  <span>Memuat data pengguna...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-bold text-slate-700 m-0">Tidak ada data pengguna ditemukan.</p>
                  <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                    {search ? 'Coba ubah kata kunci pencarian atau filter.' : 'Klik "Tambah User" untuk membuat akun baru.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredUsers.map(u => {
                    const isSelf = currentUser?.id === u.id || currentUser?.username === u.username;
                    const perms = u.permissions || (u.role === 'Admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PELAKSANA_PERMISSIONS);

                    return (
                      <div 
                        key={u.id || u.username}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                      >
                        {/* User info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-2xs ${
                            u.role === 'Admin' 
                              ? 'bg-gradient-to-tr from-blue-900 to-indigo-900' 
                              : 'bg-gradient-to-tr from-slate-700 to-slate-900'
                          }`}>
                            {u.nama.slice(0, 2).toUpperCase() || 'US'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {u.nama}
                              </span>
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                @{u.username}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-900 px-2 py-0.2 rounded-md border border-blue-300">
                                  Akun Anda
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                u.role === 'Admin' 
                                  ? 'bg-purple-50 text-purple-800 border-purple-200' 
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {u.role}
                              </span>

                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                u.status === 'Aktif'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {u.status}
                              </span>

                              <span className="font-mono text-slate-400">
                                PIN: <strong className="text-slate-700 font-mono tracking-widest">{u.pin}</strong>
                              </span>

                              {u.email_google && (
                                <span className="text-slate-400">
                                  • {u.email_google}
                                </span>
                              )}
                            </div>

                            {/* Permissions Badges */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[9px] font-semibold text-slate-600">
                              {perms.canInputIncoming && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">Incoming</span>}
                              {perms.canTally && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">Tally</span>}
                              {perms.canEditMasterBarang && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">Master</span>}
                              {perms.canManageUsers && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200">ManageUsers</span>}
                              {perms.canApproveQC && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">ApproveQC</span>}
                              {perms.canAccessDatabase && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200">Database</span>}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                          <button 
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                              u.status === 'Aktif'
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                            }`}
                            title={u.status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          >
                            {u.status === 'Aktif' ? <ToggleRight size={15} className="text-emerald-600" /> : <ToggleLeft size={15} className="text-rose-500" />}
                            <span>{u.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 transition-all cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleDelete(u)}
                            disabled={u.username === 'admin'}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
        )}

        {/* Footer (Hanya saat akses terbuka) */}
        {isUnlocked && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Total {users.length} pengguna terdaftar di sistem.
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
