const SETTINGS_KEY = 'settings:branding';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

const DEFAULTS = {
  namePart1:    'Red',
  namePart2:    'Ex',
  tagline:      'Courier Services',
  primaryColor: '#4D148C',
  accentColor:  '#FF6600',
  phone:        '+1 (800) 555-1234',
  email:        'support@redex.com',
};

function isAdmin(request, env) {
  return request.headers.get('X-Admin-Key') === (env.ADMIN_SECRET || 'redex2025');
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env }) {
  const raw = env.REDEX_KV ? await env.REDEX_KV.get(SETTINGS_KEY) : null;
  const settings = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  return new Response(JSON.stringify(settings), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }
  if (!env.REDEX_KV) {
    return new Response(JSON.stringify({ error: 'KV not bound' }), { status: 500, headers: CORS });
  }
  const body = await request.json();
  const settings = {
    namePart1:    (body.namePart1    || DEFAULTS.namePart1).slice(0, 30),
    namePart2:    (body.namePart2    || DEFAULTS.namePart2).slice(0, 30),
    tagline:      (body.tagline      || DEFAULTS.tagline).slice(0, 60),
    primaryColor: /^#[0-9a-fA-F]{6}$/.test(body.primaryColor) ? body.primaryColor : DEFAULTS.primaryColor,
    accentColor:  /^#[0-9a-fA-F]{6}$/.test(body.accentColor)  ? body.accentColor  : DEFAULTS.accentColor,
    phone:        (body.phone || DEFAULTS.phone).slice(0, 40),
    email:        (body.email || DEFAULTS.email).slice(0, 80),
  };
  await env.REDEX_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  return new Response(JSON.stringify({ ok: true, settings }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
