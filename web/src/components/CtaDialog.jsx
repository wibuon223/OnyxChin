import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Clock3, Loader2, Search, Shuffle, Sparkles } from 'lucide-react'
import { fetchHome, fetchSearch } from '../api'
import useCachedAsync from '../hooks/useCachedAsync'
import useHistory from '../hooks/useHistory'
import { navigate } from '../hooks/useRoute'
import { KEY, TTL } from '../lib/keys'
import Modal from './Modal'

function go(path, onClose) {
  onClose?.()
  navigate(path)
}

export default function CtaDialog({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const history = useHistory()

  const home = useCachedAsync(KEY.home, fetchHome, { ttl: TTL.home, enabled: open })
  const pool = useMemo(() => {
    const flat = home.data?.flat
    return Array.isArray(flat) ? flat.filter((it) => it.slug) : []
  }, [home.data])

  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [open])

  // debounce pencarian — 280ms, minimal 2 huruf
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setSearching(false)
      setError(null)
      return undefined
    }
    let alive = true
    setSearching(true)
    const timer = window.setTimeout(() => {
      fetchSearch(term, 1)
        .then((data) => {
          if (!alive) return
          setResults((data?.items || []).slice(0, 6))
          setError(null)
        })
        .catch((err) => {
          if (alive) setError(err instanceof Error ? err : new Error('Pencarian gagal'))
        })
        .finally(() => {
          if (alive) setSearching(false)
        })
    }, 280)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query])

  const submit = (event) => {
    event.preventDefault()
    const term = query.trim()
    if (term) go(`/search?q=${encodeURIComponent(term)}`, onClose)
  }

  const surprise = () => {
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    go(`/anime/${pick.slug}`, onClose)
  }

  const recent = history.items.slice(0, 3)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mau nonton apa?"
      description="Cari judul, lanjutkan yang tadi, atau serahkan ke keberuntungan."
    >
      <form onSubmit={submit} className="relative">
        <Search
          size={16}
          strokeWidth={2.2}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari judul… (mis. Jade Dynasty)"
          className="field pl-11 pr-11"
          aria-label="Cari judul"
        />
        {searching ? (
          <Loader2
            size={15}
            strokeWidth={2.4}
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-accent"
            aria-hidden="true"
          />
        ) : null}
      </form>

      {query.trim().length >= 2 ? (
        <div className="mt-3 space-y-1.5">
          {error ? <p className="px-1 text-[12px] text-ember">{error.message}</p> : null}
          {!searching && !error && !results.length ? (
            <p className="px-1 text-[12px] text-slate-500">Nggak ada hasil untuk “{query.trim()}”.</p>
          ) : null}
          {results.map((item) => {
            const slug = item.slug || ''
            return (
              <button
                key={slug || item.title}
                type="button"
                onClick={() => go(`/anime/${slug}`, onClose)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
              >
                <span className="line-clamp-1 flex-1 text-[13px] font-semibold text-slate-200 group-hover:text-white">
                  {item.title || slug}
                </span>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {item.type || item.episode || ''}
                </span>
                <ArrowRight
                  size={14}
                  strokeWidth={2.2}
                  className="shrink-0 text-slate-600 transition group-hover:text-accent"
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      ) : null}

      {recent.length ? (
        <div className="mt-5">
          <p className="label flex items-center gap-1.5">
            <Clock3 size={12} strokeWidth={2.2} aria-hidden="true" />
            Lanjut nonton
          </p>
          <div className="mt-2 space-y-1.5">
            {recent.map((item) => (
              <button
                key={item.animeSlug}
                type="button"
                onClick={() => go(`/watch/${item.episodeSlug}`, onClose)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 block text-[13px] font-semibold text-slate-200 group-hover:text-white">
                    {item.animeTitle || item.animeSlug}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Episode {item.episodeNumber || '—'}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-accent/12 px-3 py-1 text-[11px] font-semibold text-accent">
                  Lanjut
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={surprise} className="btn-ghost" disabled={!pool.length}>
          <Shuffle size={14} strokeWidth={2.2} aria-hidden="true" />
          Acak judul
        </button>
        <button
          type="button"
          onClick={() => go('/history', onClose)}
          className="btn-ghost"
          disabled={!history.items.length}
        >
          <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
          Semua riwayat
        </button>
        <span className="ml-auto hidden text-[11px] text-slate-500 sm:block">
          Enter untuk cari · Esc untuk tutup
        </span>
      </div>
    </Modal>
  )
}
