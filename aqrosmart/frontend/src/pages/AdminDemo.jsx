import React, { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'

function statusDot(active) {
  return active ? 'bg-emerald-500' : 'bg-rose-500'
}

function statusCardClass(active) {
  return active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
}

function ScenarioPill() {
  const { scenarios, activeScenarioSlug, setActiveScenario } = useScenarioStore((state) => ({
    scenarios: state.scenarios,
    activeScenarioSlug: state.activeScenarioSlug,
    setActiveScenario: state.setActiveScenario,
  }))

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-slate-500">Scenario</span>
        <select
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
          value={activeScenarioSlug}
          onChange={(event) => setActiveScenario(event.target.value, scenarios)}
        >
          {scenarios.map((scenario) => (
            <option key={scenario.slug} value={scenario.slug}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function AdminDemo() {
  const { scenarios, activeScenarioSlug, activeScenarioName, presentationMode, setPresentationMode, setScenarioState, setActiveScenario } = useScenarioStore((state) => ({
    scenarios: state.scenarios,
    activeScenarioSlug: state.activeScenarioSlug,
    activeScenarioName: state.activeScenarioName,
    presentationMode: state.presentationMode,
    setPresentationMode: state.setPresentationMode,
    setScenarioState: state.setScenarioState,
    setActiveScenario: state.setActiveScenario,
  }))
  const [health, setHealth] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadStatus() {
      try {
        const [healthResponse, summaryResponse, stateResponse] = await Promise.all([
          client.get('/health'),
          client.get('/dashboard/summary'),
          client.get('/simulation/state'),
        ])

        if (!mounted) return

        setHealth(healthResponse.data)
        setSummary(summaryResponse.data)
        setScenarioState({ scenarios: stateResponse.data.scenarios || [], activeScenarioSlug: stateResponse.data.active_scenario })
      } catch (requestError) {
        if (mounted) setError(requestError?.response?.data?.detail || 'Unable to load system status')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStatus()

    return () => {
      mounted = false
    }
  }, [setScenarioState])

  async function resetSimulation() {
    try {
      await client.post('/simulation/reset')
      setToast('All simulation data reset and reseeded')
      const [summaryResponse, stateResponse] = await Promise.all([client.get('/dashboard/summary'), client.get('/simulation/state')])
      setSummary(summaryResponse.data)
      setScenarioState({ scenarios: stateResponse.data.scenarios || [], activeScenarioSlug: stateResponse.data.active_scenario })
      setActiveScenario(stateResponse.data.active_scenario, stateResponse.data.scenarios || [])
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Unable to reset simulation')
    }
  }

  async function switchScenario(slug) {
    try {
      await client.post(`/simulation/scenario/${slug}`)
      setActiveScenario(slug, scenarios)
      setToast(`Scenario switched to ${slug.replaceAll('_', ' ')}`)
      const stateResponse = await client.get('/simulation/state')
      setScenarioState({ scenarios: stateResponse.data.scenarios || [], activeScenarioSlug: stateResponse.data.active_scenario })
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Unable to switch scenario')
    }
  }

  const seedStats = useMemo(
    () => [
      { label: 'Farmers', value: summary?.total_farmers ?? '—' },
      { label: 'Farms', value: summary?.total_farms ?? '—' },
      { label: 'Fields', value: summary?.total_fields ?? '—' },
      { label: 'Analysis Runs', value: summary?.total_analysis_runs ?? '—' },
    ],
    [summary],
  )

  if (loading) {
    return <div className="p-6 text-slate-500">Loading admin controls…</div>
  }

  return (
    <div className="space-y-6 p-6">
      {toast ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{toast}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Demo Control Panel</h1>
        <p className="mt-1 text-sm text-slate-500">Clean live controls for resetting, switching scenarios, and running presentations.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">1. Reset Simulation</div>
          <p className="text-sm text-slate-600">Clears all seeded analysis and recommendation records, then reseeds the dataset.</p>
          <button
            type="button"
            onClick={resetSimulation}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Reset Simulation
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">2. Scenario Quick-Switch</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {scenarios.map((scenario) => {
              const active = activeScenarioSlug === scenario.slug
              return (
                <button
                  key={scenario.slug}
                  type="button"
                  onClick={() => switchScenario(scenario.slug)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${active ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <div className="font-semibold text-slate-900">{scenario.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{scenario.slug.replaceAll('_', ' ')}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">3. Presentation Mode</div>
          <p className="text-sm text-slate-600">Hide the sidebar and top bar for a clean fullscreen demo. A floating scenario switcher appears at the bottom center.</p>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex-1">
              <div className="font-medium text-slate-900">Presentation Mode</div>
              <div className="text-sm text-slate-500">{presentationMode ? 'Enabled' : 'Disabled'}</div>
            </div>
            <button
              type="button"
              onClick={() => setPresentationMode(!presentationMode)}
              className={`relative h-7 w-14 rounded-full transition ${presentationMode ? 'bg-emerald-600' : 'bg-slate-300'}`}
              aria-pressed={presentationMode}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${presentationMode ? 'translate-x-7' : 'translate-x-0.5'}`}
              />
            </button>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">System Status</div>
          <div className="space-y-4">
            <div className={`rounded-2xl border px-4 py-3 ${statusCardClass(Boolean(health?.status === 'ok'))}`}>
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${statusDot(Boolean(health?.status === 'ok'))}`} />
                <div>
                  <div className="font-semibold">API Status</div>
                  <div className="text-sm">{health?.status === 'ok' ? 'Healthy' : 'Unavailable'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${statusDot(Boolean(summary))}`} />
                <div>
                  <div className="font-semibold text-slate-900">DB Connection</div>
                  <div className="text-sm">{summary ? 'Connected through live aggregate queries' : 'Unavailable'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {seedStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {presentationMode ? <ScenarioPill /> : null}
    </div>
  )
}
