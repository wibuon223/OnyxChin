import { useMemo } from 'react'
import { Clock3, Play, Trash2 } from 'lucide-react'
import HistoryRail from '../components/HistoryRail'
import useHistory from '../hooks/useHistory'
import { navigate } from '../hooks/useRoute'
import { toast } from '../lib/toast'

export default function HistoryPage() {
  const history = useHistory()

  const stats = useMemo(() => {
    const count = history.items.length
    const episodes = Object.values(history.watched || {}).reduce(
      (total, list) => total + (Array.isArray(list) ? list.length : 0),
      0,
    )
    return { count, episodes }
  }, [history])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">
            <Clock3 size={12} strokeWidth={2.2} aria-hidden="true" />
            Riwayat lokal
          </span>
          <h1 className="display-1 mt-4">Lanjut dari terakhir</h1>
          <p className="prose-muted mt-2 max-w-xl">
            {stats.count
              ? `${stats.count} judul tersimpan · ${stats.episodes} episode ditandai selesai. Semua data ada di localStorage browser ini — tidak dikirim ke mana pun.`
              : 'Belum ada riwayat. Begitu kamu membuka satu episode, judulnya muncul di sini otomatis.'}
          </p>
        </div>

        {stats.count ? (
          <button
            type="button"
            onClick={() => {
              history.clear()
              toast('Riwayat dihapus dari browser ini', { tone: 'warn' })
            }}
            className="btn-ghost text-ember/90 hover:border-ember/40 hover:text-ember"
          >
            <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
            Hapus semua
          </button>
        ) : null}
      </div>

      {stats.count ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {history.items.map((item) => (
            <article
              key={item.animeSlug}
              className="glass group relative flex gap-3 overflow-hidden rounded-2xl p-3 transition duration-500 ease-silk hover:border-accent/30"
            >
              <button
                type="button"
                onClick={() => navigate(`/watch/${item.episodeSlug}`)}
                className="relative h-[74px] w-[52px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-800"
                aria-label={`Lanjut ${item.animeTitle}`}
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-ink-950/40 text-accent opacity-0 transition group-hover:opacity-100">
                  <Play size={15} strokeWidth={2.6} aria-hidden="true" />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigate(`/watch/${item.episodeSlug}`)}
                  className="block w-full text-left"
                >
                  <span className="line-clamp-1 block text-[13.5px] font-bold text-white">
                    {item.animeTitle || item.animeSlug}
                  </span>
                  <span className="mt-1 block text-[11.5px] text-slate-400">
                    Episode {item.episodeNumber || '—'}
                  </span>
                </button>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/watch/${item.episodeSlug}`)}
                    className="rounded-full bg-accent/12 px-3 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/20"
                  >
                    Lanjut
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/anime/${item.animeSlug}`)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    onClick={() => history.remove(item.animeSlug)}
                    className="ml-auto text-slate-600 transition hover:text-ember"
                    aria-label={`Hapus ${item.animeTitle}`}
                  >
                    <Trash2 size={13} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass mt-8 rounded-3xl px-6 py-14 text-center">
          <p className="display-3">Masih kosong</p>
          <p className="prose-muted mx-auto mt-2 max-w-md">
            Buka satu episode dulu, nanti judul dan episode terakhirnya otomatis tersimpan di sini.
          </p>
          <button type="button" onClick={() => navigate('/')} className="btn-primary mt-5">
            <Play size={14} strokeWidth={2.4} aria-hidden="true" />
            Mulai dari beranda
          </button>
        </div>
      )}

      {stats.count > 3 ? (
        <div className="mt-10">
          <HistoryRail items={history.items.slice(0, 8)} title="Terakhir dibuka" compact />
        </div>
      ) : null}
    </div>
  )
}
