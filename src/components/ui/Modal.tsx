import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export function Modal(props: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const { open, onClose } = props

  useEffect(
    function lockAndListen() {
      if (!open) return
      function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      return function () {
        document.removeEventListener('keydown', onKey)
        document.body.style.overflow = ''
      }
    },
    [open, onClose],
  )

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={props.title}>
      <button type="button" aria-label="Tutup" onClick={onClose} className="fixed inset-0 bg-sea-950/55 backdrop-blur-sm" />
      <div className={'rise relative flex max-h-[90dvh] w-full flex-col rounded-3xl bg-white shadow-2xl ' + (props.wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-sea-100 px-5 py-4 sm:px-6">
          <h2 className="font-display text-xl font-semibold">{props.title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-sea-500 hover:bg-sea-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-5 sm:px-6">{props.children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog(props: { open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={props.open} title={props.title} onClose={props.onClose}>
      <p className="text-sm leading-relaxed text-sea-700">{props.message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={props.onClose}>
          Batal
        </Button>
        <Button variant="accent" loading={props.busy} onClick={props.onConfirm}>
          {props.confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
