// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { markdownConfig } from "@silitics/astro-theme/markdown";

/*
 * Redirects for the Rugix Ctrl `next` docs. The `next` branch is
 * organized around Rugix Ctrl's capabilities: an Overview (the
 * introduction), the OTA Updates, Application Management, and
 * State Management sections, an Integration section (build systems,
 * fleet management, migration), and a Reference section. These
 * redirects keep older `next` URLs, including those from earlier
 * layouts, resolving to their current location.
 *
 * The released `1.1` branch keeps its historical layout and is not
 * affected.
 */
const ctrlNextRedirects = {
  // The docs root redirects to the introduction page.
  "/docs/ctrl/next": "/docs/ctrl/next/introduction",

  // The Core Concepts page was dissolved: the bundle, delta, and
  // signing concepts were inlined into the OTA Updates section, and
  // hooks moved to the new Reference section.
  "/docs/ctrl/next/core-concepts": "/docs/ctrl/next/updates/update-bundles",
  "/docs/ctrl/next/update-bundles": "/docs/ctrl/next/updates/update-bundles",
  "/docs/ctrl/next/delta-updates": "/docs/ctrl/next/updates/delta-updates",
  "/docs/ctrl/next/signed-updates": "/docs/ctrl/next/updates/signed-updates",
  "/docs/ctrl/next/hooks": "/docs/ctrl/next/reference/hooks",

  // System updates moved into the OTA Updates section.
  "/docs/ctrl/next/system-updates":
    "/docs/ctrl/next/updates/system-updates/",
  "/docs/ctrl/next/system-updates/boot-flows":
    "/docs/ctrl/next/updates/system-updates/boot-flows",
  "/docs/ctrl/next/system-updates/system-configuration":
    "/docs/ctrl/next/updates/system-updates/system-configuration",

  // Application Updates became the Application Management section.
  "/docs/ctrl/next/application-updates":
    "/docs/ctrl/next/application-management/",
  "/docs/ctrl/next/application-updates/orchestrators":
    "/docs/ctrl/next/application-management/orchestrators/",
  "/docs/ctrl/next/application-updates/orchestrators/docker-compose":
    "/docs/ctrl/next/application-management/orchestrators/docker-compose",
  "/docs/ctrl/next/application-updates/orchestrators/binary":
    "/docs/ctrl/next/application-management/orchestrators/binary",
  "/docs/ctrl/next/application-updates/orchestrators/generic":
    "/docs/ctrl/next/application-management/orchestrators/generic",

  // Build systems, fleet management, and migration moved into the
  // Integration section.
  "/docs/ctrl/next/build-systems":
    "/docs/ctrl/next/integration/build-systems/",
  "/docs/ctrl/next/build-systems/rugix-bakery":
    "/docs/ctrl/next/integration/build-systems/rugix-bakery",
  "/docs/ctrl/next/build-systems/yocto":
    "/docs/ctrl/next/integration/build-systems/yocto",
  "/docs/ctrl/next/build-systems/others":
    "/docs/ctrl/next/integration/build-systems/others",
  "/docs/ctrl/next/fleet-management":
    "/docs/ctrl/next/integration/fleet-management/",
  "/docs/ctrl/next/fleet-management/integrations":
    "/docs/ctrl/next/integration/fleet-management/integrations",
  "/docs/ctrl/next/migrating":
    "/docs/ctrl/next/integration/migrating/",
  "/docs/ctrl/next/migrating/from-rauc":
    "/docs/ctrl/next/integration/migrating/from-rauc",
  "/docs/ctrl/next/migrating/from-mender":
    "/docs/ctrl/next/integration/migrating/from-mender",

  // An earlier `reference/` section was dissolved; most pages moved
  // next to the capability they document. The current Reference
  // section holds only cross-cutting material such as hooks, and its
  // own routes are real pages that need no redirects here.
  "/docs/ctrl/next/reference/update-bundles":
    "/docs/ctrl/next/updates/update-bundles",
  "/docs/ctrl/next/reference/delta-updates":
    "/docs/ctrl/next/updates/delta-updates",
  "/docs/ctrl/next/reference/signed-updates":
    "/docs/ctrl/next/updates/signed-updates",
  "/docs/ctrl/next/reference/application-updates":
    "/docs/ctrl/next/application-management/internals",
  "/docs/ctrl/next/reference/filesystem-hierarchy":
    "/docs/ctrl/next/state-management/filesystem-hierarchy",
  "/docs/ctrl/next/reference/internals": "/docs/ctrl/next/introduction",

  // Bootstrapping lives under State Management.
  "/docs/ctrl/next/bootstrapping":
    "/docs/ctrl/next/state-management/bootstrapping",

  // Even older `over-the-air-updates`, `advanced/*`, and `internals/*`
  // layout.
  "/docs/ctrl/next/over-the-air-updates":
    "/docs/ctrl/next/updates/system-updates/",
  "/docs/ctrl/next/advanced": "/docs/ctrl/next/introduction",
  "/docs/ctrl/next/advanced/boot-flows":
    "/docs/ctrl/next/updates/system-updates/boot-flows",
  "/docs/ctrl/next/advanced/system-configuration":
    "/docs/ctrl/next/updates/system-updates/system-configuration",
  "/docs/ctrl/next/advanced/update-bundles":
    "/docs/ctrl/next/updates/update-bundles",
  "/docs/ctrl/next/advanced/fleet-management":
    "/docs/ctrl/next/integration/fleet-management/",
  "/docs/ctrl/next/advanced/yocto-integration":
    "/docs/ctrl/next/integration/build-systems/yocto",
  "/docs/ctrl/next/internals": "/docs/ctrl/next/introduction",
  "/docs/ctrl/next/internals/filesystem-hierarchy":
    "/docs/ctrl/next/state-management/filesystem-hierarchy",
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
