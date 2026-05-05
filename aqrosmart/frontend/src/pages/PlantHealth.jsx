import React, { useEffect, useMemo, useState } from 'react'
import { GaugeCircle, ImagePlus, Save, Sparkles, UploadCloud } from 'lucide-react'
import client from '../api/client'
import ErrorCard from '../components/common/ErrorCard'
import { formatFieldLabel } from '../constants/azText'
import { formatNumber } from '../utils/format'

function statusClass(disease) {
  if (!disease) return 'bg-slate-100 text-slate-700'
  if (disease.toLowerCase() === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (disease.toLowerCase().includes('stress')) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

export default function PlantHealth() {
  const [fields, setFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadFields() {
      try {
        const farmsResponse = await client.get('/farms')
        const farmDetails = await Promise.all((farmsResponse.data || []).map((farm) => client.get(`/farms/${farm.id}`)))
        if (!mounted) return
        const options = farmDetails.flatMap((res) => (res.data.fields || []).map((field) => ({ ...field, label: formatFieldLabel(field) })))
        setFields(options)
        if (options.length) setSelectedFieldId(String(options[0].id))
      } catch (requestError) {
        if (mounted) setError(requestError?.response?.data?.message || 'Sahələr yüklənə bilmədi')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadFields()
    return () => {
      mounted = false
    }
  }, [])

  const healthTone = useMemo(() => {
    const score = Number(result?.health_score || 0)
    if (score >= 75) return 'bg-emerald-500'
    if (score >= 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }, [result])

  function onFileChange(event) {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
  }

  async function analyzeUpload() {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      if (selectedFieldId) formData.append('field_id', selectedFieldId)
      const response = await client.post('/analysis/plant-image', formData)
      setResult(response.data)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Şəkil analizi mümkün olmadı')
    } finally {
      setBusy(false)
    }
  }

  async function useSample(sampleId) {
    setBusy(true)
    setError('')
    try {
      const response = await client.post(`/analysis/plant-image/sample/${sampleId}`, null, { params: { field_id: selectedFieldId || undefined } })
      setResult(response.data)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Nümunə analizini açmaq mümkün olmadı')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="grid gap-4 p-6 md:grid-cols-2">{Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-40 animate-pulse rounded-2xl bg-emerald-100/60" />)}</div>

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
        <h2 className="text-xl font-semibold text-slate-900">AI Bitki Sağlamlığı Analizi</h2>
        <p className="mt-1 text-sm text-slate-500">Bitki şəklini yükləyin, sistem xəstəlik və su stresini təhlil etsin.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)}>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>{field.label}</option>
            ))}
          </select>
          <label className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100">
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onFileChange} className="hidden" />
            <span className="inline-flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Şəkil seç / sürüklə</span>
          </label>
          <button onClick={analyzeUpload} disabled={!file || busy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Analiz edilir...' : 'Analiz et'}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => useSample(1)} className="rounded-lg border px-3 py-1.5 text-xs">Demo nümunə 1</button>
          <button onClick={() => useSample(2)} className="rounded-lg border px-3 py-1.5 text-xs">Demo nümunə 2</button>
          <button onClick={() => useSample(3)} className="rounded-lg border px-3 py-1.5 text-xs">Demo nümunə 3</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Qeyd: "Demo nümunə" düymələri real model yox, seed edilmiş test nəticələrini göstərir.</p>
        {error ? <div className="mt-3"><ErrorCard message={error} /></div> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {previewUrl ? (
            <img src={previewUrl} alt="Bitki önizləmə" className="h-72 w-full rounded-xl object-cover" />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-gradient-to-b from-emerald-50 to-stone-50 text-sm text-slate-500">
              <ImagePlus className="h-8 w-8 text-emerald-600" />
              <div className="mt-2 font-medium text-slate-700">Şəkil əlavə edilməyib</div>
              <div className="mt-1 text-xs">Demo üçün aşağıdakı nümunələrdən birini seçin</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((id) => (
                  <button key={id} onClick={() => useSample(id)} className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs hover:bg-emerald-50">
                    Demo {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          {!result ? (
            <div className="text-sm text-slate-500">Nəticə üçün şəkil yükləyin və ya nümunə seçin.</div>
          ) : (
            <div className="space-y-4">
              <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClass(result.disease_detected)}`}>
                {result.disease_detected}
              </div>
              <div className="text-xs text-slate-500">
                Mənbə: {result.analysis_source === 'model' ? 'Real model inferensi' : 'Demo nümunə nəticəsi'}
              </div>
              <div className="rounded-2xl border border-emerald-100 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><GaugeCircle className="h-4 w-4 text-emerald-600" /> Etibarlılıq göstəricisi</div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, result.confidence_pct || 0))}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-600">Etibarlılıq: <span className="font-semibold text-slate-900">{formatNumber(result.confidence_pct, 1)}%</span></div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-600">Sağlamlıq skoru: {formatNumber(result.health_score, 1)}%</div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className={`h-3 rounded-full ${healthTone}`} style={{ width: `${Math.max(0, Math.min(100, result.health_score || 0))}%` }} />
                </div>
              </div>
              {result.priority_flag ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Prioritet: {result.priority_flag}</div> : null}
              {result.discrepancy_note ? <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{result.discrepancy_note}</div> : null}
              {(result.quality_messages || []).length ? (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {(result.quality_messages || []).map((msg, idx) => (
                    <div key={`${msg}-${idx}`}>• {msg}</div>
                  ))}
                </div>
              ) : null}
              <div>
                <div className="text-sm font-semibold text-slate-900">Tövsiyələr</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {(result.recommendations || []).map((item, idx) => (
                    <div key={`${item}-${idx}`} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2">
                      <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><Save className="h-4 w-4" /> Sahə tarixçəsinə yaz</button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
