// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { markdownConfig } from "@silitics/astro-theme/markdown";

/*
 * Redirects for the Rugix Ctrl `next` docs, which were restructured
 * around thematic sections (System Updates, Application Updates,
 * State Management, Build Systems, Migrating, Reference) plus a few
 * cross-cutting concept pages at the root (Update Bundles, Hooks,
 * Delta Updates, Signed Updates).
 *
 * The released `1.1` branch keeps its historical layout and is not
 * affected.
 */
const ctrlNextRedirects = {
  // The docs root is now the introduction page (the auto-built sidebar
  // doesn't surface root index entries, so we make it a real top-level
  // page instead and redirect the bare URL to it).
  "/docs/ctrl/next": "/docs/ctrl/next/introduction",

  // Old top-level pages that moved into thematic sections.
  // Note: `state-management` itself is unchanged (it became its own
  // directory with an index page, but the URL still resolves the same
  // way), so no redirect is needed for it.
  "/docs/ctrl/next/over-the-air-updates":
    "/docs/ctrl/next/system-updates/",
  "/docs/ctrl/next/bootstrapping":
    "/docs/ctrl/next/state-management/bootstrapping",

  // Old `advanced/*` (the bucket no longer exists).
  "/docs/ctrl/next/advanced": "/docs/ctrl/next/reference/",
  "/docs/ctrl/next/advanced/boot-flows":
    "/docs/ctrl/next/system-updates/boot-flows",
  "/docs/ctrl/next/advanced/system-configuration":
    "/docs/ctrl/next/system-updates/system-configuration",
  "/docs/ctrl/next/advanced/update-bundles":
    "/docs/ctrl/next/update-bundles",
  "/docs/ctrl/next/advanced/fleet-management":
    "/docs/ctrl/next/fleet-management/",
  "/docs/ctrl/next/advanced/yocto-integration":
    "/docs/ctrl/next/build-systems/yocto",

  // Old `internals/*` → `reference/*`.
  "/docs/ctrl/next/internals": "/docs/ctrl/next/reference/internals",
  "/docs/ctrl/next/internals/filesystem-hierarchy":
    "/docs/ctrl/next/reference/filesystem-hierarchy",

  // Application Updates: the deep `reference` page moved into the
  // shared `reference/` section.
  "/docs/ctrl/next/application-updates/reference":
    "/docs/ctrl/next/reference/application-updates",
};

export default defineConfig({
  site: "https://rugix.org",
  vite: {
    plugins: [tailwindcss()],
    /*
     * chart.js and react-chartjs-2 are only referenced from inside
     * client-only islands, so Vite's automatic dep scan finds them
     * after the first request and re-bundles. That orphans the
     * already-served island module, which ends up importing chunk
     * URLs that no longer exist. Pinning them here makes Vite
     * pre-bundle once at startup. (Don't add `react`/`react-dom` —
     * the @astrojs/react integration owns that.)
     */
    optimizeDeps: {
      include: ["chart.js", "react-chartjs-2"],
    },
  },
  integrations: [react(), mdx(), sitemap()],
  markdown: markdownConfig(),
  redirects: ctrlNextRedirects,
});
