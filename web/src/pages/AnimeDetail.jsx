import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Play, Radio, Tv } from 'lucide-react'
import { fetchAnime } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import EpisodeList from '../components/EpisodeList'
import PosterFallback from '../components/PosterFallback'
import { Skeleton } from '../components/Skeleton'
import useAsync from '../hooks/useAsync'
import useImageSource from '../hooks/useImageSource'
import { navigate } from '../hooks/useRoute'
import { cardSlug, stripHtml } from '../utils'

function MetaItem({ label, value }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="label">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-200" title={String(value)}>
        {value}
      </p>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44 lg:w-56" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <div className="mt-10 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function AnimeDetail({ slug }) {
  const [expanded, setExpanded] = useState(false)
  const detail = useAsync(() => fetchAnime(slug), [slug])

  const data = detail.data
  const episodes = useMemo(() => (Array.isArray(data?.episodes) ? data.episodes : []), [data])
  const description = useMemo(() => stripHtml(data?.description), [data])
  const genres = useMemo(
    () => (Array.isArray(data?.genres) ? data.genres.filter(Boolean) : []),
    [data],
  )
  const firstPlayable = useMemo(
    () => episodes.find((episode) => episode.embed && cardSlug(episode)),
    [episodes],
  )
  const { src: poster, failed: posterFailed, onError: onPosterError } = useImageSource(
    data?.thumbnail,
  )

  if (detail.loading) {
    return <DetailSkeleton />
  }

  if (detail.error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          title="Gagal memuat detail anime"
          message={detail.error.message}
          onRetry={detail.retry}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          title="Detail tidak ditemukan"
          message="Anime yang Anda cari tidak tersedia atau sudah dihapus."
        />
      </div>
    )
  }

  const watchHref = firstPlayable ? `/watch/${cardSlug(firstPlayable)}` : ''

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="w-36 shrink-0 sm:w-44 lg:w-56">
          <div className="aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-ink-850 shadow-card">
            {!posterFailed ? (
              <img
                src={poster}
                alt={`Poster ${data.title || 'anime'}`}
                referrerPolicy="no-referrer"
                onError={onPosterError}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <PosterFallback
                title={data.title}
                type={data.type}
                className="h-full w-full"
              />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="label-accent">{data.type || 'Anime'}</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
            {data.title || 'Tanpa judul'}
          </h1>

          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetaItem label="Tipe" value={data.type} />
            <MetaItem label="Status" value={data.status} />
            <MetaItem label="Network" value={data.network} />
            <MetaItem label="Rilis" value={data.released} />
            <MetaItem label="Diperbarui" value={data.updated} />
          </div>

          {genres.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span key={genre} className="chip">
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {data.total_episodes ? (
              <span className="inline-flex items-center gap-1.5">
                <Tv size={13} strokeWidth={2} aria-hidden="true" />
                {data.total_episodes} episode
              </span>
            ) : null}
            {data.reported_episodes ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} strokeWidth={2} aria-hidden="true" />
                {data.reported_episodes} tayang
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Radio size={13} strokeWidth={2} aria-hidden="true" />
              Streaming subtitle Indonesia
            </span>
          </div>

          {description ? (
            <div className="mt-6">
              <p
                className={`whitespace-pre-line text-sm leading-relaxed text-slate-400 ${
                  expanded ? '' : 'line-clamp-5'
                }`}
              >
                {description}
              </p>
              {description.length > 220 ? (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent transition hover:text-accent-soft"
                >
                  {expanded ? 'Ringkas' : 'Selengkapnya'}
                  <ChevronDown
                    size={14}
                    strokeWidth={2.4}
                    aria-hidden="true"
                    className={`transition ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>
              ) : null}
            </div>
          ) : null}

          {watchHref ? (
            <a
              href={watchHref}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                event.preventDefault()
                navigate(watchHref)
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-accent-soft"
            >
              <Play size={16} strokeWidth={2.4} aria-hidden="true" />
              Mulai Nonton
            </a>
          ) : null}
        </div>
      </div>

      <section className="mt-10 space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="label-accent text-[12px] uppercase tracking-[0.22em]">Episode</h2>
          {episodes.length ? (
            <span className="font-mono text-xs text-slate-500">{episodes.length} episode</span>
          ) : null}
        </div>

        <EpisodeList
          episodes={episodes}
          loading={detail.loading}
          emptyMessage="Belum ada episode yang tayang untuk judul ini."
        />
      </section>
    </div>
  )
}
