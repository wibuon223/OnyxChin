import { Play } from 'lucide-react'
import { navigate } from '../hooks/useRoute'
import useImageSource from '../hooks/useImageSource'
import PosterFallback from './PosterFallback'
import { cardSlug, isEpisodeSlug } from '../utils'

export default function AnimeCard({ card, className = '' }) {
  const { src, failed, onError } = useImageSource(card.thumbnail)
  const slug = cardSlug(card)
  const href = slug ? (isEpisodeSlug(slug) ? `/watch/${slug}` : `/anime/${slug}`) : '/'
  const episode = card.episode || ''
  const type = card.type || ''
  const series = card.series && card.series !== card.title ? card.series : ''

  const handleClick = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(href)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`group block w-full focus-visible:ring-2 focus-visible:ring-accent/70 ${className}`}
      aria-label={`Lihat detail ${card.title || 'anime'}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-ink-850 transition duration-300 group-hover:-translate-y-1 group-hover:border-accent/60 group-hover:shadow-glow">
        {!failed ? (
          <img
            src={src}
            alt={`Poster ${card.title || 'anime'}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={onError}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <PosterFallback title={card.title} type={type} className="h-full w-full" />
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {type ? (
            <span className="rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent backdrop-blur">
              {type}
            </span>
          ) : null}
          {episode ? (
            <span className="rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur">
              {episode}
            </span>
          ) : null}
        </div>

        {episode ? (
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-ink-950/80 text-accent opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Play size={13} strokeWidth={2.4} aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-100 transition group-hover:text-accent">
        {card.title || 'Tanpa judul'}
      </p>
      {series ? (
        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{series}</p>
      ) : null}
    </a>
  )
}
