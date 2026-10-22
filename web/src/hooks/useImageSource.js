import { useEffect, useMemo, useState } from 'react'
import { resolveAsset } from '../utils'

/**
 * Poster/thumbnail memakai dua sumber: URL absolut dari upstream dulu,
 * lalu proxy relay (/api/proxy?u=...) sebagai cadangan. Kalau dua-duanya
 * gagal, pemanggil merender placeholder.
 */
export function useImageSource(url) {
  const [stage, setStage] = useState(0)
  const [failed, setFailed] = useState(false)

  const sources = useMemo(() => {
    const direct = resolveAsset(url)
    if (!direct) return []
    const list = [direct]
    if (/^https?:\/\//i.test(direct)) {
      list.push(`/api/proxy?u=${encodeURIComponent(direct)}`)
    }
    return list
  }, [url])

  useEffect(() => {
    setStage(0)
    setFailed(false)
  }, [url])

  const exhausted = failed || sources.length === 0
  const src = exhausted ? '' : sources[Math.min(stage, sources.length - 1)]

  const handleError = () => {
    setStage((current) => {
      if (current + 1 < sources.length) return current + 1
      setFailed(true)
      return current
    })
  }

  return { src, failed: exhausted, onError: handleError }
}

export default useImageSource
