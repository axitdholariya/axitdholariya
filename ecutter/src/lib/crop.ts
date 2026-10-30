import { detectCards, type Box } from './detect'
import { CARD_PX } from './units'

export interface CardResult {
  front: HTMLCanvasElement
  back?: HTMLCanvasElement
}

export interface PageBox extends Box {
  page: number
}

/** Width the detector works at – fast, and plenty for finding borders. */
const ANALYSIS_WIDTH = 1200

/** Finds card outlines on every page, in page then reading order. */
export function findCards(pages: HTMLCanvasElement[]): PageBox[] {
  const found: PageBox[] = []
  pages.forEach((src, page) => {
    const scale = Math.min(1, ANALYSIS_WIDTH / src.width)
    const small = document.createElement('canvas')
    small.width = Math.round(src.width * scale)
    small.height = Math.round(src.height * scale)
    const ctx = small.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(src, 0, 0, small.width, small.height)
    const img = ctx.getImageData(0, 0, small.width, small.height)
    for (const b of detectCards(img)) {
      found.push({ page, x: b.x / scale, y: b.y / scale, w: b.w / scale, h: b.h / scale })
    }
  })
  return found
}

/**
 * Cuts a box out of a page and fits it onto an exact CR-80 canvas at print
 * DPI. Portrait cards are turned landscape so every layout can treat cards
 * the same way.
 */
export function cropCard(page: HTMLCanvasElement, box: Box): HTMLCanvasElement {
  const portrait = box.h > box.w
  const out = document.createElement('canvas')
  out.width = CARD_PX.w
  out.height = CARD_PX.h
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.imageSmoothingQuality = 'high'

  const srcW = portrait ? box.h : box.w
  const srcH = portrait ? box.w : box.h
  const s = Math.min(out.width / srcW, out.height / srcH)
  const dw = srcW * s
  const dh = srcH * s

  ctx.save()
  ctx.translate(out.width / 2, out.height / 2)
  if (portrait) ctx.rotate(-Math.PI / 2)
  const w = portrait ? dh : dw
  const h = portrait ? dw : dh
  ctx.drawImage(page, box.x, box.y, box.w, box.h, -w / 2, -h / 2, w, h)
  ctx.restore()
  return out
}

/** Front and back stacked into one image for the "Both" download. */
export function combineSides(card: CardResult): HTMLCanvasElement {
  const gap = 40
  const out = document.createElement('canvas')
  out.width = card.front.width
  out.height = card.front.height + (card.back ? gap + card.back.height : 0)
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(card.front, 0, 0)
  if (card.back) ctx.drawImage(card.back, 0, card.front.height + gap)
  return out
}
