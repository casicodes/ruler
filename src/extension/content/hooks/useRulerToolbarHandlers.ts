import { useCallback } from "react";

import { playCameraShutterSound } from "../ruler/audio";
import type { MeasureTipState, PinnedLine } from "../ruler/types";

export function useRulerToolbarHandlers(args: {
  dismissToolbarMenus: () => void;
  setHideChromeForCapture: React.Dispatch<React.SetStateAction<boolean>>;
  hideChromeForCapture: boolean;
  guides: {
    lines: { length: number };
    pushUndoBeforeLinesChange: () => void;
    setLines: React.Dispatch<React.SetStateAction<PinnedLine[]>>;
    setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  };
  toolMode: {
    setInspectMode: React.Dispatch<React.SetStateAction<boolean>>;
    setToolActive: React.Dispatch<React.SetStateAction<boolean>>;
  };
  inspect: {
    setMeasureTip: React.Dispatch<React.SetStateAction<MeasureTipState | null>>;
    setInspectAnchor: React.Dispatch<React.SetStateAction<Element | null>>;
  };
}) {
  const {
    dismissToolbarMenus,
    setHideChromeForCapture,
    hideChromeForCapture,
    guides,
    toolMode,
    inspect,
  } = args;

  const handleInspectToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissToolbarMenus();
    toolMode.setInspectMode((prev) => {
      const next = !prev;
      if (prev) {
        inspect.setMeasureTip(null);
        inspect.setInspectAnchor(null);
      }
      if (next) toolMode.setToolActive(false);
      return next;
    });
  };

  const handleRulerButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissToolbarMenus();
    if (e.shiftKey) {
      dismissToolbarMenus();
      if (guides.lines.length > 0) guides.pushUndoBeforeLinesChange();
      guides.setLines([]);
      guides.setSelectedId(null);
      return;
    }
    toolMode.setToolActive((prev) => {
      const next = !prev;
      if (next) {
        toolMode.setInspectMode(false);
        inspect.setInspectAnchor(null);
      }
      return next;
    });
  };

  const triggerScreenshotCapture = useCallback(() => {
    if (hideChromeForCapture) return;
    dismissToolbarMenus();
    playCameraShutterSound();
    try {
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        return;
      }
      setHideChromeForCapture(true);
    } catch {
      /* not running as an extension */
    }
  }, [hideChromeForCapture, setHideChromeForCapture, dismissToolbarMenus]);

  const handleScreenshotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerScreenshotCapture();
  };

  return {
    handleInspectToggle,
    handleRulerButtonClick,
    handleScreenshotClick,
    triggerScreenshotCapture,
  };
}
