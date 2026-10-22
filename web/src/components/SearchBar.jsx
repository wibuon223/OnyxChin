import { useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'

export default function SearchBar({
  defaultValue = '',
  onSearch,
  loading = false,
  placeholder = 'Cari judul anime...',
  autoFocus = false,
  size = 'md',
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const submit = (event) => {
    if (event) event.preventDefault()
    const query = value.trim()
    if (!query || typeof onSearch !== 'function') return
    onSearch(query)
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return
    submit(event)
  }

  const tall = size === 'lg'

  return (
    <form onSubmit={submit} role="search" className="w-full">
      <div className="group relative flex items-center">
        <Search
          size={tall ? 18 : 16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-accent"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Cari anime"
          autoComplete="off"
          className={`w-full rounded-xl border border-white/10 bg-ink-850/90 pl-11 pr-28 text-slate-100 placeholder:text-slate-500 transition focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40 ${
            tall ? 'py-3.5 text-sm sm:text-base' : 'py-2.5 text-sm'
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Cari"
          className="absolute right-1.5 inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} strokeWidth={2.4} className="animate-spin" aria-hidden="true" />
          ) : (
            <Search size={16} strokeWidth={2.4} aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Cari</span>
        </button>
      </div>
    </form>
  )
}
