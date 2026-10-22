import { useCallback } from 'react'
import { fetchGenres, fetchHome, fetchSearch } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import GenreChips from '../components/GenreChips'
import Hero from '../components/Hero'
import PosterGrid from '../components/PosterGrid'
import SearchBar from '../components/SearchBar'
import SectionRail from '../components/SectionRail'
import useAsync from '../hooks/useAsync'
import { navigate, useRoute } from '../hooks/useRoute'

function pick(sections, keys) {
  for (const key of keys) {
    const value = sections?.[key]
    if (Array.isArray(value) && value.length) return value
  }
  return []
}

export function SearchResults({ query }) {
  const trimmed = (query || '').trim()

  const search = useAsync(
    () => (trimmed ? fetchSearch(trimmed, 1) : Promise.resolve({ query: trimmed, items: [] })),
    [trimmed],
  )

  const handleSearch = useCallback((value) => {
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }, [])

  const items = search.data?.items || []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-xl">
        <p className="label-accent">Hasil pencarian</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {trimmed ? `Pencarian untuk "${trimmed}"` : 'Cari anime'}
        </h1>
        <div className="mt-5">
          <SearchBar onSearch={handleSearch} defaultValue={trimmed} loading={search.loading} />
        </div>
      </div>

      <div className="mt-8">
        {search.loading ? (
          <PosterGrid loading skeletonCount={12} />
        ) : search.error ? (
          <ErrorState
            title="Gagal memuat hasil pencarian"
            message={search.error.message}
            onRetry={search.retry}
          />
        ) : items.length ? (
          <>
            <p className="label mb-4">{items.length} judul ditemukan</p>
            <PosterGrid items={items} />
          </>
        ) : (
          <EmptyState
            title="Tidak ada hasil"
            message={
              trimmed
                ? `Tidak ada anime yang cocok dengan "${trimmed}". Coba kata kunci lain.`
                : 'Ketik judul anime untuk mulai mencari.'
            }
          />
        )}
      </div>
    </div>
  )
}

function HomeContent() {
  const home = useAsync(() => fetchHome(), [])
  const genreList = useAsync(() => fetchGenres(), [])

  const handleSearch = useCallback((value) => {
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }, [])

  const sections = home.data?.sections || {}
  const popularToday = pick(sections, ['Popular Today', 'Popular', 'Popular Today Anime'])
  const latestRelease = pick(sections, ['Latest Release', 'Latest Releases', 'Latest'])
  const recommendation = pick(sections, ['Recommendation', 'Recommendations', 'Rekomendasi'])
  const weeklyPopular = pick(sections, [
    'Donghua Populer (Weekly)',
    'Donghua Populer Weekly',
    'Weekly Popular',
  ])
  const newest = pick(sections, ['Donghua Baru', 'New Donghua', 'Ongoing'])

  const genres = (genreList.data?.genres || []).map((genre) =>
    typeof genre === 'string' ? { name: genre } : genre,
  )
  const badges = genres.slice(0, 5).map((genre) => genre.name).filter(Boolean)

  return (
    <>
      <Hero onSearch={handleSearch} badges={badges} />

      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {home.error ? (
          <ErrorState
            title="Gagal memuat beranda"
            message={home.error.message}
            onRetry={home.retry}
          />
        ) : (
          <>
            <SectionRail
              title="Popular Today"
              items={popularToday}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Latest Release"
              items={latestRelease}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Recommendation"
              items={recommendation}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Donghua Populer (Weekly)"
              items={weeklyPopular}
              loading={home.loading}
              seeAllHref="/anime"
            />
            <SectionRail
              title="Donghua Baru"
              items={newest}
              loading={home.loading}
              seeAllHref="/anime"
            />
          </>
        )}

        <section className="space-y-4">
          <h2 className="label-accent text-[12px] uppercase tracking-[0.22em]">
            Latest Release
          </h2>
          {home.loading ? (
            <PosterGrid loading skeletonCount={12} />
          ) : home.error ? (
            <ErrorState
              title="Gagal memuat daftar anime"
              message={home.error.message}
              onRetry={home.retry}
            />
          ) : (
            <PosterGrid
              items={latestRelease}
              emptyTitle="Belum ada anime terbaru"
              emptyMessage="Daftan anime terbaru akan muncul di sini."
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
