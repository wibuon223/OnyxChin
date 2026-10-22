/**
 * Donghive Fetch — Cloudflare Worker
 *
 * Fallback scraper untuk region/edge yang diblokir Cloudflare.
 * Worker ini menarik HTML donghive.vip dari edge Cloudflare (CF->CF lolos),
 * lalu menyajikannya sebagai JSON ter-normalisasi untuk relay Render.
 *
 * Endpoint:
 *   GET /?path=/anime/jade-dynasty/            -> { url, status, html }
 *   GET /?path=/anime/?status=&type=&order=update
 *   GET /api/health                            -> { ok, ts }
 */

const UPSTREAM = 'https://donghive.vip'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Referer: 'https://donghive.vip/',
  'Accept-Encoding': 'gzip, deflate, br',
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true, ts: Date.now(), edge: request.cf?.colo || 'unknown' })
    }

    const path = url.searchParams.get('path') || '/'
    const target = path.startsWith('http') ? path : `${UPSTREAM}${path.startsWith('/') ? path : `/${path}`}`

    // Token opsional: kalau env RELAY_TOKEN di-set, request harus bawa header.
    if (env.RELAY_TOKEN) {
      const supplied = request.headers.get('x-relay-token')
      if (supplied !== env.RELAY_TOKEN) {
        return json({ error: 'unauthorized' }, 401)
      }
    }

    try {
      const upstream = await fetch(target, {
        headers: HEADERS,
        redirect: 'follow',
        cf: { cacheTtl: 60, cacheEverything: true },
      })
      const html = await upstream.text()
      return json({
        url: target,
        status: upstream.status,
        contentType: upstream.headers.get('content-type'),
        length: html.length,
        html,
      })
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err), url: target }, 502)
    }
  },
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })
}
