import { cn } from '@/lib/utils'

interface Props<T extends string | number> {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
  label: string
}

/** Small pill switcher with a sliding highlight. */
export function Segmented<T extends string | number>({ value, onChange, options, className, label }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('relative grid rounded-lg bg-muted p-0.5', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-md bg-card shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-10 cursor-pointer rounded-md px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40',
            o.value === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
