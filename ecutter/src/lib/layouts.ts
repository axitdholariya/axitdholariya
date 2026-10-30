import { CARD_MM } from './units'

export type PrintType = 'a4' | '4x6' | '4x6-duplex'

export interface PrintOptions {
  type: PrintType
  /** Duplex only: which side goes through the printer first. */
  frontFirst?: boolean
}

export interface CardSides {
  hasBack: boolean
}

export interface Placement {
  page: number
  card: number
  side: 'front' | 'back'
  /** millimetres from the top-left corner of the page */
  x: number
  y: number
  w: number
  h: number
}

export interface Layout {
  page: { w: number; h: number }
  pages: number
  placements: Placement[]
}

export const PAGE_MM = {
  a4: { w: 210, h: 297 },
  '4x6': { w: 101.6, h: 152.4 },
} as const

const A4_MARGIN = 8
const GAP = 4
const { w: CW, h: CH } = CARD_MM

export const A4_ROWS = Math.floor((PAGE_MM.a4.h - 2 * A4_MARGIN + GAP) / (CH + GAP))

/** Pure geometry: where every card side lands on which page. */
export function layout(cards: CardSides[], opts: PrintOptions): Layout {
  if (opts.type === 'a4') return layoutA4(cards)
  if (opts.type === '4x6') return layout4x6(cards)
  return layoutDuplex(cards, opts.frontFirst ?? true)
}

/** One row per card: front on the left, back on the right. */
function layoutA4(cards: CardSides[]): Layout {
  const page = PAGE_MM.a4
  const x0 = (page.w - (2 * CW + GAP)) / 2
  const placements: Placement[] = []
  cards.forEach((c, card) => {
    const pageNo = Math.floor(card / A4_ROWS)
    const y = A4_MARGIN + (card % A4_ROWS) * (CH + GAP)
    placements.push({ page: pageNo, card, side: 'front', x: x0, y, w: CW, h: CH })
    if (c.hasBack) placements.push({ page: pageNo, card, side: 'back', x: x0 + CW + GAP, y, w: CW, h: CH })
  })
  return { page, pages: Math.ceil(cards.length / A4_ROWS), placements }
}

/** One card per 4x6 sheet, front above back, centred. */
function layout4x6(cards: CardSides[]): Layout {
  const page = PAGE_MM['4x6']
  const gap = 6
  const x = (page.w - CW) / 2
  const placements: Placement[] = []
  cards.forEach((c, card) => {
    const total = c.hasBack ? 2 * CH + gap : CH
    const y = (page.h - total) / 2
    placements.push({ page: card, card, side: 'front', x, y, w: CW, h: CH })
    if (c.hasBack) placements.push({ page: card, card, side: 'back', x, y: y + CH + gap, w: CW, h: CH })
  })
  return { page, pages: cards.length, placements }
}

/**
 * Double-sided glossy 4x6: each side alone on its own sheet, dead centre,
 * so the two faces line up whichever way the printer flips the paper.
 */
function layoutDuplex(cards: CardSides[], frontFirst: boolean): Layout {
  const page = PAGE_MM['4x6']
  const x = (page.w - CW) / 2
  const y = (page.h - CH) / 2
  const placements: Placement[] = []
  let pageNo = 0
  cards.forEach((c, card) => {
    const order: Placement['side'][] = c.hasBack ? (frontFirst ? ['front', 'back'] : ['back', 'front']) : ['front']
    for (const side of order) placements.push({ page: pageNo++, card, side, x, y, w: CW, h: CH })
  })
  return { page, pages: pageNo, placements }
}
