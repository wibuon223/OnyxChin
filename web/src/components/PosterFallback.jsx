export default function PosterFallback({ title = '', type = '', className = '' }) {
  const initial = (title || 'Donghive').trim().charAt(0).toUpperCase() || 'D'
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute -right-5 -top-10 select-none text-[8rem] font-black leading-none text-white/[0.03]"
      >
        {initial}
      </span>
      <span className="flex flex-col items-center gap-2 px-3 text-center">
        <span className="text-3xl font-black leading-none text-ink-600">{initial}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-600">
          {type || 'Donghive'}
        </span>
      </span>
    </div>
  )
}
