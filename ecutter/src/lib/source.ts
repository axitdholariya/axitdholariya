import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { DPI } from './units'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** e-card PDFs are 1-2 pages; never rasterise a huge upload. */
const MAX_PAGES = 4

export class PasswordRequired extends Error {
  constructor(public incorrect: boolean) {
    super(incorrect ? 'Galat password' : 'Password chahiye')
  }
}

/** Renders an uploaded PDF or image into one canvas per page at print DPI. */
export async function loadPages(file: File, password?: string): Promise<HTMLCanvasElement[]> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return renderPdf(await file.arrayBuffer(), password)
  }
  if (file.type.startsWith('image/')) return [await renderImage(file)]
  throw new Error('Sirf PDF, JPG ya PNG file chalegi')
}

async function renderPdf(data: ArrayBuffer, password?: string) {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), password })
  let doc: pdfjs.PDFDocumentProxy
  try {
    doc = await task.promise
  } catch (e) {
    if (e instanceof Error && e.name === 'PasswordException') {
      throw new PasswordRequired((e as Error & { code: number }).code === pdfjs.PasswordResponses.INCORRECT_PASSWORD)
    }
    throw e
  }
  try {
    const pages: HTMLCanvasElement[] = []
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n)
      const viewport = page.getViewport({ scale: DPI / 72 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      pages.push(canvas)
    }
    return pages
  } finally {
    await task.destroy()
  }
}

async function renderImage(file: File) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas
}
