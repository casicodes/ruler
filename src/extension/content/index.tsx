import type { TransitionEvent } from "react";
import { createRoot } from "react-dom/client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RulerApp } from "./RulerApp";
import { isEditableTarget } from "./ruler/interaction";
import { RULER_EXTENSION_HOST_ID } from "./ruler/dom-host";

declare global {
  interface Window {
    __RULER_EXTENSION__?: boolean;
  }
}

const OVERLAY_FADE_MS = 100;

type OverlayPhase = "shown" | "hiding" | "hidden" | "showing";

function ExtensionRoot() {
  /**
   * Shell uses **opacity only** so guides/lines stay fixed in place and simply fade. Toolbar-only
   * scale lives in `RulerApp` so the bar still eases at its center without moving the guides.
   */
  const [phase, setPhase] = useState<OverlayPhase>("hidden");
  const [fadeInArm, setFadeInArm] = useState(false);
  const phaseRef = useRef<OverlayPhase>(phase);
  phaseRef.current = phase;

  /** One-shot when overlay becomes visually interactive — see `focusRulerExtensionHost`. */
  const chromeInFocusLatchRef = useRef(false);

  useLayoutEffect(() => {
    if (phase !== "showing") return;
    setFadeInArm(false);
    let id0 = 0;
    let id1 = 0;
    id0 = requestAnimationFrame(() => {
      id1 = requestAnimationFrame(() => setFadeInArm(true));
    });
    return () => {
      cancelAnimationFrame(id0);
      cancelAnimationFrame(id1);
    };
  }, [phase]);

  useEffect(() => {
    const onMessage = (message: { type?: string }) => {
      if (message?.type !== "TOGGLE_OVERLAY") return;
      setPhase((p) => {
        if (p === "shown" || p === "showing") return "hiding";
        if (p === "hidden") return "showing";
        if (p === "hiding") return "showing";
        return p;
      });
    };
    try {
      chrome.runtime.onMessage.addListener(onMessage);
      return () => chrome.runtime.onMessage.removeListener(onMessage);
    } catch {
      return undefined;
    }
  }, []);

  const onOpacityTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity" || e.target !== e.currentTarget) return;
    const p = phaseRef.current;
    if (p === "hiding") setPhase("hidden");
    else if (p === "showing") setPhase("shown");
  };

  const chromeIn =
    phase === "shown" || (phase === "showing" && fadeInArm);

  /**
   * Move keyboard focus to the light-DOM shadow host (not nodes inside the shadow tree). Browsers
   * often ignore `focus()` on shadow descendants for tab keyboard routing; the host is focusable
   * and keeps capture-phase `window` shortcuts working without a prior page click.
   */
  useLayoutEffect(() => {
    if (!chromeIn) {
      chromeInFocusLatchRef.current = false;
      return;
    }
    const becameInteractive = !chromeInFocusLatchRef.current;
    if (!becameInteractive) return;
    chromeInFocusLatchRef.current = true;
    if (isEditableTarget(document.activeElement)) return;

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        document
          .getElementById(RULER_EXTENSION_HOST_ID)
          ?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [chromeIn]);

  /** Drop host focus when fully dismissed so keys return to normal page behavior. */
  useLayoutEffect(() => {
    if (phase !== "hidden") return;
    const host = document.getElementById(RULER_EXTENSION_HOST_ID);
    if (host && document.activeElement === host) host.blur();
  }, [phase]);

  /** Shortcuts stay enabled whenever the overlay is not fully dismissed (including pre-fade "showing"). */
  const shortcutsActive = phase !== "hidden";

  const opacity = chromeIn ? 1 : 0;

  const visibility: "visible" | "hidden" =
    phase === "hidden" ? "hidden" : "visible";

  const ariaHidden = phase === "hidden" || phase === "hiding";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        minHeight: "100%",
        pointerEvents: "none",
        opacity,
        visibility,
        transition: `opacity ${OVERLAY_FADE_MS}ms ease-out`,
      }}
      aria-hidden={ariaHidden}
      onTransitionEnd={onOpacityTransitionEnd}
    >
      <RulerApp
        hostPageActive={chromeIn}
        shortcutsActive={shortcutsActive}
      />
    </div>
  );
}

if (!window.__RULER_EXTENSION__) {
  window.__RULER_EXTENSION__ = true;

  const host = document.createElement("div");
  host.id = "ruler-extension-host";
  host.tabIndex = -1;
  host.setAttribute("data-ruler-extension", "");
  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const mount = document.createElement("div");
  mount.className = "ruler-mount";
  Object.assign(mount.style, {
    display: "block",
    width: "100%",
    height: "100%",
    minHeight: "100%",
  });
  shadow.appendChild(mount);

  const root = createRoot(mount);
  root.render(<ExtensionRoot />);
}
