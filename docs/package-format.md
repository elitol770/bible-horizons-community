# Package format v1

A package contains `scene.json` and inventoried files below `assets/`. Its folder matches its stable lowercase ID. No scripts execute from a package. Code contributions go in the kit's code directories and receive separate review.

`schemas/scene.schema.json` is the machine-readable contract. See `packages/gen12-vessel-study/scene.json` for a complete example.

- **scope:** `asset` means a bounded passage-linked object/study. `chapter` proposes an entire chapter and needs a coverage matrix from verse 1 to the correct edition-specific ending; an editor must verify that ending. Neither scope establishes production completeness.
- **status:** only `example` or `proposal`; there is no self-asserted published/approved state.
- **passage:** stable Protestant baseline book/chapter identity, edition name, verse range and an HTTPS source link. Edition numbering differences must be explained; the kit cannot certify all versification mappings.
- **summary / limitations / evidenceKind:** separate the teaching purpose from what is unknown or artistic. A source URL is not approval of every statement.
- **model:** a self-contained GLB below assets. The initial intake accepts uncompressed triangle meshes and embedded textures; unsupported extensions fail visibly. Do not substitute a thumbnail for the actual model.
- **files:** every asset's SHA256, creator, license, changes and provenance. Generated material also records tool/date and applicable rights evidence. The script `shasum -a 256 path/to/file.glb` can obtain a hash; no hash proves ownership.
- **views:** named positions/targets in the model's meter/Y-up coordinates. The viewer does not silently rescale the model.
- **hotspots:** named positions, labels, descriptions and passage/source bindings. Every hotspot is available as a normal DOM button; selecting it explains the object without forcing camera movement.
- **coverage:** passage ranges and whether each is handled by scene, object or supporting context. No declared range may be silently omitted. Asset scope is not a claim that the whole chapter is represented.

The viewer's sample and drop-in GLB modes use the same loader. A loose model has no approved passage metadata; the UI explicitly labels it an unreviewed local model. Run the validator for packaged submissions. Local preview does not upload, publish, accept rights or approve an exhibit.
