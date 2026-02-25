import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

const config: Config = {
  title: "Rugix",
  tagline:
    "Everything you need to build and maintain robust Linux-powered products, from development to production.",
  url: "https://rugix.org/",
  baseUrl: "/",

  onBrokenLinks: "warn",

  // We do not care about old browsers not supporting SVG.
  favicon: "/img/logo.svg",

  organizationName: "silitics",
  projectName: "rugix",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          lastVersion: "current",
          versions: {
            current: { label: "Latest" },
          },
          editUrl: "https://github.com/rugix/rugix-docs/tree/main/",
        },
        blog: {
          showReadingTime: true,
          editUrl: "https://github.com/rugix/rugix-docs/tree/main/",
          blogSidebarCount: "ALL",
          blogSidebarTitle: "All Posts",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    announcementBar: {
      id: "2026-embedded-world",
      content: `
          📣 <a target="_blank" href="/blog/releases/1.0" style="font-size: 110%"><strong>Rugix 1.0.0 is out!</strong></a> & <a target="_blank" href="https://www.embedded-world.de/de-de/aussteller/silitics-gmbh-2520096/rugix-2524144" style="font-size: 110%"><strong>Meet us at Embedded World 2026!</strong></a> 📣
      `,
      // id: "2026-nexigon-release",
      // content: `
      //     🚀 <a target="_blank" href="https://nexigon.cloud" style="font-size: 110%"><strong>Looking for a modern device management solution that plays well with Rugix? Check out Nexigon, by the creators of Rugix!</strong></a>  🚀
      // `,
      // id: "2025-cra-whitepaper",
      // content: `
      //     📣 <a target="_blank" href="https://silitics.com/news/2025-11-12-cra-whitepaper/" style="font-size: 110%"><strong>Rugix has been featured in a whitepaper on CRA compliance by EY, Cumulocity, and Silitics</strong>.</a> 📣
      //   `,
      backgroundColor: "#6ee7b7",
      isCloseable: true,
    },
    navbar: {
      title: "Rugix",
      logo: {
        alt: "Rugix Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "doc",
          docId: "getting-started",
          position: "left",
          label: "Docs",
        },
        { to: "/blog", label: "Blog", position: "left" },
        {
          to: "/fleet-management",
          label: "Fleet Management",
          position: "right",
        },
        {
          to: "/cyber-resilience-act",
          label: "Cyber Resilience Act",
          position: "right",
        },
        {
          type: "docsVersionDropdown",
          docsPluginId: "ctrl",
          position: "right",
          dropdownActiveClassDisabled: true,
        },
        {
          type: "docsVersionDropdown",
          docsPluginId: "bakery",
          position: "right",
          dropdownActiveClassDisabled: true,
        },
        {
          href: "https://github.com/rugix/rugix",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/docs/getting-started",
            },
            {
              label: "Rugix Ctrl",
              to: "/docs/ctrl",
            },
            {
              label: "Rugix Bakery",
              to: "/docs/bakery",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Blog",
              href: "/blog",
            },
            {
              label: "GitHub",
              href: "https://github.com/rugix/rugix",
            },
            {
              label: "Discord",
              href: "https://discord.gg/cZ8wP9jNsn",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Fleet Management",
              to: "/fleet-management",
            },
            {
              label: "Cyber Resilience Act",
              to: "/cyber-resilience-act"
            },
            {
              label: "Commercial Support",
              to: "/commercial-support",
            },
          ],
        },
        {
          title: "Legal",
          items: [
            {
              // German and EU law require us to have a privacy policy.
              label: "Privacy Policy",
              href: "https://silitics.com/privacy-policy",
            },
            {
              label: "Security Policy",
              href: "https://github.com/rugix/rugix/blob/main/SECURITY.md"
            },
            {
              // German law requires us to have an Impressum.
              label: "Imprint",
              href: "https://silitics.com/impressum",
            },
          ],
        },
      ],
      copyright: `<div>Made with ❤️ for OSS</div><div>Copyright © ${new Date().getFullYear()} <a href="https://silitics.com">Silitics GmbH</a></div><div><small>Built with Docusaurus</small></div>`,
    },
    prism: {
      theme: require("prism-react-renderer").themes.vsDark,
      additionalLanguages: ["rust", "toml", "yaml", "bash", "docker", "nix"],
    },
  } satisfies Preset.ThemeConfig,

  themes: ["@docusaurus/theme-mermaid", "docusaurus-json-schema-plugin"],

  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "ctrl",
        path: "docs-ctrl",
        routeBasePath: "docs/ctrl",
        sidebarPath: require.resolve("./sidebars-ctrl.js"),
        editUrl: "https://github.com/rugix/rugix-docs/tree/main/",
      },
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "bakery",
        path: "docs-bakery",
        routeBasePath: "docs/bakery",
        sidebarPath: require.resolve("./sidebars-bakery.js"),
        editUrl: "https://github.com/rugix/rugix-docs/tree/main/",
      },
    ],
    [
      "docusaurus-plugin-plausible",
      {
        domain: "rugix.org",
      },
    ],
    async function tailwind(context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require("tailwindcss"))
          postcssOptions.plugins.push(require("autoprefixer"))
          return postcssOptions
        },
      }
    },
  ],
}

export default config
