import express from 'express'
import compression from 'compression'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import swaggerUi from 'swagger-ui-express'

import { CONFIG, absolute, originOf } from './config.js'
import {
  fetchHome,
  fetchViewAll,
  fetchGenrePage,
  fetchGenres,
  fetchSearch,
  fetchAnimeDetail,
  fetchEpisodePage,
} from './donghive.js'
import { bridgePage, proxyAsset, proxyPlayer, resolveVideo } from './bridge.js'
import { buildOpenApi } from './openapi.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use(cors())
app.use(express.json())

/* ───────────────────────── helpers ───────────────────────── */

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/** Bungkus nilai jadi URL absolut terhadap origin aktif. */
function absolutizeDeep(value, req) {
  if (typeof value === 'string') {
    if (value.startsWith('/e/') || value.startsWith('/bridge/') || value.startsWith('/api/proxy')) {
      return absolute(req, value)
    }
    return value
  }
  if (Array.isArray(value)) return value.map((v) => absolutizeDeep(v, req))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = absolutizeDeep(v, req)
    return out
  }
  return value
}
function intParam(value, fallback, max = 50) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

/* ───────────────────────── system ───────────────────────── */

/* Cache TTL pendek: scraping upstream itu mahal, dan homepage cuma berubah
   tiap beberapa menit. Render free-tier juga sleep, jadi cache panas. */
const ttlCache = new Map()

function cached(key, ttlMs, producer) {
  const hit = ttlCache.get(key)
  if (hit && Date.now() < hit.expires) return hit.value
  const value = Promise.resolve()
    .then(producer)
    .catch((err) => {
      ttlCache.delete(key)
      throw err
    })
  ttlCache.set(key, { value, expires: Date.now() + ttlMs })
  if (ttlCache.size > 200) ttlCache.delete(ttlCache.keys().next().value)
  return value
}

const HOME_TTL = 60_000
const LIST_TTL = 120_000
const DETAIL_TTL = 300_000

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(2)),
    version: CONFIG.version,
    origin: originOf(req),
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/config', (req, res) => {
  res.json({
    upstream: CONFIG.upstream,
    version: CONFIG.version,
    proxy_allowlist: CONFIG.proxyAllowlist,
  })
})

/* ───────────────────────── catalog ───────────────────────── */

app.get(
  '/api/home',
  asyncRoute(async (req, res) => {
    const data = await cached('home', HOME_TTL, () => fetchHome())
    res.json(absolutizeDeep(data, req))
  }),
)

app.get(
  '/api/anime',
  asyncRoute(async (req, res) => {
    const page = intParam(req.query.page, 1, 500)
    const maxPages = intParam(req.query.max_pages, 1, 20)
    const data = await cached(`anime:${page}:${maxPages}`, LIST_TTL, () => fetchViewAll({ page, maxPages }))
    res.json(absolutizeDeep(data, req))
  }),
)

app.get(
  '/api/genre/:slug',
  asyncRoute(async (req, res) => {
    const page = intParam(req.query.page, 1, 500)
    const maxPages = intParam(req.query.max_pages, 1, 20)
    const data = await cached(`genre:${req.params.slug}:${page}:${maxPages}`, LIST_TTL, () =>
      fetchGenrePage(req.params.slug, { page, maxPages }),
    )
    res.json(absolutizeDeep(data, req))
  }),
)

app.get(
  '/api/genres',
  asyncRoute(async (req, res) => {
    res.json(await cached('genres', LIST_TTL, () => fetchGenres()))
  }),
)

app.get(
  '/api/search',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim()
    if (!q) {
      res.status(400).json({ error: 'parameter q wajib diisi' })
      return
    }
    const page = intParam(req.query.page, 1, 500)
    const data = await cached(`search:${q}:${page}`, LIST_TTL, () => fetchSearch(q, { page }))
    res.json(absolutizeDeep({ query: q, ...data }, req))
  }),
)

/* ───────────────────────── anime + episode ───────────────────────── */

app.get(
  '/api/anime/:slug',
  asyncRoute(async (req, res) => {
    const data = await cached(`detail:${req.params.slug}`, DETAIL_TTL, () =>
      fetchAnimeDetail(req.params.slug),
    )
    res.json(absolutizeDeep(data, req))
  }),
)

app.get(
  '/api/episode/:slug',
  asyncRoute(async (req, res) => {
    const page = await cached(`episode:${req.params.slug}`, DETAIL_TTL, () =>
      fetchEpisodePage(req.params.slug),
    )
    const origin = originOf(req)
    const resolved = await resolveVideo(req.params.slug).catch(() => null)

    const payload = {
      ...page,
      embed: absolute(req, `/e/${req.params.slug}`),
      direct_url: resolved?.direct_url || page.embed_src || '',
      video_id: resolved?.video_id || page.video_id || '',
    }
    delete payload.embed_src
    void origin
    res.json(absolutizeDeep(payload, req))
  }),
)

/* ───────────────────────── bridge / relay ───────────────────────── */

app.get(
  '/api/embed/:videoId',
  asyncRoute(async (req, res) => {
    const resolved = await resolveVideo(`v/${req.params.videoId}`)
    const embedUrl = absolute(req, `/e/v/${req.params.videoId}`)
    res.json({
      video_id: resolved.video_id,
      embed_url: embedUrl,
      direct_url: resolved.direct_url,
      iframe_html: `<iframe src="${embedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer" style="width:100%;aspect-ratio:16/9;border:0"></iframe>`,
    })
  }),
)

app.get(
  '/e/:slug',
  asyncRoute(async (req, res) => {
    await bridgePage(req, res, req.params.slug, {
      mode: String(req.query.mode || 'bridge'),
      title: String(req.query.title || 'Donghive Relay'),
    })
  }),
)

app.get(
  '/bridge/dm',
  asyncRoute(async (req, res) => {
    const video = String(req.query.video || '')
    if (!video) {
      res.status(400).type('html').send('<p>parameter video wajib diisi</p>')
      return
    }
    await proxyPlayer(req, res, video)
  }),
)

app.get(
  '/api/proxy',
  asyncRoute(async (req, res) => {
    const target = String(req.query.u || '')
    if (!target) {
      res.status(400).json({ error: 'parameter u wajib diisi' })
      return
    }
    await proxyAsset(req, res, target)
  }),
)

/* ───────────────────────── docs ───────────────────────── */

const spec = buildOpenApi({ origin: process.env.PUBLIC_ORIGIN || 'http://localhost:8080', version: CONFIG.version })
app.get('/openapi.json', (req, res) => {
  res.json(buildOpenApi({ origin: originOf(req), version: CONFIG.version }))
})
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'Donghive Relay API',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list', tryItOutEnabled: true },
  }),
)

/* ───────────────────────── static + SPA ───────────────────────── */

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      setHeaders: (res, filePath) => {
        if (/\.(js|css|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
}

app.get(/^\/(?!api|e|bridge|docs|openapi).*/, (req, res, next) => {
  const indexFile = path.join(PUBLIC_DIR, 'index.html')
  if (!fs.existsSync(indexFile)) {
    next()
    return
  }
  res.sendFile(indexFile)
})

/* ───────────────────────── errors ───────────────────────── */

app.use((err, req, res, _next) => {
  const status = err.status || 500
  if (status >= 500) console.error('[error]', err)
  res.status(status).json({ error: err.message || 'internal error' })
})

const server = app.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`[donghive-relay] listening on http://${CONFIG.host}:${CONFIG.port}`)
})

process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('SIGINT', () => server.close(() => process.exit(0)))
