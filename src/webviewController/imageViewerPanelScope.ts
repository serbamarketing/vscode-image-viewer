import * as fs from 'fs'
import * as path from 'path'

/** Matches the webview-side `commandArgToFsPath`: VS Code Uri JSON payload shape. */
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

/** Whole-workspace view shares one key; each subdirectory view uses its normalized absolute directory path as key. */
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

/** Explorer Webview editor tab title (not in-page text); adjust formats like `${defaultTitle} — ...` here. */
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
