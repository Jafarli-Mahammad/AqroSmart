import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts'
import { CloudSun, Coins, Leaf, Sprout, Tractor, Users, Zap } from 'lucide-react'
import client from '../api/client'
import ErrorCard from '../components/common/ErrorCard'
import Badge from '../components/common/Badge'
import { formatCurrencyAzn, formatNumber } from '../utils/format'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

function MetricCard({ title, value, icon: Icon, accent = 'text-emerald-700' }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <Icon className="h-4 w-4 text-emerald-700" />
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${accent}`}>{value}</div>
    </div>
  )
}

function classifyCreditTier(score) {
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [farms, setFarms] = useState([])
  const [fieldDetails, setFieldDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        setLoading(true)
        const cachedSummary = window.sessionStorage.getItem('aqrosmart:dashboard:summary')
        if (cachedSummary) {
          setSummary(JSON.parse(cachedSummary))
        }

        const farmsResponse = await client.get('/farms')

        if (!mounted) return

        const farmsData = farmsResponse.data || []
        const [summaryResponse, farmDetailResponses] = await Promise.all([
          client.get('/dashboard/summary'),
          Promise.all(farmsData.map((farm) => client.get(`/farms/${farm.id}`))),
        ])
        const details = farmDetailResponses.map((response) => [response.data.id, { farmDetail: response.data, fieldRows: response.data.fields || [] }])

        if (!mounted) return

        setSummary(summaryResponse.data)
        window.sessionStorage.setItem('aqrosmart:dashboard:summary', JSON.stringify(summaryResponse.data))
        setFarms(farmsData)
        setFieldDetails(Object.fromEntries(details))
      } catch (requestError) {
        if (mounted) {
          setError(requestError?.response?.data?.message || 'İdarə paneli məlumatları yüklənə bilmədi')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const cropDistributionData = useMemo(
    () =>
      Object.entries(summary?.crop_distribution || {}).map(([name, value]) => ({
        name,
        value,
      })),
    [summary],
  )

  const farmRows = useMemo(() => {
    return farms.map((farm) => {
      const detail = fieldDetails[farm.id]
      const fieldList = detail?.fieldRows || []
      const cropTypes = [...new Set(fieldList.map((field) => field.crop_type).filter(Boolean))]
      const subsidyAllocated = fieldList.reduce(
        (sum, field) => sum + (field.latest_subsidy_recommendation?.final_subsidy_azn || 0),
        0,
      )
      const creditTier = classifyCreditTier(farm.avg_productivity_score || 0)

      return {
        ...farm,
        cropTypes,
        subsidyAllocated,
        creditTier,
      }
    })
  }, [fieldDetails, farms])

  const subsidyByRegion = useMemo(() => {
    const grouped = {}
    farmRows.forEach((farm) => {
      const key = farm.region || 'Digər'
      grouped[key] = (grouped[key] || 0) + farm.subsidyAllocated
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [farmRows])

  const mapMarkers = useMemo(() => {
    const markers = []
    Object.values(fieldDetails).forEach((detail) => {
      ;(detail?.fieldRows || []).forEach((field) => {
        const lat = Number(field.latitude)
        const lon = Number(field.longitude)
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          markers.push({ lat, lon, name: field.field_name || field.crop_type || 'Field' })
        }
      })
    })
    return markers.slice(0, 20)
  }, [fieldDetails])

  const mapboxStaticUrl = useMemo(() => {
    if (!mapboxToken || !mapMarkers.length) return ''
    const overlay = mapMarkers
      .map((marker) => `pin-s+059669(${marker.lon.toFixed(6)},${marker.lat.toFixed(6)})`)
      .join(',')
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/auto/900x360?padding=40&access_token=${encodeURIComponent(mapboxToken)}`
  }, [mapMarkers])

  if (loading) {
    return <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, idx) => <div key={idx} className="h-28 animate-pulse rounded-2xl bg-emerald-100/60" />)}</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorCard message={error} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><CloudSun className="h-4 w-4" /> Hava xəbərdarlığı</div>
          <div className="text-xs font-medium">{summary?.avg_productivity_score < 55 ? 'Quraqlıq riski yüksəlib' : 'Hava şəraiti stabildir'}</div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Ümumi təsərrüfat" value={summary.total_farms} icon={Tractor} />
        <MetricCard title="Ümumi sahə" value={summary.total_fields} icon={Sprout} accent="text-slate-900" />
        <MetricCard title="Fermer sayı" value={summary.total_farmers || 0} icon={Users} />
        <MetricCard title="Ümumi subsidiya" value={formatCurrencyAzn(summary.total_subsidy_allocated_azn, 0)} icon={Coins} accent="text-slate-900" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Məhsul bölgüsü</h2>
              <p className="text-sm text-slate-500">Aktiv portfeldə məhsul növlərinə görə sahə sayı</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#059669">
                  {cropDistributionData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={index % 2 === 0 ? '#059669' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Su qənaəti trendi</h2>
              <p className="text-sm text-slate-500">Son ölçmələr üzrə təxmini yaxşılaşma</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={farmRows.slice(0, 8).map((farm, index) => ({ ad: `Həftə ${index + 1}`, dəyər: Math.max(8, Math.min(35, (farm.avg_productivity_score || 0) / 3)) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
                <XAxis dataKey="ad" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="dəyər" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Leaf className="h-4 w-4 text-emerald-700" /> Təsərrüfat xəritə görünüşü</div>
          {mapboxStaticUrl ? (
            <img
              src={mapboxStaticUrl}
              alt="Təsərrüfat xəritəsi"
              className="h-64 w-full rounded-2xl border border-emerald-200 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50 text-center">
              <div>
                <div className="text-2xl">📍</div>
                <p className="mt-2 text-sm text-slate-600">
                  {mapboxToken
                    ? 'Xəritə üçün sahə koordinatları tapılmadı.'
                    : 'Mapbox üçün VITE_MAPBOX_TOKEN (pk...) əlavə edin.'}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700">Subsidiya bölgüsü (region üzrə)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subsidyByRegion} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {subsidyByRegion.map((_, index) => (
                    <Cell key={index} fill={['#059669', '#F59E0B', '#92400E', '#22c55e'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Top təsərrüfatlar</h2>
              <p className="text-sm text-slate-500">Liderlər cədvəli və sürətli keçidlər</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/plant-health')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">Yeni analiz</button>
              <button onClick={() => navigate('/simulation')} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">Ssenari dəyiş</button>
              <button onClick={() => navigate('/admin')} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50">Hesabat yarat</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Təsərrüfat adı</th>
                <th className="px-5 py-3 font-semibold">Region</th>
                <th className="px-5 py-3 font-semibold">Məhsul növləri</th>
                <th className="px-5 py-3 font-semibold">Orta məhsuldarlıq</th>
                <th className="px-5 py-3 font-semibold">Ayrılmış subsidiya</th>
                <th className="px-5 py-3 font-semibold">Kredit səviyyəsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {farmRows
                .slice()
                .sort((a, b) => (b.avg_productivity_score || 0) - (a.avg_productivity_score || 0))
                .map((farm) => (
                <tr
                  key={farm.id}
                  onClick={() => navigate(`/farms/${farm.id}`)}
                  className="cursor-pointer transition-colors hover:bg-emerald-50/60"
                >
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{farm.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{farm.region}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{farm.cropTypes.length ? farm.cropTypes.join(', ') : '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatNumber(farm.avg_productivity_score, 1)}%</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatCurrencyAzn(farm.subsidyAllocated, 2)}</td>
                  <td className="px-5 py-4 text-sm">
                    <Badge status={farm.creditTier}>Səviyyə {farm.creditTier}</Badge>
                  </td>
                </tr>
              ))}
              {!farmRows.length ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-slate-500" colSpan={6}>
                    Təsərrüfat məlumatı tapılmadı. Zəhmət olmasa seed əməliyyatını yenidən icra edin.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Zap className="h-4 w-4 text-amber-600" /> Son analiz axını</div>
        <div className="space-y-2">
          {farmRows.slice(0, 4).map((farm) => (
            <div key={farm.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{farm.name}</span>
              <span className="text-slate-500">{formatNumber(farm.avg_productivity_score, 1)}% məhsuldarlıq</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
