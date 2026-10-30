export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((b) => b && downloadBlob(b, filename), 'image/png')
}

/** Opens the browser print dialog for a PDF without leaving the page. */
export function printPdf(bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.src = url
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {
      // some browsers block printing a PDF iframe – fall back to a new tab
      window.open(url, '_blank')
    }
  }
  document.body.appendChild(frame)
  setTimeout(() => {
    frame.remove()
    URL.revokeObjectURL(url)
  }, 120_000)
}
