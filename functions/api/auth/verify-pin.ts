// Cloudflare Pages Function for Edge User & PIN Verification
// Reads APP_PIN from Cloudflare Pages Environment Variables (context.env.APP_PIN)

interface Env {
  APP_PIN?: string;
  APP_USER?: string;
  SESSION_SECRET?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { username?: string; pin?: string };
    const username = (body.username || 'admin').trim().toLowerCase();
    const pin = body.pin;
    const defaultServerPin = (env.APP_PIN || '089739').trim();

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'PIN harus diisi dengan 6 digit angka.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanInput = pin.trim();

    // Check allowed admin accounts
    const allowedAdmins: Record<string, { pin: string; name: string }> = {
      admin: { pin: defaultServerPin, name: 'Administrator Logistics' },
      dede: { pin: defaultServerPin, name: 'Dede Suparman' }
    };

    if (env.APP_USER) {
      allowedAdmins[env.APP_USER.trim().toLowerCase()] = {
        pin: defaultServerPin,
        name: 'Custom Admin'
      };
    }

    const matchedAdmin = allowedAdmins[username];

    if (matchedAdmin && cleanInput === matchedAdmin.pin) {
      const issuedAt = Date.now();
      const sessionToken = btoa(
        JSON.stringify({
          valid: true,
          username,
          name: matchedAdmin.name,
          role: 'admin',
          iat: issuedAt,
          exp: issuedAt + 30 * 24 * 60 * 60 * 1000,
          origin: 'cloudflare-worker'
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `Login Admin berhasil sebagai ${matchedAdmin.name}.`,
          user: {
            username,
            nama_lengkap: matchedAdmin.name,
            role: 'admin'
          },
          token: sessionToken,
          expiresIn: 30 * 24 * 60 * 60 * 1000
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, message: `Username "${username}" atau PIN tidak sesuai. Khusus Admin.` }),
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
