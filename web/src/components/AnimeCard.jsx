import { Play } from 'lucide-react'
import { fetchAnime, fetchEpisode } from '../api'
import { prefetch } from '../lib/cache'
import { KEY, TTL } from '../lib/keys'
import { navigate } from '../hooks/useRoute'
import useImageSource from '../hooks/useImageSource'
import PosterFallback from './PosterFallback'
import { cardSlug, isEpisodeSlug } from '../utils'

export default function AnimeCard({ card, className = '' }) {
  const { src, failed, onError } = useImageSource(card.thumbnail)
  const slug = cardSlug(card)
  const episodic = isEpisodeSlug(slug)
  const href = slug ? (episodic ? `/watch/${slug}` : `/anime/${slug}`) : '/'
  const episode = card.episode || ''
  const type = card.type || ''
  const series = card.series && card.series !== card.title ? card.series : ''

  // Panaskan cache begitu kursor menyentuh kartu — halaman detail terasa instan.
  const warm = () => {
    if (!slug) return
    if (episodic) prefetch(KEY.episode(slug), () => fetchEpisode(slug), TTL.episode)
    else prefetch(KEY.anime(slug), () => fetchAnime(slug), TTL.anime)
  }

  const handleClick = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(href)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className={`group block w-full ${className}`}
      aria-label={`Lihat ${episodic ? 'episode' : 'detail'} ${card.title || 'anime'}`}
    >
      <div className="card-hover relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-card">
        {!failed ? (
          <img
            src={src}
            alt={`Poster ${card.title || 'anime'}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={onError}
            className="drag-none h-full w-full object-cover opacity-95 transition duration-700 ease-silk group-hover:scale-[1.05] group-hover:opacity-100"
          />
        ) : (
          <PosterFallback title={card.title} type={type} className="h-full w-full" />
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink-950/70 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {type ? (
            <span className="rounded-full border border-white/12 bg-ink-950/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-accent backdrop-blur-md">
              {type}
            </span>
          ) : null}
          {episode ? (
            <span className="rounded-full border border-white/10 bg-ink-950/60 px-2 py-0.5 text-[9.5px] font-semibold text-slate-200 backdrop-blur-md">
              {episode}
            </span>
          ) : null}
        </div>

        <span className="absolute bottom-2 right-2 flex h-8 w-8 translate-y-1 items-center justify-center rounded-full border border-white/20 bg-ink-950/70 text-accent opacity-0 backdrop-blur-md transition duration-300 ease-silk group-hover:translate-y-0 group-hover:opacity-100">
          <Play size={12} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </div>

      <p className="mt-2.5 line-clamp-2 text-[12.5px] font-semibold leading-snug text-slate-100 transition duration-300 group-hover:text-accent">
        {card.title || 'Tanpa judul'}
      </p>
      {series ? <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{series}</p> : null}
    </a>
  )
}
