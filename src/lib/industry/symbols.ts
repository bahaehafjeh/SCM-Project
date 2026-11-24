/** Listed symbols; only «غبشهر» has real purchase CSV data loaded so far */
export const SYMBOLS = ['بهپاک — صنعتی بهپاک', 'غبشهر — صنعتی بهشهر', 'غگل — گلوکوزان'] as const
export type Symbol = (typeof SYMBOLS)[number]
export const DATA_SYMBOL: Symbol = 'غبشهر — صنعتی بهشهر'
