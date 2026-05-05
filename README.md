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

Produces a static site in `dist/`. Deployment is handled by the GitHub Actions
workflow in `.github/workflows/build.yml`.

## Content Layout

- `src/content/blog/` — blog posts (`YYYY-MM-DD-slug.md`).
- `src/content/docs-rugix/<version>/` — umbrella docs (`latest`, `0.8.14`, `0.7.5`, `0.6`).
- `src/content/docs-ctrl/<version>/` — Rugix Ctrl docs (`1.1`, `next`).
- `src/content/docs-bakery/<version>/` — Rugix Bakery docs (`1.0`, `next`).
- `src/schemas/*.schema.json` — JSON Schema sources rendered inline by
  `@silitics/astro-schema-viewer`.

Sidebar navigation per version is derived from the directory layout — see
`src/site.ts` for the per-book `DocsConfig` and version metadata.
