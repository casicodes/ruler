import type { ComponentType, CSSProperties } from "react";
import { memo, useMemo, useRef } from "react";
import { Menu } from "@base-ui-components/react/menu";
import {
  Camera,
  ChevronDown,
  CircleX,
  FoldHorizontal,
  FoldVertical,
  Grid2x2,
  Keyboard,
  MoreVertical,
  MousePointer2,
  Ruler,
  Trash2,
} from "lucide-react";

import {
  ACTION_MIN_PX,
  CARET_ICON,
  ICON,
  PANEL_INNER_PAD_PX,
  PANEL_ROW_GAP_PX,
  PANEL_SURFACE,
  RULER_UI_STYLES,
  PALETTE_POPUP_IN_MS,
  TOOLBAR_PAD,
  TOOLBAR_OVERLAY_SCALE_HIDDEN,
  TW,
  Z_INDEX_UI,
} from "../ruler/tokens";
import { ColorPalette } from "./ColorPalette";

export type ToolbarProps = {
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  toolbarChromeRef: React.RefObject<HTMLDivElement | null>;
  panelBarRef: React.RefObject<HTMLDivElement | null>;
  toolbarPos: { x: number; y: number };
  hostPageActive: boolean;
  toolbarChromeToggleMs: number;
  toolbarDragging: boolean;
  hideChromeForCapture: boolean;
  menuPortalContainer: ShadowRoot | null;
  paletteAlignEnd: boolean;
  /** When the toolbar sits in the lower half of the viewport, menus open above and scale from the bottom edge. */
  paletteAlignBottom: boolean;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
  shortcutsMenuOpen: boolean;
  onShortcutsMenuOpenChange: (open: boolean) => void;
  inspectMode: boolean;
  toolActive: boolean;
  color: string;
  onPaletteColorChange: (hex: string) => void;
  onToolbarChromePointerDown: (e: React.PointerEvent) => void;
  onToolbarChromePointerMove: (e: React.PointerEvent) => void;
  onToolbarChromePointerEnd: (e: React.PointerEvent) => void;
  /** Red pulsing dot on the ruler icon until the user clicks any toolbar control (persisted per profile). */
  showFirstUseToolbarHint: boolean;
  onToolbarFirstUseHintDismiss: () => void;
  onInspectToggle: (e: React.MouseEvent) => void;
  onRulerButtonClick: (e: React.MouseEvent) => void;
  onScreenshotClick: (e: React.MouseEvent) => void;
};

const panelShell: CSSProperties = {
  position: "fixed",
  zIndex: Z_INDEX_UI,
  pointerEvents: "auto",
  boxSizing: "border-box",
};

const panelBar: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  boxSizing: "border-box",
  padding: PANEL_INNER_PAD_PX,
  gap: PANEL_ROW_GAP_PX,
  backgroundColor: "#ffffff",
  borderRadius: PANEL_SURFACE.borderRadius,
  boxShadow: PANEL_SURFACE.boxShadow,
  overflow: "visible",
};

/** Vertical rule between segments; spacing comes from `panelBar` flex `gap`. */
const dividerV: CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  minHeight: ACTION_MIN_PX,
  backgroundColor: "rgba(0,0,0,0.08)",
  flexShrink: 0,
};

const iconActionWrap: CSSProperties = {
  flexShrink: 0,
  width: ACTION_MIN_PX,
  minWidth: ACTION_MIN_PX,
  height: ACTION_MIN_PX,
  minHeight: ACTION_MIN_PX,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

/** Inspect / ruler / trash: no inline background so toolbar hover styles apply. */
const btnToolbarIcon: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  cursor: "pointer",
  padding: 0,
  borderRadius: 10,
  boxSizing: "border-box",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
};

/** Caret: no inline background — stylesheet :hover must win. */
const btnCaretTrigger: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  cursor: "pointer",
  padding: 0,
  boxSizing: "border-box",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
};

/** Ruler icon + palette caret in one toolbar segment (color menu anchors to full `panelBarRef`). */
const rulerWithCaretWrap: CSSProperties = {
  flexShrink: 0,
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  height: ACTION_MIN_PX,
  minHeight: ACTION_MIN_PX,
  boxSizing: "border-box",
};

const rulerIconOnlyWrap: CSSProperties = {
  flexShrink: 0,
  width: ACTION_MIN_PX,
  minWidth: ACTION_MIN_PX,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const paletteCaretWrap: CSSProperties = {
  flexShrink: 0,
  width: 20,
  minWidth: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const shortcutMenuItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  width: "100%",
  boxSizing: "border-box",
  fontSize: 13,
  lineHeight: 1.35,
  color: TW.zinc900,
  padding: "5px 2px",
  minHeight: 28,
  cursor: "default",
  userSelect: "none",
};

/** Matches toolbar icon stroke (`TW.zinc500`). */
const shortcutsMenuHeading: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1.35,
  color: TW.zinc500,
  padding: "0 2px 8px",
  margin: 0,
};

const shortcutKbd: CSSProperties = {
  flexShrink: 0,
  fontSize: 11,
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  padding: "2px 6px",
  borderRadius: 4,
  backgroundColor: "oklch(96% 0 0)",
  color: TW.zinc900,
  border: "1px solid oklch(92% 0 0)",
};

const shortcutRowLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

/** Match toolbar icon stroke; slightly smaller than 20px toolbar icons for list density. */
const SHORTCUT_MENU_ICON = { ...ICON, size: 18 as const };

type ShortcutItemDef = {
  Icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    color?: string;
    fill?: string;
    "aria-hidden"?: boolean;
  }>;
  label: string;
  kbd: string;
  menuItemLabel: string;
};

const SHORTCUT_ITEMS: ShortcutItemDef[] = [
  {
    Icon: MousePointer2,
    label: "Inspect",
    kbd: "S",
    menuItemLabel: "Inspect sizes and spacing",
  },
  {
    Icon: Ruler,
    label: "Ruler guides",
    kbd: "R",
    menuItemLabel: "Toggle ruler guides",
  },
  {
    Icon: FoldHorizontal,
    label: "Vertical line",
    kbd: "V",
    menuItemLabel: "Vertical line mode",
  },
  {
    Icon: FoldVertical,
    label: "Horizontal line",
    kbd: "H",
    menuItemLabel: "Horizontal line mode",
  },
  {
    Icon: Grid2x2,
    label: "Both axes line",
    kbd: "B",
    menuItemLabel: "Both line mode",
  },
  {
    Icon: Camera,
    label: "Screenshot",
    kbd: "C",
    menuItemLabel: "Capture screenshot",
  },
  {
    Icon: CircleX,
    label: "Clear all guides",
    kbd: "X",
    menuItemLabel: "Clear all guides",
  },
  {
    Icon: Trash2,
    label: "Delete selected guide",
    kbd: "Del / ⌫",
    menuItemLabel: "Delete selected guide",
  },
  {
    Icon: Keyboard,
    label: "Escape",
    kbd: "Esc",
    menuItemLabel: "Escape: clear inspect pin, exit ruler or inspect, close menus",
  },
];

function ToolbarDivider() {
  return <div style={dividerV} aria-hidden />;
}

function ShortcutMenuItems() {
  return (
    <Menu.Group>
      <Menu.GroupLabel style={shortcutsMenuHeading}>
        Keyboard shortcuts
      </Menu.GroupLabel>
      {SHORTCUT_ITEMS.map(({ Icon: ShortcutIcon, label, kbd, menuItemLabel }) => (
        <Menu.Item
          key={menuItemLabel}
          closeOnClick={false}
          style={shortcutMenuItem}
          label={menuItemLabel}
        >
          <span style={shortcutRowLabel}>
            <ShortcutIcon
              {...SHORTCUT_MENU_ICON}
              color={TW.zinc500}
              aria-hidden
            />
            <span>{label}</span>
          </span>
          <span style={shortcutKbd}>{kbd}</span>
        </Menu.Item>
      ))}
    </Menu.Group>
  );
}

function RulerPaletteMenu(props: {
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
  onToolbarFirstUseHintDismiss: () => void;
  toolActive: boolean;
  color: string;
  showFirstUseToolbarHint: boolean;
  onRulerButtonClick: (e: React.MouseEvent) => void;
  panelBarRef: React.RefObject<HTMLDivElement | null>;
  menuPortalContainer: ShadowRoot | null;
  toolbarMenuSide: "top" | "bottom";
  paletteAlignEnd: boolean;
  palettePopupBaseStyle: CSSProperties;
  onPaletteColorChange: (hex: string) => void;
}) {
  const {
    paletteOpen,
    onPaletteOpenChange,
    onToolbarFirstUseHintDismiss,
    toolActive,
    color,
    showFirstUseToolbarHint,
    onRulerButtonClick,
    panelBarRef,
    menuPortalContainer,
    toolbarMenuSide,
    paletteAlignEnd,
    palettePopupBaseStyle,
    onPaletteColorChange,
  } = props;

  return (
    <Menu.Root
      open={paletteOpen}
      onOpenChange={(open) => {
        if (open) onToolbarFirstUseHintDismiss();
        onPaletteOpenChange(open);
      }}
      modal={false}
      orientation="horizontal"
    >
      <div data-ruler-toolbar-action="" style={rulerWithCaretWrap}>
        <div style={rulerIconOnlyWrap}>
          <button
            type="button"
            data-ruler-pressable=""
            data-ruler-toolbar-icon-btn=""
            data-ruler-toolbar-active={toolActive ? "ruler" : undefined}
            style={{
              ...btnToolbarIcon,
              position: "relative",
              ...(toolActive ? { backgroundColor: color } : {}),
            }}
            aria-pressed={toolActive}
            aria-label={
              showFirstUseToolbarHint
                ? "Turn on ruler guides (shortcut R)"
                : "Ruler guides (shortcut R)"
            }
            onClick={(e) => {
              onToolbarFirstUseHintDismiss();
              onRulerButtonClick(e);
            }}
          >
            {showFirstUseToolbarHint ? (
              <span
                data-ruler-toolbar-hint-dot=""
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: TW.red500,
                  zIndex: 1,
                }}
                aria-hidden
              />
            ) : null}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden
            >
              <Ruler {...ICON} color={toolActive ? "#ffffff" : TW.zinc500} aria-hidden />
            </span>
          </button>
        </div>
        <div style={paletteCaretWrap}>
          <Menu.Trigger
            type="button"
            data-ruler-pressable=""
            data-ruler-caret-trigger=""
            style={{
              ...btnCaretTrigger,
              borderRadius: 6,
            }}
            aria-label="Ruler color palette"
            aria-expanded={paletteOpen}
          >
            <span
              style={{
                display: "flex",
                transition: "transform 100ms ease-out",
                transform: paletteOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <ChevronDown {...CARET_ICON} color={TW.zinc500} aria-hidden />
            </span>
          </Menu.Trigger>
        </div>
      </div>
      <Menu.Portal container={menuPortalContainer ?? undefined}>
        <Menu.Positioner
          anchor={panelBarRef}
          side={toolbarMenuSide}
          align={paletteAlignEnd ? "end" : "start"}
          sideOffset={TOOLBAR_PAD}
          positionMethod="fixed"
          collisionAvoidance={{
            side: "flip",
            align: "none",
            fallbackAxisSide: "none",
          }}
          style={{
            pointerEvents: "auto",
            zIndex: Z_INDEX_UI,
          }}
        >
          <Menu.Popup
            data-ruler-ui=""
            data-ruler-palette=""
            data-ruler-toolbar-popup=""
            aria-label="Ruler line color"
            style={palettePopupBaseStyle}
          >
            <ColorPalette color={color} onColorChange={onPaletteColorChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function ToolbarInner(props: ToolbarProps) {
  const {
    toolbarRef,
    toolbarChromeRef,
    panelBarRef,
    toolbarPos,
    hostPageActive,
    toolbarChromeToggleMs,
    toolbarDragging,
    hideChromeForCapture,
    menuPortalContainer,
    paletteAlignEnd,
    paletteAlignBottom,
    paletteOpen,
    onPaletteOpenChange,
    shortcutsMenuOpen,
    onShortcutsMenuOpenChange,
    inspectMode,
    toolActive,
    color,
    onPaletteColorChange,
    onToolbarChromePointerDown,
    onToolbarChromePointerMove,
    onToolbarChromePointerEnd,
    showFirstUseToolbarHint,
    onToolbarFirstUseHintDismiss,
    onInspectToggle,
    onRulerButtonClick,
    onScreenshotClick,
  } = props;

  const shortcutsMenuAnchorRef = useRef<HTMLDivElement | null>(null);

  const palettePopupBaseStyle: CSSProperties = useMemo(() => {
    const h = paletteAlignEnd ? "right" : "left";
    const v = paletteAlignBottom ? "bottom" : "top";
    return {
      position: "relative",
      zIndex: Z_INDEX_UI,
      padding: "10px 12px",
      backgroundColor: "#fff",
      borderRadius: PANEL_SURFACE.borderRadius,
      boxShadow: PANEL_SURFACE.boxShadow,
      animation: `ruler-palette-in ${PALETTE_POPUP_IN_MS}ms ease-out forwards`,
      transformOrigin: `${h} ${v}`,
      outline: "none",
    };
  }, [paletteAlignEnd, paletteAlignBottom]);

  const toolbarMenuSide = paletteAlignBottom ? "top" : "bottom";

  const shortcutsPopupStyle: CSSProperties = useMemo(
    () => ({
      ...palettePopupBaseStyle,
      padding: "8px 10px",
      minWidth: 248,
      maxWidth: 320,
      maxHeight: "min(70vh, 300px)",
      overflowY: "auto",
    }),
    [palettePopupBaseStyle],
  );

  if (hideChromeForCapture) return null;

  return (
    <div
      ref={toolbarRef}
      data-ruler-ui=""
      data-ruler-toolbar-surface=""
      style={{
        ...panelShell,
        left: toolbarPos.x,
        top: toolbarPos.y,
        transform: hostPageActive
          ? "scale(1) translateZ(0)"
          : `scale(${TOOLBAR_OVERLAY_SCALE_HIDDEN}) translateZ(0)`,
        transformOrigin: "50% 50%",
        transition: `transform ${toolbarChromeToggleMs}ms ease-out`,
        backfaceVisibility: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: RULER_UI_STYLES }} />
      <div data-ruler-ui="" style={{ position: "relative", width: "max-content" }}>
        <div
          ref={toolbarChromeRef}
          onPointerDownCapture={onToolbarChromePointerDown}
          onPointerMove={onToolbarChromePointerMove}
          onPointerUp={onToolbarChromePointerEnd}
          onPointerCancel={onToolbarChromePointerEnd}
          style={{
            padding: TOOLBAR_PAD,
            boxSizing: "border-box",
            cursor: toolbarDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          <div
            ref={panelBarRef}
            style={panelBar}
            role="toolbar"
            aria-label="Ruler tools"
          >
            <div data-ruler-toolbar-action="" style={iconActionWrap}>
              <button
                type="button"
                data-ruler-pressable=""
                data-ruler-toolbar-icon-btn=""
                data-ruler-toolbar-active={inspectMode ? "inspect" : undefined}
                style={{
                  ...btnToolbarIcon,
                  ...(inspectMode ? { backgroundColor: TW.blue700 } : {}),
                }}
                aria-pressed={inspectMode}
                aria-label="Inspect element sizes and spacing (shortcut S)"
                onClick={(e) => {
                  onToolbarFirstUseHintDismiss();
                  onInspectToggle(e);
                }}
              >
                <MousePointer2
                  {...ICON}
                  color={inspectMode ? "#ffffff" : TW.zinc500}
                  fill="none"
                  aria-hidden
                />
              </button>
            </div>
            <ToolbarDivider />
            <RulerPaletteMenu
              paletteOpen={paletteOpen}
              onPaletteOpenChange={onPaletteOpenChange}
              onToolbarFirstUseHintDismiss={onToolbarFirstUseHintDismiss}
              toolActive={toolActive}
              color={color}
              showFirstUseToolbarHint={showFirstUseToolbarHint}
              onRulerButtonClick={onRulerButtonClick}
              panelBarRef={panelBarRef}
              menuPortalContainer={menuPortalContainer}
              toolbarMenuSide={toolbarMenuSide}
              paletteAlignEnd={paletteAlignEnd}
              palettePopupBaseStyle={palettePopupBaseStyle}
              onPaletteColorChange={onPaletteColorChange}
            />
            <ToolbarDivider />
            <div data-ruler-toolbar-action="" style={iconActionWrap}>
              <button
                type="button"
                data-ruler-pressable=""
                data-ruler-toolbar-icon-btn=""
                style={btnToolbarIcon}
                aria-label="Capture screenshot (shortcut C)"
                onClick={(e) => {
                  onToolbarFirstUseHintDismiss();
                  onScreenshotClick(e);
                }}
              >
                <Camera
                  {...ICON}
                  color={TW.zinc500}
                  aria-hidden
                />
              </button>
            </div>
            <ToolbarDivider />
            <Menu.Root
              open={shortcutsMenuOpen}
              onOpenChange={(open) => {
                if (open) onToolbarFirstUseHintDismiss();
                onShortcutsMenuOpenChange(open);
              }}
              modal={false}
            >
              <div
                ref={shortcutsMenuAnchorRef}
                data-ruler-toolbar-action=""
                style={iconActionWrap}
              >
                <Menu.Trigger
                  type="button"
                  data-ruler-pressable=""
                  data-ruler-toolbar-icon-btn=""
                  style={btnToolbarIcon}
                  aria-label="Keyboard shortcuts menu"
                  aria-expanded={shortcutsMenuOpen}
                >
                  <MoreVertical {...ICON} color={TW.zinc500} aria-hidden />
                </Menu.Trigger>
              </div>
              <Menu.Portal
                container={menuPortalContainer ?? undefined}
              >
                <Menu.Positioner
                  anchor={shortcutsMenuAnchorRef}
                  side={toolbarMenuSide}
                  align={paletteAlignEnd ? "end" : "start"}
                  sideOffset={TOOLBAR_PAD}
                  positionMethod="fixed"
                  collisionAvoidance={{
                    side: "flip",
                    align: "none",
                    fallbackAxisSide: "none",
                  }}
                  style={{
                    pointerEvents: "auto",
                    zIndex: Z_INDEX_UI,
                  }}
                >
                  <Menu.Popup
                    data-ruler-ui=""
                    data-ruler-shortcuts-popup=""
                    data-ruler-toolbar-popup=""
                    aria-label="Keyboard shortcuts"
                    style={shortcutsPopupStyle}
                  >
                    <ShortcutMenuItems />
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Toolbar = memo(ToolbarInner);
Toolbar.displayName = "Toolbar";
