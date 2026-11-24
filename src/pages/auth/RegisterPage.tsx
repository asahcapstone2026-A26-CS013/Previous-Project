import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useAction } from '../../hooks/useAction'

interface FormValues {
  username: string
  phone: string
  password: string
  confirm: string
}

function validateForm(values: FormValues): string {
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(values.username)) return 'Username 3-24 karakter: huruf, angka, titik, atau garis bawah.'
  if (values.phone && !/^[0-9+\-\s]{8,20}$/.test(values.phone)) return 'Nomor telepon tidak valid. Gunakan angka, minimal 8 digit.'
  if (values.password.length < 6) return 'Katasandi minimal 6 karakter.'
  if (values.password !== values.confirm) return 'Konfirmasi katasandi tidak sama.'
  return ''
}

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { busy, run } = useAction()
  const [values, setValues] = useState<FormValues>({ username: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')

  function change(name: keyof FormValues) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      setValues({ ...values, [name]: event.target.value })
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = validateForm(values)
    setError(problem)
    if (problem) return
    const result = await run(function () {
      return auth.register(values.username.trim(), values.password, values.phone.trim())
    }, 'Akun berhasil dibuat.')
    if (result.ok) navigate('/beranda', { replace: true })
  }

  return (
    <AuthShell title="Buat akun">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Username">
          <TextInput value={values.username} onChange={change('username')} autoComplete="username" autoCapitalize="none" placeholder="mis. budi.sibolga" />
        </Field>
        <Field label="Nomor telepon (opsional)">
          <TextInput value={values.phone} onChange={change('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Katasandi">
            <TextInput value={values.password} onChange={change('password')} type="password" autoComplete="new-password" placeholder="Min. 6 karakter" />
          </Field>
          <Field label="Ulangi katasandi">
            <TextInput value={values.confirm} onChange={change('confirm')} type="password" autoComplete="new-password" placeholder="Ulangi katasandi" />
          </Field>
        </div>
        {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
        <Button type="submit" size="lg" block loading={busy} icon={<UserPlus className="size-5" />}>
          Daftar
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-sea-600">
        Sudah punya akun?{' '}
        <Link to="/masuk" className="font-bold text-teal-700 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthShell>
  )
}
