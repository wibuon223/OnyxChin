export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-lg bg-ink-800/80 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="w-[150px] shrink-0 sm:w-[168px]">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="mt-3 h-3 w-4/5" />
      <Skeleton className="mt-2 h-3 w-2/5" />
    </div>
  )
}

export function SkeletonRail({ count = 6 }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 12, className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
