/**
 * Inline styles for the thumbnail “pad” behind `object-fit: contain` (checkerboard, transparent, solid).
 * Outer edge uses CSS variable `--iv-thumb-edge` (see `antd-global.css`).
 */
import type { CSSProperties } from 'react'
import { BACKGROUND_CHECKERBOARD, BACKGROUND_TRANSPARENT } from '../constants'

/** Flex box filling the square cell; letterboxing uses this background (not the <img> background for grid modes). */
export function thumbPadStyle(backgroundColor: string): CSSProperties {
  const base: CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    borderRadius: 0
  }
  if (backgroundColor === BACKGROUND_CHECKERBOARD) {
    return {
      ...base,
      backgroundColor: '#e8e8e8',
      backgroundImage: [
        'linear-gradient(45deg, #c8c8c8 25%, transparent 25%)',
        'linear-gradient(-45deg, #c8c8c8 25%, transparent 25%)',
        'linear-gradient(45deg, transparent 75%, #c8c8c8 75%)',
        'linear-gradient(-45deg, transparent 75%, #c8c8c8 75%)'
      ].join(', '),
      backgroundSize: '8px 8px',
      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0'
    }
  }
  if (backgroundColor === BACKGROUND_TRANSPARENT) {
    return {
      ...base,
      background: 'transparent'
    }
  }
  return { ...base, backgroundColor }
}

/** Background on the actual img element: transparent when pad shows checkerboard or true transparency. */
export function imageInlineBackground(backgroundColor: string): string {
  if (backgroundColor === BACKGROUND_CHECKERBOARD || backgroundColor === BACKGROUND_TRANSPARENT) {
    return 'transparent'
  }
  return backgroundColor
}
