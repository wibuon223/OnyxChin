import { useCallback, useEffect, useState } from 'react'

const NAVIGATE_EVENT = 'app:navigate'

function parseLocation(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/'
  const segments = clean.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { path: '/', params: {}, name: 'home' }
  }

  if (segments[0] === 'anime') {
    if (segments.length >= 2) {
      return { path: clean, params: { slug: segments[1] }, name: 'anime' }
    }
    return { path: clean, params: {}, name: 'browse' }
  }

  if (segments[0] === 'watch' && segments.length >= 2) {
    return { path: clean, params: { slug: segments[1] }, name: 'watch' }
  }

  if (segments[0] === 'search') {
    return { path: clean, params: {}, name: 'search' }
  }

  if (segments[0] === 'history') {
    return { path: clean, params: {}, name: 'history' }
  }

  return { path: clean, params: {}, name: 'notfound' }
}

export function navigate(to) {
  if (typeof to !== 'string' || !to.startsWith('/')) return
  if (to === window.location.pathname + window.location.search) {
    window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { path: to } }))
    return
  }
  window.history.pushState({}, '', to)
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { path: to } }))
}

/** Sama seperti navigate(), tapi mengganti entri history (tanpa nambah back-step). */
export function replaceNavigate(to) {
  if (typeof to !== 'string' || !to.startsWith('/')) return
  window.history.replaceState({}, '', to)
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { path: to } }))
}

export function useRoute() {
  const [state, setState] = useState(() => {
    const parsed = parseLocation(window.location.pathname)
    return {
      ...parsed,
      search: window.location.search,
      query: new URLSearchParams(window.location.search).get('q') || '',
    }
  })

  const sync = useCallback(() => {
    const parsed = parseLocation(window.location.pathname)
    setState({
      ...parsed,
      search: window.location.search,
      query: new URLSearchParams(window.location.search).get('q') || '',
    })
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', sync)
    window.addEventListener(NAVIGATE_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(NAVIGATE_EVENT, sync)
    }
  }, [sync])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [state.path])

  return { path: state.path, params: state.params, name: state.name, query: state.query, navigate }
}

export default useRoute
