import { useState } from 'react'
import { Download, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, EmptyState, ErrorState, PageHeader, Spinner, StatTile } from '../../components/ui/Display'
import { TextInput } from '../../components/ui/Field'
import { useLoad } from '../../hooks/useLoad'
import { saleService } from '../../services'
import { downloadCsv } from '../../utils/csv'
import { kilogram, monthInput, rupiah } from '../../utils/format'
import type { Report } from '../../types'

function BarList(props: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...props.rows.map(function (row) {
    return row.value
  }))
  return (
    <div className="space-y-3">
      {props.rows.map(function (row) {
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-bold">{row.label}</span>
              <span className="shrink-0 font-semibold text-sea-600">{row.display}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-sea-100">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-sea-600" style={{ width: Math.max(3, (row.value / max) * 100) + '%' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayChart(props: { data: Report['byDay'] }) {
  const max = Math.max(1, ...props.data.map(function (entry) {
    return entry.total
  }))
  return (
    <div className="scroll-thin flex h-48 items-end gap-2 overflow-x-auto pb-1">
      {props.data.map(function (entry) {
        return (
          <div key={entry.day} className="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1.5" title={rupiah(entry.total)}>
            <div className="w-full rounded-t-lg bg-gradient-to-t from-sea-700 to-teal-400" style={{ height: Math.max(4, (entry.total / max) * 100) + '%' }} />
            <span className="text-[10px] font-bold text-sea-500">{entry.day.slice(8)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ReportsPage() {
  const [month, setMonth] = useState(monthInput())
  const report = useLoad(
    function () {
      return saleService.report(month)
    },
    [month],
  )

  function onMonth(event: React.ChangeEvent<HTMLInputElement>) {
    setMonth(event.target.value || monthInput())
  }

  function exportCsv(data: Report) {
    return function () {
      const rows: (string | number)[][] = [['Laporan penjualan', data.month], [], ['Ikan', 'Berat (kg)', 'Penjualan']]
      for (const fish of data.byFish) rows.push([fish.name, fish.kg, fish.total])
      rows.push([], ['Total penjualan', data.totalSales], ['Jumlah transaksi', data.totalOrders], ['Rata-rata transaksi', data.averageOrder])
      downloadCsv('laporan-' + data.month + '.csv', rows)
    }
  }

  const data = report.data

  return (
    <div>
      <PageHeader
        title="Laporan"
        actions={
          <>
            <TextInput type="month" value={month} onChange={onMonth} aria-label="Bulan" className="!w-44" />
            <Button variant="secondary" icon={<Download className="size-4" />} disabled={!data || data.totalOrders === 0} onClick={data ? exportCsv(data) : undefined}>
              CSV
            </Button>
          </>
        }
      />

      {report.loading ? <Spinner label="Menyusun laporan" /> : null}
      {report.error ? <ErrorState message={report.error} onRetry={report.reload} /> : null}

      {data && !report.loading ? (
        data.totalOrders === 0 ? (
          <EmptyState title="Belum ada transaksi pada bulan ini" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile tone="dark" label="Total penjualan" value={rupiah(data.totalSales)} icon={<Wallet className="size-4" />} />
              <StatTile label="Jumlah transaksi" value={String(data.totalOrders)} icon={<Receipt className="size-4" />} />
              <StatTile label="Rata-rata transaksi" value={rupiah(data.averageOrder)} icon={<TrendingUp className="size-4" />} />
            </div>

            <Card>
              <h2 className="mb-5 font-display text-xl font-semibold">Penjualan harian</h2>
              <DayChart data={data.byDay} />
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <h2 className="mb-5 font-display text-xl font-semibold">Penjualan per jenis ikan</h2>
                <BarList
                  rows={data.byFish.map(function (fish) {
                    return { label: fish.name, value: fish.total, display: kilogram(fish.kg) + ' - ' + rupiah(fish.total) }
                  })}
                />
              </Card>
              <Card>
                <h2 className="mb-5 font-display text-xl font-semibold">Jam tersibuk</h2>
                <BarList
                  rows={data.byHour.map(function (entry) {
                    return { label: entry.hour + ':00', value: entry.count, display: entry.count + ' transaksi' }
                  })}
                />
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-sea-100 pt-5 text-center">
                  <div className="rounded-2xl bg-sea-50 p-3">
                    <p className="font-display text-3xl font-semibold">{data.bySource.dermaga}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-sea-500">Dermaga</p>
                  </div>
                  <div className="rounded-2xl bg-teal-50 p-3">
                    <p className="font-display text-3xl font-semibold">{data.bySource.aplikasi}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Pre-order</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}
