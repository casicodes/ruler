import type { CSSProperties } from "react";
import { memo } from "react";
import { Menu } from "@base-ui-components/react/menu";

import { normalizeHex, swatchButtonStyle } from "../ruler/color";
import { RULER_PALETTE } from "../ruler/tokens";

export type ColorPaletteProps = {
  color: string;
  onColorChange: (hex: string) => void;
};

const paletteRadioGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 10,
  flexWrap: "wrap",
};

function ColorPaletteInner({ color, onColorChange }: ColorPaletteProps) {
  return (
    <Menu.RadioGroup
      style={paletteRadioGroupStyle}
      value={color}
      onValueChange={(value) => {
        onColorChange(normalizeHex(String(value)));
      }}
    >
      {RULER_PALETTE.map((p) => (
        <Menu.RadioItem
          key={p.hex}
          value={p.hex}
          label={p.label}
          closeOnClick
          aria-label={p.label}
          data-ruler-ui=""
          data-ruler-pressable=""
          style={(s) => swatchButtonStyle(p.hex, s.checked)}
        />
      ))}
    </Menu.RadioGroup>
  );
}

export const ColorPalette = memo(ColorPaletteInner);
ColorPalette.displayName = "ColorPalette";
