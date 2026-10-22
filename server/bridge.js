import { CONFIG, absolute, originOf } from './config.js'
import { fetchEpisodePage, extractVideoId } from './donghive.js'

const DM_PLAYER_BASE = 'https://geo.dailymotion.com/player/xhojl.html'
const DM_API_HOSTS = [
  'https://api.dailymotion.com',
  'https://api-2.dailymotion.com',
  'https://geo.dailymotion.com',
  'https://www.dailymotion.com',
  'https://s1.dmcdn.net',
  'https://s2.dmcdn.net',
]

/* ───────────────────────── cache ───────────────────────── */

const videoCache = new Map()

function cacheGet(key) {
  const hit = videoCache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    videoCache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key, value, ttl = CONFIG.videoCacheTtlMs) {
  videoCache.set(key, { value, expires: Date.now() + ttl })
  if (videoCache.size > 500) {
    const oldest = videoCache.keys().next().value
    videoCache.delete(oldest)
  }
  return value
}

/* ───────────────────────── resolusi video ───────────────────────── */

/**
 * Resolusi slug episode donghive → video id dailymotion.
 * accepts: "jade-dynasty-episode-90-subtitle-indonesia" atau "v/<videoId>".
 */
export async function resolveVideo(slug) {
  const clean = String(slug).replace(/^\/+/, '')
  const cached = cacheGet(`vid:${clean}`)
  if (cached) return cached

  if (clean.startsWith('v/')) {
    const id = clean.slice(2)
    return cacheSet(`vid:${clean}`, { video_id: id, direct_url: `${DM_PLAYER_BASE}?video=${id}` })
  }

  const page = await fetchEpisodePage(clean)
  const id = page.video_id || extractVideoId(page.embed_src)
  if (!id) {
    const err = new Error(`tidak ada video id untuk ${clean}`)
    err.status = 404
    throw err
  }
  return cacheSet(`vid:${clean}`, {
    video_id: id,
    direct_url: `${DM_PLAYER_BASE}?video=${id}`,
    title: page.title,
    anime_title: page.anime_title,
  })
}

/* ───────────────────────── reverse proxy ───────────────────────── */

export function isAllowedProxyUrl(raw) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    return CONFIG.proxyAllowlist.includes(u.hostname)
  } catch {
    return false
  }
}

/** Rewrite URL absolut dailymotion/dmcdn → lewat proxy kita. */
export function rewriteToProxy(html, origin) {
  let out = html
  for (const host of DM_API_HOSTS) {
    out = out.split(host).join(`${origin}/api/proxy?u=`)
  }
  out = out.replace(/(["'(])(\/\/)(geo|api|www)\.dailymotion\.com/g, `$1${origin}/api/proxy?u=$2`)
  out = out.replace(/(["'(])(\/\/)(s1|s2)\.dmcdn\.net/g, `$1${origin}/api/proxy?u=$2`)
  return out
}

/** Ambil aset dailymotion lewat server kita (biar origin一致, aman dari hotlink block). */
export async function proxyAsset(req, res, rawUrl) {
  if (!isAllowedProxyUrl(rawUrl)) {
    res.status(403).json({ error: 'host tidak diizinkan' })
    return
  }
  const target = new URL(rawUrl)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs)
  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': CONFIG.upstreamHeaders['User-Agent'],
        Referer: CONFIG.upstreamReferer,
        Origin: 'https://geo.dailymotion.com',
      },
      signal: ctrl.signal,
      redirect: 'follow',
    })

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=3600')

    const disposition = upstream.headers.get('content-disposition')
    if (disposition) res.setHeader('Content-Disposition', disposition)

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.send(buffer)
  } catch (err) {
    res.status(502).json({ error: `proxy gagal: ${err.message}` })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Bridge penuh: reverse-proxy dokumen player dailymotion,
 * sehingga browser melihat origin kita (anti hotlink/deteksi).
 */
export async function proxyPlayer(req, res, videoId) {
  const origin = originOf(req)
  const target = `${DM_PLAYER_BASE}?video=${encodeURIComponent(videoId)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs)
  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': CONFIG.upstreamHeaders['User-Agent'],
        Referer: 'https://geo.dailymotion.com/',
      },
      signal: ctrl.signal,
    })
    const html = await upstream.text()
    let out = rewriteToProxy(html, origin)
    out = out.replace(
      '<head>',
      `<head>\n    <base href="https://geo.dailymotion.com/">\n    <meta name="referrer" content="no-referrer">`,
    )
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=600')
    res.send(out)
  } catch (err) {
    res.status(502).send(`<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;background:#07090f;color:#e2e8f0;padding:24px">Bridge gagal: ${err.message}</body>`)
  } finally {
    clearTimeout(timer)
  }
}

/* ───────────────────────── halaman bridge ───────────────────────── */

const BRIDGE_CSS = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#07090f;color:#e2e8f0;
    font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
  .stage{position:relative;width:100%;height:100%;display:grid;place-items:center}
  iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
  .fallback{position:absolute;inset:auto 0 0 0;padding:10px 14px;font-size:12px;
    color:#94a3b8;background:linear-gradient(transparent,rgba(7,9,15,.9));text-align:center}
`

/**
 * Halaman player milik kita — iframe-nya menunjuk ke domain kita sendiri
 * (bridge), bukan langsung ke CDN, jadi hotlink/origin selalu milik relay.
 */
export async function bridgePage(req, res, slug, opts = {}) {
  const origin = originOf(req)
  const mode = opts.mode || 'bridge' // bridge | proxy | direct
  const title = opts.title || 'Donghive Relay'

  let videoId = ''
  let direct = ''
  try {
    const resolved = await resolveVideo(slug)
    videoId = resolved.video_id
    direct = resolved.direct_url
  } catch (err) {
    res
      .status(404)
      .type('html')
      .send(
        `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Tidak ditemukan</title><style>${BRIDGE_CSS}</style></head>
         <body><div class="stage"><div style="text-align:center;padding:24px">
         <div style="font-size:15px;margin-bottom:12px">Video tidak ditemukan</div>
         <a href="${origin}" style="color:#6ee7f0;font-size:13px">Kembali ke beranda</a>
         </div></div></body></html>`,
      )
    return
  }

  let src = direct
  if (mode === 'bridge') src = `${origin}/bridge/dm?video=${videoId}`
  if (mode === 'proxy') src = `${origin}/bridge/dm?video=${videoId}`

  const iframeHtml = `<iframe src="${src}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="no-referrer" title="${escapeHtml(title)}"></iframe>`

  res
    .status(200)
    .type('html')
    .send(
      `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${escapeHtml(title)} — Donghive Relay</title>
  <meta name="referrer" content="no-referrer">
  <style>${BRIDGE_CSS}</style>
</head>
<body>
  <div class="stage">
    ${iframeHtml}
    <div class="fallback">${escapeHtml(title)}</div>
  </div>
</body>
</html>`,
    )
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
