import { cn } from '@/lib/utils'
import { formatShortDate, formatTime, inDaysLabel, startOf } from '@/lib/dates'
import type { DeadlineEvent } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Check, CalendarCheck, Trash } from '@/components/Icons'

interface RowProps {
  event: DeadlineEvent
  now: number
  onToggle: (e: DeadlineEvent) => void
  onEdit: (e: DeadlineEvent) => void
  onDelete: (e: DeadlineEvent) => void
}

function EventRow({ event, now, onToggle, onEdit, onDelete }: RowProps) {
  const overdue = !event.done && startOf(event) < now
  return (
    <li className="group fade-in flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/70">
      <button
        type="button"
        onClick={() => onToggle(event)}
        aria-label={event.done ? 'Mark as not done' : 'Mark as done'}
        aria-pressed={event.done}
        className={cn(
          'grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border-[1.5px] outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-90',
          event.done
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary',
        )}
      >
        <Check width={12} height={12} strokeWidth={3} className={cn('transition-all duration-150', event.done ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} />
      </button>

      <button type="button" onClick={() => onEdit(event)} className="min-w-0 flex-1 cursor-pointer text-left outline-none">
        <div
          className={cn(
            'truncate text-sm font-medium transition-colors',
            event.done && 'text-muted-foreground line-through',
          )}
        >
          {event.title}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatTime(event.time)}
          {overdue && <span className="text-destructive"> · Overdue</span>}
          {event.notes && <span> · {event.notes}</span>}
        </div>
      </button>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${event.title}`}
        onClick={() => onDelete(event)}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash />
      </Button>
    </li>
  )
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="fade-in flex flex-col items-center gap-2 px-6 pt-8 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <CalendarCheck width={20} height={20} />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

interface DayProps extends Omit<RowProps, 'event'> {
  events: DeadlineEvent[]
}

export function DayList({ events, ...handlers }: DayProps) {
  if (!events.length) return <Empty title="Nothing due" hint="Tap + to add a deadline for this day." />
  return (
    <ul className="space-y-0.5">
      {events.map((e) => (
        <EventRow key={e.id} event={e} {...handlers} />
      ))}
    </ul>
  )
}

interface UpcomingProps extends Omit<RowProps, 'event'> {
  /** Not-done events, sorted by start time */
  events: DeadlineEvent[]
  today: string
}

export function UpcomingList({ events, today, ...handlers }: UpcomingProps) {
  if (!events.length) return <Empty title="All clear" hint="No pending deadlines. Nicely done." />

  const overdue = events.filter((e) => startOf(e) < handlers.now)
  const upcoming = events.filter((e) => startOf(e) >= handlers.now)
  const groups = new Map<string, DeadlineEvent[]>()
  upcoming.forEach((e) => groups.set(e.date, [...(groups.get(e.date) ?? []), e]))

  const Heading = ({ left, right, tone }: { left: string; right?: string; tone?: 'danger' }) => (
    <div className="flex items-baseline justify-between px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide">
      <span className={tone === 'danger' ? 'text-destructive' : 'text-muted-foreground'}>{left}</span>
      {right && <span className="normal-case tracking-normal text-muted-foreground/80">{right}</span>}
    </div>
  )

  return (
    <div>
      {overdue.length > 0 && (
        <section>
          <Heading left="Overdue" tone="danger" />
          <ul className="space-y-0.5">
            {overdue.map((e) => (
              <EventRow key={e.id} event={e} {...handlers} />
            ))}
          </ul>
        </section>
      )}
      {[...groups.entries()].map(([date, list]) => (
        <section key={date}>
          <Heading
            left={date === today ? 'Today' : formatShortDate(date)}
            right={inDaysLabel(date, today)}
          />
          <ul className="space-y-0.5">
            {list.map((e) => (
              <EventRow key={e.id} event={e} {...handlers} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
