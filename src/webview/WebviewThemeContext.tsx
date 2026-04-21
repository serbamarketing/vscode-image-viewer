import * as React from 'react'
import type { WebviewUiThemePreference } from 'types'

export interface WebviewThemeContextValue {
  vscodeIsDark: boolean
  preference: WebviewUiThemePreference
  effectiveIsDark: boolean
  setPreference: React.Dispatch<React.SetStateAction<WebviewUiThemePreference>>
  cyclePreference: () => void
}

const WebviewThemeContext = React.createContext<WebviewThemeContextValue | null>(null)

export function useWebviewTheme(): WebviewThemeContextValue {
  const ctx = React.useContext(WebviewThemeContext)
  if (!ctx) {
    throw new Error('useWebviewTheme must be used inside AntdWebviewShell')
  }
  return ctx
}

export const WebviewThemeProvider = WebviewThemeContext.Provider
