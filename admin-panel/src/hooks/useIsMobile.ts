import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}

export function useIsTablet(breakpoint = 1024) {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsTablet(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isTablet
}

// Compact desktop: between 1024–1439px where the topbar gets crowded
export function useIsCompact(breakpoint = 1440) {
  const [isCompact, setIsCompact] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsCompact(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isCompact
}
