/**
 * Cache dua lapis: memori (per sesi) + localStorage (tahan reload).
 *
 * Tujuannya sederhana: halaman yang dibuka ulang harus tampil instan, lalu
 * diam-diam menyegarkan data di belakang. Tidak ada spinner penuh hanya
 * karena user menekan tombol back.
 */

const PREFIX = 'dh:cache:v1:'
const MEM = new Map() // key -> { value, expires }
const INFLIGHT = new Map() // key -> Promise

function now() {
  return Date.now()
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function readCache(key) {
  const mem = MEM.get(key)
  if (mem) return { value: mem.value, expires: mem.expires }

  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = safeParse(raw)
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) return null
    MEM.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export function writeCache(key, value, ttl = 5 * 60_000) {
  const entry = { value, expires: now() + ttl }
  MEM.set(key, entry)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // kuota penuh / mode privat: cache memori tetap jalan
  }
  return value
}

export function isFresh(entry) {
  return Boolean(entry && entry.expires > now())
}

export function dropCache(key) {
  MEM.delete(key)
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export function clearCache() {
  MEM.clear()
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

/** Satu request per key — dua komponen yang minta data sama tidak menduplikasi fetch. */
export function fetchOnce(key, factory) {
  if (INFLIGHT.has(key)) return INFLIGHT.get(key)
  const promise = Promise.resolve()
    .then(factory)
    .finally(() => INFLIGHT.delete(key))
  INFLIGHT.set(key, promise)
  return promise
}

/** Panaskan cache tanpa menunggu hasil (dipakai saat hover / idle). */
export function prefetch(key, factory, ttl) {
  const cached = readCache(key)
  if (isFresh(cached)) return
  fetchOnce(key, factory)
    .then((value) => writeCache(key, value, ttl))
    .catch(() => {})
}
