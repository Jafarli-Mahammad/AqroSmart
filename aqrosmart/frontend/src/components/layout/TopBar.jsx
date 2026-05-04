import React, { useEffect, useMemo, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import client from '../../api/client'
import useScenarioStore from '../../store/scenarioStore'

const titleMap = [
  { path: '/', title: 'Dashboard' },
  { path: '/farms/:farmId', title: 'Farm Detail' },
  { path: '/fields/:fieldId', title: 'Field Analysis' },
  { path: '/simulation', title: 'Simulation Control' },
  { path: '/irrigation', title: 'Irrigation Hub' },
  { path: '/subsidy', title: 'Subsidy Engine' },
  { path: '/credit', title: 'Credit Scoring' },
  { path: '/admin', title: 'Admin Demo' },
]

function resolveTitle(pathname) {
  const match = titleMap.find((item) => matchPath({ path: item.path, end: true }, pathname))
  return match?.title || 'AqroSmart'
}

export default function TopBar() {
  const location = useLocation()
  const title = useMemo(() => resolveTitle(location.pathname), [location.pathname])
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
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-1 text-sm text-slate-500">Live operational view of the AqroSmart platform</div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 shadow-sm">
          <span className="font-medium text-slate-500">Scenario</span>
          <select
            className="min-w-44 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 focus:outline-none focus:ring-0"
            value={activeScenarioSlug}
            onChange={handleScenarioChange}
            disabled={isSwitching}
          >
            {(scenarios.length ? scenarios : [{ slug: 'healthy_field', name: 'Healthy Field' }]).map((scenario) => (
              <option key={scenario.slug} value={scenario.slug}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
          Live Simulation
        </div>
      </div>
    </header>
  )
}
