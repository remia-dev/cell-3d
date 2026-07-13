/**
 * Server entry. Serves the bundled React app, the downloaded .glb models
 * (from ../models), and the local Draco decoder (for compressed glTF).
 * Run with: bun --hot src/index.tsx
 */
import { serve, file } from "bun";
import { join } from "path";
import index from "./index.html";

const ROOT = join(import.meta.dir, "..");
const MODELS_DIR = join(ROOT, "models");
const ASSETS_DIR = join(ROOT, "assets");
const DRACO_DIR = join(ROOT, "node_modules/three/examples/jsm/libs/draco");

/** Serve a file from `dir`, guarding against path traversal. Missing → 404. */
async function serveFrom(dir: string, rawName: string, contentType?: string) {
  const name = rawName.replace(/[^a-zA-Z0-9._-]/g, "");
  const f = file(join(dir, name));
  if (!(await f.exists())) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = { "Cache-Control": "no-cache" };
  if (contentType) headers["Content-Type"] = contentType;
  return new Response(f, { headers });
}

const server = serve({
  routes: {
    "/models/:name": (req) => serveFrom(MODELS_DIR, req.params.name, "model/gltf-binary"),
    "/assets/:name": (req) => serveFrom(ASSETS_DIR, req.params.name),
    "/draco/:name": (req) => serveFrom(DRACO_DIR, req.params.name),
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🧫 Cell 3D running at ${server.url}`);
