import type { CollectionEntry } from "astro:content";

/**
 * Pulls a `Date` out of a Docusaurus-style filename prefix, e.g.
 * `2025-07-15-efficient-delta-updates`. Falls back to "now" if the file
 * doesn't follow the convention — only used for ported content where the
 * frontmatter doesn't carry an explicit `date`.
 */
export function dateFromId(id: string): Date {
  const m = id.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
}

/**
 * Resolves the public slug for a blog entry. Frontmatter `slug` wins when
 * present (Docusaurus convention); otherwise we fall back to the entry id
 * with the date prefix stripped.
 */
export function slugFromEntry(entry: CollectionEntry<"blog">): string {
  if (entry.data.slug) return entry.data.slug;
  return entry.id.replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/**
 * Converts a blog tag into the URL slug used by Docusaurus-style tag
 * archive pages, e.g. `embedded linux` becomes `embedded-linux`.
 */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Returns the public archive URL for a blog tag. */
export function tagHref(tag: string): string {
  return `/blog/tags/${tagSlug(tag)}`;
}

/**
 * The single hard-coded author for the ported rugix-docs blog. Keeps the
 * port self-contained without copying the upstream `authors.yml` file.
 */
export const KOEHLMA = {
  name: "Maximilian Köhl",
  href: "https://silitics.com",
  avatar: "/img/authors/koehlma.jpg",
};

/**
 * Returns the teaser markdown for a blog entry. Honours the Docusaurus
 * `<!-- truncate -->` convention: everything before the marker is the
 * teaser. The marker wins over `data.description` so authors can pick
 * a richer index excerpt than the meta-description string. Without a
 * marker we fall back to `data.description`, then the first paragraph
 * of the body.
 *
 * The returned string is *raw markdown*, not plain text — render it
 * through a markdown parser to surface links / emphasis / inline code.
 */
export function teaserFor(entry: {
  body?: string;
  data: { description?: string };
}): string | undefined {
  const body = entry.body ?? "";
  const cut = body.search(/<!--\s*truncate\s*-->/i);
  if (cut >= 0) {
    const raw = body.slice(0, cut).trim();
    if (raw) return raw;
  }
  if (entry.data.description) return entry.data.description;
  const firstBlank = body.match(/\n\s*\n/);
  const fallback = firstBlank?.index !== undefined ? body.slice(0, firstBlank.index) : body;
  return fallback.trim() || undefined;
}
