/** Webview UI: follow VS Code, or force light/dark (Ant Design + page chrome). */
export type WebviewUiThemePreference = 'follow' | 'light' | 'dark'

/** Sort order inside each folder (future flat view can reuse the same mode). */
export type ImageSortMode =
  | 'nameAsc'
  | 'nameDesc'
  | 'mtimeAsc'
  | 'mtimeDesc'
  | 'sizeAsc'
  | 'sizeDesc'

export interface IConfig {
  showImageTypes: string[],
  keyword: string,
  activeKey: string[]
  backgroundColor: string,
  size: number,
  includeFolders: string[],
  excludeFolders: string[],
  uiTheme?: WebviewUiThemePreference,
  imageSort?: ImageSortMode,
}