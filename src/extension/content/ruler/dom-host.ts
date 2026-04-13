export const RULER_EXTENSION_HOST_ID = "ruler-extension-host";

/** Portal menu into the shadow root so palette clicks count as extension UI (see `isEventFromExtensionUi`). */
export function rulerMenuPortalContainer(): ShadowRoot | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(RULER_EXTENSION_HOST_ID)?.shadowRoot ?? null;
}

/** Hit-testing skips pointer-events:none UI; walk up to detect our shadow/host tree */
export function isUnderRulerExtensionHost(el: Element): boolean {
  let n: Node | null = el;
  while (n) {
    if (n instanceof HTMLElement && n.id === RULER_EXTENSION_HOST_ID) {
      return true;
    }
    n = n.parentNode;
  }
  return false;
}

export function pageElementFromPoint(clientX: number, clientY: number): Element | null {
  let stack: Element[];
  try {
    stack = document.elementsFromPoint(clientX, clientY);
  } catch {
    return null;
  }
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    if (isUnderRulerExtensionHost(node)) continue;
    const outerSvg = node.closest("svg");
    if (outerSvg) return outerSvg;
    return node;
  }
  return null;
}
