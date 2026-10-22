import { clearCache } from './cache'

/**
 * Sumber katalog aktif. Dua situs memakai tema yang sama, jadi scraper-nya
 * identik — yang beda cuma base URL + daftar provider di halaman episode.
 */
export const SOURCES = [
  { id: 'donghive', label: 'Donghive', hint: 'lengkap, DM kadang dikunci' },
  { id: 'anichin', label: 'Anichin', hint: 'banyak mirror per episode' },
]

const KEY = 'dh:source'
export const DEFAULT_SOURCE = 'donghive'

export function getSource() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw && SOURCES.some((s) => s.id === raw)) return raw
  } catch {
    /* mode privat */
  }
  return DEFAULT_SOURCE
}

export function setSource(id) {
  if (!SOURCES.some((s) => s.id === id)) return
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* abaikan */
  }
  // Data lama berasal dari sumber lain — buang supaya tidak ketukar.
  clearCache()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dh:source'))
    window.location.reload()
  }
}

export function sourceLabel(id = getSource()) {
  return SOURCES.find((s) => s.id === id)?.label || id
}
