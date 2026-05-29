import { useState, useEffect, useRef } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  loading?: boolean
  style?: CSSProperties
}

// ── Dropdown row (isolated hover state) ──────────────────────────────────────

function DropdownRow({
  opt,
  selected,
  onSelect,
}: {
  opt: SelectOption
  selected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 12px',
        fontSize: 13,
        cursor: 'pointer',
        userSelect: 'none',
        color: selected ? 'var(--accent)' : 'var(--ink)',
        background: selected
          ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))'
          : hovered
          ? 'var(--surface-2)'
          : 'var(--surface)',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      {opt.label}
    </div>
  )
}

// ── SearchableSelect ──────────────────────────────────────────────────────────

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Type to search…',
  loading = false,
  style,
}: SearchableSelectProps) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef<HTMLDivElement>(null)

  // When closed, show the matched label; when open, show the live query
  const matchedLabel = options.find(o => o.value === value)?.label ?? value
  const displayValue = open ? query : matchedLabel

  const filtered = query.trim()
    ? options.filter(
        o =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()),
      )
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (!open) setOpen(true)
  }

  const handleFocus = () => {
    setOpen(true)
    setQuery('') // clear so all options are visible on open
  }

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          style={{ flex: 1, minWidth: 0 }}
        />
        {/* Clear button when a value is selected and dropdown is closed */}
        {value && !open ? (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onChange('')
              setOpen(false)
              setQuery('')
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 2px',
              color: 'var(--ink-3)',
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Clear"
          >
            ×
          </button>
        ) : (
          <span
            style={{
              color: 'var(--ink-4)',
              fontSize: 10,
              flexShrink: 0,
              pointerEvents: 'none',
              paddingRight: 2,
            }}
          >
            ▾
          </span>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 500,
            background: 'var(--surface)',
            border: '1px solid var(--rule-strong)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            maxHeight: 200,
            overflowY: 'auto',
            marginTop: 2,
          }}
        >
          {loading && (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--ink-3)' }}>
              Loading options…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--ink-3)' }}>
              {query ? 'No results' : 'No options available'}
            </div>
          )}
          {!loading &&
            filtered.map(opt => (
              <DropdownRow
                key={opt.value}
                opt={opt}
                selected={opt.value === value}
                onSelect={() => handleSelect(opt)}
              />
            ))}
        </div>
      )}
    </div>
  )
}
