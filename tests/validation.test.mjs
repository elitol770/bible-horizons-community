import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest, validatePackage } from "../scripts/validate.mjs";
import { inspectGlb } from "../scripts/glb.mjs";
const dir = new URL("../packages/gen12-vessel-study/", import.meta.url);
const example = JSON.parse(
  await fs.readFile(new URL("scene.json", dir), "utf8"),
);
function mutated(fn) {
  const data = structuredClone(example);
  fn(data);
  return data;
}
function glb(json) {
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20);
  text.copy(padded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, padded]);
}
test("actual original example passes independent glTF validation and manifest integrity", async () => {
  const result = await validatePackage(fileURLToPath(dir));
  assert.equal(result.models[0].warnings, 0);
  assert.equal(result.models[0].triangles, 1536);
});
test("rejects false published state and missing license", () => {
  assert.throws(() =>
    validateManifest(mutated((d) => (d.status = "published"))),
  );
  assert.throws(() =>
    validateManifest(mutated((d) => delete d.files[0].license)),
  );
});
test("rejects invalid chapters, reversed or uncovered passage ranges", () => {
  assert.throws(() =>
    validateManifest(mutated((d) => (d.passage.chapter = 51))),
  );
  assert.throws(() =>
    validateManifest(mutated((d) => (d.passage.verseStart = 6))),
  );
  assert.throws(
    () => validateManifest(mutated((d) => (d.passage.verseEnd = 6))),
    /gap/,
  );
});
test("rejects unknown properties, duplicate IDs, unsafe paths and mismatched model inventory", () => {
  assert.throws(() => validateManifest(mutated((d) => (d.deploy = true))));
  assert.throws(
    () => validateManifest(mutated((d) => d.hotspots.push(d.hotspots[0]))),
    /Duplicate/,
  );
  assert.throws(() =>
    validateManifest(mutated((d) => (d.files[0].path = "../private.glb"))),
  );
  assert.throws(
    () => validateManifest(mutated((d) => (d.model = "assets/missing.glb"))),
    /inventory/,
  );
});
test("generated assets require tool and date; noncommercial license cannot pass", () => {
  assert.throws(() =>
    validateManifest(
      mutated((d) => (d.files[0].provenance.kind = "generated")),
    ),
  );
  assert.throws(() =>
    validateManifest(mutated((d) => (d.files[0].license = "CC-BY-NC-4.0"))),
  );
});
test("GLB rejects external dependencies, unsupported compression and oversized triangles", () => {
  assert.throws(
    () =>
      inspectGlb(
        glb({
          asset: { version: "2.0" },
          images: [{ uri: "https://example.com/secret.png" }],
        }),
      ),
    /URI/,
  );
  assert.throws(
    () =>
      inspectGlb(
        glb({
          asset: { version: "2.0" },
          extensionsRequired: ["KHR_draco_mesh_compression"],
        }),
      ),
    /Extension/,
  );
  assert.throws(
    () =>
      inspectGlb(
        glb({
          asset: { version: "2.0" },
          nodes: [{ mesh: 0 }, { mesh: 0 }],
          meshes: [{ primitives: [{ indices: 0 }] }],
          accessors: [{ count: 300000, type: "SCALAR", componentType: 5123 }],
        }),
      ),
    /Triangle/,
  );
});
test("corrupt header and truncated GLB fail before loading", async () => {
  const original = await fs.readFile(new URL("assets/vessel.glb", dir));
  const corrupt = Buffer.from(original);
  corrupt.writeUInt32LE(99, 0);
  assert.throws(() => inspectGlb(corrupt), /header/);
  assert.throws(() => inspectGlb(original.subarray(0, 25)), /header/);
});
test("rejects tampered, unlisted and symlinked package files", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "bh-community-test-"));
  const target = path.join(temp, example.id);
  try {
    await fs.cp(dir, target, { recursive: true });
    await fs.appendFile(path.join(target, "assets/vessel.glb"), "x");
    await assert.rejects(validatePackage(target), /SHA256/);
    await fs.copyFile(
      new URL("assets/vessel.glb", dir),
      path.join(target, "assets/vessel.glb"),
    );
    await fs.writeFile(path.join(target, "extra.txt"), "not inventoried");
    await assert.rejects(validatePackage(target), /inventoried/);
    await fs.rm(path.join(target, "extra.txt"));
    await fs.symlink(
      path.join(target, "scene.json"),
      path.join(target, "assets/link.txt"),
    );
    await assert.rejects(validatePackage(target), /Symlinks/);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test("rejects tiny files declaring huge decoded accessors", () => {
  assert.throws(
    () =>
      inspectGlb(
        glb({
          asset: { version: "2.0" },
          nodes: [{ mesh: 0 }],
          meshes: [
            { primitives: [{ indices: 0, attributes: { POSITION: 1 } }] },
          ],
          accessors: [
            { type: "SCALAR", componentType: 5123, count: 3 },
            { type: "VEC3", componentType: 5126, count: 1000000000 },
          ],
        }),
      ),
    /allocation/,
  );
});
test("rejects cyclic nodes before loader recursion", () => {
  assert.throws(
    () =>
      inspectGlb(
        glb({
          asset: { version: "2.0" },
          nodes: [{ children: [1] }, { children: [0] }],
        }),
      ),
    /Cyclic/,
  );
});


test("bounds image dimensions and charges repeated texture allocations", async () => {
  const { enforceDecodedLimits } = await import("../scripts/glb-limits.mjs");
  const png = Buffer.alloc(24);
  png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(0x0d0a1a0a, 4);
  png.writeUInt32BE(0x49484452, 12);
  png.writeUInt32BE(2048, 16); png.writeUInt32BE(2048, 20);
  const model = {bufferViews: [{buffer: 0, byteLength: 24}], images: [{bufferView: 0, mimeType: "image/png"}], textures: [{source: 0}]};
  assert.ok(enforceDecodedLimits(model, png).textureBytes > 40 * 1024 * 1024);
  model.textures.push({source: 0});
  assert.throws(() => enforceDecodedLimits(model, png), /texture allocation/);
  png.writeUInt32BE(4096, 16);
  assert.throws(() => enforceDecodedLimits(model, png), /dimensions/);
});
