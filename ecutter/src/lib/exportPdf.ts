import { PDFDocument, rgb } from 'pdf-lib'
import type { CardResult } from './crop'
import { layout, type PrintOptions } from './layouts'
import { mmToPt } from './units'

export interface ExportOptions extends PrintOptions {
  /** Thin grey outline around each card to guide the scissors. */
  trimLines: boolean
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? b.arrayBuffer().then(resolve, reject) : reject(new Error('Image banana fail'))), 'image/jpeg', 0.95),
  )
}

/** Builds a print-ready PDF at exact physical size (print at 100% / Actual size). */
export async function buildPrintPdf(cards: CardResult[], opts: ExportOptions): Promise<Uint8Array> {
  const plan = layout(cards.map((c) => ({ hasBack: !!c.back })), opts)
  const doc = await PDFDocument.create()
  doc.setTitle('ID card print')
  doc.setProducer('e-Cutter')

  const pageW = mmToPt(plan.page.w)
  const pageH = mmToPt(plan.page.h)
  const pages = Array.from({ length: plan.pages }, () => doc.addPage([pageW, pageH]))

  const images = await Promise.all(
    cards.map(async (c) => ({
      front: await doc.embedJpg(await canvasToJpeg(c.front)),
      back: c.back ? await doc.embedJpg(await canvasToJpeg(c.back)) : undefined,
    })),
  )

  for (const p of plan.placements) {
    const img = images[p.card][p.side]!
    const x = mmToPt(p.x)
    const w = mmToPt(p.w)
    const h = mmToPt(p.h)
    // pdf-lib's origin is bottom-left; layouts measure from the top
    const y = pageH - mmToPt(p.y) - h
    pages[p.page].drawImage(img, { x, y, width: w, height: h })
    if (opts.trimLines) {
      pages[p.page].drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.4 })
    }
  }
  return doc.save()
}
