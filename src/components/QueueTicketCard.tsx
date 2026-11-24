import { Clock, Hourglass, Megaphone } from 'lucide-react'
import { Badge } from './ui/Display'
import { TICKET_STATUS } from '../utils/labels'
import type { QueueState } from '../types'

/** Kartu nomor antrean pelanggan, dipakai di beranda dan halaman antrean. */
export function QueueTicketCard(props: { state: QueueState }) {
  const mine = props.state.mine
  if (!mine) return null
  const status = TICKET_STATUS[mine.status]
  const called = mine.status === 'dipanggil'

  return (
    <div className={'relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8 ' + (called ? 'bg-coral-500' : 'bg-sea-900')}>
      <div className="scales absolute inset-0" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Nomor Anda</p>
          <p className={'font-display text-8xl font-semibold leading-none sm:text-9xl ' + (called ? 'animate-pulse' : '')}>{mine.number}</p>
        </div>
        <div className="grid min-w-52 gap-3">
          {called ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold">
              <Megaphone className="size-5" />
              Silakan menuju petugas
            </div>
          ) : mine.status === 'menunggu' ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <Hourglass className="size-5 text-teal-300" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Posisi</p>
                  <p className="font-display text-xl font-semibold">Urutan ke-{mine.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <Clock className="size-5 text-teal-300" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Estimasi tunggu</p>
                  <p className="font-display text-xl font-semibold">{mine.estimateMinutes > 0 ? '± ' + mine.estimateMinutes + ' menit' : 'Segera'}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
