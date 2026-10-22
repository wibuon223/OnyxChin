import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchAnimePage } from '../api'
import ErrorState from '../components/ErrorState'
import PosterGrid from '../components/PosterGrid'
import useAsync from '../hooks/useAsync'

export default function Browse() {
  const [page, setPage] = useState(1)
  const list = useAsync(() => fetchAnimePage(page), [page])

  const items = list.data?.items || []
  const totalPages = Number(list.data?.total_pages) || 1
  const currentPage = Number(list.data?.page) || page
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <p className="label-accent">Jelajah</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Semua anime
      </h1>

      <div className="mt-8">
        {list.loading ? (
          <PosterGrid loading skeletonCount={12} />
        ) : list.error ? (
          <ErrorState
            title="Gagal memuat daftar anime"
            message={list.error.message}
            onRetry={list.retry}
          />
        ) : (
          <>
            <PosterGrid items={items} />
            {totalPages > 1 ? (
              <nav
                className="mt-10 flex items-center justify-center gap-4"
                aria-label="Navigasi halaman"
              >
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={!canPrev}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-850 px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
                  Sebelumnya
                </button>
                <span className="font-mono text-xs text-slate-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={!canNext}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-850 px-3.5 py-2 text-sm font-medium text-slate-300 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
