import { useState, useEffect } from 'react'
import { usePermission } from '../../hooks/usePermission'
import { useNavigate } from 'react-router-dom'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { operatorService } from '../../services/operatorService'
import type { Aircraft, Operator, CreateAircraftBody } from '../../services/operatorService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'ready')          return <span className="badge ok"><span className="dot ok" />Ready</span>
  if (status === 'maintenance')    return <span className="badge warn"><span className="dot warn" />Maint.</span>
  if (status === 'grounded')       return <span className="badge danger"><span className="dot danger" />Grounded</span>
  return <span className="badge info"><span className="dot info" />Pending</span>
}

function airworthinessBadge(status: string) {
  if (status === 'ok')       return <span className="badge ok"><span className="dot ok" />OK</span>
  if (status === 'expiring') return <span className="badge warn"><span className="dot warn" />Expiring</span>
  return <span className="badge danger"><span className="dot danger" />Expired</span>
}

function rowBorderColor(a: Aircraft): string {
  if (a.airworthiness_status === 'expired')  return '3px solid var(--danger)'
  if (a.airworthiness_status === 'expiring') return '3px solid var(--warn)'
  return 'none'
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY: CreateAircraftBody = {
  operator_id: '',
  registration_mark: '',
  seat_capacity: 6,
  aircraft_type_id: '',
  mtow_kg: undefined,
  range_nm: undefined,
  airworthiness_expiry: '',
  notes: '',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AircraftDirectoryPage() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const isTablet  = useIsTablet()

  const [aircraft, setAircraft]     = useState<Aircraft[]>([])
  const [operators, setOperators]   = useState<Operator[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [operatorFilter, setOperatorFilter] = useState('all')
  const [airworthinessFilter, setAirworthinessFilter] = useState('all')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState<CreateAircraftBody>({ ...EMPTY })
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState('')
  const canManageAircraft = usePermission('aircraft.manage')

  const load = async () => {
    setLoading(true)
    try {
      const params: { operator_id?: string; status?: string; search?: string; page_size?: number } = { page_size: 100 }
      if (operatorFilter !== 'all') params.operator_id = operatorFilter
      if (statusFilter !== 'all')   params.status = statusFilter
      if (search.trim())            params.search = search.trim()
      const res = await operatorService.listAircraft(params)
      let items = res.items
      if (airworthinessFilter !== 'all') {
        items = items.filter(a => a.airworthiness_status === airworthinessFilter)
      }
      setAircraft(items)
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }

  const loadOperators = async () => {
    try {
      const res = await operatorService.listOperators({ page_size: 100 })
      setOperators(res.items)
    } catch { /* silently fail */ }
  }

  useEffect(() => { load(); loadOperators() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [statusFilter, operatorFilter, airworthinessFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  const handleCreate = async () => {
    if (!form.operator_id)       { setCreateError('Operator is required'); return }
    if (!form.registration_mark) { setCreateError('Registration mark is required'); return }
    setCreating(true); setCreateError('')
    try {
      const created = await operatorService.createAircraft(form)
      setShowCreate(false); setForm({ ...EMPTY })
      navigate(`/aircraft/${created.id}`)
    } catch {
      setCreateError('Failed to create aircraft')
    } finally {
      setCreating(false)
    }
  }

  const operatorsMap: Record<string, string> = Object.fromEntries(operators.map(o => [o.id, o.name]))

  const readyCount    = aircraft.filter(a => a.status === 'ready').length
  const maintCount    = aircraft.filter(a => a.status === 'maintenance').length
  const groundedCount = aircraft.filter(a => a.status === 'grounded').length

  // ── Mobile card ───────────────────────────────────────────────────────────
  const renderMobileCard = (a: Aircraft) => (
    <div
      key={a.id}
      style={{
        background: 'var(--surface)', border: '1px solid var(--rule)',
        borderLeft: rowBorderColor(a),
        borderRadius: 4, padding: '14px', marginBottom: 10, cursor: 'pointer',
      }}
      onClick={() => navigate(`/aircraft/${a.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)' }}>
            {a.registration_mark}
          </div>
          <div className="t-meta" style={{ marginTop: 4 }}>
            {a.seat_capacity} seats · {a.mtow_kg ? `${a.mtow_kg.toLocaleString()} kg` : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {statusBadge(a.status)}
          {airworthinessBadge(a.airworthiness_status)}
        </div>
      </div>
    </div>
  )

  return (
    <Shell
      activeId="aircraft"
      breadcrumb="Operations · Aircraft & Crew · Aircraft"
      title="Aircraft directory"
      subtitle={`${aircraft.length} aircraft · ${readyCount} ready · ${maintCount} maintenance · ${groundedCount} grounded`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm accent" onClick={() => setShowCreate(true)}>
            <Icon name="plus" size={13} />Add aircraft
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '12px 16px 24px' : '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stat tabs */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {[
            { l: 'All aircraft',   v: String(aircraft.length), f: 'all',         tone: 'var(--ink)' },
            { l: 'Ready',          v: String(readyCount),       f: 'ready',       tone: 'var(--accent)' },
            { l: 'Maintenance',    v: String(maintCount),       f: 'maintenance', tone: 'var(--warn)' },
            { l: 'Grounded',       v: String(groundedCount),    f: 'grounded',    tone: 'var(--danger)' },
          ].map((s, i) => (
            <div
              key={s.l}
              style={{
                padding: isMobile ? '12px 14px' : '14px 18px',
                borderRight: isMobile
                  ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                  : (i < 3 ? '1px solid var(--rule)' : 'none'),
                borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
                borderBottomWidth: statusFilter === s.f ? 2 : undefined,
                borderBottomColor: statusFilter === s.f ? 'var(--accent)' : undefined,
                background: statusFilter === s.f ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => setStatusFilter(s.f)}
            >
              <div style={{ fontSize: 12.5, color: statusFilter === s.f ? 'var(--ink)' : 'var(--ink-2)' }}>{s.l}</div>
              <div style={{
                marginTop: 4, fontFamily: 'var(--font-serif)',
                fontSize: isMobile ? 20 : 22, fontWeight: 400, color: s.tone,
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
          <div className="input" style={{ width: 240, height: 32 }}>
            <Icon name="search" size={14} className="icon" />
            <input
              placeholder="Registration, type, operator…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
            <select
              value={operatorFilter}
              onChange={e => setOperatorFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10 }}
            >
              <option value="all">All operators</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          <div className="input" style={{ height: 32, padding: 0, paddingLeft: 10 }}>
            <select
              value={airworthinessFilter}
              onChange={e => setAirworthinessFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10 }}
            >
              <option value="all">Any airworthiness</option>
              <option value="ok">OK</option>
              <option value="expiring">Expiring</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <button type="submit" className="btn sm">Search</button>
        </form>

        {/* Mobile cards */}
        {isMobile ? (
          loading ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : aircraft.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>No aircraft found.</div>
          ) : (
            aircraft.map(renderMobileCard)
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
                      <th>Registration · Type</th>
                      <th>Operator</th>
                      <th>Seats</th>
                      <th>MTOW · kg</th>
                      <th>Range · nm</th>
                      <th>Hours</th>
                      <th>Airworthy</th>
                      <th>Status</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {aircraft.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                          No aircraft found.
                        </td>
                      </tr>
                    ) : aircraft.map(a => (
                      <tr
                        key={a.id}
                        style={{
                          cursor: 'pointer',
                          borderLeft: rowBorderColor(a),
                        }}
                        onClick={() => navigate(`/aircraft/${a.id}`)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 28, borderRadius: 2, flexShrink: 0,
                              background: 'var(--accent)', color: 'var(--surface)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon name="helipad" size={14} stroke={1.4} />
                            </div>
                            <div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
                                {a.registration_mark}
                              </div>
                              <div className="t-meta" style={{ marginTop: 2 }}>{a.aircraft_type_id || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>{operatorsMap[a.operator_id] || a.operator_id}</td>
                        <td className="num">{a.seat_capacity}</td>
                        <td className="num">{a.mtow_kg ? a.mtow_kg.toLocaleString() : '—'}</td>
                        <td className="num">{a.range_nm || '—'}</td>
                        <td className="num">{a.total_hours?.toLocaleString() || '—'}</td>
                        <td>{airworthinessBadge(a.airworthiness_status)}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>
                          <button
                            className="btn ghost icon sm"
                            onClick={e => { e.stopPropagation(); navigate(`/aircraft/${a.id}`) }}
                          >
                            <Icon name="chevRight" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create aircraft modal */}
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
              Add new aircraft
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
                <label className="field-label">Operator *</label>
                <div className="input" style={{ padding: 0, paddingLeft: 10 }}>
                  <select
                    value={form.operator_id}
                    onChange={e => setForm(f => ({ ...f, operator_id: e.target.value }))}
                    style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', height: '100%', paddingRight: 10, flex: 1 }}
                  >
                    <option value="">Select operator…</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Registration mark *</label>
                <div className="input">
                  <input
                    value={form.registration_mark}
                    onChange={e => setForm(f => ({ ...f, registration_mark: e.target.value.toUpperCase() }))}
                    placeholder="VT-BSE"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label className="field-label">Seats</label>
                  <div className="input">
                    <input
                      type="number" min={1}
                      value={form.seat_capacity}
                      onChange={e => setForm(f => ({ ...f, seat_capacity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">MTOW · kg</label>
                  <div className="input">
                    <input
                      type="number" min={0}
                      value={form.mtow_kg ?? ''}
                      onChange={e => setForm(f => ({ ...f, mtow_kg: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="2722"
                    />
                  </div>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Airworthiness expiry</label>
                <div className="input">
                  <input
                    type="date"
                    value={form.airworthiness_expiry ?? ''}
                    onChange={e => setForm(f => ({ ...f, airworthiness_expiry: e.target.value || undefined }))}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn sm" onClick={() => { setShowCreate(false); setCreateError(''); setForm({ ...EMPTY }) }}>
                Cancel
              </button>
              <button className="btn sm accent" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Add aircraft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
