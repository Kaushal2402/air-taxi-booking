import { useState, useEffect } from 'react'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { pricingService } from '../../services/pricingService'
import type { TaxRule } from '../../services/pricingService'

// ── Empty form state ──────────────────────────────────────────────────────────

const EMPTY_TAX: Partial<TaxRule> = {
  name: '',
  hsn_code: '',
  rate: 5,
  jurisdiction: '',
  inclusive: false,
  active: true,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TaxesPage() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const [taxes, setTaxes]         = useState<TaxRule[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<TaxRule | null>(null)
  const [draft, setDraft]         = useState<Partial<TaxRule>>(EMPTY_TAX)
  const [isNew, setIsNew]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [apiError, setApiError]   = useState('')
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<TaxRule | null>(null)
  const [notice, setNotice] = useState('')

  const loadTaxes = async () => {
    setLoading(true)
    try {
      const res = await pricingService.listTaxes({ per_page: 100 })
      setTaxes(res.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTaxes() }, [])

  const selectTax = (t: TaxRule) => {
    setSelected(t)
    setIsNew(false)
    setDraft({ ...t })
    setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const startNew = () => {
    setSelected(null)
    setIsNew(true)
    setDraft({ ...EMPTY_TAX })
    setApiError('')
    if (isMobile) setShowMobileEditor(true)
  }

  const patch = <K extends keyof TaxRule>(k: K, v: TaxRule[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  const save = async () => {
    if (!draft.name?.trim()) { setApiError('Name is required'); return }
    if (!draft.hsn_code?.trim()) { setApiError('HSN/SAC code is required'); return }
    setSaving(true); setApiError('')
    try {
      if (isNew) {
        await pricingService.createTax(draft)
      } else if (selected) {
        await pricingService.updateTax(selected.id, draft)
      }
      await loadTaxes()
      setIsNew(false)
      setSelected(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const discard = () => {
    if (selected) setDraft({ ...selected })
    else { setIsNew(false); setSelected(null) }
    setApiError('')
  }

  const deleteTax = async (t: TaxRule) => {
    try {
      await pricingService.deleteTax(t.id)
      await loadTaxes()
      if (selected?.id === t.id) { setSelected(null); setIsNew(false) }
    } catch {
      setApiError('Delete failed')
    }
    setConfirmDelete(null)
  }

  const showEditor = isNew || selected !== null
  const isTwoPanel = !isMobile && !isTablet

  // KPI metrics
  const activeCount  = taxes.filter(t => t.active).length
  const highRateCount = taxes.filter(t => t.rate >= 12).length
  const passThroughCount = taxes.filter(t => t.hsn_code === 'TOLL').length

  return (
    <Shell
      activeId="pricing"
      breadcrumb="Catalog & Pricing · Pricing · Taxes"
      title="Tax rules"
      subtitle={`${taxes.length} rules · GST/HSN-coded · per jurisdiction`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => setNotice('Tax statement export will be available once the Payments module is connected.')}>
            <Icon name="download" size={13} />Tax statement export
          </button>
          <button className="btn sm accent" onClick={startNew}>
            <Icon name="plus" size={13} />New tax rule
          </button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '16px' : '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Notice banner */}
        {notice && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderRadius: 3, fontSize: 13, color: 'var(--ink-2)',
          }}>
            <Icon name="info" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{notice}</span>
            <button
              onClick={() => setNotice('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        {/* Hero strip */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {([
            ['Active rules',        String(activeCount),     `Of ${taxes.length} configured`],
            ['Tax collected · MTD', '— · Connect billing for live data', 'Across jurisdictions'],
            [`Rentals · 12% GST`,   String(highRateCount),   'Higher slab rules'],
            ['Pass-through',        String(passThroughCount), 'Tolls only · not Acme revenue'],
          ] as [string, string, string][]).map(([k, v, m], i) => (
            <div key={k} style={{
              padding: isMobile ? '12px 14px' : '18px 22px',
              borderRight: isMobile
                ? (i % 2 === 0 ? '1px solid var(--rule)' : 'none')
                : (i < 3 ? '1px solid var(--rule)' : 'none'),
              borderBottom: isMobile && i < 2 ? '1px solid var(--rule)' : 'none',
            }}>
              <div className="t-label" style={{ padding: 0 }}>{k}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 26 }}>{v}</div>
              <div className="t-meta" style={{ marginTop: 6 }}>{m}</div>
            </div>
          ))}
        </div>

        {/* Main area: table + optional editor */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isTwoPanel && showEditor ? '1fr 380px' : '1fr',
          gap: 18,
          alignItems: 'start',
        }}>

          {/* Table */}
          {(!isMobile || !showMobileEditor) && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {loading && <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}
              {!loading && (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="tbl" style={{ minWidth: isMobile ? 700 : undefined }}>
                    <thead>
                      <tr>
                        <th>Tax</th>
                        <th>HSN/SAC</th>
                        <th>Rate</th>
                        <th>Jurisdiction</th>
                        <th>Inclusive / Exclusive</th>
                        <th>In use</th>
                        <th>Status</th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {taxes.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0' }}>
                            No tax rules yet. Add one →
                          </td>
                        </tr>
                      ) : taxes.map(t => {
                        const isSel = selected?.id === t.id
                        return (
                          <tr
                            key={t.id}
                            className={isSel ? 'selected' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => selectTax(t)}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon name="tag" size={14} style={{ color: 'var(--ink-3)' }} />
                                <span style={{ fontSize: 13 }}>{t.name}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 11,
                                padding: '2px 6px', background: 'var(--surface-2)',
                                border: '1px solid var(--rule)', borderRadius: 2,
                              }}>{t.hsn_code}</span>
                            </td>
                            <td>
                              <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: 14,
                                color: t.rate >= 10 ? 'var(--warn)' : 'var(--ink)',
                              }}>
                                {t.rate === 0 ? 'Pass-through' : `${t.rate}%`}
                              </span>
                            </td>
                            <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{t.jurisdiction}</td>
                            <td>
                              <span className="badge">{t.inclusive ? 'Inclusive' : 'Exclusive'}</span>
                            </td>
                            <td className="t-meta" style={{ color: 'var(--ink-2)' }}>{t.in_use ?? '—'}</td>
                            <td>
                              {t.active
                                ? <span className="badge ok"><span className="dot ok" />Active</span>
                                : <span className="badge"><span className="dot pending" />Reserved</span>
                              }
                            </td>
                            <td>
                              <button
                                className="btn ghost icon sm"
                                onClick={e => {
                                  e.stopPropagation()
                                  selectTax(t)
                                }}
                                title="Edit"
                              >
                                <Icon name="moreVert" size={14} />
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

          {/* Editor panel */}
          {showEditor && (!isMobile || showMobileEditor) && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
              {/* Mobile back */}
              {isMobile && (
                <button
                  onClick={() => { setShowMobileEditor(false); setSelected(null); setIsNew(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', width: '100%', fontSize: 13, color: 'var(--accent)',
                    background: 'var(--surface-2)', border: 'none',
                    borderBottom: '1px solid var(--rule)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <Icon name="chevLeft" size={14} stroke={2} />
                  Back to Taxes
                </button>
              )}

              <div style={{
                padding: '15px 20px', borderBottom: '1px solid var(--rule)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
              }}>
                <div>
                  <div className="t-label">{isNew ? 'New tax rule' : 'Editing'}</div>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.016em' }}>
                    {isNew ? 'Untitled rule' : (draft.name || selected?.name)}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn sm" onClick={discard}>Discard</button>
                  <button className="btn sm accent" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  {!isNew && selected && (
                    <button
                      className="btn sm ghost"
                      onClick={() => setConfirmDelete(selected)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </div>
              </div>

              {apiError && (
                <div style={{
                  margin: '14px 20px 0',
                  padding: '9px 12px',
                  background: 'var(--danger-soft)',
                  border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
                  borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
                }}>
                  {apiError}
                </div>
              )}

              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div className="field">
                  <label className="field-label">Tax name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div className="input">
                    <input
                      value={draft.name ?? ''}
                      onChange={e => patch('name', e.target.value)}
                      placeholder="GST · Ride hailing"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label className="field-label">HSN/SAC code <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div className="input">
                      <input
                        value={draft.hsn_code ?? ''}
                        onChange={e => patch('hsn_code', e.target.value)}
                        placeholder="9964"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Rate · %</label>
                    <div className="input">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={draft.rate ?? 5}
                        onChange={e => patch('rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Jurisdiction</label>
                  <div className="input">
                    <input
                      value={draft.jurisdiction ?? ''}
                      onChange={e => patch('jurisdiction', e.target.value)}
                      placeholder="IN · Central"
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.inclusive ?? false}
                    onChange={e => patch('inclusive', e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Tax inclusive (included in displayed price)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.active ?? true}
                    onChange={e => patch('active', e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Rule active
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Compliance section */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 20,
        }}>
          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Compliance</div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400 }}>
              Invoices auto-generated · GSTN-ready
            </h3>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Each completed trip produces a tax-compliant customer invoice and a tax-compliant driver statement.
              Inter-state trips automatically apply IGST. Pass-through items (tolls) are itemised separately for transparency.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12.5 }}>Invoices issued · April</div>
              <span className="num" style={{ color: 'var(--ink-2)' }}>1,84,210</span>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12.5 }}>Driver tax statements · April</div>
              <span className="num" style={{ color: 'var(--ink-2)' }}>1,520</span>
            </div>
            <div style={{ padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="alert" size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12.5 }}>HSN review queue</div>
              <span className="num" style={{ color: 'var(--warn)' }}>3 pending</span>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          title="Delete tax rule"
          description="This tax rule will be permanently deleted."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteTax(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Shell>
  )
}
