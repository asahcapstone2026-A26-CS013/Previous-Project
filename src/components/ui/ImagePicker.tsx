import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Avatar } from './Display'
import { Button } from './Button'
import { useToast } from '../../context/ToastContext'
import { resizeImage } from '../../utils/image'

interface ImagePickerProps {
  value: string
  onChange: (value: string) => void
  name: string
  maxSide?: number
  shape?: 'round' | 'square'
  label?: string
}

export function ImagePicker(props: ImagePickerProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [working, setWorking] = useState(false)
  const maxSide = props.maxSide || 320
  const square = props.shape === 'square'

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    setWorking(true)
    try {
      props.onChange(await resizeImage(file, maxSide))
    } catch (failure) {
      toast.error((failure as Error).message)
    } finally {
      setWorking(false)
    }
  }

  function choose() {
    inputRef.current?.click()
  }

  function clear() {
    props.onChange('')
  }

  return (
    <div className="flex items-center gap-4">
      {square ? (
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-sea-100 text-sea-400">
          {props.value ? <img src={props.value} alt={props.name} className="size-full object-cover" /> : <Camera className="size-6" />}
        </div>
      ) : (
        <Avatar name={props.name || '?'} src={props.value} size={80} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={working} icon={<Camera className="size-4" />} onClick={choose}>
          {props.label || 'Pilih foto'}
        </Button>
        {props.value ? (
          <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={clear}>
            Hapus
          </Button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
    </div>
  )
}
