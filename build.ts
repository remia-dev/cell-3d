/**
 * Production build for static hosting (Vercel).
 * Bundles the frontend, then copies the static payload the app fetches at
 * runtime (/models, /assets, /draco) into dist/ so a plain static host serves them.
 */
import { $ } from "bun";
import { rmSync, cpSync } from "fs";

rmSync("dist", { recursive: true, force: true });

// bundle the React app -> dist/index.html + hashed js/css
await $`bun build src/index.html --outdir=dist`;

// copy the files the app requests by path at runtime
cpSync("models", "dist/models", { recursive: true });
cpSync("assets", "dist/assets", { recursive: true });
cpSync("node_modules/three/examples/jsm/libs/draco", "dist/draco", { recursive: true });

console.log("✓ Built to dist/ (frontend + models + assets + draco)");
