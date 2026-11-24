import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBasket } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { FishThumb } from '../../components/FishThumb'
import { CheckoutModal } from './CheckoutModal'
import { useLoad } from '../../hooks/useLoad'
import { fishService } from '../../services'
import { kilogram, rupiah } from '../../utils/format'
import type { Fish } from '../../types'

const STEP = 0.5

export function parseWeight(raw: string): number {
  return Number(raw.replace(',', '.'))
}

export function weightProblem(raw: string, fish: Fish): string {
  if (raw.trim() === '') return ''
  const value = parseWeight(raw)
  if (Number.isNaN(value) || value <= 0) return 'Isi berat dengan angka lebih dari 0.'
  if (value > fish.stock) return 'Melebihi stok tersisa (' + kilogram(fish.stock) + ').'
  return ''
}

export function CatalogPage() {
  const navigate = useNavigate()
  const fishes = useLoad(fishService.list, [], 20000)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [checkout, setCheckout] = useState(false)

  function setQuantity(id: string, value: string) {
    setQuantities({ ...quantities, [id]: value })
  }

  function shift(fish: Fish, direction: number) {
    const current = parseWeight(quantities[fish.id] || '0')
    const base = Number.isNaN(current) ? 0 : current
    const next = Math.max(0, Math.round((base + direction * STEP) * 100) / 100)
    setQuantity(fish.id, next === 0 ? '' : String(next))
  }

  function typed(fish: Fish) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      setQuantity(fish.id, event.target.value)
    }
  }

  function increase(fish: Fish) {
    return function () {
      shift(fish, 1)
    }
  }

  function decrease(fish: Fish) {
    return function () {
      shift(fish, -1)
    }
  }

  function openCheckout() {
    setCheckout(true)
  }

  function closeCheckout() {
    setCheckout(false)
  }

  function finished() {
    setCheckout(false)
    setQuantities({})
    navigate('/pesanan')
  }

  if (fishes.loading) return <Spinner label="Memuat katalog" />
  if (fishes.error || !fishes.data) return <ErrorState message={fishes.error || 'Katalog tidak dapat dimuat.'} onRetry={fishes.reload} />

  const list = fishes.data
  const selected = list.filter(function (fish) {
    const value = parseWeight(quantities[fish.id] || '')
    return value > 0 && !Number.isNaN(value)
  })
  const hasProblem = list.some(function (fish) {
    return weightProblem(quantities[fish.id] || '', fish) !== ''
  })
  const total = selected.reduce(function (sum, fish) {
    return sum + fish.price * parseWeight(quantities[fish.id])
  }, 0)

  return (
    <div className="pb-28">
      <PageHeader title="Katalog ikan" />
      {list.length === 0 ? (
        <EmptyState title="Belum ada ikan tersedia" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(function (fish) {
            const soldOut = fish.stock <= 0
            const raw = quantities[fish.id] || ''
            const problem = weightProblem(raw, fish)
            return (
              <article key={fish.id} className={'overflow-hidden rounded-[1.75rem] border bg-white shadow-sm transition ' + (raw && !problem ? 'border-teal-400 ring-4 ring-teal-400/15' : 'border-sea-100')}>
                <div className="relative">
                  <FishThumb src={fish.image} name={fish.name} className="aspect-[16/10] w-full" />
                  <div className="absolute left-3 top-3">{soldOut ? <Badge tone="danger">Habis</Badge> : <Badge tone="success">Stok {kilogram(fish.stock)}</Badge>}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold">{fish.name}</h3>
                    <p className="font-bold text-teal-700">
                      {rupiah(fish.price)}
                      <span className="text-xs font-semibold text-sea-500">/kg</span>
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={decrease(fish)} disabled={soldOut} aria-label={'Kurangi ' + fish.name} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sea-100 text-sea-800 transition hover:bg-sea-200 disabled:opacity-40">
                      <Minus className="size-4" />
                    </button>
                    <div className="relative min-w-0 flex-1">
                      <input value={raw} onChange={typed(fish)} disabled={soldOut} inputMode="decimal" placeholder="0" aria-label={'Berat ' + fish.name} className={'h-11 w-full rounded-xl border bg-white pl-3 pr-10 text-center font-bold focus:outline-none focus:ring-4 ' + (problem ? 'border-coral-400 focus:ring-coral-400/20' : 'border-sea-200 focus:border-teal-500 focus:ring-teal-500/15')} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sea-400">kg</span>
                    </div>
                    <button type="button" onClick={increase(fish)} disabled={soldOut} aria-label={'Tambah ' + fish.name} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sea-900 text-white transition hover:bg-sea-800 disabled:opacity-40">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  {problem ? <p className="mt-2 text-xs font-semibold text-coral-600">{problem}</p> : null}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {selected.length > 0 ? (
        <div className="safe-bottom fixed inset-x-0 bottom-[4.6rem] z-20 px-3 lg:bottom-4">
          <div className="rise mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-3xl bg-sea-950 p-3 pl-5 text-white shadow-2xl shadow-sea-950/40">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sea-300">{selected.length} jenis ikan</p>
              <p className="truncate font-display text-xl font-semibold">{rupiah(total)}</p>
            </div>
            <Button variant="accent" size="lg" disabled={hasProblem} icon={<ShoppingBasket className="size-5" />} onClick={openCheckout}>
              Pesan
            </Button>
          </div>
        </div>
      ) : null}

      <CheckoutModal open={checkout} fishes={selected} quantities={quantities} onClose={closeCheckout} onDone={finished} />
    </div>
  )
}
