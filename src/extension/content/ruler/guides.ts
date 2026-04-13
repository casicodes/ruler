import type { CSSProperties } from "react";

import { guideEmphasisColor } from "./color";
import { HIT_PX, TW } from "./tokens";
import type { LineVisualState, PinnedLine } from "./types";

/** Viewport position for drawing and hit-testing (page-locked lines follow document scroll). */
export function toViewportPos(line: PinnedLine): number {
  if (!line.pageLocked) return line.pos;
  return line.kind === "v"
    ? line.pos - window.scrollX
    : line.pos - window.scrollY;
}

/** Same half-width as hit strips — cursor here counts as “on” that guide; skip duplicate preview line */
export function cursorOverlapsPinnedGuide(
  cursorAxis: number,
  line: PinnedLine,
): boolean {
  return Math.abs(cursorAxis - toViewportPos(line)) <= HIT_PX / 2;
}

/** Toggle page lock; keeps the line visually in place by converting stored `pos`. */
export function toggleLinePageLock(line: PinnedLine): PinnedLine {
  const sx = window.scrollX;
  const sy = window.scrollY;
  if (line.pageLocked) {
    return {
      ...line,
      pageLocked: false,
      pos: line.kind === "v" ? line.pos - sx : line.pos - sy,
    };
  }
  return {
    ...line,
    pageLocked: true,
    pos: line.kind === "v" ? line.pos + sx : line.pos + sy,
  };
}

export function newLineId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function lineVisualStyle(
  axis: "v" | "h",
  pos: number,
  state: LineVisualState,
  userColor: string,
): CSSProperties {
  let stroke: string;
  if (state === "selected") {
    stroke = TW.blue500;
  } else if (state === "selectedHover") {
    stroke = TW.blue600;
  } else if (state === "hover") {
    stroke = guideEmphasisColor(userColor);
  } else {
    stroke = userColor;
  }
  if (axis === "v") {
    return {
      position: "fixed",
      left: pos,
      top: 0,
      width: 1,
      height: "100vh",
      backgroundColor: stroke,
      pointerEvents: "none",
      boxSizing: "border-box",
    };
  }
  return {
    position: "fixed",
    left: 0,
    top: pos,
    width: "100vw",
    height: 1,
    backgroundColor: stroke,
    pointerEvents: "none",
    boxSizing: "border-box",
  };
}

/**
 * Page-locked guides drawn inside a document-sized layer that uses one `translate(-scrollX,-scrollY)`.
 * `pagePos` is `line.pos` in document space (same as stored).
 */
export function lineVisualStylePageSpace(
  axis: "v" | "h",
  pagePos: number,
  state: LineVisualState,
  userColor: string,
): CSSProperties {
  let stroke: string;
  if (state === "selected") {
    stroke = TW.blue500;
  } else if (state === "selectedHover") {
    stroke = TW.blue600;
  } else if (state === "hover") {
    stroke = guideEmphasisColor(userColor);
  } else {
    stroke = userColor;
  }
  if (axis === "v") {
    return {
      position: "absolute",
      left: pagePos,
      top: 0,
      width: 1,
      height: "100%",
      backgroundColor: stroke,
      pointerEvents: "none",
      boxSizing: "border-box",
    };
  }
  return {
    position: "absolute",
    left: 0,
    top: pagePos,
    width: "100%",
    height: 1,
    backgroundColor: stroke,
    pointerEvents: "none",
    boxSizing: "border-box",
  };
}

export function hitStripStyle(
  axis: "v" | "h",
  pos: number,
  dragging: boolean,
  inspectMode: boolean,
): CSSProperties {
  const cursor = inspectMode
    ? "default"
    : dragging
      ? "grabbing"
      : axis === "v"
        ? "ew-resize"
        : "ns-resize";
  if (axis === "v") {
    return {
      position: "fixed",
      left: pos - HIT_PX / 2,
      top: 0,
      width: HIT_PX,
      height: "100vh",
      cursor,
      pointerEvents: "auto",
      backgroundColor: "transparent",
      boxSizing: "border-box",
    };
  }
  return {
    position: "fixed",
    left: 0,
    top: pos - HIT_PX / 2,
    width: "100vw",
    height: HIT_PX,
    cursor,
    pointerEvents: "auto",
    backgroundColor: "transparent",
    boxSizing: "border-box",
  };
}

/** Hit strips for lines inside the page scroll layer (`pagePos` in document space). */
export function hitStripStylePageSpace(
  axis: "v" | "h",
  pagePos: number,
  dragging: boolean,
  inspectMode: boolean,
): CSSProperties {
  const cursor = inspectMode
    ? "default"
    : dragging
      ? "grabbing"
      : axis === "v"
        ? "ew-resize"
        : "ns-resize";
  if (axis === "v") {
    return {
      position: "absolute",
      left: pagePos - HIT_PX / 2,
      top: 0,
      width: HIT_PX,
      height: "100%",
      cursor,
      pointerEvents: "auto",
      backgroundColor: "transparent",
      boxSizing: "border-box",
    };
  }
  return {
    position: "absolute",
    left: 0,
    top: pagePos - HIT_PX / 2,
    width: "100%",
    height: HIT_PX,
    cursor,
    pointerEvents: "auto",
    backgroundColor: "transparent",
    boxSizing: "border-box",
  };
}

/** Single transform for the page-locked layer — one compositor-friendly update per scroll. */
export function setPageScrollLayerTransform(el: HTMLElement | null): void {
  if (!el) return;
  el.style.transform = `translate3d(${-window.scrollX}px, ${-window.scrollY}px, 0)`;
}

export function visualState(
  lineId: string,
  hoveredLineId: string | null,
  selectedId: string | null,
): LineVisualState {
  const hov = hoveredLineId === lineId;
  const sel = selectedId === lineId;
  if (sel && hov) return "selectedHover";
  if (sel) return "selected";
  if (hov) return "hover";
  return "default";
}
