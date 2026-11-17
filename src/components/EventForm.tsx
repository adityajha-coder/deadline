import { useEffect, useRef, useState, type FormEvent } from 'react'
import { smartDefaultTime, startOf } from '@/lib/dates'
import { offsetLabel } from '@/lib/reminders'
import type { DeadlineEvent } from '@/lib/types'
import type { EventInput } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Trash } from '@/components/Icons'

interface Props {
  editing: DeadlineEvent | null
  defaultDate: string
  defaultTime: string
  offsets: number[]
  onSave: (input: EventInput) => void
  onDelete: (ev: DeadlineEvent) => void
  onCancel: () => void
}

export function EventForm({ editing, defaultDate, defaultTime, offsets, onSave, onDelete, onCancel }: Props) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [date, setDate] = useState(editing?.date ?? defaultDate)
  const [time, setTime] = useState(editing?.time ?? smartDefaultTime(defaultDate, defaultTime))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  const valid = title.trim().length > 0 && !!date && !!time
  // Only nag about the past once the user has started filling the form in.
  const inPast = title.trim().length > 0 && !!date && !!time && startOf({ date, time }) <= Date.now()
  // Only list reminders that can still fire for the chosen date and time.
  const upcoming =
    date && time
      ? [...offsets]
          .filter((o) => startOf({ date, time }) - o * 60_000 > Date.now())
          .sort((a, b) => b - a)
          .map(offsetLabel)
      : []

  let hint = 'No reminders are on — turn some on in settings.'
  if (inPast) hint = 'This time has already passed, so no reminders will fire.'
  else if (upcoming.length) hint = `You'll be reminded ${upcoming.join(', ')} before.`
  else if (offsets.length) hint = 'The reminder times for this slot have already passed.'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) onSave({ title, date, time, notes })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's due?"
          maxLength={120}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          maxLength={300}
        />
      </div>

      <p className={inPast ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{hint}</p>

      <div className="flex items-center gap-2 pt-1">
        {editing && (
          <Button variant="destructive" size="default" onClick={() => onDelete(editing)} aria-label="Delete event">
            <Trash /> Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {editing ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </form>
  )
}
