import Shell from '../../components/layout/Shell'

export default function DashboardPage() {
  return (
    <Shell activeId="dashboard" title="Dashboard" subtitle="Overview">
      <div style={{ padding: 32 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}>
          {[
            { label: 'Active Flights', value: '—', color: 'var(--info)' },
            { label: 'Pending Bookings', value: '—', color: 'var(--warn)' },
            { label: 'Fleet Available', value: '—', color: 'var(--ok)' },
            { label: 'Crew On Duty', value: '—', color: 'var(--accent)' },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--rule)',
                borderRadius: 6,
                padding: '20px 24px',
              }}
            >
              <div className="t-label" style={{ marginBottom: 8 }}>{card.label}</div>
              <div style={{
                fontSize: 28,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                color: card.color,
              }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: '24px',
        }}>
          <div className="t-label" style={{ marginBottom: 16 }}>Recent Activity</div>
          <div style={{
            color: 'var(--ink-4)',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
            padding: '32px 0',
          }}>
            No recent activity
          </div>
        </div>
      </div>
    </Shell>
  )
}
