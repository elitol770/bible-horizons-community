const TYPES = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};
const COMPONENTS = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
function imageSize(bytes, mime) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mime === "image/png") {
    if (
      bytes.length < 24 ||
      view.getUint32(0) !== 0x89504e47 ||
      view.getUint32(4) !== 0x0d0a1a0a ||
      view.getUint32(12) !== 0x49484452
    )
      throw new Error("Invalid embedded PNG");
    return [view.getUint32(16), view.getUint32(20)];
  }
  if (mime === "image/jpeg") {
    if (bytes.length < 4 || view.getUint16(0) !== 0xffd8)
      throw new Error("Invalid embedded JPEG");
    let at = 2;
    while (at + 4 <= bytes.length) {
      if (bytes[at++] !== 0xff) throw new Error("Invalid JPEG marker");
      while (bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length)
        throw new Error("Invalid JPEG segment");
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) throw new Error("Invalid JPEG frame");
        return [view.getUint16(at + 5), view.getUint16(at + 3)];
      }
      at += length;
    }
    throw new Error("Supported JPEG dimensions not found");
  }
  throw new Error("Only embedded PNG/JPEG textures are accepted");
}
export function enforceDecodedLimits(json, bin) {
  const accessors = json.accessors || [],
    nodes = json.nodes || [],
    images = json.images || [];
  if (accessors.length > 2048 || nodes.length > 2000 || images.length > 32)
    throw new Error("Model inventory exceeds starter limits");
  let accessorBytes = 0;
  for (const a of accessors) {
    const item = TYPES[a.type] * COMPONENTS[a.componentType];
    if (!item || !Number.isSafeInteger(a.count) || a.count < 1)
      throw new Error("Invalid accessor allocation");
    // Matrices with 1/2-byte components have column padding; bound at float32 size.
    const decoded = a.count * TYPES[a.type] * 4;
    if (!Number.isSafeInteger(decoded) || decoded > 16 * 1024 * 1024)
      throw new Error("Accessor decoded allocation exceeds 16 MiB");
    accessorBytes += decoded;
  }
  if (accessorBytes > 32 * 1024 * 1024)
    throw new Error("Combined accessor allocation exceeds 32 MiB");
  for (const b of json.bufferViews || []) {
    if (
      b.buffer !== 0 ||
      !Number.isSafeInteger(b.byteLength) ||
      b.byteLength < 0 ||
      !Number.isSafeInteger(b.byteOffset ?? 0) ||
      (b.byteOffset ?? 0) < 0 ||
      (b.byteOffset ?? 0) + b.byteLength > bin.length
    )
      throw new Error("Invalid embedded buffer view");
  }
  const imageBytes = [];
  let textureBytes = 0;
  for (const image of images) {
    const b = json.bufferViews?.[image.bufferView];
    if (!b) throw new Error("Texture must have an embedded buffer view");
    const start = b.byteOffset || 0;
    const [w, h] = imageSize(
      bin.subarray(start, start + b.byteLength),
      image.mimeType,
    );
    if (!w || !h || w > 2048 || h > 2048)
      throw new Error("Embedded texture dimensions exceed 2048px");
    imageBytes.push(Math.ceil((w * h * 4 * 4) / 3));
  }
  const textures = json.textures || [];
  if (textures.length > 32) throw new Error("Texture inventory exceeds starter limits");
  for (const texture of textures) {
    if (!Number.isSafeInteger(texture.source) || imageBytes[texture.source] === undefined)
      throw new Error("Invalid texture source");
    // Charge each sampler record independently and allow both linear and sRGB copies.
    textureBytes += imageBytes[texture.source] * 2;
  }
  if (imageBytes.reduce((sum, bytes) => sum + bytes, 0) > 64 * 1024 * 1024)
    throw new Error("Decoded image estimate exceeds 64 MiB");
  if (textureBytes > 64 * 1024 * 1024)
    throw new Error("Estimated RGBA texture allocation exceeds 64 MiB");
  // A malformed cycle can recurse indefinitely in loaders before a model appears.
  const active = new Set(),
    done = new Set();
  function visit(index, depth) {
    if (!Number.isSafeInteger(index) || !nodes[index] || depth > 128)
      throw new Error("Invalid or overdeep node hierarchy");
    if (active.has(index)) throw new Error("Cyclic node hierarchy");
    if (done.has(index)) return;
    active.add(index);
    for (const child of nodes[index].children || []) visit(child, depth + 1);
    active.delete(index);
    done.add(index);
  }
  nodes.forEach((_, i) => visit(i, 0));
  return { accessorBytes, textureBytes };
}
