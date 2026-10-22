import { useCallback, useEffect, useMemo } from 'react'
import { ArrowLeft, Check, Download, Keyboard, Server, Sparkles } from 'lucide-react'
import { fetchAnime, fetchEpisode } from '../api'
import EpisodeList from '../components/EpisodeList'
import EpisodeNav from '../components/EpisodeNav'
import ErrorState from '../components/ErrorState'
import Player from '../components/Player'
import useHistory, { markWatched, recordEpisode } from '../hooks/useHistory'
import useCachedAsync from '../hooks/useCachedAsync'

import { navigate } from '../hooks/useRoute'
import { KEY, TTL } from '../lib/keys'
import { toast } from '../lib/toast'
import { cardSlug, slugFromUrl, stripHtml } from '../utils'

function episodeNumber(episode, fallbackIndex = 0) {
  const raw = String(episode?.number || '').match(/\d+/)
  if (raw) return Number(raw[0])
  const fromSlug = String(cardSlug(episode) || '').match(/-episode-(\d+)/i)
  if (fromSlug) return Number(fromSlug[1])
  return fallbackIndex
}

function WatchSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="skeleton aspect-video w-full rounded-3xl" />
          <div className="skeleton h-16 w-full rounded-2xl" />
          <div className="skeleton h-8 w-2/3 rounded-xl" />
          <div className="skeleton h-24 w-full rounded-2xl" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>

  )
}

export default function Watch({ slug }) {
  const episode = useCachedAsync(KEY.episode(slug), () => fetchEpisode(slug), { ttl: TTL.episode })
  const data = episode.data
  const animeSlug = useMemo(() => data?.anime_slug || slugFromUrl(data?.anime_url), [data])

  const anime = useCachedAsync(KEY.anime(animeSlug), () => fetchAnime(animeSlug), {
    ttl: TTL.anime,
    enabled: Boolean(animeSlug),
  })

  const history = useHistory()


  const episodes = useMemo(
    () => (Array.isArray(anime.data?.episodes) ? anime.data.episodes : []),
    [anime.data],
  )

  // Urut kronologis untuk prev/next (daftar di UI tetap urutan situs).
  const ordered = useMemo(() => {
    const list = episodes.filter((item) => cardSlug(item))
    return [...list].sort((a, b) => episodeNumber(a) - episodeNumber(b))
  }, [episodes])

  const index = useMemo(() => ordered.findIndex((item) => cardSlug(item) === slug), [ordered, slug])
  const prev = index > 0 ? ordered[index - 1] : null
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null
  const position = index >= 0 ? `${index + 1}/${ordered.length}` : ''

  const description = useMemo(() => stripHtml(data?.description), [data])
  const downloads = Array.isArray(data?.downloads) ? data.downloads : []
  const servers = Array.isArray(data?.servers) ? data.servers : []
  const watched = history.watched?.[animeSlug] || []
  const lastSlug = history.lastFor(animeSlug)?.episodeSlug || ''

  // Catat riwayat begitu episode valid.
  useEffect(() => {
    if (!data?.slug || !animeSlug) return
    recordEpisode({
      animeSlug,
      animeTitle: data.anime_title || anime.data?.title || '',
      thumbnail: anime.data?.thumbnail || '',
      episodeSlug: data.slug,
      episodeNumber: data.title?.match(/episode\s*(\d+)/i)?.[1] || '',
      episodeTitle: data.title || '',
    })
  }, [data?.slug, animeSlug, data?.anime_title, data?.title, anime.data?.title, anime.data?.thumbnail])

  const openList = useCallback(() => {
    const target = document.getElementById('episode-list')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (animeSlug) navigate(`/anime/${animeSlug}`)
  }, [animeSlug])

  const finishAndNext = useCallback(() => {
    if (!animeSlug) return
    markWatched(animeSlug, slug)
    if (next) {
      toast('Ditandai selesai — lanjut episode berikutnya', { tone: 'success' })
      navigate(`/watch/${cardSlug(next)}`)
    } else {
      toast('Episode terakhir ditandai selesai', { tone: 'success' })
    }
  }, [animeSlug, next, slug])

  // Pintasan keyboard: ← → pindah episode, n = tandai selesai, b = kembali
  useEffect(() => {
    const onKey = (event) => {
      const tag = (event.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowLeft' && prev) {
        event.preventDefault()
        navigate(`/watch/${cardSlug(prev)}`)
      } else if (event.key === 'ArrowRight' && next) {
        event.preventDefault()
        navigate(`/watch/${cardSlug(next)}`)
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        finishAndNext()
      } else if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        navigate(animeSlug ? `/anime/${animeSlug}` : '/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, finishAndNext, animeSlug])

  if (episode.loading && !data) return <WatchSkeleton />

  if (episode.error && !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <ErrorState
          title="Gagal memuat episode"
          message={episode.error.message}
          onRetry={episode.refresh}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="prose-muted">Episode tidak ditemukan.</p>
      </div>
    )
  }

  const backHref = animeSlug ? `/anime/${animeSlug}` : '/'

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <nav className="mb-3 flex items-center gap-2 text-[11.5px] text-slate-500" aria-label="Breadcrumb">
        <a
          href={backHref}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            navigate(backHref)
          }}
          className="inline-flex items-center gap-1.5 transition hover:text-accent"
        >
          <ArrowLeft size={13} strokeWidth={2.4} aria-hidden="true" />
          {data.anime_title || 'Detail'}
        </a>
        <span className="text-slate-700">/</span>
        <span className="truncate text-slate-400">Episode {position || '—'}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="-mx-4 sm:mx-0">
            <Player
              embed={data.embed || ''}
              sources={servers}
              title={data.title || 'Player episode'}
              className="ring-0"
              frameClassName="rounded-none sm:rounded-3xl"
            />
          </div>

          <EpisodeNav
            className="mt-3"
            prevSlug={prev ? cardSlug(prev) : ''}
            nextSlug={next ? cardSlug(next) : ''}
            position={position}
            label={next ? `Ep ${episodeNumber(next)}` : ''}
            onOpenList={openList}
          />

          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="display-2">{data.title || 'Episode'}</h1>
              {data.anime_title ? (
                <p className="mt-1 text-[13px] text-slate-400">{data.anime_title}</p>
              ) : null}
            </div>

            <button type="button" onClick={finishAndNext} className="btn-soft shrink-0">
              <Check size={14} strokeWidth={2.6} aria-hidden="true" />
              {next ? 'Selesai & lanjut' : 'Tandai selesai'}
            </button>
          </div>

          {servers.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Server size={12} strokeWidth={2.2} aria-hidden="true" />
                {servers.filter((server) => server.playable !== false).length} dari {servers.length}{' '}
                server
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-400">
                {servers.map((server) => server.name || server.kind).join(' / ')}
              </span>
            </div>
          ) : null}

          {downloads.length ? (
            <div className="mt-4">
              <span className="label inline-flex items-center gap-1.5">
                <Download size={12} strokeWidth={2.2} aria-hidden="true" />
                Unduhan
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {downloads.map((item, itemIndex) => (
                  <a
                    key={`${item.url}-${itemIndex}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="chip"
                  >
                    {item.label || `Server ${itemIndex + 1}`}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {description ? (
            <p className="prose-muted mt-5 line-clamp-5 whitespace-pre-line">{description}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={openList} className="btn-ghost">
              <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
              Pilih episode lain
            </button>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <Keyboard size={12} strokeWidth={2.2} aria-hidden="true" />
              <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 font-mono text-[10px]">←</kbd>
              <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 font-mono text-[10px]">→</kbd>
              pindah episode ·{' '}
              <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 font-mono text-[10px]">n</kbd>{' '}
              selesai
            </span>
          </div>
        </div>

        <aside id="episode-list" className="min-w-0 scroll-mt-24">
          <div className="lg:sticky lg:top-20">
            <div className="glass rounded-2xl p-3">
              <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <h2 className="label-accent">Episode</h2>
                <span className="font-mono text-[11px] text-slate-500">
                  {episodes.length ? `${position || episodes.length}` : '—'}
                </span>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-12rem)]">
                <EpisodeList
                  episodes={episodes}
                  activeSlug={slug}
                  watched={watched}
                  lastSlug={lastSlug}
                  loading={anime.loading}
                  emptyMessage="Daftar episode belum tersedia."
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
