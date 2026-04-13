import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { guideMutedColor } from "../ruler/color";
import {
  cursorOverlapsPinnedGuide,
  toggleLinePageLock,
} from "../ruler/guides";
import {
  isEditableTarget,
  isEventFromExtensionUi,
} from "../ruler/interaction";
import { pageElementFromPoint } from "../ruler/dom-host";
import {
  buildSnapCandidates,
  buildSnapCandidatesPair,
  createPinnedLineFromViewportSnap,
  snapGuideAxis,
  snapToNearest,
} from "../ruler/snap";
import {
  clonePinnedLines,
  MAX_LINE_UNDO,
  pinnedLinesEqual,
} from "../ruler/line-history";
import {
  DRAG_THRESHOLD_PX,
  SNAP_THRESHOLD_PX,
} from "../ruler/tokens";
import type { DragRef, LineMode, PinnedLine, ToolbarDragRef } from "../ruler/types";
import type { MeasureTipState } from "../ruler/types";

export function useGuideLines(args: {
  color: string;
  toolbarDragging: boolean;
  hostPageActive: boolean;
  hideChromeForCapture: boolean;
  toolActive: boolean;
  lineMode: LineMode;
  inspectMode: boolean;
  setMeasureTip: React.Dispatch<React.SetStateAction<MeasureTipState | null>>;
  dismissToolbarMenus: () => void;
  setInspectAnchor: React.Dispatch<React.SetStateAction<Element | null>>;
  toolbarDragRef: React.MutableRefObject<ToolbarDragRef | null>;
  endToolbarDrag: () => void;
  skipNextDocClickRef: React.MutableRefObject<boolean>;
  updateMeasureTooltipRef: React.MutableRefObject<(e: MouseEvent) => void>;
  pointerOverToolbarRef: React.MutableRefObject<boolean>;
  isPointOverToolbarChrome: (clientX: number, clientY: number) => boolean;
  lastPointerClientRef: React.MutableRefObject<{ x: number; y: number }>;
  lastAltKeyRef: React.MutableRefObject<boolean>;
}) {
  const {
    color,
    toolbarDragging,
    hostPageActive,
    hideChromeForCapture,
    toolActive,
    lineMode,
    inspectMode,
    setMeasureTip,
    dismissToolbarMenus,
    setInspectAnchor,
    toolbarDragRef,
    endToolbarDrag,
    skipNextDocClickRef,
    updateMeasureTooltipRef,
    pointerOverToolbarRef,
    isPointOverToolbarChrome,
    lastPointerClientRef,
    lastAltKeyRef,
  } = args;

  const dragRef = useRef<DragRef | null>(null);
  const dragMovedRef = useRef(false);

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [lines, setLines] = useState<PinnedLine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);

  const [pointerOverToolbarChrome, setPointerOverToolbarChrome] =
    useState(false);
  const pointerOverToolbarChromeRef = useRef(false);

  const linesRef = useRef(lines);
  const toolActiveRef = useRef(toolActive);
  const inspectModeRef = useRef(inspectMode);
  const hostPageActiveRef = useRef(hostPageActive);
  linesRef.current = lines;
  toolActiveRef.current = toolActive;
  inspectModeRef.current = inspectMode;
  hostPageActiveRef.current = hostPageActive;

  const undoStackRef = useRef<PinnedLine[][]>([]);
  const redoStackRef = useRef<PinnedLine[][]>([]);
  /** Snapshot at line drag start; committed to undo on pointer up if the line moved. */
  const dragUndoBaseRef = useRef<PinnedLine[] | null>(null);

  const pushUndoSnapshot = useCallback((snapshot: PinnedLine[]) => {
    undoStackRef.current.push(clonePinnedLines(snapshot));
    if (undoStackRef.current.length > MAX_LINE_UNDO) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const pushUndoBeforeLinesChange = useCallback(() => {
    pushUndoSnapshot(clonePinnedLines(linesRef.current));
  }, [pushUndoSnapshot]);

  const performUndo = useCallback(() => {
    const past = undoStackRef.current;
    if (past.length === 0) return false;
    const prev = past.pop()!;
    redoStackRef.current.push(clonePinnedLines(linesRef.current));
    setLines(clonePinnedLines(prev));
    setSelectedId(null);
    return true;
  }, []);

  const performRedo = useCallback(() => {
    const future = redoStackRef.current;
    if (future.length === 0) return false;
    const next = future.pop()!;
    undoStackRef.current.push(clonePinnedLines(linesRef.current));
    setLines(clonePinnedLines(next));
    setSelectedId(null);
    return true;
  }, []);

  /**
   * Clicks inside our shadow root are often retargeted so `event.target` is the host, not the
   * hit strip — `closest()` from the host cannot see into the shadow tree. Use composedPath.
   */
  const isClickOnGuideLine = useCallback((e: MouseEvent) => {
    return e.composedPath().some(
      (n) => n instanceof Element && n.hasAttribute("data-ruler-line-hit"),
    );
  }, []);

  const applyDrag = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = d.kind === "v" ? e.clientX - d.startAxis : e.clientY - d.startAxis;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) dragMovedRef.current = true;
    const max = d.kind === "v" ? window.innerWidth : window.innerHeight;
    const clampedVp = Math.max(0, Math.min(max, d.startPosViewport + delta));
    const nextVp = e.shiftKey
      ? clampedVp
      : snapToNearest(clampedVp, d.snapCandidates, SNAP_THRESHOLD_PX);
    const stored = d.pageLocked
      ? d.kind === "v"
        ? nextVp + window.scrollX
        : nextVp + window.scrollY
      : nextVp;
    setLines((prev) => {
      const next = prev.map((l) =>
        l.id === d.id ? { ...l, pos: stored } : l,
      );
      linesRef.current = next;
      return next;
    });
  }, []);

  const endDrag = useCallback(() => {
    const startSnap = dragUndoBaseRef.current;
    dragUndoBaseRef.current = null;
    if (dragMovedRef.current && startSnap) {
      if (!pinnedLinesEqual(startSnap, linesRef.current)) {
        pushUndoSnapshot(startSnap);
      }
    }
    if (dragMovedRef.current) skipNextDocClickRef.current = true;
    dragRef.current = null;
    dragMovedRef.current = false;
    setDraggingLineId(null);
  }, [pushUndoSnapshot, skipNextDocClickRef]);

  useEffect(() => {
    if (!hideChromeForCapture) return;
    pointerOverToolbarChromeRef.current = false;
    setPointerOverToolbarChrome(false);
  }, [hideChromeForCapture]);

  /** Toolbar icon hid the overlay: end interactions so the host page works normally (no stuck drag / palette). */
  useEffect(() => {
    if (hostPageActive) return;
    endDrag();
    endToolbarDrag();
    setCursor(null);
    setMeasureTip(null);
    dismissToolbarMenus();
    pointerOverToolbarChromeRef.current = false;
    setPointerOverToolbarChrome(false);
  }, [
    hostPageActive,
    endDrag,
    endToolbarDrag,
    setMeasureTip,
    dismissToolbarMenus,
  ]);

  const onDocumentClick = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return;

      /** If pointerup was missed, a later click still ends the toolbar drag and does not place guides */
      if (toolbarDragRef.current) {
        endToolbarDrag();
        return;
      }

      if (skipNextDocClickRef.current) {
        skipNextDocClickRef.current = false;
        if (!isClickOnGuideLine(e) && !isEditableTarget(e.target)) {
          setSelectedId(null);
        }
        return;
      }

      /** Any click outside guide hit-areas (and not in a field) clears line selection */
      if (!isClickOnGuideLine(e) && !isEditableTarget(e.target)) {
        setSelectedId(null);
      }

      /** Inspect: click pins an element; click empty page clears (⌥-hover shows gaps vs related nodes) */
      if (
        inspectMode &&
        !isEventFromExtensionUi(e) &&
        !isEditableTarget(e.target) &&
        !isClickOnGuideLine(e)
      ) {
        const el = pageElementFromPoint(e.clientX, e.clientY);
        if (
          !el ||
          el === document.documentElement ||
          el === document.body
        ) {
          setInspectAnchor(null);
        } else {
          setInspectAnchor(el);
        }
      }

      if (!toolActive) return;
      /** Guide hit areas live in the shadow host; `isEventFromExtensionUi` is true for those clicks too. */
      if (isEventFromExtensionUi(e) && !isClickOnGuideLine(e)) return;
      if (isEditableTarget(e.target)) return;

      const x = e.clientX;
      const y = e.clientY;

      if (isClickOnGuideLine(e)) {
        /**
         * Hit strips span the full viewport; at crossings one element wins in `composedPath`, so a
         * click can “hit” only the opposite orientation’s strip. Resolve placement from (x, y) and
         * `lineMode`: add the requested axis(es) if not already present (same as “both” at crossings).
         * Only the first click of a double-click adds lines (second click is for lock toggle).
         */
        if (e.detail === 1) {
          pushUndoBeforeLinesChange();
          setLines((prev) => {
            const next = [...prev];
            const sx = snapGuideAxis(x, "v", prev, null, e.shiftKey);
            const sy = snapGuideAxis(y, "h", prev, null, e.shiftKey);
            if (lineMode === "both" || lineMode === "vertical") {
              const needV = !prev.some(
                (l) => l.kind === "v" && cursorOverlapsPinnedGuide(sx, l),
              );
              if (needV) next.push(createPinnedLineFromViewportSnap("v", sx));
            }
            if (lineMode === "both" || lineMode === "horizontal") {
              const needH = !prev.some(
                (l) => l.kind === "h" && cursorOverlapsPinnedGuide(sy, l),
              );
              if (needH) next.push(createPinnedLineFromViewportSnap("h", sy));
            }
            return next;
          });
        }
        return;
      }

      pushUndoBeforeLinesChange();
      setLines((prev) => {
        const next = [...prev];
        const sx = snapGuideAxis(x, "v", prev, null, e.shiftKey);
        const sy = snapGuideAxis(y, "h", prev, null, e.shiftKey);
        if (lineMode === "both" || lineMode === "vertical") {
          next.push(createPinnedLineFromViewportSnap("v", sx));
        }
        if (lineMode === "both" || lineMode === "horizontal") {
          next.push(createPinnedLineFromViewportSnap("h", sy));
        }
        return next;
      });
    },
    [
      toolActive,
      inspectMode,
      lineMode,
      isClickOnGuideLine,
      endToolbarDrag,
      pushUndoBeforeLinesChange,
      toolbarDragRef,
      skipNextDocClickRef,
      setInspectAnchor,
    ],
  );

  const onPointerMove = useCallback(
    (e: MouseEvent) => {
      if (!hostPageActiveRef.current) {
        pointerOverToolbarRef.current = false;
        return;
      }
      lastPointerClientRef.current = { x: e.clientX, y: e.clientY };
      const overChrome = isPointOverToolbarChrome(e.clientX, e.clientY);
      pointerOverToolbarRef.current = overChrome;
      if (overChrome !== pointerOverToolbarChromeRef.current) {
        pointerOverToolbarChromeRef.current = overChrome;
        setPointerOverToolbarChrome(overChrome);
      }
      if (inspectModeRef.current) lastAltKeyRef.current = e.altKey;
      if (toolActiveRef.current) {
        let cx = e.clientX;
        let cy = e.clientY;
        /** Snap crosshair previews to layout + guides; raw pointer while inspect, Shift, or dragging a guide. */
        if (
          !inspectModeRef.current &&
          !e.shiftKey &&
          !dragRef.current
        ) {
          const both = buildSnapCandidatesPair(linesRef.current, null);
          cx = snapToNearest(cx, both.v, SNAP_THRESHOLD_PX);
          cy = snapToNearest(cy, both.h, SNAP_THRESHOLD_PX);
        }
        setCursor({ x: cx, y: cy });
      }
      if (dragRef.current) applyDrag(e);
      updateMeasureTooltipRef.current(e);
    },
    [
      applyDrag,
      isPointOverToolbarChrome,
      lastPointerClientRef,
      lastAltKeyRef,
      pointerOverToolbarRef,
      updateMeasureTooltipRef,
    ],
  );

  const onPointerUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  useEffect(() => {
    if (!hostPageActive) return;
    window.addEventListener("mousemove", onPointerMove, true);
    window.addEventListener("mouseup", onPointerUp, true);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("mousemove", onPointerMove, true);
      window.removeEventListener("mouseup", onPointerUp, true);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [hostPageActive, onPointerMove, onPointerUp, onDocumentClick]);

  const handleLinePointerDown = (line: PinnedLine) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(line.id);
    dragMovedRef.current = false;
    dragUndoBaseRef.current = clonePinnedLines(lines);
    const sx = window.scrollX;
    const sy = window.scrollY;
    const pageLocked = Boolean(line.pageLocked);
    const startPosViewport =
      line.kind === "v"
        ? pageLocked
          ? line.pos - sx
          : line.pos
        : pageLocked
          ? line.pos - sy
          : line.pos;
    dragRef.current = {
      id: line.id,
      kind: line.kind,
      startAxis: line.kind === "v" ? e.clientX : e.clientY,
      startPosViewport,
      pageLocked,
      snapCandidates: buildSnapCandidates(line.kind, lines, line.id),
    };
    setDraggingLineId(line.id);
  };

  /** Ensures click (not only mousedown) selects; keeps selection when event.target is retargeted */
  const handleLineClick = (line: PinnedLine) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(line.id);
  };

  const handleLineDoubleClick = useCallback(
    (line: PinnedLine) => (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      pushUndoBeforeLinesChange();
      setLines((prev) => {
        const cur = prev.find((x) => x.id === line.id);
        if (!cur) return prev;
        const next = prev.map((l) =>
          l.id === line.id ? toggleLinePageLock(cur) : l,
        );
        linesRef.current = next;
        return next;
      });
      setSelectedId(line.id);
      skipNextDocClickRef.current = true;
    },
    [pushUndoBeforeLinesChange, skipNextDocClickRef],
  );

  const showCursorVerticalPreview = Boolean(
    toolActive &&
      cursor &&
      !inspectMode &&
      !toolbarDragging &&
      !pointerOverToolbarChrome &&
      lineMode !== "horizontal" &&
      !lines.some(
        (l) =>
          l.kind === "v" && cursorOverlapsPinnedGuide(cursor.x, l),
      ),
  );

  const showCursorHorizontalPreview = Boolean(
    toolActive &&
      cursor &&
      !inspectMode &&
      !toolbarDragging &&
      !pointerOverToolbarChrome &&
      lineMode !== "vertical" &&
      !lines.some(
        (l) =>
          l.kind === "h" && cursorOverlapsPinnedGuide(cursor.y, l),
      ),
  );

  const livePreviewGuideColor = useMemo(
    () => guideMutedColor(color),
    [color],
  );

  return {
    lines,
    setLines,
    linesRef,
    selectedId,
    setSelectedId,
    hoveredLineId,
    setHoveredLineId,
    draggingLineId,
    cursor,
    dragRef,
    undoStackRef,
    redoStackRef,
    pushUndoBeforeLinesChange,
    performUndo,
    performRedo,
    handleLinePointerDown,
    handleLineClick,
    handleLineDoubleClick,
    pointerOverToolbarChrome,
    isClickOnGuideLine,
    showCursorVerticalPreview,
    showCursorHorizontalPreview,
    livePreviewGuideColor,
  };
}
