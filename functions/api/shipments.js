// GET /api/shipments  — list all shipments (admin only)
// POST /api/shipments — create a new shipment (admin only)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function isAdmin(request, env) {
  const key = (request.headers.get('X-Admin-Key') || '').trim();
  const secret = (env.ADMIN_SECRET || 'redex2025').trim();
  return key.length > 0 && key === secret;
}

function kvCheck(env) {
  if (!env.REDEX_KV) {
    return json({ error: 'KV namespace REDEX_KV is not bound. Configure it in the Cloudflare Pages dashboard under Settings → Functions → KV Namespace Bindings.' }, 500);
  }
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const err = kvCheck(env);
  if (err) return err;
  if (!isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);

  const listed = await env.REDEX_KV.list({ prefix: 'shipment:' });

  const items = await Promise.all(
    listed.keys.map(k => env.REDEX_KV.get(k.name, { type: 'json' }))
  );

  const shipments = items
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return json(shipments);
}

export async function onRequestPost({ request, env }) {
  const err = kvCheck(env);
  if (err) return err;
  if (!isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);

  let shipment;
  try {
    shipment = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!shipment.trackingNumber) return json({ error: 'Missing trackingNumber' }, 400);

  const key = 'shipment:' + shipment.trackingNumber.toUpperCase();
  await env.REDEX_KV.put(key, JSON.stringify(shipment));

  return json({ success: true, trackingNumber: shipment.trackingNumber }, 201);
}
