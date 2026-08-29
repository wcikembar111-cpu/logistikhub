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
        let dbUsers: any[] = [];
        const res = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (res.ok) {
          const fetched = await res.json();
          if (Array.isArray(fetched) && fetched.length > 0) {
            dbUsers = fetched;
          }
        }

        if (dbUsers.length === 0) {
          const resUsers = await fetch(`${supabaseUrl}/rest/v1/users?select=*`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          if (resUsers.ok) {
            const fetchedUsers = await resUsers.json();
            if (Array.isArray(fetchedUsers)) {
              dbUsers = fetchedUsers;
            }
          }
        }

        if (dbUsers.length > 0) {
          const cleanNoSpace = username.replace(/[\s._-]+/g, '');
          const matchedDbUser = dbUsers.find((u: any) => {
            if (u.is_active === false || u.is_active === 'false' || u.is_active === 0) return false;

            const uName = String(u.username || '').trim().toLowerCase();
            const uEmail = String(u.email || '').trim().toLowerCase();
            const uFullName = String(u.nama_lengkap || u.nama || u.name || '').trim().toLowerCase();
            const uId = String(u.id || '').trim().toLowerCase();
            const uNameNoSpace = uName.replace(/[\s._-]+/g, '');
            const uFullNameNoSpace = uFullName.replace(/[\s._-]+/g, '');
            const emailPrefix = username.includes('@') ? username.split('@')[0] : username;

            const isUserMatch = (
              uName === username ||
              uEmail === username ||
              uName === emailPrefix ||
              (cleanNoSpace.length >= 3 && uNameNoSpace === cleanNoSpace) ||
              (cleanNoSpace.length >= 3 && uFullNameNoSpace === cleanNoSpace) ||
              uFullName === username ||
              (cleanNoSpace.length >= 4 && uFullNameNoSpace.includes(cleanNoSpace)) ||
              (cleanNoSpace.length >= 4 && cleanNoSpace.includes(uFullNameNoSpace)) ||
              (username.length > 10 && uId === username)
            );

            if (!isUserMatch) return false;

            const dbPin = String(u.pin ?? '').trim();
            const dbPassword = String(u.password ?? '').trim();
            const dbPinCode = String(u.pin_code ?? u.kode_pin ?? u.access_code ?? '').trim();

            const cleanPinNum = cleanInput.replace(/^0+/, '') || '0';
            const dbPinNum = dbPin.replace(/^0+/, '') || '0';
            const dbPinPadded = dbPin.padStart(6, '0');
            const cleanPinPadded = cleanInput.padStart(6, '0');

            return (
              (dbPin && cleanInput === dbPin) ||
              (dbPin && cleanPinPadded === dbPinPadded) ||
              (dbPin && /^\d+$/.test(cleanInput) && /^\d+$/.test(dbPin) && cleanPinNum === dbPinNum) ||
              (dbPassword && cleanInput === dbPassword) ||
              (dbPassword && cleanInput.toLowerCase() === dbPassword.toLowerCase()) ||
              (dbPinCode && cleanInput === dbPinCode)
            );
          });

          if (matchedDbUser) {
            authenticatedUser = {
              username: matchedDbUser.username || username,
              nama_lengkap: matchedDbUser.nama_lengkap || matchedDbUser.nama || matchedDbUser.name || matchedDbUser.username || 'Pengguna',
              role: (matchedDbUser.role || 'admin').toLowerCase(),
              email: matchedDbUser.email || `${matchedDbUser.username || username}@kino.co.id`
            };
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
