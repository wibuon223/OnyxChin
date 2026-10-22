import { useCallback, useEffect, useRef, useState } from 'react'

export function useAsync(promiseFactory, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [attempt, setAttempt] = useState(0)
  const factoryRef = useRef(promiseFactory)
  factoryRef.current = promiseFactory

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: null, data: null })
    Promise.resolve()
      .then(() => factoryRef.current())
      .then((data) => {
        if (alive) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        if (!alive) return
        setState({
          loading: false,
          error: error instanceof Error ? error : new Error('Gagal memuat data.'),
          data: null,
        })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { ...state, retry }
}

export default useAsync
