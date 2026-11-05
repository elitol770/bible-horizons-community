# Asset guide

Deliver a **self-contained glTF 2.0 `.glb`**, meters, Y-up, correct normals and scale, embedded PNG/JPEG textures. Use meaningful node names. The starter viewer accepts standard GLB material/geometry features; compressed geometry or KTX2 decoders are not bundled yet. Do not export remote URIs, executables or source scripts as dependencies.

Provide front, side, back and root/underside views when contact matters. For moving subjects, include the full action, rest pose and pause state. No hovering roots, detached limbs, fused leaf slabs or hidden missing backs. Save original source files separately; the runtime GLB must remain reproducible. Large source files should be discussed before attaching or linking them. Do not add them to Git history by accident.

The initial package ceiling is **6 MiB across inventoried files** and **150,000 submitted mesh triangles** for the low variant. These are maximum intake limits, not targets for a small prop. A scene assembled from several accepted packages still has one combined scene budget. CPU counting accounts for mesh-node reuse; GPU instancing extensions are outside this starter profile. Decoded accessor estimates are capped at 16 MiB each and 32 MiB combined. Textures are limited to 2048px, with a conservative 64 MiB allocation estimate that charges repeated texture records and color-space copies. These bounds are not a total browser-memory guarantee; performance, draws and texture memory also require actual viewer/device measurements. Tell the reviewer which metrics are estimates.

Each inventory record needs the exact path, SHA256, creator, actual license, provenance type, source/rights evidence and modifications. Generated work needs tool/date/terms. The included vessel has an original authoring recipe and CC BY record as a format example; it is not an ancient pottery classification.

The chapter manifest must explain how each interaction connects to a passage and provide an equivalent object-list explanation. Keep names/claims outside model textures. Do not embed Scripture into textures. Narration is optional; when supplied it needs a transcript and independently cleared text/voice/music rights.
