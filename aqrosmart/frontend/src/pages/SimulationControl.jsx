import React, { useEffect, useMemo, useState } from 'react'
import { Activity, FlaskConical, Leaf, PlayCircle, Sparkles } from 'lucide-react'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'
import Spinner from '../components/common/Spinner'
import ErrorCard from '../components/common/ErrorCard'
import { formatNumber } from '../utils/format'
import { formatFieldLabel, scenarioDescription } from '../constants/azText'

const scenarioColors = {
  healthy_field: 'bg-emerald-500',
  drought_stress: 'bg-orange-500',
  disease_outbreak: 'bg-red-500',
  irrigation_recovery: 'bg-sky-500',
  high_efficiency: 'bg-emerald-600',
  low_efficiency: 'bg-amber-500',
  subsidy_improvement: 'bg-lime-500',
}

function ProgressRow({ label, value, tone = 'bg-emerald-500' }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full transition-all duration-700 ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function ProductivityTone(score) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

function ConfidenceTone(score) {
  if (score >= 85) return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  if (score >= 70) return 'bg-amber-100 text-amber-700 ring-amber-200'
  return 'bg-rose-100 text-rose-700 ring-rose-200'
}

function fieldLabel(field) {
  return formatFieldLabel(field)
}

function recommendedAction(result) {
  if (!result) return 'Tövsiyə almaq üçün təhlili işə salın.'
  if ((result.moisture_stress_score || 0) > 40) return 'Rütubət stresini azaltmaq üçün suvarmanı prioritetləşdirin və kök zonasını qoruyun.'
  if ((result.disease_risk_score || 0) > 30) return 'Xəstəlik yayılmasını azaltmaq üçün monitorinqi artırın və riskli sahələri ayırın.'
  if ((result.productivity_score || 0) >= 80) return 'Mövcud idarəetməni qoruyun və həftəlik monitorinqi davam etdirin.'
  return 'Suvarma qrafikini dəqiqləşdirin və vegetasiya göstəricilərini izləməyə davam edin.'
}

function YieldComparison({ potential, actual }) {
  const maxValue = Math.max(Number(potential) || 0, Number(actual) || 0, 1)
  const actualWidth = ((Number(actual) || 0) / maxValue) * 100
  const potentialWidth = ((Number(potential) || 0) / maxValue) * 100
  const gapWidth = Math.max(potentialWidth - actualWidth, 0)

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
          <span>Faktiki məhsuldarlıq</span>
          <span>{formatNumber(actual || 0, 2)} t</span>
        </div>
        <div className="relative h-5 rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${actualWidth}%` }} />
          <div className="absolute inset-y-0 rounded-full bg-rose-500/40 transition-all duration-700" style={{ left: `${actualWidth}%`, width: `${gapWidth}%` }} />
          <div className="absolute inset-y-0 rounded-full border border-emerald-300/80" style={{ width: `${potentialWidth}%` }} />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
          <span>Potensial məhsuldarlıq</span>
          <span>{formatNumber(potential || 0, 2)} t</span>
        </div>
        <div className="relative h-5 rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-200 transition-all duration-700" style={{ width: `${potentialWidth}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Yaşıl = faktiki nəticə</span>
        <span className="text-rose-500">Qırmızı = məhsuldarlıq fərqi</span>
      </div>
    </div>
  )
}

function SkeletonBlock() {
  return <div className="h-24 animate-pulse rounded-2xl bg-emerald-100/60" />
}

export default function SimulationControl() {
  const { scenarios, activeScenarioSlug, activeScenarioName, setScenarioState, setActiveScenario } = useScenarioStore((state) => ({
    scenarios: state.scenarios,
    activeScenarioSlug: state.activeScenarioSlug,
    activeScenarioName: state.activeScenarioName,
    setScenarioState: state.setScenarioState,
    setActiveScenario: state.setActiveScenario,
  }))
  const [fields, setFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadState() {
      try {
        const [stateResponse, farmsResponse] = await Promise.all([client.get('/simulation/state'), client.get('/farms')])
        if (!mounted) return
        setScenarioState({ scenarios: stateResponse.data.scenarios || [], activeScenarioSlug: stateResponse.data.active_scenario })

        const farmDetails = await Promise.all((farmsResponse.data || []).map((farm) => client.get(`/farms/${farm.id}`)))
        if (!mounted) return

        const fieldOptions = farmDetails.flatMap((response) =>
          (response.data.fields || []).map((field) => ({
            id: field.id,
            farmId: response.data.id,
            farmName: response.data.name,
            label: fieldLabel(field),
            field,
          })),
        )
        setFields(fieldOptions)
        if (fieldOptions.length && !selectedFieldId) {
          setSelectedFieldId(String(fieldOptions[0].id))
        }
      } catch (error) {
        if (mounted) setMessage(error?.response?.data?.message || 'Simulyasiya məlumatları yüklənə bilmədi')
      } finally {
        if (mounted) setLoadingFields(false)
      }
    }

    loadState()

    return () => {
      mounted = false
    }
  }, [setScenarioState])

  const selectedField = useMemo(() => fields.find((field) => String(field.id) === String(selectedFieldId)), [fields, selectedFieldId])

  async function runAnalysis(fieldId = selectedFieldId, scenarioSlug = activeScenarioSlug) {
    if (!fieldId || !scenarioSlug) return
    setLoadingAnalysis(true)
    setMessage('')
    try {
      const response = await client.post('/analysis/run', { field_id: Number(fieldId), scenario_slug: scenarioSlug })
      setAnalysisResult(response.data)
      if (activeScenarioSlug !== scenarioSlug) {
        setActiveScenario(scenarioSlug, scenarios)
      }
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Təhlil işə salına bilmədi')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  async function handleScenarioClick(slug) {
    const previousSlug = activeScenarioSlug
    setActiveScenario(slug, scenarios)
    try {
      await client.post(`/simulation/scenario/${slug}`)
      if (selectedFieldId) {
        runAnalysis(selectedFieldId, slug)
      }
    } catch (error) {
      setActiveScenario(previousSlug, scenarios)
      setMessage(error?.response?.data?.message || 'Ssenari dəyişdirilə bilmədi')
    }
  }

  useEffect(() => {
    if (selectedFieldId && activeScenarioSlug) {
      runAnalysis(selectedFieldId, activeScenarioSlug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId, activeScenarioSlug])

  if (loadingFields) {
    return <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, idx) => <SkeletonBlock key={idx} />)}</div>
  }

  if (!fields.length) {
    return (
      <div className="p-6">
        <ErrorCard message="Sahə məlumatı tapılmadı. Seed əməliyyatını icra edib səhifəni yeniləyin." />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-700 to-emerald-800 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Simulyasiya idarəetmə mərkəzi</h1>
            <p className="mt-1 text-sm text-emerald-100">Ssenari əsaslı məhsuldarlıq, risk və subsidiyaların canlı təhlili.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100">Aktiv rejim</div>
            <div className="mt-1 font-semibold">{activeScenarioName}</div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FlaskConical className="h-5 w-5 text-emerald-700" /> Ssenari seçimi</h2>
            <p className="text-sm text-slate-500">Sahə təhlilini yenidən aparmaq üçün ssenari seçin.</p>
          </div>

          <div className="space-y-3">
            {(scenarios.length ? scenarios : []).map((scenario) => (
              <button
                key={scenario.slug}
                type="button"
                onClick={() => handleScenarioClick(scenario.slug)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  activeScenarioSlug === scenario.slug ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-3 w-3 rounded-full ${scenarioColors[scenario.slug] || 'bg-slate-400'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{scenario.name}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {scenarioDescription(scenario.slug, scenario.description)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Activity className="h-5 w-5 text-emerald-700" /> Canlı sahə təhlili</h2>
              <p className="text-sm text-slate-500">Aktiv ssenari: {activeScenarioName}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm font-medium text-slate-600">
                Sahə
                <select
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
                  value={selectedFieldId}
                  onChange={(event) => setSelectedFieldId(event.target.value)}
                >
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => runAnalysis(selectedFieldId, activeScenarioSlug)}
                disabled={loadingAnalysis}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingAnalysis ? 'İşlənir…' : <span className="inline-flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Təhlili işə sal</span>}
              </button>
            </div>
          </div>

          {message ? <ErrorCard message={message} /> : null}

          {loadingAnalysis && !analysisResult ? (
            <Spinner />
          ) : analysisResult ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <YieldComparison
                  potential={analysisResult.analysis_result?.potential_yield_t}
                  actual={analysisResult.analysis_result?.actual_yield_t}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={`rounded-2xl border border-emerald-100 p-5 ${ProductivityTone(analysisResult.analysis_result?.productivity_score || 0)}`}>
                  <div className="text-sm font-medium text-slate-500">Məhsuldarlıq göstəricisi</div>
                  <div className="mt-2 text-5xl font-semibold tracking-tight">
                    {formatNumber(analysisResult.analysis_result?.productivity_score || 0, 1)}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <ProgressRow label="Bitki sağlamlığı" value={analysisResult.analysis_result?.crop_health_score} tone="bg-emerald-500" />
                  <ProgressRow label="Rütubət stresi" value={analysisResult.analysis_result?.moisture_stress_score} tone="bg-amber-500" />
                  <ProgressRow label="Xəstəlik riski" value={analysisResult.analysis_result?.disease_risk_score} tone="bg-rose-500" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${ConfidenceTone(analysisResult.analysis_result?.confidence_pct || 0)}`}>
                  Etibarlılıq {formatNumber(analysisResult.analysis_result?.confidence_pct || 0, 1)}%
                </span>
                <span className="text-sm text-slate-500">
                  Ssenari icra ID: {analysisResult.analysis_run_id} · Tövsiyə ID-ləri: {analysisResult.subsidy_recommendation_id}, {analysisResult.irrigation_recommendation_id}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Tövsiyə olunan addım</div>
                <p className="mt-3 flex items-start gap-2 text-base leading-7 text-slate-700"><Sparkles className="mt-1 h-4 w-4 text-amber-500" /> {recommendedAction(analysisResult.analysis_result)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              <Leaf className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
              İlk təhlili almaq üçün sahə və ssenari seçin.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
