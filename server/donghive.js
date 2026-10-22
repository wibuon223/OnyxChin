import * as cheerio from 'cheerio'
import { CONFIG } from './config.js'

const UP = CONFIG.upstream

async function getHtml(url, extraHeaders = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs)
  try {
    const res = await fetch(url, {
      headers: { ...CONFIG.upstreamHeaders, ...extraHeaders },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

const text = (node) => (node ? node.text().replace(/\s+/g, ' ').trim() : '')
const abs = (href, base = UP) => {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
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

  const img = art.find('img.ts-post-image, img.wp-post-image, img').first()
  const thumb = img.attr('src') ? abs(img.attr('src')) : ''

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

export function slugify(href) {
  try {
    const p = new URL(href, UP).pathname
    return p.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() || ''
  } catch {
    return String(href).replace(/^\/|\/$/g, '')
  }
}

/** Ambil slug anime dari URL episode → slug anime induk (best effort). */
export function animeSlugFromEpisodeSlug(episodeSlug) {
  return String(episodeSlug)
    .replace(/-episode-\d+.*$/, '')
    .replace(/-subtitle-indonesia$/, '')
    .replace(/-\d{3,4}$/, '')
}

/* ─────────────────────────── homepage ─────────────────────────── */

export async function fetchHome() {
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
      thumbnail: img.attr('src') ? abs(img.attr('src')) : '',
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
        thumbnail: img.attr('src') ? abs(img.attr('src')) : '',
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
      thumbnail: img.attr('src') ? abs(img.attr('src')) : '',
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

function listingUrl(base, page) {
  if (page <= 1) return base
  const u = new URL(base)
  if (u.search) {
    u.searchParams.set('page', String(page))
    return u.toString()
  }
  u.pathname = `${u.pathname.replace(/\/$/, '')}/page/${page}/`
  return u.toString()
}

async function nextPageHref($, current) {
  const a = $('.pagination a.next.page-numbers, a.next, a[rel="next"]').first()
  if (a.length && a.attr('href')) return abs(a.attr('href'))
  return null
}

export async function fetchListing(baseUrl, { page = 1, maxPages = 1, section = 'Listing' } = {}) {
  const items = []
  let current = baseUrl
  let totalPages = 1

  for (let p = 1; p <= maxPages; p += 1) {
    const target = p === 1 ? current : current
    const html = await getHtml(target)
    const $ = cheerio.load(html)

    const cards = []
    $('article.bs').each((_, art) => {
      const c = parseArticle($, $(art), `${section} (p${p})`)
      if (c) cards.push(c)
    })

    if (!cards.length) {
      $('h2 a[href], h3 a[href], .serieslist h4 a[href]').each((_, el) => {
        const a = $(el)
        cards.push({
          title: text(a) || a.attr('title') || '',
          url: abs(a.attr('href')),
          slug: slugify(a.attr('href')),
          section: `${section} (p${p})`,
          type: '',
          episode: '',
          subtitle: '',
          thumbnail: '',
          series: '',
          rank: '',
          genres: [],
        })
      })
    }

    if (!cards.length) break
    items.push(...cards)

    const next = await nextPageHref($, target)
    if (next) {
      current = next
      totalPages = Math.max(totalPages, p + 1)
    } else {
      const m = text($('body')).match(/Page\s+\d+\s+of\s+(\d+)/i)
      totalPages = Math.max(totalPages, m ? Number(m[1]) : p)
      current = listingUrl(baseUrl, p + 1)
    }
  }

  return { page, total_pages: totalPages, items: dedupe(items) }
}

export const fetchViewAll = (opts) =>
  fetchListing(`${UP}/anime/?status=&type=&order=update`, { section: 'View All', ...opts })

export const fetchGenrePage = (slug, opts) =>
  fetchListing(`${UP}/genres/${String(slug).replace(/^\/+|\/+$/g, '')}/`, {
    section: `Genre/${slug}`,
    ...opts,
  })

export const fetchSearch = (query, opts) =>
  fetchListing(`${UP}/?s=${encodeURIComponent(query)}`, { section: `Search/${query}`, ...opts })

export async function fetchGenres() {
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

export async function fetchAnimeDetail(slug) {
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
  const thumbnail = img.attr('src') ? abs(img.attr('src'), url) : ''

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

export async function fetchEpisodePage(slug) {
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

  return {
    title: text($('h1').first()),
    url,
    slug: String(slug),
    anime_title: animeTitle,
    anime_url: animeUrl,
    anime_slug: animeUrl ? slugify(animeUrl) : animeSlugFromEpisodeSlug(slug),
    embed_src: embedSrc,
    video_id: extractVideoId(embedSrc),
    downloads,
    description: text($('.bixbox.infx, .bixbox.information').first()),
  }
}

export function extractVideoId(src) {
  if (!src) return ''
  const m = String(src).match(/[?&]video=([a-zA-Z0-9]+)/)
  return m ? m[1] : ''
}

/* ─────────────────────────── util ─────────────────────────── */

export function dedupe(items) {
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
