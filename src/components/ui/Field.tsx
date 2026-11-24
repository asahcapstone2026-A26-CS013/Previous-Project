import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const CONTROL =
  'w-full rounded-xl border border-sea-200 bg-white px-3.5 text-sm text-sea-950 placeholder:text-sea-400 transition focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/15 disabled:bg-sea-50 disabled:text-sea-500'

export function Field(props: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={'block ' + (props.className || '')}>
      <span className="mb-1.5 block text-[13px] font-semibold text-sea-800">{props.label}</span>
      {props.children}
      {props.hint ? <span className="mt-1 block text-xs text-sea-500">{props.hint}</span> : null}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={CONTROL + ' h-11 ' + className} {...rest} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return <textarea className={CONTROL + ' min-h-24 py-3 ' + className} {...rest} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select className={CONTROL + ' h-11 appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10 ' + className} style={{ backgroundImage: SELECT_ARROW }} {...rest}>
      {children}
    </select>
  )
}

const SELECT_ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23327891' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"

export function Toggle(props: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  function flip() {
    props.onChange(!props.checked)
  }

  return (
    <button type="button" role="switch" aria-checked={props.checked} onClick={flip} className="flex w-full items-center justify-between gap-4 rounded-xl border border-sea-200 bg-white px-3.5 py-3 text-left">
      <span className="text-sm font-semibold text-sea-800">{props.label}</span>
      <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (props.checked ? 'bg-teal-500' : 'bg-sea-200')}>
        <span className={'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ' + (props.checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}
