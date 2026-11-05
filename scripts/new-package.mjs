import fs from "node:fs/promises";
const id = process.argv[2];
if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64)
  throw new Error("Use: npm run package:new -- lowercase-package-id");
const template = JSON.parse(
  await fs.readFile(
    new URL("../packages/gen12-vessel-study/scene.json", import.meta.url),
    "utf8",
  ),
);
template.id = id;
template.title = "Describe your proposed contribution";
template.status = "proposal";
template.model = "assets/your-model.glb";
template.files[0] = {
  path: template.model,
  sha256: "REPLACE_WITH_SHA256",
  creator: "YOUR_PUBLIC_CREDIT",
  license: "CC-BY-4.0",
  changes: "Describe any modifications",
  provenance: {
    kind: "original",
    source: "Describe the original authoring source",
    rightsEvidence: "Describe your right to submit under this license",
  },
};
template.summary =
  "Replace this with the specific passage connection and learning purpose.";
template.limitations =
  "Replace this with what is artistic, uncertain, omitted or still needs review.";
const dir = new URL(`../packages/${id}/`, import.meta.url);
await fs.mkdir(dir, { recursive: false });
await fs.mkdir(new URL("assets/", dir));
await fs.writeFile(
  new URL("scene.json", dir),
  JSON.stringify(template, null, 2) + "\n",
);
console.log(
  `Created packages/${id}. Supply your model, rights, passage, viewpoints, hotspots and coverage; validation intentionally fails until completed.`,
);
