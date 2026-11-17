import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  formatLongDate,
  parseISO,
  relativeDayLabel,
  startOf,
  todayISO,
} from '@/lib/dates'
import {
  createEvent,
  removeEvent,
  restoreEvent,
  setDone,
  updateEvent,
  type EventInput,
} from '@/lib/storage'
import { useStore } from '@/lib/useStore'
import type { DeadlineEvent } from '@/lib/types'
import { Calendar } from '@/components/Calendar'
import { DayList, UpcomingList } from '@/components/EventList'
import { EventForm } from '@/components/EventForm'
import { SettingsSheet } from '@/components/SettingsSheet'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { Plus } from '@/components/Icons'

type SheetState = { kind: 'event'; editing: DeadlineEvent | null; key: number } | { kind: 'settings' }
interface ToastState {
  id: number
  message: string
  undo?: () => void
}

export default function App() {
  const store = useStore()
  const today = todayISO()

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [selected, setSelected] = useState(today)
  const [tab, setTab] = useState<'day' | 'upcoming'>('day')
  // `sheet` keeps its last content while the sheet animates closed.
  const [sheet, setSheet] = useState<SheetState>({ kind: 'settings' })
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number>(0)
  const counter = useRef(0)

  const showToast = useCallback((message: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: ++counter.current, message, undo })
    toastTimer.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const byDate = useMemo(() => {
    const map = new Map<string, DeadlineEvent[]>()
    for (const e of store?.events ?? []) map.set(e.date, [...(map.get(e.date) ?? []), e])
    map.forEach((list) => list.sort((a, b) => startOf(a) - startOf(b)))
    return map
  }, [store?.events])

  const pending = useMemo(
    () => (store?.events ?? []).filter((e) => !e.done).sort((a, b) => startOf(a) - startOf(b)),
    [store?.events],
  )

  const closeSheet = useCallback(() => setOpen(false), [])

  if (!store) return <div className="h-[560px] w-[380px]" />
  const { settings } = store
  const now = Date.now()

  const goToDate = (iso: string) => {
    const d = parseISO(iso)
    setSelected(iso)
    setMonth({ y: d.getFullYear(), m: d.getMonth() })
  }

  const shiftMonth = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const openEvent = (editing: DeadlineEvent | null) => {
    setSheet({ kind: 'event', editing, key: ++counter.current })
    setOpen(true)
  }

  const handleSave = async (input: EventInput) => {
    if (sheet.kind !== 'event') return
    if (sheet.editing) await updateEvent(sheet.editing.id, input)
    else await createEvent(input)
    goToDate(input.date)
    setOpen(false)
  }

  const handleDelete = async (ev: DeadlineEvent) => {
    setOpen(false)
    await removeEvent(ev.id)
    showToast(`Deleted “${ev.title}”`, () => {
      void restoreEvent(ev)
      setToast(null)
    })
  }

  const handleToggle = (ev: DeadlineEvent) => void setDone(ev.id, !ev.done)

  const rowHandlers = { now, onToggle: handleToggle, onEdit: openEvent, onDelete: handleDelete }
  const dayEvents = byDate.get(selected) ?? []

  return (
    <div className="relative flex h-[560px] w-[380px] flex-col overflow-hidden bg-background text-foreground">
      <Calendar
        year={month.y}
        month={month.m}
        weekStart={settings.weekStart}
        selected={selected}
        today={today}
        byDate={byDate}
        onSelect={goToDate}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        onToday={() => goToDate(today)}
        onSettings={() => {
          setSheet({ kind: 'settings' })
          setOpen(true)
        }}
      />

      <div className="mx-4 mt-3 flex items-center justify-between border-t pt-3">
        <div className="min-w-0">
          {tab === 'day' ? (
            <>
              <div className="text-sm font-semibold leading-tight">{relativeDayLabel(selected, today)}</div>
              <div className="text-xs text-muted-foreground">{formatLongDate(selected)}</div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold leading-tight">Next up</div>
              <div className="text-xs text-muted-foreground">
                {pending.length} pending
              </div>
            </>
          )}
        </div>
        <Segmented
          label="View"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'upcoming', label: 'Upcoming' },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 pt-1">
        <div key={tab === 'day' ? selected : 'upcoming'}>
          {tab === 'day' ? (
            <DayList events={dayEvents} {...rowHandlers} />
          ) : (
            <UpcomingList events={pending} today={today} {...rowHandlers} />
          )}
        </div>
      </div>

      <Button
        size="fab"
        aria-label="Add event"
        onClick={() => {
          if (tab === 'upcoming') setTab('day')
          openEvent(null)
        }}
        className={cn(
          'absolute bottom-5 right-5 z-30 transition-all duration-200 hover:scale-105',
          open && 'pointer-events-none scale-75 opacity-0',
        )}
      >
        <Plus width={22} height={22} />
      </Button>

      <Sheet
        open={open}
        onClose={closeSheet}
        title={sheet.kind === 'settings' ? 'Settings' : sheet.editing ? 'Edit deadline' : 'New deadline'}
      >
        {sheet.kind === 'settings' ? (
          <SettingsSheet settings={settings} notify={showToast} />
        ) : (
          <EventForm
            key={sheet.key}
            editing={sheet.editing}
            defaultDate={selected}
            defaultTime={settings.defaultTime}
            offsets={settings.offsets}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={closeSheet}
          />
        )}
      </Sheet>

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[88px] z-50 flex justify-center px-4">
          <div
            key={toast.id}
            role="status"
            className="pop-in pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-foreground py-2 pl-4 pr-3 text-sm text-background shadow-lg"
          >
            <span className="truncate">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={toast.undo}
                className="cursor-pointer rounded-full px-2 py-0.5 text-xs font-semibold underline underline-offset-2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-background/50"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
