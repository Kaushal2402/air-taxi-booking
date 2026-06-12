interface BrandLockupProps {
  size?: 'md' | 'lg'
  org?: string
}

export default function BrandLockup({ size = 'md', org = 'Operator Console' }: BrandLockupProps) {
  const isLg = size === 'lg'
  const markSize = isLg ? 28 : 22
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 12 : 10, color: 'var(--ink)' }}>
      <svg width={markSize} height={markSize} viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7.5 6.5v9M14.5 6.5v9M7.5 11h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: isLg ? 16 : 14,
          letterSpacing: '0.02em',
        }}>
          {org}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: isLg ? 10.5 : 9.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginTop: 4,
        }}>
          Operator Console
        </span>
      </div>
    </div>
  )
}
