// Cloudflare Pages Function for Edge PIN Verification
// Reads APP_PIN from Cloudflare Pages Environment Variables (context.env.APP_PIN)

interface Env {
  APP_PIN?: string;
  SESSION_SECRET?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as { pin?: string };
    const pin = body.pin;
    const serverPin = (env.APP_PIN || '089739').trim();

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ success: false, message: 'PIN harus diisi dengan 6 digit angka.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanInput = pin.trim();

    if (cleanInput === serverPin) {
      const issuedAt = Date.now();
      const sessionToken = btoa(
        JSON.stringify({
          valid: true,
          iat: issuedAt,
          exp: issuedAt + 30 * 24 * 60 * 60 * 1000,
          origin: 'cloudflare-worker'
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Akses PIN berhasil diverifikasi (Cloudflare Edge).',
          token: sessionToken,
          expiresIn: 30 * 24 * 60 * 60 * 1000
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'PIN 6 digit tidak sesuai. Silakan coba lagi.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: 'Terjadi kesalahan pada verifikasi PIN.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
