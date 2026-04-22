export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-lg border border-black/[.08] bg-white p-8 shadow dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Ruler
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Chrome extension: red alignment rulers on any page. Build the extension,
          load <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-900">dist/chrome</code>{" "}
          as an unpacked extension, then visit any site.
        </p>
        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
          Install from the{" "}
          <a
            className="text-zinc-950 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
            href="https://chromewebstore.google.com/detail/ruler/nmhhdnilbeomfigpaakdjnmmmiekbpml?utm_source=item-share-cb"
            rel="noopener noreferrer"
            target="_blank"
          >
            Chrome Web Store
          </a>
          . See the project README for shortcuts (<kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">H</kbd> / <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">B</kbd> / <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">V</kbd> for line mode,{" "}
          <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">R</kbd> to toggle, optional{" "}
          <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">Alt</kbd>+{" "}
          <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">Shift</kbd>+…
          in Chrome).
        </p>
      </main>
    </div>
  );
}
