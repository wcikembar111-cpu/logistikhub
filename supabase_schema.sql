CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('no', 'onproses', 'close')) DEFAULT 'no',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  messages JSONB DEFAULT '[]'::jsonb
);

-- Insert admin user
INSERT INTO users (email, password) 
VALUES ('admin@admin.com', 'Kino.2026') 
ON CONFLICT (email) DO NOTHING;

-- Insert default announcements
INSERT INTO settings (id, messages) 
VALUES ('announcements', '[]'::jsonb) 
ON CONFLICT (id) DO NOTHING;
