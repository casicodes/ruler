import { RULER_EXTENSION_HOST_ID } from "./dom-host";

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** IME composition or legacy keyCode 229 — ignore shortcuts so we do not steal keys. */
export function isComposingKeyboardEvent(e: KeyboardEvent): boolean {
  if (e.isComposing) return true;
  return e.keyCode === 229;
}

export function isEventFromExtensionUi(e: { composedPath: () => EventTarget[] }): boolean {
  const path = e.composedPath();
  if (
    path.some(
      (n) =>
        n instanceof Element &&
        (n.hasAttribute("data-ruler-ui") ||
          n.hasAttribute("data-ruler-palette") ||
          n.hasAttribute("data-ruler-shortcuts-popup")),
    )
  ) {
    return true;
  }
  const host = document.getElementById(RULER_EXTENSION_HOST_ID);
  return !!(host && path.includes(host));
}

/**
 * Block default actions (navigate, submit, clicks, etc.) on the host page while the
 * ruler tool or inspect mode is active — same isolation as inspect-only, so links/hover
 * targets under the cursor do not react.
 */
export function swallowHostInteractionWhileRulerActive(e: Event) {
  if (!("composedPath" in e)) return;
  if (isEventFromExtensionUi(e as Event & { composedPath(): EventTarget[] })) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
}
