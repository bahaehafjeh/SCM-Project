import { describe, expect, it } from 'vitest'
import { alertBucket, bucketCounts, dueReminders, isSnoozed } from './alertStore'
import type { AlertState } from './alertStore'
import { lifecycle } from '../components/overview/AlertParts'
import type { AlertItem } from '../data/alerts'

const NOW = Date.parse('2026-11-09T12:00:00Z')
const HOUR = 3_600_000
const iso = (t: number) => new Date(t).toISOString()
const a = { id: 'a1' }

/** A store snapshot with only what the test sets */
const st = (p: Partial<AlertState> = {}): AlertState =>
  ({ seen: {}, records: {}, rejected: {}, closed: {}, snoozed: {}, reminded: {}, events: {}, drafts: {}, applied: {}, templates: {}, toast: null, undone: {}, readings: {}, ...p }) as AlertState
const record = { option: 'transfer', note: '', rec: 'REC-1', externalRef: 'x' }

describe('alertBucket', () => {
  it('a reminder not yet due is «معوق»', () => {
    const s = st({ snoozed: { a1: { label: '۴ ساعت دیگر', until: 'امروز', dueAt: iso(NOW + 4 * HOUR) } } })
    expect(alertBucket(s, a, NOW)).toBe('snoozed')
    expect(isSnoozed(s, 'a1', NOW)).toBe(true)
    expect(dueReminders(s, NOW)).toEqual([])
  })

  it('a due reminder is back in «نیازمند بررسی», labelled «یادآوری رسید» once woken', () => {
    const due = st({ snoozed: { a1: { label: '۱ ساعت دیگر', until: 'امروز', dueAt: iso(NOW - HOUR) } } })
    expect(alertBucket(due, a, NOW)).toBe('review')
    expect(dueReminders(due, NOW)).toEqual(['a1'])
    // After wake: no reminder, `reminded` set
    const woken = st({ reminded: { a1: '2026-11-05T12:00:00.000Z' } })
    expect(alertBucket(woken, a, NOW)).toBe('review')
    expect(lifecycle(woken, { id: 'a1' } as AlertItem)).toEqual({ label: 'یادآوری رسید', tone: 'info' })
  })

  it('a recorded decision is «در حال رسیدگی» even with a reminder', () => {
    const s = st({ records: { a1: record }, snoozed: { a1: { label: 'فردا', until: 'فردا', dueAt: iso(NOW + 24 * HOUR) } } })
    expect(alertBucket(s, a, NOW)).toBe('handling')
    expect(dueReminders(st({ records: { a1: record }, snoozed: { a1: { label: 'x', until: 'x', dueAt: iso(NOW - HOUR) } } }), NOW)).toEqual([])
  })

  it('a closed alert is «بسته‌شده»', () => {
    const s = st({ closed: { a1: { reason: 'رفع شد', note: '' } }, records: { a1: record } })
    expect(alertBucket(s, a, NOW)).toBe('closed')
  })

  it('counts match the buckets', () => {
    const s = st({ records: { b: record }, closed: { c: { reason: 'x', note: '' } }, snoozed: { d: { label: 'x', until: 'x', dueAt: iso(NOW + HOUR) } } })
    expect(bucketCounts(s, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], NOW)).toEqual({ review: 1, handling: 1, snoozed: 1, closed: 1 })
  })
})
