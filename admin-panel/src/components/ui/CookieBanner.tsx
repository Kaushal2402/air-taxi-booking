import { useState, useEffect } from 'react'
import { usePlatformStore } from '../../store/platformStore'

const STORAGE_KEY = 'cookie_notice_dismissed'

export default function CookieBanner() {
  const cookieBannerEnabled = usePlatformStore(s => s.consent_cookie_banner)
  const [dismissed, setDismissed] = useState(true) // start hidden; check localStorage

  useEffect(() => {
    const already = localStorage.getItem(STORAGE_KEY)
    setDismissed(!!already)
  }, [])

  if (!cookieBannerEnabled || dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2000,
      background: 'var(--ink-1)',
      color: '#fff',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      fontSize: 13,
      boxShadow: '0 -2px 12px rgba(0,0,0,.25)',
    }}>
      <span>
        We use cookies and similar technologies to operate this platform and, where you have
        consented, for analytics and marketing. See our{' '}
        <span style={{ textDecoration: 'underline', cursor: 'default', opacity: 0.8 }}>
          Privacy Policy
        </span>{' '}
        for details.
      </span>
      <button
        onClick={handleDismiss}
        style={{
          background: '#fff',
          color: 'var(--ink-1)',
          border: 'none',
          borderRadius: 4,
          padding: '6px 18px',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Accept &amp; close
      </button>
    </div>
  )
}
