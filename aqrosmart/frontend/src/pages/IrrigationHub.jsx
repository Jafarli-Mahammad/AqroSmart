import React, { useEffect, useMemo, useState } from 'react'
import { RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import client from '../api/client'
import useScenarioStore from '../store/scenarioStore'

function Spinner() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
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
  return `${field.name} · ${field.crop_type} · ${field.irrigation_type}`
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
        if (mounted) setMessage(error?.response?.data?.detail || 'Unable to load irrigation fields')
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
      setMessage(error?.response?.data?.detail || 'Unable to load irrigation recommendation')
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
      setMessage(error?.response?.data?.detail || 'Unable to simulate irrigation recovery')
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

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Smart Irrigation Hub — Qarabağ Pilot Zone</h1>
            <p className="mt-1 text-sm text-slate-500">Real-time irrigation guidance for the active pilot fields.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
              value={selectedFieldId}
              onChange={(event) => setSelectedFieldId(event.target.value)}
            >
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={simulateRecovery}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? 'Simulating…' : 'Simulate Irrigation Recovery'}
            </button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div> : null}
      </div>

      {recommendation ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GaugeCard
              label="Soil Moisture"
              value={recommendation.sensor_reading?.soil_moisture_pct || recommendation.current_soil_moisture}
              unit="%"
              min={0}
              optimalMin={45}
              optimalMax={70}
              max={100}
            />
            <GaugeCard
              label="Water Flow"
              value={recommendation.sensor_reading?.water_flow_lph || recommendation.recommended_water_mm * 10}
              unit="L/h"
              min={0}
              optimalMin={10}
              optimalMax={35}
              max={80}
            />
            <GaugeCard
              label="Air Temperature"
              value={recommendation.sensor_reading?.air_temperature_c || 0}
              unit="°C"
              min={0}
              optimalMin={20}
              optimalMax={32}
              max={45}
            />
            <GaugeCard
              label="Humidity"
              value={recommendation.sensor_reading?.humidity_pct || 0}
              unit="%"
              min={0}
              optimalMin={45}
              optimalMax={70}
              max={100}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Before / After Water Usage</h2>
                  <p className="text-sm text-slate-500">Estimated change after the latest irrigation recommendation.</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${urgencyStyles(recommendation.urgency_level)}`}>
                  {recommendation.urgency_level || 'unknown'}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-500">Before</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{beforeUsage.toFixed(1)} L</div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-slate-400 transition-all duration-700" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <div className="text-sm font-medium text-emerald-700">After</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-800">{afterUsage.toFixed(1)} L</div>
                  <div className="mt-3 h-2 rounded-full bg-emerald-100">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${beforeUsage ? (afterUsage / beforeUsage) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Estimated {savingsPct.toFixed(0)}% water saved
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recommendation</h2>
                <p className="text-sm text-slate-500">Generated from the latest field irrigation recommendation.</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {recommendation.recommendation_text}
              </div>

              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Timestamp {recommendation.timestamp ? new Date(recommendation.timestamp).toLocaleString() : '—'}
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
