import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { articleSchema } from "@silitics/astro-theme/content";

/*
 * Astro's default `generateId` slugifies path segments — which strips
 * dots, so `0.8.14/foo` collapses to `0814/foo` and breaks our
 * version-prefix-based filtering. We reuse the segment names as-is
 * (relative path, sans extension, sans `/index`) so IDs round-trip
 * cleanly to URLs.
 */
const preservePathId = ({ entry }: { entry: string }) =>
  entry.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");

/*
 * Rugix's docs frontmatter is a strict subset of `docsSchema`, but the
 * source files often omit `title` (the rendered `# Heading` is the
 * title in Docusaurus). We relax the schema so files without explicit
 * frontmatter titles still load — `buildNav` falls back to the
 * directory segment when `title` is missing.
 */
const portedDocsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  draft: z.boolean().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/*
 * Likewise, the ported blog posts use Docusaurus frontmatter
 * (`authors: koehlma`) which doesn't fit the strict `articleSchema`
 * shape. We coerce: `authors` is accepted as a string or array and the
 * filename's date prefix is honored when no explicit `date` exists.
 */
const portedBlogSchema = articleSchema().extend({
  author: z.string().optional(),
  authors: z
    .union([z.string(), z.array(z.string())])
    .optional(),
  slug: z.string().optional(),
  date: z.coerce.date().optional(),
});

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/blog",
    generateId: preservePathId,
  }),
  schema: portedBlogSchema,
});

const docsRugix = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/docs-rugix",
    generateId: preservePathId,
  }),
  schema: portedDocsSchema,
});

const docsCtrl = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/docs-ctrl",
    generateId: preservePathId,
  }),
  schema: portedDocsSchema,
});

const docsBakery = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/docs-bakery",
    generateId: preservePathId,
  }),
  schema: portedDocsSchema,
});

const docsAdmin = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/docs-admin",
    generateId: preservePathId,
  }),
  schema: portedDocsSchema,
});

export const collections = {
  blog,
  "docs-rugix": docsRugix,
  "docs-ctrl": docsCtrl,
  "docs-bakery": docsBakery,
  "docs-admin": docsAdmin,
};
