import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'
import { OceanArt } from '../../components/OceanArt'
import { useBusiness } from '../../context/BusinessContext'

export function AuthShell(props: { title: string; children: ReactNode }) {
  const { business } = useBusiness()

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sea-950 lg:block">
        <OceanArt />
        <div className="scales absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Logo tone="light" />
          <div className="max-w-md">
            <h2 className="font-display text-5xl font-semibold leading-[1.05] text-white">Ikan segar langsung dari dermaga Sibolga.</h2>
            <p className="mt-5 text-sm font-medium tracking-wide text-teal-100/80">{business.address}</p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="rise w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight">{props.title}</h1>
          <div className="mt-8">{props.children}</div>
        </div>
      </main>
    </div>
  )
}
