import { useState } from 'react'
import { BadgeCheck, Check, ChevronRight, ImageIcon, MessageCircle, PackageCheck, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, TextArea, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { orderService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import { dateTime, kilogram, rupiah, whatsappLink } from '../../utils/format'
import { ORDER_STATUS } from '../../utils/labels'
import type { Order, OrderStatus } from '../../types'

function ProofViewer(props: { orderId: string }) {
  const proof = useLoad(
    function () {
      return orderService.proof(props.orderId)
    },
    [props.orderId],
  )
  if (proof.loading) return <Spinner />
  if (!proof.data) return <p className="rounded-xl bg-sea-50 px-4 py-3 text-sm text-sea-500">Bukti transfer belum diunggah.</p>
  return <img src={proof.data} alt="Bukti transfer" className="max-h-96 w-full rounded-2xl border border-sea-100 object-contain" />
}

function OrderPanel(props: { order: Order; onChanged: () => Promise<void>; onClose: () => void }) {
  const { order } = props
  const { busy, run } = useAction()
  const [shipping, setShipping] = useState('0')
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState('')
  const [showProof, setShowProof] = useState(false)

  async function execute(action: () => Promise<Order>, message: string, closeAfter: boolean) {
    const result = await run(action, message)
    if (result.ok) {
      await props.onChanged()
      if (closeAfter) props.onClose()
    }
  }

  function confirmOrder() {
    const fee = Number(shipping.replace(/\D/g, '')) || 0
    return execute(function () {
      return orderService.confirm(order.id, fee)
    }, 'Pesanan dikonfirmasi.', true)
  }

  function submitReject() {
    if (reason.trim().length < 3) {
      setError('Alasan penolakan wajib diisi.')
      return Promise.resolve()
    }
    setError('')
    return execute(function () {
      return orderService.reject(order.id, reason.trim())
    }, 'Pesanan ditolak dan stok dikembalikan.', true)
  }

  function complete() {
    return execute(function () {
      return orderService.complete(order.id)
    }, 'Pesanan selesai dan dicatat sebagai transaksi.', true)
  }

  function togglePaid() {
    return execute(function () {
      return orderService.togglePaid(order.id)
    }, order.paid ? 'Pembayaran ditandai belum lunas.' : 'Pembayaran ditandai lunas.', false)
  }

  function onShipping(event: React.ChangeEvent<HTMLInputElement>) {
    setShipping(event.target.value)
  }

  function onReason(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setReason(event.target.value)
  }

  function startReject() {
    setRejecting(true)
  }

  function stopReject() {
    setRejecting(false)
    setError('')
  }

  function toggleProof() {
    setShowProof(!showProof)
  }

  const status = ORDER_STATUS[order.status]
  const message = 'Halo ' + order.customerName + ', pesanan ' + order.code + ' berstatus ' + status.label + '.'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">{order.customerName}</p>
          <p className="text-xs text-sea-500">
            {order.code} - {dateTime(order.createdAt)}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="divide-y divide-sea-100 rounded-2xl border border-sea-100">
        {order.items.map(function (item) {
          return (
            <div key={item.fishId} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-sea-500">
                  {kilogram(item.kg)} x {rupiah(item.price)}
                </p>
              </div>
              <p className="font-bold">{rupiah(item.subtotal)}</p>
            </div>
          )
        })}
        {order.shippingFee > 0 ? (
          <div className="flex justify-between px-4 py-3 text-sm">
            <p className="text-sea-600">Ongkos kirim</p>
            <p className="font-bold">{rupiah(order.shippingFee)}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between bg-sea-50 px-4 py-3">
          <p className="font-bold text-sea-700">Total</p>
          <p className="font-display text-xl font-semibold">{rupiah(order.total)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-sea-400">Pengambilan</dt>
          <dd className="font-semibold">{order.delivery === 'dermaga' ? 'Ambil di dermaga' : 'Diantar'}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-sea-400">Pembayaran</dt>
          <dd className="font-semibold">
            {order.payment === 'cod' ? 'COD' : 'Transfer ' + order.bank} {order.paid ? '(lunas)' : ''}
          </dd>
        </div>
        {order.address ? (
          <div className="col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-sea-400">Alamat</dt>
            <dd className="font-semibold">{order.address}</dd>
          </div>
        ) : null}
        {order.note ? (
          <div className="col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-sea-400">Catatan</dt>
            <dd className="font-semibold">{order.note}</dd>
          </div>
        ) : null}
      </dl>

      {order.reason ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">Alasan penolakan: {order.reason}</p> : null}

      {order.payment === 'transfer' ? (
        <div>
          <Button size="sm" variant="secondary" icon={<ImageIcon className="size-4" />} onClick={toggleProof}>
            {showProof ? 'Sembunyikan bukti' : order.hasProof ? 'Lihat bukti transfer' : 'Bukti belum ada'}
          </Button>
          {showProof ? (
            <div className="mt-3">
              <ProofViewer orderId={order.id} />
            </div>
          ) : null}
        </div>
      ) : null}

      {order.status === 'menunggu' && !rejecting ? (
        <div className="space-y-3 border-t border-sea-100 pt-5">
          {order.delivery === 'antar' ? (
            <Field label="Ongkos kirim (Rp)">
              <TextInput value={shipping} onChange={onShipping} inputMode="numeric" />
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading={busy} icon={<Check className="size-4" />} onClick={confirmOrder}>
              Konfirmasi
            </Button>
            <Button variant="danger" icon={<X className="size-4" />} onClick={startReject}>
              Tolak
            </Button>
          </div>
        </div>
      ) : null}

      {rejecting ? (
        <div className="space-y-3 border-t border-sea-100 pt-5">
          <Field label="Alasan penolakan">
            <TextArea value={reason} onChange={onReason} placeholder="Tulis alasan untuk pelanggan" />
          </Field>
          {error ? <p className="text-sm font-semibold text-coral-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="accent" loading={busy} onClick={submitReject}>
              Kirim penolakan
            </Button>
            <Button variant="secondary" onClick={stopReject}>
              Batal
            </Button>
          </div>
        </div>
      ) : null}

      {order.status === 'dikonfirmasi' ? (
        <div className="flex flex-wrap gap-2 border-t border-sea-100 pt-5">
          <Button variant="primary" loading={busy} icon={<PackageCheck className="size-4" />} onClick={complete}>
            Selesaikan pesanan
          </Button>
          <Button variant="secondary" loading={busy} icon={<BadgeCheck className="size-4" />} onClick={togglePaid}>
            {order.paid ? 'Tandai belum lunas' : 'Tandai lunas'}
          </Button>
          <Button variant="danger" icon={<X className="size-4" />} onClick={startReject}>
            Tolak
          </Button>
        </div>
      ) : null}

      {order.phone ? (
        <a href={whatsappLink(message, order.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline">
          <MessageCircle className="size-4" />
          Hubungi lewat WhatsApp
        </a>
      ) : null}
    </div>
  )
}

export function OrdersAdminPage() {
  const orders = useLoad(orderService.all, [], POLL_INTERVAL_MS)
  const [filter, setFilter] = useState<'semua' | OrderStatus>('menunggu')
  const [selectedId, setSelectedId] = useState('')

  function open(id: string) {
    return function () {
      setSelectedId(id)
    }
  }

  function close() {
    setSelectedId('')
  }

  function changeFilter(value: string) {
    setFilter(value as 'semua' | OrderStatus)
  }

  if (orders.loading) return <Spinner label="Memuat pesanan" />
  if (orders.error || !orders.data) return <ErrorState message={orders.error || 'Pesanan tidak dapat dimuat.'} onRetry={orders.reload} />

  const all = orders.data
  function count(status: OrderStatus) {
    return all.filter(function (order) {
      return order.status === status
    }).length
  }

  const options = [
    { value: 'menunggu', label: 'Menunggu', count: count('menunggu') },
    { value: 'dikonfirmasi', label: 'Dikonfirmasi', count: count('dikonfirmasi') },
    { value: 'selesai', label: 'Selesai', count: count('selesai') },
    { value: 'ditolak', label: 'Ditolak', count: count('ditolak') },
    { value: 'dibatalkan', label: 'Dibatalkan', count: count('dibatalkan') },
    { value: 'semua', label: 'Semua', count: all.length },
  ]
  const visible = filter === 'semua' ? all : all.filter(function (order) {
    return order.status === filter
  })
  const selected = all.find(function (order) {
    return order.id === selectedId
  })

  return (
    <div>
      <PageHeader title="Pesanan" />
      <Tabs options={options} value={filter} onChange={changeFilter} />

      <div className="mt-5">
        {visible.length === 0 ? (
          <EmptyState title="Tidak ada pesanan" />
        ) : (
          <div className="space-y-3">
            {visible.map(function (order) {
              const status = ORDER_STATUS[order.status]
              return (
                <button key={order.id} type="button" onClick={open(order.id)} className="block w-full text-left">
                  <Card className="flex items-center gap-4 !p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:!p-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-bold">{order.customerName}</p>
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <Badge>{order.payment === 'cod' ? 'COD' : 'Transfer'}</Badge>
                      </div>
                      <p className="truncate text-sm text-sea-600">
                        {order.items
                          .map(function (item) {
                            return item.name + ' ' + kilogram(item.kg)
                          })
                          .join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-sea-400">
                        {order.code} - {dateTime(order.createdAt)}
                      </p>
                    </div>
                    <p className="font-display text-lg font-semibold">{rupiah(order.total)}</p>
                    <ChevronRight className="size-5 shrink-0 text-sea-300" />
                  </Card>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={Boolean(selected)} title="Detail pesanan" onClose={close} wide>
        {selected ? <OrderPanel key={selected.id + selected.status} order={selected} onChanged={orders.reload} onClose={close} /> : null}
      </Modal>
    </div>
  )
}
