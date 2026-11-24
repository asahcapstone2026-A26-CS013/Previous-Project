import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  block?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-sea-900 text-white hover:bg-sea-800 shadow-sm shadow-sea-950/20',
  accent: 'bg-coral-500 text-white hover:bg-coral-600 shadow-sm shadow-coral-500/30',
  secondary: 'bg-white text-sea-900 ring-1 ring-sea-200 hover:bg-sea-50',
  ghost: 'text-sea-700 hover:bg-sea-100',
  danger: 'bg-white text-coral-600 ring-1 ring-coral-200 hover:bg-coral-50',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-6 text-base gap-2.5',
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', loading = false, icon, block = false, className = '', children, disabled, type = 'button', ...rest } = props
  const width = block ? 'w-full' : ''
  const classes = [
    'inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    width,
    className,
  ].join(' ')

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
