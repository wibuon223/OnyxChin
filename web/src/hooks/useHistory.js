import { useCallback, useEffect, useState } from 'react'

/**
 * Riwayat tontonan — murni localStorage, per browser, tanpa server.
 * Satu entri per anime (yang terbaru menang), plus daftar episode yang sudah
 * dibuka supaya bisa ditandai "sudah ditonton" di daftar episode.
 */

const KEY = 'dh:history:v1'
const EVENT = 'dh:history'
const MAX_ITEMS = 80
const MAX_WATCHED = 400

function empty() {
  return { items: [], watched: {} }
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return empty()
  const items = Array.isArray(raw.items) ? raw.items.filter((it) => it && it.episodeSlug) : []
  const watched = raw.watched && typeof raw.watched === 'object' ? raw.watched : {}
  return { items, watched }
}

export function readHistory() {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY) || 'null'))
  } catch {
    return empty()
  }
}

function commit(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* kuota penuh: abaikan, UI tetap jalan dari state memori */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
  return next
}

/** Catat bahwa sebuah episode dibuka. */
export function recordEpisode(entry) {
  if (!entry || !entry.episodeSlug || !entry.animeSlug) return readHistory()
  const current = readHistory()
  const item = {
    animeSlug: entry.animeSlug,
    animeTitle: entry.animeTitle || '',
    thumbnail: entry.thumbnail || '',
    episodeSlug: entry.episodeSlug,
    episodeNumber: entry.episodeNumber || '',
    episodeTitle: entry.episodeTitle || '',
    updatedAt: Date.now(),
  }
  const items = [item, ...current.items.filter((it) => it.animeSlug !== entry.animeSlug)].slice(
    0,
    MAX_ITEMS,
  )
  return commit({ ...current, items })
}

export function markWatched(animeSlug, episodeSlug) {
  if (!animeSlug || !episodeSlug) return readHistory()
  const current = readHistory()
  const list = current.watched[animeSlug] || []
  if (list.includes(episodeSlug)) return current
  const watched = {
    ...current.watched,
    [animeSlug]: [episodeSlug, ...list].slice(0, MAX_WATCHED),
  }
  return commit({ ...current, watched })
}

export function removeHistory(animeSlug) {
  const current = readHistory()
  return commit({ ...current, items: current.items.filter((it) => it.animeSlug !== animeSlug) })
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

export function lastEpisodeFor(animeSlug) {
  if (!animeSlug) return null
  return readHistory().items.find((it) => it.animeSlug === animeSlug) || null
}

export default function useHistory() {
  const [state, setState] = useState(() => (typeof window === 'undefined' ? empty() : readHistory()))

  useEffect(() => {
    const sync = () => setState(readHistory())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === KEY) sync()
    })
    return () => {
      window.removeEventListener(EVENT, sync)
    }
  }, [])

  const isWatched = useCallback(
    (animeSlug, episodeSlug) => Boolean(state.watched?.[animeSlug]?.includes(episodeSlug)),
    [state],
  )

  return {
    items: state.items,
    watched: state.watched,
    lastFor: useCallback((slug) => state.items.find((it) => it.animeSlug === slug) || null, [state]),
    isWatched,
    record: recordEpisode,
    markWatched,
    remove: removeHistory,
    clear: clearHistory,
  }
}

/** "3 jam lalu" — dipakai rail riwayat. */
export function relativeTime(timestamp) {
  const ts = Number(timestamp || 0)
  if (!ts) return ''
  const diff = Date.now() - ts
  if (!Number.isFinite(diff) || diff < 0) return 'baru saja'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}
