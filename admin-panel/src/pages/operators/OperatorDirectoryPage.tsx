import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { operatorService } from '../../services/operatorService'
import type { Operator, CreateOperatorBody } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'active')      return <span className="badge ok"><span className="dot ok" />Active</span>
  if (status === 'paused')      return <span className="badge warn"><span className="dot warn" />Paused</span>
  if (status === 'deactivated') return <span className="badge"><span className="dot" />Deactivated</span>
  if (status === 'pending')     return <span className="badge info"><span className="dot info" />Pending</span>
  if (status === 'review')      return <span className="badge info"><span className="dot info" />Review</span>
  if (status === 'approved')    return <span className="badge ok"><span className="dot ok" />Approved</span>
  if (status === 'rejected')    return <span className="badge danger"><span className="dot danger" />Rejected</span>
  return <span className="badge">{status}</span>
}

function alertChip(op: Operator) {
  const today   = new Date()
  const in30    = new Date(); in30.setDate(today.getDate() + 30)
  const insExpiry = op.insurance_expiry ? new Date(op.insurance_expiry) : null
  const certExpiry = op.cert_expiry ? new Date(op.cert_expiry) : null
  if (insExpiry && insExpiry < today)  return 'Insurance expired'
  if (insExpiry && insExpiry < in30)   return 'Insurance expiring'
  if (certExpiry && certExpiry < today) return 'Cert expired'
  if (certExpiry && certExpiry < in30)  return 'Cert expiring'
  return null
}

// ── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateOperatorBody = { name: '', hq_city: '', cert_type: '', company_registration_no: '', notes: '' }

export default function OperatorDirectoryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [operators, setOperators]     = useState<Operator[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create modal
  const [showCreate, setShowCreate]   = useState(false)
  const [form, setForm]               = useState<CreateOperatorBody>({ ...EMPTY_FORM })
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const canCreateOperator = usePermission('operators.create')

  const load = async () => {
    setLoading(true)
    try {
      const params: { status?: string; search?: string; page_size?: number } = { page_size: 100 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search.trim()) params.search = search.trim()
      const res = await operatorService.listOperators(params)
      setOperators(res.items)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  const activeCount = operators.filter(o => o.status === 'active').length
  const totalFleet  = 0 // would need fleet_count summed from details

  const handleCreate = async () => {
    if (!form.name.trim()) { setCreateError('Name is required'); return }
    setCreating(true); setCreateError('')
    try {
      const created = await operatorService.createOperator(form)
      setShowCreate(false)
      setForm({ ...EMPTY_FORM })
      navigate(`/operators/${created.id}`)
    } catch {
      setCreateError('Failed to create operator')
    } finally {
      setCreating(false)
    }
  }

  // ── Mobile card ───────────────────────────────────────────────────────────
  const renderMobileCard = (op: Operator) => {
    const alert = alertChip(op)
    return (
      <div
        key={op.id}
        style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 4, padding: '14px', marginBottom: 10, cursor: 'pointer',
        }}
        onClick={() => navigate(`/operators/${op.id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{op.name}</div>
            <div className="t-meta" style={{ marginTop: 4 }}>
              {op.hq_city || '—'} · {op.cert_type || 'No cert'}
            </div>
          </div>
          {statusBadge(op.status)}
        </div>
        {alert && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--warn)' }}>
            <Icon name="alert" size={12} />
            {alert}
          </div>
        )}
      </div>
    )
  }

  return (
    <Shell
      activeId="operators"
      breadcrumb="Operations · Air Operators"
      title="Air operators"
      subtitle={`${operators.length} onboarded · ${activeCount} active`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => navigate('/operators/onboarding')}>Onboarding queue</button>
          <button style={{ display: canCreateOperator ? undefined : 'none' }} className="btn sm accent" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={13} />Add operator
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stat bar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        }}>
          {[
            { l: 'Total operators',  v: String(operators.length),                       tone: 'var(--ink)' },
            { l: 'Active',           v: String(activeCount),                             tone: 'var(--accent)' },
            { l: 'Paused',           v: String(operators.filter(o => o.status === 'paused').length),       tone: 'var(--warn)' },
            { l: 'Pending / Review', v: String(operators.filter(o => o.status === 'pending' || o.status === 'review').length), tone: 'var(--info)' },
            { l: 'Fleet size',       v: String(totalFleet || '—'),                       tone: 'var(--ink-2)' },
          ].map((s, i) => (
            <div key={s.l} style={{
              padding: isMobile ? '12px 14px' : '16px 20px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 4 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 4 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label">{s.l}</div>
              <div style={{
                marginTop: 6, fontFamily: 'var(--font-serif)',
                fontSize: isMobile ? 22 : 26, fontWeight: 400, letterSpacing: '-0.02em', color: s.tone,
              }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <form
          onSubmit={handleSearch}
          style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}
        >
          <div className="input" style={{ width: 260, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Name, HQ, cert type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10 }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
          <button type="submit" className="btn sm">Search</button>
        </form>

        {/* Mobile cards */}
        {isMobile ? (
          loading ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : operators.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>
              No operators found.
            </div>
          ) : (
            operators.map(renderMobileCard)
          )
        ) : (
          /* Desktop table */
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            {loading ? (
              <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="tbl" style={{ minWidth: isTablet ? 800 : undefined }}>
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>HQ</th>
                      <th>Cert</th>
                      <th>Commission</th>
                      <th>Insurance expiry</th>
                      <th>Status</th>
                      <th>Alerts</th>
                      <th style={{ width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No operators found.
                        </td>
                      </tr>
                    ) : operators.map(op => {
                      const alert = alertChip(op)
                      return (
                        <tr
                          key={op.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/operators/${op.id}`)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 3, flexShrink: 0,
                                background: 'var(--surface-sunk)', color: 'var(--ink-2)',
                                border: '1px solid var(--rule)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Icon name="building" size={15} />
                              </div>
                              <div>
                                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{op.name}</div>
                                <div className="t-meta" style={{ marginTop: 2 }}>{op.company_registration_no || op.hq_city || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{op.hq_city || '—'}</td>
                          <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{op.cert_type || '—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {op.commission_pct != null ? `${op.commission_pct}%` : '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                            {op.insurance_expiry || '—'}
                          </td>
                          <td>{statusBadge(op.status)}</td>
                          <td>
                            {alert && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--warn)' }}>
                                <Icon name="alert" size={11} />
                                {alert}
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn sm ghost"
                              onClick={e => { e.stopPropagation(); navigate(`/operators/${op.id}`) }}
                            >
                              View detail
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create operator modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 440, background: 'var(--surface)',
            border: '1px solid var(--rule)', boxShadow: 'var(--shadow-pop)', padding: '28px',
          }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Add new operator
            </h3>
            {createError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', background: 'var(--danger-soft)',
                border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
              }}>{createError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label">Operator name *</label>
                <div className="input">
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="BlueSky Heliservices"
                    autoFocus
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">HQ City</label>
                <div className="input">
                  <input
                    value={form.hq_city ?? ''}
                    onChange={e => setForm(f => ({ ...f, hq_city: e.target.value }))}
                    placeholder="Bengaluru"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Cert type</label>
                <div className="input">
                  <input
                    value={form.cert_type ?? ''}
                    onChange={e => setForm(f => ({ ...f, cert_type: e.target.value }))}
                    placeholder="NSOP"
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Registration no.</label>
                <div className="input">
                  <input
                    value={form.company_registration_no ?? ''}
                    onChange={e => setForm(f => ({ ...f, company_registration_no: e.target.value }))}
                    placeholder="Company reg number"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowCreate(false); setCreateError(''); setForm({ ...EMPTY_FORM }) }}>
                Cancel
              </button>
              <button className="btn sm accent" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create operator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
