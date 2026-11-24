import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useAction } from '../../hooks/useAction'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const { busy, run } = useAction()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Isi username dan katasandi terlebih dahulu.')
      return
    }
    const result = await run(function () {
      return auth.login(username.trim(), password)
    })
    if (result.ok && result.value) {
      navigate(result.value.role === 'user' ? '/beranda' : '/admin', { replace: true })
    } else {
      setError('Username atau katasandi salah.')
    }
  }

  function toggleVisible() {
    setVisible(!visible)
  }

  function onUsername(event: React.ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
  }

  function onPassword(event: React.ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
  }

  return (
    <AuthShell title="Masuk">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Username">
          <TextInput value={username} onChange={onUsername} autoComplete="username" autoCapitalize="none" placeholder="Username Anda" />
        </Field>
        <Field label="Katasandi">
          <div className="relative">
            <TextInput value={password} onChange={onPassword} type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Katasandi" className="pr-12" />
            <button type="button" onClick={toggleVisible} aria-label={visible ? 'Sembunyikan katasandi' : 'Tampilkan katasandi'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-sea-500 hover:bg-sea-100">
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
        <Button type="submit" size="lg" block loading={busy} icon={<LogIn className="size-5" />}>
          Masuk
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-sea-600">
        Belum punya akun?{' '}
        <Link to="/daftar" className="font-bold text-teal-700 hover:underline">
          Daftar
        </Link>
      </p>
    </AuthShell>
  )
}
