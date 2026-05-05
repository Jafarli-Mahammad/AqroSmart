import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

function normalizeOptions(options) {
  return (options || []).map((item) => {
    if (typeof item === 'object' && item !== null && 'value' in item && 'label' in item) {
      return item
    }
    return { value: String(item), label: String(item) }
  })
}

export default function OptionSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Seçin',
  className = '',
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const normalized = useMemo(() => normalizeOptions(options), [options])

  const selected = normalized.find((item) => String(item.value) === String(value))

  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function handleSelect(nextValue) {
    onChange?.(nextValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={[
          'flex min-h-[46px] w-full items-center justify-between rounded-2xl border border-emerald-300/90 bg-gradient-to-b from-white to-emerald-50/40 px-3 py-2 text-left shadow-sm transition-all',
          'hover:border-emerald-500 hover:shadow-md',
          'focus:outline-none focus:ring-4 focus:ring-emerald-200/80',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        <span className={`truncate pr-3 text-[15px] font-medium ${selected ? 'text-slate-900' : 'text-slate-500'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className={[
            'absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-emerald-200 bg-white/95 p-1 shadow-[0_16px_40px_rgba(15,23,42,0.2)] backdrop-blur',
            menuClassName,
          ].join(' ')}
        >
          {normalized.length ? (
            normalized.map((item) => {
              const isSelected = String(item.value) === String(value)
              return (
                <button
                  key={String(item.value)}
                  type="button"
                  onClick={() => handleSelect(item.value)}
                  className={[
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[15px] transition',
                    isSelected ? 'bg-emerald-600 text-white' : 'text-slate-800 hover:bg-emerald-50',
                  ].join(' ')}
                >
                  <span className="truncate">{item.label}</span>
                  {isSelected ? <Check className="ml-2 h-4 w-4 shrink-0" /> : null}
                </button>
              )
            })
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">Seçim yoxdur</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
