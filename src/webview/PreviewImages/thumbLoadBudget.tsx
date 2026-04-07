/**
 * Thumbnail memory budget for large galleries: weighted retention scores, LRU tie-break,
 * staggered reveal, and React context wiring. See `docs/webview-image-viewer-design.md`.
 */
import React, { createContext, useContext, useMemo } from 'react'

/** Max entries in {@link ThumbRegistry} (decoded thumbnail slots), not max images in the list. */
export const THUMB_LOAD_MAX = 300

/** Higher score = keep longer when evicting; combines visibility band + first-screen boost. */
const SCORE_VISIBLE = 1_000_000
const SCORE_NEIGHBOR_PAGE = 820_000
const SCORE_WIDE_PREFETCH = 580_000
const SCORE_LATCHED_COLD = 260_000
/** Bonus for the first ~two rows in each folder (first “screen” of that grid). */
const SCORE_FIRST_SCREEN_BONUS = 130_000

type RegistryEntry = { score: number; lastTouch: number }

/**
 * Tracks up to {@link THUMB_LOAD_MAX} paths. Eviction: lowest `score` first, then oldest `lastTouch` (LRU).
 */
export class ThumbRegistry {
  private readonly entries = new Map<string, RegistryEntry>()
  private readonly listeners = new Map<string, Set<(held: boolean) => void>>()

  subscribe(path: string, listener: (held: boolean) => void): () => void {
    let set = this.listeners.get(path)
    if (!set) {
      set = new Set()
      this.listeners.set(path, set)
    }
    set.add(listener)
    listener(this.entries.has(path))
    return () => {
      set!.delete(listener)
      if (set!.size === 0) {
        this.listeners.delete(path)
      }
    }
  }

  has(path: string): boolean {
    return this.entries.has(path)
  }

  retain(path: string, score: number): void {
    if (score <= 0) {
      this.release(path)
      return
    }
    this.entries.set(path, { score, lastTouch: performance.now() })
    this.evictDownToCap(path)
    this.notifyPath(path)
  }

  release(path: string): void {
    if (!this.entries.delete(path)) {
      return
    }
    this.notifyPath(path)
  }

  private pickEvictionVictim(protectPath?: string): string | undefined {
    let victim: string | undefined
    let worstScore = Infinity
    let worstTouch = Infinity
    for (const [p, e] of this.entries) {
      if (p === protectPath) {
        continue
      }
      if (e.score < worstScore || (e.score === worstScore && e.lastTouch < worstTouch)) {
        worstScore = e.score
        worstTouch = e.lastTouch
        victim = p
      }
    }
    return victim
  }

  private evictDownToCap(lastAdded?: string): void {
    while (this.entries.size > THUMB_LOAD_MAX) {
      const v = this.pickEvictionVictim(lastAdded)
      if (!v) {
        break
      }
      this.entries.delete(v)
      this.notifyPath(v)
    }
  }

  private notifyPath(path: string): void {
    const subs = this.listeners.get(path)
    if (!subs) {
      return
    }
    const held = this.entries.has(path)
    subs.forEach((fn) => {
      fn(held)
    })
  }
}

/**
 * Schedules `requestAnimationFrame` bursts so many cells entering view do not paint in one frame.
 */
export class RevealScheduler {
  private readonly queue: { path: string; pri: number; cb: () => void }[] = []
  private raf = 0
  private readonly perFrame: number

  constructor(perFrame: number = 6) {
    this.perFrame = perFrame
  }

  request(path: string, pri: number, cb: () => void): void {
    const i = this.queue.findIndex((x) => x.path === path)
    if (i >= 0) {
      if (pri > this.queue[i].pri) {
        this.queue[i] = { path, pri, cb }
        this.queue.sort((a, b) => b.pri - a.pri)
      }
      return
    }
    this.queue.push({ path, pri, cb })
    this.queue.sort((a, b) => b.pri - a.pri)
    this.flushSoon()
  }

  cancel(path: string): void {
    const next = this.queue.filter((x) => x.path !== path)
    if (next.length === this.queue.length) {
      return
    }
    this.queue.length = 0
    this.queue.push(...next)
  }

  private flushSoon(): void {
    if (this.raf !== 0) {
      return
    }
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      let n = this.perFrame
      while (n-- > 0 && this.queue.length > 0) {
        const x = this.queue.shift()!
        x.cb()
      }
      if (this.queue.length > 0) {
        this.flushSoon()
      }
    })
  }
}

/**
 * @param inNeighbor — io w/ ~±1 viewport rootMargin (still true when strictly visible; branch order matters).
 * @param inWide — io w/ ~±2 viewport rootMargin (outer prefetch ring is !inNeighbor && inWide).
 */
export function computeThumbRetentionScore(args: {
  inVisible: boolean
  inNeighbor: boolean
  inWide: boolean
  latched: boolean
  indexInFolder: number
  cols: number
}): number {
  const firstScreenBoost =
    args.indexInFolder >= 0 && args.indexInFolder < args.cols * 2 ? SCORE_FIRST_SCREEN_BONUS : 0

  let score = 0
  if (args.inVisible) {
    score = SCORE_VISIBLE
  } else if (args.inNeighbor) {
    score = SCORE_NEIGHBOR_PAGE
  } else if (args.inWide) {
    score = SCORE_WIDE_PREFETCH
  } else if (args.latched) {
    score = SCORE_LATCHED_COLD
  }
  if (score <= 0) {
    return 0
  }
  return score + firstScreenBoost
}

type ThumbLoadBudgetContextValue = {
  scrollRootRef: React.RefObject<HTMLElement | null>
  /** Bump when scroll root attaches so IO hooks rebind */
  ioGeneration: number
  registry: ThumbRegistry
  reveal: RevealScheduler
}

const ThumbLoadBudgetContext = createContext<ThumbLoadBudgetContextValue | null>(null)

export function ThumbLoadBudgetProvider({
  children,
  scrollRootRef,
  ioGeneration
}: {
  children: React.ReactNode
  scrollRootRef: React.RefObject<HTMLElement | null>
  ioGeneration: number
}): React.ReactElement {
  const registry = useMemo(() => new ThumbRegistry(), [])
  const reveal = useMemo(() => new RevealScheduler(6), [])
  const value = useMemo(
    () => ({ scrollRootRef, ioGeneration, registry, reveal }),
    [scrollRootRef, ioGeneration, registry, reveal]
  )
  return <ThumbLoadBudgetContext.Provider value={value}>{children}</ThumbLoadBudgetContext.Provider>
}

export function useThumbLoadBudget(): ThumbLoadBudgetContextValue {
  const v = useContext(ThumbLoadBudgetContext)
  if (!v) {
    throw new Error('useThumbLoadBudget must be used within ThumbLoadBudgetProvider')
  }
  return v
}
