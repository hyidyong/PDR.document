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
export function LockIcon(props: IconProps) { return <Icon {...props}><rect height="9" rx="2" width="14" x="5" y="10.5" {...stroke} /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...stroke} /></Icon> }
export function ArrowRightIcon(props: IconProps) { return <Icon {...props}><path d="M5 12h14m0 0-5-5m5 5-5 5" {...stroke} /></Icon> }
export function UndoIcon(props: IconProps) { return <Icon {...props}><path d="M9 14 4 9l5-5" {...stroke} /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" {...stroke} /></Icon> }
export function CloseIcon(props: IconProps) { return <Icon {...props}><path d="M6 6l12 12M18 6 6 18" {...stroke} /></Icon> }
export function FolderIcon(props: IconProps) { return <Icon {...props}><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" {...stroke} /></Icon> }
export function ArchiveIcon(props: IconProps) { return <Icon {...props}><path d="M6.5 3.5h7l4 4v13h-11v-17Z" {...stroke} /><path d="M10 4v2m0 2v2m0 2v2m-1 1.5h2v3H9v-3Z" {...stroke} /></Icon> }
export function EllipsisIcon(props: IconProps) { return <Icon {...props}><path d="M6 12h.01M12 12h.01M18 12h.01" {...stroke} strokeWidth={2.6} /></Icon> }
export function TrashIcon(props: IconProps) { return <Icon {...props}><path d="M4.5 7h15M10 11v5m4-5v5M6.5 7l.8 11.5a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5L17.5 7M9.5 7V4.5h5V7" {...stroke} /></Icon> }
export function PlusIcon(props: IconProps) { return <Icon {...props}><path d="M12 5v14M5 12h14" {...stroke} /></Icon> }
export function CopyIcon(props: IconProps) { return <Icon {...props}><rect height="11" rx="2" width="11" x="9" y="9" {...stroke} /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" {...stroke} /></Icon> }
export function UsersIcon(props: IconProps) { return <Icon {...props}><circle cx="9" cy="8.5" r="3.5" {...stroke} /><path d="M3 19.5a6 6 0 0 1 12 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2a6 6 0 0 1 3 5.3" {...stroke} /></Icon> }
export function CalendarIcon(props: IconProps) { return <Icon {...props}><rect height="15" rx="2" width="17" x="3.5" y="5" {...stroke} /><path d="M3.5 10h17M8 3v4m8-4v4" {...stroke} /></Icon> }
export function MailIcon(props: IconProps) { return <Icon {...props}><rect height="14" rx="2" width="18" x="3" y="5" {...stroke} /><path d="m4 7 8 6 8-6" {...stroke} /></Icon> }
export function ClipboardIcon(props: IconProps) { return <Icon {...props}><path d="M9 4.5h6v3H9v-3Z" {...stroke} /><path d="M15 5.5h2.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V7a1.5 1.5 0 0 1 1.5-1.5H9" {...stroke} /></Icon> }
