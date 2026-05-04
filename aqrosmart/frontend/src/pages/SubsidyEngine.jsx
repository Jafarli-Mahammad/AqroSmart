import React, { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'
import Spinner from '../components/common/Spinner'
import ErrorCard from '../components/common/ErrorCard'
import { formatNumber } from '../utils/format'

function fieldLabel(field) {
  return `${field.name} · ${field.crop_type} · ${field.irrigation_type}`
}

function effectLabel(value) {
  if (value > 1) return 'Boosts subsidy'
  if (value < 1) return 'Reduces subsidy'
  return 'Neutral'
}

function effectIcon(value) {
  if (value > 1) return '↑'
  if (value < 1) return '↓'
  return '→'
}

function factorTooltip(name) {
  switch (name) {
    case 'base':
      return 'Baseline allocation set at 120 AZN per hectare.'
    case 'performance':
      return 'Based on actual vs potential yield.'
    case 'efficiency':
      return 'Reflects irrigation system efficiency.'
    case 'water':
      return 'Penalizes excessive water use or moisture stress.'
    case 'yield':
      return 'Rewards productivity above the 70% benchmark.'
    default:
      return ''
  }
}

function formatAzn(value) {
  return `${formatNumber(value || 0, 0)} AZN`
}

export default function SubsidyEngine() {
  const { activeScenarioSlug, setActiveScenario, scenarios } = useScenarioStore((state) => ({
    activeScenarioSlug: state.activeScenarioSlug,
    setActiveScenario: state.setActiveScenario,
    scenarios: state.scenarios,
  }))
  const [fields, setFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchingRecommendation, setFetchingRecommendation] = useState(false)
  const [recommendation, setRecommendation] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadFields() {
      try {
        const farmsResponse = await client.get('/farms')
        const farmDetails = await Promise.all((farmsResponse.data || []).map((farm) => client.get(`/farms/${farm.id}`)))
        if (!mounted) return

        const fieldOptions = farmDetails.flatMap((response) =>
          (response.data.fields || []).map((field) => ({
            id: field.id,
            label: fieldLabel(field),
          })),
        )
        setFields(fieldOptions)
        if (fieldOptions.length) {
          setSelectedFieldId(String(fieldOptions[0].id))
        }
      } catch (error) {
        if (mounted) setMessage(error?.response?.data?.message || 'Unable to load fields')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadFields()

    return () => {
      mounted = false
    }
  }, [])

  async function loadRecommendation(fieldId = selectedFieldId) {
    if (!fieldId) return null
    setFetchingRecommendation(true)
    setMessage('')
    try {
      const response = await client.get(`/subsidy/recommendation/${fieldId}`)
      setRecommendation(response.data)
      return response.data
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to load subsidy recommendation')
      return null
    } finally {
      setFetchingRecommendation(false)
    }
  }

  useEffect(() => {
    if (selectedFieldId) {
      loadRecommendation(selectedFieldId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId])

  const chartData = useMemo(() => {
    if (!recommendation) return []
    return [
      {
        name: 'Subsidy',
        base: recommendation.base_subsidy_azn || 0,
        performance: (recommendation.base_subsidy_azn || 0) * (recommendation.performance_factor || 0),
        efficiency: (recommendation.base_subsidy_azn || 0) * (recommendation.performance_factor || 0) * (recommendation.efficiency_factor || 0),
        water: (recommendation.base_subsidy_azn || 0) * (recommendation.performance_factor || 0) * (recommendation.efficiency_factor || 0) * (recommendation.water_use_factor || 0),
        yield: recommendation.final_subsidy_azn || 0,
      },
    ]
  }, [recommendation])

  async function runImprovementScenario() {
    if (!selectedFieldId || !recommendation) return
    const beforeValue = recommendation.final_subsidy_azn || 0
    setFetchingRecommendation(true)
    setMessage('')
    try {
      await client.post('/simulation/scenario/subsidy_improvement')
      setActiveScenario('subsidy_improvement', scenarios)
      const analysisResponse = await client.post('/analysis/run', {
        field_id: Number(selectedFieldId),
        scenario_slug: 'subsidy_improvement',
      })
      const afterValue = analysisResponse.data?.subsidy_breakdown?.final_subsidy_azn || 0
      const refreshed = await loadRecommendation(selectedFieldId)
      setComparison({ before: beforeValue, after: afterValue || refreshed?.final_subsidy_azn || 0 })
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to run subsidy improvement scenario')
    } finally {
      setFetchingRecommendation(false)
    }
  }

  if (loading) {
    return <Spinner />
  }

  const deltaValue = comparison ? comparison.after - comparison.before : 0

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dynamic Subsidy Engine</h1>
        <p className="mt-1 text-sm text-slate-500">Field-by-field subsidy logic with visible factor contributions and scenario-based improvement.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="text-sm font-medium text-slate-600">
            Field
            <select
              className="mt-1 block min-w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
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
            onClick={runImprovementScenario}
            disabled={fetchingRecommendation}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {fetchingRecommendation ? 'Running…' : 'Subsidy Improvement Scenario'}
          </button>
        </div>

        {message ? <ErrorCard message={message} /> : null}
      </div>

      {recommendation ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Subsidy Calculation Breakdown</h2>
                <p className="text-sm text-slate-500">Stacked factor contribution from the live recommendation.</p>
              </div>
            </div>

            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value, key) => [formatAzn(value), key]} />
                  <Bar dataKey="base" stackId="a" fill="#cbd5e1" name="Base Subsidy" />
                  <Bar dataKey="performance" stackId="a" fill="#34d399" name="Performance Factor" />
                  <Bar dataKey="efficiency" stackId="a" fill="#10b981" name="Efficiency Factor" />
                  <Bar dataKey="water" stackId="a" fill="#059669" name="Water Use Factor" />
                  <Bar dataKey="yield" stackId="a" fill="#047857" name="Yield Alignment" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                ['Base Subsidy', recommendation.base_subsidy_azn, 'Base allocation per hectare', 'base'],
                ['Performance Factor', recommendation.performance_factor, factorTooltip('performance'), 'performance'],
                ['Efficiency Factor', recommendation.efficiency_factor, factorTooltip('efficiency'), 'efficiency'],
                ['Water Use Factor', recommendation.water_use_factor, factorTooltip('water'), 'water'],
                ['Yield Alignment', recommendation.yield_alignment_factor, factorTooltip('yield'), 'yield'],
              ].map(([label, value, tip]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3" title={tip}>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{typeof value === 'number' && value < 10 ? formatNumber(value, 2) : formatAzn(value)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
              <div className="text-sm font-medium text-emerald-700">Final Recommendation</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight text-emerald-800">{formatAzn(recommendation.final_subsidy_azn)}</div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">What drives your subsidy?</h2>
              <p className="text-sm text-slate-500">Factor-by-factor logic with the live values returned by the API.</p>
            </div>

            <div className="space-y-3">
              {[
                ['Base Subsidy', recommendation.base_subsidy_azn, 'Baseline allocation', recommendation.base_subsidy_azn / 100],
                ['Performance Factor', recommendation.performance_factor, 'Based on yield ratio', recommendation.performance_factor],
                ['Efficiency Factor', recommendation.efficiency_factor, 'Irrigation efficiency effect', recommendation.efficiency_factor],
                ['Water Use Factor', recommendation.water_use_factor, 'Water-use efficiency effect', recommendation.water_use_factor],
                ['Yield Alignment', recommendation.yield_alignment_factor, 'Alignment to target yield', recommendation.yield_alignment_factor],
              ].map(([label, value, effect, numeric]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{label}</div>
                    <div className="text-xs text-slate-500">{effect}</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-700">{typeof value === 'number' && value < 10 ? formatNumber(value, 2) : formatAzn(value)}</span>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">{effectLabel(Number(numeric))}</span>
                    <span className="text-lg font-semibold text-slate-500" title={factorTooltip(String(label).toLowerCase())}>{effectIcon(Number(numeric))}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Calculation Note</div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{recommendation.calculation_note}</p>
            </div>
          </section>
        </div>
      ) : (
        <Spinner />
      )}

      {comparison ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          ↑ {deltaValue >= 0 ? '+' : '-'}{formatNumber(Math.abs(deltaValue), 0)} AZN with efficiency improvements
          <div className="mt-1 text-xs font-medium text-emerald-600">
            Before: {formatAzn(comparison.before)} · After: {formatAzn(comparison.after)}
          </div>
        </div>
      ) : null}
    </div>
  )
}
