import { useCallback, useRef, useState } from "react";

import type { LineMode } from "../ruler/types";

type InspectSetters = {
  setMeasureTip: React.Dispatch<React.SetStateAction<import("../ruler/types").MeasureTipState | null>>;
  setInspectAnchor: React.Dispatch<React.SetStateAction<Element | null>>;
};

export function useToolMode(
  shortcutsActive: boolean,
  dismissToolbarMenus: () => void,
) {
  const [toolActive, setToolActive] = useState(false);
  const [lineMode, setLineMode] = useState<LineMode>("both");
  const [inspectMode, setInspectMode] = useState(false);

  const inspectSettersRef = useRef<InspectSetters | null>(null);

  const registerInspectSetters = useCallback((v: InspectSetters | null) => {
    inspectSettersRef.current = v;
  }, []);

  const applyToolLetterShortcut = useCallback(
    (letter: "r" | "s" | "h" | "b" | "v") => {
      if (!shortcutsActive) return;
      dismissToolbarMenus();

      /** B / V / H set line mode; if the ruler overlay was off, turn it on (same exit-inspect behavior as R). */
      const ensureRulerOnFromLineShortcut = () => {
        setToolActive((prev) => {
          if (prev) return prev;
          setInspectMode(false);
          const s = inspectSettersRef.current;
          s?.setInspectAnchor(null);
          s?.setMeasureTip(null);
          return true;
        });
      };

      if (letter === "v") {
        setLineMode("vertical");
        ensureRulerOnFromLineShortcut();
        return;
      }
      if (letter === "h") {
        setLineMode("horizontal");
        ensureRulerOnFromLineShortcut();
        return;
      }
      if (letter === "b") {
        setLineMode("both");
        ensureRulerOnFromLineShortcut();
        return;
      }
      const { setMeasureTip, setInspectAnchor } = inspectSettersRef.current ?? {};
      if (!setMeasureTip || !setInspectAnchor) return;
      if (letter === "r") {
        setToolActive((prev) => {
          const next = !prev;
          if (next) {
            setInspectMode(false);
            setInspectAnchor(null);
          }
          return next;
        });
        return;
      }
      if (letter === "s") {
        setInspectMode((prev) => {
          const next = !prev;
          if (prev) {
            setMeasureTip(null);
            setInspectAnchor(null);
          }
          if (next) setToolActive(false);
          return next;
        });
        return;
      }
    },
    [shortcutsActive, dismissToolbarMenus],
  );

  return {
    toolActive,
    setToolActive,
    lineMode,
    setLineMode,
    inspectMode,
    setInspectMode,
    registerInspectSetters,
    applyToolLetterShortcut,
  };
}
