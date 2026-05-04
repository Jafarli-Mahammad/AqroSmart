import React, { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'
import Spinner from '../components/common/Spinner'
import ErrorCard from '../components/common/ErrorCard'
import { formatNumber } from '../utils/format'

const scenarioColors = {
  healthy_field: 'bg-emerald-500',
  drought_stress: 'bg-orange-500',
  disease_outbreak: 'bg-red-500',
  irrigation_recovery: 'bg-sky-500',
  high_efficiency: 'bg-emerald-600',
  low_efficiency: 'bg-amber-500',
  subsidy_improvement: 'bg-lime-500',
}

const scenarioDescriptions = {
  healthy_field: 'Baseline healthy crop conditions with stable moisture and strong vegetation.',
  drought_stress: 'Hot, dry conditions with reduced soil moisture and suppressed yield.',
  disease_outbreak: 'Crop health is constrained by disease pressure and lower vegetation index.',
  irrigation_recovery: 'Fields recover after targeted irrigation restores moisture balance.',
  high_efficiency: 'Strong field performance with efficient water use and optimized inputs.',
  low_efficiency: 'Operational drag reduces productivity and irrigation effectiveness.',
  subsidy_improvement: 'Improved subsidy eligibility with stronger yield alignment.',
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
  return `${field.name} · ${field.crop_type} · ${field.irrigation_type}`
}

function recommendedAction(result) {
  if (!result) return 'Run an analysis to receive a field recommendation.'
  if ((result.moisture_stress_score || 0) > 40) return 'Prioritize irrigation recovery and protect the root zone before yield loss deepens.'
  if ((result.disease_risk_score || 0) > 30) return 'Increase scouting frequency and isolate any stressed blocks to reduce disease spread.'
  if ((result.productivity_score || 0) >= 80) return 'Maintain current management, preserve moisture balance, and keep monitoring weekly.'
  return 'Fine-tune irrigation timing and continue monitoring vegetation health for the next cycle.'
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
          <span>Actual Yield</span>
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
          <span>Potential Yield</span>
          <span>{formatNumber(potential || 0, 2)} t</span>
        </div>
        <div className="relative h-5 rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-200 transition-all duration-700" style={{ width: `${potentialWidth}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Green = actual performance</span>
        <span className="text-rose-500">Red = yield gap</span>
      </div>
    </div>
  )
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
        if (mounted) setMessage(error?.response?.data?.message || 'Unable to load simulation data')
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
      setMessage(error?.response?.data?.message || 'Unable to run analysis')
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
      setMessage(error?.response?.data?.message || 'Unable to switch scenario')
    }
  }

  useEffect(() => {
    if (selectedFieldId && activeScenarioSlug) {
      runAnalysis(selectedFieldId, activeScenarioSlug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId, activeScenarioSlug])

  if (loadingFields) {
    return <Spinner />
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Scenario Selector</h2>
            <p className="text-sm text-slate-500">Pick a pilot-zone scenario to re-run the field analysis.</p>
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
                      {scenarioDescriptions[scenario.slug] || scenario.description || 'Scenario details available from the API.'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live Field Analysis</h2>
              <p className="text-sm text-slate-500">Active scenario: {activeScenarioName}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm font-medium text-slate-600">
                Field
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
                {loadingAnalysis ? 'Running…' : 'Run Analysis'}
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
                <div className={`rounded-2xl p-5 ${ProductivityTone(analysisResult.analysis_result?.productivity_score || 0)}`}>
                  <div className="text-sm font-medium text-slate-500">Productivity Score</div>
                  <div className="mt-2 text-5xl font-semibold tracking-tight">
                    {formatNumber(analysisResult.analysis_result?.productivity_score || 0, 1)}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <ProgressRow label="Crop Health" value={analysisResult.analysis_result?.crop_health_score} tone="bg-emerald-500" />
                  <ProgressRow label="Moisture Stress" value={analysisResult.analysis_result?.moisture_stress_score} tone="bg-amber-500" />
                  <ProgressRow label="Disease Risk" value={analysisResult.analysis_result?.disease_risk_score} tone="bg-rose-500" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${ConfidenceTone(analysisResult.analysis_result?.confidence_pct || 0)}`}>
                  Confidence {formatNumber(analysisResult.analysis_result?.confidence_pct || 0, 1)}%
                </span>
                <span className="text-sm text-slate-500">
                  Scenario run ID: {analysisResult.analysis_run_id} · Recommendation IDs: {analysisResult.subsidy_recommendation_id}, {analysisResult.irrigation_recommendation_id}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended Action</div>
                <p className="mt-3 text-base leading-7 text-slate-700">{recommendedAction(analysisResult.analysis_result)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              Select a field and scenario to generate the first analysis.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
