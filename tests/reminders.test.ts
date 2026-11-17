import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeDue, formatRemaining, passedOffsets } from '../src/lib/reminders'
import { monthGrid, smartDefaultTime, startOf } from '../src/lib/dates'
import { DEFAULT_SETTINGS, type DeadlineEvent } from '../src/lib/types'

const MIN = 60_000
const HOUR = 60 * MIN

function ev(startMs: number, over: Partial<DeadlineEvent> = {}): DeadlineEvent {
  const d = new Date(startMs)
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    id: 'e1',
    title: 'Submit report',
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    notes: '',
    done: false,
    fired: [],
    createdAt: 0,
    ...over,
  }
}

const settings = { ...DEFAULT_SETTINGS, offsets: [1440, 720, 300, 60] }
// Fixed "event time": a minute-aligned local timestamp
const START = new Date(2026, 10, 20, 17, 0).getTime()

describe('computeDue', () => {
  it('does nothing while every reminder is still in the future', () => {
    const { due, patches } = computeDue([ev(START)], settings, START - 25 * HOUR)
    assert.equal(due.length, 0)
    assert.deepEqual(patches, {})
  })

  it('fires the 1-day reminder on time, with the nominal label', () => {
    const { due, patches } = computeDue([ev(START)], settings, START - 24 * HOUR + 30_000)
    assert.equal(due.length, 1)
    assert.equal(due[0].offset, 1440)
    assert.equal(due[0].when, 'in 1 day')
    assert.deepEqual(patches.e1, [1440])
  })

  it('does not fire again once marked as fired', () => {
    const e = ev(START, { fired: [1440] })
    const { due } = computeDue([e], settings, START - 24 * HOUR + 5 * MIN)
    assert.equal(due.length, 0)
  })

  it('collapses several missed reminders (e.g. after sleep) into ONE notification', () => {
    // laptop wakes 40 minutes before the deadline; 1d, 12h, 5h and 1h all passed
    const { due, patches } = computeDue([ev(START)], settings, START - 40 * MIN)
    assert.equal(due.length, 1)
    assert.equal(due[0].offset, 60)
    assert.equal(due[0].when, 'in 40 min')
    assert.deepEqual(patches.e1.sort((a, b) => a - b), [60, 300, 720, 1440])
  })

  it('only considers the offsets the user turned on', () => {
    const only1h = { ...settings, offsets: [60] }
    assert.equal(computeDue([ev(START)], only1h, START - 5 * HOUR).due.length, 0)
    assert.equal(computeDue([ev(START)], only1h, START - 60 * MIN + 10_000).due.length, 1)
  })

  it('never notifies for done events or events that already started', () => {
    assert.equal(computeDue([ev(START, { done: true })], settings, START - 30 * MIN).due.length, 0)
    assert.equal(computeDue([ev(START)], settings, START + MIN).due.length, 0)
  })

  it('enabling a new offset later does not trigger a pop-up for the past', () => {
    // created 3h before start with all passed offsets marked (as storage does)
    const now = START - 3 * HOUR
    const e = ev(START, { fired: passedOffsets(ev(START), now) })
    const { due } = computeDue([e], { ...settings, offsets: [300, 60] }, now + MIN)
    assert.equal(due.length, 0)
  })

  it('formats remaining time', () => {
    assert.equal(formatRemaining(20_000), 'now')
    assert.equal(formatRemaining(59 * MIN), 'in 59 min')
    assert.equal(formatRemaining(90 * MIN), 'in 1 hr 30 min')
    assert.equal(formatRemaining(5 * HOUR), 'in 5 hr')
    assert.equal(formatRemaining(49 * HOUR), 'in 2 days')
  })
})

describe('dates', () => {
  it('builds a 6-week grid starting on the chosen weekday', () => {
    const sunday = monthGrid(2026, 10, 0) // Nov 2026 starts on a Sunday
    assert.equal(sunday.length, 42)
    assert.equal(sunday[0].iso, '2026-11-01')
    const monday = monthGrid(2026, 10, 1)
    assert.equal(monday[0].iso, '2026-10-26')
    assert.ok(monday.filter((d) => d.inMonth).length === 30)
  })

  it('computes event start in local time', () => {
    assert.equal(startOf({ date: '2026-11-20', time: '17:00' }), START)
  })

  it('picks a sensible default time for a new event', () => {
    const now = new Date(2026, 10, 17, 14, 20).getTime()
    assert.equal(smartDefaultTime('2026-11-18', '09:00', now), '09:00') // future day: preferred
    assert.equal(smartDefaultTime('2026-11-17', '18:00', now), '18:00') // later today: preferred
    assert.equal(smartDefaultTime('2026-11-17', '09:00', now), '15:00') // already passed: next full hour
    assert.equal(smartDefaultTime('2026-11-10', '09:00', now), '09:00') // past day: leave alone
    const late = new Date(2026, 10, 17, 23, 30).getTime()
    assert.equal(smartDefaultTime('2026-11-17', '09:00', late), '09:00') // would roll into tomorrow
  })
})
