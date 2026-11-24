import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, SelectInput, TextInput } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { fishService, saleService } from '../../services'
import type { SaleInput } from '../../services'
import { downloadCsv } from '../../utils/csv'
import { dateOnly, kilogram, monthInput, rupiah, todayInput } from '../../utils/format'
import type { Fish, Sale } from '../../types'

interface Row {
  fishId: string
  kg: string
  pricePerKg: number
}

interface SaleFormProps {
  sale?: Sale
  fishes: Fish[]
  ticketId?: string
  presetName?: string
  presetPhone?: string
  onSaved: () => Promise<void>
  onClose: () => void
}

function SaleForm(props: SaleFormProps) {
  const { sale, fishes } = props
  const { busy, run } = useAction()
  const locked = sale ? !sale.stockManaged : false
  const [customer, setCustomer] = useState(sale ? sale.customerName : props.presetName || '')
  const [phone, setPhone] = useState(sale ? sale.phone : props.presetPhone || '')
  const [address, setAddress] = useState(sale ? sale.address : '')
  const [date, setDate] = useState(sale ? sale.date : todayInput())
  const [payment, setPayment] = useState(sale ? sale.payment : 'Tunai')
  const [rows, setRows] = useState<Row[]>(
    sale
      ? sale.items.map(function (item) {
          return { fishId: item.fishId, kg: String(item.kg), pricePerKg: item.pricePerKg }
        })
      : [{ fishId: '', kg: '', pricePerKg: 0 }],
  )
  const [error, setError] = useState('')

  function updateRow(index: number, patch: Partial<Row>) {
    setRows(
      rows.map(function (row, position) {
        return position === index ? { ...row, ...patch } : row
      }),
    )
  }

  function pickFish(index: number) {
    return function (event: React.ChangeEvent<HTMLSelectElement>) {
      const fish = fishes.find(function (item) {
        return item.id === event.target.value
      })
      updateRow(index, { fishId: event.target.value, pricePerKg: fish ? fish.price : 0 })
    }
  }

  function typeKg(index: number) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      updateRow(index, { kg: event.target.value })
    }
  }

  function removeRow(index: number) {
    return function () {
      setRows(
        rows.filter(function (_row, position) {
          return position !== index
        }),
      )
    }
  }

  function addRow() {
    setRows([...rows, { fishId: '', kg: '', pricePerKg: 0 }])
  }

  const total = rows.reduce(function (sum, row) {
    const kg = Number(row.kg.replace(',', '.'))
    return sum + (kg > 0 ? Math.round(kg * row.pricePerKg) : 0)
  }, 0)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (customer.trim().length < 2) return setError('Isi nama pelanggan.')
    if (!date) return setError('Pilih tanggal transaksi.')

    const items: SaleInput['items'] = []
    for (const row of rows) {
      const kg = Number(row.kg.replace(',', '.'))
      if (!row.fishId) return setError('Pilih jenis ikan pada setiap baris.')
      if (Number.isNaN(kg) || kg <= 0) return setError('Berat harus berupa angka lebih dari 0.')
      items.push({ fishId: row.fishId, kg, pricePerKg: row.pricePerKg })
    }
    setError('')

    const body: SaleInput = { customerName: customer.trim(), phone: phone.trim(), address: address.trim(), date, payment, items, ticketId: props.ticketId }
    const result = await run(function () {
      return sale ? saleService.update(sale.id, locked ? { customerName: body.customerName, phone: body.phone, address: body.address, date: body.date, payment: body.payment } : body) : saleService.create(body)
    }, 'Transaksi tersimpan.')
    if (result.ok) {
      await props.onSaved()
      props.onClose()
    }
  }

  function bind(setter: (value: string) => void) {
    return function (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
      setter(event.target.value)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama pelanggan">
          <TextInput value={customer} onChange={bind(setCustomer)} />
        </Field>
        <Field label="Telepon">
          <TextInput value={phone} onChange={bind(setPhone)} type="tel" inputMode="tel" />
        </Field>
        <Field label="Alamat" className="sm:col-span-2">
          <TextInput value={address} onChange={bind(setAddress)} />
        </Field>
        <Field label="Tanggal">
          <TextInput type="date" value={date} onChange={bind(setDate)} />
        </Field>
        <Field label="Pembayaran">
          <SelectInput value={payment} onChange={bind(setPayment)}>
            <option>Tunai</option>
            <option>Transfer</option>
            <option>COD</option>
          </SelectInput>
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-sea-800">Ikan dibeli</p>
        {rows.map(function (row, index) {
          return (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-sea-50 p-3 sm:grid-cols-[1.4fr_0.7fr_auto_auto]">
              <SelectInput value={row.fishId} onChange={pickFish(index)} disabled={locked} aria-label="Jenis ikan">
                <option value="">Pilih ikan</option>
                {fishes.map(function (fish) {
                  return (
                    <option key={fish.id} value={fish.id}>
                      {fish.name}
                    </option>
                  )
                })}
              </SelectInput>
              <Button variant="danger" aria-label="Hapus baris" disabled={locked || rows.length === 1} icon={<Trash2 className="size-4" />} onClick={removeRow(index)} className="!size-11 !p-0 sm:order-last" />
              <TextInput value={row.kg} onChange={typeKg(index)} disabled={locked} inputMode="decimal" placeholder="Berat (kg)" aria-label="Berat" />
              <div className="flex h-11 items-center justify-end rounded-xl bg-white px-3 text-sm font-bold text-sea-700 ring-1 ring-sea-100">{rupiah(row.pricePerKg)}/kg</div>
            </div>
          )
        })}
        {locked ? null : (
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={addRow}>
            Tambah ikan
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-sea-900 px-5 py-4 text-white">
        <p className="text-sm font-bold text-sea-200">Total</p>
        <p className="font-display text-2xl font-semibold">{rupiah(total)}</p>
      </div>

      {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={props.onClose}>
          Batal
        </Button>
        <Button type="submit" loading={busy}>
          Simpan
        </Button>
      </div>
    </form>
  )
}

export function SalesPage() {
  const [params, setParams] = useSearchParams()
  const [month, setMonth] = useState(monthInput())
  const [query, setQuery] = useState('')
  const sales = useLoad(
    function () {
      return saleService.list(month)
    },
    [month],
  )
  const fishes = useLoad(fishService.list, [])
  const { busy, run } = useAction()
  const [editing, setEditing] = useState<Sale | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(Boolean(params.get('ticket')))
  const [deleting, setDeleting] = useState<Sale | undefined>(undefined)

  const ticketId = params.get('ticket') || undefined

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(sale: Sale) {
    return function () {
      setEditing(sale)
      setFormOpen(true)
    }
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(undefined)
    if (params.get('ticket')) setParams({})
  }

  function askDelete(sale: Sale) {
    return function () {
      setDeleting(sale)
    }
  }

  function cancelDelete() {
    setDeleting(undefined)
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    const result = await run(function () {
      return saleService.remove(target.id)
    }, 'Catatan dihapus dan stok dikembalikan.')
    setDeleting(undefined)
    if (result.ok) await sales.reload()
  }

  function onMonth(event: React.ChangeEvent<HTMLInputElement>) {
    setMonth(event.target.value || monthInput())
  }

  function onQuery(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
  }

  function exportCsv(list: Sale[]) {
    return function () {
      const rows: (string | number)[][] = [['Tanggal', 'Pelanggan', 'Sumber', 'Pembayaran', 'Ikan', 'Berat (kg)', 'Harga/kg', 'Subtotal']]
      for (const sale of list) {
        for (const item of sale.items) {
          rows.push([sale.date, sale.customerName, sale.source, sale.payment, item.name, item.kg, item.pricePerKg, item.subtotal])
        }
      }
      downloadCsv('transaksi-' + month + '.csv', rows)
    }
  }

  if (sales.loading || fishes.loading) return <Spinner label="Memuat transaksi" />
  if (sales.error || !sales.data) return <ErrorState message={sales.error || 'Transaksi tidak dapat dimuat.'} onRetry={sales.reload} />

  const keyword = query.trim().toLowerCase()
  const list = sales.data.filter(function (sale) {
    return keyword === '' || sale.customerName.toLowerCase().indexOf(keyword) >= 0
  })
  const total = list.reduce(function (sum, sale) {
    return sum + sale.total
  }, 0)

  return (
    <div>
      <PageHeader
        title="Transaksi"
        actions={
          <>
            <Button variant="secondary" icon={<Download className="size-4" />} disabled={list.length === 0} onClick={exportCsv(list)}>
              CSV
            </Button>
            <Button variant="accent" icon={<Plus className="size-4" />} onClick={openCreate}>
              Catat transaksi
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
        <TextInput type="month" value={month} onChange={onMonth} aria-label="Bulan" />
        <TextInput value={query} onChange={onQuery} placeholder="Cari nama pelanggan" aria-label="Cari" />
        <div className="flex h-11 items-center justify-between gap-4 rounded-xl bg-sea-900 px-4 text-white">
          <span className="text-xs font-bold uppercase tracking-wider text-sea-300">{list.length} transaksi</span>
          <span className="font-display text-lg font-semibold">{rupiah(total)}</span>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Belum ada transaksi" />
      ) : (
        <div className="space-y-3">
          {list.map(function (sale) {
            return (
              <Card key={sale.id} className="!p-4 sm:!p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{sale.customerName}</p>
                      <Badge tone={sale.source === 'aplikasi' ? 'info' : 'neutral'}>{sale.source === 'aplikasi' ? 'Pre-order' : 'Dermaga'}</Badge>
                      <Badge>{sale.payment}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-sea-400">{dateOnly(sale.date)}</p>
                  </div>
                  <p className="font-display text-xl font-semibold">{rupiah(sale.total)}</p>
                </div>
                <p className="mt-3 text-sm text-sea-600">
                  {sale.items
                    .map(function (item) {
                      return item.name + ' ' + kilogram(item.kg)
                    })
                    .join(', ')}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={openEdit(sale)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={askDelete(sale)}>
                    Hapus
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} title={editing ? 'Ubah transaksi' : 'Catat transaksi'} onClose={closeForm} wide>
        <SaleForm key={editing ? editing.id : 'new'} sale={editing} fishes={fishes.data || []} ticketId={ticketId} presetName={params.get('name') || ''} presetPhone={params.get('phone') || ''} onSaved={sales.reload} onClose={closeForm} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Hapus catatan" message="Catatan transaksi akan dihapus. Stok dari transaksi dermaga dikembalikan." confirmLabel="Hapus" busy={busy} onConfirm={confirmDelete} onClose={cancelDelete} />
    </div>
  )
}
