import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Eraser } from 'lucide-react'
import { Avatar, ErrorState, Spinner } from '../../components/ui/Display'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useLoad } from '../../hooks/useLoad'
import { assistantService } from '../../services'
import { timeOnly } from '../../utils/format'
import type { AssistantProfile, ChatMessage, Intent } from '../../types'

const QUICK_QUESTIONS = ['Ikan apa saja yang tersedia?', 'Kapan kapal tiba?', 'Bagaimana cara memesan?']

function Bubble(props: { message: ChatMessage; profile: AssistantProfile }) {
  const mine = props.message.role === 'user'
  return (
    <div className={'flex items-end gap-2 ' + (mine ? 'justify-end' : 'justify-start')}>
      {mine ? null : <Avatar name={props.profile.name} src={props.profile.avatar} size={32} />}
      <div className={'max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ' + (mine ? 'rounded-br-lg bg-sea-900 text-white' : 'rounded-bl-lg bg-white text-sea-950')}>
        <p className="whitespace-pre-wrap break-words">{props.message.content}</p>
        <p className={'mt-1 text-[10px] font-semibold ' + (mine ? 'text-sea-300' : 'text-sea-400')}>{timeOnly(props.message.at)}</p>
      </div>
    </div>
  )
}

function IntentActions(props: { intent: Intent }) {
  if (props.intent !== 'antrean_pemesanan') return null
  return (
    <div className="flex gap-2 pl-10">
      <Link to="/antrean" className="rounded-full bg-teal-100 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-200">
        Ambil nomor
      </Link>
      <Link to="/katalog" className="rounded-full bg-coral-100 px-4 py-2 text-xs font-bold text-coral-700 hover:bg-coral-200">
        Pre-order
      </Link>
    </div>
  )
}

export function AssistantPage() {
  const toast = useToast()
  const profile = useLoad(assistantService.profile, [])
  const history = useLoad(assistantService.history, [])
  const [pending, setPending] = useState<ChatMessage[]>([])
  const [lastIntent, setLastIntent] = useState<Intent | ''>('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const messages = [...(history.data || []), ...pending]

  useEffect(
    function scrollToEnd() {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    },
    [messages.length, sending],
  )

  async function send(content: string) {
    const message = content.trim()
    if (!message || sending) return
    setText('')
    setSending(true)
    const optimistic: ChatMessage = { id: 'tmp-' + Date.now(), role: 'user', content: message, intent: '', at: new Date().toISOString() }
    setPending([optimistic])
    try {
      const result = await assistantService.chat(message)
      await history.reload()
      setPending([])
      setLastIntent(result.intent)
    } catch (failure) {
      setPending([])
      setText(message)
      toast.error((failure as Error).message)
    } finally {
      setSending(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    send(text)
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    setText(event.target.value)
  }

  function quick(question: string) {
    return function () {
      send(question)
    }
  }

  async function clearAll() {
    try {
      await assistantService.clearHistory()
      await history.reload()
      setLastIntent('')
      toast.success('Riwayat percakapan dihapus.')
    } catch (failure) {
      toast.error((failure as Error).message)
    }
    setConfirmClear(false)
  }

  function askClear() {
    setConfirmClear(true)
  }

  function closeClear() {
    setConfirmClear(false)
  }

  if (profile.loading || history.loading) return <Spinner label="Memuat asisten" />
  if (profile.error || !profile.data) return <ErrorState message={profile.error || 'Asisten tidak dapat dimuat.'} onRetry={profile.reload} />

  const assistant = profile.data

  return (
    <div className="mx-auto flex h-[calc(100dvh-10.5rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-sea-100 bg-sea-50 shadow-sm lg:h-[calc(100dvh-8.5rem)]">
      <div className="flex items-center gap-3 border-b border-sea-100 bg-white px-5 py-3.5">
        <Avatar name={assistant.name} src={assistant.avatar} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold leading-tight">{assistant.name}</p>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
            <span className={'size-2 rounded-full ' + (assistant.enabled ? 'bg-teal-400' : 'bg-sea-300')} />
            {assistant.enabled ? 'Online' : 'Nonaktif'}
          </p>
        </div>
        {messages.length > 0 ? (
          <button type="button" onClick={askClear} aria-label="Hapus riwayat" className="rounded-xl p-2.5 text-sea-500 hover:bg-sea-100">
            <Eraser className="size-5" />
          </button>
        ) : null}
      </div>

      <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-5">
        <div className="flex items-end gap-2">
          <Avatar name={assistant.name} src={assistant.avatar} size={32} />
          <div className="max-w-[82%] rounded-3xl rounded-bl-lg bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">{assistant.greeting}</div>
        </div>
        {messages.map(function (message) {
          return <Bubble key={message.id} message={message} profile={assistant} />
        })}
        {sending ? (
          <div className="flex items-end gap-2">
            <Avatar name={assistant.name} src={assistant.avatar} size={32} />
            <div className="flex gap-1.5 rounded-3xl rounded-bl-lg bg-white px-5 py-4 shadow-sm" aria-label="Asisten sedang mengetik">
              {[0, 1, 2].map(function (index) {
                return <span key={index} className="size-2 animate-bounce rounded-full bg-sea-300" style={{ animationDelay: index * 0.15 + 's' }} />
              })}
            </div>
          </div>
        ) : null}
        {!sending && lastIntent ? <IntentActions intent={lastIntent} /> : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-sea-100 bg-white px-4 pb-4 pt-3">
        {messages.length === 0 ? (
          <div className="scroll-thin mb-3 flex gap-2 overflow-x-auto">
            {QUICK_QUESTIONS.map(function (question) {
              return (
                <button key={question} type="button" onClick={quick(question)} disabled={sending || !assistant.enabled} className="shrink-0 rounded-full bg-sea-100 px-4 py-2 text-xs font-bold text-sea-700 hover:bg-sea-200 disabled:opacity-50">
                  {question}
                </button>
              )
            })}
          </div>
        ) : null}
        <form onSubmit={submit} className="flex items-center gap-2">
          <input value={text} onChange={onChange} maxLength={500} disabled={!assistant.enabled} placeholder={assistant.enabled ? 'Tulis pertanyaan' : 'Asisten sedang dinonaktifkan'} className="h-12 min-w-0 flex-1 rounded-2xl border border-sea-200 bg-sea-50 px-4 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/15 disabled:opacity-60" />
          <Button type="submit" variant="accent" loading={sending} disabled={!text.trim() || !assistant.enabled} aria-label="Kirim" className="!size-12 !rounded-2xl !p-0" icon={<ArrowUp className="size-5" />} />
        </form>
      </div>

      <ConfirmDialog open={confirmClear} title="Hapus riwayat" message="Seluruh percakapan Anda dengan asisten akan dihapus." confirmLabel="Hapus" onConfirm={clearAll} onClose={closeClear} />
    </div>
  )
}

