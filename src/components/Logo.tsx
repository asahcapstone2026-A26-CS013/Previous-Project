import { Fish } from 'lucide-react'
import { useBusiness } from '../context/BusinessContext'

export function Logo(props: { tone?: 'light' | 'dark'; compact?: boolean }) {
  const { business } = useBusiness()
  const light = props.tone === 'light'

  return (
    <div className="flex items-center gap-3">
      {business.logo ? (
        <img src={business.logo} alt={business.name} className="size-10 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-teal-600 text-sea-950 shadow-lg shadow-teal-500/30">
          <Fish className="size-5" strokeWidth={2.4} />
        </span>
      )}
      {props.compact ? null : <span className={'font-display text-lg font-semibold leading-tight ' + (light ? 'text-white' : 'text-sea-950')}>{business.name}</span>}
    </div>
  )
}
