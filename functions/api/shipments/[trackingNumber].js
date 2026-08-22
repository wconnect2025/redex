// GET    /api/shipments/:tn — fetch one shipment (public — for customer tracking)
// PUT    /api/shipments/:tn — add a tracking update (admin only)
// DELETE /api/shipments/:tn — remove a shipment (admin only)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
    return json({ error: 'KV namespace REDEX_KV is not bound. Configure it in the Cloudflare Pages dashboard.' }, 500);
  }
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// Public endpoint — customers use this to track their package
export async function onRequestGet({ params, env }) {
  const err = kvCheck(env);
  if (err) return err;

  const tn = (params.trackingNumber || '').toUpperCase();
  const shipment = await env.REDEX_KV.get('shipment:' + tn, { type: 'json' });

  if (!shipment) return json({ error: 'Shipment not found' }, 404);
  return json(shipment);
}

// Admin: push a new location/status update onto the shipment
export async function onRequestPut({ params, request, env }) {
  const err = kvCheck(env);
  if (err) return err;
  if (!isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);

  const tn = (params.trackingNumber || '').toUpperCase();
  const shipment = await env.REDEX_KV.get('shipment:' + tn, { type: 'json' });
  if (!shipment) return json({ error: 'Shipment not found' }, 404);

  let update;
  try {
    update = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!update.status || !update.location) {
    return json({ error: 'Update must include status and location' }, 400);
  }

  shipment.updates.push(update);
  await env.REDEX_KV.put('shipment:' + tn, JSON.stringify(shipment));

  return json({ success: true });
}

// Admin: permanently delete a shipment
export async function onRequestDelete({ params, request, env }) {
  const err = kvCheck(env);
  if (err) return err;
  if (!isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);

  const tn = (params.trackingNumber || '').toUpperCase();
  await env.REDEX_KV.delete('shipment:' + tn);

  return json({ success: true });
}
