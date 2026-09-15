import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const ArrowIcon = (props: IconProps) => <svg {...base} {...props}><path d="M5 12h14M14 7l5 5-5 5" /></svg>
export const PlayIcon = (props: IconProps) => <svg {...base} {...props}><path d="m8 5 11 7-11 7Z" /></svg>
export const SignalIcon = (props: IconProps) => <svg {...base} {...props}><path d="M5 19v-3M10 19v-7M15 19V8M20 19V4" /></svg>
export const DatabaseIcon = (props: IconProps) => <svg {...base} {...props}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>
export const ClockIcon = (props: IconProps) => <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
export const HintIcon = (props: IconProps) => <svg {...base} {...props}><path d="M9 18h6M10 22h4M8.4 14.5a7 7 0 1 1 7.2 0c-.9.6-1.6 1.5-1.6 2.5h-4c0-1-.7-1.9-1.6-2.5Z" /></svg>
export const RotateIcon = (props: IconProps) => <svg {...base} {...props}><path d="M20 7h-5V2M19 7a8 8 0 1 0 1 8" /></svg>
export const TrophyIcon = (props: IconProps) => <svg {...base} {...props}><path d="M8 4h8v4a4 4 0 0 1-8 0V4ZM9 19h6M12 12v7M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4" /></svg>
export const ExternalIcon = (props: IconProps) => <svg {...base} {...props}><path d="M14 5h5v5M19 5l-9 9M18 13v6H5V6h6" /></svg>
