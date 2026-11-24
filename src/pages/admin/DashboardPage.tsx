import { Link } from 'react-router-dom'
import { ArrowRight, Boxes, ClipboardList, ListOrdered, Wallet } from 'lucide-react'
import { Badge, Card, PageHeader, StatTile } from '../../components/ui/Display'
import { useAuth } from '../../context/AuthContext'
import { useLoad } from '../../hooks/useLoad'
import { fishService, orderService, queueService, saleService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import { dateTime, rupiah, todayInput } from '../../utils/format'
import { ORDER_STATUS } from '../../utils/labels'

const LOW_STOCK_KG = 50

export function DashboardPage() {
  const auth = useAuth()
  const canOrders = auth.can('pesanan')
  const canQueue = auth.can('antrean')
  const canSales = auth.can('transaksi')
  const canFish = auth.can('ikan')

  const orders = useLoad(
    function () {
      return canOrders ? orderService.all() : Promise.resolve([])
    },
    [canOrders],
    POLL_INTERVAL_MS,
  )
  const board = useLoad(
    function () {
      return canQueue ? queueService.board() : Promise.resolve(null)
    },
    [canQueue],
    POLL_INTERVAL_MS,
  )
  const sales = useLoad(
    function () {
      return canSales ? saleService.list(todayInput().slice(0, 7)) : Promise.resolve([])
    },
    [canSales],
  )
  const fishes = useLoad(
    function () {
      return canFish ? fishService.list() : Promise.resolve([])
    },
    [canFish],
  )

  const pending = (orders.data || []).filter(function (order) {
    return order.status === 'menunggu'
  })
  const waiting = board.data
    ? board.data.tickets.filter(function (ticket) {
        return ticket.status === 'menunggu'
      }).length
    : 0
  const today = todayInput()
  const salesToday = (sales.data || [])
    .filter(function (sale) {
      return sale.date === today
    })
    .reduce(function (sum, sale) {
      return sum + sale.total
    }, 0)
  const lowStock = (fishes.data || []).filter(function (fish) {
    return fish.active && fish.stock <= LOW_STOCK_KG
  })

  return (
    <div>
      <PageHeader title={'Halo, ' + (auth.user ? auth.user.username : '')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canOrders ? <StatTile tone="coral" label="Pesanan baru" value={String(pending.length)} icon={<ClipboardList className="size-4" />} /> : null}
        {canQueue ? <StatTile tone="dark" label="Antrean menunggu" value={String(waiting)} icon={<ListOrdered className="size-4" />} /> : null}
        {canSales ? <StatTile label="Penjualan hari ini" value={rupiah(salesToday)} icon={<Wallet className="size-4" />} /> : null}
        {canFish ? <StatTile label="Stok menipis" value={String(lowStock.length)} icon={<Boxes className="size-4" />} /> : null}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {canOrders ? (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Pesanan terbaru</h2>
              <Link to="/admin/pesanan" className="flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline">
                Semua <ArrowRight className="size-4" />
              </Link>
            </div>
            {(orders.data || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-sea-400">Belum ada pesanan</p>
            ) : (
              <div className="divide-y divide-sea-100">
                {(orders.data || []).slice(0, 5).map(function (order) {
                  const status = ORDER_STATUS[order.status]
                  return (
                    <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{order.customerName}</p>
                        <p className="text-xs text-sea-400">{dateTime(order.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-sm font-bold">{rupiah(order.total)}</p>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        ) : null}

        {canFish ? (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Stok menipis</h2>
              <Link to="/admin/ikan" className="flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline">
                Kelola <ArrowRight className="size-4" />
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-sea-400">Semua stok aman</p>
            ) : (
              <div className="divide-y divide-sea-100">
                {lowStock.map(function (fish) {
                  return (
                    <div key={fish.id} className="flex items-center justify-between py-3">
                      <p className="font-bold">{fish.name}</p>
                      <Badge tone={fish.stock <= 0 ? 'danger' : 'warning'}>{fish.stock} kg</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  )
}
