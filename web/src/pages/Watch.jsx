import { useMemo } from 'react'
import { ArrowLeft, Download, Server } from 'lucide-react'
import { fetchAnime, fetchEpisode } from '../api'
import ErrorState from '../components/ErrorState'
import EpisodeList from '../components/EpisodeList'
import Player from '../components/Player'
import { Skeleton } from '../components/Skeleton'
import useAsync from '../hooks/useAsync'
import { navigate } from '../hooks/useRoute'
import { slugFromUrl, stripHtml } from '../utils'

function WatchSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}

export default function Watch({ slug }) {
  const episode = useAsync(() => fetchEpisode(slug), [slug])
  const data = episode.data

  const animeSlug = useMemo(() => data?.anime_slug || slugFromUrl(data?.anime_url), [data])
  const anime = useAsync(
    () => (animeSlug ? fetchAnime(animeSlug) : Promise.resolve(null)),
    [animeSlug],
  )

  const episodes = useMemo(
    () => (Array.isArray(anime.data?.episodes) ? anime.data.episodes : []),
    [anime],
  )
  const description = useMemo(() => stripHtml(data?.description), [data])

  if (episode.loading) {
    return <WatchSkeleton />
  }

  if (episode.error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          title="Gagal memuat episode"
          message={episode.error.message}
          onRetry={episode.retry}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-10 sm:px-6 lg:px-8">
        <ErrorState title="Episode tidak ditemukan" message="Episode ini tidak tersedia." />
      </div>
    )
  }

  const backHref = animeSlug ? `/anime/${animeSlug}` : '/'
  const downloads = Array.isArray(data.downloads) ? data.downloads : []
  const servers = Array.isArray(data.servers) ? data.servers : []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="-mx-4 sm:mx-0">
            <Player
              embed={data.embed || ''}
              title={data.title || 'Player episode'}
              className="ring-0"
              frameClassName="rounded-none sm:rounded-xl"
            />
          </div>

          <div className="mt-5">
            <a
              href={backHref}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                event.preventDefault()
                navigate(backHref)
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-accent"
            >
              <ArrowLeft size={14} strokeWidth={2.4} aria-hidden="true" />
              Kembali ke detail
            </a>

            <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
              {data.title || 'Episode'}
            </h1>
            {data.anime_title ? (
              <p className="mt-1 text-sm text-slate-400">{data.anime_title}</p>
            ) : null}

            {servers.length ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="label inline-flex items-center gap-1.5">
                  <Server size={12} strokeWidth={2.2} aria-hidden="true" />
                  Server
                </span>
                {servers.map((server) => (
                  <span key={server.id || server.label} className="chip">
                    {server.label || server.id}
                  </span>
                ))}
              </div>
            ) : null}

            {downloads.length ? (
              <div className="mt-4">
                <span className="label inline-flex items-center gap-1.5">
                  <Download size={12} strokeWidth={2.2} aria-hidden="true" />
                  Unduhan
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {downloads.map((item, index) => (
                    <a
                      key={`${item.url}-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="chip"
                    >
                      {item.label || `Server ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {description ? (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-400 line-clamp-5">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="min-w-0">
          <div className="lg:sticky lg:top-20">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="label-accent text-[12px] uppercase tracking-[0.22em]">Episode</h2>
              {episodes.length ? (
                <span className="font-mono text-xs text-slate-500">{episodes.length}</span>
              ) : null}
            </div>

            <EpisodeList
              episodes={episodes}
              activeSlug={slug}
              loading={anime.loading}
              emptyMessage="Daftar episode belum tersedia."
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
