import * as React from 'react'
import { ConfigProvider, theme } from 'antd'
import './antd-global.css'
import { isVscodeThemeDark, subscribeVsCodeTheme } from './vscodeTheme'
import { applyBodySemanticTokens, clearBodySemanticTokens } from './semanticTokens'
import { WebviewThemeProvider } from './WebviewThemeContext'
import type { WebviewUiThemePreference } from 'types'

const NO_CURRENT_VIEW = '$currentView$'

export interface WebviewRootProps {
  components: Record<string, React.FC>
}

/** Align Ant Design with VS Code or user-forced light/dark (no webview reload). */
export const AntdWebviewShell: React.FC<WebviewRootProps> = ({ components }) => {
  const [vscodeIsDark, setVscodeIsDark] = React.useState(isVscodeThemeDark)
  const [uiThemePreference, setUiThemePreference] = React.useState<WebviewUiThemePreference>('follow')
  React.useEffect(() => subscribeVsCodeTheme(setVscodeIsDark), [])

  const effectiveIsDark = uiThemePreference === 'follow' ? vscodeIsDark : uiThemePreference === 'dark'
  const cyclePreference = React.useCallback(() => {
    setUiThemePreference((p) => (p === 'follow' ? 'light' : p === 'light' ? 'dark' : 'follow'))
  }, [])

  const themeCtx = React.useMemo(
    () => ({
      vscodeIsDark,
      preference: uiThemePreference,
      effectiveIsDark,
      setPreference: setUiThemePreference,
      cyclePreference
    }),
    [vscodeIsDark, uiThemePreference, effectiveIsDark, cyclePreference]
  )

  const rootWrapStyle: React.CSSProperties =
    uiThemePreference === 'follow'
      ? {
          minHeight: '100%',
          backgroundColor: 'var(--vscode-editor-background)',
          color: 'var(--vscode-editor-foreground)'
        }
      : effectiveIsDark
      ? { minHeight: '100%', backgroundColor: '#141414', color: 'rgba(255,255,255,0.85)' }
      : { minHeight: '100%', backgroundColor: '#ffffff', color: 'rgba(0,0,0,0.88)' }

  React.useEffect(() => {
    const body = document.body
    const root = document.getElementById('root')
    applyBodySemanticTokens(uiThemePreference, effectiveIsDark)
    if (uiThemePreference === 'follow') {
      body.style.removeProperty('background-color')
      body.style.removeProperty('color')
      root?.style.removeProperty('background-color')
      root?.style.removeProperty('color')
    } else if (effectiveIsDark) {
      body.style.backgroundColor = '#141414'
      body.style.color = 'rgba(255,255,255,0.85)'
      if (root) {
        root.style.backgroundColor = '#141414'
        root.style.color = 'rgba(255,255,255,0.85)'
      }
    } else {
      body.style.backgroundColor = '#ffffff'
      body.style.color = 'rgba(0,0,0,0.88)'
      if (root) {
        root.style.backgroundColor = '#ffffff'
        root.style.color = 'rgba(0,0,0,0.88)'
      }
    }
    return () => {
      clearBodySemanticTokens()
      body.style.removeProperty('background-color')
      body.style.removeProperty('color')
      root?.style.removeProperty('background-color')
      root?.style.removeProperty('color')
    }
  }, [uiThemePreference, effectiveIsDark])

  let currentView = (window as any).currentView
  if (currentView === NO_CURRENT_VIEW) {
    currentView = Object.keys(components)[0]
  }
  const CurrentComponent = components[currentView]

  return (
    <WebviewThemeProvider value={themeCtx}>
      <ConfigProvider
        theme={{
          algorithm: effectiveIsDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorLink:
              uiThemePreference === 'follow' ? 'var(--vscode-textLink-foreground)' : '#1677ff',
            colorTextDescription:
              'var(--iv-secondary-fg, var(--vscode-descriptionForeground))',
            colorTextSecondary:
              'var(--iv-secondary-fg, var(--vscode-descriptionForeground))',
            colorTextPlaceholder:
              'var(--iv-placeholder-fg, var(--vscode-input-placeholderForeground))'
          }
        }}
        getPopupContainer={(triggerNode) => {
          if (triggerNode) return triggerNode
          return document.body
        }}
      >
        <div
          className='webview-app-root'
          data-ui-theme={uiThemePreference}
          data-effective-light={effectiveIsDark ? 'false' : 'true'}
          style={rootWrapStyle}
        >
          <CurrentComponent />
        </div>
      </ConfigProvider>
    </WebviewThemeProvider>
  )
}
