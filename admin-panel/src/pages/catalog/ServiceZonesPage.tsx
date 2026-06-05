import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon, CircleMarker, Marker, Polyline, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Shell from '../../components/layout/Shell'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile, useIsTablet } from '../../hooks/useIsMobile'
import { catalogService } from '../../services/catalogService'
import type { ServiceZone, VehicleClass, GeometryValidation } from '../../services/catalogService'
import { formatDate } from '../../lib/utils'
import { usePlatformStore } from '../../store/platformStore'

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCENT = '#0F8A5F'
const MAP_CENTER: [number, number] = [12.9716, 77.5946]   // Bengaluru
const MAP_ZOOM = 11

type ToolMode = 'move' | 'add_vertex' | 'remove_vertex' | 'draw_new'

const TOOLS: { mode: ToolMode; icon: string; label: string }[] = [
  { mode: 'move',          icon: 'move',   label: 'Move'       },
  { mode: 'add_vertex',    icon: 'plus',   label: 'Add vertex' },
  { mode: 'remove_vertex', icon: 'close',  label: 'Remove'     },
  { mode: 'draw_new',      icon: 'pencil', label: 'Draw new'   },
]

const ZONE_EMPTY_BASE: Omit<Partial<ServiceZone>, 'surge_cap'> = {
  code: '', name: '', tax_jurisdiction: '', priority: 10,
  active_service_codes: [], is_active: true, polygon: [],
}

// ── Map sub-components ─────────────────────────────────────────────────────────

// MapClickHandler uses a ref so the Leaflet event handler always sees the
// latest tool-mode even though useMapEvents only registers the listener once
// (react-leaflet v5 behaviour — stale-closure safe).
function MapClickHandler({ mode, onMapClick }: {
  mode: ToolMode
  onMapClick: (latlng: [number, number]) => void
}) {
  const ref = useRef({ mode, onMapClick })
  useEffect(() => { ref.current = { mode, onMapClick } })   // sync every render

  useMapEvents({
    click(e) {
      if (ref.current.mode === 'draw_new') {
        ref.current.onMapClick([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

function makeVertexIcon(mode: ToolMode): L.DivIcon {
  const cursor = mode === 'move' ? 'grab' : mode === 'remove_vertex' ? 'pointer' : 'default'
  const border = mode === 'remove_vertex' ? '#B23A3A' : ACCENT
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#fff;border:2.5px solid ${border};border-radius:3px;cursor:${cursor};box-shadow:0 1px 4px rgba(0,0,0,0.28);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}

function VertexHandle({ position, index, mode, onDragEnd, onRemove }: {
  position: [number, number]
  index: number
  mode: ToolMode
  onDragEnd: (index: number, pos: [number, number]) => void
  onRemove: (index: number) => void
}) {
  const icon = makeVertexIcon(mode)
  return (
    <Marker
      position={position}
      icon={icon}
      draggable={mode === 'move'}
      eventHandlers={{
        dragend(e) {
          const m = e.target as L.Marker
          const { lat, lng } = m.getLatLng()
          onDragEnd(index, [lat, lng])
        },
        click(e) {
          if (mode === 'remove_vertex') {
            L.DomEvent.stopPropagation(e as unknown as L.LeafletMouseEvent)
            onRemove(index)
          }
        },
      }}
    />
  )
}

function midpoints(poly: [number, number][]): Array<{ pt: [number, number]; afterIdx: number }> {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length]
    return { pt: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], afterIdx: i }
  })
}

// Flies the map to fit the given polygon whenever it changes (zone selection).
// Mounted inside MapContainer so useMap() works.
function MapController({ targetPolygon }: { targetPolygon: [number, number][] | null }) {
  const map = useMap()
  useEffect(() => {
    if (!targetPolygon || targetPolygon.length < 3) return
    try {
      const bounds = L.latLngBounds(targetPolygon.map(([lat, lng]) => L.latLng(lat, lng)))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true })
    } catch { /* ignore degenerate bounds */ }
  }, [targetPolygon, map])
  return null
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ServiceZonesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const surgeCeiling = usePlatformStore(s => s.surge_ceiling)
  const zoneEmpty = (): Partial<ServiceZone> => ({ ...ZONE_EMPTY_BASE, surge_cap: surgeCeiling })
  const [mobileTab, setMobileTab] = useState<'list' | 'map' | 'details'>('list')

  const [zones, setZones]                     = useState<ServiceZone[]>([])
  const [vehicleClasses, setVehicleClasses]   = useState<VehicleClass[]>([])
  const [showInactive, setShowInactive]       = useState(false)
  const [selected, setSelected]               = useState<ServiceZone | null>(null)
  const [isNew, setIsNew]                     = useState(false)
  const [draft, setDraft]                     = useState<Partial<ServiceZone>>(zoneEmpty)
  const [editPolygon, setEditPolygon]         = useState<[number, number][]>([])
  const [polyHistory, setPolyHistory]         = useState<[number, number][][]>([])
  const [toolMode, setToolMode]               = useState<ToolMode>('move')
  const [validation, setValidation]           = useState<GeometryValidation | null>(null)
  const [validating, setValidating]           = useState(false)
  const [loading, setLoading]                 = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [publishing, setPublishing]           = useState(false)
  const [apiError, setApiError]               = useState('')
  const [search, setSearch]                   = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState<ServiceZone | null>(null)
  const validateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a live ref to toolMode so Leaflet polygon event handlers (registered
  // once by react-leaflet v5) always see the current value without stale closures.
  const toolModeRef = useRef(toolMode)
  useEffect(() => { toolModeRef.current = toolMode }, [toolMode])

  // ── Data loading ─────────────────────────────────────────────
  const loadData = async (inactive: boolean) => {
    setLoading(true)
    try {
      const [z, vc] = await Promise.all([
        catalogService.listServiceZones(inactive),
        catalogService.listVehicleClasses(false),
      ])
      setZones(z)
      setVehicleClasses(vc)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }
  useEffect(() => { loadData(showInactive) }, [showInactive])

  // ── Geometry validation (debounced) ───────────────────────────
  const scheduleValidation = useCallback((poly: [number, number][]) => {
    if (validateTimer.current) clearTimeout(validateTimer.current)
    if (poly.length < 3) { setValidation(null); return }
    validateTimer.current = setTimeout(async () => {
      setValidating(true)
      try { setValidation(await catalogService.validateZoneGeometry(poly)) }
      catch { setValidation(null) }
      finally { setValidating(false) }
    }, 700)
  }, [])
  useEffect(() => { scheduleValidation(editPolygon) }, [editPolygon, scheduleValidation])

  // ── Selection / new ──────────────────────────────────────────
  const selectZone = (z: ServiceZone) => {
    setSelected(z); setIsNew(false)
    setDraft({ ...z })
    setEditPolygon(z.polygon ? [...z.polygon] : [])
    setPolyHistory([]); setToolMode('move'); setApiError('')
    if (isMobile) setMobileTab('details')
  }

  const startNew = () => {
    setSelected(null); setIsNew(true)
    setDraft(zoneEmpty())
    setEditPolygon([]); setPolyHistory([])
    setToolMode('draw_new'); setApiError('')
    if (isMobile) setMobileTab('map')
  }

  const patch = (k: keyof ServiceZone, v: unknown) => setDraft(d => ({ ...d, [k]: v }))

  // ── Map interaction ──────────────────────────────────────────
  const handleMapClick = (latlng: [number, number]) => {
    setPolyHistory(h => [...h, editPolygon])
    setEditPolygon(p => [...p, latlng])
  }

  const handleVertexDragEnd = (index: number, pos: [number, number]) => {
    setPolyHistory(h => [...h, editPolygon])
    setEditPolygon(p => { const n = [...p]; n[index] = pos; return n })
  }

  const handleVertexRemove = (index: number) => {
    if (editPolygon.length <= 3) return
    setPolyHistory(h => [...h, editPolygon])
    setEditPolygon(p => p.filter((_, i) => i !== index))
  }

  const handleMidpointClick = (pos: [number, number], afterIdx: number) => {
    setPolyHistory(h => [...h, editPolygon])
    setEditPolygon(p => {
      const n = [...p]
      n.splice(afterIdx + 1, 0, pos)
      return n
    })
  }

  const undo = () => {
    if (polyHistory.length === 0) return
    const prev = polyHistory[polyHistory.length - 1]
    setPolyHistory(h => h.slice(0, -1))
    setEditPolygon(prev)
  }

  const toggleService = (code: string) => {
    const cur = draft.active_service_codes ?? []
    patch('active_service_codes', cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code])
  }

  // ── CRUD ─────────────────────────────────────────────────────
  const save = async () => {
    if (!draft.code?.trim())    { setApiError('Zone code is required'); return }
    if (!draft.name?.trim())    { setApiError('Display name is required'); return }
    if (editPolygon.length < 3) { setApiError('Draw a polygon with at least 3 vertices'); return }
    setSaving(true); setApiError('')
    try {
      const payload = { ...draft, polygon: editPolygon }
      if (isNew) await catalogService.createServiceZone(payload)
      else if (selected) await catalogService.updateServiceZone(selected.id, payload)
      await loadData(showInactive)
      setIsNew(false); setSelected(null)
      if (isMobile) setMobileTab('list')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const discard = () => {
    if (selected) {
      setDraft({ ...selected })
      setEditPolygon(selected.polygon ? [...selected.polygon] : [])
    } else { setIsNew(false); setSelected(null); setEditPolygon([]) }
    setPolyHistory([]); setApiError('')
  }

  const deactivate = async (z: ServiceZone) => {
    try {
      await catalogService.deactivateServiceZone(z.id)
      await loadData(showInactive)
      if (selected?.id === z.id) { setSelected(null); setIsNew(false) }
    } catch { setApiError('Failed to deactivate') }
    setConfirmDeactivate(null)
  }

  const handlePublish = async (z: ServiceZone) => {
    setPublishing(true); setApiError('')
    try {
      const updated = await catalogService.publishServiceZone(z.id)
      await loadData(showInactive)
      setSelected(updated)
      setDraft({ ...updated })
      setEditPolygon(updated.polygon ? [...updated.polygon] : [])
      setPolyHistory([])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setApiError(err?.response?.data?.message || 'Publish failed')
    } finally { setPublishing(false) }
  }

  // ── Derived ──────────────────────────────────────────────────
  const filtered = search
    ? zones.filter(z =>
        z.name.toLowerCase().includes(search.toLowerCase()) ||
        z.code.toLowerCase().includes(search.toLowerCase())
      )
    : zones
  const activeCount = zones.filter(z => z.is_active).length
  const showEditor  = isNew || selected !== null

  const surgeColor = (cap: number | null | undefined) =>
    !cap || cap <= 1.2 ? 'var(--ink-3)' : cap >= 1.6 ? 'var(--danger)' : 'var(--warn)'

  // ── Editor panel content (shared mobile/tablet/desktop) ───────
  const editorPanelContent = showEditor ? (
    <>
      {/* Mobile back button */}
      {isMobile && (
        <button
          onClick={() => {
            setMobileTab('list')
            setSelected(null); setIsNew(false); setEditPolygon([])
            setPolyHistory([]); setApiError('')
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            width: '100%', fontSize: 13, color: 'var(--accent)',
            background: 'var(--surface-2)', border: 'none',
            borderBottom: '1px solid var(--rule)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', flexShrink: 0,
          }}
        >
          <Icon name="chevLeft" size={14} stroke={2} />
          Back to zones
        </button>
      )}

      {/* Panel header */}
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <div className="t-label">{isNew ? 'New zone' : 'Editing zone'}</div>
        <h3 style={{
          margin: '4px 0 0', fontFamily: 'var(--font-serif)',
          fontSize: 20, fontWeight: 400, letterSpacing: '-0.016em',
        }}>
          {isNew ? 'Untitled zone' : (draft.name || selected?.name)}
        </h3>
        {!isNew && selected && (
          <div className="t-meta" style={{ marginTop: 3 }}>
            {selected.code} · v{selected.version} ·{' '}
            {formatDate(selected.updated_at)}
          </div>
        )}
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>

        {apiError && (
          <div style={{
            padding: '9px 12px',
            background: 'var(--danger-soft)',
            border: '1px solid color-mix(in oklab, var(--danger) 28%, var(--rule))',
            borderRadius: 3, fontSize: 12.5, color: 'var(--danger)',
          }}>
            {apiError}
          </div>
        )}

        <div className="field">
          <label className="field-label">
            Zone code{isNew && <span style={{ color: 'var(--danger)' }}> *</span>}
          </label>
          <div className="input">
            <input
              value={draft.code ?? ''}
              readOnly={!isNew}
              onChange={e => patch('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="Z-N4"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Display name<span style={{ color: 'var(--danger)' }}> *</span></label>
          <div className="input">
            <input
              value={draft.name ?? ''}
              onChange={e => patch('name', e.target.value)}
              placeholder="Indiranagar"
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Tax jurisdiction</label>
          <div className="input">
            <input
              value={draft.tax_jurisdiction ?? ''}
              onChange={e => patch('tax_jurisdiction', e.target.value)}
              placeholder="KA · Urban · BBMP"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label className="field-label">Priority</label>
            <div className="input">
              <input
                type="number"
                value={draft.priority ?? 10}
                onChange={e => patch('priority', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Surge cap ×</label>
            <div className="input">
              <input
                type="number" step="0.1" min="1" max="5"
                value={draft.surge_cap ?? surgeCeiling}
                onChange={e => patch('surge_cap', parseFloat(e.target.value) || 1.0)}
              />
            </div>
          </div>
        </div>

        {/* Active services toggle chips */}
        {vehicleClasses.length > 0 && (
          <div>
            <div className="t-label" style={{ marginBottom: 8 }}>Active services</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {vehicleClasses.map(vc => {
                const on = (draft.active_service_codes ?? []).includes(vc.code)
                return (
                  <button
                    key={vc.code}
                    type="button"
                    onClick={() => toggleService(vc.code)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10.5,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '4px 8px', borderRadius: 2, cursor: 'pointer',
                      background: on ? 'var(--accent-soft)' : 'var(--surface-2)',
                      color: on ? 'var(--accent)' : 'var(--ink-3)',
                      border: `1px solid ${on
                        ? 'color-mix(in oklab, var(--accent) 22%, var(--rule-strong))'
                        : 'var(--rule)'}`,
                    }}
                  >
                    {on ? '✓ ' : '+ '}{vc.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Geometry status card */}
        {editPolygon.length >= 1 && (
          <div style={{
            padding: '11px 13px',
            background: editPolygon.length < 3
              ? 'var(--surface-2)'
              : validation?.valid
                ? 'var(--accent-soft-2)'
                : validation
                  ? 'var(--danger-soft)'
                  : 'var(--surface-2)',
            border: `1px solid ${editPolygon.length < 3
              ? 'var(--rule)'
              : validation?.valid
                ? 'color-mix(in oklab, var(--accent) 18%, var(--rule-strong))'
                : validation
                  ? 'color-mix(in oklab, var(--danger) 22%, var(--rule))'
                  : 'var(--rule)'}`,
            borderRadius: 3,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              color: editPolygon.length < 3
                ? 'var(--ink-3)'
                : validation?.valid ? 'var(--accent)' : validation ? 'var(--danger)' : 'var(--ink-3)',
            }}>
              <Icon
                name={
                  editPolygon.length < 3 ? 'pencil'
                  : validation?.valid ? 'check'
                  : validation ? 'alert'
                  : 'clock'
                }
                size={13}
                stroke={2.2}
              />
              <span className="t-label" style={{ padding: 0, color: 'inherit' }}>
                {editPolygon.length < 3
                  ? `Drawing · ${editPolygon.length} vertices`
                  : validating ? 'Validating…'
                  : validation?.valid ? 'Geometry valid'
                  : validation ? 'Invalid geometry'
                  : 'Awaiting validation'}
              </span>
            </div>
            {validation && !validating && (
              <div style={{ marginTop: 5, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                {validation.valid
                  ? `${editPolygon.length} vertices${
                      validation.area_km2 !== null ? ` · ${validation.area_km2.toFixed(1)} km²` : ''
                    }`
                  : validation.message}
              </div>
            )}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={draft.is_active ?? true}
            onChange={e => patch('is_active', e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          Zone active
        </label>
      </div>

      {/* Panel footer */}
      <div style={{
        padding: '11px 18px', borderTop: '1px solid var(--rule)',
        display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {!isNew && selected && (
          <button
            className="btn sm"
            style={{ color: 'var(--danger)' }}
            onClick={() => setConfirmDeactivate(selected)}
          >
            <Icon name="trash" size={13} />Deactivate
          </button>
        )}
        {!isNew && selected && (
          <button
            className="btn sm"
            onClick={() => handlePublish(selected)}
            disabled={publishing}
            title={`Publish zone · currently v${selected.version}`}
          >
            <Icon name="check" size={13} />
            {publishing ? 'Publishing…' : `Publish v${selected.version}`}
          </button>
        )}
        <button className="btn sm" onClick={discard} style={{ marginLeft: 'auto' }}>
          Discard
        </button>
        <button className="btn accent sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save zone'}
        </button>
      </div>
    </>
  ) : (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-3)', gap: 12, padding: 28, textAlign: 'center',
    }}>
      <Icon name="mapPin" size={32} stroke={1} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
        Select a zone from the list<br />or draw a new polygon.
      </div>
      <button className="btn accent sm" onClick={startNew}>
        <Icon name="plus" size={13} />New zone
      </button>
    </div>
  )

  return (
    <Shell
      activeId="catalog"
      breadcrumb="Catalog & Pricing · Service zones"
      title="Service zones"
      subtitle={`${zones.length} zones · ${activeCount} active`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {!isMobile && (
            <>
              <button className="btn sm" onClick={() => navigate('/catalog/vehicle-classes')}>Vehicle classes</button>
              <button className="btn sm" onClick={() => navigate('/catalog/aircraft-types')}>Aircraft types</button>
              <button className="btn sm" onClick={() => navigate('/catalog/air-routes')}>Air routes</button>
            </>
          )}
          <button className="btn sm accent" onClick={startNew}><Icon name="plus" size={13} />New zone</button>
        </div>
      }
    >
      {/* ── Mobile tab bar ────────────────────────────────────── */}
      {isMobile && (
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)', flexShrink: 0,
        }}>
          {(['list', 'map', 'details'] as const).map(tab => {
            const tabLabels: Record<'list' | 'map' | 'details', string> = {
              list: 'Zones', map: 'Map', details: 'Details',
            }
            const disabled = tab === 'details' && !showEditor
            return (
              <button
                key={tab}
                onClick={() => { if (!disabled) setMobileTab(tab) }}
                style={{
                  flex: 1, height: 42, border: 'none',
                  borderBottom: `2px solid ${mobileTab === tab ? 'var(--accent)' : 'transparent'}`,
                  background: 'transparent',
                  cursor: disabled ? 'default' : 'pointer',
                  color: disabled ? 'var(--ink-4)' : mobileTab === tab ? 'var(--accent)' : 'var(--ink-3)',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  transition: 'color 0.15s',
                }}
              >
                {tabLabels[tab]}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Three-panel layout ────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : isTablet
            ? '200px 1fr 260px'
            : '296px 1fr 316px',
        height: isMobile ? 'auto' : '100%',
        minHeight: 0,
      }}>

        {/* ── Col 1 — zone list ─────────────────────────────── */}
        {(!isMobile || mobileTab === 'list') && (
          <aside style={{
            borderRight: !isMobile ? '1px solid var(--rule)' : 'none',
            background: 'var(--surface)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--rule)' }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Zones · {zones.length}</div>
              <div className="input" style={{ height: 30 }}>
                <Icon name="search" size={13} className="icon" />
                <input
                  placeholder="Filter zones…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={e => setShowInactive(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Show inactive
              </label>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: isMobile ? 380 : undefined }}>
              {loading && <div style={{ padding: 16, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>}
              {!loading && filtered.length === 0 && (
                <div style={{ padding: 16, color: 'var(--ink-3)', fontSize: 13 }}>
                  {search ? 'No zones match.' : 'No zones yet. Click "New zone" to draw one.'}
                </div>
              )}
              {filtered.map(z => {
                const isSel = selected?.id === z.id
                return (
                  <div
                    key={z.id}
                    onClick={() => selectZone(z)}
                    style={{
                      padding: '11px 14px',
                      borderBottom: '1px solid var(--rule-soft)',
                      borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                      background: isSel ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer',
                      opacity: z.is_active ? 1 : 0.45,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink)', letterSpacing: '0.06em' }}>
                        {z.code}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: surgeColor(z.surge_cap), flexShrink: 0 }}>
                        {z.surge_cap ? `${z.surge_cap}×` : '—'}
                      </span>
                    </div>
                    <div style={{ marginTop: 3, fontSize: 13.5, color: 'var(--ink)' }}>{z.name}</div>
                    <div className="t-meta" style={{ marginTop: 2 }}>
                      {z.tax_jurisdiction || '—'} · {(z.active_service_codes ?? []).length} services
                      {!z.is_active && <> · <span style={{ color: 'var(--warn)' }}>Off</span></>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--rule)' }}>
              <button className="btn ghost sm" onClick={startNew}>
                <Icon name="plus" size={12} />New zone
              </button>
            </div>
          </aside>
        )}

        {/* ── Col 2 — map ───────────────────────────────────── */}
        {(!isMobile || mobileTab === 'map') && (
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: isMobile ? 450 : 0 }}>
            <MapContainer
              center={MAP_CENTER}
              zoom={MAP_ZOOM}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              <MapClickHandler mode={toolMode} onMapClick={handleMapClick} />
              {/* Fly to the selected zone's original polygon on selection */}
              <MapController targetPolygon={selected ? selected.polygon : null} />
              <ZoomControl position="bottomright" />

              {/* Non-selected zones — only selectable in 'move' mode */}
              {zones
                .filter(z => z.id !== selected?.id && (z.polygon?.length ?? 0) >= 3)
                .map(z => (
                  <Polygon
                    key={z.id}
                    positions={z.polygon as [number, number][]}
                    pathOptions={{
                      color: '#94a3b8',
                      fillColor: '#94a3b8',
                      fillOpacity: 0.08,
                      weight: 1,
                      dashArray: '4 5',
                    }}
                    eventHandlers={{
                      click(e) {
                        if (toolModeRef.current === 'draw_new') {
                          handleMapClick([e.latlng.lat, e.latlng.lng])
                        } else {
                          selectZone(z)
                        }
                      },
                    }}
                  />
                ))
              }

              {/* Editing polygon */}
              {showEditor && editPolygon.length >= 3 && (
                <Polygon
                  positions={editPolygon}
                  pathOptions={{
                    color: ACCENT,
                    fillColor: ACCENT,
                    fillOpacity: 0.22,
                    weight: 3,
                  }}
                />
              )}

              {/* Drawing in-progress polyline (< 3 points) */}
              {showEditor && toolMode === 'draw_new' && editPolygon.length >= 2 && editPolygon.length < 3 && (
                <Polyline
                  positions={editPolygon}
                  pathOptions={{ color: ACCENT, weight: 3, dashArray: '8 5' }}
                />
              )}

              {/* Vertex handles */}
              {showEditor && editPolygon.map((pos, i) => (
                <VertexHandle
                  key={i}
                  position={pos}
                  index={i}
                  mode={toolMode}
                  onDragEnd={handleVertexDragEnd}
                  onRemove={handleVertexRemove}
                />
              ))}

              {/* Midpoint handles (add_vertex mode) */}
              {showEditor && toolMode === 'add_vertex' && editPolygon.length >= 3 &&
                midpoints(editPolygon).map(({ pt, afterIdx }) => (
                  <CircleMarker
                    key={afterIdx}
                    center={pt}
                    radius={7}
                    pathOptions={{
                      color: ACCENT, fillColor: ACCENT,
                      fillOpacity: 0.65, weight: 1.5,
                    }}
                    eventHandlers={{ click() { handleMidpointClick(pt, afterIdx) } }}
                  />
                ))
              }
            </MapContainer>

            {/* Floating toolbar — icons-only on mobile to save space */}
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 1000,
              background: 'var(--surface)', border: '1px solid var(--rule-strong)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              display: 'flex', alignItems: 'stretch',
            }}>
              {TOOLS.map((t, i) => (
                <button
                  key={t.mode}
                  onClick={() => {
                    if (t.mode === 'draw_new' && !showEditor) {
                      startNew()
                    } else {
                      setToolMode(t.mode)
                    }
                  }}
                  title={t.label}
                  style={{
                    height: 34, padding: isMobile ? '0 9px' : '0 11px',
                    borderRadius: 0,
                    border: 'none',
                    borderRight: i < TOOLS.length - 1 ? '1px solid var(--rule)' : 'none',
                    background: toolMode === t.mode ? 'var(--surface-2)' : 'transparent',
                    color: toolMode === t.mode ? 'var(--ink)' : 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                    fontFamily: 'var(--font-mono)', fontSize: 10.5,
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={t.icon} size={12} />
                  {!isMobile && t.label}
                </button>
              ))}
              <div style={{ width: 1, height: 22, background: 'var(--rule)', alignSelf: 'center', margin: '0 2px' }} />
              <button
                onClick={undo}
                disabled={polyHistory.length === 0}
                title="Undo last vertex"
                style={{
                  height: 34, padding: isMobile ? '0 9px' : '0 11px',
                  border: 'none', borderRadius: 0,
                  background: 'transparent',
                  color: polyHistory.length === 0 ? 'var(--ink-4)' : 'var(--ink-3)',
                  display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  cursor: polyHistory.length === 0 ? 'default' : 'pointer',
                }}
              >
                <Icon name="refresh" size={12} />
                {!isMobile && 'Undo'}
              </button>
              <button
                onClick={() => {
                  if (editPolygon.length === 0) return
                  setPolyHistory(h => [...h, editPolygon])
                  setEditPolygon([])
                }}
                disabled={editPolygon.length === 0}
                title="Clear all vertices"
                style={{
                  height: 34, padding: isMobile ? '0 9px' : '0 11px',
                  border: 'none', borderRadius: 0,
                  background: 'transparent',
                  color: editPolygon.length === 0 ? 'var(--ink-4)' : 'var(--danger)',
                  display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                  fontFamily: 'var(--font-mono)', fontSize: 10.5,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  cursor: editPolygon.length === 0 ? 'default' : 'pointer',
                }}
              >
                <Icon name="trash" size={12} />
                {!isMobile && 'Clear'}
              </button>
            </div>

            {/* Bottom validation pill */}
            <div style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'var(--surface)', border: '1px solid var(--rule)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '7px 14px', display: 'flex', gap: 12, alignItems: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.07em',
              color: 'var(--ink-3)',
              whiteSpace: isMobile ? 'normal' : 'nowrap',
              maxWidth: isMobile ? 'calc(100% - 24px)' : undefined,
              textAlign: 'center',
            }}>
              {editPolygon.length < 3 ? (
                <span>
                  {toolMode === 'draw_new'
                    ? `Tap map · ${editPolygon.length} vertices`
                    : 'Select a zone or draw a new polygon'
                  }
                </span>
              ) : validating ? (
                <span>Validating geometry…</span>
              ) : validation ? (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span className={`dot ${validation.valid ? 'ok' : 'danger'}`} />
                    {validation.valid ? 'Geometry valid' : validation.message}
                  </span>
                  {validation.area_km2 !== null && (
                    <>
                      <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
                      <span>Area · {validation.area_km2.toFixed(1)} km²</span>
                    </>
                  )}
                  <span style={{ width: 1, height: 12, background: 'var(--rule)' }} />
                  <span>{editPolygon.length} vertices</span>
                </>
              ) : (
                <span>{editPolygon.length} vertices</span>
              )}
            </div>
          </div>
        )}

        {/* ── Col 3 — editor panel (tablet + desktop in-grid) ── */}
        {!isMobile && (
          <aside style={{
            borderLeft: '1px solid var(--rule)',
            background: 'var(--surface)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {editorPanelContent}
          </aside>
        )}
      </div>

      {/* ── Mobile: details tab panel (rendered below the grid) ── */}
      {isMobile && mobileTab === 'details' && (
        <aside style={{
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          borderTop: showEditor ? '1px solid var(--rule)' : 'none',
          minHeight: 0,
        }}>
          {editorPanelContent}
        </aside>
      )}

      {confirmDeactivate && (
        <ConfirmDialog
          open
          title="Deactivate service zone"
          description={`"${confirmDeactivate.name}" will stop accepting new bookings. Existing bookings are unaffected.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={() => deactivate(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
    </Shell>
  )
}
