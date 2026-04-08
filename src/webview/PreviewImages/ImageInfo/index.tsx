import { Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import { callVscode } from '@easy_vscode/webview'
import React, { useCallback, useMemo } from 'react'
import { MESSAGE_CMD } from '../../../constants'
import type { IImage } from '../imageTypes'
import { StyleImageInfo, StyleImageName } from './style'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons'

const MenuAction = {
  CopyFileName: 'copy-file-name',
  CopyPath: 'copy-path',
  CopyBase64: 'copy-base64',
  DeleteFile: 'delete-file'
} as const

const LINK_ICON_COLOR = 'var(--vscode-textLink-foreground)'

/** Avoid clipping inside scroll/collapse; stable reference for Dropdown. */
const dropdownGetPopupContainer = () => document.body

/* Callback parameter name is only for documentation. */
/* eslint-disable @typescript-eslint/no-unused-vars */
type ImageInfoProps = {
  img: IImage
  onDeleteImage: (fullPath: string) => void
}
/* eslint-enable @typescript-eslint/no-unused-vars */

const ImageInfo: React.FC<ImageInfoProps> = ({ img, onDeleteImage }) => {
  const showCopySuccess = useCallback((copyText: string, showMsg: boolean = true) => {
    navigator.clipboard
      .writeText(copyText)
      .then(() => showMsg && message.success(`Successfully copied "${copyText}"`))
  }, [])

  const onClickCopyBase64 = useCallback(() => {
    callVscode({ cmd: MESSAGE_CMD.GET_IMAGE_BASE64, data: { filePath: img.fullPath } }, (strBase64: string) => {
      showCopySuccess(strBase64, false)
      message.success('Successfully copied Base64 encoding of the image')
    })
  }, [img.fullPath, showCopySuccess])

  const onClickDelete = useCallback(() => {
    callVscode({ cmd: MESSAGE_CMD.DELETE_FILE, data: { filePath: img.fullPath } }, () => {
      message.success('Successfully deleted')
      onDeleteImage(img.fullPath)
    })
  }, [img.fullPath, onDeleteImage])

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      {
        label: `Copy "${img.fileName}"`,
        key: MenuAction.CopyFileName,
        icon: <CopyOutlined style={{ color: LINK_ICON_COLOR }} />
      },
      {
        label: `Copy "${img.path}"`,
        key: MenuAction.CopyPath,
        icon: <CopyOutlined style={{ color: LINK_ICON_COLOR }} />
      },
      {
        label: `Copy Base64 string`,
        key: MenuAction.CopyBase64,
        icon: <CopyOutlined style={{ color: LINK_ICON_COLOR }} />
      },
      {
        label: 'Delete File',
        key: MenuAction.DeleteFile,
        icon: <DeleteOutlined style={{ color: LINK_ICON_COLOR }} />
      }
    ],
    [img.fileName, img.path]
  )

  const handleMenuClick = useCallback<NonNullable<MenuProps['onClick']>>(
    (info) => {
      const key = String(info.key)
      if (key === MenuAction.CopyFileName) {
        showCopySuccess(img.fileName)
      } else if (key === MenuAction.CopyPath) {
        showCopySuccess(img.path)
      } else if (key === MenuAction.CopyBase64) {
        onClickCopyBase64()
      } else if (key === MenuAction.DeleteFile) {
        onClickDelete()
      }
    },
    [img.fileName, img.path, onClickCopyBase64, onClickDelete, showCopySuccess]
  )

  return (
    <StyleImageInfo>
      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} getPopupContainer={dropdownGetPopupContainer}>
        <StyleImageName title={img.fileName}>{img.fileName}</StyleImageName>
      </Dropdown>
    </StyleImageInfo>
  )
}

export default ImageInfo
