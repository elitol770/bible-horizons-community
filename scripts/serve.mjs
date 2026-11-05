import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await fs.readFile(path.join(root, "viewer/index.html"), "utf8");
const importMap = html.match(
  /<script type="importmap">([\s\S]*?)<\/script>/,
)[1];
const scriptHash = createHash("sha256").update(importMap).digest("base64");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
};
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'self' 'sha256-${scriptHash}'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob:; worker-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
  );
  try {
    if (
      req.method !== "GET" ||
      !/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host || "")
    ) {
      res.writeHead(403);
      res.end("Local GET requests only");
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    if (pathname === "/api/packages") {
      const dirs = await fs.readdir(path.join(root, "packages"), {
        withFileTypes: true,
      });
      const names = dirs
        .filter(
          (d) => d.isDirectory() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.name),
        )
        .map((d) => d.name);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(names));
      return;
    }
    let relative;
    if (pathname === "/") relative = "viewer/index.html";
    else if (/^\/viewer\/[a-z0-9.-]+$/.test(pathname))
      relative = pathname.slice(1);
    else if (["/scripts/glb.mjs", "/scripts/glb-limits.mjs"].includes(pathname))
      relative = pathname.slice(1);
    else if (
      /^\/packages\/[a-z0-9-]+\/(scene\.json|assets\/[a-zA-Z0-9_/-]+\.(glb|png|jpg|webp|txt))$/.test(
        pathname,
      )
    )
      relative = pathname.slice(1);
    else if (pathname.startsWith("/vendor/three/"))
      relative =
        "node_modules/three/" + pathname.slice("/vendor/three/".length);
    else {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const candidate = path.resolve(root, relative);
    if (
      !candidate.startsWith(root + path.sep) ||
      relative.split("/").includes("..")
    )
      throw new Error("Invalid path");
    const real = await fs.realpath(candidate);
    if (real !== candidate || !real.startsWith(root + path.sep))
      throw new Error("Symlink denied");
    const type = types[path.extname(real)];
    if (!type) throw new Error("Unsupported file type");
    const stat = await fs.stat(real);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024)
      throw new Error("Invalid file");
    res.setHeader("Content-Type", type);
    res.end(await fs.readFile(real));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log(
    "Community workshop: http://127.0.0.1:4173 (local only; no uploads or deployment)",
  ),
);
