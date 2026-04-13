import { isUnderRulerExtensionHost } from "./dom-host";
import { newLineId, toViewportPos } from "./guides";
import {
  SNAP_MIN_BOX_PX,
  SNAP_SKIP_TAGS,
  SNAP_THRESHOLD_PX,
  SNAP_VIEWPORT_MARGIN,
} from "./tokens";
import type { PinnedLine } from "./types";

/** rAF frame token — DOM snap cache is valid for at most one display frame. */
let snapDomFrameSeq = 0;
let snapDomFrameLoopStarted = false;
let snapDomEdgesCache: { v: number[]; h: number[]; seq: number } | null = null;
let snapDomInvalidatorsInstalled = false;
let snapDomMutationRaf = 0;

function ensureSnapDomFrameLoop() {
  if (snapDomFrameLoopStarted) return;
  snapDomFrameLoopStarted = true;
  const tick = () => {
    snapDomFrameSeq++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function invalidateSnapDomEdgesCache() {
  snapDomEdgesCache = null;
}

function invalidateSnapDomEdgesCacheMutation() {
  if (snapDomMutationRaf) return;
  snapDomMutationRaf = requestAnimationFrame(() => {
    snapDomMutationRaf = 0;
    snapDomEdgesCache = null;
  });
}

function ensureSnapDomInvalidators() {
  if (snapDomInvalidatorsInstalled) return;
  snapDomInvalidatorsInstalled = true;
  const inv = invalidateSnapDomEdgesCache;
  window.addEventListener("resize", inv);
  document.addEventListener("scroll", inv, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", inv);
    window.visualViewport.addEventListener("scroll", inv);
  }
  try {
    const mo = new MutationObserver(invalidateSnapDomEdgesCacheMutation);
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  } catch {
    /* ignore */
  }
}

/** One layout pass — vertical and horizontal snap targets (used for cursor preview + guide drag). */
function collectElementSnapEdgesPair(): { v: number[]; h: number[] } {
  ensureSnapDomFrameLoop();
  ensureSnapDomInvalidators();
  if (
    snapDomEdgesCache &&
    snapDomEdgesCache.seq === snapDomFrameSeq
  ) {
    return { v: snapDomEdgesCache.v, h: snapDomEdgesCache.h };
  }

  const v: number[] = [];
  const h: number[] = [];
  if (typeof document === "undefined" || !document.body) {
    return { v, h };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let list: HTMLCollectionOf<Element>;
  try {
    list = document.body.getElementsByTagName("*");
  } catch {
    return { v, h };
  }
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    if (!(el instanceof Element)) continue;
    if (isUnderRulerExtensionHost(el)) continue;
    if (SNAP_SKIP_TAGS.has(el.tagName)) continue;
    let r: DOMRect;
    try {
      r = el.getBoundingClientRect();
    } catch {
      continue;
    }
    if (r.width <= 0 && r.height <= 0) continue;
    if (r.width < SNAP_MIN_BOX_PX && r.height < SNAP_MIN_BOX_PX) continue;
    if (
      r.bottom < -SNAP_VIEWPORT_MARGIN ||
      r.top > vh + SNAP_VIEWPORT_MARGIN ||
      r.right < -SNAP_VIEWPORT_MARGIN ||
      r.left > vw + SNAP_VIEWPORT_MARGIN
    ) {
      continue;
    }
    v.push(r.left, r.right, (r.left + r.right) / 2);
    h.push(r.top, r.bottom, (r.top + r.bottom) / 2);
  }
  snapDomEdgesCache = { v, h, seq: snapDomFrameSeq };
  return { v, h };
}

/** New guides default to page space (document coordinates). */
export function createPinnedLineFromViewportSnap(
  kind: "v" | "h",
  viewportSnapped: number,
): PinnedLine {
  const sx = window.scrollX;
  const sy = window.scrollY;
  return {
    id: newLineId(),
    kind,
    pos: kind === "v" ? viewportSnapped + sx : viewportSnapped + sy,
    pageLocked: true,
  };
}

export function buildSnapCandidates(
  kind: "v" | "h",
  lines: PinnedLine[],
  excludeLineId: string | null,
): number[] {
  const pair = collectElementSnapEdgesPair();
  const dom = kind === "v" ? pair.v : pair.h;
  const fromGuides = lines
    .filter((l) => l.kind === kind && (!excludeLineId || l.id !== excludeLineId))
    .map((l) => toViewportPos(l));
  return dom.concat(fromGuides);
}

/** Both axes for cursor preview (single DOM walk + guide positions). */
export function buildSnapCandidatesPair(
  lines: PinnedLine[],
  excludeLineId: string | null,
): { v: number[]; h: number[] } {
  const pair = collectElementSnapEdgesPair();
  const vGuides = lines
    .filter((l) => l.kind === "v" && (!excludeLineId || l.id !== excludeLineId))
    .map((l) => toViewportPos(l));
  const hGuides = lines
    .filter((l) => l.kind === "h" && (!excludeLineId || l.id !== excludeLineId))
    .map((l) => toViewportPos(l));
  return {
    v: pair.v.concat(vGuides),
    h: pair.h.concat(hGuides),
  };
}

export function snapToNearest(
  raw: number,
  candidates: number[],
  threshold: number,
): number {
  if (candidates.length === 0) return raw;
  let best = raw;
  let bestDist = threshold + 1;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const d = Math.abs(c - raw);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= threshold ? best : raw;
}

export function snapGuideAxis(
  raw: number,
  kind: "v" | "h",
  lines: PinnedLine[],
  excludeLineId: string | null,
  shiftKey: boolean,
): number {
  if (shiftKey) return raw;
  const candidates = buildSnapCandidates(kind, lines, excludeLineId);
  return snapToNearest(raw, candidates, SNAP_THRESHOLD_PX);
}
