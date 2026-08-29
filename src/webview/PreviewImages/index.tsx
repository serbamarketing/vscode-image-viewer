import {
  Button,
  Checkbox,
  Collapse,
  ConfigProvider,
  Dropdown,
  Empty,
  Input,
  Modal,
  MenuProps,
  Select,
  Skeleton,
  Slider,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  message
} from 'antd'
import {
  BgColorsOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
  FolderOpenTwoTone,
  InfoCircleOutlined,
  MoonOutlined,
  SearchOutlined,
  SunOutlined,
  UpOutlined
} from '@ant-design/icons'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ImagePreview } from 'right-image-preview'
import type { ImageGroup } from 'right-image-preview'
import {
  BACKGROUND_CHECKERBOARD,
  BACKGROUND_COLOR_OPTIONS,
  BACKGROUND_TRANSPARENT,
  DEFAULT_BACKGROUND_COLOR,
  MESSAGE_CMD
} from '../../constants'
import { callVscode } from '@easy_vscode/webview'
import { ThumbLoadBudgetProvider } from './thumbLoadBudget'
import {
  StyledBetweenWrapper,
  StyledFolderOpenTwoTone,
  StyledImgsContainer,
  StyledPicCount,
  StyledPreviewImages,
  StyledReloadOutlined,
  StyledSettingOutlined,
  StyledThemeToggle,
  StyleMainScrollSlot,
  StyleRowTitle,
  StyleSquare,
  StyleTopRows
} from './style'
import { BUILTIN_MESSAGE_CMD } from '@easy_vscode/core/lib/constants'
import { IConfig, type ImageSortMode, type WebviewUiThemePreference } from 'types'
import SettingsModal from './SettingsModal'
import { useWebviewTheme } from '../WebviewThemeContext'
import {
  COLUMN_SLIDER_MAX,
  COLUMN_SLIDER_MIN,
  buildColumnSliderMarks,
  columnsFromApproxThumbWidth,
  columnsFromSliderPos,
  DEFAULT_COLUMN_LAYOUT_GUESS_PX,
  IMAGE_GRID_PAD_X,
  IMAGE_TILE_GAP,
  approxPersistedThumbSize,
  imagesPerRow,
  sliderPosFromColumns
} from '../imageGridColumns'
import { IMAGE_SORT_OPTIONS, compareImagesForSort } from '../imageSort'
import type { IImage } from './imageTypes'
import { VirtualFolderImageGrid } from './VirtualFolderImageGrid'
import { AnnouncementBar } from './AnnouncementBar'

export type { IImage } from './imageTypes'

const THRESHOLD_ALL_COLLAPSED = 1200
const THRESHOLD_ENABLE_LAZY_LOADING = 150
const THRESHOLD_DELAY_CHANGE_SIZE = 200

const WORKSPACE_ROOT_DISPLAY = '(workspace root)'

/** UI label for project-relative dir; raw `path` keys (e.g. `/`) unchanged for logic. */
function formatRelativeDirDisplay(path: string): string {
  const trimmed = path.replace(/^\/|\/$/g, '')
  return trimmed === '' ? WORKSPACE_ROOT_DISPLAY : trimmed
}

/** Command argument as JSON-deserialized VS Code `Uri` or plain string; prefer `fsPath` when present. */
function commandArgToFsPath(arg: unknown): string {
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

function readWindowCommandScopeHint(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  const w = window as Window & { commandArgs?: unknown[] }
  const p = commandArgToFsPath(w.commandArgs?.[0])
  return p.length > 0 ? p : null
}

/** Tooltip for background swatches: specials in English; solid colors use stored hex (e.g. #ffffff). */
function backgroundSwatchTooltip(option: string): string {
  if (option === BACKGROUND_CHECKERBOARD) {
    return 'Checkerboard'
  }
  if (option === BACKGROUND_TRANSPARENT) {
    return 'Transparent'
  }
  return option
}

/** Host payload before paths and names are derived. */
type RawWorkspaceImage = Pick<IImage, 'path' | 'vscodePath' | 'size'> & {
  mtimeMs?: number
  fullPath?: string
}

/** Normalize config entries like `.jpg` to match {@link IImage.fileType} (no leading dot, lower case). */
function normalizeConfiguredImageTypes(types: string[]): string[] {
  return types.map((t) => String(t).replace(/^\./, '').toLowerCase())
}

const completeImgs = (imgs: RawWorkspaceImage[], projectPath: string, imageTagsMap: Record<string, string[]> = {}): IImage[] => {
  const fallbackFullPath = (rel: string) => {
    const base = projectPath.replace(/[/\\]+$/, '')
    const tail = rel.replace(/^[/\\]+/, '')
    const sep = base.includes('\\') ? '\\' : '/'
    return `${base}${sep}${tail}`
  }
  return imgs.map((img) => {
    const filePath = img.path
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/') + 1)
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1)
    const fileType = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase()
    const fullPath = img.fullPath && img.fullPath.length > 0 ? img.fullPath : fallbackFullPath(img.path)
    const tags = imageTagsMap[fullPath] || imageTagsMap[img.vscodePath] || imageTagsMap[img.path] || []
    const newImg: IImage = {
      ...img,
      fullPath,
      dirPath,
      fileName,
      fileType,
      tags
    }
    return newImg
  })
}

const themeToggleIcon = (p: WebviewUiThemePreference) => {
  if (p === 'follow') {
    return <BgColorsOutlined />
  }
  if (p === 'light') {
    return <SunOutlined />
  }
  return <MoonOutlined />
}

const themeToggleTitle = (p: WebviewUiThemePreference) => {
  if (p === 'follow') {
    return 'Theme: follow VS Code (click to fix light)'
  }
  if (p === 'light') {
    return 'Theme: light (click for dark)'
  }
  return 'Theme: dark (click to follow VS Code)'
}

const PreviewImages: React.FC = () => {
  const { preference: uiThemePreference, setPreference: setUiThemePreference, cyclePreference } = useWebviewTheme()
  const configHydratedRef = useRef(false)
  const [imgs, setImgs] = useState<IImage[]>([])
  const [allImageTypes, setAllImageTypes] = useState<string[]>([])
  const [showImageTypes, setShowImageTypes] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string[]>([])
  const [allPaths, setAllPaths] = useState<string[]>([])
  const [showImgs, setShowImgs] = useState<IImage[]>([])
  const [backgroundColor, setBackgroundColor] = useState<string>(DEFAULT_BACKGROUND_COLOR)
  const [keyword, setKeyword] = useState<string>('')
  const [beforeFetch, setBeforeFetch] = useState(true)
  const [loading, setLoading] = useState(false)
  /** Raw 0–100 slider value; drives the handle (never round-trip through column count only). */
  const [columnSliderPos, setColumnSliderPos] = useState<number>(() =>
    sliderPosFromColumns(columnsFromApproxThumbWidth(DEFAULT_COLUMN_LAYOUT_GUESS_PX))
  )
  /** Drives grid `size`; when image count is high, updates only on release to limit reflow. */
  const [layoutSliderPos, setLayoutSliderPos] = useState<number>(() =>
    sliderPosFromColumns(columnsFromApproxThumbWidth(DEFAULT_COLUMN_LAYOUT_GUESS_PX))
  )
  const scopeHintFsPathRef = useRef<string | null>(readWindowCommandScopeHint())
  const currentProjectPath = useRef('')
  const initClickFilePath =
    (typeof window !== 'undefined' && commandArgToFsPath(
      (window as Window & { commandArgs?: unknown[] }).commandArgs?.[0]
    )) ||
    ''
  const [clickFilePath, setClickFilePath] = useState<string>(initClickFilePath)
  const [everAutoPreview, setEverAutoPreview] = useState(false)
  const [showFileName, setShowFileName] = useState<boolean>(true)
  const [showFolders, setShowFolders] = useState<boolean>(true)
  const [cellAspectRatio, setCellAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '3:4' | '9:16'>('16:9')
  const [headerCollapsed, setHeaderCollapsed] = useState<boolean>(false)
  const [selectedFullPaths, setSelectedFullPaths] = useState<Set<string>>(() => new Set())
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [includeFolders, setIncludeFolders] = useState<string[]>([])
  const [excludeFolders, setExcludeFolders] = useState<string[]>([])

  // Create Folder modal state
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false)
  const [createFolderTab, setCreateFolderTab] = useState<'single' | 'bulk'>('single')
  const [singleFolderName, setSingleFolderName] = useState('')
  const [bulkFolderNames, setBulkFolderNames] = useState('')
  const [createFolderLoading, setCreateFolderLoading] = useState(false)

  // Group To Folder modal state
  const [groupFolderModalVisible, setGroupFolderModalVisible] = useState(false)
  const [groupFolderName, setGroupFolderName] = useState('')
  const [groupFolderLoading, setGroupFolderLoading] = useState(false)

  // Move To Folder modal state
  const [moveFolderModalVisible, setMoveFolderModalVisible] = useState(false)
  const [moveFolderPath, setMoveFolderPath] = useState('')
  const [moveFolderLoading, setMoveFolderLoading] = useState(false)

  // Image Tagging state
  const [imageTags, setImageTags] = useState<Record<string, string[]>>({})
  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>([])
  const [tagModalVisible, setTagModalVisible] = useState(false)
  const [tagModalTargetPaths, setTagModalTargetPaths] = useState<string[]>([])
  const [tagInputValues, setTagInputValues] = useState<string[]>([])

  const allUniqueTags = useMemo(() => {
    const set = new Set<string>()
    for (const tags of Object.values(imageTags)) {
      if (Array.isArray(tags)) {
        for (const t of tags) {
          if (t && typeof t === 'string' && t.trim().length > 0) {
            set.add(t.trim())
          }
        }
      }
    }
    return Array.from(set).sort()
  }, [imageTags])

  const handleOpenTagModalForSelected = useCallback(() => {
    const targetPaths = Array.from(selectedFullPaths)
    if (targetPaths.length === 0) return
    setTagModalTargetPaths(targetPaths)
    if (targetPaths.length === 1) {
      const p = targetPaths[0]
      const existing = imageTags[p] || []
      setTagInputValues([...existing])
    } else {
      setTagInputValues([])
    }
    setTagModalVisible(true)
  }, [selectedFullPaths, imageTags])

  const handleOpenTagModalForSingle = useCallback((img: IImage) => {
    const p = img.fullPath || img.vscodePath || img.path
    setTagModalTargetPaths([p])
    const existing = imageTags[p] || img.tags || []
    setTagInputValues([...existing])
    setTagModalVisible(true)
  }, [imageTags])

  const handleSaveTagsModal = useCallback(() => {
    if (tagModalTargetPaths.length === 0) return
    const newImageTags = { ...imageTags }
    const cleanedTags = tagInputValues.map((t) => t.trim()).filter(Boolean)
    for (const path of tagModalTargetPaths) {
      if (cleanedTags.length > 0) {
        newImageTags[path] = cleanedTags
      } else {
        delete newImageTags[path]
      }
    }
    setImageTags(newImageTags)
    setTagModalVisible(false)
    message.success(`Updated tags for ${tagModalTargetPaths.length} image(s)`)
    callVscode({
      cmd: MESSAGE_CMD.SAVE_CONFIG,
      data: { imageTags: newImageTags }
    })
  }, [tagModalTargetPaths, tagInputValues, imageTags])

  const handleOpenCreateFolderModal = () => {
    setSingleFolderName('')
    setBulkFolderNames('')
    setCreateFolderModalVisible(true)
  }

  const handleConfirmCreateFolder = () => {
    let foldersToCreate: string[] = []
    if (createFolderTab === 'single') {
      const trimmed = singleFolderName.trim()
      if (!trimmed) {
        message.warning('Please enter a folder name')
        return
      }
      foldersToCreate = [trimmed]
    } else {
      foldersToCreate = bulkFolderNames
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (foldersToCreate.length === 0) {
        message.warning('Please enter at least one folder name')
        return
      }
    }

    setCreateFolderLoading(true)
    callVscode(
      { cmd: MESSAGE_CMD.CREATE_FOLDERS, data: { dirPaths: foldersToCreate } },
      (res: { code: number; success: boolean; created?: string[]; failed?: any[] }) => {
        setCreateFolderLoading(false)
        setCreateFolderModalVisible(false)
        if (res.success || (res.created && res.created.length > 0)) {
          message.success(`Successfully created ${res.created?.length ?? 1} folder(s)`)
          refreshImgs()
        } else {
          message.error(res.failed?.[0]?.error || 'Failed to create folder(s)')
        }
      }
    )
  }

  const handleOpenGroupFolderModal = () => {
    setGroupFolderName('')
    setGroupFolderModalVisible(true)
  }

  const handleConfirmGroupFolder = () => {
    let folderName = groupFolderName.trim()
    if (!folderName) {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const yyyy = now.getFullYear()
      const mm = pad(now.getMonth() + 1)
      const dd = pad(now.getDate())
      const hh = pad(now.getHours())
      const min = pad(now.getMinutes())
      const ss = pad(now.getSeconds())
      folderName = `Folder_${yyyy}${mm}${dd}_${hh}${min}${ss}`
    }

    const filePaths = Array.from(selectedFullPaths)
    setGroupFolderLoading(true)

    callVscode(
      { cmd: MESSAGE_CMD.MOVE_FILES, data: { filePaths, targetDir: folderName } },
      (res: { code: number; success: boolean; movedPaths?: any[]; failedPaths?: any[] }) => {
        setGroupFolderLoading(false)
        setGroupFolderModalVisible(false)
        if (res.success || (res.movedPaths && res.movedPaths.length > 0)) {
          message.success(`Grouped ${res.movedPaths?.length ?? 0} files into "${folderName}"`)
          setSelectedFullPaths(new Set())
          refreshImgs()
        } else {
          message.error(res.failedPaths?.[0]?.error || 'Failed to move files')
        }
      }
    )
  }

  const generateTimestampFolderName = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hh = pad(now.getHours())
    const min = pad(now.getMinutes())
    const ss = pad(now.getSeconds())
    return `Folder_${yyyy}${mm}${dd}_${hh}${min}${ss}`
  }

  const resolveAbsPath = useCallback((inputPath: string) => {
    const raw = inputPath.trim()
    if (!raw) return ''
    if (/^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('\\') || raw.startsWith('/')) {
      return raw.replace(/\//g, '\\')
    }
    const baseDir = scopeHintFsPathRef?.current || currentProjectPath?.current || ''
    const root = baseDir.replace(/\//g, '\\').replace(/\\+$/, '')
    return root ? `${root}\\${raw.replace(/\//g, '\\')}` : raw.replace(/\//g, '\\')
  }, [])

  const generatedCreateFolderCMD = useMemo(() => {
    let folderNames: string[] = []
    if (createFolderTab === 'single') {
      const name = singleFolderName.trim()
      if (name) folderNames = [name]
    } else {
      folderNames = bulkFolderNames
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    }
    if (folderNames.length === 0) return ''

    const mkdirParts = folderNames.map((f) => {
      const abs = resolveAbsPath(f)
      return `if not exist "${abs}" mkdir "${abs}"`
    })
    return mkdirParts.join(' & ')
  }, [createFolderTab, singleFolderName, bulkFolderNames, resolveAbsPath])

  const generatedGroupFolderCMD = useMemo(() => {
    const rawName = groupFolderName.trim() || generateTimestampFolderName()
    const absDir = resolveAbsPath(rawName)
    const filePaths = Array.from(selectedFullPaths)
    if (!absDir || filePaths.length === 0) return ''

    const moveParts = filePaths.map((fp) => {
      const srcAbs = fp.replace(/\//g, '\\')
      return `move "${srcAbs}" "${absDir}\\"`
    })

    return `if not exist "${absDir}" mkdir "${absDir}" & ${moveParts.join(' & ')}`
  }, [groupFolderName, selectedFullPaths, resolveAbsPath])

  const generatedMoveFolderCMD = useMemo(() => {
    const rawDir = moveFolderPath.trim()
    const absDir = resolveAbsPath(rawDir)
    const filePaths = Array.from(selectedFullPaths)
    if (!absDir || filePaths.length === 0) return ''

    const moveParts = filePaths.map((fp) => {
      const srcAbs = fp.replace(/\//g, '\\')
      return `move "${srcAbs}" "${absDir}\\"`
    })

    return `if not exist "${absDir}" mkdir "${absDir}" & ${moveParts.join(' & ')}`
  }, [moveFolderPath, selectedFullPaths, resolveAbsPath])

  const handleOpenMoveFolderModal = () => {
    setMoveFolderPath('')
    setMoveFolderModalVisible(true)
  }

  const handleBrowseMoveFolder = () => {
    callVscode({ cmd: MESSAGE_CMD.SELECT_FOLDER_DIALOG }, (res: { selectedPath?: string | null }) => {
      if (res?.selectedPath) {
        setMoveFolderPath(res.selectedPath)
      }
    })
  }

  const handleConfirmMoveFolder = () => {
    const targetDir = moveFolderPath.trim()
    if (!targetDir) {
      message.warning('Please enter or browse for a destination folder path')
      return
    }
    const filePaths = Array.from(selectedFullPaths)
    setMoveFolderLoading(true)
    callVscode(
      { cmd: MESSAGE_CMD.MOVE_FILES, data: { filePaths, targetDir } },
      (res: { code: number; success: boolean; movedPaths?: any[]; failedPaths?: any[] }) => {
        setMoveFolderLoading(false)
        setMoveFolderModalVisible(false)
        if (res.success || (res.movedPaths && res.movedPaths.length > 0)) {
          message.success(`Moved ${res.movedPaths?.length ?? 0} files to "${targetDir}"`)
          setSelectedFullPaths(new Set())
          refreshImgs()
        }
      }
    )
  }

  const displayModeValue = showFolders
    ? (showFileName ? 'both' : 'foldersOnly')
    : (showFileName ? 'flatWithName' : 'flatDense')

  const handleDisplayModeChange = useCallback((val: string) => {
    if (val === 'both') {
      setShowFileName(true)
      setShowFolders(true)
    } else if (val === 'foldersOnly') {
      setShowFileName(false)
      setShowFolders(true)
    } else if (val === 'flatWithName') {
      setShowFileName(true)
      setShowFolders(false)
    } else if (val === 'flatDense') {
      setShowFileName(false)
      setShowFolders(false)
    }
  }, [])

  const handleToggleSelect = useCallback((fullPath: string) => {
    setSelectedFullPaths((prev) => {
      const next = new Set(prev)
      if (next.has(fullPath)) {
        next.delete(fullPath)
      } else {
        next.add(fullPath)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedFullPaths((prev) => {
      const next = new Set(prev)
      for (const img of showImgs) {
        next.add(img.fullPath)
      }
      return next
    })
  }, [showImgs])

  const handleClearSelection = useCallback(() => {
    setSelectedFullPaths(new Set())
  }, [])

  const [renameModalVisible, setRenameModalVisible] = useState(false)
  const [renameTargetImg, setRenameTargetImg] = useState<IImage | null>(null)
  const [renameInputValue, setRenameInputValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const handleOpenRenameModal = useCallback((targetImg: IImage) => {
    setRenameTargetImg(targetImg)
    const lastDotIndex = targetImg.fileName.lastIndexOf('.')
    const baseName = lastDotIndex > 0 ? targetImg.fileName.substring(0, lastDotIndex) : targetImg.fileName
    setRenameInputValue(baseName)
    setRenameModalVisible(true)
  }, [])

  const handleConfirmRename = useCallback(() => {
    if (!renameTargetImg) return
    const inputRaw = renameInputValue.trim()

    if (!inputRaw) {
      message.error('Filename cannot be empty')
      return
    }

    if (/[\\/:*?"<>|]/.test(inputRaw)) {
      message.error('Filename contains invalid characters (\\ / : * ? " < > |)')
      return
    }

    const lastDotIndex = renameTargetImg.fileName.lastIndexOf('.')
    const originalExt = lastDotIndex > 0 ? renameTargetImg.fileName.substring(lastDotIndex) : ''

    let finalNewName = inputRaw
    if (originalExt && !inputRaw.toLowerCase().endsWith(originalExt.toLowerCase())) {
      const inputDotIndex = inputRaw.lastIndexOf('.')
      if (inputDotIndex <= 0) {
        finalNewName = `${inputRaw}${originalExt}`
      }
    }

    if (finalNewName === renameTargetImg.fileName) {
      setRenameModalVisible(false)
      setRenameTargetImg(null)
      return
    }

    const oldFullPath = renameTargetImg.fullPath
    setRenameLoading(true)

    callVscode(
      {
        cmd: MESSAGE_CMD.RENAME_FILE,
        data: { filePath: oldFullPath, newName: finalNewName }
      },
      (res: { code?: number; success?: boolean; error?: string; newFullPath?: string; newName?: string }) => {
        setRenameLoading(false)
        if (res && (res.success || res.code === 0) && res.newFullPath && res.newName) {
          const newFullPath = res.newFullPath
          const newName = res.newName
          const newFileType = newName.substring(newName.lastIndexOf('.') + 1).toLowerCase()

          setImgs((prevImgs) =>
            prevImgs.map((img) => {
              if (img.fullPath !== oldFullPath) return img
              const pathSep = img.path.includes('\\') ? '\\' : '/'
              const newRelPath = img.path.substring(0, img.path.lastIndexOf(pathSep) + 1) + newName
              const newVscodePath = img.vscodePath.includes(encodeURIComponent(oldFullPath))
                ? img.vscodePath.replace(encodeURIComponent(oldFullPath), encodeURIComponent(newFullPath))
                : img.vscodePath

              return {
                ...img,
                fullPath: newFullPath,
                fileName: newName,
                fileType: newFileType,
                path: newRelPath,
                vscodePath: newVscodePath
              }
            })
          )

          setSelectedFullPaths((prevSelected) => {
            if (!prevSelected.has(oldFullPath)) return prevSelected
            const next = new Set(prevSelected)
            next.delete(oldFullPath)
            next.add(newFullPath)
            return next
          })

          message.success(`Successfully renamed to "${newName}"`)
          setRenameModalVisible(false)
          setRenameTargetImg(null)
        } else {
          message.error(res?.error || 'Failed to rename file')
        }
      }
    )
  }, [renameTargetImg, renameInputValue])
  /** `vscode.env.language` from host `GET_CONFIG` (announcement modal locale). */
  const [hostUiLanguage, setHostUiLanguage] = useState<string | undefined>(undefined)
  const [imageSort, setImageSort] = useState<ImageSortMode>('nameAsc')
  const [gridInnerWidth, setGridInnerWidth] = useState(0)
  const fallbackLayoutWidthRef = useRef(DEFAULT_COLUMN_LAYOUT_GUESS_PX)
  const gridInnerWidthRef = useRef(0)
  const pendingLegacySizeRef = useRef<number | null>(null)
  /** True when config has neither `imageGridColumns` nor legacy `size`; apply once real width known. */
  const needWidthBasedColumnsRef = useRef(false)

  /** Lightbox (right-image-preview) state */
  const [lightboxVisible, setLightboxVisible] = useState(false)
  const [lightboxKey, setLightboxKey] = useState(0)
  const [lightboxDefaultIndex, setLightboxDefaultIndex] = useState(0)
  const [minimapSrcByVscodePath, setMinimapSrcByVscodePath] = useState<Record<string, string>>({})

  const ref = useRef<HTMLDivElement | null>(null)
  const [thumbIoGen, setThumbIoGen] = useState(0)
  /** Shared signal so per-folder virtual grids recalc visible rows without N×scroll listeners. */
  const [listScrollTick, setListScrollTick] = useState(0)
  const listScrollRafRef = useRef<number | null>(null)

  const setScrollContainerRef = useCallback((el: HTMLDivElement | null) => {
    ref.current = el
    if (el) {
      setThumbIoGen((g) => g + 1)
    }
  }, [])

  const onImageListScroll = useCallback(() => {
    if (listScrollRafRef.current !== null) {
      return
    }
    listScrollRafRef.current = requestAnimationFrame(() => {
      listScrollRafRef.current = null
      setListScrollTick((t) => t + 1)
    })
  }, [])

  useLayoutEffect(() => {
    if (allPaths.length === 0) {
      setGridInnerWidth(0)
      return
    }
    let cancelled = false
    let ro: ResizeObserver | null = null
    let raf = 0
    const attach = (el: HTMLElement) => {
      const read = () => {
        if (cancelled) {
          return
        }
        const w = el.clientWidth - IMAGE_GRID_PAD_X
        setGridInnerWidth(Math.max(0, w))
      }
      read()
      ro = new ResizeObserver(read)
      ro.observe(el)
    }
    const el = ref.current as HTMLElement | null
    if (el) {
      attach(el)
    } else {
      raf = requestAnimationFrame(() => {
        const el2 = ref.current as HTMLElement | null
        if (el2 && !cancelled) {
          attach(el2)
        }
      })
    }
    return () => {
      cancelled = true
      if (raf) {
        cancelAnimationFrame(raf)
      }
      ro?.disconnect()
    }
  }, [allPaths.length])

  const refreshImgs = useCallback(() => {
    setLoading(true)
    const hint = scopeHintFsPathRef.current
    callVscode(
      {
        cmd: MESSAGE_CMD.GET_ALL_IMGS,
        ...(hint ? { data: { scopeHintFsPath: hint } } : {})
      },
      ({ imgs, projectPath }: { imgs: RawWorkspaceImage[]; projectPath: string }) => {
        currentProjectPath.current = projectPath
        setLoading(false)
        setBeforeFetch(false)
        updateImgs(imgs)
      }
    )
  }, [])
  useEffect(refreshImgs, [refreshImgs])

  const onRevealWebview = useCallback(
    (event: MessageEvent) => {
      const message = event?.data
      if (message?.cmd === BUILTIN_MESSAGE_CMD.REVEAL_WEBVIEW) {
        const commandArgs = message.data?.commandArgs as unknown[] | undefined
        const nextPath = commandArgToFsPath(commandArgs?.[0])
        setClickFilePath(nextPath)
        scopeHintFsPathRef.current = nextPath.length > 0 ? nextPath : null
        setEverAutoPreview(false)
        refreshImgs()
      }
    },
    [refreshImgs]
  )

  useEffect(() => {
    window.addEventListener('message', onRevealWebview)
    return () => {
      window.removeEventListener('message', onRevealWebview)
    }
  }, [onRevealWebview])

  const updateImgs = useCallback((newImgs: RawWorkspaceImage[]) => {
    const imgs = completeImgs(newImgs, currentProjectPath.current, imageTags)
    setImgs(imgs)
    let allFileTypes: string[] = imgs.map((img) => img.fileType)
    allFileTypes = Array.from(new Set(allFileTypes)).sort()
    setAllImageTypes([...allFileTypes])
    setShowImageTypes((prev) => (prev.length > 0 ? prev : [...allFileTypes]))
  }, [imageTags])

  const folderStateInitializedRef = useRef(false)

  useEffect(() => {
    let showImgs = imgs
    showImgs = showImgs
      .filter((img) => img.path.indexOf(keyword) > -1)
      .filter((img) => showImageTypes.includes(img.fileType))
      .filter((img) => {
        if (selectedTagsFilter.length === 0) return true
        const tags = img.tags || imageTags[img.fullPath] || imageTags[img.vscodePath] || imageTags[img.path] || []
        return selectedTagsFilter.some((t) => tags.includes(t))
      })
    setShowImgs(showImgs)
    let arr: string[] = showImgs.map((img) => img.dirPath)
    arr = Array.from(new Set(arr)).sort()
    setAllPaths(arr)
    const isVeryMany = showImgs.length > THRESHOLD_ALL_COLLAPSED

    if (!folderStateInitializedRef.current) {
      folderStateInitializedRef.current = true
      setActiveKey(isVeryMany ? [] : [...arr])
    } else {
      setActiveKey((prev) => prev.filter((k) => arr.includes(k)))
    }
  }, [imgs, keyword, showImageTypes, selectedTagsFilter, imageTags])



  const handleClickOpenFolder = (e, path: string) => {
    e.stopPropagation()
    callVscode({
      cmd: MESSAGE_CMD.OPEN_IMAGE_DIRECTORY,
      data: { path }
    })
  }

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const img of imgs) {
      counts.set(img.fileType, (counts.get(img.fileType) ?? 0) + 1)
    }
    return allImageTypes.map((type) => ({
      label: (
        <span>
          {type}
          <StyledPicCount style={{ marginLeft: '4px' }}>({counts.get(type) ?? 0})</StyledPicCount>
        </span>
      ),
      value: type
    }))
  }, [allImageTypes, imgs])

  const handleChangeActiveKey = (value) => {
    setActiveKey([].concat(value))
  }

  const customizeRenderEmpty = () => {
    if (beforeFetch) {
      return <Skeleton active />
    }
    return (
      <div style={{ textAlign: 'center' }}>
        <Empty description='No images found' />
      </div>
    )
  }

  const layoutWidthForSizing = gridInnerWidth > 0 ? gridInnerWidth : fallbackLayoutWidthRef.current
  const imageGridColumns = useMemo(
    () =>
      columnsFromSliderPos(
        imgs.length >= THRESHOLD_DELAY_CHANGE_SIZE ? layoutSliderPos : columnSliderPos
      ),
    [imgs.length, layoutSliderPos, columnSliderPos]
  )
  /** Legacy config `size` only; layout is CSS grid × `imageGridColumns`. */
  const size = useMemo(
    () => approxPersistedThumbSize(layoutWidthForSizing, imageGridColumns),
    [layoutWidthForSizing, imageGridColumns]
  )

  useEffect(() => {
    if (gridInnerWidth > 0) {
      fallbackLayoutWidthRef.current = gridInnerWidth
    }
    gridInnerWidthRef.current = gridInnerWidth
  }, [gridInnerWidth])

  useEffect(() => {
    if (gridInnerWidth <= 0) {
      return
    }

    const legacy = pendingLegacySizeRef.current
    if (legacy !== null) {
      const cols = imagesPerRow(gridInnerWidth, legacy, IMAGE_TILE_GAP, 0)
      const snapped = sliderPosFromColumns(Math.min(50, Math.max(1, cols)))
      setColumnSliderPos(snapped)
      setLayoutSliderPos(snapped)
      pendingLegacySizeRef.current = null
      needWidthBasedColumnsRef.current = false
      return
    }

    if (needWidthBasedColumnsRef.current) {
      const c = columnsFromApproxThumbWidth(gridInnerWidth)
      const snapped = sliderPosFromColumns(c)
      setColumnSliderPos(snapped)
      setLayoutSliderPos(snapped)
      needWidthBasedColumnsRef.current = false
    }
  }, [gridInnerWidth])

  const handlerChangeGridColumns = (pos: number) => {
    setColumnSliderPos(pos)
    if (imgs.length < THRESHOLD_DELAY_CHANGE_SIZE) {
      setLayoutSliderPos(pos)
    }
  }
  const handlerAfterChangeGridColumns = (pos: number) => {
    const snapped = sliderPosFromColumns(columnsFromSliderPos(pos))
    setColumnSliderPos(snapped)
    setLayoutSliderPos(snapped)
  }

  const enableLazyLoad = useMemo(() => {
    return showImgs.length > THRESHOLD_ENABLE_LAZY_LOADING
  }, [showImgs])

  const columnSliderMarks = useMemo(() => buildColumnSliderMarks(), [])

  /** One pass: group by dir + sort each list (avoids O(panels × N) filter/sort per render). */
  const sortedImagesByDir = useMemo(() => {
    const map = new Map<string, IImage[]>()
    for (const img of showImgs) {
      let list = map.get(img.dirPath)
      if (!list) {
        list = []
        map.set(img.dirPath, list)
      }
      list.push(img)
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareImagesForSort(imageSort, clickFilePath, a, b))
    }
    return map
  }, [showImgs, imageSort, clickFilePath])

  /**
   * Flat list for lightbox: same folder order as the Collapse panel headers, so ← / → navigates
   * across folders in the same visual order the user sees.
   */
  const globalPreviewFlat = useMemo(() => {
    const out: IImage[] = []
    for (const dirPath of allPaths) {
      const list = sortedImagesByDir.get(dirPath)
      if (list?.length) {
        out.push(...list)
      }
    }
    return out
  }, [allPaths, sortedImagesByDir])

  useEffect(() => {
    const valid = new Set(globalPreviewFlat.map((img) => img.vscodePath))
    setMinimapSrcByVscodePath((prev) => {
      let changed = false
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (valid.has(k)) {
          next[k] = v
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [globalPreviewFlat])

  const executeDeleteRPC = useCallback(
    (targetPaths: string[]) => {
      if (targetPaths.length === 0) return

      callVscode(
        {
          cmd: MESSAGE_CMD.DELETE_FILE,
          data: { filePaths: targetPaths }
        },
        (res: { code?: number; success?: boolean; deletedPaths?: string[]; failedPaths?: Array<{ path: string; error: string }> }) => {
          const deletedPaths = res?.deletedPaths ?? []
          const failedPaths = res?.failedPaths ?? []

          if (deletedPaths.length > 0) {
            const deletedSet = new Set(deletedPaths)

            // 1. Remove deleted images from imgs state
            setImgs((prev) => prev.filter((img) => !deletedSet.has(img.fullPath)))

            // 2. Remove deleted images from selectedFullPaths
            setSelectedFullPaths((prevSelected) => {
              const next = new Set(prevSelected)
              for (const p of deletedPaths) {
                next.delete(p)
              }
              return next
            })

            // 3. Close Lightbox if active preview image was deleted
            if (lightboxVisible && globalPreviewFlat[lightboxDefaultIndex]) {
              if (deletedSet.has(globalPreviewFlat[lightboxDefaultIndex].fullPath)) {
                setLightboxVisible(false)
              }
            }
          }

          if (failedPaths.length === 0 && deletedPaths.length > 0) {
            message.success(
              deletedPaths.length === 1
                ? 'Successfully deleted 1 image'
                : `Successfully deleted ${deletedPaths.length} images`
            )
          } else if (failedPaths.length > 0) {
            message.error(
              `Failed to delete ${failedPaths.length} of ${targetPaths.length} file(s).`
            )
          }
        }
      )
    },
    [lightboxVisible, globalPreviewFlat, lightboxDefaultIndex]
  )

  const onDeleteImage = useCallback(
    (targetFullPath?: string) => {
      let targetPaths: string[] = []

      if (targetFullPath) {
        if (selectedFullPaths.has(targetFullPath) && selectedFullPaths.size > 1) {
          targetPaths = Array.from(selectedFullPaths)
        } else {
          targetPaths = [targetFullPath]
        }
      } else {
        targetPaths = Array.from(selectedFullPaths)
      }

      if (targetPaths.length === 0) return

      const count = targetPaths.length
      let title = ''
      if (count === 1) {
        const targetImg = imgs.find((img) => img.fullPath === targetPaths[0])
        const fileName = targetImg ? targetImg.fileName : 'this image'
        title = `Delete "${fileName}"?`
      } else {
        title = `Delete ${count} images?`
      }

      Modal.confirm({
        title,
        content: 'This action cannot be undone. Are you sure you want to proceed?',
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => executeDeleteRPC(targetPaths)
      })
    },
    [selectedFullPaths, imgs, executeDeleteRPC]
  )

  const handleRevealInExplorer = useCallback(
    (targetImg?: IImage) => {
      let filePathToReveal = targetImg?.fullPath
      if (!filePathToReveal && selectedFullPaths.size > 0) {
        filePathToReveal = Array.from(selectedFullPaths)[0]
      }
      if (filePathToReveal) {
        callVscode({
          cmd: MESSAGE_CMD.REVEAL_IN_EXPLORER,
          data: { filePath: filePathToReveal }
        })
      }
    },
    [selectedFullPaths]
  )

  const handleCopySelectedPaths = useCallback(() => {
    if (selectedFullPaths.size === 0) return
    const selectedImgs = imgs.filter((img) => selectedFullPaths.has(img.fullPath))
    const pathsText = selectedImgs.map((img) => img.path).join('\n')
    navigator.clipboard.writeText(pathsText).then(() => {
      message.success(
        selectedFullPaths.size === 1
          ? `Successfully copied path for 1 image`
          : `Successfully copied paths for ${selectedFullPaths.size} images`
      )
    })
  }, [imgs, selectedFullPaths])

  const actionMenuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'createFolder',
        label: 'Create Folder...'
      },
      {
        key: 'selectAll',
        label: 'Select All'
      },
      {
        key: 'clearSelection',
        label: 'Clear Selection',
        disabled: selectedFullPaths.size === 0
      },
      { type: 'divider' },
      {
        key: 'group',
        label: `Group To Folder (${selectedFullPaths.size})`,
        disabled: selectedFullPaths.size === 0
      },
      {
        key: 'move',
        label: `Move To Folder (${selectedFullPaths.size})`,
        disabled: selectedFullPaths.size === 0
      },
      {
        key: 'copyPath',
        label: `Copy Path (${selectedFullPaths.size})`,
        disabled: selectedFullPaths.size === 0
      },
      {
        key: 'editTags',
        label: `Add / Edit Tags (${selectedFullPaths.size})`,
        disabled: selectedFullPaths.size === 0
      },
      {
        key: 'reveal',
        label: 'Reveal in Explorer',
        disabled: selectedFullPaths.size !== 1
      },
      { type: 'divider' },
      {
        key: 'delete',
        label: `Delete Selected (${selectedFullPaths.size})`,
        danger: true,
        disabled: selectedFullPaths.size === 0
      }
    ],
    [selectedFullPaths.size]
  )

  const handleActionMenuClick: NonNullable<MenuProps['onClick']> = useCallback(
    (info) => {
      const key = String(info.key)
      if (key === 'createFolder') {
        handleOpenCreateFolderModal()
      } else if (key === 'selectAll') {
        handleSelectAll()
      } else if (key === 'clearSelection') {
        handleClearSelection()
      } else if (key === 'group') {
        handleOpenGroupFolderModal()
      } else if (key === 'move') {
        handleOpenMoveFolderModal()
      } else if (key === 'copyPath') {
        handleCopySelectedPaths()
      } else if (key === 'editTags') {
        handleOpenTagModalForSelected()
      } else if (key === 'reveal') {
        handleRevealInExplorer()
      } else if (key === 'delete') {
        onDeleteImage()
      }
    },
    [
      handleOpenCreateFolderModal,
      handleSelectAll,
      handleClearSelection,
      handleOpenGroupFolderModal,
      handleOpenMoveFolderModal,
      handleCopySelectedPaths,
      handleOpenTagModalForSelected,
      handleRevealInExplorer,
      onDeleteImage
    ]
  )
  const handleExpandAllFolders = useCallback(() => {
    const keys = [...allPaths]
    if (keys.length === 0) {
      return
    }
    requestAnimationFrame(() => {
      setActiveKey(keys)
    })
  }, [allPaths])

  const folderMenuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'expand',
        label: 'Expand All Folders'
      },
      {
        key: 'collapse',
        label: 'Collapse All Folders'
      }
    ],
    []
  )

  const handleFolderMenuClick: NonNullable<MenuProps['onClick']> = useCallback(
    (info) => {
      const key = String(info.key)
      if (key === 'expand') {
        handleExpandAllFolders()
      } else if (key === 'collapse') {
        setActiveKey([])
      }
    },
    [handleExpandAllFolders]
  )

  /** Global flat index keyed by vscodePath — used to find the clicked image's index. */
  const globalIndexByVscodePath = useMemo(() => {
    const m = new Map<string, number>()
    for (let i = 0; i < globalPreviewFlat.length; i++) {
      m.set(globalPreviewFlat[i].vscodePath, i)
    }
    return m
  }, [globalPreviewFlat])

  /** ImageGroup[] for right-image-preview groupedImages mode — one group per folder, in allPaths order. */
  const lightboxGroups = useMemo<ImageGroup[]>(() => {
    const groups: ImageGroup[] = []
    for (const dirPath of allPaths) {
      const list = sortedImagesByDir.get(dirPath)
      if (list?.length) {
        groups.push({
          name: formatRelativeDirDisplay(dirPath),
          images: list.map((img) => ({
            id: img.vscodePath,
            src: img.vscodePath,
            minimapSrc: minimapSrcByVscodePath[img.vscodePath],
            name: img.fileName,
            alt: img.fileName
          }))
        })
      }
    }
    return groups
  }, [allPaths, sortedImagesByDir, minimapSrcByVscodePath])

  const handleOpenPreview = useCallback(
    (img: IImage) => {
      const idx = globalIndexByVscodePath.get(img.vscodePath) ?? 0
      setLightboxDefaultIndex(idx)
      setLightboxKey((k) => k + 1)
      setLightboxVisible(true)
    },
    [globalIndexByVscodePath]
  )

  const handleThumbResolved = useCallback((vscodePath: string, thumbSrc: string) => {
    if (!vscodePath || !thumbSrc) {
      return
    }
    setMinimapSrcByVscodePath((prev) => {
      if (prev[vscodePath] === thumbSrc) {
        return prev
      }
      return { ...prev, [vscodePath]: thumbSrc }
    })
  }, [])

  const onAutoPreview = useCallback(() => {
    setEverAutoPreview(true)
  }, [])

  /**
   * save to local config file
   */
  useEffect(() => {
    callVscode({
      cmd: MESSAGE_CMD.GET_CONFIG,
    }, (data: IConfig) => {
      if (!data) return
      setBackgroundColor(data.backgroundColor ?? DEFAULT_BACKGROUND_COLOR)
      const igc = data.imageGridColumns
      if (typeof igc === 'number' && igc >= 1 && igc <= 50) {
        const snapped = sliderPosFromColumns(Math.round(igc))
        setColumnSliderPos(snapped)
        setLayoutSliderPos(snapped)
        pendingLegacySizeRef.current = null
        needWidthBasedColumnsRef.current = false
      } else {
        pendingLegacySizeRef.current = typeof data?.size === 'number' ? data.size : null
        needWidthBasedColumnsRef.current = pendingLegacySizeRef.current === null
      }

      if (needWidthBasedColumnsRef.current && gridInnerWidthRef.current > 0) {
        const snapped = sliderPosFromColumns(columnsFromApproxThumbWidth(gridInnerWidthRef.current))
        setColumnSliderPos(snapped)
        setLayoutSliderPos(snapped)
        needWidthBasedColumnsRef.current = false
      }
      setShowImageTypes(normalizeConfiguredImageTypes(data.showImageTypes ?? []))
      setKeyword(data.keyword ?? '')
      setActiveKey(Array.isArray(data.activeKey) ? data.activeKey : [])
      setIncludeFolders(Array.isArray(data.includeFolders) ? data.includeFolders : [])
      setExcludeFolders(Array.isArray(data.excludeFolders) ? data.excludeFolders : [])
      setUiThemePreference(data.uiTheme ?? 'follow')
      setImageSort(data.imageSort ?? 'nameAsc')
      setShowFileName(data.showFileName ?? true)
      setCellAspectRatio(data.cellAspectRatio ?? '16:9')
      setHeaderCollapsed(data.headerCollapsed ?? false)
      setShowFolders(data.showFolders ?? true)
      setHostUiLanguage(typeof data.hostUiLanguage === 'string' ? data.hostUiLanguage : undefined)
      if (data.imageTags && typeof data.imageTags === 'object') {
        setImageTags(data.imageTags)
      }
      configHydratedRef.current = true
    })
  }, [setUiThemePreference])

  /**
   * save to local config file
   */
  useEffect(() => {
    callVscode({
      cmd: MESSAGE_CMD.SAVE_CONFIG,
      data: {
        backgroundColor,
        size,
        imageGridColumns,
        showImageTypes,
        keyword,
        activeKey,
        imageSort,
        showFileName,
        cellAspectRatio,
        headerCollapsed,
        showFolders,
        imageTags
      }
    })
  }, [showImageTypes, backgroundColor, size, imageGridColumns, activeKey, keyword, imageSort, showFileName, cellAspectRatio, headerCollapsed, showFolders, imageTags])

  useEffect(() => {
    if (!configHydratedRef.current) {
      return
    }
    callVscode({
      cmd: MESSAGE_CMD.SAVE_CONFIG,
      data: { uiTheme: uiThemePreference }
    })
  }, [uiThemePreference])

  const handleCycleUiTheme = useCallback(() => {
    configHydratedRef.current = true
    cyclePreference()
  }, [cyclePreference])

  /**
   * save to local config file and refresh images
   */
  useEffect(() => {
    callVscode({
      cmd: MESSAGE_CMD.SAVE_CONFIG,
      data: {
        includeFolders,
        excludeFolders
      }
    }, refreshImgs)
  }, [includeFolders, excludeFolders, refreshImgs])

  const handleClickSettings = () => {
    setShowSettingsModal(true)
  }

  const handleApplySettings = (
    nextIncludeFolders: string[],
    nextExcludeFolders: string[],
    nextShowImageTypes: string[],
    nextCellAspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16',
    nextImageGridColumns: number,
    nextShowFileName: boolean,
    nextShowFolders: boolean
  ) => {
    setIncludeFolders(nextIncludeFolders)
    setExcludeFolders(nextExcludeFolders)
    setShowImageTypes(nextShowImageTypes)
    setCellAspectRatio(nextCellAspectRatio)
    const pos = sliderPosFromColumns(nextImageGridColumns)
    setColumnSliderPos(pos)
    setLayoutSliderPos(pos)
    setShowFileName(nextShowFileName)
    setShowFolders(nextShowFolders)
  }

  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <>
      <div className='iv-preview-root'>
      <Spin spinning={loading}>
        <StyledPreviewImages
          style={{
            padding: '10px 20px 20px 20px'
          }}
        >
          {/* Main Gallery Header Toolbar */}
          <StyleTopRows style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            <Tag
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '32px',
                padding: '0 10px',
                marginRight: 0,
                fontSize: '12px',
                borderRadius: '6px',
                background: 'var(--vscode-editor-background, #1e1e1e)',
                border: '1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.35))',
                color: 'var(--vscode-foreground, #cccccc)',
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              {selectedFullPaths.size > 0
                ? `${showImgs.length} Images (${selectedFullPaths.size} Selected)`
                : `${showImgs.length} Images`}
            </Tag>
            <Input
              addonBefore={<SearchOutlined />}
              allowClear
              size='middle'
              placeholder='Filter images...'
              style={{ flex: '1 1 140px', minWidth: '110px' }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {allUniqueTags.length > 0 && (
              <Select
                mode='multiple'
                allowClear
                placeholder='Tags...'
                maxTagCount='responsive'
                style={{ flex: '0 1 180px', minWidth: '110px' }}
                value={selectedTagsFilter}
                onChange={setSelectedTagsFilter}
                options={allUniqueTags.map((t) => ({ label: t, value: t }))}
              />
            )}
            {showFolders && (
              <Dropdown menu={{ items: folderMenuItems, onClick: handleFolderMenuClick }}>
                <Button>
                  Folders <DownOutlined />
                </Button>
              </Dropdown>
            )}
            <Dropdown menu={{ items: actionMenuItems, onClick: handleActionMenuClick }}>
              <Button type={selectedFullPaths.size > 0 ? 'primary' : 'default'}>
                Actions {selectedFullPaths.size > 0 ? `(${selectedFullPaths.size})` : ''} <DownOutlined />
              </Button>
            </Dropdown>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Select<ImageSortMode>
                aria-label='Sort images within folder'
                value={imageSort}
                onChange={setImageSort}
                options={IMAGE_SORT_OPTIONS}
                popupMatchSelectWidth={false}
                style={{ width: 140 }}
              />
              <Space size={4} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <StyledReloadOutlined onClick={refreshImgs} />
                <StyledSettingOutlined onClick={handleClickSettings} />
                <Tooltip title={themeToggleTitle(uiThemePreference)}>
                  <StyledThemeToggle onClick={handleCycleUiTheme} role='button' aria-label='Toggle UI theme'>
                    {themeToggleIcon(uiThemePreference)}
                  </StyledThemeToggle>
                </Tooltip>
              </Space>
            </div>
          </StyleTopRows>

          <StyleMainScrollSlot>
            <StyledImgsContainer ref={setScrollContainerRef} onScroll={onImageListScroll}>
              {allPaths.length === 0 ? (
                customizeRenderEmpty()
              ) : !showFolders ? (
                /* Flat View Mode: render all images directly in a single grid without folder accordions */
                <ThumbLoadBudgetProvider scrollRootRef={ref} ioGeneration={thumbIoGen} gridColumns={imageGridColumns}>
                  <VirtualFolderImageGrid
                    scrollTick={listScrollTick}
                    scrollRootRef={ref}
                    listInnerWidth={layoutWidthForSizing}
                    columns={imageGridColumns}
                    imgs={showImgs}
                    backgroundColor={backgroundColor}
                    enableLazyLoad={enableLazyLoad}
                    everAutoPreview={everAutoPreview}
                    clickFilePath={clickFilePath}
                    showFileName={showFileName}
                    selectedFullPaths={selectedFullPaths}
                    onToggleSelect={handleToggleSelect}
                    onAutoPreview={onAutoPreview}
                    onDeleteImage={onDeleteImage}
                    onRenameImage={handleOpenRenameModal}
                    onRevealInExplorer={handleRevealInExplorer}
                    cellAspectRatio={cellAspectRatio}
                    onOpenPreview={handleOpenPreview}
                    onThumbResolved={handleThumbResolved}
                  />
                </ThumbLoadBudgetProvider>
              ) : (
                /* Accordion View Mode: grouped by folder */
                <ThumbLoadBudgetProvider scrollRootRef={ref} ioGeneration={thumbIoGen} gridColumns={imageGridColumns}>
                  <Collapse activeKey={activeKey} onChange={handleChangeActiveKey}>
                    {allPaths.map((path) => {
                      const imgsInPanel = sortedImagesByDir.get(path) ?? []
                      const panelOpen = activeKey.includes(path)
                      return (
                        <Collapse.Panel
                          header={
                            <span>
                              {formatRelativeDirDisplay(path)}
                              <StyledPicCount>({imgsInPanel.length})</StyledPicCount>
                              <StyledFolderOpenTwoTone>
                                <FolderOpenTwoTone
                                  twoToneColor='#f4d057'
                                  onClick={(e) => handleClickOpenFolder(e, path)}
                                />
                              </StyledFolderOpenTwoTone>
                            </span>
                          }
                          key={path}
                        >
                          {panelOpen ? (
                            <VirtualFolderImageGrid
                              scrollTick={listScrollTick}
                              scrollRootRef={ref}
                              listInnerWidth={layoutWidthForSizing}
                              columns={imageGridColumns}
                              imgs={imgsInPanel}
                              backgroundColor={backgroundColor}
                              enableLazyLoad={enableLazyLoad}
                              everAutoPreview={everAutoPreview}
                              clickFilePath={clickFilePath}
                              showFileName={showFileName}
                              selectedFullPaths={selectedFullPaths}
                              onToggleSelect={handleToggleSelect}
                              onAutoPreview={onAutoPreview}
                              onDeleteImage={onDeleteImage}
                              onRenameImage={handleOpenRenameModal}
                              onRevealInExplorer={handleRevealInExplorer}
                              onEditTags={handleOpenTagModalForSingle}
                              cellAspectRatio={cellAspectRatio}
                              onOpenPreview={handleOpenPreview}
                              onThumbResolved={handleThumbResolved}
                            />
                          ) : null}
                        </Collapse.Panel>
                      )
                    })}
                  </Collapse>
                </ThumbLoadBudgetProvider>
              )}
            </StyledImgsContainer>
          </StyleMainScrollSlot>
        </StyledPreviewImages>
      </Spin>
    </div>

      {/* Modal: Create Single / Bulk Folder CMD Generator */}
      <Modal
        title='Create Folder (CMD Generator)'
        open={createFolderModalVisible}
        onCancel={() => setCreateFolderModalVisible(false)}
        width={580}
        footer={[
          <Button
            key='copyCmd'
            type='primary'
            icon={<CopyOutlined />}
            disabled={!generatedCreateFolderCMD}
            onClick={() => {
              if (generatedCreateFolderCMD) {
                navigator.clipboard.writeText(generatedCreateFolderCMD).then(() => {
                  message.success('Copied CMD command to clipboard!')
                })
              }
            }}
          >
            Copy CMD Command
          </Button>,
          <Button key='close' onClick={() => setCreateFolderModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <Tabs
          activeKey={createFolderTab}
          onChange={(k) => setCreateFolderTab(k as 'single' | 'bulk')}
          items={[
            {
              key: 'single',
              label: 'Single Folder',
              children: (
                <Input
                  placeholder='Folder name (e.g. Screenshots)'
                  value={singleFolderName}
                  onChange={(e) => setSingleFolderName(e.target.value)}
                  autoFocus
                />
              )
            },
            {
              key: 'bulk',
              label: 'Bulk Create (Multiple)',
              children: (
                <Input.TextArea
                  rows={4}
                  placeholder={'Enter folder names, one per line:\nFolderA\nFolderB\nFolderC'}
                  value={bulkFolderNames}
                  onChange={(e) => setBulkFolderNames(e.target.value)}
                />
              )
            }
          ]}
        />
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--vscode-descriptionForeground)' }}>
            1-Line CMD Command (Paste into Terminal):
          </div>
          <Input.TextArea
            readOnly
            rows={3}
            value={generatedCreateFolderCMD}
            placeholder='Generated 1-line CMD command will appear here...'
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      </Modal>

      {/* Modal: Group Selected Images CMD Generator */}
      <Modal
        title={`Group ${selectedFullPaths.size} Selected Image(s) (CMD Generator)`}
        open={groupFolderModalVisible}
        onCancel={() => setGroupFolderModalVisible(false)}
        width={580}
        footer={[
          <Button
            key='copyCmd'
            type='primary'
            icon={<CopyOutlined />}
            disabled={!generatedGroupFolderCMD}
            onClick={() => {
              if (generatedGroupFolderCMD) {
                navigator.clipboard.writeText(generatedGroupFolderCMD).then(() => {
                  message.success('Copied CMD command to clipboard!')
                })
              }
            }}
          >
            Copy CMD Command
          </Button>,
          <Button key='close' onClick={() => setGroupFolderModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ marginBottom: 8 }}>
          Folder name for the selected {selectedFullPaths.size} image(s):
        </div>
        <Input
          placeholder='Folder name (Leave blank for auto timestamp, e.g. Folder_20260829_093000)'
          value={groupFolderName}
          onChange={(e) => setGroupFolderName(e.target.value)}
          autoFocus
        />
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--vscode-descriptionForeground)' }}>
            1-Line CMD Command (Paste into Terminal):
          </div>
          <Input.TextArea
            readOnly
            rows={4}
            value={generatedGroupFolderCMD}
            placeholder='Generated 1-line CMD command will appear here...'
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      </Modal>

      {/* Modal: Move Selected Images CMD Generator */}
      <Modal
        title={`Move ${selectedFullPaths.size} Selected Image(s) (CMD Generator)`}
        open={moveFolderModalVisible}
        onCancel={() => setMoveFolderModalVisible(false)}
        width={580}
        footer={[
          <Button
            key='copyCmd'
            type='primary'
            icon={<CopyOutlined />}
            disabled={!generatedMoveFolderCMD}
            onClick={() => {
              if (generatedMoveFolderCMD) {
                navigator.clipboard.writeText(generatedMoveFolderCMD).then(() => {
                  message.success('Copied CMD command to clipboard!')
                })
              }
            }}
          >
            Copy CMD Command
          </Button>,
          <Button key='close' onClick={() => setMoveFolderModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ marginBottom: 8 }}>
          Destination folder path or name for {selectedFullPaths.size} image(s):
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder='Destination folder path or folder name'
            value={moveFolderPath}
            onChange={(e) => setMoveFolderPath(e.target.value)}
            autoFocus
          />
          <Button onClick={handleBrowseMoveFolder}>Browse...</Button>
        </Space.Compact>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--vscode-descriptionForeground)' }}>
            1-Line CMD Command (Paste into Terminal):
          </div>
          <Input.TextArea
            readOnly
            rows={4}
            value={generatedMoveFolderCMD}
            placeholder='Generated 1-line CMD command will appear here...'
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      </Modal>

      {/* Modal: Edit Image Tags */}
      <Modal
        title={`Edit Tags (${tagModalTargetPaths.length} image${tagModalTargetPaths.length > 1 ? 's' : ''})`}
        open={tagModalVisible}
        onOk={handleSaveTagsModal}
        onCancel={() => setTagModalVisible(false)}
        okText='Save Tags'
        width={480}
      >
        <div style={{ marginBottom: 8, fontSize: 13 }}>
          Enter or select tags for {tagModalTargetPaths.length} target image(s):
        </div>
        <Select
          mode='tags'
          style={{ width: '100%' }}
          placeholder='Type tag and press Enter (e.g. UI, Banner, Draft)'
          value={tagInputValues}
          onChange={setTagInputValues}
          options={allUniqueTags.map((t) => ({ label: t, value: t }))}
          tokenSeparators={[',']}
        />
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
          Tip: Type any tag name and press Enter or comma to create it.
        </div>
      </Modal>
      {showSettingsModal && (
        <SettingsModal
          includeFolders={includeFolders}
          excludeFolders={excludeFolders}
          visible={showSettingsModal}
          showImageTypes={showImageTypes}
          allImageTypes={allImageTypes}
          cellAspectRatio={cellAspectRatio}
          imageGridColumns={imageGridColumns}
          showFileName={showFileName}
          showFolders={showFolders}
          onClose={() => setShowSettingsModal(false)}
          onApply={handleApplySettings}
        />
      )}
      {renameModalVisible && renameTargetImg && (
        <Modal
          title='Rename Image'
          open={renameModalVisible}
          confirmLoading={renameLoading}
          onOk={handleConfirmRename}
          onCancel={() => {
            if (!renameLoading) {
              setRenameModalVisible(false)
              setRenameTargetImg(null)
            }
          }}
        >
          <div style={{ marginBottom: 12 }}>
            Current name: <strong>{renameTargetImg.fileName}</strong>
          </div>
          <Input
            autoFocus
            value={renameInputValue}
            onChange={(e) => setRenameInputValue(e.target.value)}
            onPressEnter={handleConfirmRename}
            addonAfter={
              renameTargetImg.fileName.lastIndexOf('.') > 0
                ? renameTargetImg.fileName.substring(renameTargetImg.fileName.lastIndexOf('.'))
                : undefined
            }
            placeholder='Enter new filename'
          />
        </Modal>
      )}
      <ImagePreview
        key={lightboxKey}
        groupedImages={lightboxGroups.length > 0 ? lightboxGroups : undefined}
        visible={lightboxVisible}
        defaultIndex={lightboxDefaultIndex}
        wheelEnabled
        doubleClickEnabled
        closeOnMaskClick
        arrows='side'
        showFlip
        onClose={() => setLightboxVisible(false)}
      />
      </>
    </ConfigProvider>
  )
}

export default PreviewImages
