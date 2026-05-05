export function formatNumber(value, decimals = 1) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0'
  return numeric.toLocaleString('az-AZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('az-AZ')
}

export function formatCurrencyAzn(value, decimals = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return `0 AZN`
  return `${numeric.toLocaleString('az-AZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} AZN`
}
