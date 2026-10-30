import { describe, expect, it } from 'vitest'
import { detectCards, type Box } from './detect'

/** White RGBA page with black rectangle outlines and filled blocks. */
function page(W: number, H: number, outlines: Box[], fills: Box[] = []) {
  const data = new Uint8ClampedArray(W * H * 4).fill(255)
  const dot = (x: number, y: number) => {
    const p = (y * W + x) * 4
    data[p] = data[p + 1] = data[p + 2] = 0
  }
  for (const b of outlines) {
    for (let t = 0; t < 2; t++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        dot(x, b.y + t)
        dot(x, b.y + b.h - 1 - t)
      }
      for (let y = b.y; y < b.y + b.h; y++) {
        dot(b.x + t, y)
        dot(b.x + b.w - 1 - t, y)
      }
    }
  }
  for (const b of fills) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) dot(x, y)
  return { data, width: W, height: H }
}

const card = (x: number, y: number, w = 300): Box => ({ x, y, w, h: Math.round(w / 1.585) })

describe('detectCards', () => {
  it('finds front and back side by side, front first', () => {
    const back = card(470, 900)
    const front = card(120, 900)
    const found = detectCards(page(900, 1270, [back, front]))
    expect(found).toEqual([front, back])
  })

  it('orders stacked cards top to bottom', () => {
    const a = card(300, 200)
    const b = card(300, 500)
    expect(detectCards(page(900, 1270, [b, a]))).toEqual([a, b])
  })

  it('ignores text, photos and wrongly shaped frames', () => {
    const real = card(100, 100)
    const found = detectCards(
      page(
        900,
        1270,
        [real, { x: 500, y: 600, w: 300, h: 300 } /* square frame */, card(600, 1100, 60) /* too small */],
        [{ x: 120, y: 120, w: 60, h: 80 } /* photo inside card */, { x: 100, y: 700, w: 320, h: 200 } /* solid block */],
      ),
    )
    expect(found).toEqual([real])
  })

  it('keeps only the outer frame when a card has an inner border', () => {
    const outer = card(100, 100, 400)
    const inner = { x: 130, y: 130, w: 340, h: 192 }
    expect(detectCards(page(900, 1270, [outer, inner]))).toEqual([outer])
  })

  it('returns nothing for a blank page', () => {
    expect(detectCards(page(400, 560, []))).toEqual([])
  })
})
