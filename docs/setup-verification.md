# Initial setup verification

Verified 5 November 2026 for the initial community workshop. This report describes the kit, not production chapter readiness.

## Repository controls

- Public repository: `elitol770/bible-horizons-community`; separate from the private application.
- Owner `@elitol770` is the only repository collaborator and all-path code owner. GitHub reports no CODEOWNERS syntax errors.
- `main` requires one approving code-owner review, dismissal of stale approvals, resolved conversations and an up-to-date successful `validate` check from GitHub Actions. Force pushes and branch deletion are blocked. The owner deliberately retains administrator bypass; this is not a guarantee of independent approval of owner-authored changes.
- Automatic merge is disabled; squash merge is enabled.
- Workflows have read-only default permissions, cannot approve pull requests and require approval for all external fork contributors. There is no deployment workflow or production credential in this kit.
- Private vulnerability reporting is enabled.

## Checks performed

- `npm run check`: model/package validation and **11 unit tests passed**. The original 37,284-byte example has 1,536 triangles and zero glTF-validator warnings.
- `npm run test:browser`: **9 browser tests passed**, including actual WebGL rendering, named views and keyboard controls, 1440/390/320px layouts, automated accessibility checks, disabled WebGL, failed-request retry, local-file loading, embedded/corrupt textures, stale load rejection and context loss.
- Desktop and mobile screenshots were inspected by an AI visual reviewer. An independent AI technical reviewer reran all 11 unit tests and checked the allocation/lifecycle fixes; no outstanding material blocker was identified in that review scope. These are AI-assisted engineering reviews, not a human Bible, historical, rights or accessibility certification.
- GitHub's initial `Contribution checks` run [passed](https://github.com/elitol770/bible-horizons-community/actions/runs/42051999087).

Browser tests ran in headless Chromium with software WebGL on macOS. They do not certify physical mobile performance or screen-reader usability. The included vessel is a technical sample, not approved biblical archaeology or production art. Human editorial and visual review remains required for official chapter integration.

## Maintainer next steps

Share the repository and its first-contribution briefs. Review proposal scope before large modeling work. Check creator/rights evidence and DCO signoffs, review the package and code changes, then accept or request changes. A merge here does not publish to BibleHorizons.com: official integration is a separate owner-controlled action.
