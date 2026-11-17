import { DEFAULT_SETTINGS, type DeadlineEvent, type Settings } from './types'
import { passedOffsets } from './reminders'

// Inside the extension we use chrome.storage.local. When the popup is opened as a
// plain web page (handy for design work) we fall back to localStorage.
const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage?.local
const localListeners = new Set<() => void>()

async function read<T>(key: string, fallback: T): Promise<T> {
  if (hasChrome) {
    const r = await chrome.storage.local.get(key)
    return (r[key] as T) ?? fallback
  }
  try {
    const raw = localStorage.getItem('dl:' + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

async function write(key: string, value: unknown) {
  if (hasChrome) {
    await chrome.storage.local.set({ [key]: value })
    return
  }
  localStorage.setItem('dl:' + key, JSON.stringify(value))
  localListeners.forEach((l) => l())
}

// Serialise read-modify-write cycles so quick successive edits never clobber each other.
let chain: Promise<unknown> = Promise.resolve()
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn)
  chain = p.catch(() => undefined)
  return p
}

export async function loadAll(): Promise<{ events: DeadlineEvent[]; settings: Settings }> {
  const events = await read<DeadlineEvent[]>('events', [])
  const stored = await read<Partial<Settings>>('settings', {})
  return { events, settings: { ...DEFAULT_SETTINGS, ...stored } }
}

export function subscribe(cb: () => void): () => void {
  if (hasChrome) {
    const handler = (_changes: unknown, area: string) => {
      if (area === 'local') cb()
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }
  localListeners.add(cb)
  return () => localListeners.delete(cb)
}

function mutateEvents(fn: (list: DeadlineEvent[]) => DeadlineEvent[]) {
  return enqueue(async () => {
    const cur = await read<DeadlineEvent[]>('events', [])
    await write('events', fn(cur))
  })
}

export function saveSettings(patch: Partial<Settings>) {
  return enqueue(async () => {
    const stored = await read<Partial<Settings>>('settings', {})
    await write('settings', { ...DEFAULT_SETTINGS, ...stored, ...patch })
  })
}

export interface EventInput {
  title: string
  date: string
  time: string
  notes: string
}

export function createEvent(input: EventInput) {
  const base: DeadlineEvent = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    date: input.date,
    time: input.time,
    notes: input.notes.trim(),
    done: false,
    fired: [],
    createdAt: Date.now(),
  }
  // Reminder times already in the past are skipped silently — no pop-up on creation.
  const ev = { ...base, fired: passedOffsets(base, Date.now()) }
  return mutateEvents((l) => [...l, ev]).then(() => ev)
}

export function updateEvent(id: string, input: EventInput) {
  return mutateEvents((l) =>
    l.map((e) => {
      if (e.id !== id) return e
      const next: DeadlineEvent = {
        ...e,
        title: input.title.trim(),
        date: input.date,
        time: input.time,
        notes: input.notes.trim(),
      }
      const moved = next.date !== e.date || next.time !== e.time
      return moved ? { ...next, fired: passedOffsets(next, Date.now()) } : next
    }),
  )
}

export function setDone(id: string, done: boolean) {
  return mutateEvents((l) =>
    l.map((e) =>
      e.id === id
        ? { ...e, done, fired: done ? e.fired : passedOffsets(e, Date.now()) }
        : e,
    ),
  )
}

export function removeEvent(id: string) {
  return mutateEvents((l) => l.filter((e) => e.id !== id))
}

export function restoreEvent(ev: DeadlineEvent) {
  return mutateEvents((l) => (l.some((e) => e.id === ev.id) ? l : [...l, ev]))
}

export function applyFired(patches: Record<string, number[]>) {
  return mutateEvents((l) => l.map((e) => (patches[e.id] ? { ...e, fired: patches[e.id] } : e)))
}

export async function exportData() {
  const { events, settings } = await loadAll()
  return JSON.stringify({ version: 1, events, settings }, null, 2)
}

/** Merges events from a backup file (matching ids are replaced). Returns how many were imported. */
export async function importData(text: string): Promise<number> {
  const data = JSON.parse(text)
  const incoming: unknown = Array.isArray(data) ? data : data?.events
  if (!Array.isArray(incoming)) throw new Error('Not a valid backup file')

  const valid: DeadlineEvent[] = []
  for (const e of incoming as Record<string, unknown>[]) {
    if (!e || typeof e.id !== 'string' || typeof e.title !== 'string') continue
    if (typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue
    const time = typeof e.time === 'string' && /^\d{2}:\d{2}$/.test(e.time) ? e.time : '09:00'
    valid.push({
      id: e.id,
      title: e.title,
      date: e.date,
      time,
      notes: typeof e.notes === 'string' ? e.notes : '',
      done: !!e.done,
      fired: passedOffsets({ date: e.date, time }, Date.now()),
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    })
  }

  await mutateEvents((cur) => {
    const map = new Map(cur.map((e) => [e.id, e]))
    valid.forEach((e) => map.set(e.id, e))
    return [...map.values()]
  })
  return valid.length
}
