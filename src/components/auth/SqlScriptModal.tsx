import React, { useState } from 'react';
import { Copy, Check, X, ShieldCheck, Terminal, Sparkles, ExternalLink } from 'lucide-react';

interface SqlScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const USERS_TABLE_SQL = `-- =================================================================
-- 1. Aktifkan ekstensi pendukung (opsional jika belum aktif)
-- =================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =================================================================
-- 2. Fungsi trigger untuk otomatis memperbarui kolom updated_at
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 3. Pembuatan Tabel USERS
-- =================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    username VARCHAR(100) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    pin VARCHAR(20) NOT NULL,                    -- PIN 4-6 digit (atau hashed password)
    avatar TEXT DEFAULT '',
    role VARCHAR(50) NOT NULL DEFAULT 'Pelaksana', -- 'Admin' | 'Pelaksana'
    status VARCHAR(50) NOT NULL DEFAULT 'Aktif',   -- 'Aktif' | 'Nonaktif'
    email_google VARCHAR(255) DEFAULT '',
    permissions JSONB NOT NULL DEFAULT '{
        "canInputIncoming": true,
        "canTally": true,
        "canEditMasterBarang": false,
        "canManageUsers": false,
        "canApproveQC": false,
        "canAccessDatabase": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =================================================================
-- 4. Indexing untuk mempercepat query pencarian login
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- =================================================================
-- 5. Pasang Trigger auto-update timestamp
-- =================================================================
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =================================================================
-- 6. Hak Akses & Realtime
-- =================================================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.users TO anon, authenticated;

-- =================================================================
-- 7. Seed Data: Akun Admin Default Awal
-- =================================================================
INSERT INTO public.users (id, username, nama, pin, role, status, permissions)
VALUES (
    'usr-admin-default',
    'admin',
    'Administrator Utama',
    '123456',
    'Admin',
    'Aktif',
    '{
        "canInputIncoming": true,
        "canTally": true,
        "canEditMasterBarang": true,
        "canManageUsers": true,
        "canApproveQC": true,
        "canAccessDatabase": true
    }'::jsonb
)
ON CONFLICT (username) DO UPDATE
SET
    nama = EXCLUDED.nama,
    pin = EXCLUDED.pin,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
        permissions = EXCLUDED.permissions;
`;

export const MENU_VISIBILITY_TABLE_SQL = `-- =================================================================
-- Tabel Khusus Visibilitas Menu (Hide / Unhide Sidebar & Grid)
-- Tabel terpisah ini agar TIDAK bentrok dengan tabel 'setting' / 'settings' yang sudah ada
-- =================================================================
CREATE TABLE IF NOT EXISTS public.menu_visibility (
    id TEXT PRIMARY KEY DEFAULT 'hidden_menus',
    hidden_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Matikan RLS agar dapat dibaca dan disimpan oleh aplikasi
ALTER TABLE public.menu_visibility DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.menu_visibility TO anon, authenticated;

-- Aktifkan Realtime Replication untuk sinkronisasi seketika antar perangkat
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_visibility;

-- Baris inisialisasi awal untuk daftar menu tersembunyi
INSERT INTO public.menu_visibility (id, hidden_ids)
VALUES ('hidden_menus', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
`;

export function SqlScriptModal({ isOpen, onClose }: SqlScriptModalProps) {
  const [activeTab, setActiveTab] = useState<'visibility' | 'users'>('visibility');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSql = activeTab === 'visibility' ? MENU_VISIBILITY_TABLE_SQL : USERS_TABLE_SQL;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Terminal size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                Skrip SQL Supabase Server
              </div>
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                Setup Skema Database Supabase
              </h3>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all cursor-pointer"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 sm:px-6 pt-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('visibility'); setCopied(false); }}
            className={`px-3.5 py-2 font-bold text-xs rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'visibility'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Tabel menu_visibility (Hide/Unhide Menu)
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('users'); setCopied(false); }}
            className={`px-3.5 py-2 font-bold text-xs rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Tabel users (Akun Pengguna)
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 leading-relaxed font-medium">
            {activeTab === 'visibility' ? (
              <>
                <span className="font-bold">Info:</span> Tabel <code>menu_visibility</code> dibuat khusus berdiri sendiri sehingga <strong>TIDAK AKAN mengganggu atau bentrok dengan tabel <code>settings</code> Anda yang sudah ada</strong>. Skrip ini hanya perlu dijalankan sekali di SQL Editor Supabase agar status hide/unhide menu tersimpan permanen di cloud.
              </>
            ) : (
              <>
                <span className="font-bold">Info:</span> Skrip untuk tabel <code>users</code> membuat struktur tabel autentikasi dengan akun default <code>admin</code> / <code>123456</code>.
              </>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-[11px] font-mono border-b border-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Terminal size={13} />
                <span>{activeTab === 'visibility' ? 'menu_visibility_schema.sql' : 'users_schema.sql'}</span>
              </div>

              <button 
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-200 rounded-b-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-72 custom-scrollbar select-all">
              {currentSql}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-semibold">
            {activeTab === 'visibility' ? (
              <span>Tabel terpisah: <strong className="text-slate-800">public.menu_visibility</strong></span>
            ) : (
              <span>Admin default: <strong className="text-slate-800">admin</strong> / <strong className="text-slate-800">123456</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Berhasil Disalin' : 'Salin Skrip'}</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
