import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  BadgeDollarSign,
  BarChart3,
  Leaf,
  Menu,
  ShieldCheck,
  Sprout,
  Tractor,
  Droplets,
  ScanSearch,
  X,
} from 'lucide-react'
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
  { to: '/', label: 'Ümumi baxış', icon: BarChart3 },
  { to: '/farms', label: 'Təsərrüfatlar', icon: Tractor },
  { to: '/simulation', label: 'Simulyasiya', icon: ScanSearch },
  { to: '/irrigation', label: 'Suvarma mərkəzi', icon: Droplets },
  { to: '/subsidy', label: 'Subsidiya mühərriki', icon: BadgeDollarSign },
  { to: '/credit', label: 'Kredit skorinqi', icon: ShieldCheck },
  { to: '/plant-health', label: 'Bitki sağlamlığı', icon: Sprout },
  { to: '/admin', label: 'Demo mərkəzi', icon: Leaf },
]

const scenarioPalette = {
  healthy_field: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  drought_stress: 'bg-orange-100 text-orange-700 ring-orange-200',
  disease_outbreak: 'bg-red-100 text-red-700 ring-red-200',
}

export default function Sidebar({ mobileOpen = false, onClose = () => {}, onOpen = () => {} }) {
  const activeScenarioSlug = useScenarioStore((state) => state.activeScenarioSlug)
  const activeScenarioName = useScenarioStore((state) => state.activeScenarioName)

  const badgeClass = scenarioPalette[activeScenarioSlug] || 'bg-slate-100 text-slate-700 ring-slate-200'

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mobileOpen ? <button type="button" className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} /> : null}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col border-r border-emerald-900/20 bg-gradient-to-b from-emerald-900 via-emerald-900 to-emerald-950 text-emerald-50 transition-transform duration-300 lg:static lg:w-64 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <LeafLogo />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-white">AqroSmart</div>
          <div className="text-xs text-slate-400">Ağıllı kənd təsərrüfatı</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)]'
                  : 'text-emerald-100/80 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Aktiv ssenari</div>
        <div className={`mt-2 inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClass}`}>
          <span className="truncate">{activeScenarioName}</span>
        </div>
      </div>
    </aside>
    </>
  )
}
