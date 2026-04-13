import type { CSSProperties } from "react";

import { RULER_PALETTE } from "./tokens";

export function normalizeHex(hex: string): string {
  let h = hex.trim().replace("#", "").toLowerCase();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length < 6) h = h.padEnd(6, "0");
  return `#${h.slice(0, 6)}`;
}

export function colorsMatch(a: string, b: string): boolean {
  return normalizeHex(a) === normalizeHex(b);
}

function hexRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex);
  return [
    parseInt(n.slice(1, 3), 16),
    parseInt(n.slice(3, 5), 16),
    parseInt(n.slice(5, 7), 16),
  ];
}

/** If `hex` is one of `RULER_PALETTE`, return it; otherwise nearest palette color (RGB distance). */
export function snapHexToPalette(hex: string): string {
  const n = normalizeHex(hex);
  for (const p of RULER_PALETTE) {
    if (colorsMatch(n, p.hex)) return n;
  }
  const [r, g, b] = hexRgb(n);
  let best: string = RULER_PALETTE[0].hex;
  let bestD = Infinity;
  for (const p of RULER_PALETTE) {
    const [pr, pg, pb] = hexRgb(p.hex);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p.hex;
    }
  }
  return normalizeHex(best);
}

export function swatchButtonStyle(hex: string, selected: boolean): CSSProperties {
  const isWhite = colorsMatch(hex, "#ffffff");
  const style: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: "50%",
    padding: 0,
    margin: 0,
    display: "block",
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
    flexShrink: 0,
    backgroundColor: hex,
    border: isWhite ? "1px solid #e5e7eb" : "none",
    boxSizing: "border-box",
  };
  if (selected) {
    style.boxShadow = isWhite
      ? "0 0 0 2px #ffffff, 0 0 0 4px #d4d4d8"
      : `0 0 0 2px #ffffff, 0 0 0 4px ${hex}`;
  }
  return style;
}

/** One Tailwind step darker (e.g. 500→600); used for hover on non-selected guides. */
export function guideEmphasisColor(baseHex: string): string {
  return hslDarkenHex(normalizeHex(baseHex), 1);
}

/** One Tailwind step lighter (e.g. 500→400); live crosshair preview before a guide is placed. */
export function guideMutedColor(baseHex: string): string {
  return hslDarkenHex(normalizeHex(baseHex), -1);
}

export function hslDarkenHex(hex: string, steps: number): string {
  const n = normalizeHex(hex);
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const step = 0.085;
  const nl = Math.max(0, Math.min(1, l - step * steps));

  let rn: number;
  let gn: number;
  let bn: number;
  if (s === 0) {
    rn = gn = bn = nl;
  } else {
    const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
    const p = 2 * nl - q;
    const hue2rgb = (p2: number, q2: number, t: number) => {
      let x = t;
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p2 + (q2 - p2) * 6 * x;
      if (x < 1 / 2) return q2;
      if (x < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - x) * 6;
      return p2;
    };
    rn = hue2rgb(p, q, h + 1 / 3);
    gn = hue2rgb(p, q, h);
    bn = hue2rgb(p, q, h - 1 / 3);
  }

  const to255 = (x: number) =>
    Math.min(255, Math.max(0, Math.round(x * 255)));
  return `#${[to255(rn), to255(gn), to255(bn)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}
