import { Tag } from 'lucide-react'
import { navigate } from '../hooks/useRoute'

export default function GenreChips({
  genres = [],
  loading = false,
  title = 'Genre',
}) {
  const handleClick = (event, name) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    navigate(`/search?q=${encodeURIComponent(name)}`)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Tag size={14} strokeWidth={2.2} className="text-accent" aria-hidden="true" />
        <h2 className="label-accent text-[12px] uppercase tracking-[0.22em]">{title}</h2>
      </div>

      {loading ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="h-8 w-24 shrink-0 animate-pulse rounded-full border border-white/10 bg-ink-850"
            />
          ))}
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {genres.map((genre) => {
            const name = typeof genre === 'string' ? genre : genre.name
            if (!name) return null
            return (
              <a
                key={name}
                href={`/search?q=${encodeURIComponent(name)}`}
                onClick={(event) => handleClick(event, name)}
                className="chip shrink-0"
              >
                {name}
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}
