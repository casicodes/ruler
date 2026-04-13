import { useCallback, useEffect } from "react";

import {
  isComposingKeyboardEvent,
  isEditableTarget,
} from "../ruler/interaction";
import type { MeasureTipState, PinnedLine } from "../ruler/types";

export function useShortcuts(args: {
  shortcutsActive: boolean;
  paletteOpen: boolean;
  shortcutsMenuOpen: boolean;
  dismissToolbarMenus: () => void;
  selectedId: string | null;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  linesLength: number;
  setLines: React.Dispatch<React.SetStateAction<PinnedLine[]>>;
  pushUndoBeforeLinesChange: () => void;
  undoStackRef: React.MutableRefObject<PinnedLine[][]>;
  redoStackRef: React.MutableRefObject<PinnedLine[][]>;
  performUndo: () => boolean;
  performRedo: () => boolean;
  toolActive: boolean;
  inspectMode: boolean;
  inspectAnchor: Element | null;
  setInspectMode: React.Dispatch<React.SetStateAction<boolean>>;
  setToolActive: React.Dispatch<React.SetStateAction<boolean>>;
  setMeasureTip: React.Dispatch<React.SetStateAction<MeasureTipState | null>>;
  setInspectAnchor: React.Dispatch<React.SetStateAction<Element | null>>;
  applyToolLetterShortcut: (letter: "r" | "s" | "h" | "b" | "v") => void;
  captureScreenshot: () => void;
}) {
  const {
    shortcutsActive,
    paletteOpen,
    shortcutsMenuOpen,
    dismissToolbarMenus,
    selectedId,
    setSelectedId,
    linesLength,
    setLines,
    pushUndoBeforeLinesChange,
    undoStackRef,
    redoStackRef,
    performUndo,
    performRedo,
    toolActive,
    inspectMode,
    inspectAnchor,
    setInspectMode,
    setToolActive,
    setMeasureTip,
    setInspectAnchor,
    applyToolLetterShortcut,
    captureScreenshot,
  } = args;

  /**
   * Single capture handler: consistent order, `code` + `key` for layouts, skips IME/repeat for toggles.
   */
  const onGlobalShortcutKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (isComposingKeyboardEvent(e)) return;

      const code = e.code;
      const key = e.key;
      const keyLower = key.length === 1 ? key.toLowerCase() : key;

      /** Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo — guide lines only; skip in editable fields. */
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        (key === "z" || key === "Z")
      ) {
        if (
          isEditableTarget(e.target) ||
          isEditableTarget(document.activeElement)
        ) {
          return;
        }
        const redo = e.shiftKey;
        if (redo) {
          if (redoStackRef.current.length === 0) return;
          e.preventDefault();
          e.stopPropagation();
          dismissToolbarMenus();
          performRedo();
          return;
        }
        if (undoStackRef.current.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        dismissToolbarMenus();
        performUndo();
        return;
      }

      const isEscape = key === "Escape" || code === "Escape";
      if (isEscape) {
        if (shortcutsMenuOpen || paletteOpen) {
          e.preventDefault();
          e.stopPropagation();
          dismissToolbarMenus();
          return;
        }
        if (inspectMode && inspectAnchor) {
          e.preventDefault();
          e.stopPropagation();
          setInspectAnchor(null);
          return;
        }
        if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) {
          return;
        }
        if (e.repeat) return;
        if (toolActive || inspectMode) {
          e.preventDefault();
          e.stopPropagation();
          dismissToolbarMenus();
          setToolActive(false);
          setInspectMode(false);
          setInspectAnchor(null);
          setMeasureTip(null);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return;

      if (key === "Delete" || key === "Backspace" || code === "Delete" || code === "Backspace") {
        if (!selectedId) return;
        e.preventDefault();
        e.stopPropagation();
        pushUndoBeforeLinesChange();
        setLines((prev) => prev.filter((l) => l.id !== selectedId));
        setSelectedId(null);
        return;
      }

      if (e.repeat) return;

      const isR = code === "KeyR" || keyLower === "r";
      const isS = code === "KeyS" || keyLower === "s";
      const isH = code === "KeyH" || keyLower === "h";
      const isB = code === "KeyB" || keyLower === "b";
      const isV = code === "KeyV" || keyLower === "v";
      const isX = code === "KeyX" || keyLower === "x";

      if (isX) {
        if (linesLength === 0) return;
        e.preventDefault();
        e.stopPropagation();
        dismissToolbarMenus();
        pushUndoBeforeLinesChange();
        setLines([]);
        setSelectedId(null);
        return;
      }

      const isC = code === "KeyC" || keyLower === "c";
      if (isC) {
        e.preventDefault();
        e.stopPropagation();
        captureScreenshot();
        return;
      }

      if (!isR && !isS && !isH && !isB && !isV) return;

      e.preventDefault();
      e.stopPropagation();
      const letter: "r" | "s" | "h" | "b" | "v" = isR
        ? "r"
        : isS
          ? "s"
          : isV
            ? "v"
            : isH
              ? "h"
              : "b";
      applyToolLetterShortcut(letter);
    },
    [
      selectedId,
      paletteOpen,
      shortcutsMenuOpen,
      inspectMode,
      inspectAnchor,
      linesLength,
      toolActive,
      performUndo,
      performRedo,
      pushUndoBeforeLinesChange,
      applyToolLetterShortcut,
      captureScreenshot,
      redoStackRef,
      undoStackRef,
      dismissToolbarMenus,
      setInspectAnchor,
      setInspectMode,
      setMeasureTip,
      setToolActive,
      setSelectedId,
      setLines,
    ],
  );

  useEffect(() => {
    if (!shortcutsActive) return;
    window.addEventListener("keydown", onGlobalShortcutKeydown, true);
    return () => {
      window.removeEventListener("keydown", onGlobalShortcutKeydown, true);
    };
  }, [shortcutsActive, onGlobalShortcutKeydown]);

  /** `chrome.commands` for R / H / B / V → background → `RULER_SHORTCUT` (no plain-S command). */
  useEffect(() => {
    const onMsg = (msg: { type?: string; action?: string }) => {
      if (msg?.type !== "RULER_SHORTCUT" || !msg.action) return;
      const map: Record<string, "r" | "s" | "h" | "b" | "v"> = {
        toggleRuler: "r",
        lineVertical: "v",
        lineHorizontal: "h",
        lineBoth: "b",
      };
      const letter = map[msg.action];
      if (!letter) return;
      applyToolLetterShortcut(letter);
    };
    try {
      chrome.runtime.onMessage.addListener(onMsg);
      return () => chrome.runtime.onMessage.removeListener(onMsg);
    } catch {
      return undefined;
    }
  }, [applyToolLetterShortcut]);
}
