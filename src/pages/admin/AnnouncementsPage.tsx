import { useState } from 'react'
import type { FormEvent } from 'react'
import { MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, TextArea, TextInput } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { notificationService } from '../../services'
import { dateTime, whatsappLink } from '../../utils/format'
import type { Announcement } from '../../types'

function AnnouncementForm(props: { item?: Announcement; onSaved: () => Promise<void>; onClose: () => void }) {
  const { item } = props
  const { busy, run } = useAction()
  const [title, setTitle] = useState(item ? item.title : '')
  const [message, setMessage] = useState(item ? item.message : '')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim().length < 3) return setError('Isi judul minimal 3 karakter.')
    if (message.trim().length < 3) return setError('Isi pengumuman minimal 3 karakter.')
    setError('')
    const body = { title: title.trim(), message: message.trim() }
    const result = await run(function () {
      return item ? notificationService.update(item.id, body) : notificationService.publish(body)
    }, item ? 'Pengumuman diperbarui.' : 'Pengumuman terkirim ke semua akun.')
    if (result.ok) {
      await props.onSaved()
      props.onClose()
    }
  }

  function onTitle(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
  }

  function onMessage(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Judul">
        <TextInput value={title} onChange={onTitle} placeholder="mis. Kapal tiba besok pagi" />
      </Field>
      <Field label="Isi pengumuman">
        <TextArea value={message} onChange={onMessage} className="min-h-32" />
      </Field>
      {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={props.onClose}>
          Batal
        </Button>
        <Button type="submit" variant="accent" loading={busy}>
          {item ? 'Simpan' : 'Kirim'}
        </Button>
      </div>
    </form>
  )
}

export function AnnouncementsPage() {
  const items = useLoad(notificationService.announcements, [])
  const { busy, run } = useAction()
  const [editing, setEditing] = useState<Announcement | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Announcement | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(item: Announcement) {
    return function () {
      setEditing(item)
      setFormOpen(true)
    }
  }

  function closeForm() {
    setFormOpen(false)
  }

  function askDelete(item: Announcement) {
    return function () {
      setDeleting(item)
    }
  }

  function cancelDelete() {
    setDeleting(undefined)
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    const result = await run(function () {
      return notificationService.remove(target.id)
    }, 'Pengumuman dihapus.')
    setDeleting(undefined)
    if (result.ok) await items.reload()
  }

  if (items.loading) return <Spinner label="Memuat pengumuman" />
  if (items.error || !items.data) return <ErrorState message={items.error || 'Pengumuman tidak dapat dimuat.'} onRetry={items.reload} />

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        actions={
          <Button variant="accent" icon={<Plus className="size-4" />} onClick={openCreate}>
            Buat pengumuman
          </Button>
        }
      />

      {items.data.length === 0 ? (
        <EmptyState title="Belum ada pengumuman" />
      ) : (
        <div className="space-y-3">
          {items.data.map(function (item) {
            return (
              <Card key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                  <p className="text-xs font-medium text-sea-400">{dateTime(item.createdAt)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-sea-700">{item.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={whatsappLink(item.title + '\n' + item.message)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-100 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-200">
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={openEdit(item)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={askDelete(item)}>
                    Hapus
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} title={editing ? 'Ubah pengumuman' : 'Buat pengumuman'} onClose={closeForm}>
        <AnnouncementForm key={editing ? editing.id : 'new'} item={editing} onSaved={items.reload} onClose={closeForm} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Hapus pengumuman" message="Pengumuman akan dihapus dari notifikasi semua akun." confirmLabel="Hapus" busy={busy} onConfirm={confirmDelete} onClose={cancelDelete} />
    </div>
  )
}
