declare module 'right-image-preview' {
  import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react'

  export interface ImageItem {
    src: string
    minimapSrc?: string
    minimap?: ReactNode
    alt?: string
    name?: string
  }

  export interface ImageGroup {
    name: string
    start: number
    end: number
  }

  export interface ZoomState {
    mode: 'fit' | 'native'
    nativePercent: number
    fitEquivalentNativePercent?: number
  }

  export interface ImagePreviewRef {
    zoomIn(): void
    zoomOut(): void
    fit(): void
    setNative(percent: number): void
    rotateCW(): void
    rotateCCW(): void
    flipHorizontal(): void
    flipVertical(): void
    next(): void
    prev(): void
    nextGroup(): void
    prevGroup(): void
    getState(): ZoomState
  }

  export interface ImagePreviewProps {
    src?: string
    minimapSrc?: string
    minimap?: ReactNode
    images?: ImageItem[]
    groups?: ImageGroup[]
    visible?: boolean
    defaultIndex?: number
    stops?: number[]
    initialMode?: 'fit' | 'native'
    initialNativePercent?: number
    firstZoomInStrategy?: 'above-fit' | 'first-stop' | 'hundred'
    zoomOutBelowMinBehaviour?: 'fit' | 'noop'
    zoomInAtMaxBehaviour?: 'noop' | 'notify'
    wheelEnabled?: boolean
    doubleClickEnabled?: boolean
    switchImageResetZoom?: boolean
    switchImageResetTransform?: boolean
    fitResetPan?: boolean
    showFlip?: boolean
    arrows?: 'both' | 'side' | 'toolbar' | 'none'
    initialZoomLocked?: boolean
    closeOnMaskClick?: boolean
    onClose?: () => void
    onZoomChange?: (state: ZoomState) => void
    onIndexChange?: (index: number) => void
    onMaxStopReached?: () => void
  }

  export const ImagePreview: ForwardRefExoticComponent<ImagePreviewProps & RefAttributes<ImagePreviewRef>>
}
