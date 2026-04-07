/** Webview UI: follow VS Code, or force light/dark (Ant Design + page chrome). */
export type WebviewUiThemePreference = 'follow' | 'light' | 'dark'

export interface IConfig {
  showImageTypes: string[],
  keyword: string,
  activeKey: string[]
  backgroundColor: string,
  size: number,
  includeFolders: string[],
  excludeFolders: string[],
  uiTheme?: WebviewUiThemePreference,
}