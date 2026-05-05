import React, { useEffect, useMemo, useState } from 'react'
import { BadgeDollarSign, Sparkles, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'
import Spinner from '../components/common/Spinner'
import ErrorCard from '../components/common/ErrorCard'
import OptionSelect from '../components/common/OptionSelect'
import { formatCurrencyAzn, formatNumber } from '../utils/format'
import { formatFieldLabel } from '../constants/azText'

function fieldLabel(field) {
  return formatFieldLabel(field)
}

function effectLabel(value) {
  if (value > 1) return 'Subsidiyanı artırır'
  if (value < 1) return 'Subsidiyanı azaldır'
  return 'Neytral'
}

function effectIcon(value) {
  if (value > 1) return '↑'
  if (value < 1) return '↓'
  return '→'
}

function factorTooltip(name) {
  switch (name) {
    case 'base':
      return 'Baza ayrılması hektara görə AZN ilə hesablanır.'
    case 'performance':
      return 'Faktiki və potensial məhsuldarlıq nisbətinə əsaslanır.'
    case 'efficiency':
      return 'Suvarma sisteminin səmərəliliyini göstərir.'
    case 'water':
      return 'Həddindən artıq su istifadəsi və ya rütubət stresinə düzəliş edir.'
    case 'yield':
      return 'Məhsuldarlıq hədəfini keçən nəticələri stimullaşdırır.'
    default:
      return ''
  }
}

function formatAzn(value) {
  return formatCurrencyAzn(value || 0, 0)
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
        if (mounted) setMessage(error?.response?.data?.message || 'Sahələr yüklənə bilmədi')
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
      setMessage(error?.response?.data?.message || 'Subsidiya tövsiyəsi yüklənə bilmədi')
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
      setMessage(error?.response?.data?.message || 'Subsidiya təkmilləşmə ssenarisi işə salına bilmədi')
    } finally {
      setFetchingRecommendation(false)
    }
  }

  if (loading) {
    return <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, idx) => <div key={idx} className="h-24 animate-pulse rounded-2xl bg-emerald-100/60" />)}</div>
  }

  if (!fields.length) {
    return (
      <div className="p-6">
        <ErrorCard message="Subsidiya hesablaması üçün sahə tapılmadı. Seed məlumatlarını yenidən yükləyin." />
      </div>
    )
  }

  const deltaValue = comparison ? comparison.after - comparison.before : 0

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-500 to-emerald-700 p-6 text-white shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><BadgeDollarSign className="h-6 w-6" /> Dinamik subsidiya mühərriki</h1>
        <p className="mt-1 text-sm text-amber-50">Sahə üzrə subsidiya hesablaması, amil təsirləri və ssenariyə əsaslanan təkmilləşmə.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="text-sm font-medium text-slate-600">
            Sahə
            <div className="mt-1 min-w-80">
              <OptionSelect
                value={selectedFieldId}
                onChange={setSelectedFieldId}
                options={fields.map((field) => ({ value: String(field.id), label: field.label }))}
              />
            </div>
          </label>

          <button
            type="button"
            onClick={runImprovementScenario}
            disabled={fetchingRecommendation}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {fetchingRecommendation ? 'İşlənir…' : <><TrendingUp className="h-4 w-4" /> Subsidiya təkmilləşmə ssenarisi</>}
          </button>
        </div>

        {message ? <ErrorCard message={message} /> : null}
      </div>

      {recommendation ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Subsidiya hesablamasının detalları</h2>
                <p className="text-sm text-slate-500">Canlı tövsiyə üzrə amillərin yekun subsidiyaya təsiri.</p>
              </div>
            </div>

            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value, key) => [formatAzn(value), key]} />
                  <Bar dataKey="base" stackId="a" fill="#fbbf24" name="Baza subsidiya" />
                  <Bar dataKey="performance" stackId="a" fill="#34d399" name="Performans amili" />
                  <Bar dataKey="efficiency" stackId="a" fill="#10b981" name="Səmərəlilik amili" />
                  <Bar dataKey="water" stackId="a" fill="#059669" name="Su istifadəsi amili" />
                  <Bar dataKey="yield" stackId="a" fill="#92400e" name="Məhsul uyğunluğu" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                ['Baza subsidiya', recommendation.base_subsidy_azn, 'Hektar üzrə baza məbləğ', 'base'],
                ['Performans amili', recommendation.performance_factor, factorTooltip('performance'), 'performance'],
                ['Səmərəlilik amili', recommendation.efficiency_factor, factorTooltip('efficiency'), 'efficiency'],
                ['Su istifadəsi amili', recommendation.water_use_factor, factorTooltip('water'), 'water'],
                ['Məhsul uyğunluğu', recommendation.yield_alignment_factor, factorTooltip('yield'), 'yield'],
              ].map(([label, value, tip]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3" title={tip}>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{typeof value === 'number' && value < 10 ? formatNumber(value, 2) : formatAzn(value)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
              <div className="text-sm font-medium text-emerald-700">Yekun tövsiyə</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight text-emerald-800">{formatAzn(recommendation.final_subsidy_azn)}</div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Subsidiyanı hansı amillər formalaşdırır?</h2>
                <p className="text-sm text-slate-500">API-dən gələn canlı dəyərlər üzrə addım-addım izah.</p>
            </div>

            <div className="space-y-3">
              {[
                ['Baza subsidiya', recommendation.base_subsidy_azn, 'Baza ayrılma', recommendation.base_subsidy_azn / 100],
                ['Performans amili', recommendation.performance_factor, 'Məhsuldarlıq nisbətinə görə', recommendation.performance_factor],
                ['Səmərəlilik amili', recommendation.efficiency_factor, 'Suvarma effektivliyi təsiri', recommendation.efficiency_factor],
                ['Su istifadəsi amili', recommendation.water_use_factor, 'Su istifadəsi səmərəliliyi', recommendation.water_use_factor],
                ['Məhsul uyğunluğu', recommendation.yield_alignment_factor, 'Hədəf məhsula uyğunluq', recommendation.yield_alignment_factor],
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
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hesablama qeydi</div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{recommendation.calculation_note}</p>
            </div>
          </section>
        </div>
      ) : (
        <Spinner />
      )}

      {comparison ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          <Sparkles className="mr-1 inline h-4 w-4" />
          ↑ {deltaValue >= 0 ? '+' : '-'}{formatNumber(Math.abs(deltaValue), 0)} AZN səmərəlilik təkmilləşməsi ilə
          <div className="mt-1 text-xs font-medium text-emerald-600">
            Before: {formatAzn(comparison.before)} · After: {formatAzn(comparison.after)}
          </div>
        </div>
      ) : null}
    </div>
  )
}
