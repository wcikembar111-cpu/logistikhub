CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('no', 'onproses', 'close')) DEFAULT 'no',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  messages JSONB DEFAULT '[]'::jsonb
);

-- Insert admin user jika belum ada
INSERT INTO users (email, password) 
VALUES ('admin@admin.com', 'Kino.2026') 
ON CONFLICT (email) DO NOTHING;

-- Insert default announcements jika belum ada
INSERT INTO settings (id, messages) 
VALUES ('announcements', '[]'::jsonb) 
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- AKSES HAK AKSES & RLS (Row Level Security)
-- Jalankan perintah ini di Supabase SQL Editor agar
-- semua user/public dapat menambah, mengedit & membaca data:
-- =========================================================

-- Opsi 1: Nonaktifkan RLS pada semua tabel (Paling Mudah)
ALTER TABLE links DISABLE ROW LEVEL SECURITY;
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Opsi 2: Jika RLS tetap aktif, izinkan transaksi untuk role public/anon:
DROP POLICY IF EXISTS "Public full access links" ON links;
CREATE POLICY "Public full access links" ON links FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access todos" ON todos;
CREATE POLICY "Public full access todos" ON todos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access settings" ON settings;
CREATE POLICY "Public full access settings" ON settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access users" ON users;
CREATE POLICY "Public full access users" ON users FOR ALL USING (true) WITH CHECK (true);

