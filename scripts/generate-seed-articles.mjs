/**
 * Generates supabase/seed_articles.sql from the authored demo content module.
 *
 * Run with: npm run seed:articles
 *
 * The demo module is the single source of truth for sample articles, so the SQL
 * seed and the no-credential dev fixtures cannot drift. Every generated row is
 * flagged `is_sample = true` and the public UI shows a visible SAMPLE patch.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * The demo modules only use type-only imports, so Node's built-in TypeScript
 * type stripping (Node 22.18+) can load them directly with no build step.
 */

const OUTPUT = path.join(process.cwd(), "supabase", "seed_articles.sql");

/** Escapes a value for a Postgres dollar-quoted string. */
function dollarQuote(value, tag) {
  if (value.includes(`$${tag}$`)) {
    throw new Error(`Demo content contains the dollar-quote tag $${tag}$.`);
  }
  return `$${tag}$${value}$${tag}$`;
}

function sqlArray(values) {
  if (values.length === 0) return "'{}'";
  const escaped = values.map((value) => `"${value.replace(/"/g, '\\"')}"`);
  return `'{${escaped.join(",")}}'`;
}

function main(articles) {
  const header = `-- ---------------------------------------------------------------------------
-- TNG Daily — seed_articles.sql (GENERATED, do not edit by hand)
--
-- Source: src/lib/data/demo/articles-part-one.ts and articles-part-two.ts
-- Regenerate: npm run seed:articles
--
-- Apply after supabase/seed.sql. Every row is flagged is_sample = true, and the
-- public UI renders a visible "Contoh" patch on sample articles.
-- ---------------------------------------------------------------------------

`;

  const blocks = articles.map((article) => {
    const publishedAt = `now() - interval '${article.publishedDaysAgo} days'`;
    const readingMinutes = Math.max(
      1,
      Math.round(article.markdown.split(/\s+/).filter(Boolean).length / 220),
    );
    const excerpt = article.markdown
      .replace(/[#>*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 179);

    const insert = `insert into public.articles (
  title, slug, dek, excerpt, content_markdown, cover_image_url, cover_image_alt, cover_image_credit, pillar, tags, status,
  author_name, published_at, seo_title, meta_description, primary_keyword,
  secondary_keywords, reading_minutes, is_sample, view_count, like_count,
  save_count, share_count
)
select
  ${dollarQuote(article.title, "t")},
  ${dollarQuote(article.slug, "s")},
  ${dollarQuote(article.dek, "d")},
  ${dollarQuote(`${excerpt}\u2026`, "e")},
  ${dollarQuote(article.markdown, "md")},
  ${article.coverImageUrl ? dollarQuote(article.coverImageUrl, "img") : "null"},
  ${article.coverImageAlt ? dollarQuote(article.coverImageAlt, "alt") : "null"},
  ${article.coverImageCredit ? dollarQuote(article.coverImageCredit, "crd") : "null"},
  '${article.pillar}'::tng_pillar,
  ${sqlArray(article.tags)},
  'published'::tng_article_status,
  ${dollarQuote(article.authorName, "a")},
  ${publishedAt},
  ${dollarQuote(article.seoTitle, "st")},
  ${dollarQuote(article.metaDescription, "mdesc")},
  ${dollarQuote(article.primaryKeyword, "pk")},
  ${sqlArray(article.secondaryKeywords)},
  ${readingMinutes},
  true,
  ${article.counts.view}, ${article.counts.like}, ${article.counts.save}, ${article.counts.share}
where not exists (
  select 1 from public.articles a where a.slug = ${dollarQuote(article.slug, "s2")}
);`;

    const sources = (article.sources ?? []).map(
      (source) => `insert into public.article_sources (
  article_id, source_name, source_url, attribution_text, source_type
)
select a.id,
  ${dollarQuote(source.sourceName, "sn")},
  ${dollarQuote(source.sourceUrl, "su")},
  ${dollarQuote(source.attributionText, "sa")},
  '${source.sourceType}'
from public.articles a
where a.slug = ${dollarQuote(article.slug, "s3")}
  and not exists (
    select 1 from public.article_sources s
     where s.article_id = a.id and s.source_url = ${dollarQuote(source.sourceUrl, "su2")}
  );`,
    );

    return [insert, ...sources].join("\n\n");
  });

  return `${header}${blocks.join("\n\n")}\n`;
}

const partOne = await import("../src/lib/data/demo/articles-part-one.ts");
const partTwo = await import("../src/lib/data/demo/articles-part-two.ts");

const articles = [
  ...partOne.DEMO_ARTICLES_PART_ONE,
  ...partTwo.DEMO_ARTICLES_PART_TWO,
];

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, main(articles), "utf8");

process.stdout.write(
  `Wrote ${articles.length} demo articles to supabase/seed_articles.sql\n`,
);
