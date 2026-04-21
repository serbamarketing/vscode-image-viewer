import * as fs from 'fs'
import * as path from 'path'
import { Uri, ViewColumn, Webview, env as vscodeEnv } from 'vscode'
import { utils, webviewUtils } from '@easy_vscode/core'
import { IWebview, IWebviewProps, IMessage } from '@easy_vscode/core/lib/types'
import { DIST_WEBVIEW_INDEX_HTML, EXTENSION_COMMANDS, MESSAGE_CMD, WEBVIEW_NAMES } from '../../constants'
import { getAllImgs, getImageBase64, getImageSize } from './utils'
import { normalizeThumbTierEdge } from '../../config/gridThumb'
import { resolveThumbForGrid, cacheFsPathToThumbResourceUri } from './thumbGridCache'
import { readLocalConfigFile, writeLocalConfigFile } from './config'
import { imageViewerPanelInstanceKey, imageViewerPanelTitle } from '../imageViewerPanelScope'

/** Webview payload returned by `GET_THUMB_FOR_GRID`. */
export type GridThumbWirePayload =
  | { kind: 'thumb'; thumbSrc: string }
  | { kind: 'original' }

const { deleteFile, getProjectPath, renameFile } = utils
const { invokeCallback, successResp } = webviewUtils

const viewType = WEBVIEW_NAMES.PreviewImages
const webviewProps: IWebviewProps = {
  command: EXTENSION_COMMANDS.OPEN_WEBVIEW_IMAGE_VIEWER,
  htmlPath: DIST_WEBVIEW_INDEX_HTML,
  currentView: viewType,
  panelParams: {
    viewType,
    title: 'Images Viewer',
    showOptions: ViewColumn.One,
    options: {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  },
  iconPath: 'assets/logo.png',
  multiPanel: {
    instanceKeyFromCommandArgs: imageViewerPanelInstanceKey,
    resolvePanelTitle: imageViewerPanelTitle
  }
}

const messageHandlers = new Map([
  [
    MESSAGE_CMD.GET_ALL_IMGS,
    (message: IMessage, webview: Webview) => {
      const basePath = path.resolve(getProjectPath())
      const hint = (message.data as { scopeHintFsPath?: string } | undefined)?.scopeHintFsPath
      let listScopeAbs: string | null = null
      if (hint && typeof hint === 'string') {
        const trimmed = hint.trim()
        if (trimmed.length > 0) {
          try {
            const resolved = path.resolve(trimmed)
            if (fs.existsSync(resolved)) {
              const st = fs.statSync(resolved)
              const folderAbs = st.isDirectory() ? resolved : path.dirname(resolved)
              const baseNorm = path.resolve(basePath)
              if (folderAbs === baseNorm || folderAbs.startsWith(baseNorm + path.sep)) {
                listScopeAbs = folderAbs
              }
            }
          } catch {
            //
          }
        }
      }
      const imgs = getAllImgs(webview, listScopeAbs)
      invokeCallback(viewType, message, { imgs, projectPath: getProjectPath() }, webview)
    }
  ],
  [
    MESSAGE_CMD.RENAME_FILE,
    (message: IMessage, w: Webview) => {
      renameFile(message.data.filePath, message.data.newName)
      invokeCallback(viewType, message, successResp, w)
    }
  ],
  [
    MESSAGE_CMD.DELETE_FILE,
    (message: IMessage, w: Webview) => {
      deleteFile(message.data.filePath)
      invokeCallback(viewType, message, successResp, w)
    }
  ],
  [
    MESSAGE_CMD.OPEN_IMAGE_DIRECTORY,
    (message: IMessage) => {
      const rel = String(message.data.path ?? '').replace(/^[/\\]+/, '')
      const abs = path.join(getProjectPath(), rel)
      void vscodeEnv.openExternal(Uri.file(abs))
    }
  ],
  [
    MESSAGE_CMD.GET_IMAGE_BASE64,
    (message: IMessage, w: Webview) => {
      const strBase64 = getImageBase64(message.data.filePath)
      invokeCallback(viewType, message, strBase64, w)
    }
  ],
  [
    MESSAGE_CMD.GET_IMAGE_SIZE,
    (message: IMessage, w: Webview) => {
      const dimensions = getImageSize(message.data.filePath)
      invokeCallback(viewType, message, dimensions, w)
    }
  ],
  [
    MESSAGE_CMD.GET_THUMB_FOR_GRID,
    (message: IMessage, panelWebview: Webview) => {
      const callbackId = message.callbackId
      const filePathIn = String(message.data?.filePath ?? '')
      const targetEdge = normalizeThumbTierEdge(Number(message.data?.targetMaxEdgePx))
      const reply = (payload: GridThumbWirePayload) => {
        invokeCallback(viewType, { ...message, callbackId } as IMessage, payload, panelWebview)
      }
      void (async () => {
        try {
          const res = await resolveThumbForGrid(filePathIn, targetEdge)
          if (res.kind === 'thumb') {
            const resourceUri = cacheFsPathToThumbResourceUri(res.cacheFsPath) ?? Uri.file(res.cacheFsPath)
            reply({
              kind: 'thumb',
              thumbSrc: panelWebview.asWebviewUri(resourceUri).toString()
            })
          } else {
            reply({ kind: 'original' })
          }
        } catch (e) {
          console.error(e)
          reply({ kind: 'original' })
        }
      })()
    }
  ],
  [
    MESSAGE_CMD.SAVE_CONFIG,
    (message: IMessage, w: Webview) => {
      writeLocalConfigFile(message.data)
      invokeCallback(viewType, message, successResp, w)
    }
  ],
  [
    MESSAGE_CMD.GET_CONFIG,
    (message: IMessage, w: Webview) =>
      invokeCallback(viewType, message, {
        ...readLocalConfigFile(),
        hostUiLanguage: vscodeEnv.language
      }, w)
  ],
  [
    MESSAGE_CMD.OPEN_EXTERNAL_URI,
    (message: IMessage) => {
      const raw = String((message.data as { url?: string } | undefined)?.url ?? '').trim()
      if (raw) {
        void vscodeEnv.openExternal(Uri.parse(raw))
      }
    }
  ],
])

const webview: IWebview = { webviewProps, messageHandlers }
export default webview
