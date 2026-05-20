// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { markdownConfig } from "@silitics/astro-theme/markdown";

/*
 * Redirects from the 1.1 flat layout (which lived at the same
 * `/docs/ctrl/` root) to the 1.2 capability-based layout. Rugix Ctrl
 * 1.2 is now the default at `/docs/ctrl/`, organized into OTA
 * Updates, Application Management, State Management, Integration,
 * and Reference sections.
 */
const ctrlRedirects = {
  // 1.1 root → introduction.
  "/docs/ctrl": "/docs/ctrl/introduction",

  // Cross-cutting concept pages now live under the OTA Updates and
  // Reference sections.
  "/docs/ctrl/delta-updates": "/docs/ctrl/updates/delta-updates",
  "/docs/ctrl/signed-updates": "/docs/ctrl/updates/signed-updates",
  "/docs/ctrl/over-the-air-updates": "/docs/ctrl/updates/system-updates/",
  "/docs/ctrl/hooks": "/docs/ctrl/reference/hooks",
  "/docs/ctrl/bootstrapping": "/docs/ctrl/state-management/bootstrapping",

  // Application Updates became Application Management.
  "/docs/ctrl/application-updates": "/docs/ctrl/application-management/",
  "/docs/ctrl/application-updates/reference":
    "/docs/ctrl/application-management/internals",
  "/docs/ctrl/application-updates/orchestrators":
    "/docs/ctrl/application-management/orchestrators/",
  "/docs/ctrl/application-updates/orchestrators/docker-compose":
    "/docs/ctrl/application-management/orchestrators/docker-compose",
  "/docs/ctrl/application-updates/orchestrators/binary":
    "/docs/ctrl/application-management/orchestrators/binary",
  "/docs/ctrl/application-updates/orchestrators/generic":
    "/docs/ctrl/application-management/orchestrators/generic",

  // Migration guides moved into the Integration section.
  "/docs/ctrl/migrating": "/docs/ctrl/integration/migrating/",
  "/docs/ctrl/migrating/from-rauc":
    "/docs/ctrl/integration/migrating/from-rauc",
  "/docs/ctrl/migrating/from-mender":
    "/docs/ctrl/integration/migrating/from-mender",

  // The `advanced/` bucket was dissolved; pages moved next to the
  // capability they document.
  "/docs/ctrl/advanced": "/docs/ctrl/introduction",
  "/docs/ctrl/advanced/boot-flows":
    "/docs/ctrl/updates/system-updates/boot-flows",
  "/docs/ctrl/advanced/system-configuration":
    "/docs/ctrl/updates/system-updates/system-configuration",
  "/docs/ctrl/advanced/update-bundles": "/docs/ctrl/updates/update-bundles",
  "/docs/ctrl/advanced/fleet-management":
    "/docs/ctrl/integration/fleet-management/",
  "/docs/ctrl/advanced/yocto-integration":
    "/docs/ctrl/integration/build-systems/yocto",

  // `internals/` moved into State Management.
  "/docs/ctrl/internals": "/docs/ctrl/introduction",
  "/docs/ctrl/internals/filesystem-hierarchy":
    "/docs/ctrl/state-management/filesystem-hierarchy",
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
  redirects: ctrlRedirects,
});
