import { useRef } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'

interface OTPInputProps {
  value: string
  onChange: (v: string) => void
  length?: number
}

export default function OTPInput({ value, onChange, length = 6 }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  const update = (idx: number, ch: string) => {
    const arr = digits.slice()
    arr[idx] = ch
    onChange(arr.join(''))
    if (ch && idx < length - 1) refs.current[idx + 1]?.focus()
  }

  const handleKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        update(idx, '')
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus()
        update(idx - 1, '')
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(text.padEnd(digits.join('').length > 0 ? text.length : text.length, ''))
    onChange(text)
    const nextEmpty = text.length < length ? text.length : length - 1
    refs.current[nextEmpty]?.focus()
  }

  return (
    <div className="otp-wrap" style={{ display: 'flex', gap: 10 }}>
      {digits.map((d, i) => {
        const isFocused = i === Math.min(value.length, length - 1)
        return (
          <input
            key={i}
            ref={el => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => {
              const ch = e.target.value.replace(/\D/g, '').slice(-1)
              update(i, ch)
            }}
            onKeyDown={e => handleKey(i, e)}
            onPaste={handlePaste}
            style={{
              width: 56,
              height: 64,
              border: '1px solid ' + (isFocused && !d ? 'var(--accent)' : 'var(--rule-strong)'),
              boxShadow: isFocused && !d ? 'var(--focus-ring)' : 'none',
              borderRadius: 3,
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 26,
              fontWeight: 400,
              color: d ? 'var(--ink)' : 'var(--ink-4)',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        )
      })}
    </div>
  )
}
