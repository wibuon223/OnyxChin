import { useCallback } from 'react'
import { fetchGenres, fetchHome, fetchSearch } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import GenreChips from '../components/GenreChips'
import Hero from '../components/Hero'
import HistoryRail from '../components/HistoryRail'
import PosterGrid from '../components/PosterGrid'
import SectionRail from '../components/SectionRail'
import useCachedAsync from '../hooks/useCachedAsync'
import useHistory from '../hooks/useHistory'
import { navigate, useRoute } from '../hooks/useRoute'
import { KEY, TTL } from '../lib/keys'

function pick(sections, keys) {
  for (const key of keys) {
    if (Array.isArray(sections?.[key]) && sections[key].length) return sections[key]
  }
  return []
}

export function SearchResults({ query }) {
  const trimmed = (query || '').trim()

  const search = useCachedAsync(
    KEY.search(trimmed),
    () => fetchSearch(trimmed, 1),
    { ttl: TTL.search, enabled: Boolean(trimmed) },
  )

  const items = search.data?.items || []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <span className="eyebrow">Hasil pencarian</span>
      <h1 className="display-1 mt-4">
        {trimmed ? `“${trimmed}”` : 'Cari judul'}
      </h1>
      <p className="prose-muted mt-2">
        {search.loading
          ? 'Mencari…'
          : `${items.length} judul ketemu${trimmed ? ` untuk “${trimmed}”` : ''}.`}
      </p>

      <div className="mt-8">
        {search.error ? (
          <ErrorState title="Pencarian gagal" message={search.error.message} onRetry={search.refresh} />
        ) : search.loading ? (
          <PosterGrid loading skeletonCount={12} />
        ) : items.length ? (
          <PosterGrid items={items} />
        ) : (
          <EmptyState
            title="Nggak ada hasil"
            message="Coba kata kunci lain — judul alternatif atau ejaan yang lebih pendek."
          />
        )}
      </div>
    </div>
  )
}

function HomeContent() {
  const home = useCachedAsync(KEY.home, fetchHome, { ttl: TTL.home })
  const genreList = useCachedAsync(KEY.genres, fetchGenres, { ttl: TTL.genres })
  const history = useHistory()

  const handleSearch = useCallback((value) => {
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }, [])

  const sections = home.data?.sections || {}
  const popularToday = pick(sections, ['Popular Today', 'Popular', 'Popular Today Anime'])
  const latestRelease = pick(sections, ['Latest Release', 'Latest Releases', 'Latest'])
  const recommendation = pick(sections, ['Recommendation', 'Recommendations', 'Rekomendasi'])
  const weeklyPopular = pick(sections, [
    'Donghua Populer (Weekly)',
    'Weekly Popular',
    'Popular Weekly',
  ])
  const newest = pick(sections, ['Donghua Baru', 'New Donghua', 'Ongoing'])

  const genres = (genreList.data?.genres || []).map((genre) =>
    typeof genre === 'string' ? { name: genre } : genre,
  )
  const badges = genres.slice(0, 6).map((genre) => genre.name).filter(Boolean)

  return (
    <>
      <Hero onSearch={handleSearch} badges={badges} />

      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {history.items.length ? (
          <HistoryRail items={history.items.slice(0, 8)} />
        ) : null}

        {home.error ? (
          <ErrorState
            title="Gagal memuat beranda"
            message={home.error.message}
            onRetry={home.refresh}
          />
        ) : (
          <>
            <SectionRail
              title="Populer hari ini"
              items={popularToday}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Rilis terbaru"
              items={latestRelease}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Rekomendasi"
              items={recommendation}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Populer minggu ini"
              items={weeklyPopular}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Donghua baru"
              items={newest}
              loading={home.loading}
              seeAllHref="/anime"
            />
          </>
        )}

        <section className="space-y-4 cv-auto">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display-2">Jelajahi semua</h2>
            <a href="/anime" className="text-[12px] font-semibold text-slate-400 transition hover:text-accent">
              Lihat katalog
            </a>
          </div>
          {home.loading ? (
            <PosterGrid loading skeletonCount={12} />
          ) : home.error ? null : (
            <PosterGrid
              items={latestRelease}
              emptyTitle="Belum ada anime terbaru"
              emptyMessage="Daftar anime terbaru akan muncul di sini."
            />
          )}
        </section>

        <GenreChips genres={genres} loading={genreList.loading} />
      </div>
    </>
  )
}

export default function Home() {
  const route = useRoute()

  if (route.name === 'search') {
    return <SearchResults query={route.query} />
  }

  return <HomeContent />
}
