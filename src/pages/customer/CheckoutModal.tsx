import { useState } from 'react'
import { Banknote, Landmark, MapPin, Truck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Field, SelectInput, TextArea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useBusiness } from '../../context/BusinessContext'
import { useAction } from '../../hooks/useAction'
import { orderService } from '../../services'
import type { OrderInput } from '../../services'
import { kilogram, rupiah } from '../../utils/format'
import { parseWeight } from './CatalogPage'
import type { Fish } from '../../types'

interface CheckoutProps {
  open: boolean
  fishes: Fish[]
  quantities: Record<string, string>
  onClose: () => void
  onDone: () => void
}

function OptionCard(props: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string }) {
  return (
    <button type="button" onClick={props.onClick} aria-pressed={props.active} className={'flex flex-1 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ' + (props.active ? 'border-teal-500 bg-teal-50 text-sea-950' : 'border-sea-100 bg-white text-sea-600 hover:border-sea-200')}>
      <span className={'grid size-9 place-items-center rounded-xl ' + (props.active ? 'bg-teal-400 text-sea-950' : 'bg-sea-100')}>{props.icon}</span>
      {props.title}
    </button>
  )
}

export function CheckoutModal(props: CheckoutProps) {
  const { business } = useBusiness()
  const { busy, run } = useAction()
  const [delivery, setDelivery] = useState<'dermaga' | 'antar'>('dermaga')
  const [payment, setPayment] = useState<'cod' | 'transfer'>('cod')
  const [bankIndex, setBankIndex] = useState(0)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const items = props.fishes.map(function (fish) {
    const kg = parseWeight(props.quantities[fish.id])
    return { fish, kg, subtotal: Math.round(fish.price * kg) }
  })
  const total = items.reduce(function (sum, item) {
    return sum + item.subtotal
  }, 0)
  const bank = business.banks[bankIndex]

  function pickDelivery(value: 'dermaga' | 'antar') {
    return function () {
      setDelivery(value)
    }
  }

  function pickPayment(value: 'cod' | 'transfer') {
    return function () {
      setPayment(value)
    }
  }

  function changeBank(event: React.ChangeEvent<HTMLSelectElement>) {
    setBankIndex(Number(event.target.value))
  }

  function changeAddress(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setAddress(event.target.value)
  }

  function changeNote(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(event.target.value)
  }

  async function submit() {
    if (delivery === 'antar' && address.trim().length < 5) {
      setError('Isi alamat pengantaran dengan lengkap.')
      return
    }
    if (payment === 'transfer' && !bank) {
      setError('Rekening transfer belum tersedia. Pilih COD.')
      return
    }
    setError('')
    const input: OrderInput = {
      items: items.map(function (item) {
        return { fishId: item.fish.id, kg: item.kg }
      }),
      payment,
      bank: payment === 'transfer' && bank ? bank.bank : '',
      delivery,
      address: delivery === 'antar' ? address.trim() : '',
      note: note.trim(),
    }
    const result = await run(function () {
      return orderService.create(input)
    }, 'Pesanan terkirim. Menunggu konfirmasi admin.')
    if (result.ok) props.onDone()
  }

  return (
    <Modal open={props.open} title="Konfirmasi pesanan" onClose={props.onClose} wide>
      <div className="space-y-6">
        <div className="divide-y divide-sea-100 rounded-2xl border border-sea-100">
          {items.map(function (item) {
            return (
              <div key={item.fish.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-bold">{item.fish.name}</p>
                  <p className="text-sea-500">
                    {kilogram(item.kg)} x {rupiah(item.fish.price)}
                  </p>
                </div>
                <p className="font-bold">{rupiah(item.subtotal)}</p>
              </div>
            )
          })}
          <div className="flex items-center justify-between bg-sea-50 px-4 py-3">
            <p className="font-bold text-sea-700">Total</p>
            <p className="font-display text-2xl font-semibold">{rupiah(total)}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-sea-800">Pengambilan</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <OptionCard active={delivery === 'dermaga'} onClick={pickDelivery('dermaga')} icon={<MapPin className="size-4" />} title="Ambil di dermaga" />
            <OptionCard active={delivery === 'antar'} onClick={pickDelivery('antar')} icon={<Truck className="size-4" />} title="Diantar" />
          </div>
          {delivery === 'antar' ? (
            <Field label="Alamat pengantaran" className="mt-3" hint="Ongkos kirim ditentukan admin saat konfirmasi.">
              <TextArea value={address} onChange={changeAddress} placeholder="Alamat lengkap" />
            </Field>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-sea-800">Pembayaran</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <OptionCard active={payment === 'cod'} onClick={pickPayment('cod')} icon={<Banknote className="size-4" />} title="COD" />
            <OptionCard active={payment === 'transfer'} onClick={pickPayment('transfer')} icon={<Landmark className="size-4" />} title="Transfer" />
          </div>
          {payment === 'transfer' && business.banks.length > 0 ? (
            <div className="mt-3 space-y-3">
              <Field label="Bank tujuan">
                <SelectInput value={bankIndex} onChange={changeBank}>
                  {business.banks.map(function (item, index) {
                    return (
                      <option key={item.bank + index} value={index}>
                        {item.bank}
                      </option>
                    )
                  })}
                </SelectInput>
              </Field>
              {bank ? (
                <div className="rounded-2xl bg-sea-900 px-5 py-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-sea-300">{bank.bank}</p>
                  <p className="font-display text-2xl font-semibold tracking-wide">{bank.accountNumber}</p>
                  <p className="text-sm text-sea-200">a.n. {bank.holder}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <Field label="Catatan (opsional)">
          <TextArea value={note} onChange={changeNote} className="min-h-16" placeholder="Catatan untuk admin" />
        </Field>

        {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={props.onClose}>
            Batal
          </Button>
          <Button variant="accent" loading={busy} onClick={submit}>
            Kirim pesanan
          </Button>
        </div>
      </div>
    </Modal>
  )
}
