import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { rbacService } from '../../services/rbacService'
import type { PermissionDomainGroup, PermissionCatalogItem } from '../../services/rbacService'

export default function PermissionsCatalogPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  useIsTablet()

  const [domains, setDomains] = useState<PermissionDomainGroup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeDomain, setActiveDomain] = useState('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    rbacService.getPermissionCatalog()
      .then(data => {
        setDomains(data.domains)
        setTotal(data.total)
        if (data.domains.length > 0) setActiveDomain(data.domains[0].domain)
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [])

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  const activeDomainData = domains.find(d => d.domain === activeDomain)
  const filteredPerms: PermissionCatalogItem[] = activeDomainData
    ? activeDomainData.items.filter(p =>
        !search || p.key.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const allFilteredPerms: PermissionCatalogItem[] = search
    ? domains.flatMap(d => d.items.filter(p =>
        p.key.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
      ))
    : filteredPerms

  const displayPerms = search ? allFilteredPerms : filteredPerms

  const activeDomainIdx = domains.findIndex(d => d.domain === activeDomain)
  const prevDomain = activeDomainIdx > 0 ? domains[activeDomainIdx - 1] : null
  const nextDomain = activeDomainIdx < domains.length - 1 ? domains[activeDomainIdx + 1] : null

  return (
    <Shell
      activeId="rbac"
      breadcrumb="System · Identity & Access · Permissions"
      title="Permission catalog"
      subtitle={`Canonical registry · ${total} permissions across ${domains.length} domains`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/rbac')}>
            <Icon name="external" size={13} />Open in roles
          </button>
        </div>
      }
    >
      <div style={{
        padding: isMobile ? '12px 16px 24px' : '20px 32px 28px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '220px 1fr',
        gap: 24,
      }}>
        {/* Left domain index */}
        {!isMobile && (
          <aside>
            <div className="input" style={{ height: 32, marginBottom: 14 }}>
              <Icon name="search" size={14} className="icon" />
              <input
                placeholder="Search permission key…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="t-label" style={{ marginBottom: 8 }}>Domains</div>
            {domains.map(d => (
              <div
                key={d.domain}
                onClick={() => { setActiveDomain(d.domain); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', margin: '0 -12px',
                  borderLeft: '2px solid ' + (d.domain === activeDomain ? 'var(--accent)' : 'transparent'),
                  background: d.domain === activeDomain ? 'var(--surface-2)' : 'transparent',
                  color: d.domain === activeDomain ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 13, fontWeight: d.domain === activeDomain ? 500 : 400, cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1 }}>{d.domain}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>{d.items.length}</span>
              </div>
            ))}
          </aside>
        )}

        {/* Right — domain content */}
        <div>
          {isMobile && (
            <div style={{ marginBottom: 14 }}>
              <div className="input" style={{ height: 32, marginBottom: 10 }}>
                <Icon name="search" size={14} className="icon" />
                <input
                  placeholder="Search permission key…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                value={activeDomain}
                onChange={e => setActiveDomain(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--rule-strong)', borderRadius: 3, background: 'var(--surface)', fontSize: 13 }}
              >
                {domains.map(d => <option key={d.domain} value={d.domain}>{d.domain} ({d.items.length})</option>)}
              </select>
            </div>
          )}

          {!search && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div className="t-label">Domain</div>
                <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 26, fontWeight: 400, letterSpacing: '-0.018em' }}>
                  {activeDomain} <span style={{ color: 'var(--ink-3)' }}>· {activeDomainData?.items.length ?? 0} permissions</span>
                </h2>
              </div>
              {!isMobile && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {prevDomain && (
                    <button className="btn sm ghost" onClick={() => setActiveDomain(prevDomain.domain)}>
                      ← {prevDomain.domain}
                    </button>
                  )}
                  {nextDomain && (
                    <button className="btn sm" onClick={() => setActiveDomain(nextDomain.domain)}>
                      {nextDomain.domain} →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {search && (
            <div style={{ marginBottom: 14 }}>
              <div className="t-label">Search results</div>
              <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>
                "{search}" <span style={{ color: 'var(--ink-3)' }}>· {displayPerms.length} matches</span>
              </h2>
            </div>
          )}

          {loading ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: isMobile ? 500 : undefined }}>
                  <thead>
                    <tr>
                      <th>Permission key</th>
                      <th>Description</th>
                      {!isMobile && <th>Domain</th>}
                      <th>Held by</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPerms.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '24px 0' }}>
                          No permissions found.
                        </td>
                      </tr>
                    ) : displayPerms.map(p => (
                      <tr key={p.key}>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 12,
                            background: 'var(--surface-2)', border: '1px solid var(--rule)',
                            padding: '3px 8px', borderRadius: 2, color: 'var(--ink)',
                            display: 'inline-block',
                          }}>{p.key}</span>
                        </td>
                        <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{p.description}</td>
                        {!isMobile && <td className="t-meta">{p.domain}</td>}
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent)' }}>
                            {p.held_by} role{p.held_by !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn ghost icon sm"
                            onClick={() => copyKey(p.key)}
                            title="Copy key"
                          >
                            <Icon name={copied === p.key ? 'check' : 'copy'} size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
