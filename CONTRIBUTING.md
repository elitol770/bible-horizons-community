# Contributing

1. Open a **Scene or asset proposal** issue and describe the passage, learning purpose, visible result and planned sources. Corrections and kit bugs have their own forms. Avoid starting a whole chapter without discussing its coverage.
2. Fork this repository. Make changes in your copy or a branch there. You do not need write access to this repository or access to the live website.
3. Put scene packages in `packages/<stable-id>/`. Include the model, plain-language explanations, accessible object list, rights/provenance and complete file inventory. Use the generator for a starting manifest.
4. Run `npm ci --ignore-scripts` and `npm run check`. Use the viewer at desktop and 390px/320px phone widths. Record actual results and limitations; do not claim physical-device testing from emulation.
5. Submit a pull request. Include before/after images for visual changes, sources, actual test results and the requested review checklist. Maintainers may request changes or decline work.
6. A maintainer reviews and merges an accepted contribution. Official website integration is a separate, owner-controlled process.

## Permission and attribution

Read [licensing.md](docs/licensing.md) before submitting. Original code is contributed under MIT. Original artwork, scene prose, documentation and package data are contributed under CC BY 4.0. You retain ownership and grant permissions under those licenses; attribution, license links and modification notices must be preserved. Third-party material keeps its actual license and requires a separate manifest entry. Do not relabel a purchased model or an AI service's output as CC BY unless you can grant those rights.

Add a `Signed-off-by: Your Name <your-email>` line to each commit using `git commit -s`, after reading the [Developer Certificate of Origin](DCO). This certifies your right to submit under the indicated license; it is not copyright assignment or a substitute for the license. Your public identity, commit email and sign-off become public. Use an email you are comfortable publishing (GitHub provides a no-reply option). Maintainers verify sign-off and rights before merging; the automated validator alone does not certify either.

For non-code/art contributions, also complete the rights checkboxes in the PR and include a creator/licensing record for every file. Do not sign on someone else's behalf. Private grants or personal documents should not be put in an issue or repository; arrange an appropriate private review first.

## Scope and conduct

Respect different traditions; label interpretation rather than presenting it as undisputed fact. Keep Scripture quotations unchanged and edition-attributed, and only include licensed text. Cite the actual passage/source. AI assistance must be disclosed for assets and prose; it does not supply evidence or automatically establish ownership.

Keep reviews specific, civil and focused on the work. No harassment, proselytizing at other contributors, personal data, or graphic reenactments of abuse. Maintainers may close off-topic submissions and remove access when needed. See the [review process](docs/review-process.md).
