import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  // Always initialize to false so the SSR HTML and the first browser render match.
  // useEffect updates to the actual value after hydration, preventing errors #418/#423/#425.
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
