import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import client from '../api/client'
import Spinner from '../components/common/Spinner'
import ErrorCard from '../components/common/ErrorCard'
import Badge from '../components/common/Badge'
import { formatNumber } from '../utils/format'

function MetricCard({ title, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="text-sm font-medium text-slate-500">{title}</div>
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
          setError(requestError?.response?.data?.message || 'Failed to load dashboard data')
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

  const radialGaugeData = useMemo(
    () => [
      {
        name: 'Average Productivity',
        value: summary?.avg_productivity_score || 0,
        fill: '#16a34a',
      },
    ],
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
  }, [farmDetails, farms])

  if (loading) {
    return <Spinner />
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Farms" value={summary.total_farms} accent="text-emerald-600" />
        <MetricCard title="Total Fields" value={summary.total_fields} accent="text-slate-900" />
        <MetricCard title="Avg Productivity Score" value={`${formatNumber(summary.avg_productivity_score, 1)}%`} accent="text-emerald-600" />
        <MetricCard title="Total Subsidy (AZN)" value={formatNumber(summary.total_subsidy_allocated_azn, 0)} accent="text-slate-900" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Crop Distribution</h2>
              <p className="text-sm text-slate-500">Field count by crop across the active portfolio</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#16a34a">
                  {cropDistributionData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}-${index}`} fill={index % 2 === 0 ? '#16a34a' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Average Productivity Gauge</h2>
              <p className="text-sm text-slate-500">Rolling productivity score across all analysis runs</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="60%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={18}
                data={radialGaugeData}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={999} fill="#16a34a" />
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Farm Summary</h2>
          <p className="text-sm text-slate-500">Live portfolio snapshot from the AqroSmart API</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Farm Name</th>
                <th className="px-5 py-3 font-semibold">Region</th>
                <th className="px-5 py-3 font-semibold">Crop Types</th>
                <th className="px-5 py-3 font-semibold">Avg Productivity</th>
                <th className="px-5 py-3 font-semibold">Subsidy Allocated</th>
                <th className="px-5 py-3 font-semibold">Credit Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {farmRows.map((farm) => (
                <tr
                  key={farm.id}
                  onClick={() => navigate(`/farms/${farm.id}`)}
                  className="cursor-pointer transition-colors hover:bg-emerald-50/60"
                >
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{farm.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{farm.region}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{farm.cropTypes.length ? farm.cropTypes.join(', ') : '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatNumber(farm.avg_productivity_score, 1)}%</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatNumber(farm.subsidyAllocated, 2)} AZN</td>
                  <td className="px-5 py-4 text-sm">
                    <Badge status={farm.creditTier}>Tier {farm.creditTier}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
