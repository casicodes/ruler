import { memo } from "react";

import {
  INSPECT_GAP_DASH_GAP_PX,
  INSPECT_GAP_DASH_PX,
  INSPECT_GAP_LABEL_SHADOW,
  MEASURE_TIP_BORDER_RADIUS_PX,
  MEASURE_TIP_SHADOW,
  TW,
  Z_INDEX_GUIDE_LINES,
  Z_INDEX_UI,
} from "../ruler/tokens";
import type { MeasureTipState, SpacingGapDraw } from "../ruler/types";

export type InspectOverlayProps = {
  measureTip: MeasureTipState | null;
};

function InspectGapLines({
  gaps,
  keyPrefix,
  lineColor,
}: {
  gaps: SpacingGapDraw[];
  keyPrefix: string;
  lineColor: string;
}) {
  return (
    <>
      {gaps.map((g, i) => {
        if (g.kind === "h") {
          const left = Math.min(g.x1, g.x2);
          const width = Math.abs(g.x2 - g.x1);
          return (
            <div
              key={`${keyPrefix}-h-${i}`}
              aria-hidden
              style={{
                position: "fixed",
                left,
                top: g.y,
                width,
                height: 1,
                transform: "translateY(-0.5px)",
                backgroundImage: `repeating-linear-gradient(90deg, ${lineColor} 0, ${lineColor} ${INSPECT_GAP_DASH_PX}px, transparent ${INSPECT_GAP_DASH_PX}px, transparent ${INSPECT_GAP_DASH_PX + INSPECT_GAP_DASH_GAP_PX}px)`,
                pointerEvents: "none",
              }}
            />
          );
        }
        const top = Math.min(g.y1, g.y2);
        const height = Math.abs(g.y2 - g.y1);
        return (
          <div
            key={`${keyPrefix}-v-${i}`}
            aria-hidden
            style={{
              position: "fixed",
              left: g.x,
              top,
              width: 1,
              height,
              transform: "translateX(-0.5px)",
              backgroundImage: `repeating-linear-gradient(180deg, ${lineColor} 0, ${lineColor} ${INSPECT_GAP_DASH_PX}px, transparent ${INSPECT_GAP_DASH_PX}px, transparent ${INSPECT_GAP_DASH_PX + INSPECT_GAP_DASH_GAP_PX}px)`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
}

function InspectGapLabels({
  gaps,
  keyPrefix,
  labelBg,
}: {
  gaps: SpacingGapDraw[];
  keyPrefix: string;
  labelBg: string;
}) {
  return (
    <>
      {gaps.map((g, i) => {
        const cx = g.kind === "h" ? (g.x1 + g.x2) / 2 : g.x;
        const cy = g.kind === "v" ? (g.y1 + g.y2) / 2 : g.y;
        return (
          <div
            key={`${keyPrefix}-label-${i}`}
            aria-hidden
            style={{
              position: "fixed",
              left: cx,
              top: cy,
              zIndex: Z_INDEX_UI,
              pointerEvents: "none",
              padding: 2,
              backgroundColor: labelBg,
              borderRadius: 2,
              boxShadow: INSPECT_GAP_LABEL_SHADOW,
              color: "#ffffff",
              fontSize: 11,
              lineHeight: 1.2,
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              transform: "translate(-50%, -50%)",
            }}
          >
            {g.px}
          </div>
        );
      })}
    </>
  );
}

function InspectOverlayInner({ measureTip }: InspectOverlayProps) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: Z_INDEX_GUIDE_LINES,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {measureTip?.anchorBox && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: measureTip.anchorBox.left,
              top: measureTip.anchorBox.top,
              width: measureTip.anchorBox.width,
              height: measureTip.anchorBox.height,
              boxSizing: "border-box",
              boxShadow: `0 0 0 1px ${TW.blue600}`,
              pointerEvents: "none",
            }}
          />
        )}
        {measureTip && !measureTip.hoverMatchesAnchor && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: measureTip.box.left,
              top: measureTip.box.top,
              width: measureTip.box.width,
              height: measureTip.box.height,
              boxSizing: "border-box",
              boxShadow: `0 0 0 1px ${TW.blue600}`,
              pointerEvents: "none",
            }}
          />
        )}
        <InspectGapLines
          gaps={measureTip?.spacingGaps ?? []}
          keyPrefix="inspect-live"
          lineColor={TW.blue600}
        />
      </div>

      {measureTip &&
        !measureTip.hoverMatchesAnchor &&
        !measureTip.altSpacingMode && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              left: measureTip.left,
              top: measureTip.top,
              zIndex: Z_INDEX_UI,
              pointerEvents: "none",
              padding: 6,
              backgroundColor: TW.blue700,
              borderRadius: MEASURE_TIP_BORDER_RADIUS_PX,
              boxShadow: MEASURE_TIP_SHADOW,
              color: "#ffffff",
              fontSize: 12,
              lineHeight: 1.25,
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {measureTip.w} × {measureTip.h}
          </div>
        )}
      {measureTip && (
        <>
          {measureTip.anchorBox && !measureTip.altSpacingMode && (
            <div
              role="status"
              aria-live="polite"
              style={{
                position: "fixed",
                left: measureTip.anchorLabelLeft,
                top: measureTip.anchorLabelTop,
                zIndex: Z_INDEX_UI,
                pointerEvents: "none",
                padding: 6,
                backgroundColor: TW.blue700,
                borderRadius: MEASURE_TIP_BORDER_RADIUS_PX,
                boxShadow: MEASURE_TIP_SHADOW,
                color: "#ffffff",
                fontSize: 12,
                lineHeight: 1.25,
                fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {measureTip.anchorW} × {measureTip.anchorH}
          </div>
          )}
          <InspectGapLabels
            gaps={measureTip.spacingGaps ?? []}
            keyPrefix="inspect-live"
            labelBg={TW.blue700}
          />
        </>
      )}
    </>
  );
}

export const InspectOverlay = memo(InspectOverlayInner);
InspectOverlay.displayName = "InspectOverlay";
