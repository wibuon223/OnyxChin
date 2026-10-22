import { CONFIG, absolute, originOf } from './config.js'
import { extractVideoId } from './donghive.js'
import { source } from './scraper.js'
import { fetchBinary, fetchUpstream } from './fetcher.js'

const DM_PLAYER_BASE = 'https://geo.dailymotion.com/player/xhojl.html'
const DM_API_HOSTS = [
  'https://api.dailymotion.com',
  'https://api-2.dailymotion.com',
  'https://geo.dailymotion.com',
  'https://www.dailymotion.com',
  'https://s1.dmcdn.net',
  'https://s2.dmcdn.net',
]

/**
 * Shim "origin spoofing" untuk player Dailymotion.
 *
 * Player menentukan embedder lewat `window.top.location.href` (cross-origin →
 * throw) lalu fallback ke `location.ancestorOrigins`. Karena kita menyajikan
 * dokumen player dari domain sendiri, ancestorOrigins = domain relay, dan DM
 * menolak ("This video cannot be played on this site").
 *
 * Shim ini dijalankan SEBELUM bundle player, jadi saat player membaca
 * embedder ia melihat `https://donghive.vip` — sama seperti di situs aslinya.
 * Ini murni lapisan klien: tidak menyentuh akun/konten siapa pun.
 */
const ORIGIN_SHIM = `<script>
(function () {
  var HOST = 'donghive.vip'
  var HREF = 'https://donghive.vip/'
  try {
    var origins = ['https://donghive.vip']
    Object.defineProperty(origins, 'item', { value: function (i) { return this[i] || null } })
    Object.defineProperty(origins, 'contains', { value: function (v) { return this.indexOf(v) > -1 } })
    Object.defineProperty(Location.prototype, 'ancestorOrigins', {
      configurable: true,
      get: function () { return origins },
    })
  } catch (e) {}
  try {
    Object.defineProperty(Document.prototype, 'referrer', {
      configurable: true,
      get: function () { return HREF },
    })
  } catch (e) {}
  try {
    // Beberapa jalur kode membaca location.hostname/host untuk cek domain.
    var loc = window.location
    var fake = {
      hostname: HOST, host: HOST, origin: 'https://' + HOST, href: HREF,
      protocol: 'https:', port: '', pathname: loc.pathname, search: loc.search, hash: loc.hash,
    }
    ;['hostname', 'host', 'origin'].forEach(function (k) {
      try {
        Object.defineProperty(loc, k, { configurable: true, get: function () { return fake[k] } })
      } catch (e) {}
    })
  } catch (e) {}
  try {
    // Semua request media DM (manifest + segment + API) dibelokkan ke proxy
    // kita, supaya server DM melihat Referer/Origin donghive.vip — persis
    // seperti saat player asli ditanam di situsnya.
    var RELAY = window.location.origin
    var DM_RE = /^https?:\/\/([a-z0-9-]+\.)*(dailymotion\.com|dmcdn\.net|dm-event\.net)\//i
    function wrap(u) {
      try {
        return DM_RE.test(u) ? RELAY + '/api/proxy?u=' + encodeURIComponent(u) : u
      } catch (e) {
        return u
      }
    }
    var realFetch = window.fetch
    if (realFetch) {
      window.fetch = function (input, init) {
        try {
          if (typeof input === 'string') input = wrap(input)
          else if (input && input.url) input = new Request(wrap(input.url), input)
        } catch (e) {}
        return realFetch.call(this, input, init)
      }
    }
    var realOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function () {
      var args = [].slice.call(arguments)
      try {
        args[1] = wrap(String(args[1]))
      } catch (e) {}
      return realOpen.apply(this, args)
    }
  } catch (e) {}
  try {
    // hls.js DM jalan di Web Worker → hook di atas tidak menjangkau. Service
    // worker yang mencegat, jadi semua trafik media tetap lewat relay.
    if (navigator.serviceWorker) {
      // <base href> menunjuk ke geo.dailymotion.com → URL relatif akan salah
      // origin. Pakai origin relay secara eksplisit.
      navigator.serviceWorker
        .register(window.location.origin + '/sw-dm.js')
        .then(function () {
          try {
            if (!navigator.serviceWorker.controller && !sessionStorage.getItem('swdm-reload')) {
              sessionStorage.setItem('swdm-reload', '1')
              location.reload()
            }
          } catch (e) {}
        })
        .catch(function () {})
    }
  } catch (e) {}
})()
</script>`

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
export async function resolveVideo(slug, srcId = 'donghive') {
  const scraper = source(srcId)
  const clean = String(slug).replace(/^\/+/, '')
  const cacheKey = `vid:${srcId}:${clean}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  if (clean.startsWith('v/')) {
    const id = clean.slice(2)
    return cacheSet(cacheKey, { video_id: id, direct_url: `${DM_PLAYER_BASE}?video=${id}` })
  }

  const page = await scraper.fetchEpisodePage(clean)
  const id = page.video_id || extractVideoId(page.embed_src)
  if (!id) {
    const err = new Error(`tidak ada video id untuk ${clean}`)
    err.status = 404
    throw err
  }
  return cacheSet(cacheKey, {
    video_id: id,
    direct_url: `${DM_PLAYER_BASE}?video=${id}`,
    title: page.title,
    anime_title: page.anime_title,
  })
}

/* ───────────────────────── reverse proxy ───────────────────────── */

/** Domain DM yang boleh dilewatkan proxy: host persis ATAU subdomain. */
const PROXY_SUFFIXES = ['.dailymotion.com', '.dmcdn.net', '.dm-event.net']
const PROXY_EXACT = new Set([...CONFIG.proxyAllowlist, 'dailymotion.com', 'dmcdn.net'])

export function isAllowedProxyUrl(raw) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    if (PROXY_EXACT.has(u.hostname)) return true
    return PROXY_SUFFIXES.some((s) => u.hostname.endsWith(s))
  } catch {
    return false
  }
}

/** Bungkus URL absolut jadi lewat proxy kita. */
function proxify(absUrl, origin) {
  return `${origin}/api/proxy?u=${encodeURIComponent(absUrl)}`
}

/* ───────────────── cookie jar Dailymotion ─────────────────
 * Player DM memakai cookie sesi (dmvk/ts/…). Karena dokumen player disajikan
 * dari origin relay, browser tidak pernah menyimpan cookie dailymotion.com —
 * jadi relay yang menyimpannya dan mengirimkannya ke upstream. Tanpa ini
 * manifest balik 403 dan player berhenti di "Loading".
 */
const dmJar = new Map()

function storeUpstreamCookies(headers) {
  const list = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : []
  for (const raw of list) {
    const pair = String(raw).split(';')[0]
    const eq = pair.indexOf('=')
    if (eq > 0) dmJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
  }
}

function cookieHeaderFor(host) {
  const own = []
  for (const [k, v] of dmJar) own.push(`${k}=${v}`)
  return own.join('; ')
}

/**
 * HLS manifest: setiap URI (segment, key, init map) harus ikut lewat proxy,
 * kalau tidak hls.js akan menariknya langsung dari dmcdn dengan Referer kosong
 * → 403 dan video stuck di "Loading".
 */
function rewriteM3u8(body, manifestUrl, origin) {
  const abs = (u) => {
    try {
      return proxify(new URL(u, manifestUrl).toString(), origin)
    } catch {
      return u
    }
  }
  return body
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return line
      if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${abs(u)}"`)
      return abs(t)
    })
    .join('\n')
}

/** Rewrite URL absolut dailymotion/dmcdn → lewat proxy kita. */
export function rewriteToProxy(html, origin) {
  // Tangkap URL LENGKAP (path + query) lalu encode, bukan cuma host —
  // kalau cuma host yang diganti, path-nya jadi URL relatif dan proxy
  // tidak bisa meneruskannya.
  const patterns = [
    /https:\/\/geo\.dailymotion\.com[^"'\s)<>\\]*/gi,
    /https:\/\/api(?:-2)?\.dailymotion\.com[^"'\s)<>\\]*/gi,
    /https:\/\/www\.dailymotion\.com[^"'\s)<>\\]*/gi,
    /https:\/\/s[12]\.dmcdn\.net[^"'\s)<>\\]*/gi,
    /\/\/geo\.dailymotion\.com[^"'\s)<>\\]*/gi,
    /\/\/api(?:-2)?\.dailymotion\.com[^"'\s)<>\\]*/gi,
    /\/\/s[12]\.dmcdn\.net[^"'\s)<>\\]*/gi,
  ]
  let out = html
  for (const re of patterns) {
    out = out.replace(re, (m) => `${origin}/api/proxy?u=${encodeURIComponent(m)}`)
  }
  return out
}

/** Ambil aset dailymotion lewat server kita (biar origin一致, aman dari hotlink block). */
export async function proxyAsset(req, res, rawUrl) {
  // URL relatif (mis. /static/... dari <base href>) resolve ke host dailymotion
  let target
  try {
    target = rawUrl.startsWith('/')
      ? new URL(rawUrl, 'https://geo.dailymotion.com')
      : new URL(rawUrl)
  } catch {
    res.status(400).json({ error: 'URL tidak valid' })
    return
  }
  if (!isAllowedProxyUrl(target.toString())) {
    res.status(403).json({ error: 'host tidak diizinkan' })
    return
  }
  const origin = originOf(req)
  const isManifest = /\.m3u8($|\?)/i.test(target.pathname) || /mpegurl/i.test(String(req.headers.accept || ''))
  try {
    const headers = {
      Referer: CONFIG.upstreamReferer,
      Origin: 'https://donghive.vip',
      Accept: '*/*',
    }
    const range = req.headers.range
    if (range) headers.Range = range
    const cookie = cookieHeaderFor(target.hostname)
    if (cookie) headers.Cookie = cookie

    const upstream = await fetchUpstream(target.toString(), { headers })
    storeUpstreamCookies(upstream.headers)
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Accept-Ranges', 'bytes')

    if (isManifest) {
      const text = await upstream.text()
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
      // manifest harus selalu segar — kalau di-cache, token/sesi HLS bisa basi
      res.setHeader('Cache-Control', 'no-store')
      res.status(upstream.status === 206 ? 200 : upstream.status).send(rewriteM3u8(text, target.toString(), origin))
      return
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    const cr = upstream.headers.get('content-range')
    if (cr) res.setHeader('Content-Range', cr)
    res.status(upstream.status).send(buffer)
  } catch (err) {
    res.status(502).json({ error: `proxy gagal: ${err.message}` })
  }
}

/**
 * Bridge penuh: reverse-proxy dokumen player dailymotion,
 * sehingga browser melihat origin kita (anti hotlink/deteksi).
 */
export async function proxyPlayer(req, res, videoId) {
  const origin = originOf(req)
  // ads=false: iklan DM memanggil domain terpisah (cdndirector/dm-event) yang
  // sering gagal di konteks proxy dan mematikan playback utama.
  const target = `${DM_PLAYER_BASE}?video=${encodeURIComponent(videoId)}&ads=false&mute=false&ui=video`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs)
  try {
    const upstream = await fetchUpstream(target, {
      headers: {
        'User-Agent': CONFIG.upstreamHeaders['User-Agent'],
        Referer: 'https://geo.dailymotion.com/',
      },
    })
    // Cookie sesi DM di-set di response dokumen player — simpan ke jar relay.
    storeUpstreamCookies(upstream.headers)

    const html = await upstream.text()
    let out = rewriteToProxy(html, origin)
    // Matikan iklan di config player (bukan cuma query param): request iklan
    // ke cdndirector/dm-event gagal di konteks proxy dan mematikan playback.
    out = out
      .replace(/"enable_ads":\s*true/g, '"enable_ads":false')
      .replace(/"enableAds":\s*true/g, '"enableAds":false')
      .replace(/"enable_preload":\s*true/g, '"enable_preload":false')
    out = out.replace(
      '<head>',
      `<head>\n    ${ORIGIN_SHIM}\n    <base href="https://geo.dailymotion.com/">\n    <meta name="referrer" content="no-referrer">`,
    )
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=600')
    res.send(out)
  } catch (err) {
    res
      .status(502)
      .send(
        `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;background:#07090f;color:#e2e8f0;padding:24px">Bridge gagal: ${escapeHtml(err.message)}</body>`,
      )
  } finally {
    clearTimeout(timer)
  }
}

/* ───────────────────────── halaman bridge ───────────────────────── */

const BRIDGE_CSS = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#07090f;color:#e2e8f0;
    font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
    overscroll-behavior:none}
  body{display:flex;flex-direction:column}
  .stage{position:relative;flex:1;min-height:0;background:#000}
  .stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
  .stage .empty{position:absolute;inset:0;display:grid;place-items:center;
    font-size:13px;color:#64748b;text-align:center;padding:24px}
  .bar{display:flex;align-items:center;gap:8px;padding:8px 10px;flex-wrap:wrap;
    background:#0b0f18;border-top:1px solid rgba(148,163,184,.14)}
  .bar .lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:#475569;margin-right:2px;flex:none}
  .bar button{appearance:none;cursor:pointer;font:inherit;font-size:12px;
    padding:6px 11px;border-radius:999px;border:1px solid rgba(148,163,184,.2);
    background:rgba(148,163,184,.07);color:#cbd5e1;display:inline-flex;
    align-items:center;gap:6px;transition:.16s;white-space:nowrap}
  .bar button:hover{background:rgba(148,163,184,.14);color:#fff}
  .bar button[aria-pressed="true"]{background:#0d9488;border-color:#0d9488;color:#fff}
  .bar button.locked{border-style:dashed;color:#94a3b8}
  .bar button.locked[aria-pressed="true"]{background:#7c2d12;border-color:#7c2d12;color:#fff}
  .bar .dot{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.75}
  .bar .sp{flex:1}
  .bar a{font-size:11px;color:#64748b;text-decoration:none}
  .bar a:hover{color:#6ee7f0}
  .note{font-size:11px;color:#f59e0b;padding:0 12px 8px;background:#0b0f18;display:none}
  .note.on{display:block}
  @media (max-width:520px){
    .bar{padding:6px 8px;gap:6px}
    .bar button{font-size:11px;padding:5px 9px}
    .bar .lbl{display:none}
  }
`

/**
 * Halaman player milik kita.
 *
 * Daftar server diambil dari <select class="mirror"> upstream (dailymotion,
 * dtube, odysee, okru). Kita render satu iframe + tombol pemilih server.
 *
 * Kenapa perlu pemilih: player Dailymotion donghive dikunci domain-nya,
 * jadi dari origin relay hasilnya "This video cannot be played on this site".
 * Provider lain (OKRU/Odysee/MEGA/DTube) bebas referer dan bisa diputar.
 */
export async function bridgePage(req, res, slug, opts = {}) {
  const origin = originOf(req)
  const srcId = String(opts.srcId || req.query.src || 'donghive')
  const title = opts.title || 'Donghive Relay'
  const wantServer = String(req.query.server || '').toLowerCase()
  // ?bar=0 → dipakai saat halaman ini di-embed di situs kita sendiri
  // (pemilih server dirender React, biar tidak dobel).
  const hideBar = String(req.query.bar || '') === '0'

  let page = null
  let videoId = ''
  try {
    page = await source(srcId).fetchEpisodePage(slug)
    videoId = page.video_id || ''
  } catch (err) {
    page = null
  }

  if (!page || (!page.servers?.length && !videoId)) {
    res
      .status(404)
      .type('html')
      .send(
        `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Tidak ditemukan</title><style>${BRIDGE_CSS}</style></head>
        <body><div class="stage"><div class="empty">
        <div>Video tidak ditemukan.<br><a href="${origin}" style="color:#6ee7f0">Kembali ke beranda</a></div>
        </div></div></body></html>`,
      )
    return
  }

  // Bangun daftar sumber yang bisa dipasang di iframe.
  const sources = (page.servers || []).map((s) => {
    if (s.kind === 'dailymotion') {
      const vid = s.url.match(/[?&]video=([a-zA-Z0-9]+)/)?.[1] || videoId
      return {
        kind: s.kind,
        name: s.name,
        playable: false,
        note: s.note || 'dikunci ke donghive.vip',
        src: vid ? `${origin}/bridge/dm?video=${vid}` : '',
      }
    }
    return { kind: s.kind, name: s.name, playable: s.playable !== false, note: s.note || '', src: s.url }
  })

  if (!sources.length && videoId) {
    sources.push({
      kind: 'dailymotion',
      name: 'Dailymotion',
      playable: false,
      note: 'dikunci ke donghive.vip',
      src: `${origin}/bridge/dm?video=${videoId}`,
    })
  }

  const initial =
    sources.find((s) => s.kind === wantServer) ||
    sources.find((s) => s.playable) ||
    sources[0]

  const buttons = sources
    .map(
      (s) =>
        `<button type="button" data-kind="${escapeHtml(s.kind)}" data-src="${escapeHtml(s.src)}"` +
        ` data-playable="${s.playable ? '1' : '0'}" data-note="${escapeHtml(s.note)}"` +
        `${s.kind === initial.kind ? ' aria-pressed="true"' : ' aria-pressed="false"'}` +
        `${s.playable ? '' : ' class="locked"'}>` +
        `<span class="dot"></span>${escapeHtml(s.name || s.kind)}</button>`,
    )
    .join('')

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
<body${hideBar ? ' class="embed"' : ''}>
  <div class="stage">
    <iframe id="p" src="${escapeHtml(initial.src)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="no-referrer" title="${escapeHtml(title)}"></iframe>
  </div>
${hideBar ? '' : `  <div class="note" id="note"></div>
  <div class="bar">
    <span class="lbl">Server</span>
    ${buttons}
    <span class="sp"></span>
    <a href="${origin}/watch/${escapeHtml(slug)}" target="_top">buka di situs &rarr;</a>
  </div>`}
  <script>
  (function () {
    var frame = document.getElementById('p')
    var note = document.getElementById('note')
    var KEY = 'dh:server'

    function paint(src, noteText) {
      if (!src) return
      if (frame.src !== src) frame.src = src
      if (!note) return
      if (noteText) { note.textContent = noteText; note.classList.add('on') }
      else { note.textContent = ''; note.classList.remove('on') }
    }

    document.querySelectorAll('.bar button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.bar button').forEach(function (o) {
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false')
        })
        try { localStorage.setItem(KEY, b.dataset.kind) } catch (e) {}
        var msg = b.dataset.playable === '1'
          ? (b.dataset.note || '')
          : 'Server ' + b.textContent.trim() + ' dikunci pemiliknya (' + b.dataset.note + '). Kalau video tidak jalan, pilih server lain.'
        paint(b.dataset.src, msg)
      })
    })

    // ingat pilihan terakhir, tapi jangan timpa ?server= eksplisit
    try {
      var saved = localStorage.getItem(KEY)
      var explicit = new URLSearchParams(location.search).get('server')
      if (!explicit && saved) {
        var b = document.querySelector('.bar button[data-kind="' + saved + '"]')
        if (b && b.dataset.playable === '1') b.click()
      }
    } catch (e) {}

    var cur = document.querySelector('.bar button[aria-pressed="true"]')
    if (cur && cur.dataset.playable !== '1') {
      paint(null, 'Server ' + cur.textContent.trim() + ' dikunci pemiliknya — pilih server lain di bawah.')
    }
  })()
  </script>
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
