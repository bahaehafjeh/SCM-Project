/**
 * Data-state taxonomy (docs/02 §4). These states are never merged:
 * a missing value is not zero, and "not collected" is not 0%.
 */
export type DataState =
  | 'value'
  | 'zero'
  | 'missing'
  | 'invalid'
  | 'not-collected'
  | 'not-evaluated'
  | 'not-applicable'
  | 'incomplete-period'
  | 'unknown'
  | 'mock'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const dataStateMeta: Record<Exclude<DataState, 'value'>, { label: string; tone: Tone; hint: string }> = {
  zero: { label: 'صفر', tone: 'neutral', hint: 'مقدار ثبت‌شده برابر صفر است.' },
  missing: { label: 'مفقود', tone: 'warning', hint: 'مقدار مورد انتظار در داده وجود ندارد.' },
  invalid: { label: 'نامعتبر', tone: 'danger', hint: 'مقدار ثبت‌شده با قواعد اعتبارسنجی مطابقت ندارد.' },
  'not-collected': { label: 'گردآوری نشده', tone: 'neutral', hint: 'داده‌ای برای این بخش هنوز گردآوری نشده است.' },
  'not-evaluated': { label: 'ارزیابی نشده', tone: 'neutral', hint: 'پوشش یا کیفیت این بخش هنوز ارزیابی نشده است.' },
  'not-applicable': { label: 'کاربرد ندارد', tone: 'neutral', hint: 'این شاخص برای این مورد معنا ندارد.' },
  'incomplete-period': { label: 'دوره ناقص', tone: 'warning', hint: 'داده این دوره هنوز کامل منتشر نشده است.' },
  unknown: { label: 'نامشخص', tone: 'neutral', hint: 'مقدار یا روش محاسبه مستند نشده است.' },
  mock: { label: 'نمونه طراحی', tone: 'warning', hint: 'این مقدار نمونه است و از منبع داده واقعی نیامده است.' },
}

/** A measured value, or an explicit reason why there is none. */
export type Measured<T = number> = { state: 'value'; value: T } | { state: Exclude<DataState, 'value'> }

export const measured = <T>(value: T): Measured<T> => ({ state: 'value', value })
export const noValue = (state: Exclude<DataState, 'value'>): Measured<never> => ({ state })
export const hasValue = <T>(m: Measured<T>): m is { state: 'value'; value: T } => m.state === 'value'
