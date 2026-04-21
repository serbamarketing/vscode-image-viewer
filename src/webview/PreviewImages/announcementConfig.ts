/**
 * Release notes: bump {@link ANNOUNCEMENT_ID} with `package.json` version and refresh copy per locale.
 * Users who have not dismissed this id see the modal once; dismiss persists in localStorage; bar entry reopens it.
 *
 * Locale: the top bar is always English (`getAnnouncementBarTopStrings`). Modal copy uses
 * `getAnnouncementStrings(hostUiLanguage)`; when the host sends a non-empty `vscode.env.language`, **only that**
 * selects en / zh-Hans / zh-Hant (do not OR with `navigator.language`, or English UI + zh OS yields Chinese).
 * If missing, fall back to `navigator`.
 */

/** Sync with `package.json` version; bumping re-shows the auto modal for users who had dismissed the old id. */
export const ANNOUNCEMENT_ID = '2.0.0'

export const REPOSITORY_URL = 'https://github.com/ZhangJian1713/vscode-image-viewer'

export const ISSUES_URL = `${REPOSITORY_URL}/issues`

export const ANNOUNCEMENT_DISMISS_STORAGE_KEY = 'iv-image-viewer-announcement-dismissed-id'

function normalizeLangTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, '-')
}

/** Webview `navigator` locale tags only (when the host does not inject a language). */
function collectNavigatorLocaleTags(): string[] {
  const tags: string[] = []
  if (typeof navigator !== 'undefined') {
    tags.push(normalizeLangTag(navigator.language))
    for (const l of navigator.languages ?? []) {
      tags.push(normalizeLangTag(l))
    }
  }
  return tags.filter((t) => t.length > 0)
}

function isChineseLocale(tags: string[]): boolean {
  return tags.some((t) => t === 'zh' || t.startsWith('zh-'))
}

function isTraditionalChineseLocale(tags: string[]): boolean {
  return tags.some(
    (t) =>
      t.startsWith('zh-tw') ||
      t.startsWith('zh-hk') ||
      t.startsWith('zh-mo') ||
      t === 'zh-hant' ||
      (t.startsWith('zh-') && t.includes('hant'))
  )
}

export type AnnouncementStrings = {
  modalTitle: string
  features: readonly string[]
  barCta: string
  barHint: string
  closeButton: string
  openReleaseNotesAria: string
}

const ANNOUNCEMENT_COPY_EN: AnnouncementStrings = {
  modalTitle: `What’s new in Image Viewer v${ANNOUNCEMENT_ID}`,
  features: [
    'Light and dark UI themes are supported; by default the panel follows your VS Code or Cursor theme.',
    'Thumbnail grid performance is greatly improved — fully usable for managing large high-resolution photo libraries.',
    'Multiple ways to sort images.',
    'Grid density is controlled with Columns instead of Size for a better use of panel width and a cleaner layout.',
    'Checkerboard and transparent backgrounds are available as preview backdrops.',
    'The preview now shows the file name.',
    'Skips macOS `._*` AppleDouble sidecar files (often seen on external drives).'
  ],
  barCta: 'What’s new',
  barHint: '— click for details',
  closeButton: 'Close',
  openReleaseNotesAria: 'Open release notes'
}

const ANNOUNCEMENT_COPY_ZH_HANS: AnnouncementStrings = {
  modalTitle: `Image Viewer v${ANNOUNCEMENT_ID} 更新说明`,
  features: [
    '已支持切换明暗主题，默认跟随你的 VS Code 或 Cursor 主题；',
    '大幅改进缩略图网格性能，完全可用于管理大型高清照片库；',
    '支持对图片的多种排序方式；',
    '控制预览密度的参数由 Size 改为 Columns，更好利用面板宽度，布局更美观；',
    '新增棋盘格与透明色作为预览图背景选项；',
    '预览图片时显示文件名；',
    '忽略外置盘上常见的 `._*` AppleDouble 附属文件，不再当作图片列出；',
  ],
  barCta: '更新说明',
  barHint: '— 点击查看详情',
  closeButton: '关闭',
  openReleaseNotesAria: '打开更新说明'
}

const ANNOUNCEMENT_COPY_ZH_HANT: AnnouncementStrings = {
  modalTitle: `Image Viewer v${ANNOUNCEMENT_ID} 更新說明`,
  features: [
    '已支援切換明暗主題，預設跟隨你的 VS Code 或 Cursor 主題；',
    '大幅改善縮圖網格效能，完全可用於管理大型高畫質相片庫；',
    '支援多種圖片排序方式；',
    '控制預覽密度的參數由 Size 改為 Columns，更好利用面板寬度，版面更美觀；',
    '新增棋盤格與透明色作為預覽圖背景選項；',
    '預覽圖片時顯示檔名；',
    '略過外接儲存裝置上常見的 `._*` AppleDouble 附屬檔，不再當作圖片列出；'
  ],
  barCta: '更新說明',
  barHint: '— 點擊檢視詳情',
  closeButton: '關閉',
  openReleaseNotesAria: '開啟更新說明'
}

/**
 * @param hostUiLanguage Host `vscode.env.language` via `GET_CONFIG.hostUiLanguage`. When set, modal locale follows **only** this, not the browser OS locale.
 */
export function getAnnouncementStrings(hostUiLanguage?: string | null): AnnouncementStrings {
  const trimmed = typeof hostUiLanguage === 'string' ? hostUiLanguage.trim() : ''
  if (trimmed !== '') {
    const host = normalizeLangTag(trimmed)
    if (!(host === 'zh' || host.startsWith('zh-'))) {
      return ANNOUNCEMENT_COPY_EN
    }
    return isTraditionalChineseLocale([host]) ? ANNOUNCEMENT_COPY_ZH_HANT : ANNOUNCEMENT_COPY_ZH_HANS
  }
  const tags = collectNavigatorLocaleTags()
  if (!isChineseLocale(tags)) {
    return ANNOUNCEMENT_COPY_EN
  }
  return isTraditionalChineseLocale(tags) ? ANNOUNCEMENT_COPY_ZH_HANT : ANNOUNCEMENT_COPY_ZH_HANS
}

export type AnnouncementBarTopStrings = Pick<AnnouncementStrings, 'barCta' | 'barHint' | 'openReleaseNotesAria'>

/** Top bar strings are always English; modal copy is {@link getAnnouncementStrings}. */
export function getAnnouncementBarTopStrings(): AnnouncementBarTopStrings {
  return {
    barCta: ANNOUNCEMENT_COPY_EN.barCta,
    barHint: ANNOUNCEMENT_COPY_EN.barHint,
    openReleaseNotesAria: ANNOUNCEMENT_COPY_EN.openReleaseNotesAria
  }
}
