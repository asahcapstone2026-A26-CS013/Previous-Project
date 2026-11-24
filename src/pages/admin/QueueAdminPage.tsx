import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Check, DoorClosed, DoorOpen, Megaphone, ReceiptText, RotateCcw, SkipForward, UserPlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, TextInput } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { queueService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import { timeOnly } from '../../utils/format'
import { TICKET_STATUS } from '../../utils/labels'
import type { Ticket } from '../../types'

type TicketAction = 'call' | 'skip' | 'done' | 'cancel'

function WalkInForm(props: { onSaved: () => Promise<void>; onClose: () => void }) {
  const { busy, run } = useAction()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Isi nama pelanggan minimal 2 huruf.')
      return
    }
    setError('')
    const result = await run(function () {
      return queueService.walkIn(name.trim(), phone.trim())
    }, 'Pelanggan didaftarkan ke antrean.')
    if (result.ok) {
      await props.onSaved()
      props.onClose()
    }
  }

  function onName(event: React.ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function onPhone(event: React.ChangeEvent<HTMLInputElement>) {
    setPhone(event.target.value)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Nama pelanggan">
        <TextInput value={name} onChange={onName} placeholder="Nama" autoFocus />
      </Field>
      <Field label="Nomor telepon (opsional)">
        <TextInput value={phone} onChange={onPhone} type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" />
      </Field>
      {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={props.onClose}>
          Batal
        </Button>
        <Button type="submit" loading={busy}>
          Daftarkan
        </Button>
      </div>
    </form>
  )
}

export function QueueAdminPage() {
  const navigate = useNavigate()
  const board = useLoad(queueService.board, [], POLL_INTERVAL_MS)
  const { busy, run } = useAction()
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  async function sessionAction(action: () => Promise<void>, message: string) {
    const result = await run(action, message)
    if (result.ok) await board.reload()
  }

  function openSession() {
    return sessionAction(queueService.openSession, 'Sesi antrean dibuka.')
  }

  function closeSession() {
    return sessionAction(queueService.closeSession, 'Sesi antrean ditutup.')
  }

  async function resetSession() {
    await sessionAction(queueService.resetSession, 'Antrean direset.')
    setResetOpen(false)
  }

  function ticketAction(ticket: Ticket, action: TicketAction, message: string) {
    return async function () {
      const result = await run(function () {
        return queueService.act(ticket.id, action)
      }, message)
      if (result.ok) await board.reload()
    }
  }

  function recordSale(ticket: Ticket) {
    return function () {
      navigate('/admin/transaksi?ticket=' + ticket.id + '&name=' + encodeURIComponent(ticket.name) + '&phone=' + encodeURIComponent(ticket.phone))
    }
  }

  function toggleWalkIn() {
    setWalkInOpen(!walkInOpen)
  }

  function toggleReset() {
    setResetOpen(!resetOpen)
  }

  if (board.loading) return <Spinner label="Memuat antrean" />
  if (board.error || !board.data) return <ErrorState message={board.error || 'Antrean tidak dapat dimuat.'} onRetry={board.reload} />

  const session = board.data.session
  const isOpen = session !== null && session.status === 'buka'
  const tickets = board.data.tickets
  const active = tickets.filter(function (ticket) {
    return ticket.status === 'menunggu' || ticket.status === 'dipanggil' || ticket.status === 'dilewati'
  })
  const finished = tickets.length - active.length

  return (
    <div>
      <PageHeader
        title="Antrean"
        actions={
          <>
            {isOpen ? (
              <>
                <Button variant="secondary" icon={<UserPlus className="size-4" />} onClick={toggleWalkIn}>
                  Daftarkan pelanggan
                </Button>
                <Button variant="accent" loading={busy} icon={<DoorClosed className="size-4" />} onClick={closeSession}>
                  Tutup sesi
                </Button>
              </>
            ) : (
              <Button variant="accent" loading={busy} icon={<DoorOpen className="size-4" />} onClick={openSession}>
                Buka sesi
              </Button>
            )}
            {session ? (
              <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={toggleReset}>
                Reset
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="!p-4 sm:!p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sea-500">Status</p>
          <div className="mt-2">
            <Badge tone={isOpen ? 'success' : 'neutral'}>{isOpen ? 'Dibuka' : session ? 'Ditutup' : 'Belum ada sesi'}</Badge>
          </div>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sea-500">Antre</p>
          <p className="font-display text-4xl font-semibold">{active.length}</p>
        </Card>
        <Card className="!p-4 sm:!p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sea-500">Selesai</p>
          <p className="font-display text-4xl font-semibold">{finished}</p>
        </Card>
      </div>

      {active.length === 0 ? (
        <EmptyState title={session ? 'Belum ada pelanggan dalam antrean' : 'Buka sesi untuk memulai antrean'} />
      ) : (
        <div className="space-y-3">
          {active.map(function (ticket) {
            const status = TICKET_STATUS[ticket.status]
            const called = ticket.status === 'dipanggil'
            return (
              <Card key={ticket.id} className={'flex flex-wrap items-center gap-4 !p-4 sm:!p-5 ' + (called ? 'border-coral-300 bg-coral-50/50' : '')}>
                <span className={'grid size-16 shrink-0 place-items-center rounded-2xl font-display text-3xl font-semibold ' + (called ? 'bg-coral-500 text-white' : 'bg-sea-900 text-white')}>{ticket.number}</span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-lg font-bold">{ticket.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sea-500">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <span>Daftar {timeOnly(ticket.createdAt)}</span>
                    {ticket.walkIn ? <Badge>Langsung</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ticket.status !== 'dipanggil' ? (
                    <Button size="sm" icon={<Megaphone className="size-4" />} loading={busy} onClick={ticketAction(ticket, 'call', 'Nomor ' + ticket.number + ' dipanggil.')}>
                      Panggil
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="accent" icon={<ReceiptText className="size-4" />} onClick={recordSale(ticket)}>
                        Catat transaksi
                      </Button>
                      <Button size="sm" variant="secondary" icon={<Check className="size-4" />} loading={busy} onClick={ticketAction(ticket, 'done', 'Tiket diselesaikan.')}>
                        Selesai
                      </Button>
                    </>
                  )}
                  {ticket.status !== 'dilewati' ? (
                    <Button size="sm" variant="secondary" icon={<SkipForward className="size-4" />} loading={busy} onClick={ticketAction(ticket, 'skip', 'Nomor dilewati.')}>
                      Lewati
                    </Button>
                  ) : null}
                  <Button size="sm" variant="danger" aria-label="Batalkan tiket" icon={<Ban className="size-4" />} loading={busy} onClick={ticketAction(ticket, 'cancel', 'Tiket dibatalkan.')} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={walkInOpen} title="Daftarkan pelanggan" onClose={toggleWalkIn}>
        <WalkInForm onSaved={board.reload} onClose={toggleWalkIn} />
      </Modal>
      <ConfirmDialog open={resetOpen} title="Reset antrean" message="Seluruh nomor pada sesi ini akan dihapus dan sesi diakhiri." confirmLabel="Reset" busy={busy} onConfirm={resetSession} onClose={toggleReset} />
    </div>
  )
}
