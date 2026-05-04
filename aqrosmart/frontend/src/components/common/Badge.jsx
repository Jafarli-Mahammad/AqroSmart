import React from 'react'

const STATUS_CLASSES = {
  A: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  B: 'bg-sky-100 text-sky-700 ring-sky-200',
  C: 'bg-amber-100 text-amber-700 ring-amber-200',
  D: 'bg-rose-100 text-rose-700 ring-rose-200',
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export default function Badge({ status, children }) {
  const key = status && STATUS_CLASSES[status] ? status : 'default'
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_CLASSES[key]}`}>{children ?? status}</span>
}
