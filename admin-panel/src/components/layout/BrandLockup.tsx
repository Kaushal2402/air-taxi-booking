interface BrandLockupProps {
  size?: 'md' | 'lg'
}

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="0.5" y="0.5" width="21" height="21" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 4 18 11 11 18 4 11Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="11" r="1.6" fill="currentColor" />
    </svg>
  )
}

export default function BrandLockup({ size = 'md' }: BrandLockupProps) {
  const isLg = size === 'lg'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 12 : 10, color: 'var(--ink)' }}>
      <BrandMark size={isLg ? 28 : 22} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: isLg ? 16 : 14,
          letterSpacing: '0.02em',
        }}>Acme Mobility</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: isLg ? 10.5 : 9.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginTop: 4,
        }}>Operations Console</span>
      </div>
    </div>
  )
}
