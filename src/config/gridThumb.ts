/**
 * Grid thumbnail constants (decode tiers, cache limits, janitor policy, etc).
 *
 * The Webview chooses decode max-edge tiers (100 / 200 / 400 / 800 / 1600) from
 * column width via `thumbDecodeMaxEdgeFromCellWidth`.
 * Cache files are stored under `globalStorageUri/GRID_THUMB_GLOBAL_SUBDIR`.
 *
 * Full-size preview still uses the original `vscodePath`.
 */

/** Cache subdirectory name under globalStorage (must match runtime path). */
export const GRID_THUMB_GLOBAL_SUBDIR = 'image-viewer-grid-thumbs' as const

/**
 * Length of SHA256 hex prefix used in disk cache filenames (full digest remains 256-bit;
 * this only shortens filenames). File format: `{prefix}_{tier}.jpg` (or `.png` in raw-QL mode),
 * sharded by the first 2 chars of `prefix`.
 */
export const GRID_THUMB_CACHE_FILENAME_HASH_HEX_CHARS = 16

/**
 * Thumbnail max-edge tiers (ascending); maps 1:1 with `cellW < tier` branches in
 * `thumbDecodeMaxEdgeFromCellWidth`, and the final tier is the cap.
 */
export const THUMB_DECODE_EDGE_TIERS = [100, 200, 400, 800, 1600] as const

export type ThumbDecodeMaxEdgePx = (typeof THUMB_DECODE_EDGE_TIERS)[number]

/** Fallback tier (when old messages omit `targetMaxEdgePx`): the smallest tier. */
export const GRID_THUMB_FALLBACK_TARGET_EDGE_PX: ThumbDecodeMaxEdgePx = THUMB_DECODE_EDGE_TIERS[0]

/**
 * Normalize a requested value to one of {@link THUMB_DECODE_EDGE_TIERS}
 * (round up to the smallest tier that is not less than the request).
 */
export function normalizeThumbTierEdge(n: number): ThumbDecodeMaxEdgePx {
  const t = Math.round(Number(n))
  if (!Number.isFinite(t) || t <= 0) {
    return GRID_THUMB_FALLBACK_TARGET_EDGE_PX
  }
  for (const tier of THUMB_DECODE_EDGE_TIERS) {
    if (t <= tier) {
      return tier
    }
  }
  return THUMB_DECODE_EDGE_TIERS[THUMB_DECODE_EDGE_TIERS.length - 1]
}

/**
 * Choose decode max-edge tier from one square cell's CSS width (px):
 * `cellW` < 100 -> 100; < 200 -> 200; < 400 -> 400; < 800 -> 800; otherwise 1600.
 */
export function thumbDecodeMaxEdgeFromCellWidth(cellWidthPx: number): ThumbDecodeMaxEdgePx {
  if (!Number.isFinite(cellWidthPx) || cellWidthPx <= 0) {
    return GRID_THUMB_FALLBACK_TARGET_EDGE_PX
  }
  for (const tier of THUMB_DECODE_EDGE_TIERS) {
    if (cellWidthPx < tier) {
      return tier
    }
  }
  return THUMB_DECODE_EDGE_TIERS[THUMB_DECODE_EDGE_TIERS.length - 1]
}

/**
 * Primary macOS grid-thumbnail pipeline: `/usr/bin/sips -Z` (long-edge cap) plus
 * `format jpeg` / `formatOptions` (quality percent; see {@link GRID_THUMB_JPEG_QUALITY}).
 * Long-edge pixels are aligned with `decodeBoxEdgeClampedToOriginal` in `thumbGridCache`
 * (`image-size` + tier capping), equivalent to prior Jimp `scaleToFit(box, box)`.
 * Falls back to Jimp / WebP WASM on failure.
 */
export const GRID_THUMB_MACOS_USE_SIPS = true

/**
 * Lower bound for intermediate image edge used by macOS `qlmanage -s`
 * (then clamped with current tier and `GRID_THUMB_MACOS_QL_CAP_PX`).
 * Used only when {@link GRID_THUMB_MACOS_USE_QUICKLOOK} is true.
 */
export const GRID_THUMB_MACOS_QUICKLOOK_MIN_EDGE_PX = 384

/** Upper bound for `qlmanage -s` to avoid oversized arguments. */
export const GRID_THUMB_MACOS_QL_CAP_PX = 4096

/**
 * Quick Look intermediate edge: `max(MIN_EDGE, tier)`, then `min` with cap;
 * Jimp then downsizes to the target grid tier.
 */
export function gridThumbMacQlIntermediatePx(tierMaxEdge: number): number {
  const tier = normalizeThumbTierEdge(tierMaxEdge)
  return Math.min(
    GRID_THUMB_MACOS_QL_CAP_PX,
    Math.max(GRID_THUMB_MACOS_QUICKLOOK_MIN_EDGE_PX, tier)
  )
}

/** Whether macOS uses Quick Look + Jimp (`qlmanage` -> PNG -> Jimp). Disabled by default; primary path is {@link GRID_THUMB_MACOS_USE_SIPS}. */
export const GRID_THUMB_MACOS_USE_QUICKLOOK = false

/**
 * [Experimental] macOS raw Quick Look path: thumbnail only via `qlmanage -t`
 * (system outputs PNG; CLI has no JPEG format option).
 * Requires {@link GRID_THUMB_MACOS_USE_QUICKLOOK}; `-s` uses the same capped-tier
 * `image-size` logic as the Jimp path. No Jimp processing; if QL fails, no disk
 * thumbnail is produced (grid falls back to original). Cache extension is `.png`
 * with fingerprint `pipe=mac-ql-raw`.
 */
export const GRID_THUMB_MACOS_QUICKLOOK_RAW_PNG = false

/** Max memo entries for `resolveThumbForGrid` results. */
export const GRID_THUMB_RESOLVE_MEMO_MAX = 400

/** Output JPEG quality (roughly 0–100). */
export const GRID_THUMB_JPEG_QUALITY = 78

/**
 * Source files smaller than this byte size skip thumbnail generation
 * (grid uses original image directly). Currently 120 KiB.
 */
export const GRID_THUMB_MIN_SOURCE_BYTES = 120 * 1024

/** Estimated memory cap (MB) for jpeg-js decode. */
export const GRID_THUMB_JPEG_DECODE_MAX_MEMORY_MB = 1024

/** Extensions included in raster thumbnail pipeline (lowercase, with dot). GIF uses first frame; vector formats still use originals. */
export const GRID_THUMB_RASTER_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.gif'
] as const

export type GridThumbRasterExt = (typeof GRID_THUMB_RASTER_EXTENSIONS)[number]

/**
 * Logical version in disk cache fingerprint; bump manually to invalidate old
 * thumbnails in bulk.
 */
export const GRID_THUMB_CACHE_VERSION = 1

/** Disk cache extension: `png` in raw-QL mode, otherwise `jpg`. */
export function gridThumbDiskCacheExtension(): 'jpg' | 'png' {
  if (
    process.platform === 'darwin' &&
    GRID_THUMB_MACOS_USE_QUICKLOOK &&
    GRID_THUMB_MACOS_QUICKLOOK_RAW_PNG
  ) {
    return 'png'
  }
  return 'jpg'
}

/**
 * Fingerprint that affects disk thumbnail content. `tier` is one of
 * 100/200/400/800/1600; `aux` has pipeline-specific meaning
 * (e.g. QL intermediate edge / sips marker).
 */
export function gridThumbCacheProfile(targetTierEdge: number): string {
  const tier = normalizeThumbTierEdge(targetTierEdge)
  const macSips = process.platform === 'darwin' && GRID_THUMB_MACOS_USE_SIPS
  const macQl = process.platform === 'darwin' && GRID_THUMB_MACOS_USE_QUICKLOOK
  const rawPng = macQl && GRID_THUMB_MACOS_QUICKLOOK_RAW_PNG
  let pipeline: string
  if (rawPng) {
    pipeline = 'mac-ql-raw'
  } else if (macSips) {
    pipeline = 'mac-sips'
  } else if (macQl) {
    pipeline = 'mac-ql'
  } else {
    pipeline = 'jimp'
  }
  let aux: string
  if (rawPng) {
    aux = 'cap'
  } else if (macSips) {
    aux = `Z+q${GRID_THUMB_JPEG_QUALITY}`
  } else if (macQl) {
    aux = String(gridThumbMacQlIntermediatePx(tier))
  } else {
    aux = '0'
  }
  const q = rawPng ? 'raw-png' : String(GRID_THUMB_JPEG_QUALITY)
  return [
    `v=${GRID_THUMB_CACHE_VERSION}`,
    `pipe=${pipeline}`,
    `tier=${tier}`,
    `q=${q}`,
    `aux=${aux}`,
    `capO=1`
  ].join('|')
}

/** Max total bytes for global thumbnail cache. */
export const GRID_THUMB_MAX_CACHE_BYTES = 500 * 1024 * 1024

/** Max file count for global thumbnail cache. */
export const GRID_THUMB_MAX_CACHE_FILES = 25_000

/** Minimum interval (ms) between janitor runs. */
export const GRID_THUMB_JANITOR_MIN_INTERVAL_MS = 120_000

/** Janitor stop target: stop once total size is below `threshold * ratio`. */
export const GRID_THUMB_JANITOR_TARGET_RATIO = 0.85
