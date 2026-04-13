import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  hitStripStyle,
  hitStripStylePageSpace,
  lineVisualStyle,
  lineVisualStylePageSpace,
  setPageScrollLayerTransform,
  toViewportPos,
  visualState,
} from "../ruler/guides";
import { rootMaxScrollPx, supportsRootScrollTimelinePair } from "../ruler/scrollTimeline";
import { Z_INDEX_GUIDE_LINES } from "../ruler/tokens";
import type { PinnedLine } from "../ruler/types";

export type GuideOverlayProps = {
  lines: PinnedLine[];
  color: string;
  livePreviewGuideColor: string;
  hoveredLineId: string | null;
  selectedId: string | null;
  draggingLineId: string | null;
  inspectMode: boolean;
  cursor: { x: number; y: number } | null;
  showCursorVerticalPreview: boolean;
  showCursorHorizontalPreview: boolean;
  onLinePointerDown: (line: PinnedLine) => (e: React.MouseEvent) => void;
  onLineClick: (line: PinnedLine) => (e: React.MouseEvent) => void;
  onLineDoubleClick: (line: PinnedLine) => (e: React.MouseEvent) => void;
  onLineMouseEnter: (id: string) => void;
  onLineMouseLeave: (id: string) => void;
};

function measureDocumentSize(): { w: number; h: number } {
  const el = document.documentElement;
  return {
    w: Math.max(el.clientWidth, el.scrollWidth),
    h: Math.max(el.clientHeight, el.scrollHeight),
  };
}

type GuideLineScreenVisualProps = {
  line: PinnedLine;
  drawState: ReturnType<typeof visualState> | "selected";
  color: string;
};

const GuideLineScreenVisual = memo(function GuideLineScreenVisual({
  line,
  drawState,
  color,
}: GuideLineScreenVisualProps) {
  const vp = toViewportPos(line);
  return (
    <div
      style={lineVisualStyle(
        line.kind === "v" ? "v" : "h",
        vp,
        drawState,
        color,
      )}
    />
  );
});

type GuideLinePageVisualProps = {
  line: PinnedLine;
  drawState: ReturnType<typeof visualState> | "selected";
  color: string;
};

const GuideLinePageVisual = memo(function GuideLinePageVisual({
  line,
  drawState,
  color,
}: GuideLinePageVisualProps) {
  return (
    <div
      style={lineVisualStylePageSpace(
        line.kind === "v" ? "v" : "h",
        line.pos,
        drawState,
        color,
      )}
    />
  );
});

type GuideLineScreenHitProps = {
  line: PinnedLine;
  draggingLineId: string | null;
  inspectMode: boolean;
  onLineMouseEnter: (id: string) => void;
  onLineMouseLeave: (id: string) => void;
  onLinePointerDown: (line: PinnedLine) => (e: React.MouseEvent) => void;
  onLineClick: (line: PinnedLine) => (e: React.MouseEvent) => void;
  onLineDoubleClick: (line: PinnedLine) => (e: React.MouseEvent) => void;
};

const GuideLineScreenHit = memo(function GuideLineScreenHit({
  line,
  draggingLineId,
  inspectMode,
  onLineMouseEnter,
  onLineMouseLeave,
  onLinePointerDown,
  onLineClick,
  onLineDoubleClick,
}: GuideLineScreenHitProps) {
  const vp = toViewportPos(line);
  return (
    <div
      role="presentation"
      data-ruler-line-hit=""
      data-line-id={line.id}
      title="Locked to screen — double-click to lock to page"
      style={hitStripStyle(
        line.kind === "v" ? "v" : "h",
        vp,
        draggingLineId === line.id,
        inspectMode,
      )}
      onMouseEnter={() => onLineMouseEnter(line.id)}
      onMouseLeave={() => onLineMouseLeave(line.id)}
      onMouseDown={onLinePointerDown(line)}
      onClick={onLineClick(line)}
      onDoubleClick={onLineDoubleClick(line)}
    />
  );
});

type GuideLinePageHitProps = GuideLineScreenHitProps;

const GuideLinePageHit = memo(function GuideLinePageHit({
  line,
  draggingLineId,
  inspectMode,
  onLineMouseEnter,
  onLineMouseLeave,
  onLinePointerDown,
  onLineClick,
  onLineDoubleClick,
}: GuideLinePageHitProps) {
  return (
    <div
      role="presentation"
      data-ruler-line-hit=""
      data-line-id={line.id}
      title="Locked to page — double-click to unlock (screen)"
      style={hitStripStylePageSpace(
        line.kind === "v" ? "v" : "h",
        line.pos,
        draggingLineId === line.id,
        inspectMode,
      )}
      onMouseEnter={() => onLineMouseEnter(line.id)}
      onMouseLeave={() => onLineMouseLeave(line.id)}
      onMouseDown={onLinePointerDown(line)}
      onClick={onLineClick(line)}
      onDoubleClick={onLineDoubleClick(line)}
    />
  );
});

const SCROLL_TIMELINE_STYLE = `
@keyframes rulerExtPageBlock {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(0, calc(-1 * var(--ruler-max-block, 0px)), 0); }
}
@keyframes rulerExtPageInline {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(calc(-1 * var(--ruler-max-inline, 0px)), 0, 0); }
}
[data-ruler-ext-scroll-y] {
  will-change: transform;
  animation-name: rulerExtPageBlock;
  animation-duration: auto;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-timeline: scroll(root block);
}
[data-ruler-ext-scroll-x] {
  will-change: transform;
  animation-name: rulerExtPageInline;
  animation-duration: auto;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-timeline: scroll(root inline);
}
`;

function GuideOverlayInner(props: GuideOverlayProps) {
  const {
    lines,
    color,
    livePreviewGuideColor,
    hoveredLineId,
    selectedId,
    draggingLineId,
    inspectMode,
    cursor,
    showCursorVerticalPreview,
    showCursorHorizontalPreview,
    onLinePointerDown,
    onLineClick,
    onLineDoubleClick,
    onLineMouseEnter,
    onLineMouseLeave,
  } = props;

  const [useScrollTimeline] = useState(() => supportsRootScrollTimelinePair());

  const [docSize, setDocSize] = useState(() => measureDocumentSize());
  const pageScrollLayerRef = useRef<HTMLDivElement | null>(null);

  const { maxX, maxY } = rootMaxScrollPx(docSize.w, docSize.h);

  useEffect(() => {
    const writeRootMaxScrollVars = (w: number, h: number) => {
      const { maxX, maxY } = rootMaxScrollPx(w, h);
      document.documentElement.style.setProperty("--ruler-max-block", `${maxY}px`);
      document.documentElement.style.setProperty("--ruler-max-inline", `${maxX}px`);
    };

    const update = () => {
      const next = measureDocumentSize();
      // Update CSS vars immediately to avoid a one-render-cycle drift while content is loading.
      writeRootMaxScrollVars(next.w, next.h);
      setDocSize(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const syncPageScrollLayer = useCallback(() => {
    setPageScrollLayerTransform(pageScrollLayerRef.current);
  }, []);

  const pageLockedLines = useMemo(
    () => lines.filter((l) => l.pageLocked),
    [lines],
  );
  const screenLockedLines = useMemo(
    () => lines.filter((l) => !l.pageLocked),
    [lines],
  );

  const hasPageLockedLines = pageLockedLines.length > 0;

  const pageLockedSubtree = useMemo(
    () => (
      <>
        {pageLockedLines.map((line) => {
          const vs = visualState(line.id, hoveredLineId, selectedId);
          const drawState =
            draggingLineId === line.id ? "selected" : vs;
          return (
            <GuideLinePageVisual
              key={line.id}
              line={line}
              drawState={drawState}
              color={color}
            />
          );
        })}
        {pageLockedLines.map((line) => (
          <GuideLinePageHit
            key={`hit-${line.id}`}
            line={line}
            draggingLineId={draggingLineId}
            inspectMode={inspectMode}
            onLineMouseEnter={onLineMouseEnter}
            onLineMouseLeave={onLineMouseLeave}
            onLinePointerDown={onLinePointerDown}
            onLineClick={onLineClick}
            onLineDoubleClick={onLineDoubleClick}
          />
        ))}
      </>
    ),
    [
      pageLockedLines,
      hoveredLineId,
      selectedId,
      draggingLineId,
      color,
      inspectMode,
      onLineMouseEnter,
      onLineMouseLeave,
      onLinePointerDown,
      onLineClick,
      onLineDoubleClick,
    ],
  );

  /** JS path: keep transform aligned when layout changes. */
  useLayoutEffect(() => {
    if (useScrollTimeline || !hasPageLockedLines) return;
    syncPageScrollLayer();
  }, [
    useScrollTimeline,
    hasPageLockedLines,
    docSize,
    lines,
    syncPageScrollLayer,
  ]);

  /** JS path: scroll / visualViewport. */
  useEffect(() => {
    if (useScrollTimeline || !hasPageLockedLines) return;
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("scroll", syncPageScrollLayer, opts);
    window.addEventListener("resize", syncPageScrollLayer);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("scroll", syncPageScrollLayer);
      vv.addEventListener("resize", syncPageScrollLayer);
    }
    return () => {
      window.removeEventListener("scroll", syncPageScrollLayer, opts);
      window.removeEventListener("resize", syncPageScrollLayer);
      if (vv) {
        vv.removeEventListener("scroll", syncPageScrollLayer);
        vv.removeEventListener("resize", syncPageScrollLayer);
      }
    };
  }, [useScrollTimeline, hasPageLockedLines, syncPageScrollLayer]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z_INDEX_GUIDE_LINES,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {useScrollTimeline && (
        <style dangerouslySetInnerHTML={{ __html: SCROLL_TIMELINE_STYLE }} />
      )}

      {hasPageLockedLines && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {useScrollTimeline ? (
            <div
              data-ruler-ext-scroll-y=""
              style={
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "none",
                } as React.CSSProperties
              }
            >
              <div
                data-ruler-ext-scroll-x=""
                style={
                  {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: docSize.w,
                    height: docSize.h,
                    pointerEvents: "none",
                  } as React.CSSProperties
                }
              >
                {pageLockedSubtree}
              </div>
            </div>
          ) : (
            <div
              ref={pageScrollLayerRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: docSize.w,
                height: docSize.h,
                willChange: "transform",
                pointerEvents: "none",
              }}
            >
              {pageLockedSubtree}
            </div>
          )}
        </div>
      )}

      {screenLockedLines.map((line) => {
        const vs = visualState(line.id, hoveredLineId, selectedId);
        const drawState =
          draggingLineId === line.id ? "selected" : vs;
        return (
          <GuideLineScreenVisual
            key={line.id}
            line={line}
            drawState={drawState}
            color={color}
          />
        );
      })}

      {showCursorVerticalPreview && cursor && (
        <div
          style={lineVisualStyle(
            "v",
            cursor.x,
            "default",
            livePreviewGuideColor,
          )}
        />
      )}
      {showCursorHorizontalPreview && cursor && (
        <div
          style={lineVisualStyle(
            "h",
            cursor.y,
            "default",
            livePreviewGuideColor,
          )}
        />
      )}

      {screenLockedLines.map((line) => (
        <GuideLineScreenHit
          key={`hit-${line.id}`}
          line={line}
          draggingLineId={draggingLineId}
          inspectMode={inspectMode}
          onLineMouseEnter={onLineMouseEnter}
          onLineMouseLeave={onLineMouseLeave}
          onLinePointerDown={onLinePointerDown}
          onLineClick={onLineClick}
          onLineDoubleClick={onLineDoubleClick}
        />
      ))}
    </div>
  );
}

export const GuideOverlay = memo(GuideOverlayInner);
GuideOverlay.displayName = "GuideOverlay";
