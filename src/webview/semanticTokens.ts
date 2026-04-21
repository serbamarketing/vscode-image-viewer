import type { WebviewUiThemePreference } from 'types'

/** Modal / Tooltip portals use `body`; mirror `.webview-app-root` semantic variables there. */
const KEYS = [
  '--iv-primary-fg',
  '--iv-secondary-fg',
  '--iv-placeholder-fg',
  '--iv-icon-muted'
] as const

export function clearBodySemanticTokens(): void {
  for (const k of KEYS) {
    document.body.style.removeProperty(k)
  }
}

/**
 * Copy `.webview-app-root` tokens from antd-global.css onto `document.body` so Ant Design Modal
 * (portaled to body) picks up `--iv-placeholder-fg` for placeholders, etc.
 */
export function applyBodySemanticTokens(
  uiThemePreference: WebviewUiThemePreference,
  effectiveIsDark: boolean
): void {
  clearBodySemanticTokens()
  const b = document.body
  if (uiThemePreference === 'light') {
    b.style.setProperty('--iv-primary-fg', 'rgba(0, 0, 0, 0.88)')
    b.style.setProperty('--iv-secondary-fg', 'rgba(0, 0, 0, 0.58)')
    b.style.setProperty('--iv-placeholder-fg', 'rgba(0, 0, 0, 0.55)')
    b.style.setProperty('--iv-icon-muted', 'rgba(0, 0, 0, 0.52)')
    return
  }
  if (uiThemePreference === 'dark') {
    b.style.setProperty('--iv-primary-fg', 'rgba(255, 255, 255, 0.85)')
    b.style.setProperty('--iv-secondary-fg', 'rgba(255, 255, 255, 0.68)')
    b.style.setProperty('--iv-placeholder-fg', 'rgba(255, 255, 255, 0.48)')
    b.style.setProperty('--iv-icon-muted', 'rgba(255, 255, 255, 0.58)')
    return
  }
  if (!effectiveIsDark) {
    b.style.setProperty('--iv-primary-fg', 'var(--vscode-editor-foreground)')
    b.style.setProperty(
      '--iv-secondary-fg',
      'color-mix(in srgb, var(--vscode-descriptionForeground) 40%, var(--vscode-foreground) 60%)'
    )
    b.style.setProperty(
      '--iv-placeholder-fg',
      'color-mix(in srgb, var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground)) 35%, var(--vscode-foreground) 65%)'
    )
    b.style.setProperty(
      '--iv-icon-muted',
      'color-mix(in srgb, var(--vscode-descriptionForeground) 45%, var(--vscode-foreground) 55%)'
    )
    return
  }
  b.style.setProperty('--iv-primary-fg', 'var(--vscode-editor-foreground)')
  b.style.setProperty('--iv-secondary-fg', 'var(--vscode-descriptionForeground)')
  b.style.setProperty(
    '--iv-placeholder-fg',
    'var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground))'
  )
  b.style.setProperty('--iv-icon-muted', 'var(--vscode-descriptionForeground)')
}
