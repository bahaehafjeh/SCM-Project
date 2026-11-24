import { describe, expect, it } from 'vitest'
import { sampleActions } from '../data/actions'
import type { CurrentUser } from './access'
import { cardCounts, inTab, isOpen, progressOf, searchHit, sortActions, tabCount, tabsFor, toneOf, turnOf } from './actionRules'
import type { ActionTab, Turn } from './actionRules'

// One fixed clock: the samples are written relative to it
const T0 = Date.parse('2026-11-14T10:00:00Z')
const { actions } = sampleActions(T0)
const byId = (id: string) => actions.find((a) => a.id === id)!
const ids = (list: { id: string }[]) => list.map((a) => a.id).sort()

const P: Record<string, CurrentUser> = {
  bahareh: { name: 'بهاره افجه', role: 'specialist', unit: null },
  karimi: { name: 'رضا کریمی', role: 'specialist', unit: 'واحد تأمین' },
  nouri: { name: 'حمید نوری', role: 'manager', unit: 'واحد تأمین' },
  kazemi: { name: 'رضا کاظمی', role: 'specialist', unit: 'واحد حمل‌ونقل' },
  rostami: { name: 'علی رستمی', role: 'specialist', unit: 'واحد بازرگانی و ترخیص' },
  ahmadi: { name: 'سارا احمدی', role: 'specialist', unit: 'واحد انبارهای جنوب' },
  viewer: { name: 'بهاره افجه', role: 'viewer', unit: null },
}
const tabOf = (me: CurrentUser, tab: ActionTab) => actions.filter((a) => inTab(a, tab, me))
const cards = (me: CurrentUser, tab: ActionTab) => {
  const c = cardCounts(tabOf(me, tab), me, T0)
  return { mine: ids(c.mine), late: ids(c.late), stuck: ids(c.stuck), week: ids(c.week) }
}
const chips = (me: CurrentUser, tab: ActionTab) => {
  const list = tabOf(me, tab)
  const of = (t: Turn) => list.filter((a) => turnOf(a, me, T0) === t).length
  return { all: list.filter(isOpen).length, mine: of('mine'), flow: of('flow'), others: of('others'), closed: of('closed') }
}

describe('turnOf (§4): every sample action, every persona', () => {
  // Columns: بهاره · رضا کریمی · حمید نوری · رضا کاظمی · علی رستمی · سارا احمدی · ناظر
  const table: Record<string, Turn[]> = {
    'ACT-869': ['flow', 'mine', 'flow', 'flow', 'flow', 'flow', 'flow'],
    'ACT-881': ['flow', 'mine', 'mine', 'flow', 'flow', 'flow', 'others'],
    'ACT-882': ['others', 'mine', 'mine', 'flow', 'flow', 'flow', 'others'],
    'ACT-883': ['flow', 'flow', 'flow', 'flow', 'flow', 'flow', 'flow'],
    'ACT-884': ['mine', 'others', 'others', 'flow', 'flow', 'flow', 'others'],
    'ACT-886': ['flow', 'flow', 'flow', 'flow', 'flow', 'flow', 'flow'],
    'ACT-887': ['flow', 'flow', 'flow', 'mine', 'flow', 'flow', 'flow'],
    'ACT-888': ['flow', 'flow', 'flow', 'flow', 'mine', 'flow', 'flow'],
    'ACT-889': ['flow', 'flow', 'flow', 'flow', 'flow', 'flow', 'flow'],
    'ACT-875': ['closed', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed'],
    'ACT-860': ['closed', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed'],
    'ACT-858': ['closed', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed'],
  }
  const people = ['bahareh', 'karimi', 'nouri', 'kazemi', 'rostami', 'ahmadi', 'viewer']
  for (const [id, row] of Object.entries(table))
    it(id, () => {
      expect(people.map((p) => turnOf(byId(id), P[p], T0))).toEqual(row)
    })
})

describe('§10 · بهاره افجه (requester, no unit)', () => {
  const me = P.bahareh
  it('tabs: «کارهای من (۸)» and «همه (۹)», no «واحد من»', () => {
    expect(tabsFor(me)).toEqual(['mine', 'all'])
    expect([tabCount(actions, 'mine', me), tabCount(actions, 'all', me)]).toEqual([8, 9])
  })
  it('cards', () => {
    expect(cards(me, 'mine')).toEqual({ mine: ['ACT-884'], late: ['ACT-887'], stuck: ['ACT-869', 'ACT-888'], week: ['ACT-869', 'ACT-886', 'ACT-888'] })
  })
  it('chips: همه ۸ · منتظر شما ۱ · در جریان ۶ · منتظر دیگران ۱ · بسته‌شده ۲', () => {
    expect(chips(me, 'mine')).toEqual({ all: 8, mine: 1, flow: 6, others: 1, closed: 2 })
    expect(ids(tabOf(me, 'mine').filter((a) => !isOpen(a)))).toEqual(['ACT-860', 'ACT-875'])
  })
  it('colours: 884 blue, 887 red, 888 and 869 orange, 882 none', () => {
    expect(['ACT-884', 'ACT-887', 'ACT-888', 'ACT-869', 'ACT-882'].map((id) => toneOf(byId(id), me, T0))).toEqual(['blue', 'red', 'orange', 'orange', null])
  })
})

describe('§10 · رضا کریمی (supply specialist)', () => {
  const me = P.karimi
  it('tabs', () => {
    expect(tabsFor(me)).toEqual(['mine', 'unit'])
    expect([tabCount(actions, 'mine', me), tabCount(actions, 'unit', me)]).toEqual([5, 5])
  })
  it('cards', () => {
    expect(cards(me, 'mine')).toEqual({ mine: ['ACT-869', 'ACT-881', 'ACT-882'], late: [], stuck: ['ACT-869'], week: ['ACT-869'] })
  })
  it('urgency: 881 (red, 1:20) → 882 (blue) → 869 (orange) → 883 → 884', () => {
    const list = sortActions(tabOf(me, 'mine').filter(isOpen), 'urgency', me, T0)
    expect(list.map((a) => a.id)).toEqual(['ACT-881', 'ACT-882', 'ACT-869', 'ACT-883', 'ACT-884'])
    expect(list.map((a) => toneOf(a, me, T0))).toEqual(['red', 'blue', 'orange', null, null])
  })
  it('881 and 882 have no owner; 884 waits for others', () => {
    expect([byId('ACT-881').owner, byId('ACT-882').owner]).toEqual([undefined, undefined])
    expect(turnOf(byId('ACT-884'), me, T0)).toBe('others')
  })
})

describe('§10 · حمید نوری (supply manager)', () => {
  const me = P.nouri
  it('tabs: ۲ · ۵ · ۹', () => {
    expect(tabsFor(me)).toEqual(['mine', 'unit', 'all'])
    expect(['mine', 'unit', 'all'].map((t) => tabCount(actions, t as ActionTab, me))).toEqual([2, 5, 9])
  })
  it('cards in «کارهای من»: only the two without an owner', () => {
    expect(cards(me, 'mine')).toEqual({ mine: ['ACT-881', 'ACT-882'], late: [], stuck: [], week: [] })
  })
  it('«منتظر شما» in «واحد من»: ۲ از ۵', () => {
    const open = tabOf(me, 'unit').filter(isOpen)
    expect([ids(open.filter((a) => turnOf(a, me, T0) === 'mine')), open.length]).toEqual([['ACT-881', 'ACT-882'], 5])
  })
})

describe('§10 · رضا کاظمی (transport)', () => {
  const me = P.kazemi
  it('tabs and cards', () => {
    expect([tabCount(actions, 'mine', me), tabCount(actions, 'unit', me)]).toEqual([3, 3])
    expect(cards(me, 'mine')).toEqual({ mine: ['ACT-887'], late: ['ACT-887'], stuck: [], week: ['ACT-886'] })
  })
  it('887 red with its step in red; 889 delivered, in flow', () => {
    expect(toneOf(byId('ACT-887'), me, T0)).toBe('red')
    expect(progressOf(byId('ACT-887'), T0)).toMatchObject({ text: '۲ از ۴ · تخلیه در چابهار', tone: 'red' })
    expect(progressOf(byId('ACT-889'), T0)).toMatchObject({ text: 'تحویل شد', tone: 'green', pct: 100 })
    expect(turnOf(byId('ACT-889'), me, T0)).toBe('flow')
  })
})

describe('§10 · علی رستمی (customs)', () => {
  const me = P.rostami
  it('one action, orange, his move, the blocker in the progress', () => {
    expect([tabCount(actions, 'mine', me), tabCount(actions, 'unit', me)]).toEqual([1, 1])
    expect(toneOf(byId('ACT-888'), me, T0)).toBe('orange')
    expect(turnOf(byId('ACT-888'), me, T0)).toBe('mine')
    expect(progressOf(byId('ACT-888'), T0).text).toBe('۱ از ۳ · مانع: گواهی بهداشت')
    expect(cards(me, 'mine')).toEqual({ mine: ['ACT-888'], late: [], stuck: ['ACT-888'], week: ['ACT-888'] })
  })
})

describe('§10 · سارا احمدی, viewer, search', () => {
  it('سارا: nothing open in «کارهای من»; «واحد من» has the two closed', () => {
    const me = P.ahmadi
    expect(tabCount(actions, 'mine', me)).toBe(0)
    expect(ids(tabOf(me, 'unit').filter((a) => turnOf(a, me, T0) === 'closed'))).toEqual(['ACT-860', 'ACT-875'])
  })
  it('viewer: only «همه (۹)»', () => {
    expect(tabsFor(P.viewer)).toEqual(['all'])
    expect(tabCount(actions, 'all', P.viewer)).toBe(9)
  })
  it('«۷۷۰۲» finds ACT-883 by its purchase request, in either digit style', () => {
    expect(actions.filter((a) => searchHit(a, '۷۷۰۲')).map((a) => a.id)).toEqual(['ACT-883'])
    expect(searchHit(byId('ACT-883'), '7702')).toBe('ref')
  })
})
