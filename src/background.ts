import { applyFired, loadAll, setDone } from './lib/storage'
import { computeDue, type Due } from './lib/reminders'
import { formatShortDate, formatTime, todayISO } from './lib/dates'
import type { DeadlineEvent } from './lib/types'

/**
 * A single 1-minute heartbeat checks which reminders are due. This is more robust
 * than one alarm per reminder: it survives browser restarts, edits, and a laptop
 * waking from sleep (missed reminders are collapsed into one pop-up).
 */
const TICK = 'deadlines-tick'

function ensureAlarm() {
  chrome.alarms.get(TICK, (alarm) => {
    if (!alarm) chrome.alarms.create(TICK, { periodInMinutes: 1, delayInMinutes: 0.1 })
  })
}

let running: Promise<void> | null = null
function tick(): Promise<void> {
  if (running) return running
  running = (async () => {
    const { events, settings } = await loadAll()
    const { due, patches } = computeDue(events, settings, Date.now())
    // Mark as handled first, so a failure while notifying can never cause duplicates.
    if (Object.keys(patches).length) await applyFired(patches)
    due.forEach(notify)
    await updateBadge(events)
  })().finally(() => {
    running = null
  })
  return running
}

function notify({ event, when }: Due) {
  const options: chrome.notifications.NotificationOptions<true> = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: event.title,
    message: `Due ${when} · ${formatShortDate(event.date)}, ${formatTime(event.time)}`,
    priority: 2,
    buttons: [{ title: 'Mark done' }],
  }
  if (event.notes) options.contextMessage = event.notes
  chrome.notifications.create(`evt:${event.id}:${Date.now()}`, options)
}

async function updateBadge(events?: DeadlineEvent[]) {
  const list = events ?? (await loadAll()).events
  const today = todayISO()
  const n = list.filter((e) => !e.done && e.date === today).length
  await chrome.action.setBadgeText({ text: n ? String(n) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#e8630a' })
}

ensureAlarm()

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm()
  void tick()
})
chrome.runtime.onStartup.addListener(() => {
  ensureAlarm()
  void tick()
})
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK) void tick()
})
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') void updateBadge()
})

chrome.notifications.onClicked.addListener(async (id) => {
  chrome.notifications.clear(id)
  try {
    await chrome.action.openPopup()
  } catch {
    /* openPopup isn't available everywhere — the notification itself was the reminder */
  }
})

chrome.notifications.onButtonClicked.addListener(async (id, index) => {
  if (index === 0) {
    const eventId = id.split(':')[1]
    if (eventId) await setDone(eventId, true)
  }
  chrome.notifications.clear(id)
})
