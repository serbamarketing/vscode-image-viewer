import type { WebviewUiThemePreference } from 'types'

/** Modal/Tooltip 等挂在 body 上，需与 .webview-app-root 使用同一套语义变量 */
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
 * 在 document.body 上设置与 antd-global.css 中 .webview-app-root 一致的 token，
 * 以便 Ant Design Modal（portal 到 body）内 placeholder 等能继承到 --iv-placeholder-fg。
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
