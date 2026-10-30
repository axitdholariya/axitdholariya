import { useEffect, useRef, useState } from 'react'
import type { PageBox } from '../lib/crop'

interface Props {
  pages: HTMLCanvasElement[]
  sides: 1 | 2
  onDone: (boxes: PageBox[]) => void
  onCancel: () => void
}

const VIEW_W = 720
const COLORS = ['#2563eb', '#16a34a']
const LABELS = ['Front', 'Back']

/** Lets the user drag a box around each card side when auto-detect fails. */
export default function ManualSelect({ pages, sides, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageNo, setPageNo] = useState(0)
  const [boxes, setBoxes] = useState<PageBox[]>([])
  const [drag, setDrag] = useState<PageBox | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const page = pages[pageNo]
  const scale = VIEW_W / page.width
  const step = boxes.length // 0 = front, 1 = back

  useEffect(() => {
    const c = canvasRef.current!
    c.width = VIEW_W
    c.height = Math.round(page.height * scale)
    const ctx = c.getContext('2d')!
    ctx.drawImage(page, 0, 0, c.width, c.height)
    const shown = drag ? [...boxes, drag] : boxes
    shown.forEach((b, i) => {
      if (b.page !== pageNo) return
      ctx.strokeStyle = COLORS[i % 2]
      ctx.lineWidth = 2
      ctx.strokeRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale)
      ctx.fillStyle = COLORS[i % 2]
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(LABELS[i], b.x * scale + 4, b.y * scale + 16)
    })
  }, [page, pageNo, scale, boxes, drag])

  const toPage = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    // the canvas may be shrunk by CSS on small screens
    const k = VIEW_W / r.width
    return { x: ((e.clientX - r.left) * k) / scale, y: ((e.clientY - r.top) * k) / scale }
  }

  const onDown = (e: React.PointerEvent) => {
    if (step >= sides) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = toPage(e)
  }
  const onMove = (e: React.PointerEvent) => {
    const s = dragStart.current
    if (!s) return
    const p = toPage(e)
    setDrag({ page: pageNo, x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) })
  }
  const onUp = () => {
    dragStart.current = null
    if (drag && drag.w > 20 && drag.h > 20) setBoxes([...boxes, drag])
    setDrag(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">
        {step < sides ? (
          <>
            Card apne aap nahi mila. Page par <b style={{ color: COLORS[step] }}>{LABELS[step]}</b> side ke
            charon taraf mouse/ungli se box banao.
          </>
        ) : (
          'Dono box ban gaye. "Crop karo" dabao.'
        )}
      </p>
      {pages.length > 1 && (
        <div className="flex gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setPageNo(i)}
              className={`rounded px-2 py-1 text-sm ${i === pageNo ? 'bg-slate-800 text-white' : 'bg-slate-200'}`}
            >
              Page {i + 1}
            </button>
          ))}
        </div>
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="w-full max-w-[720px] cursor-crosshair touch-none rounded border border-slate-300"
      />
      <div className="flex flex-wrap gap-2">
        <button
          disabled={boxes.length === 0}
          onClick={() => onDone(boxes)}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
        >
          Crop karo
        </button>
        {sides === 2 && boxes.length === 1 && <span className="self-center text-sm text-slate-500">(Back nahi hai to seedha Crop karo)</span>}
        <button onClick={() => setBoxes(boxes.slice(0, -1))} disabled={!boxes.length} className="rounded bg-slate-200 px-4 py-2 disabled:opacity-40">
          Undo
        </button>
        <button onClick={onCancel} className="rounded px-4 py-2 text-slate-600 underline">
          Cancel
        </button>
      </div>
    </div>
  )
}
