import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, MapPin, TrendingUp } from 'lucide-react'
import client from '../api/client'
import ErrorCard from '../components/common/ErrorCard'
import OptionSelect from '../components/common/OptionSelect'
import { formatNumber } from '../utils/format'

export default function Farms() {
  const [farms, setFarms] = useState([])
  const [regionFilter, setRegionFilter] = useState('all')
  const [scoreMin, setScoreMin] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const response = await client.get('/farms')
        if (mounted) setFarms(response.data || [])
      } catch (requestError) {
        if (mounted) setError(requestError?.response?.data?.message || 'Təsərrüfatlar yüklənə bilmədi')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const regions = useMemo(() => [...new Set(farms.map((farm) => farm.region).filter(Boolean))], [farms])
  const filtered = useMemo(
    () =>
      farms.filter((farm) => {
        const regionOk = regionFilter === 'all' || farm.region === regionFilter
        const scoreOk = (farm.avg_productivity_score || 0) >= scoreMin
        return regionOk && scoreOk
      }),
    [farms, regionFilter, scoreMin],
  )

  if (loading) return <div className="grid gap-4 p-6 md:grid-cols-2">{Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="h-40 animate-pulse rounded-2xl bg-emerald-100/60" />)}</div>
  if (error) return <div className="p-6"><ErrorCard message={error} /></div>

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Təsərrüfatlar</h2>
        <p className="mt-1 text-sm text-slate-500">Filtrlənə bilən portfel görünüşü və məhsuldarlıq göstəriciləri.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-600">
            Region
            <div className="mt-1">
              <OptionSelect
                value={regionFilter}
                onChange={setRegionFilter}
                options={[{ value: 'all', label: 'Hamısı' }, ...regions.map((region) => ({ value: region, label: region }))]}
              />
            </div>
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Minimum məhsuldarlıq: {scoreMin}%
            <input type="range" min="0" max="100" step="5" value={scoreMin} onChange={(e) => setScoreMin(Number(e.target.value))} className="mt-3 w-full accent-emerald-600" />
          </label>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {filtered.map((farm) => (
          <Link key={farm.id} to={`/farms/${farm.id}`} className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{farm.name}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5" /> {farm.region || '—'} · {farm.farmer_name}</div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{farm.field_count} sahə</span>
            </div>
            <div className="mt-4 grid grid-cols-[88px_1fr] gap-3">
              <div className="relative h-20 w-20 rounded-full bg-emerald-50 p-1">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" fill="none" stroke="#d1fae5" strokeWidth="3" />
                  <path
                    d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3"
                    strokeDasharray={`${Math.max(0, Math.min(100, farm.avg_productivity_score || 0))},100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-700">{Math.round(farm.avg_productivity_score || 0)}%</span>
              </div>
              <div className="rounded-xl border border-dashed border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 p-3 text-xs text-slate-600">
                <div className="mb-2 flex items-center gap-1 font-medium text-slate-700"><Filter className="h-3.5 w-3.5" /> Mini xəritə önizləməsi</div>
                <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-500" /> {farm.region || 'Mövqe yoxdur'}</div>
                <div className="mt-1 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Kredit: {farm.avg_productivity_score >= 80 ? 'A' : farm.avg_productivity_score >= 65 ? 'B' : farm.avg_productivity_score >= 50 ? 'C' : 'D'}</div>
              </div>
            </div>
            <button className="mt-4 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition group-hover:bg-emerald-50">Detallara bax</button>
          </Link>
        ))}
        {!filtered.length ? <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-sm text-slate-600">Təsərrüfat tapılmadı. Filtrləri dəyişin və yenidən yoxlayın.</div> : null}
      </section>
    </div>
  )
}
