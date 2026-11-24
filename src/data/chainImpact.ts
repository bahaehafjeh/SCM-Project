import type { StageId } from '../domain/supplyChain'

/**
 * «اثر روی زنجیره»: an alert's effect on each of the seven stages (domain/supplyChain).
 *
 * TEMPORARY sample (owner decision 2026-11-15) until the industries, packaging, distribution and
 * retail data are connected. A stage with `impact` shows the alert's own figure (detail.impact[n]),
 * from its source system; every other text is written for the design and is shown as a sample.
 */
export type ChainLevel = 'high' | 'medium' | 'low' | 'none'
export interface ChainEffect {
  level: ChainLevel
  /** Index into the alert's own impact figures: shown as data, not as a sample */
  impact?: number
  /** Sample text (when there is no figure of the alert's own) */
  text?: string
}
type Chain = Partial<Record<StageId, ChainEffect>>

const none = (text = 'اثری پیش‌بینی نمی‌شود'): ChainEffect => ({ level: 'none', text })

export const chainImpact: Record<string, Chain> = {
  // روغن خام سویا · انبار بندرعباس
  a1: {
    'raw-materials': { level: 'high', impact: 2 },
    warehousing: { level: 'high', impact: 0 },
    industries: { level: 'high', text: '۲ پالایشگاه روغن جنوب کمتر از یک هفته ماده اولیه دارند' },
    packaging: { level: 'medium', text: 'خطوط بسته‌بندی روغن خوراکی کم‌کار می‌شوند' },
    distribution: { level: 'medium', text: 'ارسال روغن به استان‌های جنوبی کم می‌شود' },
    retail: { level: 'medium', impact: 1 },
    consumer: { level: 'medium', text: 'احتمال کمبود روغن خوراکی در بازار جنوب' },
  },
  // جو دامی · بندر امام خمینی
  a2: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: { level: 'high', impact: 2 },
    industries: { level: 'high', text: 'کارخانه‌های خوراک دام خوزستان با کمبود جو روبه‌رو می‌شوند' },
    packaging: none(),
    distribution: { level: 'medium', impact: 1 },
    retail: { level: 'low', text: 'قیمت خوراک دام در بازار محلی بالا می‌رود' },
    consumer: { level: 'low', text: 'اثر غیرمستقیم بر قیمت گوشت و لبنیات' },
  },
  // برنج · گمرک چابهار
  a3: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: { level: 'medium', impact: 2 },
    industries: none('برنج بدون فرآوری عرضه می‌شود'),
    packaging: { level: 'low', text: 'بسته‌بندی برنج در تهران ۶ روز عقب می‌افتد' },
    distribution: { level: 'medium', impact: 1 },
    retail: { level: 'low', text: 'موجودی فروشگاه‌های تهران تا ۲ هفته کافی است' },
    consumer: none(),
  },
  // شکر سفید · انبار اصفهان
  a4: {
    'raw-materials': { level: 'medium', impact: 1 },
    warehousing: { level: 'medium', impact: 0 },
    industries: { level: 'medium', text: 'کارخانه‌های شیرینی‌سازی اصفهان سهمیه کمتر می‌گیرند' },
    packaging: { level: 'low', text: 'بسته‌بندی شکر خانوار کند می‌شود' },
    distribution: { level: 'low', text: 'ارسال به یزد اولویت دوم می‌شود' },
    retail: { level: 'medium', impact: 2 },
    consumer: { level: 'low', text: 'احتمال کمبود موقت شکر بسته‌ای' },
  },
  // کنجاله سویا · انبار بندرعباس
  a5: {
    'raw-materials': { level: 'low', impact: 2 },
    warehousing: { level: 'medium', impact: 0 },
    industries: { level: 'medium', text: 'کارخانه‌های خوراک دام و طیور جنوب سهمیه کمتر می‌گیرند' },
    packaging: none(),
    distribution: { level: 'low', impact: 1 },
    retail: none('به خرده‌فروشی نمی‌رسد'),
    consumer: { level: 'low', text: 'اثر غیرمستقیم بر قیمت مرغ و تخم‌مرغ' },
  },
  // گندم · انبار مرکزی تهران
  a6: {
    'raw-materials': { level: 'high', impact: 1 },
    warehousing: { level: 'medium', impact: 0 },
    industries: { level: 'high', text: 'سهمیهٔ آرد کارخانه‌های تهران کم می‌شود' },
    packaging: { level: 'low', text: 'بسته‌بندی آرد خانوار کند می‌شود' },
    distribution: { level: 'medium', text: 'ارسال آرد به نانوایی‌ها اولویت‌بندی می‌شود' },
    retail: { level: 'medium', impact: 2 },
    consumer: { level: 'high', text: 'خطر صف نانوایی در تهران و البرز' },
  },
  // روغن مایع · انبار مرکزی تهران (مازاد)
  a7: {
    'raw-materials': { level: 'low', impact: 2 },
    warehousing: { level: 'high', impact: 1 },
    industries: none(),
    packaging: { level: 'low', text: 'تولید بسته‌های تازه تا خالی شدن انبار کم می‌شود' },
    distribution: { level: 'medium', text: 'نیاز به حمل مازاد به انبار مشهد' },
    retail: none(),
    consumer: none('اثری ندارد؛ عرضه کافی است'),
  },
  // گندم · دریای عمان (توقف محموله)
  a8: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: { level: 'medium', impact: 2 },
    industries: { level: 'medium', text: 'برنامهٔ آسیاب‌های تهران به رسیدن محموله وابسته است' },
    packaging: none(),
    distribution: { level: 'medium', impact: 1 },
    retail: { level: 'low', text: 'موجودی آرد فروشگاه‌ها فعلاً کافی است' },
    consumer: { level: 'low', text: 'اگر توقف طولانی شود، فشار بر قیمت نان' },
  },
  // شکر · تأمین‌کننده الف
  a9: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: { level: 'medium', impact: 2 },
    industries: { level: 'medium', text: 'کارخانه‌های نوشابه و شیرینی برنامه را عقب می‌اندازند' },
    packaging: { level: 'low', text: 'بسته‌بندی شکر اصفهان کم‌کار می‌شود' },
    distribution: { level: 'medium', impact: 1 },
    retail: { level: 'low', text: 'موجودی فروشگاه‌ها تا ۲ هفته کافی است' },
    consumer: none(),
  },
  // ریسک تأمین‌کننده · شرکت ب
  a10: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: { level: 'medium', impact: 2 },
    industries: { level: 'medium', impact: 1 },
    packaging: { level: 'low', text: 'در صورت قطع، بسته‌بندی روغن متوقف می‌شود' },
    distribution: none('تا قطع واقعی اثری ندارد'),
    retail: none('تا قطع واقعی اثری ندارد'),
    consumer: { level: 'low', text: 'در صورت قطع، کمبود روغن در بازار' },
  },
  // آرد نانوایی · انبار مشهد (جهش تقاضا)
  a11: {
    'raw-materials': { level: 'medium', text: 'نیاز به گندم بیشتر برای آسیاب‌های خراسان' },
    warehousing: { level: 'medium', impact: 0 },
    industries: { level: 'medium', text: 'آسیاب‌های مشهد با ظرفیت کامل کار می‌کنند' },
    packaging: none(),
    distribution: { level: 'medium', impact: 2 },
    retail: { level: 'high', impact: 1 },
    consumer: { level: 'high', text: 'خطر صف نانوایی در خراسان' },
  },
  // قیمت و ارز · واردات روغن خام
  a12: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: none(),
    industries: { level: 'medium', impact: 1 },
    packaging: { level: 'low', text: 'هزینهٔ تمام‌شدهٔ روغن بسته‌ای بالا می‌رود' },
    distribution: none(),
    retail: { level: 'medium', text: 'فشار برای افزایش قیمت روغن در فروشگاه‌ها' },
    consumer: { level: 'medium', text: 'افزایش قیمت روغن خوراکی' },
  },
  // ازدحام بندر شهید رجایی (رویداد)
  a13: {
    'raw-materials': { level: 'high', impact: 0 },
    warehousing: { level: 'high', impact: 2 },
    industries: { level: 'medium', text: 'روغن‌کشی و خوراک دام جنوب کمبود ماده اولیه دارند' },
    packaging: { level: 'low', text: 'بسته‌بندی روغن جنوب کم‌کار می‌شود' },
    distribution: { level: 'high', impact: 1 },
    retail: { level: 'medium', text: 'تأخیر در رسیدن کالا به فروشگاه‌های جنوب' },
    consumer: { level: 'low', text: 'احتمال کمبود موقت روغن و خوراک دام' },
  },
  // داده قدیمی · سیستم انبار اهواز
  a14: {
    'raw-materials': none('اثر مستقیم ندارد'),
    warehousing: { level: 'high', impact: 0 },
    industries: none('اثر مستقیم ندارد'),
    packaging: none('اثر مستقیم ندارد'),
    distribution: { level: 'low', text: 'برنامه‌ریزی ارسال از اهواز با دادهٔ کهنه انجام می‌شود' },
    retail: none('اثر مستقیم ندارد'),
    consumer: none('اثر مستقیم ندارد'),
  },
  // همگام‌سازی ناموفق · سامانه حمل
  a15: {
    'raw-materials': none('اثر مستقیم ندارد'),
    warehousing: { level: 'medium', impact: 0 },
    industries: none('اثر مستقیم ندارد'),
    packaging: none('اثر مستقیم ندارد'),
    distribution: { level: 'high', text: 'حواله‌های انتقال تا ثبت دستی اجرا نمی‌شوند' },
    retail: none('اثر مستقیم ندارد'),
    consumer: none('اثر مستقیم ندارد'),
  },
  // مهلت گذشته · کسری چای بسته‌بندی
  a16: {
    'raw-materials': none('اثر مستقیم ندارد'),
    warehousing: { level: 'medium', text: 'کسری چای انبار اصفهان بی‌رسیدگی مانده' },
    industries: none('اثر مستقیم ندارد'),
    packaging: { level: 'medium', text: 'سفارش بسته‌بندی چای منتظر تصمیم است' },
    distribution: { level: 'low', text: 'ارسال چای به اصفهان عقب می‌افتد' },
    retail: { level: 'low', text: 'کمبود موقت چای بسته‌ای در اصفهان' },
    consumer: none(),
  },
}
