/**
 * Copy this file to your extension as e.g. src/webview/AntdWebviewShell.tsx
 * and import ./antd-global.css (copy from src/global.antd.css in this template).
 */
import * as React from 'react'
import { ConfigProvider } from 'antd'
import './antd-global.css'

const NO_CURRENT_VIEW = '$currentView$'

export interface WebviewRootProps {
  components: Record<string, React.FC>
}

export const AntdWebviewShell: React.FC<WebviewRootProps> = ({ components }) => {
  let currentView = (window as any).currentView
  if (currentView === NO_CURRENT_VIEW) {
    currentView = Object.keys(components)[0]
  }
  const CurrentComponent = components[currentView]
  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => {
        if (triggerNode) return triggerNode
        return document.body
      }}
    >
      <CurrentComponent />
    </ConfigProvider>
  )
}
