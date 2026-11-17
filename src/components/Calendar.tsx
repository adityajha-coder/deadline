import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { monthGrid, startOf, weekdayLabels } from '@/lib/dates'
import type { DeadlineEvent } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Settings } from '@/components/Icons'

interface Props {
  year: number
  month: number
  weekStart: 0 | 1
  selected: string
  today: string
  byDate: Map<string, DeadlineEvent[]>
  onSelect: (iso: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSettings: () => void
}

export function Calendar({
  year,
  month,
  weekStart,
  selected,
  today,
  byDate,
  onSelect,
  onPrev,
  onNext,
  onToday,
  onSettings,
}: Props) {
  const days = useMemo(() => monthGrid(year, month, weekStart), [year, month, weekStart])
  const labels = useMemo(() => weekdayLabels(weekStart), [weekStart])
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' })
  const now = Date.now()

  const t = new Date()
  const showToday = !(year === t.getFullYear() && month === t.getMonth() && selected === today)

  return (
    <section className="px-4 pt-4">
      <div className="mb-3 flex items-center justify-between pl-1">
        <h1 className="text-lg font-semibold tracking-tight">
          {monthName} <span className="font-normal text-muted-foreground">{year}</span>
        </h1>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            tabIndex={showToday ? 0 : -1}
            className={cn('text-primary transition-opacity', showToday ? 'opacity-100' : 'pointer-events-none opacity-0')}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next month">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Settings" className="ml-1">
            <Settings />
          </Button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {labels.map((l, i) => (
          <div key={i} className="py-1">
            {l}
          </div>
        ))}
      </div>

      <div key={`${year}-${month}`} className="fade-in grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const evs = byDate.get(d.iso) ?? []
          const isSelected = d.iso === selected
          const isToday = d.iso === today
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onSelect(d.iso)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${d.iso}${evs.length ? `, ${evs.length} event${evs.length > 1 ? 's' : ''}` : ''}`}
              className={cn(
                'relative mx-auto flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-xl text-[13px] tabular-nums outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-90',
                isSelected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'hover:bg-muted',
                !isSelected && isToday && 'bg-primary/10 font-semibold text-primary',
                !isSelected && !d.inMonth && 'text-muted-foreground/45',
              )}
            >
              <span className="-translate-y-[2px]">{d.day}</span>
              {evs.length > 0 && (
                <span className="absolute bottom-[5px] flex gap-[3px]">
                  {evs.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        'h-1 w-1 rounded-full',
                        isSelected
                          ? 'bg-primary-foreground/85'
                          : e.done
                            ? 'bg-muted-foreground/35'
                            : startOf(e) < now
                              ? 'bg-destructive'
                              : 'bg-primary',
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
