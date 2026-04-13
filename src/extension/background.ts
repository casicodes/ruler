type CaptureResponse =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

/** Must match `RULER_EXTENSION_HOST_ID` in `content/ruler/dom-host.ts`. */
function focusRulerExtensionHost() {
  const run = () => {
    const el = document.getElementById("ruler-extension-host");
    el?.focus({ preventScroll: true });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

const RULER_SHORTCUT_ACTIONS: Record<string, string> = {
  ruler_toggle_ruler: "toggleRuler",
  ruler_line_vertical: "lineVertical",
  ruler_line_horizontal: "lineHorizontal",
  ruler_line_both: "lineBoth",
};

chrome.commands.onCommand.addListener((command) => {
  const action = RULER_SHORTCUT_ACTIONS[command];
  if (!action) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const id = tabs[0]?.id;
    if (id === undefined) return;
    chrome.tabs
      .sendMessage(id, { type: "RULER_SHORTCUT", action })
      .catch(() => {
        /* no receiver / restricted page */
      });
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  const tabId = tab.id;
  void (async () => {
    try {
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      await chrome.tabs.update(tabId, { active: true });
    } catch {
      /* */
    }
    chrome.tabs.sendMessage(tabId, { type: "TOGGLE_OVERLAY" }).catch(() => {
      /* tab may not allow content scripts (e.g. chrome://) */
    });
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: focusRulerExtensionHost,
      })
      .catch(() => {
        /* restricted pages, etc. */
      });
  })();
});

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (r: CaptureResponse) => void,
  ) => {
    if (message?.type !== "CAPTURE_SCREENSHOT") {
      return;
    }

    chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          error: chrome.runtime.lastError.message ?? "capture failed",
        });
        return;
      }
      if (!dataUrl) {
        sendResponse({ ok: false, error: "empty capture" });
        return;
      }
      sendResponse({ ok: true, dataUrl });
    });

    return true;
  },
);
