import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Ship, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, SelectInput, TextInput } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { voyageService } from '../../services'
import { dateTime, toLocalInput } from '../../utils/format'
import { VOYAGE_STATUS } from '../../utils/labels'
import type { Voyage, VoyageStatus } from '../../types'

function VoyageForm(props: { voyage?: Voyage; onSaved: () => Promise<void>; onClose: () => void }) {
  const { voyage } = props
  const { busy, run } = useAction()
  const [name, setName] = useState(voyage ? voyage.name : '')
  const [status, setStatus] = useState<VoyageStatus>(voyage ? voyage.status : 'berlayar')
  const [arrival, setArrival] = useState(voyage ? toLocalInput(voyage.arrivalAt) : '')
  const [tons, setTons] = useState(voyage ? String(voyage.estimatedTons) : '')
  const [note, setNote] = useState(voyage ? voyage.note : '')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const tonValue = Number(tons.replace(',', '.'))
    if (name.trim().length < 3) return setError('Isi nama pelayaran minimal 3 karakter.')
    if (!arrival) return setError('Pilih perkiraan waktu tiba.')
    if (Number.isNaN(tonValue) || tonValue < 0) return setError('Estimasi tangkapan harus berupa angka 0 atau lebih.')
    setError('')

    const body: Partial<Voyage> = { name: name.trim(), status, arrivalAt: arrival, estimatedTons: tonValue, note: note.trim() }
    const result = await run(function () {
      return voyage ? voyageService.update(voyage.id, body) : voyageService.create(body)
    }, 'Pelayaran tersimpan.')
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

  function onStatus(event: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(event.target.value as VoyageStatus)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Nama pelayaran">
        <TextInput value={name} onChange={bind(setName)} placeholder="mis. Pelayaran Oktober ke-2" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <SelectInput value={status} onChange={onStatus}>
            <option value="berlayar">Berlayar</option>
            <option value="tiba">Tiba</option>
            <option value="selesai">Selesai</option>
          </SelectInput>
        </Field>
        <Field label="Perkiraan tiba">
          <TextInput type="datetime-local" value={arrival} onChange={bind(setArrival)} />
        </Field>
      </div>
      <Field label="Estimasi tangkapan (ton)">
        <TextInput value={tons} onChange={bind(setTons)} inputMode="decimal" />
      </Field>
      <Field label="Catatan (opsional)">
        <TextInput value={note} onChange={bind(setNote)} />
      </Field>
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

export function VoyagesPage() {
  const voyages = useLoad(voyageService.list, [])
  const { busy, run } = useAction()
  const [editing, setEditing] = useState<Voyage | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Voyage | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(voyage: Voyage) {
    return function () {
      setEditing(voyage)
      setFormOpen(true)
    }
  }

  function closeForm() {
    setFormOpen(false)
  }

  function askDelete(voyage: Voyage) {
    return function () {
      setDeleting(voyage)
    }
  }

  function cancelDelete() {
    setDeleting(undefined)
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    const result = await run(function () {
      return voyageService.remove(target.id)
    }, 'Pelayaran dihapus.')
    setDeleting(undefined)
    if (result.ok) await voyages.reload()
  }

  if (voyages.loading) return <Spinner label="Memuat pelayaran" />
  if (voyages.error || !voyages.data) return <ErrorState message={voyages.error || 'Pelayaran tidak dapat dimuat.'} onRetry={voyages.reload} />

  return (
    <div>
      <PageHeader
        title="Pelayaran"
        actions={
          <Button variant="accent" icon={<Plus className="size-4" />} onClick={openCreate}>
            Tambah pelayaran
          </Button>
        }
      />

      {voyages.data.length === 0 ? (
        <EmptyState title="Belum ada pelayaran" icon={<Ship className="size-6" />} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {voyages.data.map(function (voyage) {
            const status = VOYAGE_STATUS[voyage.status]
            return (
              <Card key={voyage.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold">{voyage.name}</h3>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <p className="mt-3 text-sm text-sea-600">Tiba {dateTime(voyage.arrivalAt)}</p>
                <p className="text-sm text-sea-600">Estimasi tangkapan {voyage.estimatedTons} ton</p>
                {voyage.note ? <p className="mt-2 text-sm text-sea-500">{voyage.note}</p> : null}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={openEdit(voyage)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={askDelete(voyage)}>
                    Hapus
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} title={editing ? 'Ubah pelayaran' : 'Tambah pelayaran'} onClose={closeForm}>
        <VoyageForm key={editing ? editing.id : 'new'} voyage={editing} onSaved={voyages.reload} onClose={closeForm} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Hapus pelayaran" message="Data pelayaran ini akan dihapus." confirmLabel="Hapus" busy={busy} onConfirm={confirmDelete} onClose={cancelDelete} />
    </div>
  )
}
