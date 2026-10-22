import { useState } from 'react'
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react'
import { fetchAnimePage } from '../api'
import ErrorState from '../components/ErrorState'
import PosterGrid from '../components/PosterGrid'
import useCachedAsync from '../hooks/useCachedAsync'
import { KEY, TTL } from '../lib/keys'

export default function Browse() {
  const [page, setPage] = useState(1)
  const list = useCachedAsync(KEY.browse(page), () => fetchAnimePage(page), { ttl: TTL.browse })

  const items = list.data?.items || []
  const totalPages = Number(list.data?.total_pages) || 1
  const currentPage = Number(list.data?.page) || page
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <span className="eyebrow">
        <Compass size={12} strokeWidth={2.2} aria-hidden="true" />
        Jelajah
      </span>
      <h1 className="display-1 mt-4">Semua anime</h1>
      <p className="prose-muted mt-2">
        Katalog lengkap dari donghive.vip. Halaman yang sudah dibuka tersimpan di cache, jadi
        bolak-balik halaman nggak perlu nunggu fetch lagi.
      </p>

      <div className="mt-8">
        {list.loading && !items.length ? (
          <PosterGrid loading skeletonCount={12} />
        ) : list.error ? (
          <ErrorState
            title="Gagal memuat daftar anime"
            message={list.error.message}
            onRetry={list.refresh}
          />
        ) : (
          <>
            <PosterGrid items={items} />
            {totalPages > 1 ? (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Navigasi halaman">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={!canPrev}
                  className="btn-ghost disabled:opacity-40"
                >
                  <ChevronLeft size={15} strokeWidth={2.4} aria-hidden="true" />
                  Sebelumnya
                </button>
                <span className="glass rounded-full px-4 py-2 font-mono text-[11.5px] text-slate-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={!canNext}
                  className="btn-ghost disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight size={15} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
