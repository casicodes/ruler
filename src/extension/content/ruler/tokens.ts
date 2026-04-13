/** Tailwind default palette (v3/v4 default colors) */
export const TW = {
  red500: "#ef4444",
  /** Tailwind `blue-500` — selected guides */
  blue500: "#3b82f6",
  /** Tailwind `blue-600` — inspect overlay ring, etc. */
  blue600: "#2563eb",
  /** Inspect active toolbar fill (Tailwind blue-700) */
  blue700: "oklch(48.8% 0.243 264.376)",
  /** Tailwind `neutral-800` — measure overlay */
  neutral800: "#262626",
  /** Tailwind `neutral-900` — toolbar icon hover */
  neutral900: "#171717",
  zinc500: "#71717a",
  zinc900: "#18181b",
} as const;

export const ICON = { size: 20 as const, strokeWidth: 1.5 as const };
export const CARET_ICON = { size: 14 as const, strokeWidth: 1.5 as const };

/** Guide line colors — Tailwind 500 */
export const RULER_PALETTE = [
  { hex: "#ef4444", label: "Red" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#eab308", label: "Yellow" },
] as const;

/** Injected into `document.head` so host-page `cursor` (e.g. on links/buttons) does not replace the ruler crosshair. */
export const RULER_PAGE_CROSSHAIR_ATTR = "data-ruler-page-crosshair";
export const RULER_PAGE_CROSSHAIR_STYLE_ID = "ruler-page-crosshair-cursor";

/** Subtle scale: hidden toolbar chrome + palette/menu `ruler-palette-in` keyframe start. */
export const TOOLBAR_OVERLAY_SCALE_HIDDEN = 0.99;

/** Scale-in; `transform-origin` is set inline on popups from toolbar corner (top/bottom × left/right). */
const PALETTE_KEYFRAMES = `
@keyframes ruler-palette-in {
  from { transform: scale(${TOOLBAR_OVERLAY_SCALE_HIDDEN}); }
  to { transform: scale(1); }
}
@keyframes ruler-toolbar-hint-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(1.25); }
}
`;

export const RULER_UI_STYLES = `${PALETTE_KEYFRAMES}
[data-ruler-ui] [data-ruler-pressable] {
  transition: transform 100ms ease;
  transform-origin: center center;
}
[data-ruler-ui] [data-ruler-pressable]:focus,
[data-ruler-ui] [data-ruler-pressable]:focus-visible {
  outline: none;
  box-shadow: none;
}
[data-ruler-ui] button[data-ruler-pressable]::-moz-focus-inner {
  border: 0;
}
[data-ruler-ui] button[data-ruler-pressable]:not(:disabled):active,
[data-ruler-ui] [data-ruler-pressable][role="menuitemradio"]:not([data-disabled]):active {
  transform: scale(0.97);
}
/**
 * Caret: default transparent (OS button chrome can look like a stuck hover).
 * Hover fill only on real hover devices — touch avoids :hover sticky states.
 */
[data-ruler-ui] button[data-ruler-caret-trigger] {
  transition: transform 100ms ease, background-color 100ms ease;
  background-color: transparent;
}
@media (hover: hover) and (pointer: fine) {
  [data-ruler-ui] button[data-ruler-caret-trigger]:hover:not(:disabled) {
    background-color: oklch(97% 0 0);
  }
}
[data-ruler-ui] button[data-ruler-toolbar-icon-btn] {
  transition: transform 100ms ease, background-color 100ms ease;
  background-color: transparent;
  appearance: none;
  -webkit-appearance: none;
}
[data-ruler-ui] button[data-ruler-toolbar-icon-btn] svg,
[data-ruler-ui] button[data-ruler-caret-trigger] svg {
  transition: stroke 100ms ease;
}
@media (hover: hover) and (pointer: fine) {
  [data-ruler-ui] button[data-ruler-toolbar-icon-btn]:hover:not(:disabled):not([data-ruler-toolbar-active]) {
    background-color: oklch(97% 0 0);
  }
  [data-ruler-ui] button[data-ruler-toolbar-icon-btn]:hover:not(:disabled):not([data-ruler-toolbar-active]) svg,
  [data-ruler-ui] button[data-ruler-caret-trigger]:hover:not(:disabled) svg {
    stroke: ${TW.neutral900};
  }
}
[data-ruler-ui] [data-ruler-toolbar-hint-dot] {
  pointer-events: none;
  animation: ruler-toolbar-hint-pulse 1.2s ease-in-out infinite;
}
`;

export const SAFE_INSET = 8;
/** Pinned guides + previews; portaled UI (e.g. color menu) must use `Z_INDEX_UI` or it paints under lines. */
export const Z_INDEX_GUIDE_LINES = 2147483646;
export const Z_INDEX_UI = 2147483647;
/** Outer chrome padding: drag here (and on non-action areas) to move the toolbar */
export const TOOLBAR_PAD = 8;
/** Inner padding of the white toolbar panel */
export const PANEL_INNER_PAD_PX = 4;
/** Flex gap between toolbar segments + dividers */
export const PANEL_ROW_GAP_PX = 3;
/** Minimum square hit target for icon actions; color row uses this height + horizontal inset */
export const ACTION_MIN_PX = 32;
export const STORAGE_TOOLBAR_POS = "ruler-toolbar-pos";
/** Tailwind `ring-1 ring-neutral-100/5` — neutral-100 @ 5% (see tailwindcss/theme.css) */
export const PANEL_SURFACE_RING = "0 0 0 1px oklch(0.97 0 0 / 0.1)";
/** Dark measure chip — soft shadow only (no 1px ring; avoids a second “border” on neutral-800) */
export const MEASURE_TIP_SHADOW =
  "0px 1px 2px 0px rgba(0,0,0,0.35), 0px 0px 1px 0px rgba(0,0,0,0.2)";
/** W×H inspect chips — tighter than `PANEL_SURFACE` (12) to match 6px padding */
export const MEASURE_TIP_BORDER_RADIUS_PX = 6;
/** Spacing gap pills (color fill): soft shadow only — no 1px ring (reads as a dark border) */
export const INSPECT_GAP_LABEL_SHADOW = "0 1px 3px rgba(0,0,0,0.22)";
/** Gap connector lines: custom dash (native `dotted` is too fine) */
export const INSPECT_GAP_DASH_PX = 8;
export const INSPECT_GAP_DASH_GAP_PX = 6;

/** Toolbar + color palette floating surfaces */
export const PANEL_SURFACE = {
  borderRadius: 12,
  boxShadow: `0px 2px 6px 0px rgba(0,0,0,0.16), 0px 0px 1px 0px rgba(0,0,0,0.18), ${PANEL_SURFACE_RING}`,
} as const;

export const STORAGE_COLOR = "ruler-extension-color";
/** Set when the user has clicked any toolbar control so the first-run red dot does not return. */
export const STORAGE_TOOLBAR_HINT_DISMISSED = "ruler-toolbar-hint-dismissed";
export const HIT_PX = 8;
export const DRAG_THRESHOLD_PX = 3;
export const TOOLBAR_DRAG_THRESHOLD_PX = 3;

/** Magnetic guides: snap to element edges/centers and other pinned lines (hold Shift to disable). */
export const SNAP_THRESHOLD_PX = 5;
export const SNAP_MIN_BOX_PX = 3;
export const SNAP_VIEWPORT_MARGIN = 80;

export const SNAP_SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "TITLE",
  "HEAD",
  "NOSCRIPT",
  "TEMPLATE",
  "BR",
  "WBR",
]);

/** Floating toolbar `transform` transition when the overlay turns on/off (palette menus use `PALETTE_POPUP_IN_MS`). */
export const TOOLBAR_SCALE_TOGGLE_MS = 30;
/** Color palette + shortcuts menu scale-in animation duration. */
export const PALETTE_POPUP_IN_MS = 100;
