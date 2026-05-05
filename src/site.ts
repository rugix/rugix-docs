import "./styles/site.css";

import { getCollection } from "astro:content";
import type { Brand, NavItem, FooterColumn, SocialLink } from "@silitics/astro-theme";
import type { DocsConfig } from "@silitics/astro-docs";
import { buildNav, memoizeDocsConfig } from "@silitics/astro-docs";
import {
  faGithub,
  faDiscord,
  faDiscourse,
} from "@fortawesome/free-brands-svg-icons";

export const brand: Brand = {
  name: "Rugix",
  logo: "/img/logo.svg",
  href: "/",
  tagline:
    "Everything you need to build and maintain robust Linux-powered products, from development to production.",
  ogImage: "/img/logo.svg",
  locale: "en",
  themeColor: { dark: "#0b0d12", light: "#fafafa" },
  titleTemplate: "%s — Rugix",
  banner: {
    id: "2026-rugix-apps",
    message: "📣 Introducing Rugix Apps: Reliable Application Updates for Edge Devices",
    link: { label: "Read the announcement", href: "/blog/rugix-apps" },
    tone: "success",
    dismissible: true,
  },
};

export const nav: NavItem[] = [
  {
    label: "Docs",
    children: [
      { label: "Overview", href: "/docs/getting-started" },
      { label: "Rugix Ctrl", href: "/docs/ctrl" },
      { label: "Rugix Bakery", href: "/docs/bakery" },
    ],
  },
  { label: "Blog", href: "/blog" },
  { label: "Fleet Management", href: "/fleet-management" },
  { label: "Cyber Resilience Act", href: "/cyber-resilience-act" },
];

export const headerActions: NavItem[] = [
  {
    label: "GitHub",
    href: "https://github.com/rugix/rugix",
    external: true,
    icon: faGithub,
  },
];

export const footerColumns: FooterColumn[] = [
  {
    title: "Docs",
    links: [
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Rugix Ctrl", href: "/docs/ctrl" },
      { label: "Rugix Bakery", href: "/docs/bakery" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "GitHub", href: "https://github.com/rugix/rugix", external: true },
      { label: "Discord", href: "https://discord.gg/cZ8wP9jNsn", external: true },
      { label: "Discourse", href: "https://community.silitics.com/", external: true },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Fleet Management", href: "/fleet-management" },
      { label: "Cyber Resilience Act", href: "/cyber-resilience-act" },
      { label: "Commercial Support", href: "/commercial-support" },
      { label: "Open Source Commitment", href: "/open-source-commitment" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "https://silitics.com/privacy-policy", external: true },
      {
        label: "Security Policy",
        href: "https://github.com/rugix/rugix/blob/main/SECURITY.md",
        external: true,
      },
      { label: "Imprint", href: "https://silitics.com/impressum", external: true },
    ],
  },
];

export const socials: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/rugix/rugix", icon: faGithub },
  { label: "Discord", href: "https://discord.gg/cZ8wP9jNsn", icon: faDiscord },
  { label: "Discourse", href: "https://community.silitics.com/", icon: faDiscourse },
];

/*
 * Edit-this-page URLs point at this repo's `src/content/<collection>/
 * <version>/<slug>.<ext>` tree. Each version's `editBaseUrl` extends
 * down to the version directory so the framework only has to append
 * `<pageSlug>.<ext>`.
 */
const REPO_EDIT_BASE =
  "https://github.com/rugix/rugix-docs/edit/main/src/content";

/**
 * Umbrella Rugix docs at `/docs/`. The default version (`latest`) is
 * mounted at the root (`pathPrefix: "/docs/"`) so historical links like
 * `/docs/getting-started` keep working. Older versions get a version
 * segment (`/docs/0.8.14/getting-started`).
 */
export const getRugixDocsConfig = memoizeDocsConfig(
  async (): Promise<DocsConfig> => {
    const all = await getCollection("docs-rugix");
    const versions = [
      {
        slug: "latest",
        label: "Latest",
        status: "current" as const,
        default: true,
        pathPrefix: "/docs/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-rugix/latest`,
      },
      {
        slug: "0.8.14",
        label: "0.8.14",
        status: "archived" as const,
        pathPrefix: "/docs/0.8.14/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-rugix/0.8.14`,
      },
      {
        slug: "0.7.5",
        label: "0.7.5",
        status: "archived" as const,
        pathPrefix: "/docs/0.7.5/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-rugix/0.7.5`,
      },
      {
        slug: "0.6",
        label: "0.6",
        status: "archived" as const,
        pathPrefix: "/docs/0.6/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-rugix/0.6`,
      },
    ];
    return {
      versions: versions.map((v) => {
        const auto = buildNav(all, {
          prefix: `${v.slug}/`,
          rootGroupTitle: "Overview",
        });
        /*
         * For the latest umbrella docs, surface the sibling Ctrl /
         * Bakery doc sets directly in the left rail so readers always
         * have a one-click path between them. Older versions skip it
         * — those archives don't have matching ctrl/bakery splits.
         */
        const nav =
          v.slug === "latest"
            ? [
                {
                  title: "Tool Docs",
                  links: [
                    { title: "Rugix Ctrl", href: "/docs/ctrl" },
                    { title: "Rugix Bakery", href: "/docs/bakery" },
                  ],
                },
                ...auto,
              ]
            : auto;
        return { ...v, nav };
      }),
    };
  },
);

/**
 * Rugix Ctrl docs at `/docs/ctrl/`. The released `1.1` line is the
 * default and lives at `/docs/ctrl/`; the rolling `next` branch lives at
 * `/docs/ctrl/next/`.
 */
export const getCtrlDocsConfig = memoizeDocsConfig(
  async (): Promise<DocsConfig> => {
    const all = await getCollection("docs-ctrl");
    const versions = [
      {
        slug: "1.1",
        label: "1.1",
        status: "current" as const,
        default: true,
        pathPrefix: "/docs/ctrl/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-ctrl/1.1`,
      },
      {
        slug: "next",
        label: "Next",
        status: "preview" as const,
        pathPrefix: "/docs/ctrl/next/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-ctrl/next`,
      },
    ];
    return {
      versions: versions.map((v) => {
        const auto = buildNav(all, {
          prefix: `${v.slug}/`,
          rootGroupTitle: "Rugix Ctrl",
        });
        return {
          ...v,
          nav: [
            {
              title: "Other Docs",
              links: [
                { title: "Overview", href: "/docs/getting-started", icon: "←" },
                { title: "Rugix Bakery", href: "/docs/bakery" },
              ],
            },
            ...auto,
          ],
        };
      }),
    };
  },
);

/**
 * Rugix Bakery docs at `/docs/bakery/`. Mirrors the Ctrl layout.
 */
export const getBakeryDocsConfig = memoizeDocsConfig(
  async (): Promise<DocsConfig> => {
    const all = await getCollection("docs-bakery");
    const versions = [
      {
        slug: "1.0",
        label: "1.0",
        status: "current" as const,
        default: true,
        pathPrefix: "/docs/bakery/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-bakery/1.0`,
      },
      {
        slug: "next",
        label: "Next",
        status: "preview" as const,
        pathPrefix: "/docs/bakery/next/",
        editBaseUrl: `${REPO_EDIT_BASE}/docs-bakery/next`,
      },
    ];
    return {
      versions: versions.map((v) => {
        const auto = buildNav(all, {
          prefix: `${v.slug}/`,
          rootGroupTitle: "Rugix Bakery",
        });
        return {
          ...v,
          nav: [
            {
              title: "Other Docs",
              links: [
                { title: "Overview", href: "/docs/getting-started", icon: "←" },
                { title: "Rugix Ctrl", href: "/docs/ctrl" },
              ],
            },
            ...auto,
          ],
        };
      }),
    };
  },
);
