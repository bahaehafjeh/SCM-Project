/**
 * Provenance for every number rendered in the app.
 * Datasets are the ones profiled on the live build's data-quality tab (Discovery §5.1).
 */
export type DatasetId = 'ports' | 'trade-12m' | 'trade-timeseries' | 'faostat-production' | 'coverage-assessment'

export interface Dataset {
  id: DatasetId
  title: string
  description: string
  /** Reporting period as published (Gregorian), or null when not applicable / unknown */
  period: string | null
  /** Last update as shown in the live build (Jalali), or null when not published */
  lastUpdated: string | null
  classification: string | null
}

export const datasets: Record<DatasetId, Dataset> = {
  ports: {
    id: 'ports',
    title: 'داده‌های بنادر',
    description: 'نام، کشور و موقعیت جغرافیایی بنادر کشورهای مختلف؛ هر ردیف یک بندر.',
    period: null,
    lastUpdated: '۱۴۰۵/۰۳/۱۷',
    classification: null,
  },
  'trade-12m': {
    id: 'trade-12m',
    title: 'داده‌های جریان تجارت در یک سال میلادی',
    description: 'تجارت ماهانه ۱۴ کالای اساسی؛ هر ردیف یک تجارت.',
    period: '2025/05 – 2026/04',
    lastUpdated: '۱۴۰۵/۰۳/۱۶',
    classification: 'HS4',
  },
  'trade-timeseries': {
    id: 'trade-timeseries',
    title: 'داده‌های سری زمانی جریان تجارت',
    description: 'تجارت سالانه ۱۸ گروه کالای اساسی؛ هر ردیف یک تجارت.',
    period: '2019 – 2024',
    lastUpdated: '۱۴۰۵/۰۶/۰۶',
    classification: 'HS6 (2017، 2022)',
  },
  'faostat-production': {
    id: 'faostat-production',
    title: 'داده‌های تولید محصولات کشاورزی و دامی (FAOSTAT)',
    description: 'میزان تولید سالانه ۱۲ محصول به تفکیک کشور.',
    period: '1961 – 2024',
    lastUpdated: null,
    classification: null,
  },
  'coverage-assessment': {
    id: 'coverage-assessment',
    title: 'ارزیابی پوشش نیازمندی‌های داده',
    description: 'درصد نیازمندی‌های داده تعریف‌شده برای هر جزء زنجیره که پوشش داده شده‌اند.',
    period: null,
    lastUpdated: null,
    classification: null,
  },
}

export interface SourceRef {
  dataset: DatasetId
  /** Where the figure was transcribed from, until a live data contract exists */
  capture: string
  capturedOn: string
  /** Calculation note shown to users; null means the method is not documented */
  method: string | null
}
