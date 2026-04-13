import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { rulerMenuPortalContainer } from "../ruler/dom-host";
import {
  SAFE_INSET,
  STORAGE_TOOLBAR_POS,
  TOOLBAR_DRAG_THRESHOLD_PX,
} from "../ruler/tokens";
import { clampToolbarPos, parseStoredToolbarPos } from "../ruler/toolbar-pos";
import type { ToolbarDragRef } from "../ruler/types";

export function useToolbarDrag(args: {
  paletteOpen: boolean;
  shortcutsMenuOpen: boolean;
  skipNextDocClickRef: React.MutableRefObject<boolean>;
}) {
  const { paletteOpen, shortcutsMenuOpen, skipNextDocClickRef } = args;
  const toolbarPopupOpen = paletteOpen || shortcutsMenuOpen;

  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarChromeRef = useRef<HTMLDivElement>(null);
  const panelBarRef = useRef<HTMLDivElement>(null);
  const toolbarDragRef = useRef<ToolbarDragRef | null>(null);
  const toolbarPosRef = useRef<{ x: number; y: number }>({
    x: SAFE_INSET,
    y: SAFE_INSET,
  });

  const [toolbarPos, setToolbarPos] = useState(() => {
    const stored = parseStoredToolbarPos();
    if (stored) return stored;
    return { x: SAFE_INSET, y: SAFE_INSET };
  });
  const [toolbarDragging, setToolbarDragging] = useState(false);

  const [paletteAlignEnd, setPaletteAlignEnd] = useState(false);
  /** Toolbar center is in lower half of viewport — popups open upward with bottom-anchored scale origin. */
  const [paletteAlignBottom, setPaletteAlignBottom] = useState(false);

  const menuPortalContainer = useMemo(() => rulerMenuPortalContainer(), []);

  useLayoutEffect(() => {
    toolbarPosRef.current = toolbarPos;
  }, [toolbarPos]);

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const midX = r.left + r.width / 2;
      const midY = r.top + r.height / 2;
      setPaletteAlignEnd(midX > window.innerWidth / 2);
      setPaletteAlignBottom(midY > window.innerHeight / 2);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [toolbarPos]);

  useLayoutEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    setToolbarPos((p) =>
      clampToolbarPos(p.x, p.y, el.offsetWidth, el.offsetHeight),
    );
  }, []);

  useEffect(() => {
    const onResize = () => {
      const el = toolbarRef.current;
      if (!el) return;
      setToolbarPos((p) =>
        clampToolbarPos(p.x, p.y, el.offsetWidth, el.offsetHeight),
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /**
   * `document.elementFromPoint` + parent walks often miss toolbar nodes: the extension host uses
   * `pointer-events: none`, so the top hit can be the page behind the bar. Use geometry instead.
   */
  const isPointOverToolbarChrome = useCallback(
    (clientX: number, clientY: number) => {
      const inRect = (r: DOMRect) =>
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom;

      const tb = toolbarRef.current;
      if (tb) {
        const r = tb.getBoundingClientRect();
        if (inRect(r)) return true;
      }
      if (toolbarPopupOpen && menuPortalContainer) {
        const popup = menuPortalContainer.querySelector(
          "[data-ruler-toolbar-popup]",
        );
        if (popup instanceof HTMLElement) {
          const r = popup.getBoundingClientRect();
          if (inRect(r)) return true;
        }
      }
      return false;
    },
    [toolbarPopupOpen, menuPortalContainer],
  );

  const applyToolbarDrag = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const d = toolbarDragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      if (
        Math.abs(dx) > TOOLBAR_DRAG_THRESHOLD_PX ||
        Math.abs(dy) > TOOLBAR_DRAG_THRESHOLD_PX
      ) {
        d.moved = true;
      }
      const el = toolbarRef.current;
      const w = el?.offsetWidth ?? 0;
      const h = el?.offsetHeight ?? 0;
      const next = clampToolbarPos(d.originX + dx, d.originY + dy, w, h);
      setToolbarPos(next);
    },
    [],
  );

  const releaseToolbarPointerCapture = useCallback((pointerId: number) => {
    const el = toolbarChromeRef.current;
    if (!el) return;
    try {
      if (el.hasPointerCapture?.(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const endToolbarDrag = useCallback(() => {
    const d = toolbarDragRef.current;
    toolbarDragRef.current = null;
    if (d?.moved) skipNextDocClickRef.current = true;
    if (d) releaseToolbarPointerCapture(d.pointerId);
    setToolbarDragging(false);
    try {
      localStorage.setItem(
        STORAGE_TOOLBAR_POS,
        JSON.stringify(toolbarPosRef.current),
      );
    } catch {
      /* ignore */
    }
  }, [releaseToolbarPointerCapture, skipNextDocClickRef]);

  useEffect(() => {
    const onWinPointerMove = (ev: PointerEvent) => {
      const d = toolbarDragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      applyToolbarDrag(ev);
    };
    const onWinPointerEnd = (ev: PointerEvent) => {
      const d = toolbarDragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      endToolbarDrag();
    };
    window.addEventListener("pointermove", onWinPointerMove, true);
    window.addEventListener("pointerup", onWinPointerEnd, true);
    window.addEventListener("pointercancel", onWinPointerEnd, true);
    return () => {
      window.removeEventListener("pointermove", onWinPointerMove, true);
      window.removeEventListener("pointerup", onWinPointerEnd, true);
      window.removeEventListener("pointercancel", onWinPointerEnd, true);
    };
  }, [applyToolbarDrag, endToolbarDrag]);

  useEffect(() => {
    const onBlur = () => {
      if (toolbarDragRef.current) endToolbarDrag();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && toolbarDragRef.current) {
        endToolbarDrag();
      }
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [endToolbarDrag]);

  const onToolbarChromePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-ruler-toolbar-action]")) return;
      if (t.closest("[data-ruler-toolbar-popup]")) return;
      const el = e.currentTarget as HTMLElement;
      toolbarDragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: toolbarPosRef.current.x,
        originY: toolbarPosRef.current.y,
        moved: false,
        pointerId: e.pointerId,
      };
      setToolbarDragging(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* rare: capture unavailable; window pointer listeners still end the drag */
      }
    },
    [],
  );

  const onToolbarChromePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = toolbarDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      applyToolbarDrag(e);
    },
    [applyToolbarDrag],
  );

  const onToolbarChromePointerEnd = useCallback(
    (e: React.PointerEvent) => {
      const d = toolbarDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      endToolbarDrag();
    },
    [endToolbarDrag],
  );

  return {
    toolbarRef,
    toolbarChromeRef,
    panelBarRef,
    toolbarDragRef,
    toolbarPosRef,
    toolbarPos,
    setToolbarPos,
    toolbarDragging,
    paletteAlignEnd,
    paletteAlignBottom,
    menuPortalContainer,
    isPointOverToolbarChrome,
    applyToolbarDrag,
    endToolbarDrag,
    onToolbarChromePointerDown,
    onToolbarChromePointerMove,
    onToolbarChromePointerEnd,
  };
}
