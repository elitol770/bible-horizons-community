import { enforceDecodedLimits } from "./glb-limits.mjs";
/** Restricted, self-contained intake profile; no remote dependencies or decoders. */
export const MAX_PACKAGE_BYTES = 6 * 1024 * 1024;
export function inspectGlb(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength > MAX_PACKAGE_BYTES || bytes.byteLength < 20)
    throw new Error("GLB size outside intake limit");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength
  )
    throw new Error("Invalid GLB header");
  const length = view.getUint32(12, true);
  if (
    view.getUint32(16, true) !== 0x4e4f534a ||
    length % 4 ||
    20 + length > bytes.byteLength
  )
    throw new Error("Invalid GLB JSON chunk");
  const json = JSON.parse(
    new TextDecoder().decode(bytes.subarray(20, 20 + length)).trim(),
  );
  if (json.asset?.version !== "2.0") throw new Error("glTF 2.0 required");
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (key === "uri")
        throw new Error(
          "External or data URI dependencies are not accepted; embed GLB images/buffers",
        );
      walk(v);
    }
  };
  walk(json);
  const supported = new Set([
    "KHR_materials_unlit",
    "KHR_texture_transform",
    "KHR_mesh_quantization",
  ]);
  for (const extension of [
    ...(json.extensionsUsed || []),
    ...(json.extensionsRequired || []),
  ])
    if (!supported.has(extension))
      throw new Error(
        `Extension ${extension} is not in the starter preview profile`,
      );
  let bin = new Uint8Array();
  const binStart = 20 + length;
  if (binStart < bytes.length) {
    if (
      binStart + 8 > bytes.length ||
      view.getUint32(binStart + 4, true) !== 0x004e4942 ||
      binStart + 8 + view.getUint32(binStart, true) !== bytes.length
    )
      throw new Error("Invalid GLB binary chunk");
    bin = bytes.subarray(binStart + 8);
  }
  const decoded = enforceDecodedLimits(json, bin);
  let triangles = 0;
  for (const node of json.nodes || []) {
    if (node.mesh === undefined) continue;
    const mesh = json.meshes?.[node.mesh];
    if (!mesh) throw new Error("Missing node mesh");
    for (const p of mesh.primitives || []) {
      if (p.mode !== undefined && p.mode !== 4)
        throw new Error("Only triangle primitives are accepted");
      const count =
        json.accessors?.[p.indices ?? p.attributes?.POSITION]?.count;
      if (!Number.isSafeInteger(count) || count < 0 || count % 3)
        throw new Error("Invalid triangle accessor");
      triangles += count / 3;
    }
  }
  if (triangles > 150000)
    throw new Error(`Triangle intake limit exceeded: ${triangles}`);
  if (!triangles) throw new Error("A model with triangle geometry is required");
  return { json, triangles, bytes: bytes.byteLength, decoded };
}
