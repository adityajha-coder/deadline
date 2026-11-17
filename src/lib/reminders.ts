import { OFFSET_OPTIONS, type DeadlineEvent, type Settings } from './types'
import { startOf } from './dates'

const MIN = 60_000

export const ALL_OFFSETS: number[] = OFFSET_OPTIONS.map((o) => o.minutes)

export function offsetLabel(minutes: number) {
  return OFFSET_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} min`
}

/** Offsets (from all possible ones) whose reminder time is already behind us. */
export function passedOffsets(ev: Pick<DeadlineEvent, 'date' | 'time'>, now: number): number[] {
  const start = startOf(ev)
  return ALL_OFFSETS.filter((o) => start - o * MIN <= now)
}

/** "in 40 min", "in 3 hr 20 min", "in 2 days" */
export function formatRemaining(ms: number) {
  const mins = Math.max(0, Math.round(ms / MIN))
  if (mins < 1) return 'now'
  if (mins < 60) return `in ${mins} min`
  if (mins < 1440) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `in ${h} hr ${m} min` : `in ${h} hr`
  }
  const days = Math.round(mins / 1440)
  return days === 1 ? 'in 1 day' : `in ${days} days`
}

export interface Due {
  event: DeadlineEvent
  offset: number
  /** Human text such as "in 1 hour" */
  when: string
}

/**
 * Decide which reminders to show right now.
 *
 * - Fires at most one notification per event per run (the most imminent
 *   reminder), so a laptop waking from sleep never spams 4 pop-ups.
 * - Marks every reminder time that has passed as handled, so enabling a new
 *   offset later never triggers a surprise pop-up for the past.
 * - Never notifies for done events or events that already started.
 */
export function computeDue(events: DeadlineEvent[], settings: Settings, now: number) {
  const due: Due[] = []
  const patches: Record<string, number[]> = {}

  for (const ev of events) {
    if (ev.done) continue
    const start = startOf(ev)
    const passed = passedOffsets(ev, now)
    const fired = new Set(ev.fired)

    if (passed.some((o) => !fired.has(o))) {
      patches[ev.id] = Array.from(new Set([...ev.fired, ...passed]))
    }

    const pending = settings.offsets.filter((o) => passed.includes(o) && !fired.has(o))
    if (pending.length && start > now) {
      const offset = Math.min(...pending)
      const lag = now - (start - offset * MIN)
      // On time (within a couple of minutes) → use the nominal label, else the real remaining time.
      const when = lag <= 2 * MIN ? `in ${offsetLabel(offset)}` : formatRemaining(start - now)
      due.push({ event: ev, offset, when })
    }
  }

  return { due, patches }
}
