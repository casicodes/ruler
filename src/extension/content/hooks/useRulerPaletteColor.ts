import { useCallback, useState } from "react";

import { normalizeHex, snapHexToPalette } from "../ruler/color";
import { STORAGE_COLOR, TW } from "../ruler/tokens";

export function useRulerPaletteColor() {
  const [color, setColorState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_COLOR);
      if (s && /^#[0-9a-fA-F]{6}$/.test(s)) {
        return snapHexToPalette(normalizeHex(s));
      }
    } catch {
      /* ignore */
    }
    return TW.red500;
  });

  const setColor = useCallback((next: string) => {
    setColorState(snapHexToPalette(normalizeHex(next)));
  }, []);

  return {
    color,
    setColor,
  };
}
