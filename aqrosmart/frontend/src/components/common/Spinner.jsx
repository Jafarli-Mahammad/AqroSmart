import React from 'react'

export default function Spinner({ className = '' }) {
  return (
    <div className={`flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  )
}
