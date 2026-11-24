import { Link } from 'react-router-dom'
import { ArrowRight, Bell, Bot, Fish, ListOrdered, MapPin, Ship } from 'lucide-react'
import { Badge, Card, Spinner } from '../../components/ui/Display'
import { QueueTicketCard } from '../../components/QueueTicketCard'
import { FishThumb } from '../../components/FishThumb'
import { useAuth } from '../../context/AuthContext'
import { useLoad } from '../../hooks/useLoad'
import { fishService, notificationService, queueService, voyageService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import { dateTime, rupiah } from '../../utils/format'
import { VOYAGE_STATUS } from '../../utils/labels'
import { hasActiveTicket } from './QueuePage'

const SHORTCUTS = [
  { to: '/katalog', label: 'Katalog', icon: Fish },
  { to: '/antrean', label: 'Antrean', icon: ListOrdered },
  { to: '/lokasi', label: 'Lokasi', icon: MapPin },
  { to: '/asisten', label: 'Asisten', icon: Bot },
]

export function HomePage() {
  const auth = useAuth()
  const queue = useLoad(queueService.state, [], POLL_INTERVAL_MS)
  const voyages = useLoad(voyageService.list, [])
  const fishes = useLoad(fishService.list, [], 30000)
  const notices = useLoad(notificationService.list, [], 30000)

  const upcoming = (voyages.data || []).filter(function (voyage) {
    return voyage.status !== 'selesai'
  })
  const next = upcoming.length ? upcoming[upcoming.length - 1] : undefined
  const latest = (notices.data ? notices.data.data : []).slice(0, 3)
  const sessionOpen = queue.data && queue.data.session && queue.data.session.status === 'buka'

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-teal-700">Selamat datang</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">{auth.user?.username}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {queue.loading ? (
          <Card>
            <Spinner />
          </Card>
        ) : queue.data && hasActiveTicket(queue.data) ? (
          <QueueTicketCard state={queue.data} />
        ) : (
          <Link to="/antrean" className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-[2rem] bg-sea-900 p-7 text-white">
            <div className="scales absolute inset-0" />
            <div className="relative flex items-center justify-between">
              <Badge tone={sessionOpen ? 'success' : 'neutral'}>{sessionOpen ? 'Antrean dibuka' : 'Antrean ditutup'}</Badge>
              <ListOrdered className="size-6 text-teal-300" />
            </div>
            <div className="relative flex items-end justify-between">
              <p className="font-display text-4xl font-semibold leading-tight">Ambil nomor antrean</p>
              <span className="grid size-12 place-items-center rounded-full bg-coral-500 transition group-hover:translate-x-1">
                <ArrowRight className="size-5" />
              </span>
            </div>
          </Link>
        )}

        <Card className="flex flex-col justify-between">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-500">
            <Ship className="size-4" />
            Kapal berikutnya
          </div>
          {next ? (
            <div>
              <Badge tone={VOYAGE_STATUS[next.status].tone}>{VOYAGE_STATUS[next.status].label}</Badge>
              <p className="mt-3 font-display text-2xl font-semibold leading-tight">{next.name}</p>
              <p className="mt-2 text-sm text-sea-600">Tiba {dateTime(next.arrivalAt)}</p>
              <p className="text-sm text-sea-600">Estimasi tangkapan {next.estimatedTons} ton</p>
            </div>
          ) : (
            <p className="font-display text-xl text-sea-400">Belum ada jadwal</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SHORTCUTS.map(function (item) {
          return (
            <Link key={item.to} to={item.to} className="flex flex-col items-center gap-2 rounded-3xl border border-sea-100 bg-white px-2 py-4 text-center text-xs font-bold text-sea-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:text-sm">
              <span className="grid size-11 place-items-center rounded-2xl bg-teal-100 text-teal-700">
                <item.icon className="size-5" />
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">Harga hari ini</h2>
          <Link to="/katalog" className="text-sm font-bold text-teal-700 hover:underline">
            Lihat katalog
          </Link>
        </div>
        <div className="scroll-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {(fishes.data || []).slice(0, 8).map(function (fish) {
            return (
              <div key={fish.id} className="w-40 shrink-0 overflow-hidden rounded-3xl border border-sea-100 bg-white shadow-sm">
                <FishThumb src={fish.image} name={fish.name} className="aspect-[4/3] w-full" />
                <div className="p-3.5">
                  <p className="truncate font-bold">{fish.name}</p>
                  <p className="text-sm font-semibold text-teal-700">{rupiah(fish.price)}/kg</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {latest.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">Terbaru</h2>
            <Link to="/notifikasi" className="text-sm font-bold text-teal-700 hover:underline">
              Semua notifikasi
            </Link>
          </div>
          <div className="space-y-3">
            {latest.map(function (item) {
              return (
                <Card key={item.id} className="flex items-start gap-4 !p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sea-100 text-sea-600">
                    <Bell className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold">{item.title}</p>
                    <p className="text-sm text-sea-600">{item.message}</p>
                    <p className="mt-1 text-xs text-sea-400">{dateTime(item.createdAt)}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
