// Moon Sync AI Proxy — Cloudflare Worker
// Proxies requests to Google Gemini API so the API key stays secret
// Deploy: wrangler deploy
// Set secret: wrangler secret put GEMINI_API_KEY

const ALLOWED_ORIGINS = [
  'https://bearman-ux.github.io',
  'https://naguall.github.io',
  'http://localhost',
  'http://localhost:8080',
  'http://127.0.0.1'
];

const MODEL = 'gemini-2.5-flash-lite';
const RATE_LIMIT = 12; // max requests per IP per minute
const rateLimitMap = new Map();

// Cleanup old rate limit entries every 5 minutes
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > 120000) rateLimitMap.delete(key);
  }
}

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.start > 60000) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    if (rateLimitMap.size > 1000) cleanupRateLimits();
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(allowedOrigin) });
    }

    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin };

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
    }

    // Origin check — block requests from unknown origins
    if (!isOriginAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403, headers: jsonHeaders });
    }

    // Rate limit by IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
        status: 429,
        headers: { ...jsonHeaders, 'Retry-After': '60' }
      });
    }

    // Get API key from environment secret
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 500, headers: jsonHeaders });
    }

    try {
      const body = await request.json();

      // Validate request structure (basic sanity check)
      if (!body.contents || !Array.isArray(body.contents)) {
        return new Response(JSON.stringify({ error: 'Invalid request format' }), { status: 400, headers: jsonHeaders });
      }

      // Forward to Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
      const geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await geminiResp.json();

      return new Response(JSON.stringify(data), {
        status: geminiResp.status,
        headers: jsonHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), { status: 500, headers: jsonHeaders });
    }
  }
};
