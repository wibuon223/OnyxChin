import { ChevronRight } from 'lucide-react'
import AnimeCard from './AnimeCard'
import { SkeletonRail } from './Skeleton'
import { navigate } from '../hooks/useRoute'

export default function SectionRail({
  title,
  items = [],
  loading = false,
  seeAllHref = '/anime',
  seeAllLabel = 'Lihat semua',
}) {
  const handleSeeAll = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(seeAllHref)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="label-accent text-[12px] uppercase tracking-[0.22em]">
          {title}
        </h2>
        <a
          href={seeAllHref}
          onClick={handleSeeAll}
          className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-accent"
          aria-label={`${seeAllLabel} ${title}`}
        >
          {seeAllLabel}
          <ChevronRight
            size={15}
            strokeWidth={2.2}
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          />
        </a>
      </div>

      {loading ? (
        <SkeletonRail />
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {items.map((card, index) => (
            <div
              key={`${card.url || card.title}-${index}`}
              className="w-[140px] shrink-0 snap-start sm:w-[158px] lg:w-[172px]"
            >
              <AnimeCard card={card} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
