#!/usr/bin/env node
/**
 * Origin spoofing server — "seakan nonton dari web aslinya".
 *
 * Kenapa ini jalan sementara shim JS cuma setengah:
 * player Dailymotion memutuskan boleh/tidaknya embed dari `location.ancestorOrigins`
 * (fallback: `document.referrer`), lalu mengikat manifest HLS ke cookie sesi
 * `dmvk` yang hanya ada kalau halaman benar-benar berada di origin pemiliknya.
 * Dengan hosts + local CA, browser BENAR-BENAR berada di https://donghive.vip,
 * jadi referer, ancestorOrigins, dan cookie semuanya sah — player DM yang asli
 * (tanpa patch) langsung main.
 *
 * Yang dilayani:
 *   /nonton/<slug>  → halaman player relay (iframe DM native)
 *   /api/*          → diteruskan ke relay publik (biar same-origin, tanpa CORS)
 *   sisanya         → reverse proxy ke donghive.vip yang asli
 */

import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/* ───────────────────────── config ───────────────────────── */

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i > -1 && argv[i + 1] ? argv[i + 1] : fallback
}

const PORT = Number(flag('port', 443))
const CERT = path.resolve(HERE, flag('cert', 'certs/site.crt'))
const KEY = path.resolve(HERE, flag('key', 'certs/site.key'))
const UPSTREAM = flag('upstream', 'donghive.vip')
const RELAY = flag('relay', 'https://donghive-relay.onrender.com').replace(/\/+$/, '')
const EXTRA_HOSTS = (flag('hosts', '') || '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

// 127.0.0.1/localhost ikut dilayani supaya bisa dites tanpa mengubah hosts.
const ALLOWED_HOSTS = new Set([UPSTREAM, `www.${UPSTREAM}`, '127.0.0.1', 'localhost', ...EXTRA_HOSTS])
/* ───────────────────────── DNS (DoH) ─────────────────────────
 * /etc/hosts sudah menunjuk UPSTREAM ke 127.0.0.1, jadi resolver sistem tidak
 * bisa dipakai untuk mencari IP aslinya. Tanya DoH, cache 5 menit.
 */

let cachedIp = null
let cachedAt = 0

async function upstreamIp() {
  if (cachedIp && Date.now() - cachedAt < 5 * 60_000) return cachedIp
  try {
    const res = await fetch(
      `https://1.1.1.1/dns-query?name=${encodeURIComponent(UPSTREAM)}&type=A`,
      { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    const a = (data.Answer || []).find((x) => x.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(x.data))
    if (a) {
      cachedIp = a.data
      cachedAt = Date.now()
      return cachedIp
    }
  } catch {}
  // fallback: resolver publik langsung
  dns.setServers(['1.1.1.1', '8.8.8.8'])
  const [ip] = await dns.promises.resolve4(UPSTREAM)
  cachedIp = ip
  cachedAt = Date.now()
  return ip
}

/* ───────────────────────── halaman player ───────────────────────── */

const PAGE = String.raw`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__</title>
<style>
  :root{--bg:#080a0f;--panel:#101521;--line:#1d2635;--fg:#e6edf7;--muted:#8b98ad;--accent:#4ade9b}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  header{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
  header b{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
  header a{color:var(--muted);text-decoration:none;font-size:12px}
  main{max-width:1180px;margin:0 auto;padding:16px}
  h1{font-size:16px;font-weight:600;margin:0 0 12px}
  .frame{position:relative;aspect-ratio:16/9;background:#000;border:1px solid var(--line);border-radius:10px;overflow:hidden}
  iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
  button{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font:inherit;font-size:12px;cursor:pointer}
  button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}
  p.note{color:var(--muted);font-size:12px;margin:10px 0 0}
</style>
</head>
<body>
<header><b>Origin Spoof</b><a href="/">&larr; donghive.vip asli</a></header>
<main>
  <h1 id="title">Memuat…</h1>
  <div class="frame"><iframe id="player" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
  <div class="chips" id="chips"></div>
  <p class="note" id="note"></p>
</main>
<script>
const RELAY = __RELAY__
const SLUG = __SLUG__
const pick = (n) => (location.search.match(new RegExp('[?&]' + n + '=([^&]+)')) || [])[1]

function dmId(url) {
  const m = String(url || '').match(/dailymotion\.com\/(?:embed\/video\/|player\/[^/]*\.html\?video=|video\/)([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

;(async () => {
  const player = document.getElementById('player')
  const chips = document.getElementById('chips')
  const note = document.getElementById('note')
  let data
  try {
    const res = await fetch('/api/episode/' + SLUG)
    data = await res.json()
  } catch (e) {
    document.getElementById('title').textContent = 'Gagal memuat episode'
    note.textContent = String(e)
    return
  }
  document.title = (data.title || SLUG) + ' — Origin Spoof'
  document.getElementById('title').textContent = data.title || SLUG

  const servers = (data.servers || []).slice()
  const dm = servers.find((s) => s.kind === 'dailymotion')

  function show(kind) {
    const s = servers.find((x) => x.kind === kind)
    if (!s) return
    const id = dmId(s.url)
    player.src = kind === 'dailymotion' && id
      ? 'https://geo.dailymotion.com/player/xhojl.html?video=' + id
      : s.url
    note.textContent = s.note || ''
    for (const b of chips.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(b.dataset.kind === kind))
    }
  }

  for (const s of servers) {
    if (!s.url) continue
    const b = document.createElement('button')
    b.textContent = s.label || s.kind
    b.dataset.kind = s.kind
    b.onclick = () => show(s.kind)
    chips.appendChild(b)
  }

  const want = pick('server')
  const initial = servers.find((s) => s.kind === want)
    || dm
    || servers.find((s) => s.playable)
    || servers[0]
  if (initial) show(initial.kind)
})()
</script>
</body>
</html>`

function renderPage(slug, title) {
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c])
  return PAGE.replace(/__TITLE__/g, esc(title || 'Player'))
    .replace(/__RELAY__/g, JSON.stringify(RELAY))
    .replace(/__SLUG__/g, JSON.stringify(slug))
}

/* ───────────────────────── proxy ke relay publik ───────────────────────── */

async function proxyRelay(req, res) {
  const target = RELAY + req.url
  try {
    const upstream = await fetch(target, {
      headers: { accept: req.headers.accept || 'application/json' },
      signal: AbortSignal.timeout(25_000),
    })
    const body = Buffer.from(await upstream.arrayBuffer())
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'content-length': body.length,
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    })
    res.end(body)
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: String(err.message || err) }))
  }
}

/* ───────────────────────── reverse proxy ke situs asli ───────────────────────── */

async function proxySite(req, res) {
  let ip
  try {
    ip = await upstreamIp()
  } catch (err) {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`gagal resolve ${UPSTREAM}: ${err.message}`)
    return
  }

  const headers = { ...req.headers, host: UPSTREAM }
  delete headers['content-length']

  const up = https.request(
    {
      host: ip,
      port: 443,
      servername: UPSTREAM, // SNI tetap nama asli → sertifikat & Cloudflare senang
      method: req.method,
      path: req.url,
      headers,
    },
    (ur) => {
      const out = { ...ur.headers }
      res.writeHead(ur.statusCode || 502, out)
      ur.pipe(res)
    },
  )
  up.on('error', (err) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`upstream error: ${err.message}`)
  })
  req.pipe(up)
}

/* ───────────────────────── server ───────────────────────── */

const tlsOpts = {
  cert: fs.readFileSync(CERT),
  key: fs.readFileSync(KEY),
}

const server = https.createServer(tlsOpts, async (req, res) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase()
  const url = req.url || '/'

  if (!ALLOWED_HOSTS.has(host)) {
    res.writeHead(421, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`host ${host} tidak dilayani. tambahkan lewat --hosts, atau pakai ${UPSTREAM}`)
    return
  }

  if (url === '/__health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, upstream: UPSTREAM, relay: RELAY }))
    return
  }

  if (url.startsWith('/api/')) return proxyRelay(req, res)

  const m = url.match(/^\/nonton\/([^/?#]+)/)
  if (m) {
    const slug = decodeURIComponent(m[1])
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(renderPage(slug, slug.replace(/-/g, ' ')))
    return
  }

  return proxySite(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[origin-spoof] https://${UPSTREAM}:${PORT}  (upstream ${UPSTREAM}, relay ${RELAY})`)
  if (PORT !== 443) {
    console.log('[origin-spoof] CATATAN: origin ikut menyertakan port. DM hanya menerima https://<host> tanpa port → pakai 443 untuk hasil sebenarnya.')
  }
})

/* HTTP kecil: kalau browsernya kebetulan buka http://, lempar ke https. */
const httpPort = Number(flag('http-port', 0))
if (httpPort) {
  http
    .createServer((req, res) => {
      const host = String(req.headers.host || UPSTREAM).split(':')[0]
      const target = `https://${host}${PORT === 443 ? '' : `:${PORT}`}${req.url || '/'}`
      res.writeHead(301, { location: target })
      res.end()
    })
    .listen(httpPort, '0.0.0.0', () => console.log(`[origin-spoof] http :${httpPort} → https`))
}
