import {
  Button,
  Checkbox,
  Collapse,
  ConfigProvider,
  Empty,
  Input,
  Select,
  Skeleton,
  Slider,
  Space,
  Spin,
  Tag,
  Tooltip
} from 'antd'
import { BgColorsOutlined, FolderOpenTwoTone, InfoCircleOutlined, MoonOutlined, SearchOutlined, SunOutlined } from '@ant-design/icons'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

const completeImgs = (imgs: RawWorkspaceImage[], projectPath: string): IImage[] => {
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
    const fileType = filePath.substring(filePath.lastIndexOf('.') + 1)
    const newImg: IImage = {
      ...img,
      fullPath: img.fullPath && img.fullPath.length > 0 ? img.fullPath : fallbackFullPath(img.path),
      dirPath,
      fileName,
      fileType
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
  const [relativeDir, setRelativeDir] = useState<string>('')
  const initClickFilePath =
    (typeof window !== 'undefined' &&
      (window as Window & { commandArgs?: { path?: string }[] }).commandArgs?.[0]?.path) ||
    ''
  const [clickFilePath, setClickFilePath] = useState<string>(initClickFilePath)
  const [everAutoPreview, setEverAutoPreview] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [includeFolders, setIncludeFolders] = useState<string[]>([])
  const [excludeFolders, setExcludeFolders] = useState<string[]>([])
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [imageSort, setImageSort] = useState<ImageSortMode>('nameAsc')
  const [gridInnerWidth, setGridInnerWidth] = useState(0)
  const fallbackLayoutWidthRef = useRef(DEFAULT_COLUMN_LAYOUT_GUESS_PX)
  const gridInnerWidthRef = useRef(0)
  const pendingLegacySizeRef = useRef<number | null>(null)
  /** True when config has neither `imageGridColumns` nor legacy `size`; apply once real width known. */
  const needWidthBasedColumnsRef = useRef(false)
  const currentProjectPath = useRef('')

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
    if (listScrollRafRef.current != null) {
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

  /**
   * get file directory of path
   */
  const getFileDirectory = (path: string) => {
    return path.substring(0, path.lastIndexOf('/') + 1)
  }

  const refreshImgs = useCallback(() => {
    setLoading(true)
    callVscode({ cmd: MESSAGE_CMD.GET_ALL_IMGS }, ({ imgs, projectPath }: { imgs: RawWorkspaceImage[]; projectPath: string }) => {
      currentProjectPath.current = projectPath
      if (clickFilePath) {
        const fileRelativePath = clickFilePath.replace(currentProjectPath.current, '')
        const isFile = /.*\..{3,5}/.test(fileRelativePath)
        const relativeDir = isFile ? getFileDirectory(fileRelativePath) : fileRelativePath
        if (relativeDir === '/') {
          setRelativeDir('')
        } else if (imgs.find((img) => img.path.includes(relativeDir))) {
          setRelativeDir(relativeDir)
        }
      }
      setLoading(false)
      setBeforeFetch(false)
      updateImgs(imgs)
    })
  }, [clickFilePath])
  useEffect(refreshImgs, [refreshImgs])

  const onRevealWebview = useCallback((event) => {
    const message = event?.data
    if (message?.cmd === BUILTIN_MESSAGE_CMD.REVEAL_WEBVIEW) {
      const commandArgs = message.data?.commandArgs
      const clickFilePath = commandArgs?.[0]?.path || ''
      setClickFilePath(clickFilePath)
      if (clickFilePath) {
        const fileRelativePath = clickFilePath.replace(currentProjectPath.current, '')
        const isFile = /.*\..{3,5}/.test(fileRelativePath)
        const relativeDir = isFile ? getFileDirectory(fileRelativePath) : fileRelativePath
        if (relativeDir === '/') {
          setRelativeDir('')
        } else if (imgs.find((img) => img.path.includes(relativeDir))) {
          setRelativeDir(relativeDir)
          setEverAutoPreview(false)
        }
      }
    }
  }, [imgs])

  useEffect(() => {
    window.addEventListener('message', onRevealWebview)
    return () => {
      window.removeEventListener('message', onRevealWebview)
    }
  }, [onRevealWebview])

  const updateImgs = (newImgs: RawWorkspaceImage[]) => {
    const imgs = completeImgs(newImgs, currentProjectPath.current)
    setImgs(imgs)
    let allFileTypes: string[] = imgs.map((img) => img.fileType)
    allFileTypes = Array.from(new Set(allFileTypes)).sort()
    setAllImageTypes([...allFileTypes])
    setShowImageTypes([...allFileTypes])
  }

  useEffect(() => {
    let showImgs = imgs
    if (relativeDir) {
      showImgs = showImgs.filter((img) => img.dirPath.indexOf(relativeDir) > -1)
    }
    showImgs = showImgs
      .filter((img) => img.path.indexOf(keyword) > -1)
      .filter((img) => showImageTypes.includes(img.fileType))
    setShowImgs(showImgs)
    let arr: string[] = showImgs.map((img) => img.dirPath)
    arr = Array.from(new Set(arr)).sort()
    setAllPaths(arr)
    const isVeryMany = showImgs.length > THRESHOLD_ALL_COLLAPSED
    setActiveKey(isVeryMany ? [] : [...arr])
  }, [imgs, keyword, showImageTypes, relativeDir])

  const onDeleteImage = useCallback((filePath: string) => {
    setImgs((prev) => prev.filter((img) => img.fullPath !== filePath))
  }, [])

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

  /** One `setActiveKey` (no Spin overlay). rAF so the click frame stays light before the big commit. */
  const handleExpandAllFolders = useCallback(() => {
    const keys = [...allPaths]
    if (keys.length === 0) {
      return
    }
    requestAnimationFrame(() => {
      setActiveKey(keys)
    })
  }, [allPaths])

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
      setBackgroundColor(data.backgroundColor ?? DEFAULT_BACKGROUND_COLOR)
      const igc = data.imageGridColumns
      if (typeof igc === 'number' && igc >= 1 && igc <= 50) {
        const snapped = sliderPosFromColumns(Math.round(igc))
        setColumnSliderPos(snapped)
        setLayoutSliderPos(snapped)
        pendingLegacySizeRef.current = null
        needWidthBasedColumnsRef.current = false
      } else {
        pendingLegacySizeRef.current = typeof data.size === 'number' ? data.size : null
        needWidthBasedColumnsRef.current = pendingLegacySizeRef.current === null
      }

      if (needWidthBasedColumnsRef.current && gridInnerWidthRef.current > 0) {
        const snapped = sliderPosFromColumns(columnsFromApproxThumbWidth(gridInnerWidthRef.current))
        setColumnSliderPos(snapped)
        setLayoutSliderPos(snapped)
        needWidthBasedColumnsRef.current = false
      }
      setShowImageTypes(data.showImageTypes)
      setKeyword(data.keyword)
      setActiveKey(data.activeKey)
      setIncludeFolders(data.includeFolders)
      setExcludeFolders(data.excludeFolders)
      setUiThemePreference(data.uiTheme ?? 'follow')
      setImageSort(data.imageSort ?? 'nameAsc')
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
        imageSort
      }
    })
  }, [showImageTypes, backgroundColor, size, imageGridColumns, activeKey, keyword, imageSort])

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

  const handleApplySettings = (includeFolders: string[], excludeFolders: string[]) => {
    setIncludeFolders(includeFolders)
    setExcludeFolders(excludeFolders)
  }

  return (
    <ConfigProvider renderEmpty={customizeRenderEmpty}>
      <>
      <div className='iv-preview-root'>
      <Spin spinning={loading}>
        {showAnnouncement && (
          <div
            className='iv-preview-announcement'
            style={{
              marginBottom: 8,
              padding: '12px 16px',
              background: 'var(--vscode-inputValidation-infoBackground)',
              border: '1px solid var(--vscode-inputValidation-infoBorder)',
              borderRadius: 4,
              color: 'var(--vscode-inputValidation-infoForeground)'
            }}
          >
            <span style={{ float: 'right', cursor: 'pointer' }} onClick={() => setShowAnnouncement(false)}>×</span>
            <div>
              New features: ① Individual project settings are now stored in local files. ② Search now has options to include or exclude specific folders. &nbsp;&nbsp;
              <a href='https://github.com/ZhangJian1713/vscode-image-viewer/issues' target='_blank' rel="noreferrer" style={{ color: 'var(--vscode-textLink-foreground)' }}>Report issues</a>
            </div>
          </div>
        )}
        <StyledPreviewImages
          style={{
            padding: showAnnouncement ? '10px 20px 20px 20px' : '20px'
          }}
        >
          <StyleTopRows>
            <Input
              addonBefore={<SearchOutlined />}
              allowClear
              size='middle'
              placeholder='image path/name'
              style={{ width: 'calc(100% - 92px)', marginRight: '8px' }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <StyledSettingOutlined onClick={handleClickSettings} />
            <Tooltip title={themeToggleTitle(uiThemePreference)}>
              <StyledThemeToggle onClick={handleCycleUiTheme} role='button' aria-label='Toggle UI theme'>
                {themeToggleIcon(uiThemePreference)}
              </StyledThemeToggle>
            </Tooltip>
            <StyledReloadOutlined onClick={refreshImgs} />
          </StyleTopRows>
          {/* Type */}
          <StyleTopRows style={{ marginBottom: '2px' }}>
            <StyledBetweenWrapper>
              <span>
                <StyleRowTitle>Type:</StyleRowTitle>
                <Checkbox.Group
                  options={typeOptions}
                  value={[...showImageTypes]}
                  onChange={(values) => setShowImageTypes(values as string[])}
                />
              </span>
              <span>
                Total count:<StyledPicCount style={{ marginLeft: '6px' }}>{imgs.length}</StyledPicCount>
              </span>
            </StyledBetweenWrapper>
          </StyleTopRows>
          {/* Background */}
          <StyleTopRows style={{ marginBottom: '6px' }}>
            <StyleRowTitle>Background:</StyleRowTitle>
            <span>
              {BACKGROUND_COLOR_OPTIONS.map((opt) => (
                <Tooltip key={opt} title={backgroundSwatchTooltip(opt)} mouseEnterDelay={0.35}>
                  <StyleSquare
                    onClick={() => setBackgroundColor(opt)}
                    isSelected={backgroundColor === opt}
                    color={opt}
                  />
                </Tooltip>
              ))}
            </span>
          </StyleTopRows>
          {/* Columns → pixel size derived from panel width */}
          <StyleTopRows style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <StyleRowTitle>Columns:</StyleRowTitle>
            <Tooltip title='Images per row (1–50). Pixel size follows panel width. Tick labels: every column through 10, then every 5 columns.'>
              <Slider
                style={{ flex: 1 }}
                min={COLUMN_SLIDER_MIN}
                max={COLUMN_SLIDER_MAX}
                step={0.01}
                marks={columnSliderMarks}
                value={columnSliderPos}
                tooltip={{ formatter: (v) => String(columnsFromSliderPos(Number(v))) }}
                onChange={handlerChangeGridColumns}
                onAfterChange={handlerAfterChangeGridColumns}
                aria-label='Images per row'
              />
            </Tooltip>
          </StyleTopRows>
          {/* Expand/Collapse All */}
          <StyleTopRows>
            <StyledBetweenWrapper>
              <Space>
                <span style={{ color: 'var(--iv-secondary-fg, var(--vscode-descriptionForeground))' }}>
                  Search result:{' '}
                  <span style={{ color: 'var(--iv-primary-fg, var(--vscode-foreground))', fontWeight: 600 }}>
                    {showImgs.length}
                  </span>
                </span>
                <Tooltip
                  placement='right'
                  title={`When there are more than ${THRESHOLD_ALL_COLLAPSED} images(after being filtered) being displayed, all directories are collapsed by default.`}
                >
                  <InfoCircleOutlined
                    style={{ fontSize: '16px', color: 'var(--iv-icon-muted, var(--vscode-descriptionForeground))' }}
                  />
                </Tooltip>
                <Button onClick={handleExpandAllFolders}>Expand All</Button>
                <Button onClick={() => setActiveKey([])}>Collapse All</Button>
                <Tooltip title='Applies inside each folder only; folder order is unchanged.'>
                  <Select<ImageSortMode>
                    aria-label='Sort images within folder'
                    value={imageSort}
                    onChange={setImageSort}
                    options={IMAGE_SORT_OPTIONS}
                    popupMatchSelectWidth={false}
                    style={{ minWidth: 300 }}
                  />
                </Tooltip>
              </Space>
            </StyledBetweenWrapper>
          </StyleTopRows>
          {relativeDir && (
            <StyleTopRows>
              <Tag closable onClose={() => setRelativeDir('')}>
                Search in: {formatRelativeDirDisplay(relativeDir)}
              </Tag>
            </StyleTopRows>
          )}
          <StyleMainScrollSlot>
            <StyledImgsContainer ref={setScrollContainerRef} onScroll={onImageListScroll}>
              {allPaths.length === 0 ? (
                customizeRenderEmpty()
              ) : (
                <ThumbLoadBudgetProvider scrollRootRef={ref} ioGeneration={thumbIoGen}>
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
                              <FolderOpenTwoTone twoToneColor='#f4d057' onClick={(e) => handleClickOpenFolder(e, path)} />
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
                            onAutoPreview={onAutoPreview}
                            onDeleteImage={onDeleteImage}
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
      {showSettingsModal && (
        <SettingsModal
          includeFolders={includeFolders}
          excludeFolders={excludeFolders}
          visible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onApply={handleApplySettings}
        />
      )}
      </>
    </ConfigProvider>
  )
}

export default PreviewImages
