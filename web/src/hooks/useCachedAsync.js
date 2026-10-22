import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchOnce, isFresh, readCache, writeCache } from '../lib/cache'

/**
 * useCachedAsync — versi "stale-while-revalidate" dari useAsync.
 *
 * - Ada cache → data langsung tampil (tanpa loading), lalu revalidate diam-diam.
 * - Cache basi → tampil dulu, fetch di belakang.
 * - Tidak ada cache → loading seperti biasa.
 *
 * `key` harus stabil & unik per request, mis. `episode:jade-dynasty-ep-90`.
 */
export default function useCachedAsync(key, factory, options = {}) {
  const { ttl = 5 * 60_000, enabled = true } = options
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  const cached = enabled && key ? readCache(key) : null
  const [state, setState] = useState(() => ({
    data: cached ? cached.value : null,
    loading: !cached && Boolean(enabled && key),
    error: null,
    updatedAt: cached ? Math.max(0, cached.expires - ttl) : 0,
    stale: cached ? !isFresh(cached) : false,
  }))

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const run = useCallback(
    (mode = 'auto') => {
      if (!enabled || !key) return Promise.resolve(null)
      const hit = readCache(key)
      const fresh = isFresh(hit)

      if (hit) {
        setState({
          data: hit.value,
          loading: false,
          error: null,
          updatedAt: Math.max(0, hit.expires - ttl),
          stale: !fresh,
        })
        if (fresh && mode === 'auto') return Promise.resolve(hit.value)
      } else if (mode !== 'silent') {
        setState((prev) => ({ ...prev, loading: true, error: null }))
      }

      return fetchOnce(key, () => factoryRef.current())
        .then((value) => {
          writeCache(key, value, ttl)
          if (aliveRef.current) {
            setState({ data: value, loading: false, error: null, updatedAt: Date.now(), stale: false })
          }
          return value
        })
        .catch((error) => {
          if (aliveRef.current) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error : new Error('Gagal memuat data.'),
            }))
          }
          return null
        })
    },
    [enabled, key, ttl],
  )

  useEffect(() => {
    if (!enabled || !key) {
      setState({ data: null, loading: false, error: null, updatedAt: 0, stale: false })
      return
    }
    run('auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  const refresh = useCallback(() => run('force'), [run])
  const revalidate = useCallback(() => run('silent'), [run])

  return { ...state, refresh, revalidate }
}
