import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Bell, ClipboardList, ListOrdered, Megaphone } from 'lucide-react'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { useLoad } from '../../hooks/useLoad'
import { notificationService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import { dateTime } from '../../utils/format'

const ICONS = { pengumuman: Megaphone, pesanan: ClipboardList, antrean: ListOrdered }

export function NotificationsPage() {
  const outlet = useOutletContext<{ refreshNotifications: () => Promise<void> }>()
  const notices = useLoad(notificationService.list, [], POLL_INTERVAL_MS)
  const loaded = Boolean(notices.data)
  const unread = notices.data ? notices.data.unread : 0

  useEffect(
    function markAsRead() {
      if (!loaded || unread === 0) return
      notificationService
        .markRead()
        .then(outlet.refreshNotifications)
        .catch(function () {
          return undefined
        })
    },
    [loaded, unread, outlet],
  )

  if (notices.loading) return <Spinner label="Memuat notifikasi" />
  if (notices.error || !notices.data) return <ErrorState message={notices.error || 'Notifikasi tidak dapat dimuat.'} onRetry={notices.reload} />

  const items = notices.data.data

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifikasi" />
      {items.length === 0 ? (
        <EmptyState title="Tidak ada notifikasi" icon={<Bell className="size-6" />} />
      ) : (
        <div className="space-y-3">
          {items.map(function (item) {
            const Icon = ICONS[item.kind]
            return (
              <Card key={item.id} className={'flex items-start gap-4 !p-4 sm:!p-5 ' + (item.read ? '' : 'border-teal-300 bg-teal-50/60')}>
                <span className={'grid size-11 shrink-0 place-items-center rounded-2xl ' + (item.read ? 'bg-sea-100 text-sea-500' : 'bg-teal-400 text-sea-950')}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-sea-700">{item.message}</p>
                  <p className="mt-2 text-xs font-medium text-sea-400">{dateTime(item.createdAt)}</p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
