import { useEffect, useLayoutEffect } from "react";

import { swallowHostInteractionWhileRulerActive } from "../ruler/interaction";
import {
  RULER_PAGE_CROSSHAIR_ATTR,
  RULER_PAGE_CROSSHAIR_STYLE_ID,
  STORAGE_COLOR,
} from "../ruler/tokens";

/**
 * Page-level side effects that are not owned by guide/inspect/toolbar/shortcut hooks:
 * color persistence, crosshair cursor, host swallow, screenshot chrome hide.
 */
export function useRulerChromeEffects(args: {
  hostPageActive: boolean;
  toolActive: boolean;
  inspectMode: boolean;
  color: string;
  hideChromeForCapture: boolean;
  setHideChromeForCapture: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    hostPageActive,
    toolActive,
    inspectMode,
    color,
    hideChromeForCapture,
    setHideChromeForCapture,
  } = args;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLOR, color);
    } catch {
      /* ignore */
    }
  }, [color]);

  /**
   * Ruler mode: crosshair on the host page. Uses `!important` on `html` + `body *` so
   * interactive elements’ `cursor: pointer` does not win over inherited `html` cursor.
   * Extension UI lives in shadow DOM and is not matched by `body *`, so toolbar cursors stay as-is.
   * Inspect mode: default arrow on `html` only (prior behavior).
   */
  useEffect(() => {
    const removePageCrosshair = () => {
      document.documentElement.removeAttribute(RULER_PAGE_CROSSHAIR_ATTR);
      document.getElementById(RULER_PAGE_CROSSHAIR_STYLE_ID)?.remove();
    };

    if (!hostPageActive) {
      removePageCrosshair();
      document.documentElement.style.removeProperty("cursor");
      return () => {
        removePageCrosshair();
        document.documentElement.style.removeProperty("cursor");
      };
    }

    if (toolActive && !inspectMode) {
      removePageCrosshair();
      document.documentElement.setAttribute(RULER_PAGE_CROSSHAIR_ATTR, "");
      let styleEl = document.getElementById(RULER_PAGE_CROSSHAIR_STYLE_ID);
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = RULER_PAGE_CROSSHAIR_STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `html[${RULER_PAGE_CROSSHAIR_ATTR}], html[${RULER_PAGE_CROSSHAIR_ATTR}] body, html[${RULER_PAGE_CROSSHAIR_ATTR}] body * { cursor: crosshair !important; }`;
      document.documentElement.style.removeProperty("cursor");
    } else if (inspectMode && !toolActive) {
      removePageCrosshair();
      document.documentElement.style.cursor = "default";
    } else {
      removePageCrosshair();
      document.documentElement.style.removeProperty("cursor");
    }
    return () => {
      removePageCrosshair();
      document.documentElement.style.removeProperty("cursor");
    };
  }, [hostPageActive, inspectMode, toolActive]);

  /**
   * Ruler tool on and/or inspect mode: stop links, buttons, hovers, and form actions on
   * the host page. Registered on `document` capture; `onDocumentClick` on document capture
   * is registered first so guide placement still runs before swallow.
   */
  useEffect(() => {
    if (!hostPageActive || (!inspectMode && !toolActive)) return;
    const cap = { capture: true } as const;
    const touchCap = { capture: true, passive: false } as const;

    document.addEventListener("pointerdown", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("pointerup", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("pointermove", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("mousedown", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("mouseup", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("mousemove", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("mouseover", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("mouseout", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("click", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("auxclick", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("dblclick", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("submit", swallowHostInteractionWhileRulerActive, cap);
    document.addEventListener("touchstart", swallowHostInteractionWhileRulerActive, touchCap);
    document.addEventListener("touchmove", swallowHostInteractionWhileRulerActive, touchCap);
    document.addEventListener("touchend", swallowHostInteractionWhileRulerActive, touchCap);

    return () => {
      document.removeEventListener("pointerdown", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("pointerup", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("pointermove", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("mousedown", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("mouseup", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("mousemove", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("mouseover", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("mouseout", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("click", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("auxclick", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("dblclick", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("submit", swallowHostInteractionWhileRulerActive, cap);
      document.removeEventListener("touchstart", swallowHostInteractionWhileRulerActive, touchCap);
      document.removeEventListener("touchmove", swallowHostInteractionWhileRulerActive, touchCap);
      document.removeEventListener("touchend", swallowHostInteractionWhileRulerActive, touchCap);
    };
  }, [hostPageActive, inspectMode, toolActive]);

  useLayoutEffect(() => {
    if (!hideChromeForCapture) return;
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          chrome.runtime.sendMessage(
            { type: "CAPTURE_SCREENSHOT" },
            (res: { ok?: boolean; dataUrl?: string } | undefined) => {
              setHideChromeForCapture(false);
              if (chrome.runtime.lastError) {
                return;
              }
              if (!res?.ok || !res.dataUrl) {
                return;
              }
              const a = document.createElement("a");
              a.href = res.dataUrl;
              a.download = `ruler-screenshot-${Date.now()}.png`;
              a.rel = "noopener";
              a.click();
            },
          );
        } catch {
          setHideChromeForCapture(false);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hideChromeForCapture, setHideChromeForCapture]);
}
