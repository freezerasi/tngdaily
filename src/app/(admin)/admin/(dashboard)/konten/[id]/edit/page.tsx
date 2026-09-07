import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleEditor } from "@/components/admin/article-editor";
import { TapePatch } from "@/components/shared/tape-patch";
import { displayNameOf, requireRole } from "@/lib/auth";
import { getArticleForAdmin } from "@/lib/data/admin";
import { formatFeedTime } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Edit artikel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await requireRole("editor", {
    returnTo: `/admin/konten/${id}/edit`,
  });

  const { data: article } = await getArticleForAdmin(id);
  if (!article) notFound();

  return (
    <div className="grid gap-3">
      <header>
        <TapePatch tone="bone" tilt="left">
          Edit
        </TapePatch>
        <h1 className="tng-display mt-2 text-[1.75rem] leading-[0.94] sm:text-[2.25rem]">
          {article.title}
        </h1>
        <p className="mt-1 text-[0.8125rem] text-muted">
          Dibuat {formatFeedTime(article.createdAt)} · diperbarui{" "}
          {formatFeedTime(article.updatedAt)}
        </p>
      </header>

      <ArticleEditor
        article={article}
        authorName={displayNameOf(auth.profile)}
        canDelete={auth.profile.role === "owner"}
      />
    </div>
  );
}
