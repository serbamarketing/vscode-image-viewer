import * as path from 'path'
import { Uri, ViewColumn, Webview, env } from 'vscode'
import { utils, webviewUtils } from '@easy_vscode/core'
import { IWebview, IWebviewProps, IMessage } from '@easy_vscode/core/lib/types'
import { DIST_WEBVIEW_INDEX_HTML, EXTENSION_COMMANDS, MESSAGE_CMD, WEBVIEW_NAMES } from '../../constants'
import { getAllImgs, getImageBase64, getImageSize } from './utils'
import { normalizeThumbTierEdge } from '../../config/gridThumb'
import { resolveThumbForGrid, cacheFsPathToThumbResourceUri } from './thumbGridCache'
import { readLocalConfigFile, writeLocalConfigFile } from './config'

/** `GET_THUMB_FOR_GRID` 回传 webview 的载荷。 */
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
  iconPath: 'assets/logo.png'
}

const messageHandlers = new Map([
  [
    MESSAGE_CMD.GET_ALL_IMGS,
    (message: IMessage, webview: Webview) => {
      const imgs = getAllImgs(webview)
      invokeCallback(viewType, message, { imgs, projectPath: getProjectPath() })
    }
  ],
  [
    MESSAGE_CMD.RENAME_FILE,
    (message: IMessage) => {
      renameFile(message.data.filePath, message.data.newName)
      invokeCallback(viewType, message, successResp)
    }
  ],
  [
    MESSAGE_CMD.DELETE_FILE,
    (message: IMessage) => {
      deleteFile(message.data.filePath)
      invokeCallback(viewType, message, successResp)
    }
  ],
  [
    MESSAGE_CMD.OPEN_IMAGE_DIRECTORY,
    (message: IMessage) => {
      const rel = String(message.data.path ?? '').replace(/^[/\\]+/, '')
      const abs = path.join(getProjectPath(), rel)
      void env.openExternal(Uri.file(abs))
    }
  ],
  [
    MESSAGE_CMD.GET_IMAGE_BASE64,
    (message: IMessage) => {
      const strBase64 = getImageBase64(message.data.filePath)
      invokeCallback(viewType, message, strBase64)
    }
  ],
  [
    MESSAGE_CMD.GET_IMAGE_SIZE,
    (message: IMessage) => {
      const dimensions = getImageSize(message.data.filePath)
      invokeCallback(viewType, message, dimensions)
    }
  ],
  [
    MESSAGE_CMD.GET_THUMB_FOR_GRID,
    (message: IMessage, panelWebview: Webview) => {
      const callbackId = message.callbackId
      const filePathIn = String(message.data?.filePath ?? '')
      const targetEdge = normalizeThumbTierEdge(Number(message.data?.targetMaxEdgePx))
      const reply = (payload: GridThumbWirePayload) => {
        invokeCallback(viewType, { ...message, callbackId } as IMessage, payload)
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
    (message: IMessage) => {
      writeLocalConfigFile(message.data)
      invokeCallback(viewType, message, successResp)
    }
  ],
  [
    MESSAGE_CMD.GET_CONFIG,
    (message: IMessage) => invokeCallback(viewType, message, readLocalConfigFile())
  ],
])

const webview: IWebview = { webviewProps, messageHandlers }
export default webview
