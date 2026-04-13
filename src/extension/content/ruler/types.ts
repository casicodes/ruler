export type SpacingGapDraw =
  | { kind: "h"; x1: number; x2: number; y: number; px: number }
  | { kind: "v"; y1: number; y2: number; x: number; px: number };

export type LineMode = "both" | "vertical" | "horizontal";

/**
 * `pos` is viewport X/Y when `pageLocked` is false; when true, `pos` is document space
 * (vertical: `clientX + scrollX`, horizontal: `clientY + scrollY`).
 * New guides default to page-locked (`pos` in document space).
 */
export type PinnedLine = {
  id: string;
  kind: "v" | "h";
  pos: number;
  pageLocked?: boolean;
};

export type LineVisualState =
  | "default"
  | "hover"
  | "selected"
  | "selectedHover";

export type DragRef = {
  id: string;
  kind: "v" | "h";
  startAxis: number;
  /** Viewport coordinate along the line axis at drag start */
  startPosViewport: number;
  pageLocked: boolean;
  snapCandidates: number[];
};

export type ToolbarDragRef = {
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  moved: boolean;
  pointerId: number;
};

/** Inspect mode hover/anchor measurement overlay (null when hidden). */
export type MeasureTipState = {
  w: number;
  h: number;
  left: number;
  top: number;
  box: { left: number; top: number; width: number; height: number };
  anchorBox: { left: number; top: number; width: number; height: number } | null;
  anchorW: number;
  anchorH: number;
  anchorLabelLeft: number;
  anchorLabelTop: number;
  spacingGaps: SpacingGapDraw[];
  hoverMatchesAnchor: boolean;
  /** Pin + ⌥: hide W×H chips; show only gap values */
  altSpacingMode: boolean;
};

export type RulerAppProps = {
  /**
   * When false (extension chrome fully hidden or mid fade-out), do not capture the host page:
   * no crosshair, no interaction swallowing, no global pointer/keyboard hooks — the tab behaves normally.
   */
  hostPageActive?: boolean;
  /**
   * Global R / S / Esc / etc. shortcuts. Defaults to `hostPageActive`; set independently so keys work
   * during overlay fade-in before `hostPageActive` becomes true (see `content/index.tsx`).
   */
  shortcutsActive?: boolean;
  /**
   * Duration (ms) for the floating toolbar scale transition when the overlay appears or hides.
   * Independent of the full-overlay opacity fade and of palette menu animations.
   */
  toolbarChromeToggleMs?: number;
};
