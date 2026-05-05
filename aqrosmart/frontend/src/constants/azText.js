export const azScenarios = {
  healthy_field: {
    name: 'Sağlam Sahə',
    description: 'Stabil rütubət və sağlam vegetasiya ilə baza ssenarisi.',
  },
  drought_stress: {
    name: 'Quraqlıq Stresi',
    description: 'Yüksək istilik və aşağı torpaq rütubəti səbəbilə məhsuldarlıq azalır.',
  },
  disease_outbreak: {
    name: 'Xəstəlik Ocağı',
    description: 'Xəstəlik təzyiqi artdığı üçün bitki sağlamlığı zəifləyir.',
  },
  irrigation_recovery: {
    name: 'Suvarma Bərpası',
    description: 'Hədəfli suvarmadan sonra sahə rütubət balansını bərpa edir.',
  },
  high_efficiency: {
    name: 'Yüksək Səmərəlilik',
    description: 'Səmərəli su istifadəsi ilə optimallaşdırılmış istehsal.',
  },
  low_efficiency: {
    name: 'Aşağı Səmərəlilik',
    description: 'Əməliyyat səmərəsizliyi məhsuldarlıq və suvarmanı zəiflədir.',
  },
  subsidy_improvement: {
    name: 'Subsidiya Təkmilləşməsi',
    description: 'Subsidiyaya uyğunluğu və məhsul nəticələrini yaxşılaşdıran ssenari.',
  },
}

export function scenarioName(slug, fallbackName = '') {
  return azScenarios[slug]?.name || fallbackName || slug
}

export function scenarioDescription(slug, fallbackDescription = '') {
  return azScenarios[slug]?.description || fallbackDescription || 'Ssenari məlumatı mövcud deyil.'
}

export function formatFieldLabel(field) {
  const name = `Sahə ${field?.id ?? '—'}`
  const cropMap = {
    cotton: 'pambıq',
    wheat: 'buğda',
    corn: 'qarğıdalı',
    grape: 'üzüm',
    sunflower: 'günəbaxan',
  }
  const irrigationMap = {
    drip: 'damcı',
    sprinkler: 'yağmurlama',
    flood: 'səth suvarması',
  }
  const crop = cropMap[String(field?.crop_type || '').toLowerCase()] || field?.crop_type || 'məhsul qeyd edilməyib'
  const irrigation = irrigationMap[String(field?.irrigation_type || '').toLowerCase()] || field?.irrigation_type || 'suvarma növü qeyd edilməyib'
  return `${name} · ${crop} · ${irrigation}`
}
