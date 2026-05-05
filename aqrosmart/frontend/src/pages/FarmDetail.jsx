import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Leaf, MapPin, Ruler, Tractor } from 'lucide-react'
import client from '../api/client'
import ErrorCard from '../components/common/ErrorCard'
import { formatNumber } from '../utils/format'
import { formatFieldLabel } from '../constants/azText'

export default function FarmDetail() {
  const { farmId } = useParams()
  const [farm, setFarm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadFarm() {
      try {
        const response = await client.get(`/farms/${farmId}`)
        if (!mounted) return
        setFarm(response.data)
      } catch (requestError) {
        if (!mounted) return
        setError(requestError?.response?.data?.message || 'Təsərrüfat məlumatı yüklənə bilmədi')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadFarm()
    return () => {
      mounted = false
    }
  }, [farmId])

  if (loading) return <div className="grid gap-4 p-6 md:grid-cols-2">{Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-36 animate-pulse rounded-2xl bg-emerald-100/60" />)}</div>
  if (error) return <div className="p-6"><ErrorCard message={error} /></div>

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-700 to-emerald-800 p-5 text-white shadow-sm">
        <h2 className="text-xl font-semibold">{farm?.name}</h2>
        <p className="mt-1 text-sm text-emerald-100">
          Fermer: {farm?.farmer_name || '—'} · Region: {farm?.region || '—'} · Rayon: {farm?.district || '—'}
        </p>
        <p className="mt-2 text-sm text-emerald-100">Ümumi sahə: {formatNumber(farm?.total_area_ha || 0, 1)} ha</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-3 text-sm"><Tractor className="mb-1 h-4 w-4" /> Fermer: {farm?.farmer_name || '—'}</div>
          <div className="rounded-xl bg-white/10 p-3 text-sm"><MapPin className="mb-1 h-4 w-4" /> Region: {farm?.region || '—'}</div>
          <div className="rounded-xl bg-white/10 p-3 text-sm"><Ruler className="mb-1 h-4 w-4" /> {formatNumber(farm?.total_area_ha || 0, 1)} ha</div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Sahələr</h3>
        {!farm?.fields?.length ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Bu təsərrüfat üçün sahə məlumatı tapılmadı.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {farm.fields.map((field) => (
              <div key={field.id} className="rounded-xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50 p-4">
                <div className="font-medium text-slate-900">{formatFieldLabel(field)}</div>
                <div className="mt-2 text-sm text-slate-600">Sahə: {formatNumber(field.area_ha || 0, 1)} ha</div>
                <div className="text-sm text-slate-600">Torpaq: {field.soil_type || '—'}</div>
                <div className="text-sm text-slate-600">NDVI/NDWI: {formatNumber(field.ndvi_score || 0, 2)} / {formatNumber(field.ndwi_score || 0, 2)}</div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bitki analizi tarixçəsi</div>
                {(field.recent_plant_analyses || []).length ? (
                  <div className="mt-2 space-y-1 text-xs text-slate-700">
                    {field.recent_plant_analyses.map((item) => (
                      <div key={item.id} className="flex items-center gap-1"><Leaf className="h-3.5 w-3.5 text-emerald-600" /> {item.disease_detected} ({formatNumber(item.confidence_pct || 0, 1)}%)</div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-slate-500">Hələ analiz qeydi yoxdur.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
