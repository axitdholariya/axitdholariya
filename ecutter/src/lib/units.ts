/** Print resolution used for every cropped card. */
export const DPI = 300

/** ISO/IEC 7810 ID-1 (CR-80) card size – Aadhaar, PAN, PVC cards. */
export const CARD_MM = { w: 85.6, h: 54 } as const

export const mmToPx = (mm: number, dpi = DPI) => Math.round((mm / 25.4) * dpi)
export const mmToPt = (mm: number) => (mm / 25.4) * 72

export const CARD_PX = { w: mmToPx(CARD_MM.w), h: mmToPx(CARD_MM.h) }
