import { deflateSync } from "node:zlib";
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function png(broken) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const row = Buffer.from([0, 130, 180, 70, 255, 210, 160, 80, 255]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk(
      "IDAT",
      broken ? Buffer.from("broken") : deflateSync(Buffer.concat([row, row])),
    ),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function texturedFixture(original, broken = false) {
  const length = original.readUInt32LE(12);
  const json = JSON.parse(original.subarray(20, 20 + length).toString());
  const oldBin = original.subarray(28 + length),
    image = png(broken),
    offset = Math.ceil(oldBin.length / 4) * 4;
  const bin = Buffer.alloc(Math.ceil((offset + image.length) / 4) * 4);
  oldBin.copy(bin);
  image.copy(bin, offset);
  json.buffers[0].byteLength = bin.length;
  const imageView = json.bufferViews.length;
  json.bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: image.length,
  });
  json.images = [{ mimeType: "image/png", bufferView: imageView }];
  json.textures = [{ source: 0 }];
  json.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  const text = Buffer.from(JSON.stringify(json));
  const j = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20);
  text.copy(j);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(28 + j.length + bin.length, 8);
  head.writeUInt32LE(j.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, j, bh, bin]);
}
