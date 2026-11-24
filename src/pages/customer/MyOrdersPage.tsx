import { useRef, useState } from 'react'
import { ChevronRight, ClipboardList, ImageUp, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { orderService } from '../../services'
import { POLL_INTERVAL_MS } from '../../config/api'
import { dateTime, kilogram, rupiah } from '../../utils/format'
import { resizeImage } from '../../utils/image'
import { ORDER_STATUS } from '../../utils/labels'
import type { Order } from '../../types'

function OrderDetail(props: { order: Order; onChanged: () => Promise<void>; onClose: () => void }) {
  const { order } = props
  const toast = useToast()
  const { busy, run } = useAction()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const status = ORDER_STATUS[order.status]
  const active = order.status !== 'ditolak' && order.status !== 'dibatalkan'

  async function chooseProof(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    try {
      const image = await resizeImage(file, 900, 0.75)
      const result = await run(function () {
        return orderService.uploadProof(order.id, image)
      }, 'Bukti transfer terkirim.')
      if (result.ok) await props.onChanged()
    } catch (failure) {
      toast.error((failure as Error).message)
    }
  }

  async function cancel() {
    const result = await run(function () {
      return orderService.cancel(order.id)
    }, 'Pesanan dibatalkan.')
    setConfirmCancel(false)
    if (result.ok) {
      await props.onChanged()
      props.onClose()
    }
  }

  function pickFile() {
    fileRef.current?.click()
  }

  function askCancel() {
    setConfirmCancel(true)
  }

  function closeCancel() {
    setConfirmCancel(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-sea-500">{order.code}</p>
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
          <dd className="font-semibold">{order.payment === 'cod' ? 'COD' : 'Transfer ' + order.bank}</dd>
        </div>
        {order.address ? (
          <div className="col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-sea-400">Alamat</dt>
            <dd className="font-semibold">{order.address}</dd>
          </div>
        ) : null}
      </dl>

      {order.reason ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">Alasan penolakan: {order.reason}</p> : null}

      {order.payment === 'transfer' && active ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sea-50 p-4">
          <ImageUp className="size-5 text-sea-500" />
          <p className="flex-1 text-sm font-semibold">{order.hasProof ? 'Bukti transfer sudah dikirim' : 'Bukti transfer belum diunggah'}</p>
          <Button size="sm" variant="secondary" loading={busy} onClick={pickFile}>
            {order.hasProof ? 'Ganti bukti' : 'Unggah bukti'}
          </Button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={chooseProof} />
        </div>
      ) : null}

      {order.status === 'menunggu' ? (
        <Button variant="danger" block icon={<X className="size-4" />} onClick={askCancel}>
          Batalkan pesanan
        </Button>
      ) : null}

      <ConfirmDialog open={confirmCancel} title="Batalkan pesanan" message="Pesanan akan dibatalkan dan stok dikembalikan." confirmLabel="Ya, batalkan" busy={busy} onConfirm={cancel} onClose={closeCancel} />
    </div>
  )
}

export function MyOrdersPage() {
  const orders = useLoad(orderService.mine, [], POLL_INTERVAL_MS)
  const [selectedId, setSelectedId] = useState('')

  function open(id: string) {
    return function () {
      setSelectedId(id)
    }
  }

  function close() {
    setSelectedId('')
  }

  if (orders.loading) return <Spinner label="Memuat pesanan" />
  if (orders.error || !orders.data) return <ErrorState message={orders.error || 'Pesanan tidak dapat dimuat.'} onRetry={orders.reload} />

  const selected = orders.data.find(function (order) {
    return order.id === selectedId
  })

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Pesanan saya" />
      {orders.data.length === 0 ? (
        <EmptyState title="Belum ada pesanan" icon={<ClipboardList className="size-6" />} />
      ) : (
        <div className="space-y-3">
          {orders.data.map(function (order) {
            const status = ORDER_STATUS[order.status]
            return (
              <button key={order.id} type="button" onClick={open(order.id)} className="block w-full text-left">
                <Card className="flex items-center gap-4 !p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:!p-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <p className="font-bold">{order.code}</p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-sea-600">
                      {order.items
                        .map(function (item) {
                          return item.name + ' ' + kilogram(item.kg)
                        })
                        .join(', ')}
                    </p>
                    <p className="mt-1 text-xs text-sea-400">{dateTime(order.createdAt)}</p>
                  </div>
                  <p className="font-display text-lg font-semibold">{rupiah(order.total)}</p>
                  <ChevronRight className="size-5 shrink-0 text-sea-300" />
                </Card>
              </button>
            )
          })}
        </div>
      )}

      <Modal open={Boolean(selected)} title="Detail pesanan" onClose={close}>
        {selected ? <OrderDetail order={selected} onChanged={orders.reload} onClose={close} /> : null}
      </Modal>
    </div>
  )
}
