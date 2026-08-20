// Cloudflare Pages Function for checking PIN status

interface Env {
  APP_PIN?: string;
}

export async function onRequestGet(context: { env: Env }) {
  const isCustomPin = Boolean(context.env.APP_PIN && context.env.APP_PIN.trim() !== '089739');
  return new Response(
    JSON.stringify({
      configured: true,
      digits: 6,
      isCustom: isCustomPin,
      authMethod: 'cloudflare-pages-function'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
