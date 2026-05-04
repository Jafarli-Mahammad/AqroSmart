import React from 'react'
import { NavLink } from 'react-router-dom'
import useScenarioStore from '../../store/scenarioStore'

function LeafLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 text-emerald-400" fill="none" aria-hidden="true">
      <path
        d="M26 6c-7.5.6-13.1 3.7-16.9 9.4C6 19.6 5.2 24.1 5.6 26.4c2.3.3 6.8-.4 11.2-3.4C22.5 19.4 25.5 13.8 26 6Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M10 22c3.6-4.3 7.8-7.8 12.5-10.3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/farms/1', label: 'Farms' },
  { to: '/simulation', label: 'Simulation' },
  { to: '/irrigation', label: 'Irrigation Hub' },
  { to: '/subsidy', label: 'Subsidy Engine' },
  { to: '/credit', label: 'Credit Scoring' },
  { to: '/admin', label: 'Admin' },
]

const scenarioPalette = {
  healthy_field: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  drought_stress: 'bg-orange-100 text-orange-700 ring-orange-200',
  disease_outbreak: 'bg-red-100 text-red-700 ring-red-200',
}

export default function Sidebar() {
  const activeScenarioSlug = useScenarioStore((state) => state.activeScenarioSlug)
  const activeScenarioName = useScenarioStore((state) => state.activeScenarioName)

  const badgeClass = scenarioPalette[activeScenarioSlug] || 'bg-slate-100 text-slate-700 ring-slate-200'

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <LeafLogo />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-white">AqroSmart</div>
          <div className="text-xs text-slate-400">Agricultural Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                isActive ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Active scenario</div>
        <div className={`mt-2 inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClass}`}>
          <span className="truncate">{activeScenarioName}</span>
        </div>
      </div>
    </aside>
  )
}
