import React, { useEffect, useMemo, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { ChevronRight, Menu, Tractor } from 'lucide-react'
import client from '../../api/client'
import useScenarioStore from '../../store/scenarioStore'
import { scenarioName } from '../../constants/azText'
import OptionSelect from '../common/OptionSelect'

const titleMap = [
  { path: '/', title: 'İdarə paneli' },
  { path: '/farms', title: 'Təsərrüfatlar' },
  { path: '/farms/:farmId', title: 'Təsərrüfat detalı' },
  { path: '/fields/:fieldId', title: 'Sahə təhlili' },
  { path: '/simulation', title: 'Simulyasiya idarəsi' },
  { path: '/irrigation', title: 'Suvarma mərkəzi' },
  { path: '/subsidy', title: 'Subsidiya mühərriki' },
  { path: '/credit', title: 'Kredit skorinqi' },
  { path: '/plant-health', title: 'Bitki sağlamlığı (AI)' },
  { path: '/admin', title: 'Admin paneli' },
]

function resolveTitle(pathname) {
  const match = titleMap.find((item) => matchPath({ path: item.path, end: true }, pathname))
  return match?.title || 'AqroSmart'
}

export default function TopBar({ onOpenSidebar = () => {} }) {
  const location = useLocation()
  const title = useMemo(() => resolveTitle(location.pathname), [location.pathname])
  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    if (!segments.length) return ['Ana səhifə']
    return ['Ana səhifə', ...segments.map((item) => item.replaceAll('-', ' '))]
  }, [location.pathname])

  const scenarios = useScenarioStore((state) => state.scenarios)
  const activeScenarioSlug = useScenarioStore((state) => state.activeScenarioSlug)
  const setScenarioState = useScenarioStore((state) => state.setScenarioState)
  const setActiveScenario = useScenarioStore((state) => state.setActiveScenario)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadScenarioState() {
      try {
        const response = await client.get('/simulation/state')
        if (!mounted) return
        setScenarioState({
          scenarios: response.data.scenarios || [],
          activeScenarioSlug: response.data.active_scenario,
        })
      } catch {
        if (mounted && !scenarios.length) {
          setScenarioState({
            scenarios: [],
            activeScenarioSlug: 'healthy_field',
          })
        }
      }
    }

    loadScenarioState()

    return () => {
      mounted = false
    }
  }, [scenarios.length, setScenarioState])

  async function handleScenarioChange(event) {
    const nextScenario = event.target.value
    setIsSwitching(true)
    try {
      await client.post(`/simulation/scenario/${nextScenario}`)
      setActiveScenario(nextScenario, scenarios)
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-emerald-100 bg-white/95 px-6 backdrop-blur">
      <div>
        <button
          type="button"
          onClick={onOpenSidebar}
          className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={`${item}-${index}`}>
              <span className="capitalize">{item}</span>
              {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
            </React.Fragment>
          ))}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-1 text-sm text-slate-500">Ağıllı kənd təsərrüfatı idarəetmə mərkəzi</div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 shadow-sm">
          <span className="font-medium text-slate-500">Ssenari</span>
          <OptionSelect
            className="min-w-48"
            value={activeScenarioSlug}
            onChange={(next) => handleScenarioChange({ target: { value: next } })}
            disabled={isSwitching}
            options={(scenarios.length ? scenarios : [{ slug: 'healthy_field', name: 'Healthy Field' }]).map((scenario) => ({
              value: scenario.slug,
              label: scenarioName(scenario.slug, scenario.name),
            }))}
          />
        </label>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <Tractor className="h-4 w-4" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
          Canlı simulyasiya
        </div>
      </div>
    </header>
  )
}
