import { SAFE_INSET, STORAGE_TOOLBAR_POS } from "./tokens";

export function parseStoredToolbarPos(): { x: number; y: number } | null {
  try {
    const s = localStorage.getItem(STORAGE_TOOLBAR_POS);
    if (!s) return null;
    const p = JSON.parse(s) as unknown;
    if (
      p &&
      typeof p === "object" &&
      typeof (p as { x?: unknown }).x === "number" &&
      typeof (p as { y?: unknown }).y === "number"
    ) {
      return { x: (p as { x: number }).x, y: (p as { y: number }).y };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clampToolbarPos(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const maxX = Math.max(SAFE_INSET, window.innerWidth - width - SAFE_INSET);
  const maxY = Math.max(SAFE_INSET, window.innerHeight - height - SAFE_INSET);
  return {
    x: Math.min(maxX, Math.max(SAFE_INSET, x)),
    y: Math.min(maxY, Math.max(SAFE_INSET, y)),
  };
}
