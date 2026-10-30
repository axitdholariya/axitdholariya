export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface GrayImage {
  data: Uint8ClampedArray // RGBA, like ImageData
  width: number
  height: number
}

export interface DetectOptions {
  /** Pixels darker than this (0-255 luminance) count as ink. */
  darkThreshold?: number
  /** Minimum card width/height as a fraction of the page's shorter side. */
  minSide?: number
  /** Accepted long/short side ratio. CR-80 is 1.585. */
  ratio?: [number, number]
  /** Max share of the bounding box that may be ink – borders are thin. */
  maxFill?: number
}

const DEFAULTS: Required<DetectOptions> = {
  darkThreshold: 150,
  minSide: 0.12,
  ratio: [1.35, 1.85],
  maxFill: 0.35,
}

/**
 * Finds card-shaped outlines on a rendered page.
 *
 * e-card PDFs draw each side of the card inside a thin (often rounded)
 * border. A border is a single connected stroke whose bounding box has the
 * CR-80 aspect ratio and is mostly empty, so we label connected ink
 * components and keep the ones that look like that.
 */
export function detectCards(img: GrayImage, options: DetectOptions = {}): Box[] {
  const o = { ...DEFAULTS, ...options }
  const { width: W, height: H, data } = img
  const n = W * H

  const ink = new Uint8Array(n)
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    // treat transparent pixels as paper
    ink[i] = data[p + 3] > 0 && lum < o.darkThreshold ? 1 : 0
  }

  const labels = new Int32Array(n)
  const stack = new Int32Array(n)
  const boxes: Box[] = []
  const minSide = Math.min(W, H) * o.minSide
  let next = 0

  for (let start = 0; start < n; start++) {
    if (!ink[start] || labels[start]) continue
    next++
    let top = 0
    stack[top++] = start
    labels[start] = next
    let minX = W, minY = H, maxX = 0, maxY = 0, count = 0

    while (top) {
      const i = stack[--top]
      const x = i % W
      const y = (i - x) / W
      count++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      // 8-connectivity bridges anti-aliased gaps on rounded corners
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= H) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= W) continue
          const j = ny * W + nx
          if (ink[j] && !labels[j]) {
            labels[j] = next
            stack[top++] = j
          }
        }
      }
    }

    const w = maxX - minX + 1
    const h = maxY - minY + 1
    if (Math.min(w, h) < minSide) continue
    const r = Math.max(w, h) / Math.min(w, h)
    if (r < o.ratio[0] || r > o.ratio[1]) continue
    if (count / (w * h) > o.maxFill) continue
    boxes.push({ x: minX, y: minY, w, h })
  }

  return readingOrder(dropNested(boxes))
}

function contains(a: Box, b: Box) {
  return b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h
}

function dropNested(boxes: Box[]) {
  return boxes.filter((b) => !boxes.some((a) => a !== b && contains(a, b)))
}

/** Rows top-to-bottom, left-to-right within a row (front before back). */
export function readingOrder(boxes: Box[]) {
  const sameRow = (a: Box, b: Box) => {
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
    return overlap > 0.5 * Math.min(a.h, b.h)
  }
  return [...boxes].sort((a, b) => (sameRow(a, b) ? a.x - b.x : a.y - b.y))
}
