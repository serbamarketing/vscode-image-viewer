import * as React from 'react'
import { ConfigProvider, theme } from 'antd'
import { useColorThemeKind, VscodeColorThemeKind } from '@easy_vscode/webview'
import './antd-global.css'

const NO_CURRENT_VIEW = '$currentView$'

function useAntdThemeAlgorithm() {
  const kind = useColorThemeKind()
  const dark =
    kind === VscodeColorThemeKind.Dark || kind === VscodeColorThemeKind.HighContrast
  return dark ? theme.darkAlgorithm : theme.defaultAlgorithm
}

export interface WebviewRootProps {
  components: Record<string, React.FC>
}

export const AntdWebviewShell: React.FC<WebviewRootProps> = ({ components }) => {
  const algorithm = useAntdThemeAlgorithm()
  let currentView = (window as any).currentView
  if (currentView === NO_CURRENT_VIEW) {
    currentView = Object.keys(components)[0]
  }
  const CurrentComponent = components[currentView]
  return (
    <ConfigProvider
      theme={{ algorithm }}
      getPopupContainer={(triggerNode) => {
        if (triggerNode) return triggerNode
        return document.body
      }}
    >
      <CurrentComponent />
    </ConfigProvider>
  )
}
