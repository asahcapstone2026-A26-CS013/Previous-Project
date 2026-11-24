import type { ReactNode } from 'react'
import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { Tone } from '../../utils/labels'
import { initials } from '../../utils/format'

const TONES: Record<Tone, string> = {
  neutral: 'bg-sea-100 text-sea-700',
  info: 'bg-sea-200/70 text-sea-800',
  success: 'bg-teal-100 text-teal-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-coral-100 text-coral-700',
}

export function Badge(props: { tone?: Tone; children: ReactNode }) {
  const tone = props.tone || 'neutral'
  return <span className={'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ' + TONES[tone]}>{props.children}</span>
}

export function Card(props: { children: ReactNode; className?: string }) {
  return <div className={'rounded-3xl border border-sea-100 bg-white p-5 shadow-sm shadow-sea-900/5 sm:p-6 ' + (props.className || '')}>{props.children}</div>
}

export function Spinner(props: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sea-500">
      <LoaderCircle className="size-6 animate-spin" />
      {props.label ? <span className="text-sm font-medium">{props.label}</span> : null}
    </div>
  )
}

export function EmptyState(props: { title: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-sea-200 bg-white/60 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-sea-100 text-sea-500">{props.icon || <Inbox className="size-6" />}</div>
      <p className="font-display text-lg font-semibold text-sea-800">{props.title}</p>
      {props.action}
    </div>
  )
}

export function ErrorState(props: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-coral-200 bg-coral-50 px-6 py-10 text-center">
      <TriangleAlert className="size-7 text-coral-500" />
      <p className="max-w-md text-sm font-medium text-coral-700">{props.message}</p>
      {props.onRetry ? (
        <button type="button" onClick={props.onRetry} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-coral-700 ring-1 ring-coral-200">
          Coba lagi
        </button>
      ) : null}
    </div>
  )
}

export function Avatar(props: { name: string; src?: string; size?: number; className?: string }) {
  const size = props.size || 40
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) }
  if (props.src) {
    return <img src={props.src} alt={props.name} style={style} className={'shrink-0 rounded-full object-cover ring-2 ring-white ' + (props.className || '')} />
  }
  return (
    <span style={style} className={'grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-sea-600 font-bold text-white ring-2 ring-white ' + (props.className || '')}>
      {initials(props.name)}
    </span>
  )
}

export function PageHeader(props: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{props.title}</h1>
        {props.subtitle ? <p className="mt-1 text-sm text-sea-600">{props.subtitle}</p> : null}
      </div>
      {props.actions ? <div className="flex flex-wrap items-center gap-2">{props.actions}</div> : null}
    </div>
  )
}

export function StatTile(props: { label: string; value: string; icon: ReactNode; tone?: 'dark' | 'light' | 'coral' }) {
  const tone = props.tone || 'light'
  const surface = tone === 'dark' ? 'bg-sea-900 text-white' : tone === 'coral' ? 'bg-coral-500 text-white' : 'bg-white text-sea-950 border border-sea-100'
  const muted = tone === 'light' ? 'text-sea-500' : 'text-white/70'
  return (
    <div className={'relative overflow-hidden rounded-3xl p-5 shadow-sm ' + surface}>
      <div className={'mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ' + muted}>
        {props.icon}
        {props.label}
      </div>
      <p className="font-display text-3xl font-semibold leading-none sm:text-4xl">{props.value}</p>
    </div>
  )
}
