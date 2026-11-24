import { useState } from 'react'
import type { FormEvent } from 'react'
import { History, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, TextInput, Toggle } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { FishThumb } from '../../components/FishThumb'
import { useAuth } from '../../context/AuthContext'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { fishService } from '../../services'
import { dateTime, kilogram, rupiah } from '../../utils/format'
import type { Fish } from '../../types'

function FishForm(props: { fish?: Fish; canPrice: boolean; onSaved: () => Promise<void>; onClose: () => void }) {
  const { fish } = props
  const { busy, run } = useAction()
  const [name, setName] = useState(fish ? fish.name : '')
  const [price, setPrice] = useState(fish ? String(fish.price) : '')
  const [stock, setStock] = useState(fish ? String(fish.stock) : '')
  const [estimated, setEstimated] = useState(fish ? String(fish.estimatedKg) : '')
  const [image, setImage] = useState(fish ? fish.image : '')
  const [active, setActive] = useState(fish ? fish.active : true)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const priceValue = Number(price)
    const stockValue = Number(stock.replace(',', '.'))
    const estimatedValue = Number((estimated || '0').replace(',', '.'))

    if (name.trim().length < 2) return setError('Isi nama ikan.')
    if (!Number.isInteger(priceValue) || priceValue <= 0) return setError('Harga harus berupa bilangan bulat lebih dari 0.')
    if (Number.isNaN(stockValue) || stockValue < 0) return setError('Stok aktual harus berupa angka 0 atau lebih.')
    if (Number.isNaN(estimatedValue) || estimatedValue < 0) return setError('Estimasi stok harus berupa angka 0 atau lebih.')
    setError('')

    const body: Partial<Fish> = { name: name.trim(), stock: stockValue, estimatedKg: estimatedValue, image, active }
    if (props.canPrice || !fish) body.price = priceValue

    const result = await run(function () {
      return fish ? fishService.update(fish.id, body) : fishService.create(body)
    }, 'Data ikan tersimpan.')
    if (result.ok) {
      await props.onSaved()
      props.onClose()
    }
  }

  function bind(setter: (value: string) => void) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      setter(event.target.value)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ImagePicker value={image} onChange={setImage} name={name} shape="square" maxSide={640} />
      <Field label="Nama ikan">
        <TextInput value={name} onChange={bind(setName)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Harga acuan/kg (Rp)">
          <TextInput value={price} onChange={bind(setPrice)} inputMode="numeric" disabled={Boolean(fish) && !props.canPrice} />
        </Field>
        <Field label="Stok aktual (kg)">
          <TextInput value={stock} onChange={bind(setStock)} inputMode="decimal" />
        </Field>
        <Field label="Estimasi (kg)">
          <TextInput value={estimated} onChange={bind(setEstimated)} inputMode="decimal" />
        </Field>
      </div>
      <Toggle label="Tampil di katalog" checked={active} onChange={setActive} />
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

function PriceHistory(props: { fish: Fish }) {
  const history = useLoad(
    function () {
      return fishService.prices(props.fish.id)
    },
    [props.fish.id],
  )
  if (history.loading) return <Spinner />
  if (history.error) return <ErrorState message={history.error} onRetry={history.reload} />
  return (
    <div className="divide-y divide-sea-100">
      {(history.data || []).map(function (entry) {
        return (
          <div key={entry.at} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-bold">{rupiah(entry.price)}/kg</p>
              <p className="text-xs text-sea-400">
                {dateTime(entry.at)} oleh {entry.by}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FishAdminPage() {
  const auth = useAuth()
  const fishes = useLoad(fishService.list, [])
  const { busy, run } = useAction()
  const [editing, setEditing] = useState<Fish | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Fish | undefined>(undefined)
  const [history, setHistory] = useState<Fish | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(fish: Fish) {
    return function () {
      setEditing(fish)
      setFormOpen(true)
    }
  }

  function closeForm() {
    setFormOpen(false)
  }

  function askDelete(fish: Fish) {
    return function () {
      setDeleting(fish)
    }
  }

  function cancelDelete() {
    setDeleting(undefined)
  }

  function showHistory(fish: Fish) {
    return function () {
      setHistory(fish)
    }
  }

  function closeHistory() {
    setHistory(undefined)
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    const result = await run(function () {
      return fishService.remove(target.id)
    }, 'Ikan dihapus.')
    setDeleting(undefined)
    if (result.ok) await fishes.reload()
  }

  if (fishes.loading) return <Spinner label="Memuat data ikan" />
  if (fishes.error || !fishes.data) return <ErrorState message={fishes.error || 'Data ikan tidak dapat dimuat.'} onRetry={fishes.reload} />

  const canPrice = auth.can('harga')

  return (
    <div>
      <PageHeader
        title="Ikan dan harga"
        actions={
          <Button variant="accent" icon={<Plus className="size-4" />} onClick={openCreate}>
            Tambah ikan
          </Button>
        }
      />

      {fishes.data.length === 0 ? (
        <EmptyState title="Belum ada data ikan" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fishes.data.map(function (fish) {
            return (
              <Card key={fish.id} className="overflow-hidden !p-0">
                <FishThumb src={fish.image} name={fish.name} className="aspect-[16/8] w-full" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold">{fish.name}</h3>
                    <Badge tone={fish.active ? 'success' : 'neutral'}>{fish.active ? 'Tampil' : 'Disembunyikan'}</Badge>
                  </div>
                  <p className="mt-1 font-bold text-teal-700">{rupiah(fish.price)}/kg</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-sea-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sea-400">Stok aktual</p>
                      <p className="font-bold">{kilogram(fish.stock)}</p>
                    </div>
                    <div className="rounded-xl bg-sea-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sea-400">Estimasi</p>
                      <p className="font-bold">{kilogram(fish.estimatedKg)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={openEdit(fish)}>
                      Ubah
                    </Button>
                    {canPrice ? (
                      <Button size="sm" variant="ghost" icon={<History className="size-4" />} onClick={showHistory(fish)}>
                        Riwayat harga
                      </Button>
                    ) : null}
                    <Button size="sm" variant="danger" aria-label="Hapus" icon={<Trash2 className="size-4" />} onClick={askDelete(fish)} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} title={editing ? 'Ubah ikan' : 'Tambah ikan'} onClose={closeForm}>
        <FishForm key={editing ? editing.id : 'new'} fish={editing} canPrice={canPrice} onSaved={fishes.reload} onClose={closeForm} />
      </Modal>
      <Modal open={Boolean(history)} title={history ? 'Riwayat harga ' + history.name : ''} onClose={closeHistory}>
        {history ? <PriceHistory fish={history} /> : null}
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Hapus ikan" message={'Data ' + (deleting ? deleting.name : '') + ' akan dihapus dari katalog.'} confirmLabel="Hapus" busy={busy} onConfirm={confirmDelete} onClose={cancelDelete} />
    </div>
  )
}
