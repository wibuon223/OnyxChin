import AnimeCard from './AnimeCard'
import EmptyState from './EmptyState'
import { SkeletonGrid } from './Skeleton'

export default function PosterGrid({
  items = [],
  loading = false,
  emptyTitle = 'Belum ada anime',
  emptyMessage = 'Tidak ada judul yang bisa ditampilkan.',
  skeletonCount = 12,
  className = '',
}) {
  if (loading) {
    return <SkeletonGrid count={skeletonCount} className={className} />
  }

  if (!items.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 ${className}`}>
      {items.map((card, index) => (
        <AnimeCard key={`${card.url || card.title}-${index}`} card={card} />
      ))}
    </div>
  )
}
