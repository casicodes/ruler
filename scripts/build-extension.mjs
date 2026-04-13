import * as esbuild from "esbuild";
import { cpSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "dist", "chrome");

const watch = process.argv.includes("--watch");

mkdirSync(outDir, { recursive: true });

function copyManifest() {
  copyFileSync(
    join(root, "src/extension/manifest.json"),
    join(outDir, "manifest.json"),
  );
}

function copyIcons() {
  const src = join(root, "src/extension/icons");
  const dest = join(outDir, "icons");
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const esbuildOptions = {
  entryPoints: {
    content: join(root, "src/extension/content/index.tsx"),
    background: join(root, "src/extension/background.ts"),
  },
  outdir: outDir,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  minify: !watch,
  define: {
    "process.env.NODE_ENV": watch ? '"development"' : '"production"',
  },
};

async function run() {
  await import(new URL("./generate-extension-icons.mjs", import.meta.url));
  copyManifest();
  copyIcons();

  if (watch) {
    const ctx = await esbuild.context(esbuildOptions);
    await ctx.watch();
    console.log("Watching extension →", join(outDir, "content.js"), "+", join(outDir, "background.js"));
  } else {
    await esbuild.build(esbuildOptions);
    console.log("Extension built to", outDir);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
