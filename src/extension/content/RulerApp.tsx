import { memo, useCallback, useEffect, useRef, useState } from "react";

import { GuideOverlay } from "./components/GuideOverlay";
import { InspectOverlay } from "./components/InspectOverlay";
import { Toolbar } from "./components/Toolbar";
import { useGuideLines } from "./hooks/useGuideLines";
import { useInspect } from "./hooks/useInspect";
import { useRulerChromeEffects } from "./hooks/useRulerChromeEffects";
import { useRulerPaletteColor } from "./hooks/useRulerPaletteColor";
import { useRulerToolbarHandlers } from "./hooks/useRulerToolbarHandlers";
import { useShortcuts } from "./hooks/useShortcuts";
import { useToolbarDrag } from "./hooks/useToolbarDrag";
import { useToolMode } from "./hooks/useToolMode";
import type { RulerAppProps } from "./ruler/types";
import {
  STORAGE_TOOLBAR_HINT_DISMISSED,
  TOOLBAR_SCALE_TOGGLE_MS,
} from "./ruler/tokens";

export type { RulerAppProps };

function RulerAppInner({
  hostPageActive = true,
  shortcutsActive: shortcutsActiveProp,
  toolbarChromeToggleMs = TOOLBAR_SCALE_TOGGLE_MS,
}: RulerAppProps) {
  const shortcutsActive = shortcutsActiveProp ?? hostPageActive;

  const skipNextDocClickRef = useRef(false);
  const pointerOverToolbarRef = useRef(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsMenuOpen, setShortcutsMenuOpen] = useState(false);
  const palette = useRulerPaletteColor();

  const dismissToolbarMenus = useCallback(() => {
    setPaletteOpen(false);
    setShortcutsMenuOpen(false);
  }, []);

  /** Toolbar + guides hidden briefly so `captureVisibleTab` omits extension UI. */
  const [hideChromeForCapture, setHideChromeForCapture] = useState(false);

  const [toolbarHintDismissed, setToolbarHintDismissed] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const readHintDismissed = async () => {
      try {
        const storage = globalThis.chrome?.storage?.local;
        if (!storage) return false;

        const res: Record<string, unknown> = await new Promise((resolve, reject) =>
          storage.get([STORAGE_TOOLBAR_HINT_DISMISSED], (items) => {
            const err = globalThis.chrome?.runtime?.lastError;
            if (err) reject(err);
            else resolve(items as Record<string, unknown>);
          }),
        );

        return res[STORAGE_TOOLBAR_HINT_DISMISSED] === "1";
      } catch {
        return false;
      }
    };

    void readHintDismissed().then((dismissed) => {
      if (cancelled) return;
      setToolbarHintDismissed(dismissed);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const acknowledgeToolbarHint = useCallback(() => {
    setToolbarHintDismissed((prev) => {
      if (prev === true) return prev;
      try {
        globalThis.chrome?.storage?.local?.set({
          [STORAGE_TOOLBAR_HINT_DISMISSED]: "1",
        });
      } catch {
        /* ignore */
      }
      return true;
    });
  }, []);

  const toolbar = useToolbarDrag({
    paletteOpen,
    shortcutsMenuOpen,
    skipNextDocClickRef,
  });

  const toolMode = useToolMode(shortcutsActive, dismissToolbarMenus);

  const inspect = useInspect({
    hostPageActive,
    inspectMode: toolMode.inspectMode,
    pointerOverToolbarRef,
    registerInspectSetters: toolMode.registerInspectSetters,
  });

  const guides = useGuideLines({
    color: palette.color,
    toolbarDragging: toolbar.toolbarDragging,
    hostPageActive,
    hideChromeForCapture,
    toolActive: toolMode.toolActive,
    lineMode: toolMode.lineMode,
    inspectMode: toolMode.inspectMode,
    setMeasureTip: inspect.setMeasureTip,
    dismissToolbarMenus,
    setInspectAnchor: inspect.setInspectAnchor,
    toolbarDragRef: toolbar.toolbarDragRef,
    endToolbarDrag: toolbar.endToolbarDrag,
    skipNextDocClickRef,
    updateMeasureTooltipRef: inspect.updateMeasureTooltipRef,
    pointerOverToolbarRef,
    isPointOverToolbarChrome: toolbar.isPointOverToolbarChrome,
    lastPointerClientRef: inspect.lastPointerClientRef,
    lastAltKeyRef: inspect.lastAltKeyRef,
  });

  const toolbarHandlers = useRulerToolbarHandlers({
    dismissToolbarMenus,
    setHideChromeForCapture,
    hideChromeForCapture,
    guides,
    toolMode,
    inspect,
  });

  useShortcuts({
    shortcutsActive,
    paletteOpen,
    shortcutsMenuOpen,
    dismissToolbarMenus,
    selectedId: guides.selectedId,
    setSelectedId: guides.setSelectedId,
    linesLength: guides.lines.length,
    setLines: guides.setLines,
    pushUndoBeforeLinesChange: guides.pushUndoBeforeLinesChange,
    undoStackRef: guides.undoStackRef,
    redoStackRef: guides.redoStackRef,
    performUndo: guides.performUndo,
    performRedo: guides.performRedo,
    toolActive: toolMode.toolActive,
    inspectMode: toolMode.inspectMode,
    inspectAnchor: inspect.inspectAnchor,
    setInspectMode: toolMode.setInspectMode,
    setToolActive: toolMode.setToolActive,
    setMeasureTip: inspect.setMeasureTip,
    setInspectAnchor: inspect.setInspectAnchor,
    applyToolLetterShortcut: toolMode.applyToolLetterShortcut,
    captureScreenshot: toolbarHandlers.triggerScreenshotCapture,
  });

  const handlePaletteOpenChange = useCallback((open: boolean) => {
    setPaletteOpen(open);
    if (open) setShortcutsMenuOpen(false);
  }, []);

  const handleShortcutsMenuOpenChange = useCallback((open: boolean) => {
    setShortcutsMenuOpen(open);
    if (open) setPaletteOpen(false);
  }, []);

  const handlePaletteColorChange = useCallback(
    (hex: string) => {
      palette.setColor(hex);
      toolMode.setToolActive((prev) => {
        if (prev) return prev;
        toolMode.setInspectMode(false);
        inspect.setInspectAnchor(null);
        inspect.setMeasureTip(null);
        return true;
      });
    },
    [palette, toolMode, inspect],
  );

  useRulerChromeEffects({
    hostPageActive,
    toolActive: toolMode.toolActive,
    inspectMode: toolMode.inspectMode,
    color: palette.color,
    hideChromeForCapture,
    setHideChromeForCapture,
  });

  return (
    <>
      <GuideOverlay
        lines={guides.lines}
        color={palette.color}
        livePreviewGuideColor={guides.livePreviewGuideColor}
        hoveredLineId={guides.hoveredLineId}
        selectedId={guides.selectedId}
        draggingLineId={guides.draggingLineId}
        inspectMode={toolMode.inspectMode}
        cursor={guides.cursor}
        showCursorVerticalPreview={guides.showCursorVerticalPreview}
        showCursorHorizontalPreview={guides.showCursorHorizontalPreview}
        onLinePointerDown={guides.handleLinePointerDown}
        onLineClick={guides.handleLineClick}
        onLineDoubleClick={guides.handleLineDoubleClick}
        onLineMouseEnter={(id) => guides.setHoveredLineId(id)}
        onLineMouseLeave={(id) =>
          guides.setHoveredLineId((h) => (h === id ? null : h))
        }
      />

      <InspectOverlay measureTip={inspect.measureTip} />

      <Toolbar
        toolbarRef={toolbar.toolbarRef}
        toolbarChromeRef={toolbar.toolbarChromeRef}
        panelBarRef={toolbar.panelBarRef}
        toolbarPos={toolbar.toolbarPos}
        hostPageActive={hostPageActive}
        toolbarChromeToggleMs={toolbarChromeToggleMs}
        toolbarDragging={toolbar.toolbarDragging}
        hideChromeForCapture={hideChromeForCapture}
        menuPortalContainer={toolbar.menuPortalContainer}
        paletteAlignEnd={toolbar.paletteAlignEnd}
        paletteAlignBottom={toolbar.paletteAlignBottom}
        paletteOpen={paletteOpen}
        onPaletteOpenChange={handlePaletteOpenChange}
        shortcutsMenuOpen={shortcutsMenuOpen}
        onShortcutsMenuOpenChange={handleShortcutsMenuOpenChange}
        inspectMode={toolMode.inspectMode}
        toolActive={toolMode.toolActive}
        color={palette.color}
        onPaletteColorChange={handlePaletteColorChange}
        onToolbarChromePointerDown={toolbar.onToolbarChromePointerDown}
        onToolbarChromePointerMove={toolbar.onToolbarChromePointerMove}
        onToolbarChromePointerEnd={toolbar.onToolbarChromePointerEnd}
        showFirstUseToolbarHint={
          hostPageActive && toolbarHintDismissed === false
        }
        onToolbarFirstUseHintDismiss={acknowledgeToolbarHint}
        onInspectToggle={toolbarHandlers.handleInspectToggle}
        onRulerButtonClick={toolbarHandlers.handleRulerButtonClick}
        onScreenshotClick={toolbarHandlers.handleScreenshotClick}
      />
    </>
  );
}

export const RulerApp = memo(RulerAppInner);
RulerApp.displayName = "RulerApp";
