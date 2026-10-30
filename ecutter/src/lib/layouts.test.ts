import { describe, expect, it } from 'vitest'
import { A4_ROWS, layout, PAGE_MM, type Placement } from './layouts'

const inside = (p: Placement, page: { w: number; h: number }) => p.x >= 0 && p.y >= 0 && p.x + p.w <= page.w && p.y + p.h <= page.h

const overlap = (a: Placement, b: Placement) =>
  a.page === b.page && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

function checkSane(placements: Placement[], page: { w: number; h: number }) {
  for (const p of placements) expect(inside(p, page)).toBe(true)
  for (let i = 0; i < placements.length; i++)
    for (let j = i + 1; j < placements.length; j++) expect(overlap(placements[i], placements[j])).toBe(false)
}

const cards = (n: number, hasBack = true) => Array.from({ length: n }, () => ({ hasBack }))

describe('layout', () => {
  it('fits A4_ROWS card pairs per A4 page and spills to the next', () => {
    expect(A4_ROWS).toBe(4)
    const l = layout(cards(9), { type: 'a4' })
    expect(l.pages).toBe(3)
    expect(l.placements).toHaveLength(18)
    checkSane(l.placements, PAGE_MM.a4)
    expect(l.placements.filter((p) => p.page === 2)).toHaveLength(2)
  })

  it('puts front left and back right on the same row', () => {
    const [f, b] = layout(cards(1), { type: 'a4' }).placements
    expect(f.side).toBe('front')
    expect(b.side).toBe('back')
    expect(f.y).toBe(b.y)
    expect(f.x).toBeLessThan(b.x)
    expect(f.w).toBe(85.6)
    expect(f.h).toBe(54)
  })

  it('prints single-sided cards without a back slot', () => {
    expect(layout(cards(3, false), { type: 'a4' }).placements).toHaveLength(3)
  })

  it('stacks front over back on 4x6', () => {
    const l = layout(cards(2), { type: '4x6' })
    expect(l.pages).toBe(2)
    checkSane(l.placements, PAGE_MM['4x6'])
    const [f, b] = l.placements
    expect(f.y).toBeLessThan(b.y)
  })

  it('duplex gives every side its own centred sheet in the chosen order', () => {
    const l = layout(cards(2), { type: '4x6-duplex', frontFirst: false })
    expect(l.pages).toBe(4)
    expect(l.placements.map((p) => p.side)).toEqual(['back', 'front', 'back', 'front'])
    for (const p of l.placements) {
      expect(p.x + p.w / 2).toBeCloseTo(PAGE_MM['4x6'].w / 2)
      expect(p.y + p.h / 2).toBeCloseTo(PAGE_MM['4x6'].h / 2)
    }
  })
})
