export interface DeadlineEvent {
  id: string
  title: string
  /** Local date, YYYY-MM-DD */
  date: string
  /** Local time, HH:mm */
  time: string
  notes: string
  done: boolean
  /** Reminder offsets (minutes) already sent or skipped for this event */
  fired: number[]
  createdAt: number
}

export interface Settings {
  /** Minutes before the event to remind, e.g. [1440, 60] */
  offsets: number[]
  /** Default time for new events, HH:mm */
  defaultTime: string
  /** 0 = Sunday, 1 = Monday */
  weekStart: 0 | 1
}

export const OFFSET_OPTIONS = [
  { minutes: 1440, label: '1 day' },
  { minutes: 720, label: '12 hours' },
  { minutes: 300, label: '5 hours' },
  { minutes: 60, label: '1 hour' },
] as const

export const DEFAULT_SETTINGS: Settings = {
  offsets: [1440, 60],
  defaultTime: '09:00',
  weekStart: 0,
}
