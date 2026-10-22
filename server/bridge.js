import { CONFIG, absolute, originOf } from './config.js'
import { fetchEpisodePage, extractVideoId } from './donghive.js'
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
  try {
    const { buffer, contentType } = await fetchBinary(target.toString(), {
      Referer: CONFIG.upstreamReferer,
      Origin: 'https://geo.dailymotion.com',
    })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(buffer)
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
  const target = `${DM_PLAYER_BASE}?video=${encodeURIComponent(videoId)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs)
  try {
    const upstream = await fetchUpstream(target, {
      headers: {
        'User-Agent': CONFIG.upstreamHeaders['User-Agent'],
        Referer: 'https://geo.dailymotion.com/',
      },
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
  const title = opts.title || 'Donghive Relay'
  const wantServer = String(req.query.server || '').toLowerCase()
  // ?bar=0 → dipakai saat halaman ini di-embed di situs kita sendiri
  // (pemilih server dirender React, biar tidak dobel).
  const hideBar = String(req.query.bar || '') === '0'

  let page = null
  let videoId = ''
  try {
    page = await fetchEpisodePage(slug)
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
