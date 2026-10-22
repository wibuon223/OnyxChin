const BASE = '/api'
const TIMEOUT_MS = 20000

function buildQuery(params) {
  const usp = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    usp.set(key, String(value))
  })
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

async function readError(res) {
  try {
    const body = await res.json()
    const message =
      (body && (body.message || body.error || body.detail)) ||
      (body && body.errors && body.errors[0]) ||
      ''
    if (typeof message === 'string' && message.trim()) return message.trim()
  } catch {
    // body bukan JSON, pakai status fallback
  }
  return `HTTP ${res.status} ${res.statusText || 'Error'}`
}

async function getJSON(path, params) {
  const url = `${BASE}${path}${buildQuery(params)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    if (!res.ok) {
      throw new Error(await readError(res))
    }
    return await res.json()
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Permintaan timed out. Coba lagi sebentar.')
    }
    if (err instanceof TypeError) {
      throw new Error('Gagal terhubung ke server. Periksa koneksi Anda.')
    }
    throw err instanceof Error ? err : new Error('Terjadi kesalahan tidak diketahui.')
  } finally {
    clearTimeout(timer)
  }
}

export function fetchHealth() {
  return getJSON('/health')
}

export function fetchHome() {
  return getJSON('/home')
}

export function fetchAnimePage(page = 1) {
  return getJSON('/anime', { page })
}

export function fetchAnime(slug) {
  return getJSON(`/anime/${encodeURIComponent(slug)}`)
}

export function fetchEpisode(slug) {
  return getJSON(`/episode/${encodeURIComponent(slug)}`)
}

export function fetchSearch(q, page = 1) {
  return getJSON('/search', { q, page })
}

export function fetchGenres() {
  return getJSON('/genres')
}
