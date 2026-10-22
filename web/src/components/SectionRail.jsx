import { ArrowUpRight } from 'lucide-react'
import AnimeCard from './AnimeCard'
import { SkeletonRail } from './Skeleton'
import { navigate } from '../hooks/useRoute'

export default function SectionRail({
  title,
  items = [],
  loading = false,
  seeAllHref = '/anime',
  seeAllLabel = 'Semua',
}) {
  const handleSeeAll = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(seeAllHref)
  }

  if (!loading && !items.length) return null

  return (
    <section className="space-y-4 cv-auto">
      <div className="flex items-end justify-between gap-4">
        <h2 className="display-2">{title}</h2>
        <a
          href={seeAllHref}
          onClick={handleSeeAll}
          className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-semibold text-slate-400 transition duration-300 ease-silk hover:border-accent/40 hover:text-accent"
          aria-label={`${seeAllLabel} ${title}`}
        >
          {seeAllLabel}
          <ArrowUpRight
            size={13}
            strokeWidth={2.4}
            aria-hidden="true"
            className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </div>

      {loading ? (
        <SkeletonRail />
      ) : (
        <div className="no-scrollbar mask-fade-r -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {items.map((card, index) => (
            <div
              key={`${card.url || card.title}-${index}`}
              className="w-[142px] shrink-0 snap-start sm:w-[158px] lg:w-[172px]"
            >
              <AnimeCard card={card} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
