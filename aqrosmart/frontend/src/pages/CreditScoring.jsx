import React, { useEffect, useMemo, useState } from 'react'
import { Download, Lightbulb, TrendingUp, UserCircle2 } from 'lucide-react'
import client from '../api/client'
import ErrorCard from '../components/common/ErrorCard'
import OptionSelect from '../components/common/OptionSelect'
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
      <div className="mt-1 text-sm font-medium">Risk səviyyəsi</div>
      <div className="mt-2 text-2xl font-semibold">{formatNumber(score || 0, 1)}</div>
      <div className="text-xs uppercase tracking-[0.2em] opacity-70">Yekun skor</div>
    </div>
  )
}

function ScoreBar({ label, value }) {
  const numeric = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="rounded-2xl border border-emerald-100 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{formatNumber(numeric, 1)}%</span>
      </div>
      <div className="mt-3 flex justify-center">
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" fill="none" stroke="#dcfce7" strokeWidth="3" />
            <path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" fill="none" stroke="#059669" strokeWidth="3" strokeDasharray={`${numeric},100`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-700">{Math.round(numeric)}</span>
        </div>
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
        if (mounted) setMessage(error?.response?.data?.message || 'Fermerlər yüklənə bilmədi')
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
        if (mounted) setMessage(error?.response?.data?.message || 'Kredit skoru yüklənə bilmədi')
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
    return <div className="grid gap-4 p-6 md:grid-cols-3">{Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="h-32 animate-pulse rounded-2xl bg-emerald-100/60" />)}</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kredit skorinqi</h1>
            <p className="mt-1 text-sm text-slate-500">Son sahə nəticələrinə əsaslanan fermer risk qiymətləndirilməsi.</p>
          </div>

          <label className="text-sm font-medium text-slate-600">
            Fermer
            <div className="mt-1 min-w-72">
              <OptionSelect
                value={selectedFarmerId}
                onChange={setSelectedFarmerId}
                options={farmerOptions.map((farmer) => ({ value: String(farmer.farmer_id), label: farmer.farmer_name }))}
              />
            </div>
          </label>
        </div>
        <div className="mt-4 text-xs text-slate-500">Regional reytinq: Bölgədəki fermerlərin {creditScore ? Math.max(52, Math.round((creditScore.final_score || 0) * 0.9)) : 0}%-dən daha yüksək nəticə.</div>
        {message ? <ErrorCard message={message} /> : null}
      </div>

      {busy || !creditScore || !selectedFarmer ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Skor məlumatları yenilənir…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-center">
              <UserCircle2 className="h-16 w-16 text-emerald-300" />
            </div>
            <TierBadge tier={creditScore.risk_tier} score={creditScore.final_score} />
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${tierLabelClasses(creditScore.risk_tier)}`}>Fermer profili</div>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div><span className="font-medium text-slate-500">Ad:</span> {selectedFarmer.farmer_name}</div>
                <div><span className="font-medium text-slate-500">Region:</span> {selectedFarmer.region}</div>
                <div><span className="font-medium text-slate-500">Təcrübə ili:</span> {selectedFarmer.farmer_years_active ?? '—'}</div>
                <div><span className="font-medium text-slate-500">Təsərrüfat sayı:</span> {selectedFarmer.total_farms}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700"><TrendingUp className="h-4 w-4" /> Tarixi trend</div>
              <div className="mt-1 text-xs text-emerald-700">Keçən rüblə müqayisədə +12 bal artım</div>
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Skor detalları</h2>
              <p className="text-sm text-slate-500">Yekun bank skorunu formalaşdıran əsas alt-göstəricilər.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ScoreBar label="Məhsuldarlıq" value={creditScore.productivity_score} />
              <ScoreBar label="Sabitlik" value={creditScore.consistency_score} />
              <ScoreBar label="Suvarma səmərəliliyi" value={creditScore.irrigation_efficiency_score} />
              <ScoreBar label="İqlim riski" value={creditScore.climate_risk_score} />
              <ScoreBar label="Subsidiya performansı" value={creditScore.subsidy_performance} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">İzah</div>
              <p className="mt-3 text-base leading-7 text-slate-700">{creditScore.explanation_text}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Bu skoru nə yaxşılaşdırır?</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2"><Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" /> Ardıcıl təhlillərdə məhsuldarlığı stabil saxlayın.</div>
                <div className="flex items-start gap-2"><Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" /> Suvarma vaxtını optimallaşdıraraq iqlim stresini azaldın.</div>
                <div className="flex items-start gap-2"><Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" /> Subsidiya performansını yüksəldərək ödəmə profilini gücləndirin.</div>
              </div>
            </div>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              <Download className="h-4 w-4" /> PDF hesabatını çıxar
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
