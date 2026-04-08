import type { SliderSingleProps } from 'antd/es/slider'

/** Persisted / logical column count */
export const IMAGE_GRID_COL_MIN = 1
export const IMAGE_GRID_COL_MAX = 50

/**
 * Inner list width (same units as `gridInnerWidth` in PreviewImages) before measurement.
 * Matches initial `fallbackLayoutWidthRef`.
 */
export const DEFAULT_COLUMN_LAYOUT_GUESS_PX = 1200

/**
 * Column count if each cell content is about `thumbPx` wide (grid gap is separate).
 * `innerWidth` is content width inside the scroll area (already excludes collapse padding).
 */
export function columnsFromApproxThumbWidth(innerWidth: number, thumbPx: number = 100): number {
  const gap = IMAGE_TILE_GAP
  const W = Math.max(0, innerWidth - IMAGE_GRID_WIDTH_SAFETY)
  const effectiveW = W > 0 ? W : Math.max(0, DEFAULT_COLUMN_LAYOUT_GUESS_PX - IMAGE_GRID_WIDTH_SAFETY)
  const n = Math.floor((effectiveW + gap) / (thumbPx + gap))
  return Math.min(IMAGE_GRID_COL_MAX, Math.max(IMAGE_GRID_COL_MIN, n))
}

/** Slider uses 0–100 as normalized track length. */
export const COLUMN_SLIDER_MIN = 0
export const COLUMN_SLIDER_MAX = 100

/** Share with layout: collapse content horizontal padding */
export const IMAGE_GRID_PAD_X = 24

/** `StyleImage` margin-right */
export const IMAGE_TILE_GAP = 12
/** Fallback when tile size is unknown */
export const IMAGE_TILE_INLINE_EXTRA = 2
export const IMAGE_GRID_WIDTH_SAFETY = 2

const MIN_THUMB_PX = 8
const MAX_THUMB_PX = 600

/**
 * Horizontal add-on per tile beyond `size` + margin (borders, antd Image wrapper, flex).
 * Must grow with **large** thumbnails (2–4 cols were one short); shrink for **small**
 * thumbs so we don’t undersize and leave almost half a cell empty at ~10+ cols.
 */
export function tileCellExtra(tileSize: number): number {
  if (!Number.isFinite(tileSize) || tileSize <= 0) {
    return IMAGE_TILE_INLINE_EXTRA
  }
  if (tileSize >= 300) {
    return 10
  }
  if (tileSize >= 220) {
    return 8
  }
  if (tileSize >= 160) {
    return 6
  }
  if (tileSize >= 110) {
    return 4
  }
  if (tileSize >= 80) {
    return 3
  }
  // Dense grid (~25–50 cols): real flex cells are a bit tighter than the formula; too much
  // extra here undersizes thumbnails → one extra column (e.g. pick 40, see 41).
  if (tileSize >= 55) {
    return 2.35
  }
  if (tileSize >= 40) {
    return 1.55
  }
  if (tileSize >= 30) {
    return 1.15
  }
  if (tileSize >= 22) {
    return 0.92
  }
  if (tileSize >= 15) {
    return 0.8
  }
  return 0.72
}

/**
 * Track layout (two pieces):
 * - Columns **1–10**: even spacing on the left part of the track (fine control for few columns).
 * - Columns **11–50**: shorter steps (denser), gaps ∝ `1/k^p + β` on the remainder of the track.
 */
const COLUMN_GAP_POWER = 0.92
const COLUMN_GAP_FLOOR = 0.11
/** Share of [0,100] devoted to sliding across column counts 1–10 (uniform). */
const COLUMN_TRACK_LOW_FRACTION = 0.46
const COLUMN_EVEN_LOW_MAX = 10

/** `positions[c]` = tick anchor on [0,100] for integer column `c` (1…50). `positions[1]=0`, `positions[50]=100`. */
function buildColumnTrackPositions(): number[] {
  const n = IMAGE_GRID_COL_MAX
  const pos: number[] = new Array(n + 1)
  pos[0] = 0
  pos[1] = 0

  const lowSpan = COLUMN_SLIDER_MAX * COLUMN_TRACK_LOW_FRACTION
  for (let c = 1; c <= COLUMN_EVEN_LOW_MAX; c++) {
    pos[c] = ((c - 1) / (COLUMN_EVEN_LOW_MAX - 1)) * lowSpan
  }

  const tailSpan = COLUMN_SLIDER_MAX - lowSpan
  const gaps: number[] = []
  for (let k = COLUMN_EVEN_LOW_MAX; k < n; k++) {
    gaps.push(1 / Math.pow(k, COLUMN_GAP_POWER) + COLUMN_GAP_FLOOR)
  }
  const sum = gaps.reduce((a, b) => a + b, 0)
  let acc = lowSpan
  for (let i = 0; i < gaps.length; i++) {
    acc += (gaps[i] / sum) * tailSpan
    pos[COLUMN_EVEN_LOW_MAX + 1 + i] = acc
  }
  pos[n] = COLUMN_SLIDER_MAX
  return pos
}

const COLUMN_TRACK_POSITIONS = buildColumnTrackPositions()

export function imagesPerRow(
  innerWidth: number,
  tileSize: number,
  gap: number = IMAGE_TILE_GAP,
  layoutSlack: number = 0
): number {
  if (innerWidth <= 0 || tileSize <= 0) {
    return 1
  }
  const W = Math.max(0, innerWidth - IMAGE_GRID_WIDTH_SAFETY - layoutSlack)
  const cell = tileSize + gap + tileCellExtra(tileSize)
  return Math.max(1, Math.floor((W + gap) / cell))
}

function clampCol(n: number): number {
  return Math.min(IMAGE_GRID_COL_MAX, Math.max(IMAGE_GRID_COL_MIN, Math.round(n)))
}

/** Integer column 1–50 → slider value (always one of the tick anchors). */
export function sliderPosFromColumns(cols: number): number {
  return COLUMN_TRACK_POSITIONS[clampCol(cols)]
}

/**
 * Slider value → integer column, using midpoints between adjacent anchors so intervals
 * partition [0,100] without holes.
 */
export function columnsFromSliderPos(pos: number): number {
  const p = Math.max(COLUMN_SLIDER_MIN, Math.min(COLUMN_SLIDER_MAX, pos))
  const arr = COLUMN_TRACK_POSITIONS
  const n = IMAGE_GRID_COL_MAX
  for (let c = 1; c <= n; c++) {
    const left = c === 1 ? 0 : (arr[c - 1] + arr[c]) / 2
    const right = c === n ? COLUMN_SLIDER_MAX + 1e-6 : (arr[c] + arr[c + 1]) / 2
    if (p >= left && p < right) {
      return c
    }
  }
  return n
}

/**
 * Rough thumbnail edge for persisting legacy `size` in config (CSS grid drives real layout).
 * Cell width ≈ (innerWidth − (columns−1)·gap) / columns.
 */
export function approxPersistedThumbSize(innerWidth: number, columns: number): number {
  const c = clampCol(columns)
  const W = Math.max(0, innerWidth - IMAGE_GRID_WIDTH_SAFETY)
  if (W <= 0) {
    return Math.max(MIN_THUMB_PX, Math.min(MAX_THUMB_PX, Math.floor(600 / c)))
  }
  const gap = IMAGE_TILE_GAP
  const cellW = (W - (c - 1) * gap) / c
  return Math.max(MIN_THUMB_PX, Math.min(MAX_THUMB_PX, Math.round(cellW - 2)))
}

/**
 * 与 `VirtualFolderImageGrid` 一致：列表内容区内单个正方形缩略格子的宽度（像素）。
 */
export function gridSquareCellWidthPx(listInnerWidth: number, columns: number): number {
  const cols = clampCol(columns)
  const rawW =
    listInnerWidth > 0 ? listInnerWidth : Math.max(0, DEFAULT_COLUMN_LAYOUT_GUESS_PX - IMAGE_GRID_WIDTH_SAFETY)
  const W = Math.max(0, rawW - IMAGE_GRID_WIDTH_SAFETY)
  const gap = IMAGE_TILE_GAP
  if (cols <= 1) {
    return Math.max(1, W)
  }
  return Math.max(1, (W - (cols - 1) * gap) / cols)
}

/** 1–10 every column (track is uniform there); then every 5 up to 50. */
const MARK_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const

export function buildColumnSliderMarks(): NonNullable<SliderSingleProps['marks']> {
  const marks: NonNullable<SliderSingleProps['marks']> = {}
  const usedKeys = new Set<number>()
  for (const c of MARK_COLUMNS) {
    const raw = COLUMN_TRACK_POSITIONS[c]
    const key = Math.round(raw * 1000) / 1000
    if (usedKeys.has(key)) {
      continue
    }
    usedKeys.add(key)
    marks[key] = String(c)
  }
  return marks
}
