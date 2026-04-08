import * as fs from 'fs'
import * as path from 'path'

/** 与 webview 侧 `commandArgToFsPath` 一致：VS Code Uri JSON。 */
export function commandArgToFsPath(arg: unknown): string {
  if (arg === undefined || arg === null) {
    return ''
  }
  if (typeof arg === 'string') {
    return arg
  }
  if (typeof arg === 'object') {
    const o = arg as { fsPath?: string; path?: string }
    if (typeof o.fsPath === 'string' && o.fsPath.length > 0) {
      return o.fsPath
    }
    if (typeof o.path === 'string' && o.path.length > 0) {
      const p = o.path
      if (/^\/[a-zA-Z]:\//.test(p)) {
        return p.slice(1).replace(/\//g, '\\')
      }
      return p
    }
  }
  return ''
}

function normalizePanelPathKey(absPath: string): string {
  const n = path.normalize(absPath)
  if (process.platform === 'win32' || process.platform === 'darwin') {
    return n.toLowerCase()
  }
  return n
}

/** 整库浏览共用一个 key；各子目录各用规范化后的绝对目录路径 key。 */
export function imageViewerPanelInstanceKey(args: unknown[], projectPath: string): string {
  const raw = commandArgToFsPath(args?.[0])
  if (!raw) {
    return '__full__'
  }
  try {
    const resolved = path.resolve(raw)
    if (!fs.existsSync(resolved)) {
      return '__full__'
    }
    const st = fs.statSync(resolved)
    const folderAbs = st.isDirectory() ? resolved : path.dirname(resolved)
    const baseNorm = path.resolve(projectPath)
    if (folderAbs === baseNorm || folderAbs.startsWith(baseNorm + path.sep)) {
      return normalizePanelPathKey(folderAbs)
    }
  } catch {
    //
  }
  return '__full__'
}

/** 资源管理器 Webview **标签页标题**（非页面内文案）；改 `${defaultTitle} — …` 等格式在此函数。 */
export function imageViewerPanelTitle(args: unknown[], projectPath: string, defaultTitle: string): string {
  const raw = commandArgToFsPath(args?.[0])
  if (!raw) {
    return defaultTitle
  }
  try {
    const resolved = path.resolve(raw)
    if (!fs.existsSync(resolved)) {
      return defaultTitle
    }
    const st = fs.statSync(resolved)
    const folderAbs = st.isDirectory() ? resolved : path.dirname(resolved)
    const baseNorm = path.resolve(projectPath)
    if (folderAbs === baseNorm) {
      return defaultTitle
    }
    if (!folderAbs.startsWith(baseNorm + path.sep)) {
      return defaultTitle
    }
    const label = path.basename(folderAbs)
    return label ? `${label}/` : defaultTitle
  } catch {
    return defaultTitle
  }
}
