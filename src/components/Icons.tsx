import type { SVGProps } from 'react'

function Icon({ d, ...rest }: Omit<SVGProps<SVGSVGElement>, 'd'> & { d: string | readonly string[] }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={16}
      height={16}
      aria-hidden="true"
      {...rest}
    >
      {paths.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  )
}

type P = Omit<SVGProps<SVGSVGElement>, 'd'>

export const ChevronLeft = (p: P) => <Icon d="m15 18-6-6 6-6" {...p} />
export const ChevronRight = (p: P) => <Icon d="m9 18 6-6-6-6" {...p} />
export const Plus = (p: P) => <Icon d={['M5 12h14', 'M12 5v14']} {...p} />
export const Check = (p: P) => <Icon d="M20 6 9 17l-5-5" {...p} />
export const Trash = (p: P) => (
  <Icon d={['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6']} {...p} />
)
export const Settings = (p: P) => (
  <Icon
    d={[
      'M4 6h10', 'M18 6h2', 'M4 12h2', 'M10 12h10', 'M4 18h12', 'M20 18h0',
      'M16 4v4', 'M8 10v4', 'M18 16v4',
    ]}
    {...p}
  />
)
export const CalendarCheck = (p: P) => (
  <Icon
    d={['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm9 16 2 2 4-4']}
    {...p}
  />
)
export const Bell = (p: P) => (
  <Icon d={['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0']} {...p} />
)
export const Download = (p: P) => (
  <Icon d={['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14']} {...p} />
)
export const Upload = (p: P) => (
  <Icon d={['M12 15V3', 'm7 8 5-5 5 5', 'M5 21h14']} {...p} />
)
