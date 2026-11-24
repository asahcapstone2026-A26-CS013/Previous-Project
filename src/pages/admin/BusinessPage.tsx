import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, TextArea, TextInput } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { useBusiness } from '../../context/BusinessContext'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { businessService } from '../../services'
import type { BankAccount, Business } from '../../types'

function BusinessForm(props: { business: Business }) {
  const shared = useBusiness()
  const { busy, run } = useAction()
  const source = props.business
  const [name, setName] = useState(source.name)
  const [phone, setPhone] = useState(source.phone)
  const [address, setAddress] = useState(source.address)
  const [about, setAbout] = useState(source.about)
  const [logo, setLogo] = useState(source.logo)
  const [lat, setLat] = useState(String(source.lat))
  const [lng, setLng] = useState(String(source.lng))
  const [banks, setBanks] = useState<BankAccount[]>(source.banks)
  const [error, setError] = useState('')

  function updateBank(index: number, patch: Partial<BankAccount>) {
    setBanks(
      banks.map(function (bank, position) {
        return position === index ? { ...bank, ...patch } : bank
      }),
    )
  }

  function bankField(index: number, field: keyof BankAccount) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      updateBank(index, { [field]: event.target.value })
    }
  }

  function removeBank(index: number) {
    return function () {
      setBanks(
        banks.filter(function (_bank, position) {
          return position !== index
        }),
      )
    }
  }

  function addBank() {
    setBanks([...banks, { bank: '', accountNumber: '', holder: '' }])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const latValue = Number(lat)
    const lngValue = Number(lng)
    if (name.trim().length < 3) return setError('Isi nama usaha minimal 3 karakter.')
    if (phone.trim().length < 6) return setError('Isi nomor telepon usaha.')
    if (address.trim().length < 5) return setError('Isi alamat lokasi penjualan.')
    if (Number.isNaN(latValue) || latValue < -90 || latValue > 90) return setError('Garis lintang harus berupa angka antara -90 dan 90.')
    if (Number.isNaN(lngValue) || lngValue < -180 || lngValue > 180) return setError('Garis bujur harus berupa angka antara -180 dan 180.')
    for (const bank of banks) {
      if (bank.bank.trim().length < 2 || bank.accountNumber.trim().length < 5 || bank.holder.trim().length < 2) {
        return setError('Lengkapi nama bank, nomor rekening, dan atas nama, atau hapus baris yang kosong.')
      }
    }
    setError('')

    const result = await run(function () {
      return businessService.save({ name: name.trim(), phone: phone.trim(), address: address.trim(), about: about.trim(), logo, lat: latValue, lng: lngValue, banks })
    }, 'Profil usaha disimpan.')
    if (result.ok) await shared.refresh()
  }

  function bind(setter: (value: string) => void) {
    return function (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
      setter(event.target.value)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card className="space-y-4">
        <ImagePicker value={logo} onChange={setLogo} name={name} shape="square" label="Pilih logo" />
        <Field label="Nama usaha">
          <TextInput value={name} onChange={bind(setName)} />
        </Field>
        <Field label="Telepon">
          <TextInput value={phone} onChange={bind(setPhone)} type="tel" inputMode="tel" />
        </Field>
        <Field label="Alamat lokasi penjualan">
          <TextInput value={address} onChange={bind(setAddress)} />
        </Field>
        <Field label="Tentang usaha">
          <TextArea value={about} onChange={bind(setAbout)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Garis lintang dermaga">
            <TextInput value={lat} onChange={bind(setLat)} inputMode="decimal" />
          </Field>
          <Field label="Garis bujur dermaga">
            <TextInput value={lng} onChange={bind(setLng)} inputMode="decimal" />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Rekening transfer</h2>
        {banks.map(function (bank, index) {
          return (
            <div key={index} className="grid gap-2 rounded-2xl bg-sea-50 p-3 sm:grid-cols-[0.7fr_1fr_1fr_auto]">
              <TextInput value={bank.bank} onChange={bankField(index, 'bank')} placeholder="Bank" aria-label="Bank" />
              <TextInput value={bank.accountNumber} onChange={bankField(index, 'accountNumber')} placeholder="Nomor rekening" aria-label="Nomor rekening" />
              <TextInput value={bank.holder} onChange={bankField(index, 'holder')} placeholder="Atas nama" aria-label="Atas nama" />
              <Button variant="danger" aria-label="Hapus rekening" icon={<Trash2 className="size-4" />} onClick={removeBank(index)} className="!size-11 !p-0" />
            </div>
          )
        })}
        {banks.length < 5 ? (
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={addBank}>
            Tambah rekening
          </Button>
        ) : null}
      </Card>

      {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
      <Button type="submit" size="lg" loading={busy} icon={<Save className="size-5" />}>
        Simpan
      </Button>
    </form>
  )
}

export function BusinessPage() {
  const business = useLoad(businessService.get, [])
  if (business.loading) return <Spinner label="Memuat profil usaha" />
  if (business.error || !business.data) return <ErrorState message={business.error || 'Profil usaha tidak dapat dimuat.'} onRetry={business.reload} />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profil usaha" />
      <BusinessForm business={business.data} />
    </div>
  )
}
