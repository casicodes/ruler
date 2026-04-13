import { lowestCommonAncestor, pathFromLcaToDescendant } from "./dom-tree";
import type { SpacingGapDraw } from "./types";

/**
 * ⌥ spacing peers — boxes used for gap lines and labels.
 *
 * - **Ancestor/descendant**: compare pin vs hit rects directly (insets or separation).
 * - **Otherwise**: from the LCA, take the first **differing** children on the two paths
 *   (deepest “layer siblings”: flex rows, `<li>`s, grid cells, etc.).
 * - **Fallback**: pin vs hovered element if paths cannot be split.
 */
export function resolveSpacingPeers(
  anchor: Element,
  raw: Element,
): { anchorPeer: Element; hoverPeer: Element } | null {
  if (raw === anchor) return null;

  if (anchor.contains(raw)) {
    return { anchorPeer: anchor, hoverPeer: raw };
  }
  if (raw.contains(anchor)) {
    return { anchorPeer: anchor, hoverPeer: raw };
  }

  const lca = lowestCommonAncestor(anchor, raw);
  if (
    !lca ||
    lca === document.body ||
    lca === document.documentElement
  ) {
    return { anchorPeer: anchor, hoverPeer: raw };
  }

  const pa = pathFromLcaToDescendant(lca, anchor);
  const pb = pathFromLcaToDescendant(lca, raw);
  if (!pa || !pb) {
    return { anchorPeer: anchor, hoverPeer: raw };
  }

  let k = 0;
  while (
    k + 1 < pa.length &&
    k + 1 < pb.length &&
    pa[k + 1] === pb[k + 1]
  ) {
    k++;
  }

  const ca = pa[k + 1];
  const cb = pb[k + 1];
  if (ca && cb && ca !== cb) {
    return { anchorPeer: ca, hoverPeer: cb };
  }

  return { anchorPeer: anchor, hoverPeer: raw };
}

export function computeGapsBetweenRects(a: DOMRect, b: DOMRect): SpacingGapDraw[] {
  const out: SpacingGapDraw[] = [];

  const xOverlap = !(a.right <= b.left || b.right <= a.left);
  const yOverlap = !(a.bottom <= b.top || b.bottom <= a.top);

  if (!xOverlap) {
    const gapPx = a.right <= b.left ? b.left - a.right : a.left - b.right;
    if (gapPx > 0) {
      const yTop = Math.max(a.top, b.top);
      const yBot = Math.min(a.bottom, b.bottom);
      const yLine =
        yTop < yBot
          ? (yTop + yBot) / 2
          : (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2;
      const x1 = a.right <= b.left ? a.right : b.right;
      const x2 = a.right <= b.left ? b.left : a.left;
      out.push({
        kind: "h",
        x1,
        x2,
        y: yLine,
        px: Math.round(gapPx),
      });
    }
  }

  if (!yOverlap) {
    const gapPx = a.bottom <= b.top ? b.top - a.bottom : a.top - b.bottom;
    if (gapPx > 0) {
      const xLeft = Math.max(a.left, b.left);
      const xRight = Math.min(a.right, b.right);
      const xLine =
        xLeft < xRight
          ? (xLeft + xRight) / 2
          : (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2;
      const y1 = a.bottom <= b.top ? a.bottom : b.bottom;
      const y2 = a.bottom <= b.top ? b.top : a.top;
      out.push({
        kind: "v",
        y1,
        y2,
        x: xLine,
        px: Math.round(gapPx),
      });
    }
  }

  if (xOverlap && yOverlap) {
    const bInA =
      a.left <= b.left &&
      a.right >= b.right &&
      a.top <= b.top &&
      a.bottom >= b.bottom;
    const aInB =
      b.left <= a.left &&
      b.right >= a.right &&
      b.top <= a.top &&
      b.bottom >= a.bottom;
    if (bInA && !aInB) {
      const cx = (b.left + b.right) / 2;
      const cy = (b.top + b.bottom) / 2;
      const t = Math.round(b.top - a.top);
      const l = Math.round(b.left - a.left);
      const r = Math.round(a.right - b.right);
      const bot = Math.round(a.bottom - b.bottom);
      if (t > 0)
        out.push({ kind: "v", y1: a.top, y2: b.top, x: cx, px: t });
      if (l > 0)
        out.push({ kind: "h", x1: a.left, x2: b.left, y: cy, px: l });
      if (r > 0)
        out.push({ kind: "h", x1: b.right, x2: a.right, y: cy, px: r });
      if (bot > 0)
        out.push({ kind: "v", y1: b.bottom, y2: a.bottom, x: cx, px: bot });
    } else if (aInB && !bInA) {
      const cx = (a.left + a.right) / 2;
      const cy = (a.top + a.bottom) / 2;
      const t = Math.round(a.top - b.top);
      const l = Math.round(a.left - b.left);
      const r = Math.round(b.right - a.right);
      const bot = Math.round(b.bottom - a.bottom);
      if (t > 0)
        out.push({ kind: "v", y1: b.top, y2: a.top, x: cx, px: t });
      if (l > 0)
        out.push({ kind: "h", x1: b.left, x2: a.left, y: cy, px: l });
      if (r > 0)
        out.push({ kind: "h", x1: a.right, x2: b.right, y: cy, px: r });
      if (bot > 0)
        out.push({ kind: "v", y1: a.bottom, y2: b.bottom, x: cx, px: bot });
    } else {
      /** Intersecting but neither contains the other — show center Δ (staggered / offset cards). */
      const acx = (a.left + a.right) / 2;
      const acy = (a.top + a.bottom) / 2;
      const bcx = (b.left + b.right) / 2;
      const bcy = (b.top + b.bottom) / 2;
      const dcx = Math.round(Math.abs(bcx - acx));
      const dcy = Math.round(Math.abs(bcy - acy));
      if (dcx > 0) {
        out.push({
          kind: "h",
          x1: Math.min(acx, bcx),
          x2: Math.max(acx, bcx),
          y: (acy + bcy) / 2,
          px: dcx,
        });
      }
      if (dcy > 0) {
        out.push({
          kind: "v",
          y1: Math.min(acy, bcy),
          y2: Math.max(acy, bcy),
          x: (acx + bcx) / 2,
          px: dcy,
        });
      }
    }
  }

  return out;
}
