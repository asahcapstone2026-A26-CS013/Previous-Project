export interface TabOption {
  value: string
  label: string
  count?: number
}

export function Tabs(props: { options: TabOption[]; value: string; onChange: (value: string) => void }) {
  function pick(value: string) {
    return function () {
      props.onChange(value)
    }
  }

  return (
    <div className="scroll-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {props.options.map(function (option) {
        const active = option.value === props.value
        return (
          <button key={option.value} type="button" onClick={pick(option.value)} aria-pressed={active} className={'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ' + (active ? 'bg-sea-900 text-white' : 'bg-white text-sea-600 ring-1 ring-sea-200 hover:bg-sea-100')}>
            {option.label}
            {option.count !== undefined ? <span className={'rounded-full px-1.5 text-xs ' + (active ? 'bg-white/20' : 'bg-sea-100')}>{option.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
