import React, { useEffect, useMemo, useState } from 'react'
import { Activity, Bug, RefreshCcw, Settings2, Sparkles, TriangleAlert } from 'lucide-react'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'
import { scenarioName } from '../constants/azText'
import OptionSelect from '../components/common/OptionSelect'

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
        <span className="font-medium text-slate-500">Ssenari</span>
        <div className="min-w-56">
          <OptionSelect
            value={activeScenarioSlug}
            onChange={(next) => setActiveScenario(next, scenarios)}
            options={scenarios.map((scenario) => ({
              value: scenario.slug,
              label: scenarioName(scenario.slug, scenario.name),
            }))}
          />
        </div>
      </div>
    </div>
  )
}

export default function AdminDemo() {
  const [autoCycle, setAutoCycle] = useState(false)
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
        if (mounted) setError(requestError?.response?.data?.detail || 'Sistem statusu yüklənə bilmədi')
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
      setToast('Bütün simulyasiya məlumatları sıfırlandı və yenidən seed edildi')
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
      setToast(`Ssenari dəyişdirildi: ${scenarioName(slug, slug.replaceAll('_', ' '))}`)
      const stateResponse = await client.get('/simulation/state')
      setScenarioState({ scenarios: stateResponse.data.scenarios || [], activeScenarioSlug: stateResponse.data.active_scenario })
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Ssenari dəyişdirilə bilmədi')
    }
  }

  useEffect(() => {
    if (!autoCycle || !scenarios.length) return undefined
    const timer = setInterval(() => {
      const index = scenarios.findIndex((item) => item.slug === activeScenarioSlug)
      const next = scenarios[(index + 1) % scenarios.length]
      if (next) {
        switchScenario(next.slug)
      }
    }, 8000)
    return () => clearInterval(timer)
  }, [autoCycle, activeScenarioSlug, scenarios])

  const seedStats = useMemo(
    () => [
      { label: 'Fermerlər', value: summary?.total_farmers ?? '—' },
      { label: 'Təsərrüfatlar', value: summary?.total_farms ?? '—' },
      { label: 'Sahələr', value: summary?.total_fields ?? '—' },
      { label: 'Təhlil icraları', value: summary?.total_analysis_runs ?? '—' },
    ],
    [summary],
  )

  if (loading) {
    return <div className="p-6 text-slate-500">Admin idarəetməsi yüklənir…</div>
  }

  return (
    <div className="space-y-6 p-6">
      {toast ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{toast}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}

      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-700 to-emerald-800 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Demo İdarəetmə Mərkəzi</h1>
            <p className="mt-1 text-sm text-emerald-50">Təqdimat üçün ssenari nəzarəti, canlı status və avtomatik nümayiş rejimi.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100">Aktiv ssenari</div>
            <div className="mt-1 text-lg font-bold">{activeScenarioName || '—'}</div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-700"><TriangleAlert className="h-4 w-4" /> 1. Bütün datanı sıfırla</div>
          <p className="text-sm text-slate-600">Bütün təhlil və tövsiyə məlumatlarını silir, sonra dataset-i yenidən seed edir.</p>
          <button
            type="button"
            onClick={resetSimulation}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            <RefreshCcw className="h-4 w-4" /> Bütün datanı sıfırla
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">2. Ssenari kartları</div>
            <label className="flex items-center gap-2 rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Auto-cycle
              <input type="checkbox" checked={autoCycle} onChange={(e) => setAutoCycle(e.target.checked)} className="h-3.5 w-3.5 accent-amber-600" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {scenarios.map((scenario) => {
              const active = activeScenarioSlug === scenario.slug
              const iconMap = {
                healthy_field: '✅',
                drought_stress: '🌵',
                disease_outbreak: '🦠',
              }
              return (
                <button
                  key={scenario.slug}
                  type="button"
                  onClick={() => switchScenario(scenario.slug)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 ${active ? 'border-emerald-400 bg-emerald-100 shadow-sm' : 'border-amber-200 bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <div className="font-semibold text-slate-900">{iconMap[scenario.slug] || '🌾'} {scenarioName(scenario.slug, scenario.name)}</div>
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
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500"><Settings2 className="h-4 w-4" /> 3. Təqdimat rejimi</div>
          <p className="text-sm text-slate-600">Tam ekran təqdimat üçün yan panel və üst panel gizlədilir. Aşağı mərkəzdə üzən ssenari seçimi görünür.</p>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex-1">
              <div className="font-medium text-slate-900">Təqdimat rejimi</div>
              <div className="text-sm text-slate-500">{presentationMode ? 'Aktiv' : 'Deaktiv'}</div>
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

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sistem statusu</div>
          <div className="space-y-4">
            <div className={`rounded-2xl border px-4 py-3 ${statusCardClass(Boolean(health?.status === 'ok'))}`}>
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${statusDot(Boolean(health?.status === 'ok'))}`} />
                <div>
                  <div className="font-semibold">API statusu</div>
                  <div className="text-sm">{health?.status === 'ok' ? 'Sağlam' : 'Əlçatmaz'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${statusDot(Boolean(summary))}`} />
                <div>
                  <div className="font-semibold text-slate-900">DB bağlantısı</div>
                  <div className="text-sm">{summary ? 'Canlı aqreqasiya sorğuları ilə bağlıdır' : 'Əlçatmaz'}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><Activity className="h-4 w-4" /> Canlı simulyasiya statusu</div>
              <div className="mt-1 text-xs text-amber-700">Ssenari yeniləmələri aktivdir, subsidiya mühərriki sinxron işləyir.</div>
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
