import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, KeyRound, MessageSquare, Save, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Display'
import { Field, SelectInput, TextArea, TextInput, Toggle } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { ConfirmDialog } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { useAction } from '../../hooks/useAction'
import { useLoad } from '../../hooks/useLoad'
import { assistantService } from '../../services'
import { dateTime } from '../../utils/format'
import type { AssistantSettings, Conversation } from '../../types'

const INTENT_LABEL: Record<string, string> = {
  produk_harga: 'Produk dan harga',
  jadwal_lokasi: 'Jadwal dan lokasi',
  antrean_pemesanan: 'Antrean dan pesanan',
  keluhan: 'Keluhan',
  luar_konteks: 'Di luar konteks',
}

function SettingsForm(props: { settings: AssistantSettings; onSaved: () => Promise<void> }) {
  const source = props.settings
  const { busy, run } = useAction()
  const [name, setName] = useState(source.name)
  const [avatar, setAvatar] = useState(source.avatar)
  const [greeting, setGreeting] = useState(source.greeting)
  const [instruction, setInstruction] = useState(source.instruction)
  const [model, setModel] = useState(source.model)
  const [thinking, setThinking] = useState(source.thinking)
  const [enabled, setEnabled] = useState(source.enabled)
  const [apiKey, setApiKey] = useState('')
  const [removeOpen, setRemoveOpen] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return setError('Isi nama asisten minimal 2 karakter.')
    if (greeting.trim().length < 3) return setError('Isi kalimat pembuka.')
    if (apiKey && apiKey.trim().length < 8) return setError('API key terlalu pendek.')
    setError('')
    const result = await run(function () {
      return assistantService.saveSettings({ name: name.trim(), avatar, greeting: greeting.trim(), instruction: instruction.trim(), model, thinking, enabled, apiKey: apiKey.trim() || undefined })
    }, 'Pengaturan asisten disimpan.')
    if (result.ok) {
      setApiKey('')
      await props.onSaved()
    }
  }

  async function removeKey() {
    const result = await run(assistantService.removeKey, 'API key dihapus.')
    setRemoveOpen(false)
    if (result.ok) await props.onSaved()
  }

  function bind(setter: (value: string) => void) {
    return function (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
      setter(event.target.value)
    }
  }

  function openRemove() {
    setRemoveOpen(true)
  }

  function closeRemove() {
    setRemoveOpen(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card className="space-y-4">
        <ImagePicker value={avatar} onChange={setAvatar} name={name} />
        <Field label="Nama asisten">
          <TextInput value={name} onChange={bind(setName)} />
        </Field>
        <Field label="Kalimat pembuka">
          <TextArea value={greeting} onChange={bind(setGreeting)} />
        </Field>
        <Field label="Gaya bahasa">
          <TextArea value={instruction} onChange={bind(setInstruction)} className="min-h-20" />
        </Field>
        <Toggle label="Asisten aktif" checked={enabled} onChange={setEnabled} />
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Layanan AI</h2>
          <Badge tone={source.hasKey ? 'success' : 'danger'}>{source.hasKey ? 'Key ' + source.keyHint : 'Key belum diisi'}</Badge>
        </div>
        <Field label="API key baru">
          <TextInput type="password" value={apiKey} onChange={bind(setApiKey)} placeholder="Tempel API key untuk mengganti" autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Model">
            <SelectInput value={model} onChange={bind(setModel)}>
              <option value="deepseek-flash">deepseek-flash</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
            </SelectInput>
          </Field>
          <div className="self-end">
            <Toggle label="Mode berpikir" checked={thinking} onChange={setThinking} />
          </div>
        </div>
        {source.hasKey ? (
          <Button size="sm" variant="danger" icon={<KeyRound className="size-4" />} onClick={openRemove}>
            Hapus API key
          </Button>
        ) : null}
      </Card>

      {error ? <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p> : null}
      <Button type="submit" size="lg" loading={busy} icon={<Save className="size-5" />}>
        Simpan
      </Button>
      <ConfirmDialog open={removeOpen} title="Hapus API key" message="Asisten tidak dapat menjawab sampai API key baru diisi." confirmLabel="Hapus" busy={busy} onConfirm={removeKey} onClose={closeRemove} />
    </form>
  )
}

function ConversationViewer(props: { conversation: Conversation; onBack: () => void; onRemoved: () => Promise<void> }) {
  const { conversation } = props
  const messages = useLoad(
    function () {
      return assistantService.conversation(conversation.userId)
    },
    [conversation.userId],
  )
  const { busy, run } = useAction()
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function remove() {
    const result = await run(function () {
      return assistantService.removeConversation(conversation.userId)
    }, 'Percakapan dihapus.')
    setConfirmOpen(false)
    if (result.ok) {
      await props.onRemoved()
      props.onBack()
    }
  }

  function openConfirm() {
    setConfirmOpen(true)
  }

  function closeConfirm() {
    setConfirmOpen(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={props.onBack}>
          Kembali
        </Button>
        <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={openConfirm}>
          Hapus
        </Button>
      </div>
      <Card className="space-y-3">
        <p className="font-display text-xl font-semibold">{conversation.username}</p>
        {messages.loading ? <Spinner /> : null}
        {messages.error ? <ErrorState message={messages.error} onRetry={messages.reload} /> : null}
        {(messages.data || []).map(function (message) {
          const mine = message.role === 'user'
          return (
            <div key={message.id} className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ' + (mine ? 'bg-sea-900 text-white' : 'bg-sea-100 text-sea-950')}>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className="mt-1 flex items-center gap-2 text-[10px] font-semibold opacity-70">
                  {dateTime(message.at)}
                  {mine && message.intent ? <span>{INTENT_LABEL[message.intent]}</span> : null}
                </p>
              </div>
            </div>
          )
        })}
      </Card>
      <ConfirmDialog open={confirmOpen} title="Hapus percakapan" message="Seluruh riwayat percakapan pengguna ini akan dihapus." confirmLabel="Hapus" busy={busy} onConfirm={remove} onClose={closeConfirm} />
    </div>
  )
}

function ConversationList() {
  const list = useLoad(assistantService.conversations, [], 15000)
  const [selected, setSelected] = useState<Conversation | undefined>(undefined)

  function open(conversation: Conversation) {
    return function () {
      setSelected(conversation)
    }
  }

  function back() {
    setSelected(undefined)
  }

  if (list.loading) return <Spinner label="Memuat riwayat" />
  if (list.error || !list.data) return <ErrorState message={list.error || 'Riwayat tidak dapat dimuat.'} onRetry={list.reload} />
  if (selected) return <ConversationViewer conversation={selected} onBack={back} onRemoved={list.reload} />
  if (list.data.length === 0) return <EmptyState title="Belum ada percakapan" icon={<MessageSquare className="size-6" />} />

  return (
    <div className="space-y-3">
      {list.data.map(function (conversation) {
        const complaints = conversation.intents.keluhan || 0
        return (
          <button key={conversation.userId} type="button" onClick={open(conversation)} className="block w-full text-left">
            <Card className="flex items-center gap-4 !p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <Avatar name={conversation.username} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{conversation.username}</p>
                <p className="text-xs text-sea-400">{dateTime(conversation.lastAt)}</p>
              </div>
              {complaints > 0 ? <Badge tone="danger">{complaints} keluhan</Badge> : null}
              <Badge>{conversation.count} pesan</Badge>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

export function AssistantAdminPage() {
  const settings = useLoad(assistantService.settings, [])
  const [tab, setTab] = useState('pengaturan')

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Asisten AI" />
      <Tabs
        options={[
          { value: 'pengaturan', label: 'Pengaturan' },
          { value: 'riwayat', label: 'Riwayat percakapan' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-5">
        {tab === 'pengaturan' ? (
          settings.loading ? (
            <Spinner label="Memuat pengaturan" />
          ) : settings.error || !settings.data ? (
            <ErrorState message={settings.error || 'Pengaturan tidak dapat dimuat.'} onRetry={settings.reload} />
          ) : (
            <SettingsForm settings={settings.data} onSaved={settings.reload} />
          )
        ) : (
          <ConversationList />
        )}
      </div>
    </div>
  )
}
