import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import Ajv from "ajv/dist/2020.js";
import { validateBytes } from "gltf-validator";
import { inspectGlb, MAX_PACKAGE_BYTES } from "./glb.mjs";
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const schema = JSON.parse(
  await fs.readFile(path.join(ROOT, "schemas/scene.schema.json"), "utf8"),
);
const validateSchema = new Ajv({ allErrors: true, strict: true }).compile(
  schema,
);
const books = Object.fromEntries(
  "GEN:50 EXO:40 LEV:27 NUM:36 DEU:34 JOS:24 JDG:21 RUT:4 1SA:31 2SA:24 1KI:22 2KI:25 1CH:29 2CH:36 EZR:10 NEH:13 EST:10 JOB:42 PSA:150 PRO:31 ECC:12 SNG:8 ISA:66 JER:52 LAM:5 EZK:48 DAN:12 HOS:14 JOL:3 AMO:9 OBA:1 JON:4 MIC:7 NAM:3 HAB:3 ZEP:3 HAG:2 ZEC:14 MAL:4 MAT:28 MRK:16 LUK:24 JHN:21 ACT:28 ROM:16 1CO:16 2CO:13 GAL:6 EPH:6 PHP:4 COL:4 1TH:5 2TH:3 1TI:6 2TI:4 TIT:3 PHM:1 HEB:13 JAS:5 1PE:5 2PE:3 1JN:5 2JN:1 3JN:1 JUD:1 REV:22"
    .split(" ")
    .map((x) => {
      const [k, v] = x.split(":");
      return [k, Number(v)];
    }),
);
export function validateManifest(data) {
  if (!validateSchema(data))
    throw new Error(
      `Schema: ${new Ajv().errorsText(validateSchema.errors, { separator: "; " })}`,
    );
  const p = data.passage;
  if (!books[p.book] || p.chapter > books[p.book])
    throw new Error("Invalid baseline chapter identity");
  if (p.verseStart > p.verseEnd) throw new Error("Reversed passage");
  for (const key of ["views", "hotspots", "files"]) {
    const ids = data[key].map((x) => x.id ?? x.path);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${key}`);
  }
  if (!data.files.some((f) => f.path === data.model))
    throw new Error("Model missing from file inventory");
  for (const v of data.views)
    if (v.position.every((x, i) => x === v.target[i]))
      throw new Error("View position equals target");
  for (const item of [...data.hotspots, ...data.coverage])
    if (
      item.verseStart > item.verseEnd ||
      item.verseStart < p.verseStart ||
      item.verseEnd > p.verseEnd
    )
      throw new Error("Range outside declared passage");
  const covered = new Set(
    data.coverage.flatMap((c) =>
      Array.from(
        { length: c.verseEnd - c.verseStart + 1 },
        (_, i) => c.verseStart + i,
      ),
    ),
  );
  for (let v = p.verseStart; v <= p.verseEnd; v++)
    if (!covered.has(v)) throw new Error(`Coverage gap at verse ${v}`);
  if (data.scope === "chapter" && p.verseStart !== 1)
    throw new Error(
      "Chapter proposals must start at verse 1; editor verifies edition-specific end",
    );
  for (const f of data.files)
    if (f.path.split("/").some((x) => x === ".." || x === "." || x === ""))
      throw new Error("Unsafe asset path");
  return data;
}
export async function fileInventory(dir, prefix = "") {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error("Symlinks are not accepted");
    if (entry.isDirectory())
      result.push(
        ...(await fileInventory(path.join(dir, entry.name), relative + "/")),
      );
    else if (entry.isFile()) result.push(relative);
    else throw new Error("Unsupported file type");
  }
  return result.sort();
}
export async function validatePackage(dir) {
  const data = validateManifest(
    JSON.parse(await fs.readFile(path.join(dir, "scene.json"), "utf8")),
  );
  if (path.basename(dir) !== data.id)
    throw new Error("Package folder must match id");
  const actual = await fileInventory(dir);
  const expected = ["scene.json", ...data.files.map((x) => x.path)].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      "Every package file must be inventoried; only scene.json is exempt",
    );
  let total = 0;
  const models = [];
  for (const entry of data.files) {
    const file = path.join(dir, entry.path),
      stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > MAX_PACKAGE_BYTES)
      throw new Error("Asset exceeds size limit");
    total += stat.size;
    if (total > MAX_PACKAGE_BYTES)
      throw new Error("Combined package bytes exceed 6 MiB");
    const bytes = await fs.readFile(file);
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
      throw new Error(`SHA256 mismatch: ${entry.path}`);
    if (entry.path.endsWith(".glb")) {
      const info = inspectGlb(bytes);
      const result = await validateBytes(new Uint8Array(bytes), {
        maxIssues: 50,
        externalResourceFunction: () =>
          Promise.reject(new Error("External resources denied")),
      });
      if (result.issues.numErrors)
        throw new Error(
          `glTF validation failed for ${entry.path}: ${JSON.stringify(result.issues.messages)}`,
        );
      models.push({
        path: entry.path,
        triangles: info.triangles,
        bytes: info.bytes,
        warnings: result.issues.numWarnings,
      });
    }
  }
  return {
    id: data.id,
    status: data.status,
    bytes: total,
    models,
    note: "Technical intake only; rights/editorial/visual review still required.",
  };
}
export async function validateAll(root = path.join(ROOT, "packages")) {
  const reports = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || !entry.isDirectory())
      throw new Error("packages must contain ordinary package directories");
    reports.push(await validatePackage(path.join(root, entry.name)));
  }
  if (!reports.length) throw new Error("No packages");
  return reports;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(JSON.stringify(await validateAll(), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
