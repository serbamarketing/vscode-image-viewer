/** Detect VS Code webview theme from injected CSS variables (not OS prefers-color-scheme alone). */

function parseCssColorToRgb(input: string): [number, number, number] | null {
  const s = input.trim()
  if (!s) return null
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ]
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ]
    }
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  return null
}

function relativeLuminance(r: number, g: number, b: number): number {
  const linear = [r, g, b].map((c) => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

export function isVscodeThemeDark(): boolean {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--vscode-editor-background')
  const rgb = parseCssColorToRgb(raw)
  if (!rgb) return window.matchMedia('(prefers-color-scheme: dark)').matches
  return relativeLuminance(rgb[0], rgb[1], rgb[2]) < 0.45
}

/** Subscribe to likely theme updates (VS Code swaps theme CSS; media query can also change). */
export function subscribeVsCodeTheme(onChange: (dark: boolean) => void): () => void {
  let t: number | undefined
  const schedule = () => {
    if (t !== undefined) window.clearTimeout(t)
    t = window.setTimeout(() => {
      t = undefined
      onChange(isVscodeThemeDark())
    }, 50)
  }

  onChange(isVscodeThemeDark())

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', schedule)

  const mo = new MutationObserver(schedule)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })
  if (document.head) {
    mo.observe(document.head, { childList: true, subtree: true })
  }

  return () => {
    mq.removeEventListener('change', schedule)
    mo.disconnect()
    if (t !== undefined) window.clearTimeout(t)
  }
}
