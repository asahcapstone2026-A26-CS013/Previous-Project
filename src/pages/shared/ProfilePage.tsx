import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, Card, PageHeader } from '../../components/ui/Display'
import { Field, TextInput } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { useAuth } from '../../context/AuthContext'
import { useAction } from '../../hooks/useAction'
import { authService } from '../../services'
import { ROLE_LABEL } from '../../utils/labels'

function ProfileForm() {
  const auth = useAuth()
  const user = auth.user!
  const { busy, run } = useAction()
  const [username, setUsername] = useState(user.username)
  const [phone, setPhone] = useState(user.phone)
  const [avatar, setAvatar] = useState(user.avatar)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username.trim())) {
      setError('Username 3-24 karakter: huruf, angka, titik, atau garis bawah.')
      return
    }
    setError('')
    const result = await run(function () {
      return authService.updateProfile({ username: username.trim(), phone: phone.trim(), avatar })
    }, 'Profil berhasil diperbarui.')
    if (result.ok && result.value) auth.replaceUser(result.value)
  }

  function onUsername(event: React.ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
  }

  function onPhone(event: React.ChangeEvent<HTMLInputElement>) {
    setPhone(event.target.value)
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <ImagePicker value={avatar} onChange={setAvatar} name={username} />
        <Field label="Username">
          <TextInput value={username} onChange={onUsername} autoCapitalize="none" />
        </Field>
        <Field label="Nomor telepon">
          <TextInput value={phone} onChange={onPhone} type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" />
        </Field>
        {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
        <Button type="submit" loading={busy} icon={<Save className="size-4" />}>
          Simpan
        </Button>
      </form>
    </Card>
  )
}

function PasswordForm() {
  const { busy, run } = useAction()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!current) return setError('Isi katasandi saat ini.')
    if (next.length < 6) return setError('Katasandi baru minimal 6 karakter.')
    if (next !== confirm) return setError('Konfirmasi katasandi baru tidak sama.')
    setError('')
    const result = await run(function () {
      return authService.changePassword(current, next)
    }, 'Katasandi berhasil diubah.')
    if (result.ok) {
      setCurrent('')
      setNext('')
      setConfirm('')
    }
  }

  function bind(setter: (value: string) => void) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      setter(event.target.value)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Katasandi saat ini">
          <TextInput type="password" value={current} onChange={bind(setCurrent)} autoComplete="current-password" />
        </Field>
        <Field label="Katasandi baru">
          <TextInput type="password" value={next} onChange={bind(setNext)} autoComplete="new-password" />
        </Field>
        <Field label="Ulangi katasandi baru">
          <TextInput type="password" value={confirm} onChange={bind(setConfirm)} autoComplete="new-password" />
        </Field>
        {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
        <Button type="submit" variant="secondary" loading={busy} icon={<KeyRound className="size-4" />}>
          Ubah katasandi
        </Button>
      </form>
    </Card>
  )
}

export function ProfilePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const user = auth.user!

  async function leave() {
    await auth.logout()
    navigate('/masuk', { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Akun saya" actions={<Badge tone="success">{ROLE_LABEL[user.role]}</Badge>} />
      <ProfileForm />
      <PasswordForm />
      <Button variant="danger" block icon={<LogOut className="size-4" />} onClick={leave}>
        Keluar
      </Button>
    </div>
  )
}
