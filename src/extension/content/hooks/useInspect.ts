import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import { pageElementFromPoint } from "../ruler/dom-host";
import { computeGapsBetweenRects, resolveSpacingPeers } from "../ruler/spacing";
import { SAFE_INSET } from "../ruler/tokens";
import type { MeasureTipState, SpacingGapDraw } from "../ruler/types";

export function useInspect(args: {
  hostPageActive: boolean;
  inspectMode: boolean;
  /** True while the pointer is over the floating toolbar (or its portaled menus). Suppresses measure pills. */
  pointerOverToolbarRef: React.MutableRefObject<boolean>;
  registerInspectSetters: (
    v: {
      setMeasureTip: React.Dispatch<
        React.SetStateAction<MeasureTipState | null>
      >;
      setInspectAnchor: React.Dispatch<React.SetStateAction<Element | null>>;
    } | null,
  ) => void;
}) {
  const { hostPageActive, inspectMode, pointerOverToolbarRef, registerInspectSetters } =
    args;

  const [measureTip, setMeasureTip] = useState<MeasureTipState | null>(null);
  const [inspectAnchor, setInspectAnchor] = useState<Element | null>(null);
  const lastPointerClientRef = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const lastAltKeyRef = useRef(false);

  useLayoutEffect(() => {
    registerInspectSetters({ setMeasureTip, setInspectAnchor });
    return () => registerInspectSetters(null);
  }, [registerInspectSetters]);

  const updateMeasureTooltip = useCallback(
    (e: MouseEvent) => {
      if (!inspectMode) {
        setMeasureTip(null);
        return;
      }

      if (pointerOverToolbarRef.current) {
        setMeasureTip(null);
        return;
      }

      let anchorEl = inspectAnchor;
      if (anchorEl && !document.contains(anchorEl)) {
        anchorEl = null;
        setInspectAnchor(null);
      }

      const el = pageElementFromPoint(e.clientX, e.clientY);
      if (!el) {
        setMeasureTip(null);
        return;
      }

      const spacingPeers =
        anchorEl && e.altKey ? resolveSpacingPeers(anchorEl, el) : null;
      /** ⌥: use sibling peers (e.g. both `<li>`) so gap math matches layout rows, not `<a>` vs `<ul>` */
      const hoverForDisplay = spacingPeers?.hoverPeer ?? el;
      const r = hoverForDisplay.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      const OFFSET = 14;
      /** Rough max bounds so the label stays on-screen before first paint */
      const TIP_MAX_W = 120;
      const TIP_MAX_H = 44;
      let left = e.clientX + OFFSET;
      let top = e.clientY + OFFSET;
      left = Math.min(left, window.innerWidth - TIP_MAX_W - SAFE_INSET);
      top = Math.min(top, window.innerHeight - TIP_MAX_H - SAFE_INSET);
      left = Math.max(SAFE_INSET, left);
      top = Math.max(SAFE_INSET, top);

      let anchorBox: {
        left: number;
        top: number;
        width: number;
        height: number;
      } | null = null;
      let anchorW = 0;
      let anchorH = 0;
      let anchorLabelLeft = SAFE_INSET;
      let anchorLabelTop = SAFE_INSET;
      let spacingGaps: SpacingGapDraw[] = [];
      let anchorRectEl: Element | null = null;

      if (anchorEl) {
        anchorRectEl =
          e.altKey && spacingPeers ? spacingPeers.anchorPeer : anchorEl;
        const ar = anchorRectEl.getBoundingClientRect();
        anchorW = Math.round(ar.width);
        anchorH = Math.round(ar.height);
        anchorBox = {
          left: ar.left,
          top: ar.top,
          width: ar.width,
          height: ar.height,
        };
        const LABEL_PAD = 6;
        const labelW = 88;
        const labelH = 28;
        anchorLabelLeft = ar.left;
        anchorLabelTop = ar.top - labelH - LABEL_PAD;
        if (anchorLabelTop < SAFE_INSET) {
          anchorLabelTop = Math.min(
            window.innerHeight - labelH - SAFE_INSET,
            ar.bottom + LABEL_PAD,
          );
        }
        anchorLabelLeft = Math.min(
          Math.max(SAFE_INSET, anchorLabelLeft),
          window.innerWidth - labelW - SAFE_INSET,
        );
        anchorLabelTop = Math.max(
          SAFE_INSET,
          Math.min(anchorLabelTop, window.innerHeight - labelH - SAFE_INSET),
        );

        const alt = e.altKey;
        if (alt && spacingPeers) {
          spacingGaps = computeGapsBetweenRects(ar, r);
        }
      }

      const altSpacingMode = !!(anchorEl && e.altKey);

      setMeasureTip({
        w,
        h,
        left,
        top,
        box: {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        },
        anchorBox,
        anchorW,
        anchorH,
        anchorLabelLeft,
        anchorLabelTop,
        spacingGaps,
        hoverMatchesAnchor: !!(
          anchorEl &&
          (hoverForDisplay === anchorEl || el === anchorEl)
        ),
        altSpacingMode,
      });
    },
    [inspectMode, inspectAnchor, pointerOverToolbarRef],
  );

  const updateMeasureTooltipRef = useRef(updateMeasureTooltip);
  useLayoutEffect(() => {
    updateMeasureTooltipRef.current = updateMeasureTooltip;
  }, [updateMeasureTooltip]);

  useEffect(() => {
    const onWinBlur = () => setMeasureTip(null);
    window.addEventListener("blur", onWinBlur);
    return () => window.removeEventListener("blur", onWinBlur);
  }, []);

  /** Recompute inspect overlay after anchor click (pointer may not move). */
  useEffect(() => {
    if (!hostPageActive || !inspectMode) return;
    const { x, y } = lastPointerClientRef.current;
    const ev = new MouseEvent("mousemove", {
      clientX: x,
      clientY: y,
      altKey: lastAltKeyRef.current,
    });
    updateMeasureTooltip(ev);
  }, [hostPageActive, inspectMode, inspectAnchor, updateMeasureTooltip]);

  /** ⌥ without moving the pointer should still toggle spacing overlays. */
  useEffect(() => {
    if (!hostPageActive || !inspectMode) return;
    const sync = (e: KeyboardEvent) => {
      lastAltKeyRef.current = e.altKey;
      const { x, y } = lastPointerClientRef.current;
      updateMeasureTooltip(
        new MouseEvent("mousemove", {
          clientX: x,
          clientY: y,
          altKey: e.altKey,
        }),
      );
    };
    window.addEventListener("keydown", sync, true);
    window.addEventListener("keyup", sync, true);
    return () => {
      window.removeEventListener("keydown", sync, true);
      window.removeEventListener("keyup", sync, true);
    };
  }, [hostPageActive, inspectMode, updateMeasureTooltip]);

  /**
   * Measure rects come from getBoundingClientRect() at the last pointer sample. Without a
   * scroll refresh, fixed overlays stay one frame (or more) behind the page while scrolling.
   */
  useEffect(() => {
    if (!hostPageActive || !inspectMode) return;

    const refreshFromLastPointer = () => {
      const { x, y } = lastPointerClientRef.current;
      flushSync(() => {
        updateMeasureTooltipRef.current(
          new MouseEvent("mousemove", {
            clientX: x,
            clientY: y,
            altKey: lastAltKeyRef.current,
          }),
        );
      });
    };

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("scroll", refreshFromLastPointer, opts);
    window.addEventListener("resize", refreshFromLastPointer);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("scroll", refreshFromLastPointer);
      vv.addEventListener("resize", refreshFromLastPointer);
    }
    return () => {
      window.removeEventListener("scroll", refreshFromLastPointer, opts);
      window.removeEventListener("resize", refreshFromLastPointer);
      if (vv) {
        vv.removeEventListener("scroll", refreshFromLastPointer);
        vv.removeEventListener("resize", refreshFromLastPointer);
      }
    };
  }, [hostPageActive, inspectMode]);

  return {
    measureTip,
    setMeasureTip,
    inspectAnchor,
    setInspectAnchor,
    lastPointerClientRef,
    lastAltKeyRef,
    updateMeasureTooltip,
    updateMeasureTooltipRef,
  };
}
