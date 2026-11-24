import { useState } from 'react'
import { MapPin, Navigation, Phone } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Display'
import { Modal } from '../../components/ui/Modal'
import { useBusiness } from '../../context/BusinessContext'
import { whatsappLink } from '../../utils/format'

export function LocationPage() {
  const { business } = useBusiness()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const span = 0.006
  const bbox = [business.lng - span, business.lat - span, business.lng + span, business.lat + span].join('%2C')
  const mapUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + business.lat + '%2C' + business.lng
  const routeUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + business.lat + ',' + business.lng

  function openRoute() {
    window.open(routeUrl, '_blank', 'noopener')
    setConfirmOpen(false)
  }

  function askRoute() {
    setConfirmOpen(true)
  }

  function closeRoute() {
    setConfirmOpen(false)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Lokasi dermaga" />
      <div className="overflow-hidden rounded-[2rem] border border-sea-100 bg-white shadow-sm">
        <iframe title="Peta lokasi dermaga" src={mapUrl} className="h-80 w-full border-0 sm:h-[26rem]" loading="lazy" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral-100 text-coral-600">
              <MapPin className="size-6" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold">{business.name}</p>
              <p className="text-sm text-sea-600">{business.address}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {business.phone ? (
              <a href={whatsappLink('Halo ' + business.name, business.phone)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-sea-900 ring-1 ring-sea-200 hover:bg-sea-50">
                <Phone className="size-4" />
                Hubungi
              </a>
            ) : null}
            <Button variant="accent" icon={<Navigation className="size-4" />} onClick={askRoute}>
              Buka rute
            </Button>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} title="Buka rute" onClose={closeRoute}>
        <Card className="!border-0 !p-0 !shadow-none">
          <p className="text-sm text-sea-700">Rute menuju {business.name} akan dibuka di Google Maps.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeRoute}>
              Batal
            </Button>
            <Button variant="accent" onClick={openRoute}>
              Buka
            </Button>
          </div>
        </Card>
      </Modal>
    </div>
  )
}
