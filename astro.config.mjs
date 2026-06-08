// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { markdownConfig } from "@silitics/astro-theme/markdown";

const noindexSitemapPaths =
  /^\/docs\/(?:(?:0\.6|0\.7\.5|0\.8\.14)|(?:ctrl|bakery)\/next)(?:\/|$)/;

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
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !noindexSitemapPaths.test(new URL(page).pathname),
    }),
  ],
  markdown: markdownConfig(),
});
