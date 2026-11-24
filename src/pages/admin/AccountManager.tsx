import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, TextInput } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { userService } from '../../services'
import { dateOnly } from '../../utils/format'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '../../types'
import type { Permission, User } from '../../types'

type ManagedRole = 'user' | 'admin'

function PermissionPicker(props: { value: Permission[]; onChange: (value: Permission[]) => void }) {
  function toggle(permission: Permission) {
    return function () {
      const has = props.value.indexOf(permission) >= 0
      props.onChange(
        has
          ? props.value.filter(function (item) {
              return item !== permission
            })
          : [...props.value, permission],
      )
    }
  }

  function selectAll() {
    props.onChange(ALL_PERMISSIONS)
  }

  function clearAll() {
    props.onChange([])
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-sea-800">Hak akses</p>
        <div className="flex gap-3 text-xs font-bold text-teal-700">
          <button type="button" onClick={selectAll} className="hover:underline">
            Semua
          </button>
          <button type="button" onClick={clearAll} className="hover:underline">
            Kosongkan
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ALL_PERMISSIONS.map(function (permission) {
          const checked = props.value.indexOf(permission) >= 0
          return (
            <button key={permission} type="button" role="checkbox" aria-checked={checked} onClick={toggle(permission)} className={'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ' + (checked ? 'border-teal-500 bg-teal-50 text-sea-950' : 'border-sea-200 bg-white text-sea-600')}>
              <span className={'grid size-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-black ' + (checked ? 'border-teal-500 bg-teal-500 text-white' : 'border-sea-300')}>{checked ? '✓' : ''}</span>
              {PERMISSION_LABELS[permission]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface AccountFormProps {
  role: ManagedRole
  account?: User
  onSaved: () => Promise<void>
  onClose: () => void
}

function AccountForm(props: AccountFormProps) {
  const { account, role } = props
  const { busy, run } = useAction()
  const [username, setUsername] = useState(account ? account.username : '')
  const [phone, setPhone] = useState(account ? account.phone : '')
  const [avatar, setAvatar] = useState(account ? account.avatar : '')
  const [password, setPassword] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>(account ? account.permissions : ALL_PERMISSIONS)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username.trim())) return setError('Username 3-24 karakter: huruf, angka, titik, atau garis bawah.')
    if (!account && password.length < 6) return setError('Katasandi minimal 6 karakter.')
    if (account && password && password.length < 6) return setError('Katasandi baru minimal 6 karakter.')
    setError('')

    const result = await run(function () {
      if (account) {
        const body: Record<string, unknown> = { username: username.trim(), phone: phone.trim(), avatar }
        if (password) body.password = password
        if (role === 'admin') body.permissions = permissions
        return userService.update(account.id, body)
      }
      return userService.create({ username: username.trim(), password, role, phone: phone.trim(), permissions: role === 'admin' ? permissions : [] })
    }, account ? 'Akun diperbarui.' : 'Akun ditambahkan.')

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
      {account ? <ImagePicker value={avatar} onChange={setAvatar} name={username} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username">
          <TextInput value={username} onChange={bind(setUsername)} autoCapitalize="none" />
        </Field>
        <Field label="Nomor telepon">
          <TextInput value={phone} onChange={bind(setPhone)} type="tel" inputMode="tel" />
        </Field>
      </div>
      <Field label={account ? 'Katasandi baru (kosongkan bila tidak diubah)' : 'Katasandi'}>
        <TextInput type="password" value={password} onChange={bind(setPassword)} autoComplete="new-password" />
      </Field>
      {role === 'admin' ? <PermissionPicker value={permissions} onChange={setPermissions} /> : null}
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

export function AccountManager(props: { role: ManagedRole; title: string; addLabel: string; emptyLabel: string }) {
  const { role } = props
  const accounts = useLoad(
    function () {
      return userService.list(role)
    },
    [role],
  )
  const { busy, run } = useAction()
  const [editing, setEditing] = useState<User | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<User | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(account: User) {
    return function () {
      setEditing(account)
      setFormOpen(true)
    }
  }

  function closeForm() {
    setFormOpen(false)
  }

  function askDelete(account: User) {
    return function () {
      setDeleting(account)
    }
  }

  function cancelDelete() {
    setDeleting(undefined)
  }

  function toggleActive(account: User) {
    return async function () {
      const result = await run(function () {
        return userService.update(account.id, { disabled: !account.disabled })
      }, account.disabled ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.')
      if (result.ok) await accounts.reload()
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    const result = await run(function () {
      return userService.remove(target.id)
    }, 'Akun dihapus.')
    setDeleting(undefined)
    if (result.ok) await accounts.reload()
  }

  if (accounts.loading) return <Spinner label="Memuat akun" />
  if (accounts.error || !accounts.data) return <ErrorState message={accounts.error || 'Akun tidak dapat dimuat.'} onRetry={accounts.reload} />

  return (
    <div>
      <PageHeader
        title={props.title}
        actions={
          <Button variant="accent" icon={<Plus className="size-4" />} onClick={openCreate}>
            {props.addLabel}
          </Button>
        }
      />

      {accounts.data.length === 0 ? (
        <EmptyState title={props.emptyLabel} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.data.map(function (account) {
            return (
              <Card key={account.id} className={account.disabled ? 'opacity-70' : ''}>
                <div className="flex items-center gap-4">
                  <Avatar name={account.username} src={account.avatar} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{account.username}</p>
                    <p className="text-xs text-sea-400">Sejak {dateOnly(account.createdAt)}</p>
                  </div>
                  {account.disabled ? <Badge tone="danger">Nonaktif</Badge> : <Badge tone="success">Aktif</Badge>}
                </div>
                {role === 'admin' ? (
                  <p className="mt-4 text-xs font-semibold text-sea-500">{account.permissions.length} dari {ALL_PERMISSIONS.length} hak akses</p>
                ) : null}
                {account.phone ? <p className="mt-2 text-sm text-sea-600">{account.phone}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={openEdit(account)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Power className="size-4" />} loading={busy} onClick={toggleActive(account)}>
                    {account.disabled ? 'Aktifkan' : 'Nonaktifkan'}
                  </Button>
                  <Button size="sm" variant="danger" aria-label="Hapus" icon={<Trash2 className="size-4" />} onClick={askDelete(account)} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} title={editing ? 'Ubah akun' : props.addLabel} onClose={closeForm} wide={role === 'admin'}>
        <AccountForm key={editing ? editing.id : 'new'} role={role} account={editing} onSaved={accounts.reload} onClose={closeForm} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Hapus akun" message={'Akun ' + (deleting ? deleting.username : '') + ' akan dihapus permanen.'} confirmLabel="Hapus" busy={busy} onConfirm={confirmDelete} onClose={cancelDelete} />
    </div>
  )
}
