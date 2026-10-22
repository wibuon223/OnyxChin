import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, MonitorOff, Server } from 'lucide-react'

/**
 * Player + pemilih server.
 *
 * Sumber video donghive punya beberapa mirror (OKRU, Odysee, MEGA, DTube,
 * Dailymotion). Dailymotion dikunci ke domain donghive.vip, jadi dari relay
 * hasilnya "This video cannot be played on this site" — karena itu server
 * yang playable ditaruh lebih dulu oleh API, dan UI menandai yang terkunci.
 *
 * `embed` adalah URL halaman /e/<slug> milik relay; kita menambahkan
 * ?server=<kind>&bar=0 supaya bar bawaan halaman embed tidak dobel.
 */
const STORAGE_KEY = 'dh:server'

function withServer(embed, kind) {
  if (!embed) return ''
  const sep = embed.includes('?') ? '&' : '?'
  const base = embed.replace(/([?&])(server|bar)=[^&]*/g, '$1').replace(/[?&]$/, '')
  const url = `${base}${sep}bar=0${kind ? `&server=${encodeURIComponent(kind)}` : ''}`
  return url.replace(/([?&])&/g, '$1')
}

export default function Player({
  embed = '',
  sources = [],
  title = 'Player',
  className = '',
  frameClassName = 'rounded-xl',
}) {
  const usable = useMemo(
    () => (Array.isArray(sources) ? sources.filter((s) => s && (s.kind || s.name)) : []),
    [sources],
  )

  const fallback = useMemo(() => {
    if (!usable.length) return ''
    // `experimental` (mis. Dailymotion) cuma boleh dipilih manual, jangan
    // pernah jadi default — playback-nya bergantung sama spoof origin.
    const safe = usable.filter((s) => s.playable !== false && !s.experimental)
    return (safe[0] || usable.find((s) => s.playable !== false) || usable[0]).kind || ''
  }, [usable])

  const [picked, setPicked] = useState(() => {
    if (typeof localStorage === 'undefined') return ''
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })

  // Pilihan tersimpan hanya dipakai kalau server itu ada di episode ini dan
  // bukan `experimental` — kalau tidak, sekali klik Dailymotion bikin semua
  // episode berikutnya ikut mendarat di mirror paling rapuh.
  const active = useMemo(() => {
    const saved = picked && usable.find((s) => s.kind === picked)
    if (saved && !saved.experimental) return picked
    return fallback
  }, [picked, usable, fallback])

  useEffect(() => {
    if (!active || active === 'dailymotion') return
    try {
      localStorage.setItem(STORAGE_KEY, active)
    } catch {
      /* mode privat: abaikan */
    }
  }, [active])

  const current = usable.find((s) => s.kind === active)
  const src = withServer(embed, active)

  if (!embed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-ink-900 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-ink-850 text-slate-500">
          <MonitorOff size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="space-y-1 px-6">
          <p className="text-sm font-semibold text-slate-300">Player tidak tersedia</p>
          <p className="text-xs text-slate-500">
            Episode ini belum memiliki sumber video yang bisa diputar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        className={`aspect-video w-full overflow-hidden bg-black ring-1 ring-white/10 ${frameClassName}`}
      >
        <iframe
          key={src}
          src={src}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>

      {usable.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label inline-flex items-center gap-1.5">
            <Server size={12} strokeWidth={2.2} aria-hidden="true" />
            Server
          </span>
          {usable.map((s) => {
            const on = s.kind === active
            const locked = s.playable === false
            return (
              <button
                key={s.kind || s.name}
                type="button"
                onClick={() => setPicked(s.kind)}
                aria-pressed={on}
                title={s.note || (locked ? 'Server ini dikunci pemiliknya' : s.url || '')}
                className={[
                  'chip transition',
                  on ? 'border-accent/60 bg-accent/15 text-accent' : 'hover:text-white',
                  locked && !on ? 'border-dashed text-slate-500' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {s.name || s.kind}
              </button>
            )
          })}
        </div>
      ) : null}

      {current?.playable === false ? (
        <p className="mt-2 inline-flex items-start gap-2 text-[11px] leading-relaxed text-amber-400/90">
          <AlertTriangle size={13} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">{current.name || 'Server ini'}</strong> tidak bisa
            diputar {current.note ? `(${current.note})` : ''}. Pilih server lain di atas.
          </span>
        </p>
      ) : current?.fallback ? (
        <p className="mt-2 inline-flex items-start gap-2 text-[11px] leading-relaxed text-amber-400/90">
          <AlertTriangle size={13} strokeWidth={2.2} className="mt-px shrink-0" aria-hidden="true" />
          <span>
            Episode ini cuma punya satu mirror.{' '}
            {current.note ? `${current.note}.` : ''} Kalau gagal, coba episode lain.
          </span>
        </p>
      ) : null}
    </div>
  )
}
