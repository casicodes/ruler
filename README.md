# Ruler

Next.js + Tailwind project for **Ruler**, a Chrome extension that shows alignment guides: a floating toolbar and cursor-following lines you can pin by clicking.

## Chrome extension

1. Build the extension bundle:

   ```bash
   npm run build:chrome
   ```

2. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the **`dist/chrome`** directory inside this project.

3. Visit any website. A small **floating toolbar** appears at the **top-left** (8px inset).

   - **Ruler icon** (Lucide `Ruler`, 16×16 / 1.5px stroke) — turn guides on or off (**R**). **Shift+click** clears all pinned guides.  
   - **Color + chevron** — open the preset palette (red / cyan / green / black / white; saved in `localStorage`).  
   - **Settings** — line mode menu: both axes, vertical only, or horizontal only (keyboard **H** / **B** / **V**). **S** toggles inspect (pointer) mode.  
   - Move the mouse: preview line(s) follow the cursor. **Click** on the page to drop line(s) at that position. **Hover** a pinned line for the resize cursor (↔ on vertical, ↕ on horizontal); **click** the line to select it (slightly thicker). **Delete**, **Backspace**, or **Esc** removes the selected line. Clicks on inputs and the toolbar are ignored for pinning.

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
- **Build:** [`scripts/build-extension.mjs`](scripts/build-extension.mjs) — esbuild bundles `content.js`.
# ruler
