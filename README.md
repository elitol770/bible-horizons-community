# Build the biblical world with us

Contribute 3D environments, models, animations, accessible interactions and carefully sourced chapter proposals to **[BibleHorizons](https://biblehorizons.com)**.

This is the community workshop, not the production website. Anyone can propose work. The project owner decides what is accepted and published after Bible, visual, rights and technical review. A merged contribution does not deploy anything or imply a complete chapter experience.

## Start here

- **Artists:** read the [first contribution briefs](docs/first-contributions.md) and [asset guide](docs/asset-guide.md). Open a proposal before making a large asset.
- **Developers:** run the local previewer below; improve the kit or package a proposed scene.
- **Researchers and readers:** submit a source-backed correction or review a chapter proposal using the [editorial checklist](docs/editorial-review.md).
- **Everyone:** read [how to contribute](CONTRIBUTING.md) and the [licensing and commercial-use policy](docs/licensing.md).

## Preview a real 3D package locally

Install Node.js 24 (the development pin is in `.nvmrc`), then:

```bash
npm ci --ignore-scripts
npm run check
npm run dev
```

Open **http://127.0.0.1:4173**. Select the included example or load your own self-contained GLB locally. Rotate, zoom, inspect named views and hotspots, and play/pause an animation when present. File selection stays in your browser; there is no upload service or account requirement. The server listens only on localhost.

The original vessel is deliberately a small technical example. It is **not** an approved ancient artifact reconstruction, a complete Genesis 12 experience, or the visual standard for the finished product. It demonstrates model packaging, attribution, named viewpoints and accessible passage-linked explanations without redistributing any production assets.

Create a proposal package:

```bash
npm run package:new -- gen12-my-scene
# Edit packages/gen12-my-scene/scene.json; add your assets and SHA256 records.
npm run validate
```

The scaffold is intentionally incomplete until you supply a valid model, creator, sources and rights. Read the [package format](docs/package-format.md) and [review process](docs/review-process.md). Validation checks the schema, declared files/hashes, GLB structure, source references and basic budgets; it cannot certify historical accuracy, ownership or visual quality.

## Commercial use, openly stated

BibleHorizons may charge for hosted features, subscriptions, tours, education tools or other services. Community contributions may be used in those offerings under their stated licenses. This repository's code is MIT; original scene descriptions, documentation and artwork are CC BY 4.0 unless explicitly marked otherwise. Those licenses also permit **other people** to reuse the public material commercially under the same applicable conditions.

Contributors retain their copyrights. Credit is required for CC BY material. A submission does not create employment, ownership in the business, royalties or a promise of payment; separately agreed paid commissions are handled outside this volunteer process. We do not ask contributors to transfer copyright or promise exclusive rights.

The private website, domain, accounts, billing, production data and deployment access are not included. Public contributions do not give access to them. See [governance](GOVERNANCE.md).
