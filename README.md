# Rugix Documentation

The website and documentation for [Rugix](https://rugix.org), built with
[Astro](https://astro.build) on top of the
[`@silitics/astro-theme`](https://www.npmjs.com/package/@silitics/astro-theme)
and [`@silitics/astro-docs`](https://www.npmjs.com/package/@silitics/astro-docs)
packages.

## Local Development

```sh
pnpm install
pnpm dev
```

The site runs at <http://localhost:4322>. Most edits to MDX, components, and
styles hot-reload without restarting.

## Build

```sh
pnpm build
```

Produces a static site in `dist/`, including a Pagefind index of all documentation
sets and versions. Search is available from the main header with Ctrl/Cmd+K or
`/`. Use `pnpm preview` to test search against the built index. Deployment is
handled by the GitHub Actions workflow in `.github/workflows/build.yml`.

## Link Checks

Run `mise run check:links` to build the site and validate internal links,
page anchors, and GitHub edit links against their source files. The checker
uses production redirects from the infrastructure checkout at
`/workspace/silitics/infrastructure/hosts/production/silitics/core1/default.nix`.
Set `RUGIX_DOCS_REDIRECTS_FILE` to use a different checkout. External links
require a separate check.

## Rugix Bakery Reference Generation

The Rugix Bakery `next` reference is generated from the JSON catalogs emitted by
Rugix Bakery. Export catalogs from a Rugix Bakery project using the version being
documented:

```sh
./run-bakery rules list --repository core --json > /tmp/core-rules.json
./run-bakery recipes list --repository core --json > /tmp/core-recipes.json
./run-bakery layers list --repository core --json > /tmp/core-layers.json
```

Then, from this repository:

```sh
node scripts/generate-reference.mjs /tmp/core-rules.json /tmp/core-recipes.json /tmp/core-layers.json
node scripts/generate-reference.mjs --check /tmp/core-rules.json /tmp/core-recipes.json /tmp/core-layers.json
```

Edit the definitions and their adjacent Markdown in the Rugix Bakery repository.
The generator creates interface tables from configuration and includes the
Markdown explanations. It removes obsolete generated pages for the supplied
catalog kinds and preserves authored pages. The site build uses the committed
pages and does not require a Rugix Bakery installation.

See the [catalog guide](src/content/docs-bakery/next/reference/definition-catalogs.md) for
metadata conventions and generation for other repositories.

## Site Announcements

Configure the site-wide announcement banner in `brand.banner` in `src/site.ts`.
Use a new `id` for each announcement so dismissing an earlier banner does not
hide a new notice. Banner-specific styling lives in `src/styles/site.css`.

## Content Layout

- `src/content/blog/` — blog posts (`YYYY-MM-DD-slug.md`).
- `src/content/docs-rugix/<version>/` — umbrella docs (`latest`, `0.8.14`, `0.7.5`, `0.6`).
- `src/content/docs-ctrl/<version>/` — Rugix Ctrl docs (`1.3`, `next`).
- `src/content/docs-bakery/<version>/` — Rugix Bakery docs (`1.0`, `next`).
- `src/schemas/*.schema.json` — JSON Schema sources rendered inline by
  `@silitics/astro-schema-viewer`.

Sidebar navigation per version is derived from the directory layout — see
`src/site.ts` for the per-book `DocsConfig` and version metadata.

## Support

This repository is covered by
[Tier 1: Core](https://rugix.org/support-commitment/#tier-core) of the Rugix
Support Commitment.
