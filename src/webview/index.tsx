import { registerWebview } from '@easy_vscode/webview'
import PreviewImages from './PreviewImages'
import { AntdWebviewShell } from './AntdWebviewShell'

const webviewComponents = {
  PreviewImages
}

registerWebview(webviewComponents, { Root: AntdWebviewShell })
