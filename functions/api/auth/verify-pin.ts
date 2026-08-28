// Cloudflare Pages Function for Edge User & PIN Verification

interface Env {
  APP_PIN?: string;
  APP_USER?: string;
  SESSION_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { username?: string; pin?: string };
    const username = (body.username || '').trim().toLowerCase();
    const pin = body.pin;

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, message: 'Username harus diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'PIN harus diisi dengan 6 digit angka.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanInput = pin.trim();
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

    let authenticatedUser: { username: string; nama_lengkap: string; role: string; email?: string } | null = null;

    if (supabaseUrl && supabaseKey) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=id,username,pin,password,nama_lengkap,nama,email,role,is_active&is_active=eq.true`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (res.ok) {
          const dbUsers = (await res.json()) as any[];
          if (Array.isArray(dbUsers)) {
            const cleanNoSpace = username.replace(/[\s._-]+/g, '');
            const matchedDbUser = dbUsers.find((u: any) => {
              const uName = String(u.username || '').trim().toLowerCase();
              const uEmail = String(u.email || '').trim().toLowerCase();
              const uFullName = String(u.nama_lengkap || u.nama || '').trim().toLowerCase().replace(/[\s._-]+/g, '');
              const uNameNoSpace = uName.replace(/[\s._-]+/g, '');

              return (
                uName === username ||
                uNameNoSpace === cleanNoSpace ||
                uEmail === username ||
                uFullName === cleanNoSpace ||
                (cleanNoSpace.length >= 4 && uFullName.includes(cleanNoSpace)) ||
                (cleanNoSpace.length >= 4 && cleanNoSpace.includes(uFullName))
              );
            });

            if (matchedDbUser) {
              const dbPin = String(matchedDbUser.pin || '').trim();
              const dbPassword = String(matchedDbUser.password || '').trim();
              const isPinValid = (dbPin && cleanInput === dbPin) || (dbPassword && cleanInput === dbPassword);

              if (isPinValid) {
                authenticatedUser = {
                  username: matchedDbUser.username || username,
                  nama_lengkap: matchedDbUser.nama_lengkap || matchedDbUser.nama || matchedDbUser.username || 'Pengguna',
                  role: (matchedDbUser.role || 'admin').toLowerCase(),
                  email: matchedDbUser.email || `${matchedDbUser.username || username}@kino.co.id`
                };
              }
            }
          }
        }
      } catch (dbEx) {
        console.warn('Edge Supabase fetch note:', dbEx);
      }
    }

    if (authenticatedUser) {
      const issuedAt = Date.now();
      const sessionToken = btoa(
        JSON.stringify({
          valid: true,
          username: authenticatedUser.username,
          name: authenticatedUser.nama_lengkap,
          role: authenticatedUser.role,
          iat: issuedAt,
          exp: issuedAt + 30 * 24 * 60 * 60 * 1000,
          origin: 'cloudflare-worker'
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `Login Admin berhasil sebagai ${authenticatedUser.nama_lengkap}.`,
          user: authenticatedUser,
          token: sessionToken,
          expiresIn: 30 * 24 * 60 * 60 * 1000
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, message: `Username "${username}" atau PIN / Password tidak sesuai dengan data di database.` }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: 'Terjadi kesalahan pada verifikasi User & PIN.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
