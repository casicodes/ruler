# Ruler

Next.js + Tailwind project for **Ruler**, a Chrome extension that shows alignment guides: a floating toolbar and cursor-following lines you can pin by clicking.

## Chrome extension

**Install from the Chrome Web Store:** [Ruler](https://chromewebstore.google.com/detail/ruler/nmhhdnilbeomfigpaakdjnmmmiekbpml?utm_source=item-share-cb)

To work from source instead:

1. Build the extension bundle:

   ```bash
   npm run build:chrome
   ```

2. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the **`dist/chrome`** directory inside this project.

3. Visit any website. A small **floating toolbar** starts at the **top-left** (8px inset); drag to move (position is stored in `localStorage`).

   - **Ruler icon** (Lucide `Ruler`, 20×20 / 1.5px stroke) — turn guides on or off (**R**). **Shift+click** clears all pinned guides (same as **X** when there is at least one line).  
   - **Color + chevron** — open the preset palette (red, green, yellow; the chosen color is saved in `localStorage`).  
   - **Settings** — line mode menu: both axes, vertical only, or horizontal only. **H** = horizontal, **B** = both, **V** = vertical. **S** toggles inspect (pointer) mode. **C** captures a screenshot.  
   - Optional **Chrome** shortcuts (defaults **Alt+Shift+R** / **V** / **H** / **B**; configurable under `chrome://extensions/shortcuts`) send the same actions as **R** / **V** / **H** / **B** without focusing the page first.  
   - Move the mouse: preview line(s) follow the cursor. **Click** on the page to drop line(s) at that position. **Hover** a pinned line for the resize cursor (↔ on vertical, ↕ on horizontal); **click** the line to select it (slightly thicker). **Delete** or **Backspace** removes the selected line. **Esc** closes open toolbar menus, clears an inspect target when relevant, or turns off the ruler/inspect overlay — it does not delete a selected line. Clicks on inputs and the extension toolbar are ignored for pinning.

## Web app

Run the Next.js dev server (marketing / docs shell):

```bash
npm run dev
```

Full production build (extension + Next.js):

```bash
npm run build
```

The loadable extension output is always under **`dist/chrome`** after `npm run build:chrome` or `npm run build`.

## Layout

- **Extension UI:** [`src/extension/content/`](src/extension/content/) — React content script; rulers use inline styles inside a shadow root.
- **Build:** [`scripts/build-extension.mjs`](scripts/build-extension.mjs) — esbuild bundles `content.js` and `background.js`.
