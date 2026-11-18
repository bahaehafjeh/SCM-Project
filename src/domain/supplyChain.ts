/**
 * Seven conceptual supply-chain stages and the six data-monitoring domains (Discovery §3.1).
 * Raw Materials and Warehousing are separate business concepts that share one data domain.
 */
export type StageId = 'raw-materials' | 'warehousing' | 'industries' | 'packaging' | 'distribution' | 'retail' | 'consumer'
export type DataDomainId = 'raw-materials-warehousing' | 'industries' | 'packaging' | 'distribution' | 'retail' | 'consumer'

export interface Stage {
  id: StageId
  order: number
  title: string
  focus: string
  domain: DataDomainId
}

export const stages: Stage[] = [
  { id: 'raw-materials', order: 1, title: 'مواد اولیه', focus: 'تأمین و شناسایی', domain: 'raw-materials-warehousing' },
  { id: 'warehousing', order: 2, title: 'انبار', focus: 'ذخیره و ظرفیت', domain: 'raw-materials-warehousing' },
  { id: 'industries', order: 3, title: 'صنایع', focus: 'تولید و تبدیل', domain: 'industries' },
  { id: 'packaging', order: 4, title: 'بسته‌بندی', focus: 'ظرفیت و انواع', domain: 'packaging' },
  { id: 'distribution', order: 5, title: 'توزیع', focus: 'مسیر و حمل‌ونقل', domain: 'distribution' },
  { id: 'retail', order: 6, title: 'خرده‌فروشی', focus: 'عرضه و تقاضا', domain: 'retail' },
  { id: 'consumer', order: 7, title: 'مصرف‌کننده', focus: 'مصرف نهایی', domain: 'consumer' },
]

export interface DataDomain {
  id: DataDomainId
  title: string
  description: string
}

export const dataDomains: DataDomain[] = [
  {
    id: 'raw-materials-warehousing',
    title: 'مواد اولیه و انبار آنها',
    description: 'صادرات و واردات محصولات پایه و مواد اولیه، موجودی مواد اولیه و سطح ذخیره‌سازی',
  },
  { id: 'industries', title: 'صنایع', description: 'کارخانه‌های تولیدکننده محصولات اولیه' },
  { id: 'packaging', title: 'بسته‌بندی', description: 'مواد بسته‌بندی و نوع آنها' },
  { id: 'distribution', title: 'توزیع', description: 'حمل‌ونقل و مسیرهای توزیع' },
  { id: 'retail', title: 'خرده‌فروشی', description: 'فروشگاه‌های زنجیره‌ای' },
  { id: 'consumer', title: 'مصرف‌کننده', description: 'مصرف نهایی، تقاضا و رفتار مصرف‌کننده' },
]

export const stagesOfDomain = (id: DataDomainId) => stages.filter((s) => s.domain === id)
