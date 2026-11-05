# From proposal to accepted contribution

**Proposal → agreed scope → contribution → automated checks → reviews → maintainer decision → separate official integration.**

## Submission

A proposal identifies a passage and concrete learning task, the intended change, evidence category, known uncertainty, asset sources and likely device cost. Start with a small object or scene improvement. The maintainer can accept the scope without promising to publish the result.

## Review record

The PR must record: commit SHA, package/file hashes, reviewer identity and role, exact files/views inspected, tests/device details, findings, decision and unresolved items. Reviews of old revisions do not automatically approve new changes.

- **Bible/editorial:** passage coverage, edition references, absent/misrepresented elements, textual versus historical versus artistic claims. Use the editorial checklist.
- **Visual:** actual imported model, not just a generated thumbnail; composition, scale, materials, ground contact, animation, story readability; desktop and phone evidence.
- **Rights:** origin and licenses for every file, required credit, third-party and generated-source terms, Scripture rights where applicable.
- **Technical/accessibility:** schema, file integrity, model validation, dependencies, loading/failure behavior, motion controls, keyboard/list equivalent and measured budgets.

Automated tests do not grant editorial or rights approval. A source image is not model approval. A passing package can still be rejected for poor storytelling or visual quality. Reviewers may be the same person for small proposals, but their role and actual work must be explicit; consequential contested content needs independent specialist review.

## Merge and production

The owner is the initial code owner. Contributor PRs require approval and successful `validate` checks. No contributors have direct write or deploy access by default. Admin bypass remains available to the owner and must not be represented as immutable two-person control.

All packages in this repository remain proposals or examples. An accepted package is imported by exact commit and hash into a private staging review. Production publishing, rollback and correction handling stay in the private application. Never execute contributor scripts with production credentials, import arbitrary remote model dependencies, or automatically deploy on a community merge.
