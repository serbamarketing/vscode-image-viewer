import { Dropdown, message, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { callVscode } from '@easy_vscode/webview'
import React, { useCallback, useMemo } from 'react'
import { MESSAGE_CMD } from '../../../constants'
import type { IImage } from '../imageTypes'
import { StyleImageInfo, StyleImageName } from './style'
import { CopyOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined, TagOutlined } from '@ant-design/icons'

const MenuAction = {
  RenameFile: 'rename-file',
  EditTags: 'edit-tags',
  RevealInExplorer: 'reveal-in-explorer',
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
  onRenameImage?: (img: IImage) => void
  onRevealInExplorer?: (img: IImage) => void
  onEditTags?: (img: IImage) => void
  /** When false (dense grid / high column count), skip the file name row under the thumb. */
  showFileName?: boolean
  children?: React.ReactNode
}
/* eslint-enable @typescript-eslint/no-unused-vars */

const ImageInfo: React.FC<ImageInfoProps> = ({
  img,
  onDeleteImage,
  onRenameImage,
  onRevealInExplorer,
  onEditTags,
  showFileName = true,
  children
}) => {
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
    onDeleteImage(img.fullPath)
  }, [img.fullPath, onDeleteImage])

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      {
        label: 'Rename',
        key: MenuAction.RenameFile,
        icon: <EditOutlined style={{ color: LINK_ICON_COLOR }} />
      },
      {
        label: 'Edit Tags...',
        key: MenuAction.EditTags,
        icon: <TagOutlined style={{ color: LINK_ICON_COLOR }} />
      },
      {
        label: 'Reveal in Explorer',
        key: MenuAction.RevealInExplorer,
        icon: <FolderOpenOutlined style={{ color: LINK_ICON_COLOR }} />
      },
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
      if (key === MenuAction.RenameFile) {
        onRenameImage?.(img)
      } else if (key === MenuAction.EditTags) {
        onEditTags?.(img)
      } else if (key === MenuAction.RevealInExplorer) {
        onRevealInExplorer?.(img)
      } else if (key === MenuAction.CopyFileName) {
        showCopySuccess(img.fileName)
      } else if (key === MenuAction.CopyPath) {
        showCopySuccess(img.path)
      } else if (key === MenuAction.CopyBase64) {
        onClickCopyBase64()
      } else if (key === MenuAction.DeleteFile) {
        onClickDelete()
      }
    },
    [img, onRenameImage, onEditTags, onRevealInExplorer, onClickCopyBase64, onClickDelete, showCopySuccess]
  )

  return (
    <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['contextMenu']} getPopupContainer={dropdownGetPopupContainer}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
        {showFileName && (
          <StyleImageInfo style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <StyleImageName title={img.fileName}>{img.fileName}</StyleImageName>
            {img.tags && img.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
                {img.tags.map((tag) => (
                  <Tag key={tag} color="blue" style={{ fontSize: '10px', lineHeight: '14px', padding: '0 4px', margin: 0 }}>
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </StyleImageInfo>
        )}
      </div>
    </Dropdown>
  )
}

export default ImageInfo
