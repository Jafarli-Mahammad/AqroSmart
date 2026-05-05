import React, { useEffect, useMemo, useState } from 'react'
import { Droplets, Leaf, RefreshCw, Waves } from 'lucide-react'
import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'
import { formatDateTime } from '../utils/format'
import { formatFieldLabel } from '../constants/azText'
import ErrorCard from '../components/common/ErrorCard'
import OptionSelect from '../components/common/OptionSelect'

function Spinner() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-44 animate-pulse rounded-2xl bg-emerald-100/60" />
      ))}
    </div>
  )
}

function gaugeColor(value, optimalMin, optimalMax) {
  if (value >= optimalMin && value <= optimalMax) return '#16a34a'
  if (value >= optimalMin - 12 && value <= optimalMax + 12) return '#f59e0b'
  return '#ef4444'
}

function GaugeCard({ label, value, unit, min, optimalMin, optimalMax, max }) {
  const current = Math.max(min, Math.min(max, Number(value) || 0))
  const color = gaugeColor(current, optimalMin, optimalMax)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {Number(current).toFixed(1)} <span className="text-sm font-medium text-slate-500">{unit}</span>
          </div>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live</div>
      </div>

      <div className="relative mt-2 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ name: label, value: current }]}
            innerRadius="74%"
            outerRadius="100%"
            barSize={18}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[min, max]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={999} fill={color} background={{ fill: '#e2e8f0' }} />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Optimal</div>
          <div className="mt-1 text-sm font-semibold text-slate-700">
            {optimalMin.toFixed(0)}-{optimalMax.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>Min {min}</span>
        <span>Optimal {optimalMin}-{optimalMax}</span>
        <span>Max {max}</span>
      </div>
    </div>
  )
}

function urgencyStyles(level) {
  switch ((level || '').toLowerCase()) {
    case 'critical':
      return 'bg-red-100 text-red-700 ring-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-700 ring-orange-200'
    case 'medium':
      return 'bg-amber-100 text-amber-700 ring-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

function fieldTitle(field) {
  return formatFieldLabel(field)
}

export default function IrrigationHub() {
  const { activeScenarioSlug, setActiveScenario, scenarios } = useScenarioStore((state) => ({
    activeScenarioSlug: state.activeScenarioSlug,
    setActiveScenario: state.setActiveScenario,
    scenarios: state.scenarios,
  }))
  const [fields, setFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
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
            label: fieldTitle(field),
            field,
          })),
        )
        setFields(fieldOptions)
        if (fieldOptions.length) {
          setSelectedFieldId(String(fieldOptions[0].id))
        }
      } catch (error) {
        if (mounted) setMessage(error?.response?.data?.detail || 'Suvarma üçün sahələr yüklənə bilmədi')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadFields()

    return () => {
      mounted = false
    }
  }, [])

  const selectedField = useMemo(() => fields.find((field) => String(field.id) === String(selectedFieldId)), [fields, selectedFieldId])

  async function loadRecommendation(fieldId = selectedFieldId) {
    if (!fieldId) return
    setBusy(true)
    setMessage('')
    try {
      const response = await client.get(`/irrigation/recommendation/${fieldId}`)
      setRecommendation(response.data)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Suvarma tövsiyəsi yüklənə bilmədi')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (selectedFieldId) {
      loadRecommendation(selectedFieldId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId])

  async function simulateRecovery() {
    if (!selectedFieldId) return
    setBusy(true)
    setMessage('')
    try {
      await client.post('/simulation/scenario/irrigation_recovery')
      setActiveScenario('irrigation_recovery', scenarios)
      await client.post('/analysis/run', {
        field_id: Number(selectedFieldId),
        scenario_slug: 'irrigation_recovery',
      })
      await loadRecommendation(selectedFieldId)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Suvarma bərpa simulyasiyası işə salına bilmədi')
    } finally {
      setBusy(false)
    }
  }

  const beforeUsage = recommendation?.estimated_water_usage_before_l || 0
  const afterUsage = recommendation?.estimated_water_usage_after_l || 0
  const savingsPct = beforeUsage > 0 ? Math.max(0, ((beforeUsage - afterUsage) / beforeUsage) * 100) : 0

  if (loading) {
    return <Spinner />
  }

  if (!fields.length) {
    return (
      <div className="p-6">
        <ErrorCard message="Suvarma üçün sahə tapılmadı. Seed əməliyyatını yenidən icra edin." />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-700 to-emerald-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Droplets className="h-6 w-6" /> Ağıllı suvarma mərkəzi</h1>
            <p className="mt-1 text-sm text-cyan-50">Aktiv pilot sahələr üçün real vaxt suvarma yönləndirməsi.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-80">
              <OptionSelect
                value={selectedFieldId}
                onChange={setSelectedFieldId}
                options={fields.map((field) => ({ value: String(field.id), label: field.label }))}
              />
            </div>

            <button
              type="button"
              onClick={simulateRecovery}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-cyan-800 shadow-sm transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? 'Simulyasiya olunur…' : <><RefreshCw className="h-4 w-4" /> Suvarma bərpasını simulyasiya et</>}
            </button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div> : null}
      </div>

      {recommendation ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GaugeCard
              label="Torpaq rütubəti"
              value={recommendation.sensor_reading?.soil_moisture_pct || recommendation.current_soil_moisture}
              unit="%"
              min={0}
              optimalMin={45}
              optimalMax={70}
              max={100}
            />
            <GaugeCard
              label="Su axını"
              value={recommendation.sensor_reading?.water_flow_lph || recommendation.recommended_water_mm * 10}
              unit="L/h"
              min={0}
              optimalMin={10}
              optimalMax={35}
              max={80}
            />
            <GaugeCard
              label="Hava temperaturu"
              value={recommendation.sensor_reading?.air_temperature_c || 0}
              unit="°C"
              min={0}
              optimalMin={20}
              optimalMax={32}
              max={45}
            />
            <GaugeCard
              label="Rütubət"
              value={recommendation.sensor_reading?.humidity_pct || 0}
              unit="%"
              min={0}
              optimalMin={45}
              optimalMax={70}
              max={100}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Waves className="h-5 w-5 text-cyan-700" /> Su istifadəsi: əvvəl / sonra</h2>
                  <p className="text-sm text-slate-500">Son suvarma tövsiyəsindən sonra gözlənilən dəyişiklik.</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${urgencyStyles(recommendation.urgency_level)}`}>
                  {recommendation.urgency_level || 'unknown'}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-500">Əvvəl</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{beforeUsage.toFixed(1)} L</div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-400 transition-all duration-700" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <div className="text-sm font-medium text-emerald-700">Sonra</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-800">{afterUsage.toFixed(1)} L</div>
                  <div className="mt-3 h-2 rounded-full bg-emerald-100">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${beforeUsage ? (afterUsage / beforeUsage) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Təxmini {savingsPct.toFixed(0)}% su qənaəti
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tövsiyə</h2>
                <p className="text-sm text-slate-500">Sahənin son suvarma tövsiyəsinə əsaslanır.</p>
              </div>

              <div className="rounded-2xl bg-cyan-50 p-4 text-sm leading-7 text-slate-700">
                {recommendation.recommendation_text}
              </div>

              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Zaman möhürü {formatDateTime(recommendation.timestamp)}
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <Leaf className="mr-1 inline h-3.5 w-3.5" />
                Sahə: {selectedField?.label || '—'}
              </div>
            </div>
          </section>
        </>
      ) : (
        <Spinner />
      )}
    </div>
  )
}
