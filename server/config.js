export const CONFIG = {
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  upstream: 'https://donghive.vip',
  upstreamReferer: 'https://donghive.vip/',
  version: '1.0.0',

  // Host yang boleh diproxy lewat /api/proxy (anti-SSRF)
  proxyAllowlist: [
    'geo.dailymotion.com',
    'www.dailymotion.com',
    'dailymotion.com',
    'api.dailymotion.com',
    'api-2.dailymotion.com',
    'static.dailymotion.com',
    's1.dmcdn.net',
    's2.dmcdn.net',
    'geo.dailymotion.com',
  ],

  // Cache TTL untuk resolusi video id episode (ms)
  videoCacheTtlMs: 1000 * 60 * 30,

  requestTimeoutMs: 20000,
  upstreamHeaders: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    Referer: 'https://donghive.vip/',
  },
}

/**
 * Build URL absolut dari request — penting di Render karena host asli
 * ada di X-Forwarded-Host / X-Forwarded-Proto.
 */
export function originOf(req) {
  const proto =
    req.headers['x-forwarded-proto']?.split(',')[0]?.trim() || req.protocol || 'http'
  const host =
    req.headers['x-forwarded-host']?.split(',')[0]?.trim() ||
    req.headers.host ||
    `localhost:${CONFIG.port}`
  return `${proto}://${host}`
}

/** URL absolut untuk path internal (bridge, embed, halaman). */
export function absolute(req, path) {
  const base = originOf(req)
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}
