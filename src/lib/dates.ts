export const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISO(new Date())
}

/** Start timestamp (ms) of an event, in local time. */
export function startOf(ev: { date: string; time: string }): number {
  const [y, m, d] = ev.date.split('-').map(Number)
  const [hh, mm] = (ev.time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm).getTime()
}

export interface GridDay {
  iso: string
  day: number
  inMonth: boolean
}

/** Always 42 cells (6 weeks) so the calendar height never jumps. */
export function monthGrid(year: number, month: number, weekStart: 0 | 1): GridDay[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - weekStart + 7) % 7
  const days: GridDay[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - offset + i)
    days.push({ iso: toISO(d), day: d.getDate(), inMonth: d.getMonth() === month })
  }
  return days
}

export function weekdayLabels(weekStart: 0 | 1): string[] {
  // 2023-01-01 was a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + ((i + weekStart) % 7))
      .toLocaleDateString(undefined, { weekday: 'short' })
      .slice(0, 2),
  )
}

/**
 * Default time for a new event. If the preferred time has already passed today,
 * use the next full hour instead so a fresh form never starts in the past.
 */
export function smartDefaultTime(date: string, preferred: string, now = Date.now()) {
  if (startOf({ date, time: preferred }) > now) return preferred
  const d = new Date(now)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  // Past date, or the next hour rolls into tomorrow: keep the preferred time.
  if (toISO(d) !== date) return preferred
  return `${pad(d.getHours())}:00`
}

export function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function diffDays(isoA: string, isoB: string) {
  const a = parseISO(isoA).getTime()
  const b = parseISO(isoB).getTime()
  return Math.round((a - b) / 86_400_000)
}

/** "Today", "Tomorrow", "Yesterday", else weekday name. */
export function relativeDayLabel(iso: string, today: string) {
  const diff = diffDays(iso, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return parseISO(iso).toLocaleDateString(undefined, { weekday: 'long' })
}

export function formatLongDate(iso: string) {
  return parseISO(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(iso: string) {
  return parseISO(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "in 3 days" style text for upcoming group headers. */
export function inDaysLabel(iso: string, today: string) {
  const diff = diffDays(iso, today)
  if (diff <= 0) return ''
  return diff === 1 ? 'in 1 day' : `in ${diff} days`
}
