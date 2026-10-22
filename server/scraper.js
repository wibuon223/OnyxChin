import * as cheerio from 'cheerio'
import { CONFIG } from './config.js'
import { fetchHtml } from './fetcher.js'

/**
 * Satu modul, banyak sumber.
 *
 * donghive.vip dan anichin.moe memakai tema WordPress yang sama
 * (`article.bs`, `.listupd`, `.eplister`, `select.mirror` berisi iframe
 * base64), jadi seluruh scraper di bawah cukup diparameterkan oleh base URL.
 */
export function createSource(UP, PROXYED_IMAGE_HOSTS = []) {

/**
 * Cloudflare suka membalas halaman challenge (bukan data) kalau terlalu banyak
 * request beruntun — terutama endpoint pencarian. Deteksi + retry sebentar,
 * supaya "0 hasil" betul-betul berarti kosong, bukan ke-blok.
 */
const CF_MARKERS = [
  /just a moment/i,
  /cf-browser-verification/i,
  /challenge-platform/i,
  /enable javascript and cookies to continue/i,
  /attention required/i,
]

function looksBlocked(html) {
  if (!html) return true
  if (html.length < 1500) return true
  return CF_MARKERS.some((re) => re.test(html))
}

async function getHtml(url, extraHeaders = {}) {
  let last = ''
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const html = await fetchHtml(url, extraHeaders)
      last = html
      if (!looksBlocked(html)) return html
    } catch (err) {
      lastError = err
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  if (last) return last
  throw lastError || new Error('upstream tidak merespons')
}
const text = (node) => (node ? node.text().replace(/\s+/g, ' ').trim() : '')
const abs = (href, base = UP) => {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

/**
 * Poster donghive.vip tidak bisa dimuat cross-origin dari browser:
 * upstream kirim `cross-origin-resource-policy: same-origin` (dan ada
 * Cloudflare challenge), jadi <img> di-block ERR_BLOCKED_BY_RESPONSE.
 * Solusinya: semua thumbnail dilewatkan proxy relay kita sendiri.
 */

function imgSrc(src, base = UP) {
  if (!src) return ''
  const full = abs(src, base)
  try {
    const host = new URL(full).hostname
    if (PROXYED_IMAGE_HOSTS.includes(host)) {
      return `/api/proxy?u=${encodeURIComponent(full)}`
    }
  } catch {
    return full
  }
  return full
}

/** Ambil URL gambar dari sebuah node; dukung lazy-load (data-src). */
function imageOf(node) {
  const img = node.find('img').first()
  if (!img.length) return ''
  const raw =
    img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || img.attr('data-original') || ''
  return imgSrc(raw)
}

/** Card anime dari <article class="bs"> */
function parseArticle($, art, section = '') {
  const a = art.find('a.tip').first()
  if (!a.length || !a.attr('href')) return null

  const h2 = art.find("h2[itemprop='headline']").first()
  const h2b = h2.length ? h2 : art.find('h2').first()
  let title = text(h2b) || a.attr('title') || text(a) || 'Unknown'

  // Nama seri = text node langsung di .tt (h2 di dalamnya tidak ikut)
  let series = ''
  const tt = art.find('.tt').first()
  if (tt.length) {
    const parts = []
    tt.contents().each((_, node) => {
      if (node.type === 'text' && node.data) parts.push(node.data)
    })
    series = parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  const thumb = imageOf(art)

  return {
    title,
    url: abs(a.attr('href')),
    slug: slugify(a.attr('href')),
    section,
    type: text(art.find('div.typez').first()),
    episode: text(art.find('span.epx').first()),
    subtitle: text(art.find('span.sb').first()),
    thumbnail: thumb,
    series,
    rank: '',
    genres: [],
  }
}

function slugify(href) {
  try {
    const p = new URL(href, UP).pathname
    return p.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() || ''
  } catch {
    return String(href).replace(/^\/|\/$/g, '')
  }
}

/** Ambil slug anime dari URL episode → slug anime induk (best effort). */
function animeSlugFromEpisodeSlug(episodeSlug) {
  return String(episodeSlug)
    .replace(/-episode-\d+.*$/, '')
    .replace(/-subtitle-indonesia$/, '')
    .replace(/-\d{3,4}$/, '')
}

/* ─────────────────────────── homepage ─────────────────────────── */

async function fetchHome() {
  const $ = cheerio.load(await getHtml(UP))
  const sections = {}
  const put = (name, cards) => {
    if (cards && cards.length) sections[name] = cards
  }

  // Hero slider
  const hero = []
  $('div.info, .slider .item, .hero .item').each((_, el) => {
    const box = $(el)
    const a = box.find('h2 a[href], h3 a[href], a.series[href]').first()
    if (!a.length) return
    const img = box.find('img').first()
    hero.push({
      title: text(a),
      url: abs(a.attr('href')),
      slug: slugify(a.attr('href')),
      section: 'Hero Slider',
      type: '',
      episode: '',
      subtitle: '',
      thumbnail: imgSrc(img.attr('src')),
      series: '',
      rank: '',
      genres: [],
    })
  })
  put('Hero Slider', dedupe(hero))

  // Popular Today / Latest Release / Recommendation
  const viewAll = []
  $('div.releases').each((_, el) => {
    const holder = $(el)
    const heading = holder.find('h2, h3').first()
    if (!heading.length) return
    const name = text(heading)
    const vl = holder.find('a.vl[href]').first()
    if (vl.length) viewAll.push({ section: name, url: abs(vl.attr('href')) })

    const cards = []
    let sib = holder.next()
    for (let i = 0; i < 6 && sib.length; i += 1) {
      const tag = sib.get(0)?.tagName?.toLowerCase()
      if (tag === 'h2' || tag === 'h3' || tag === 'h4') break
      sib.find('article.bs').each((__, art) => {
        const c = parseArticle($, $(art), name)
        if (c) cards.push(c)
      })
      if (cards.length) break
      sib = sib.next()
    }
    put(name, dedupe(cards))
  })
  if (viewAll.length) sections._view_all_urls = viewAll

  // Donghua Baru
  const ongoing = []
  $('div.ongoingseries li > a[href]').each((_, el) => {
    const a = $(el)
    ongoing.push({
      title: text(a.find('span.l').first()).replace(/›/g, '').trim(),
      url: abs(a.attr('href')),
      slug: slugify(a.attr('href')),
      section: 'Donghua Baru',
      type: '',
      episode: text(a.find('span.r').first()),
      subtitle: '',
      thumbnail: '',
      series: '',
      rank: '',
      genres: [],
    })
  })
  put('Donghua Baru', dedupe(ongoing))

  // Donghua Populer (weekly / monthly / alltime) — client-side render, sudah di HTML
  for (const [cls, label] of [
    ['wpop-weekly', 'Donghua Populer (Weekly)'],
    ['wpop-monthly', 'Donghua Populer (Monthly)'],
    ['wpop-alltime', 'Donghua Populer (All Time)'],
  ]) {
    const cont = $(`.${cls}`)
    if (!cont.length) continue
    const cards = []
    cont.find('li').each((_, el) => {
      const li = $(el)
      const a =
        li.find('.leftseries h4 a.series').first().length
          ? li.find('.leftseries h4 a.series').first()
          : li.find('.imgseries a.series').first()
      if (!a.length) return
      const img = li.find('.imgseries img').first()
      const genres = []
      li.find(".leftseries a[rel='tag'], .leftseries a[href*='/genres/']").each((__, g) => {
        genres.push(text($(g)))
      })
      cards.push({
        title: text(a) || a.attr('title') || '',
        url: abs(a.attr('href')),
        slug: slugify(a.attr('href')),
        section: label,
        type: '',
        episode: '',
        subtitle: '',
        thumbnail: imgSrc(img.attr('src')),
        series: '',
        rank: text(li.find('.ctr').first()),
        genres,
      })
    })
    put(label, dedupe(cards))
  }

  // Genre list
  const genres = []
  $('ul.genre li a[href*="/genres/"]').each((_, el) => {
    const a = $(el)
    genres.push({
      title: text(a),
      url: abs(a.attr('href')),
      slug: slugify(a.attr('href')),
      section: 'Genre',
      type: '',
      episode: '',
      subtitle: '',
      thumbnail: '',
      series: '',
      rank: '',
      genres: [],
    })
  })
  put('Genre', dedupe(genres))

  // Latest Blog
  const blog = []
  $('div.bloglist article, div.bloglist a.tip').each((_, el) => {
    const node = $(el)
    const a = node.is('a') ? node : node.find('a.tip, h2 a[href], h3 a[href]').first()
    if (!a.length || !a.attr('href')) return
    const img = node.find('img').first()
    blog.push({
      title: text(a) || a.attr('title') || '',
      url: abs(a.attr('href')),
      slug: slugify(a.attr('href')),
      section: 'Latest Blog',
      type: '',
      episode: '',
      subtitle: '',
      thumbnail: imgSrc(img.attr('src')),
      series: '',
      rank: '',
      genres: [],
    })
  })
  put('Latest Blog', dedupe(blog))

  const flat = Object.entries(sections)
    .filter(([k]) => !k.startsWith('_'))
    .flatMap(([, v]) => v)

  return { sections, flat }
}

/* ─────────────────────────── listing ─────────────────────────── */

/**
 * Paging donghive: arsip `/anime/` TIDAK memakai `/page/N/` — ia memakai
 * `?page=N`. Buktinya: `/anime/page/2/` mengembalikan 20 judul yang sama
 * dengan halaman 1, sedangkan `/anime/?page=2` mengembalikan judul berbeda.
 * Genre juga ikut `?page=N` (dan punya markup pagination 1..14).
 */
function listingUrl(base, page) {
  const u = new URL(base)
  if (page <= 1) return base
  // Genre memakai /page/N/; arsip /anime/ dan ?s= memakai ?page=N.
  if (/\/genres\//.test(u.pathname)) {
    u.pathname = `${u.pathname.replace(/\/$/, '')}/page/${page}/`
    return u.toString()
  }
  u.searchParams.set('page', String(page))
  return u.toString()
}

/** Angka halaman terbesar dari markup pagination (0 kalau tidak ada). */
function lastPageNumber($) {
  let max = 0
  $('a.page-numbers, span.page-numbers, .pagination .page-numbers').each((_, el) => {
    const n = Number(text($(el)).replace(/[^\d]/g, ''))
    if (Number.isFinite(n) && n > max) max = n
  })
  return max
}

async function fetchListing(baseUrl, { page = 1, maxPages = 1, section = 'Listing' } = {}) {
  const items = []
  let totalPages = Math.max(1, page)
  let blocked = false
  let pageSize = 0

  for (let p = page; p < page + Math.max(1, maxPages); p += 1) {
    const target = listingUrl(baseUrl, p)
    const html = await getHtml(target)
    const $ = cheerio.load(html)
    blocked = looksBlocked(html) && !$('article.bs').length && !$('.listupd').length

    const cards = []
    $('article.bs').each((_, art) => {
      const c = parseArticle($, $(art), `${section} (p${p})`)
      if (c) cards.push(c)
    })

    // Kalau tidak ada <article class="bs">, jangan pernah jatuh ke sidebar:
    // halaman "Not Found" punya puluhan link sidebar tanpa poster.
    if (!cards.length) {
      const scope = $('.listupd').first()
      const anchors = scope.find('a.tip[href], .bsx > a[href]')
      if (!scope.length || !anchors.length) break
      anchors.each((_, el) => {
        const a = $(el)
        const card = a.closest('article.bs, .bsx')
        cards.push({
          title: text(a) || a.attr('title') || '',
          url: abs(a.attr('href')),
          slug: slugify(a.attr('href')),
          section: `${section} (p${p})`,
          type: text(card.find('div.typez').first()),
          episode: text(card.find('span.epx').first()),
          subtitle: text(card.find('span.sb').first()),
          thumbnail: imageOf(card.length ? card : a),
          series: '',
          rank: '',
          genres: [],
        })
      })
    }

    if (!cards.length) break
    items.push(...cards)
    pageSize = cards.length
    totalPages = Math.max(totalPages, p, lastPageNumber($))
  }

  return { page, total_pages: totalPages, items: dedupe(items), blocked, page_size: pageSize }
}

const fetchViewAll = (opts) =>
  fetchListing(`${UP}/anime/?status=&type=&order=update`, { section: 'View All', ...opts })

const fetchGenrePage = (slug, opts) =>
  fetchListing(`${UP}/genres/${String(slug).replace(/^\/+|\/+$/g, '')}/`, {
    section: `Genre/${slug}`,
    ...opts,
  })

/**
 * Pencarian situs (`?s=`) itu exact-ish: typo satu huruf langsung "Not Found".
 * Kalau kosong, coba potong 1–3 huruf dari belakang ("regenade" → "renegad")
 * dan tandai `suggestion` supaya UI bisa bilang "nggak ada hasil persis,
 * ini yang mirip".
 */
async function fetchSearch(query, opts = {}) {
  const q = String(query || '').trim()
  const section = `Search/${q}`
  const direct = await fetchListing(`${UP}/?s=${encodeURIComponent(q)}`, { section, ...opts })
  if (direct.items.length || q.length < 6) {
    return { ...direct, suggestion: '', suggestions: direct.items.length ? [] : await suggestionsFor(q) }
  }

  // Challenge Cloudflare bukan berarti "tidak ada hasil".
  if (direct.blocked) {
    const err = new Error('Pencarian ditolak upstream (Cloudflare). Coba lagi sebentar.')
    err.status = 503
    throw err
  }

  // Pencarian situs strict substring; typo tidak akan ketemu walau diulang.
  // Jadi jangan buang waktu retry — langsung tawarkan judul yang mirip.
  return { ...direct, suggestion: '', suggestions: await suggestionsFor(q) }
}


/* ── saran judul saat pencarian kosong ─────────────────────────────
 * Pencarian situs itu substring strict: "regenade" (huruf tertukar) = 0 hasil.
 * Daripada menyerah, cocokkan query dengan judul populer pakai trigram.
 */
let homeFlatCache = { at: 0, items: [] }

async function popularTitles() {
  if (Date.now() - homeFlatCache.at < 5 * 60_000 && homeFlatCache.items.length) {
    return homeFlatCache.items
  }
  try {
    const home = await fetchHome()
    // Hanya serial, bukan episode: slug episode punya halaman detail kosong.
    const items = (home.flat || []).filter(
      (it) => it.slug && it.title && !/-episode-\d+/i.test(it.slug),
    )
    homeFlatCache = { at: Date.now(), items }
    return items
  } catch {
    return homeFlatCache.items
  }
}

function trigrams(value) {
  const s = ` ${String(value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()} `
  const out = new Set()
  for (let i = 0; i < s.length - 2; i += 1) out.add(s.slice(i, i + 3))
  return out
}

function similarity(a, b) {
  const A = trigrams(a)
  const B = trigrams(b)
  if (!A.size || !B.size) return 0
  let shared = 0
  for (const g of A) if (B.has(g)) shared += 1
  return shared / (A.size + B.size - shared)
}

async function suggestionsFor(query, limit = 6) {
  const pool = await popularTitles()
  const bySlug = new Map()

  for (const item of pool) {
    if (!item.slug) continue
    const score = similarity(query, item.title)
    if (score < 0.1) continue
    const prev = bySlug.get(item.slug)
    // Satu judul bisa muncul dari beberapa section; simpan yang punya poster.
    if (!prev || (!prev.thumbnail && item.thumbnail) || item.score > prev.score) {
      bySlug.set(item.slug, { ...item, score })
    }
  }

  return [...bySlug.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, section, rank, genres, ...rest }) => rest)
}
async function fetchGenres() {
  const $ = cheerio.load(await getHtml(UP))
  const genres = []
  $('ul.genre li a[href*="/genres/"]').each((_, el) => {
    const a = $(el)
    genres.push({ name: text(a), slug: slugify(a.attr('href')), url: abs(a.attr('href')) })
  })
  return { genres }
}

/* ─────────────────────────── detail anime ─────────────────────────── */

function parseSpe($) {
  const out = {}
  $('.info-content .spe span, .spe span').each((_, el) => {
    const span = $(el)
    const b = span.find('b').first()
    if (!b.length) return
    const label = text(b).replace(/:\s*$/, '').trim()
    let value = text(span)
    if (label && value.toLowerCase().startsWith(`${label.toLowerCase()}:`)) {
      value = value.slice(label.length + 1).trim()
    }
    if (label) out[label] = value
  })
  return out
}

async function fetchAnimeDetail(slug) {
  const url = `${UP}/${String(slug).replace(/^\/+|\/+$/g, '')}/`
  const $ = cheerio.load(await getHtml(url))

  const title = text($('h1.entry-title, h1[itemprop="headline"], h1').first())
  const spe = parseSpe($)

  const genres = []
  $('.genxed a, a[href*="/genres/"]').each((_, el) => {
    const g = text($(el))
    if (g && g.toLowerCase() !== title.toLowerCase()) genres.push(g)
  })

  const description = text($('.mindesc, .synopsis, .anime-description, .description').first())

  const img = $('img.ts-post-image, img.wp-post-image, .anime-poster img, img').first()
  const thumbnail = imgSrc(img.attr('src'), url)

  const episodes = []
  $('.eplister li').each((_, el) => {
    const li = $(el)
    const a = li.find('a[href]').first()
    if (!a.length) return
    const epUrl = abs(a.attr('href'), url)
    const epSlug = slugify(a.attr('href'))
    episodes.push({
      number: text(li.find('.epl-num').first()) || '?',
      title: text(li.find('.epl-title').first()) || a.attr('title') || 'Episode',
      url: epUrl,
      slug: epSlug,
      release_date: text(li.find('.epl-date').first()),
      subtitle: text(li.find('.epl-sub .status').first()) || text(li.find('.epl-sub').first()),
      embed: `/e/${epSlug}`,
    })
  })

  return {
    title,
    url,
    slug: String(slug),
    type: spe.Type || '',
    status: spe.Status || '',
    network: text($('a[href*="/network/"]').first()),
    released: spe.Released || '',
    updated: spe['Updated on'] || spe['Released on'] || '',
    reported_episodes: spe.Episodes || '',
    genres: [...new Set(genres)],
    description,
    thumbnail,
    total_episodes: episodes.length,
    episodes,
  }
}

/* ─────────────────────────── halaman episode ─────────────────────────── */

/**
 * Server alternatif per episode.
 *
 * Halaman episode menyimpan daftar mirror di `<select class="mirror">`,
 * tiap `<option value>` berisi HTML <iframe> yang di-base64. Kita decode,
 * ambil src-nya, lalu klasifikasikan per host supaya UI bisa menyusun
 * pemilih server (dan tahu mana yang benar-benar bisa diputar).
 *
 * Catatan lapangan: player Dailymotion milik donghive (geo.dailymotion.com/
 * player/<id>.html) DIKUNCI ke domain donghive.vip — dari origin lain
 * hasilnya "This video cannot be played on this site". Relay memalsukan
 * embedder lewat shim di /bridge/dm (lihat ORIGIN_SHIM), jadi DM sekarang
 * bisa dicoba; tetap ditaruh paling bawah karena paling rapuh.
 */
const KIND_META = {
  okru: { label: 'OKRU', rank: 0, playable: true, note: '' },
  odysee: { label: 'Odysee', rank: 1, playable: true, note: '' },
  // DTube jalan (player otomatis fallback nas2 -> nas1). CATATAN: jangan
  // disimpulkan mati dari curl ke nas2 saja — nas2 balas 404, nas1 normal.
  dtube: { label: 'DTube', rank: 2, playable: true, note: '' },
  // mega.nz/embed itu file viewer (perlu klik putar/unduh), bukan player
  // streaming — masih jalan, tapi di bawah provider yang benar-benar play.
  mega: { label: 'MEGA', rank: 3, playable: true, note: 'file viewer (klik untuk putar)' },
  nunadrama: { label: 'Nunadrama', rank: 2, playable: true, note: '' },
  rumble: { label: 'Rumble', rank: 4, playable: true, note: '' },
  turbovid: { label: 'TurboVID', rank: 4, playable: true, note: '' },
  shorticu: { label: 'Short.icu', rank: 5, playable: true, note: '' },
  minochinos: { label: 'Minochinos', rank: 5, playable: true, note: '' },
  other: { label: 'Server lain', rank: 6, playable: true, note: '' },
  // Video donghive di Dailymotion bertanda `private: true`, dan player-nya
  // hanya mau jalan kalau embedder-nya donghive.vip.
  // Karena butuh proxy media + cookie, DM ditaruh paling akhir: paling gampang
  // patah kalau Dailymotion mengubah pengecekannya.
  dailymotion: {
    label: 'Dailymotion',
    rank: 9,
    playable: true,
    // `experimental`: boleh dicoba (embedder dipalsukan), tapi jangan pernah
    // jadi pilihan default — playback-nya paling rapuh dari semua mirror.
    experimental: true,
    note: 'embedder dipalsukan jadi donghive.vip — kalau DM ubah cek, bisa gagal',
  },
}

function providerKind(url) {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'other'
  }
  if (host.includes('dailymotion')) return 'dailymotion'
  if (host.includes('d.tube')) return 'dtube'
  if (host.includes('odysee')) return 'odysee'
  if (host.includes('mega.nz') || host.includes('mega.co.nz')) return 'mega'
  if (host.includes('ok.ru') || host.includes('morencius') || host.includes('okru')) return 'okru'
  if (host.includes('rumble')) return 'rumble'
  if (host.includes('turbovid')) return 'turbovid'
  if (host.includes('short.icu')) return 'shorticu'
  if (host.includes('minochinos')) return 'minochinos'
  if (host.includes('nunadrama')) return 'nunadrama'
  return 'other'
}

/**
 * Provider yang sudah dipastikan tidak bisa diputar dari relay dan sengaja
 * TIDAK ditampilkan. Dailymotion: video private + player dikunci ke domain
 * donghive.vip; dari origin lain selalu "This video cannot be played on this
 * site" (lihat tools/origin-spoof kalau suatu saat mau dipakai lagi).
 */
const HIDDEN_KINDS = new Set(['dailymotion'])

/**
 * Decode semua mirror server dari <select class="mirror">.
 *
 * Dailymotion disembunyikan (lihat HIDDEN_KINDS), TAPI kalau sebuah episode
 * cuma punya DM — dan itu terjadi di ~23% episode — DM dikembalikan sebagai
 * jaring penyelamat supaya halamannya tidak kosong melompong. UI menandainya
 * `fallback: true` + catatan jujur.
 */
function parseServers($) {
  const all = []
  const seen = new Set()

  $('select.mirror option').each((_, el) => {
    const raw = ($(el).attr('value') || '').trim()
    if (!raw) return
    let decoded = ''
    try {
      decoded = Buffer.from(raw, 'base64').toString('utf8')
    } catch {
      return
    }
    const m = decoded.match(/src=["']([^"']+)["']/i)
    if (!m) return
    const url = abs(m[1].replace(/&amp;/g, '&'), UP)
    // <select> memuat mirror kembar: URL sama persis, atau provider sama
    // lewat host berbeda (anichin sering punya 3 OKRU). Simpan satu per kind.
    if (seen.has(url)) return
    seen.add(url)
    const kind = providerKind(url)
    if (all.some((s) => s.kind === kind)) return
    const meta = KIND_META[kind] || KIND_META.other
    // Label upstream sering salah platform (mis. "Odysee" padahal mega.nz),
    // jadi untuk kind yang dikenal pakai label kanonik kita.
    all.push({
      name: kind === 'other' ? text($(el)) || meta.label : meta.label,
      kind,
      url,
      playable: meta.playable,
      note: meta.note,
      experimental: meta.experimental === true,
      rank: meta.rank,
    })
  })

  const sort = (list) => list.sort((a, b) => a.rank - b.rank).map(({ rank, ...rest }) => rest)
  const visible = all.filter((s) => !HIDDEN_KINDS.has(s.kind))
  if (visible.length) return sort(visible)

  return sort(
    all
      .filter((s) => HIDDEN_KINDS.has(s.kind))
      .map((s) => ({
        ...s,
        name: `${s.name} (fallback)`,
        fallback: true,
        note: 'satu-satunya mirror untuk episode ini — player dikunci domain donghive.vip, kemungkinan gagal',
      })),
  )
}

async function fetchEpisodePage(slug) {
  const url = `${UP}/${String(slug).replace(/^\/+|\/+$/g, '')}/`
  const $ = cheerio.load(await getHtml(url))

  const iframe = $('.player-embed iframe, iframe').first()
  const embedSrc = iframe.attr('src') || iframe.attr('data-src') || ''

  const bc = $('.ts-breadcrumb')
  const links = bc.find('a[href]')
  let animeTitle = ''
  let animeUrl = ''
  if (links.length >= 2) {
    const a = links.eq(links.length - 2)
    animeTitle = text(a)
    animeUrl = abs(a.attr('href'), url)
  }

  const downloads = []
  $('a[href]').each((_, el) => {
    const a = $(el)
    const href = a.attr('href') || ''
    if (/\.(mp4|m3u8|zip|rar|7z)(\?|$)/i.test(href) || /download/i.test(href)) {
      downloads.push({ label: text(a) || href, url: abs(href, url) })
    }
  })

  const servers = parseServers($)
  const dm = servers.find((s) => s.kind === 'dailymotion')
  const primary = servers.find((s) => s.playable) || servers[0] || null

  return {
    title: text($('h1').first()),
    url,
    slug: String(slug),
    anime_title: animeTitle,
    anime_url: animeUrl,
    anime_slug: animeUrl ? slugify(animeUrl) : animeSlugFromEpisodeSlug(slug),
    embed_src: dm?.url || embedSrc,
    video_id: extractVideoId(dm?.url || embedSrc),
    servers,
    default_server: primary?.kind || '',
    downloads,
    description: text($('.bixbox.infx, .bixbox.information').first()),
  }
}

function extractVideoId(src) {
  if (!src) return ''
  const m = String(src).match(/[?&]video=([a-zA-Z0-9]+)/)
  return m ? m[1] : ''
}

/* ─────────────────────────── util ─────────────────────────── */

function dedupe(items) {
  const seen = new Set()
  const out = []
  for (const it of items) {
    const key = it.url || it.slug
    if (!seen.has(key)) {
      seen.add(key)
      out.push(it)
    }
  }
  return out
}

  return {
    base: UP,
    fetchHome,
    fetchListing,
    fetchViewAll,
    fetchGenrePage,
    fetchSearch,
    fetchGenres,
    fetchAnimeDetail,
    fetchEpisodePage,
    parseServers,
    extractVideoId,
    slugify,
    animeSlugFromEpisodeSlug,
    dedupe,
  }
}

/** Sumber yang didukung. Tambah entry baru = satu baris. */
export const SOURCES = {
  donghive: { base: 'https://donghive.vip', imageHosts: ['donghive.vip', 'www.donghive.vip'] },
  anichin: { base: 'https://anichin.moe', imageHosts: ['anichin.moe', 'www.anichin.moe'] },
}

const instances = new Map()

/** Ambil instance scraper untuk sebuah sumber (default donghive). */
export function source(name = 'donghive') {
  const key = SOURCES[name] ? name : 'donghive'
  if (!instances.has(key)) {
    instances.set(key, createSource(SOURCES[key].base, SOURCES[key].imageHosts))
  }
  return instances.get(key)
}
