import { useState } from 'react'
import { Hand, Megaphone, Users, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { QueueTicketCard } from '../../components/QueueTicketCard'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { queueService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import type { QueueState } from '../../types'

export function hasActiveTicket(state: QueueState): boolean {
  const mine = state.mine
  return Boolean(mine && (mine.status === 'menunggu' || mine.status === 'dipanggil' || mine.status === 'dilewati'))
}

export function QueuePage() {
  const queue = useLoad(queueService.state, [], POLL_INTERVAL_MS)
  const { busy, run } = useAction()
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function take() {
    const result = await run(queueService.take, 'Nomor antrean berhasil diambil.')
    if (result.ok) await queue.reload()
  }

  async function cancel() {
    const result = await run(queueService.cancelMine, 'Nomor antrean dibatalkan.')
    setConfirmOpen(false)
    if (result.ok) await queue.reload()
  }

  function openConfirm() {
    setConfirmOpen(true)
  }

  function closeConfirm() {
    setConfirmOpen(false)
  }

  if (queue.loading) return <Spinner label="Memuat antrean" />
  if (queue.error || !queue.data) return <ErrorState message={queue.error || 'Antrean tidak dapat dimuat.'} onRetry={queue.reload} />

  const state = queue.data
  const sessionOpen = state.session !== null && state.session.status === 'buka'
  const active = hasActiveTicket(state)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Antrean" actions={<Badge tone={sessionOpen ? 'success' : 'neutral'}>{sessionOpen ? 'Sesi dibuka' : 'Sesi ditutup'}</Badge>} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-500">
            <Megaphone className="size-4" />
            Sedang dipanggil
          </div>
          <p className="font-display text-5xl font-semibold">{state.nowServing || '-'}</p>
        </Card>
        <Card className="!p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-500">
            <Users className="size-4" />
            Menunggu
          </div>
          <p className="font-display text-5xl font-semibold">{state.waiting}</p>
        </Card>
      </div>

      {active ? (
        <>
          <QueueTicketCard state={state} />
          {state.mine && state.mine.status === 'menunggu' ? (
            <Button variant="danger" block icon={<X className="size-4" />} onClick={openConfirm}>
              Batalkan nomor
            </Button>
          ) : null}
        </>
      ) : (
        <Card className="flex flex-col items-center gap-5 py-12 text-center">
          <div className={'grid size-20 place-items-center rounded-full ' + (sessionOpen ? 'bg-teal-100 text-teal-700' : 'bg-sea-100 text-sea-400')}>
            <Hand className="size-9" />
          </div>
          <p className="font-display text-2xl font-semibold">{sessionOpen ? 'Antrean sedang dibuka' : 'Sesi antrean belum dibuka'}</p>
          <Button size="lg" variant="accent" disabled={!sessionOpen} loading={busy} onClick={take} className="min-w-56">
            Ambil nomor
          </Button>
        </Card>
      )}

      <ConfirmDialog open={confirmOpen} title="Batalkan nomor antrean" message="Nomor Anda akan dihapus dari antrean dan tidak dapat dikembalikan." confirmLabel="Ya, batalkan" busy={busy} onConfirm={cancel} onClose={closeConfirm} />
    </div>
  )
}
