import { Fish as FishIcon } from 'lucide-react'

export function FishThumb(props: { src: string; name: string; className?: string }) {
  if (props.src) {
    return <img src={props.src} alt={props.name} className={'object-cover ' + (props.className || '')} />
  }
  return (
    <div className={'scales grid place-items-center bg-gradient-to-br from-sea-500 to-sea-800 text-white/80 ' + (props.className || '')}>
      <FishIcon className="size-1/3" strokeWidth={1.6} />
    </div>
  )
}
