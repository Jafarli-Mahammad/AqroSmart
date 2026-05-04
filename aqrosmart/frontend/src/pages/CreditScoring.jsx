import React, { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import Spinner from '../components/common/Spinner'
import ErrorCard from '../components/common/ErrorCard'
import { formatNumber } from '../utils/format'

function TierBadge({ tier, score }) {
  const classes = {
    A: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    B: 'bg-sky-100 text-sky-700 ring-sky-200',
    C: 'bg-amber-100 text-amber-700 ring-amber-200',
    D: 'bg-rose-100 text-rose-700 ring-rose-200',
  }

  return (
    <div className={`inline-flex flex-col items-center rounded-3xl px-6 py-5 ring-1 ${classes[tier] || classes.D}`}>
      <div className="text-5xl font-semibold tracking-tight">{tier || 'D'}</div>
      <div className="mt-1 text-sm font-medium">Risk Tier</div>
      <div className="mt-2 text-2xl font-semibold">{formatNumber(score || 0, 1)}</div>
      <div className="text-xs uppercase tracking-[0.2em] opacity-70">Final Score</div>
    </div>
  )
}

function ScoreBar({ label, value }) {
  const numeric = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{formatNumber(numeric, 1)}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${numeric}%` }} />
      </div>
    </div>
  )
}

function tierLabelClasses(tier) {
  switch (tier) {
    case 'A':
      return 'text-emerald-700'
    case 'B':
      return 'text-sky-700'
    case 'C':
      return 'text-amber-700'
    default:
      return 'text-rose-700'
  }
}

export default function CreditScoring() {
  const [farms, setFarms] = useState([])
  const [selectedFarmerId, setSelectedFarmerId] = useState('')
  const [creditScore, setCreditScore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadFarms() {
      try {
        const response = await client.get('/farms')
        if (!mounted) return
        setFarms(response.data || [])
        const firstFarmer = (response.data || [])[0]
        if (firstFarmer) {
          setSelectedFarmerId(String(firstFarmer.farmer_id))
        }
      } catch (error) {
        if (mounted) setMessage(error?.response?.data?.message || 'Unable to load farmers')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadFarms()

    return () => {
      mounted = false
    }
  }, [])

  const farmerOptions = useMemo(() => {
    const farmerMap = new Map()
    farms.forEach((farm) => {
      if (!farmerMap.has(farm.farmer_id)) {
        farmerMap.set(farm.farmer_id, {
          farmer_id: farm.farmer_id,
          farmer_name: farm.farmer_name,
          farmer_years_active: farm.farmer_years_active,
          region: farm.region,
          total_farms: 1,
        })
      } else {
        farmerMap.get(farm.farmer_id).total_farms += 1
      }
    })
    return [...farmerMap.values()]
  }, [farms])

  const selectedFarmer = useMemo(() => farmerOptions.find((farmer) => String(farmer.farmer_id) === String(selectedFarmerId)), [farmerOptions, selectedFarmerId])

  useEffect(() => {
    if (!selectedFarmerId) return

    let mounted = true
    async function loadCredit() {
      setBusy(true)
      setMessage('')
      try {
        const response = await client.get(`/credit-score/${selectedFarmerId}`)
        if (mounted) setCreditScore(response.data)
      } catch (error) {
        if (mounted) setMessage(error?.response?.data?.message || 'Unable to load credit score')
      } finally {
        if (mounted) setBusy(false)
      }
    }

    loadCredit()

    return () => {
      mounted = false
    }
  }, [selectedFarmerId])

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Credit Scoring</h1>
            <p className="mt-1 text-sm text-slate-500">Bank-ready farmer risk assessment driven by recent field outcomes.</p>
          </div>

          <label className="text-sm font-medium text-slate-600">
            Farmer
            <select
              className="mt-1 block min-w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none"
              value={selectedFarmerId}
              onChange={(event) => setSelectedFarmerId(event.target.value)}
            >
              {farmerOptions.map((farmer) => (
                <option key={farmer.farmer_id} value={farmer.farmer_id}>
                  {farmer.farmer_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {message ? <ErrorCard message={message} /> : null}
      </div>

      {busy || !creditScore || !selectedFarmer ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
            <TierBadge tier={creditScore.risk_tier} score={creditScore.final_score} />
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${tierLabelClasses(creditScore.risk_tier)}`}>Farmer Profile</div>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div><span className="font-medium text-slate-500">Name:</span> {selectedFarmer.farmer_name}</div>
                <div><span className="font-medium text-slate-500">Region:</span> {selectedFarmer.region}</div>
                <div><span className="font-medium text-slate-500">Years Active:</span> {selectedFarmer.farmer_years_active ?? '—'}</div>
                <div><span className="font-medium text-slate-500">Total Farms:</span> {selectedFarmer.total_farms}</div>
              </div>
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Score Breakdown</h2>
              <p className="text-sm text-slate-500">Five live sub-scores used to assemble the final bank score.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ScoreBar label="Productivity" value={creditScore.productivity_score} />
              <ScoreBar label="Consistency" value={creditScore.consistency_score} />
              <ScoreBar label="Irrigation Efficiency" value={creditScore.irrigation_efficiency_score} />
              <ScoreBar label="Climate Risk" value={creditScore.climate_risk_score} />
              <ScoreBar label="Subsidy Performance" value={creditScore.subsidy_performance} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Explanation</div>
              <p className="mt-3 text-base leading-7 text-slate-700">{creditScore.explanation_text}</p>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">What improves this score?</summary>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                <li>Keep productivity stable across recent analysis runs so the consistency score remains high.</li>
                <li>Improve irrigation efficiency and reduce climate stress through better water timing.</li>
                <li>Maintain stronger subsidy performance to reinforce the overall repayment profile.</li>
              </ul>
            </details>
          </section>
        </div>
      )}
    </div>
  )
}
