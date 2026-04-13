/**
 * Scroll-driven animations (compositor-linked root scroll). Chrome 115+.
 * Used for page-locked guide layers; falls back to JS transform when unavailable.
 */
export function supportsRootScrollTimelinePair(): boolean {
  try {
    return (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "scroll(root block)") &&
      CSS.supports("animation-timeline", "scroll(root inline)")
    );
  } catch {
    return false;
  }
}

/** Max root scroll offset along each axis (px), aligned with `window` scroll range. */
export function rootMaxScrollPx(docW: number, docH: number): {
  maxX: number;
  maxY: number;
} {
  return {
    maxX: Math.max(0, docW - window.innerWidth),
    maxY: Math.max(0, docH - window.innerHeight),
  };
}
