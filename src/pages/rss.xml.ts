import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

import { brand } from "../site.ts";
import { dateFromId, slugFromEntry } from "../lib/blog.ts";

export const GET = async (ctx: { site?: URL }) => {
  const posts = await getCollection("blog");
  const items = posts
    .filter((p) => !p.data.draft)
    .map((post) => {
      const date = post.data.date ?? dateFromId(post.id);
      return {
        title: post.data.title ?? slugFromEntry(post),
        description: post.data.description,
        link: `/blog/${slugFromEntry(post)}`,
        pubDate: date,
      };
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  return rss({
    title: `${brand.name} Blog`,
    description: brand.tagline ?? "Rugix updates",
    site: ctx.site?.toString() ?? "https://rugix.example",
    items,
  });
};
