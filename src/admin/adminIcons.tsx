import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>{children}</svg>
}

const stroke = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.8 } as const

export function ChevronLeftIcon(props: IconProps) { return <Icon {...props}><path d="m15 6-6 6 6 6" {...stroke} /></Icon> }
export function SearchIcon(props: IconProps) { return <Icon {...props}><circle cx="11" cy="11" r="6.5" {...stroke} /><path d="m16 16 4 4" {...stroke} /></Icon> }
export function ClockIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 7.5V12l3 2" {...stroke} /></Icon> }
export function LinkIcon(props: IconProps) { return <Icon {...props}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...stroke} /></Icon> }
export function DownloadIcon(props: IconProps) { return <Icon {...props}><path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" {...stroke} /></Icon> }
export function SortIcon(props: IconProps) { return <Icon {...props}><path d="M7 5v14m0 0-3-3m3 3 3-3M17 19V5m0 0-3 3m3-3 3 3" {...stroke} /></Icon> }
export function MessageIcon(props: IconProps) { return <Icon {...props}><path d="M5 5h14v10H9l-4 4V5Z" {...stroke} /></Icon> }
export function InfoIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="8.5" {...stroke} /><path d="M12 10.5v5M12 7.8v.1" {...stroke} /></Icon> }
