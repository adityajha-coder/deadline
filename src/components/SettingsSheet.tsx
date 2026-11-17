import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { OFFSET_OPTIONS, type Settings } from '@/lib/types'
import { exportData, importData, saveSettings } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Bell, Check, Download, Upload } from '@/components/Icons'

interface Props {
  settings: Settings
  notify: (message: string) => void
}

export function SettingsSheet({ settings, notify }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.notifications?.getPermissionLevel) {
      chrome.notifications.getPermissionLevel((level) => setBlocked(level !== 'granted'))
    }
  }, [])

  const toggleOffset = (minutes: number) => {
    const on = settings.offsets.includes(minutes)
    const next = on ? settings.offsets.filter((o) => o !== minutes) : [...settings.offsets, minutes]
    void saveSettings({ offsets: next.sort((a, b) => b - a) })
  }

  const sendTest = () => {
    if (typeof chrome === 'undefined' || !chrome.notifications?.create) {
      notify('Notifications only work inside the extension')
      return
    }
    chrome.notifications.create(`test:${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Reminders are working',
      message: 'This is what a deadline reminder looks like.',
    })
  }

  const doExport = async () => {
    const blob = new Blob([await exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deadlines-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const n = await importData(await file.text())
      notify(`Imported ${n} event${n === 1 ? '' : 's'}`)
    } catch {
      notify("Couldn't read that file")
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <section>
        <Label>Remind me before</Label>
        <div className="grid grid-cols-4 gap-2">
          {OFFSET_OPTIONS.map((o) => {
            const on = settings.offsets.includes(o.minutes)
            return (
              <button
                key={o.minutes}
                type="button"
                aria-pressed={on}
                onClick={() => toggleOffset(o.minutes)}
                className={cn(
                  'flex h-10 cursor-pointer items-center justify-center gap-1 rounded-lg border text-[13px] outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-95',
                  on
                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {on && <Check width={13} height={13} strokeWidth={2.5} className="fade-in" />}
                {o.label}
              </button>
            )
          })}
        </div>
        {settings.offsets.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No reminders will be sent.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="default-time">Default time</Label>
          <Input
            id="default-time"
            type="time"
            value={settings.defaultTime}
            onChange={(e) => e.target.value && void saveSettings({ defaultTime: e.target.value })}
          />
        </div>
        <div>
          <Label>Week starts on</Label>
          <Segmented
            label="Week starts on"
            value={settings.weekStart}
            onChange={(v) => void saveSettings({ weekStart: v })}
            options={[
              { value: 0, label: 'Sun' },
              { value: 1, label: 'Mon' },
            ]}
            className="h-10 [&>button]:py-0"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {blocked ? 'Notifications look blocked in your system or Chrome settings.' : 'Check that pop-ups reach you.'}
          </p>
          <Button variant="outline" size="sm" onClick={sendTest}>
            <Bell width={14} height={14} /> Test
          </Button>
        </div>
      </section>

      <section className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">Stored on this device only.</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={doExport}>
            <Download width={14} height={14} /> Export
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload width={14} height={14} /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void doImport(e.target.files?.[0])}
          />
        </div>
      </section>
    </div>
  )
}
