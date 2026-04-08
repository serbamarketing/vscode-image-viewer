/* eslint-disable @typescript-eslint/naming-convention */

export const DIST_WEBVIEW_PATH = 'distWebview'
export const DIST_WEBVIEW_INDEX_HTML = `${DIST_WEBVIEW_PATH}/index.html`

export const WEBVIEW_NAMES = {
  PreviewImages: 'PreviewImages',
}

export const MESSAGE_CMD = {
  // image viewer
  GET_ALL_IMGS: 'getAllImgs',
  RENAME_FILE: 'renameFile',
  DELETE_FILE: 'deleteFile',
  OPEN_IMAGE_DIRECTORY: 'openImageDirectory',
  GET_IMAGE_BASE64: 'getImageBase64',
  GET_IMAGE_SIZE: 'getImageSize',
  /** Grid-only thumbnail: disk cache in globalStorage + webview URI, or original. */
  GET_THUMB_FOR_GRID: 'getThumbForGrid',
  SAVE_CONFIG: 'saveConfig',
  GET_CONFIG: 'getConfig',
}

export const EXTENSION_NAME = 'vscode-infra'

export const EXTENSION_COMMANDS = {
  OPEN_WEBVIEW_IMAGE_VIEWER: `${EXTENSION_NAME}.webviewImageViewer`,
}


/** Thumbnail pad uses PS-style transparency grid (stored in config). */
export const BACKGROUND_CHECKERBOARD = 'checkerboard'

/** True transparency — webview background shows through; pad uses inset frame only. */
export const BACKGROUND_TRANSPARENT = 'transparent'

export const BACKGROUND_COLOR_OPTIONS = [
  BACKGROUND_CHECKERBOARD,
  BACKGROUND_TRANSPARENT,
  '#ffffff',
  '#cccccc',
  '#999999',
  '#333333',
  '#a89a89',
  '#a9e4af',
  '#f1a8a4',
  '#64bbe2',
  '#8488b6'
]

export const DEFAULT_BACKGROUND_COLOR = BACKGROUND_CHECKERBOARD

export const DEFAULT_IMAGE_SIZE = 100