import { useMemo, useRef, useState } from 'react'
import ManualSelect from './components/ManualSelect'
import { CARD_TYPES, type CardType } from './lib/cardTypes'
import { combineSides, cropCard, findCards, type CardResult, type PageBox } from './lib/crop'
import { downloadBlob, downloadCanvas, printPdf } from './lib/download'
import { buildPrintPdf } from './lib/exportPdf'
import type { PrintType } from './lib/layouts'
import { loadPages, PasswordRequired } from './lib/source'

type Status = 'loading' | 'password' | 'manual' | 'done' | 'error'

interface Job {
  id: number
  file: File
  cardType: CardType
  status: Status
  passwordWrong?: boolean
  error?: string
  pages?: HTMLCanvasElement[]
  result?: CardResult
  selected: boolean
}

const PRINT_TYPES: { id: PrintType; label: string }[] = [
  { id: 'a4', label: 'A4 sheet (front + back, ek line mein)' },
  { id: '4x6', label: '4x6 photo paper (front upar, back neeche)' },
  { id: '4x6-duplex', label: '4x6 double side glossy' },
]

let nextId = 1

function cropBoxes(pages: HTMLCanvasElement[], boxes: PageBox[]): CardResult {
  const [f, b] = boxes
  return { front: cropCard(pages[f.page], f), back: b ? cropCard(pages[b.page], b) : undefined }
}

export default function App() {
  const [cardType, setCardType] = useState(CARD_TYPES[0])
  const [jobs, setJobs] = useState<Job[]>([])
  const [printType, setPrintType] = useState<PrintType>('a4')
  const [frontFirst, setFrontFirst] = useState(true)
  const [trimLines, setTrimLines] = useState(true)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const update = (id: number, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)))

  async function process(job: Job, password?: string) {
    update(job.id, { status: 'loading', passwordWrong: false })
    try {
      const pages = await loadPages(job.file, password)
      const boxes = findCards(pages)
      if (boxes.length < job.cardType.sides) {
        update(job.id, { status: 'manual', pages })
        return
      }
      update(job.id, { status: 'done', pages, result: cropBoxes(pages, boxes.slice(0, job.cardType.sides)) })
    } catch (e) {
      if (e instanceof PasswordRequired) update(job.id, { status: 'password', passwordWrong: e.incorrect })
      else update(job.id, { status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const added = Array.from(files).map<Job>((file) => ({ id: nextId++, file, cardType, status: 'loading', selected: true }))
    setJobs((js) => [...js, ...added])
    added.forEach((j) => process(j))
  }

  const ready = jobs.filter((j) => j.status === 'done' && j.selected && j.result)

  async function makePdf() {
    setBusy(true)
    try {
      return await buildPrintPdf(
        ready.map((j) => j.result!),
        { type: printType, frontFirst, trimLines },
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">
            e-<span className="text-blue-600">Cutter</span>
          </h1>
          <span className="text-xs text-slate-500">ID card crop &amp; print</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          🔒 Aapki file kisi server par upload nahi hoti – sara crop aapke browser ke andar hi hota hai.
        </p>

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium">
            Card type
            <select
              value={cardType.id}
              onChange={(e) => setCardType(CARD_TYPES.find((c) => c.id === e.target.value)!)}
              className="mt-1 block w-full rounded border-slate-300 p-2 sm:w-80"
            >
              {CARD_TYPES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center hover:bg-blue-100"
          >
            <p className="font-medium">PDF / JPG / PNG yahan drop karo ya click karke chuno</p>
            <p className="text-sm text-slate-500">Ek saath kai files bhi chalengi (bulk print ke liye)</p>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              data-testid="file-input"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
        </section>

        {jobs.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cards ({jobs.length})</h2>
              <button onClick={() => setJobs([])} className="text-sm text-red-600 underline">
                Sab hatao
              </button>
            </div>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onPassword={(pw) => process(job, pw)}
                onManual={(boxes) => update(job.id, { status: 'done', result: cropBoxes(job.pages!, boxes) })}
                onRedo={() => update(job.id, { status: 'manual' })}
                onToggle={() => update(job.id, { selected: !job.selected })}
                onRemove={() => setJobs((js) => js.filter((j) => j.id !== job.id))}
              />
            ))}
          </section>
        )}

        {jobs.some((j) => j.status === 'done') && (
          <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Smart Print ({ready.length} card select)</h2>
            <div className="space-y-1">
              {PRINT_TYPES.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="ptype" checked={printType === p.id} onChange={() => setPrintType(p.id)} />
                  {p.label}
                </label>
              ))}
            </div>
            {printType === '4x6-duplex' && (
              <label className="flex items-center gap-2 text-sm">
                Pehle print karo:
                <select value={frontFirst ? 'f' : 'b'} onChange={(e) => setFrontFirst(e.target.value === 'f')} className="rounded p-1">
                  <option value="f">Front</option>
                  <option value="b">Back</option>
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={trimLines} onChange={(e) => setTrimLines(e.target.checked)} />
              Trim line (kaatne ke liye halka border)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!ready.length || busy}
                onClick={async () => printPdf(await makePdf())}
                className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
              >
                🖨️ Print
              </button>
              <button
                disabled={!ready.length || busy}
                onClick={async () => downloadBlob(new Blob([(await makePdf()) as BlobPart], { type: 'application/pdf' }), `idcards-${printType}.pdf`)}
                className="rounded bg-slate-800 px-4 py-2 font-medium text-white disabled:opacity-40"
              >
                ⬇️ PDF download
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Print dialog mein Scale <b>100% / Actual size</b> rakho, "Fit to page" mat chuno – tabhi card sahi size (85.6 × 54 mm) mein aayega.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

interface RowProps {
  job: Job
  onPassword: (pw: string) => void
  onManual: (boxes: PageBox[]) => void
  onRedo: () => void
  onToggle: () => void
  onRemove: () => void
}

function JobRow({ job, onPassword, onManual, onRedo, onToggle, onRemove }: RowProps) {
  const [pw, setPw] = useState('')
  const base = job.file.name.replace(/\.[^.]+$/, '')

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm" data-testid="job" data-status={job.status}>
      <div className="flex items-center gap-3">
        {job.status === 'done' && <input type="checkbox" checked={job.selected} onChange={onToggle} title="Print mein shamil karo" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{job.file.name}</p>
          <p className="text-xs text-slate-500">{job.cardType.name}</p>
        </div>
        {job.status === 'loading' && <span className="text-sm text-blue-600">Process ho raha hai…</span>}
        {job.status === 'done' && (
          <button onClick={onRedo} className="text-sm text-slate-600 underline">
            Galat crop? Khud chuno
          </button>
        )}
        <button onClick={onRemove} className="text-slate-400 hover:text-red-600" title="Hatao">
          ✕
        </button>
      </div>

      {job.status === 'password' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onPassword(pw)
          }}
          className="space-y-2"
        >
          <p className="text-sm">
            {job.passwordWrong ? <span className="text-red-600">Password galat hai. </span> : 'Ye PDF password se locked hai. '}
            {job.cardType.passwordHint && <span className="text-slate-500">Hint: {job.cardType.passwordHint}</span>}
          </p>
          <div className="flex gap-2">
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
              autoComplete="off"
              placeholder="PDF password"
              className="flex-1 rounded border border-slate-300 p-2"
            />
            <button className="rounded bg-blue-600 px-4 py-2 text-white">Kholo</button>
          </div>
        </form>
      )}

      {job.status === 'error' && <p className="text-sm text-red-600">{job.error}</p>}

      {job.status === 'manual' && job.pages && (
        <ManualSelect pages={job.pages} sides={job.cardType.sides} onDone={onManual} onCancel={onRemove} />
      )}

      {job.status === 'done' && job.result && (
        <div className="flex flex-wrap items-start gap-4">
          <Side canvas={job.result.front} label="Front" />
          {job.result.back && <Side canvas={job.result.back} label="Back" />}
          <div className="flex flex-col gap-2 text-sm">
            <button onClick={() => downloadCanvas(job.result!.front, `${base}-front.png`)} className="rounded bg-slate-200 px-3 py-1">
              Front ⬇️
            </button>
            {job.result.back && (
              <button onClick={() => downloadCanvas(job.result!.back!, `${base}-back.png`)} className="rounded bg-slate-200 px-3 py-1">
                Back ⬇️
              </button>
            )}
            <button onClick={() => downloadCanvas(combineSides(job.result!), `${base}-both.png`)} className="rounded bg-slate-200 px-3 py-1">
              Both ⬇️
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Side({ canvas, label }: { canvas: HTMLCanvasElement; label: string }) {
  const src = useMemo(() => canvas.toDataURL('image/jpeg', 0.8), [canvas])
  return (
    <figure className="w-56">
      <img src={src} alt={label} className="w-full rounded border border-slate-200 shadow" />
      <figcaption className="mt-1 text-center text-xs text-slate-500">{label}</figcaption>
    </figure>
  )
}
