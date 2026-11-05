import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
// GLTFExporter uses FileReader in browsers; this small Node shim handles its blobs.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const profile = [
  [0, 0.015],
  [0.085, 0.015],
  [0.11, 0.04],
  [0.145, 0.12],
  [0.15, 0.22],
  [0.13, 0.3],
  [0.085, 0.34],
  [0.07, 0.36],
  [0.075, 0.375],
  [0.06, 0.38],
  [0.055, 0.36],
  [0.07, 0.34],
  [0.115, 0.29],
  [0.135, 0.22],
  [0.13, 0.12],
  [0.09, 0.045],
  [0, 0.045],
].map((p) => new THREE.Vector2(...p));
const geometry = new THREE.LatheGeometry(profile, 48);
const material = new THREE.MeshStandardMaterial({
  color: 0x98624a,
  roughness: 0.95,
});
const mesh = new THREE.Mesh(geometry, material);
mesh.name = "Original illustrative vessel";
const group = new THREE.Group();
group.add(mesh);
const binary = await new GLTFExporter().parseAsync(group, { binary: true });
const bytes = Buffer.from(binary);
const dir = "packages/gen12-vessel-study";
await fs.mkdir(`${dir}/assets`, { recursive: true });
await fs.writeFile(`${dir}/assets/vessel.glb`, bytes);
const passage = {
  book: "GEN",
  chapter: 12,
  verseStart: 5,
  verseEnd: 5,
  edition: "World English Bible Classic (linked, not bundled)",
  sourceUrl: "https://ebible.org/eng-web/GEN12.htm",
};
const manifest = {
  schemaVersion: "1.0",
  id: "gen12-vessel-study",
  title: "An illustrative travel vessel",
  scope: "asset",
  status: "example",
  passage,
  summary:
    "A small technical example for packaging a passage-linked 3D object. Genesis 12:5 mentions possessions carried on the journey. This vessel is an invented visual aid, not an object specified by that verse.",
  limitations:
    "The passage does not identify this vessel, its shape, material, maker or date. No archaeological identification is claimed. This package is not a complete chapter experience or production-quality art.",
  evidenceKind: "artistic_interpretation",
  model: "assets/vessel.glb",
  files: [
    {
      path: "assets/vessel.glb",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      creator: "BibleHorizons contributors",
      license: "CC-BY-4.0",
      changes: "Original procedural example; no third-party model or textures.",
      provenance: {
        kind: "original",
        source: "scripts/generate-example.mjs in this repository",
        rightsEvidence:
          "Original geometry authored for this kit and offered under CC BY 4.0.",
      },
    },
  ],
  views: [
    {
      id: "overview",
      label: "Overview",
      position: [0.65, 0.5, 0.85],
      target: [0, 0.19, 0],
    },
    {
      id: "profile",
      label: "Side profile",
      position: [0.85, 0.22, 0],
      target: [0, 0.2, 0],
    },
    {
      id: "opening",
      label: "Opening",
      position: [0.3, 0.75, 0.3],
      target: [0, 0.25, 0],
    },
  ],
  hotspots: [
    {
      id: "journey",
      label: "The passage connection",
      position: [0.12, 0.2, 0],
      description:
        "Genesis 12:5 mentions possessions brought on the journey. This example uses an invented vessel to show how a proposed object can link to the passage without claiming the text describes that object.",
      verseStart: 5,
      verseEnd: 5,
      evidenceKind: "artistic_interpretation",
      sourceUrl: passage.sourceUrl,
    },
    {
      id: "form",
      label: "What is imagined",
      position: [0, 0.37, 0],
      description:
        "The rounded form and earthen color are artistic choices for this technical example. They are not sourced evidence for the appearance of Abram’s possessions.",
      verseStart: 5,
      verseEnd: 5,
      evidenceKind: "artistic_interpretation",
      sourceUrl: passage.sourceUrl,
    },
  ],
  coverage: [
    {
      verseStart: 5,
      verseEnd: 5,
      treatment: "supporting_context",
      description:
        "Only the mention of possessions is used as context. The object is invented; other people, movements and events in this verse are outside this asset-only example.",
    },
  ],
};
await fs.writeFile(
  `${dir}/scene.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
geometry.dispose();
material.dispose();
console.log(`Generated original example: ${bytes.length} bytes`);
