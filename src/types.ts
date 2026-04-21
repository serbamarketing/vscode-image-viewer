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
  /** Legacy pixel hint; optional when only `imageGridColumns` / width-based default is used. */
  size?: number,
  /** 1–50; primary control for thumbnail grid. `size` is kept in sync for older configs. */
  imageGridColumns?: number,
  includeFolders: string[],
  excludeFolders: string[],
  uiTheme?: WebviewUiThemePreference,
  imageSort?: ImageSortMode,
  /**
   * Injected by the extension only in `GET_CONFIG` responses (`vscode.env.language`);
   * never persisted to the local config file.
   */
  hostUiLanguage?: string,
}