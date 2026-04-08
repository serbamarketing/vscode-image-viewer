/**
 * 网格缩略图常量（解码档位、缓存上限、清理策略等）。
 *
 * 实际解码长边由 Webview 按列宽传入档位（400 / 800 / 1600），见 `thumbDecodeMaxEdgeFromCellWidth`。
 * 缓存在 `globalStorageUri` 子目录 `GRID_THUMB_GLOBAL_SUBDIR`。
 *
 * 预览大图仍用原图 `vscodePath`。
 */

/** 缓存在 globalStorage 下的子目录名（须与实际路径一致）。 */
export const GRID_THUMB_GLOBAL_SUBDIR = 'image-viewer-grid-thumbs' as const

/**
 * 磁盘文件名中使用的 SHA256 十六进制前缀长度（完整摘要仍为 256 bit，仅缩短文件名）。
 * 文件名形如 `{prefix}_{tier}.jpg`（试验项「仅 QL」时为 `.png`），分片目录为 `prefix` 的前 2 位。
 */
export const GRID_THUMB_CACHE_FILENAME_HASH_HEX_CHARS = 16

/** 缩略解码档位（与 Webview 格子宽度策略一致）。 */
export const THUMB_DECODE_EDGE_TIER_1 = 400
export const THUMB_DECODE_EDGE_TIER_2 = 800
export const THUMB_DECODE_EDGE_TIER_3 = 1600

/** 回落默认档位（旧消息无 `targetMaxEdgePx` 时）。 */
export const GRID_THUMB_FALLBACK_TARGET_EDGE_PX = THUMB_DECODE_EDGE_TIER_1

/**
 * 将请求值规范化到 400 / 800 / 1600。
 */
export function normalizeThumbTierEdge(n: number): number {
  const t = Math.round(Number(n))
  if (!Number.isFinite(t) || t <= 0) {
    return GRID_THUMB_FALLBACK_TARGET_EDGE_PX
  }
  if (t <= THUMB_DECODE_EDGE_TIER_1) {
    return THUMB_DECODE_EDGE_TIER_1
  }
  if (t <= THUMB_DECODE_EDGE_TIER_2) {
    return THUMB_DECODE_EDGE_TIER_2
  }
  return THUMB_DECODE_EDGE_TIER_3
}

/**
 * 由单个正方形格子的 CSS 宽度（像素）选择解码长边档位：
 * `cellW` &lt; 400 → 400；&lt; 800 → 800；否则 1600。
 */
export function thumbDecodeMaxEdgeFromCellWidth(cellWidthPx: number): number {
  if (!Number.isFinite(cellWidthPx) || cellWidthPx <= 0) {
    return THUMB_DECODE_EDGE_TIER_1
  }
  if (cellWidthPx < THUMB_DECODE_EDGE_TIER_1) {
    return THUMB_DECODE_EDGE_TIER_1
  }
  if (cellWidthPx < THUMB_DECODE_EDGE_TIER_2) {
    return THUMB_DECODE_EDGE_TIER_2
  }
  return THUMB_DECODE_EDGE_TIER_3
}

/**
 * macOS `qlmanage -s` 的中间图边长**下限**（与当前档位取较大者，再与 `GRID_THUMB_MACOS_QL_CAP_PX` 取较小者）。
 * 避免极小档位时 `-s` 过小导致 QL 出图过糊；命名为 MIN 而非 MAX，请勿与「缩略目标最大边」混淆。
 */
export const GRID_THUMB_MACOS_QUICKLOOK_MIN_EDGE_PX = 384

/** `qlmanage -s` 上限，避免参数过大。 */
export const GRID_THUMB_MACOS_QL_CAP_PX = 4096

/**
 * Quick Look 缩略中间边长：`max(MIN_EDGE, tier)` 再 `min` 上限，再经 Jimp 压到网格档位。
 */
export function gridThumbMacQlIntermediatePx(tierMaxEdge: number): number {
  const tier = normalizeThumbTierEdge(tierMaxEdge)
  return Math.min(
    GRID_THUMB_MACOS_QL_CAP_PX,
    Math.max(GRID_THUMB_MACOS_QUICKLOOK_MIN_EDGE_PX, tier)
  )
}

/** macOS 是否优先 Quick Look（失败则 Jimp / WebP WASM）。 */
export const GRID_THUMB_MACOS_USE_QUICKLOOK = true

/**
 * [试验] macOS：缩略只走 `qlmanage -t`（系统输出 PNG；官方 CLI 无 JPEG 格式选项）。
 * 须同时开启 {@link GRID_THUMB_MACOS_USE_QUICKLOOK}；`-s` 使用与 Jimp 路径相同的「封顶档位」`image-size` 逻辑。
 * 不经 Jimp；QL 失败则该条目无磁盘缩略（回退网格原图）。缓存扩展名为 `.png`，指纹 `pipe=mac-ql-raw`。
 */
export const GRID_THUMB_MACOS_QUICKLOOK_RAW_PNG = false

/** `resolveThumbForGrid` 结果 memo 条数上限。 */
export const GRID_THUMB_RESOLVE_MEMO_MAX = 400

/** 写出 JPEG 的质量（约 0–100）。 */
export const GRID_THUMB_JPEG_QUALITY = 78

/**
 * 小于该字节数的源文件不生成缩略图（直接网格原图）。
 * 暂定 120 KiB。
 */
export const GRID_THUMB_MIN_SOURCE_BYTES = 120 * 1024

/** jpeg-js 解码估算内存上限（MB）。 */
export const GRID_THUMB_JPEG_DECODE_MAX_MEMORY_MB = 1024

/** 参与栅格缩略的扩展名（小写带点）。含 GIF（首帧）；矢量等仍走原图。 */
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
 * 磁盘缓存指纹中的逻辑版本号；需要整批作废旧缩略时由维护者手动递增。
 */
export const GRID_THUMB_CACHE_VERSION = 1

/** 磁盘缓存文件扩展名：试验「仅 QL」时为 png，否则 jpg。 */
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
 * 影响磁盘缩略内容的指纹；`tier` 为 400/800/1600；`qls` 为 QL 中间边长或 raw 模式下 `cap`。
 */
export function gridThumbCacheProfile(targetTierEdge: number): string {
  const tier = normalizeThumbTierEdge(targetTierEdge)
  const macQl = process.platform === 'darwin' && GRID_THUMB_MACOS_USE_QUICKLOOK
  const rawPng = macQl && GRID_THUMB_MACOS_QUICKLOOK_RAW_PNG
  const pipeline = macQl ? (rawPng ? 'mac-ql-raw' : 'mac-ql') : 'jimp'
  const qls = rawPng ? 'cap' : String(gridThumbMacQlIntermediatePx(tier))
  const q = rawPng ? 'raw-png' : String(GRID_THUMB_JPEG_QUALITY)
  return [
    `v=${GRID_THUMB_CACHE_VERSION}`,
    `pipe=${pipeline}`,
    `tier=${tier}`,
    `q=${q}`,
    `qls=${qls}`,
    `capO=1`
  ].join('|')
}

/** 全局缩略缓存总字节上限。 */
export const GRID_THUMB_MAX_CACHE_BYTES = 500 * 1024 * 1024

/** 全局缩略缓存文件数上限。 */
export const GRID_THUMB_MAX_CACHE_FILES = 25_000

/** 两次 janitor 最小间隔（ms）。 */
export const GRID_THUMB_JANITOR_MIN_INTERVAL_MS = 120_000

/** 清理目标：总量压到阈值 × 该比例以下则停止。 */
export const GRID_THUMB_JANITOR_TARGET_RATIO = 0.85
