"use client";

import * as React from "react";
import { Send, CheckCircle2 } from "lucide-react";

import { TapePatch } from "@/components/shared/tape-patch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentItem {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  isLocalUser?: boolean;
}

interface ArticleCommentSectionProps {
  articleSlug: string;
  articleTitle: string;
  className?: string;
}

const DEFAULT_COMMENTS: Record<string, CommentItem[]> = {
  "umkm-laundry-naik-kelas": [
    {
      id: "c-sample-1",
      name: "Bambang Suherman",
      content:
        "Bagus banget artikelnya. Memang benar alur kerja di meja lipat itu bottleneck terbesar usaha laundry kiloan. Kami di Cipondoh juga baru sadar setelah catat waktu harian.",
      createdAt: "3 jam yang lalu",
    },
    {
      id: "c-sample-2",
      name: "Rina Wijaya",
      content:
        "Suka dengan transparansi advertorialnya. Ditulis informatif dan kasih insight bisnis nyata buat pelaku UMKM sekitar Tangerang.",
      createdAt: "Kemarin",
    },
  ],
  default: [
    {
      id: "c-default-1",
      name: "Dimas Anggara",
      content:
        "Menarik sekali pembahasannya. Tangerang memang butuh liputan yang lebih dekat dengan kenyataan lapangan seperti ini.",
      createdAt: "5 jam yang lalu",
    },
    {
      id: "c-default-2",
      name: "Siti Rahmawati",
      content:
        "Terima kasih atas liputannya. Semoga terus konsisten menyajikan cerita lokal yang jujur dan berimbang.",
      createdAt: "Kemarin",
    },
  ],
};

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("tng_comment_added", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("tng_comment_added", callback);
  };
}

export function ArticleCommentSection({
  articleSlug,
  articleTitle,
  className,
}: ArticleCommentSectionProps) {
  const [name, setName] = React.useState("");
  const [content, setContent] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState(false);
  const [errorNotice, setErrorNotice] = React.useState("");

  const storageKey = `tng_comments_${articleSlug}`;

  const storedRaw = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(storageKey) || "";
      } catch {
        return "";
      }
    },
    () => "",
  );

  const userComments: CommentItem[] = React.useMemo(() => {
    if (!storedRaw) return [];
    try {
      return JSON.parse(storedRaw) as CommentItem[];
    } catch {
      return [];
    }
  }, [storedRaw]);

  const defaultComments =
    DEFAULT_COMMENTS[articleSlug] ?? DEFAULT_COMMENTS.default ?? [];
  const allComments = [...userComments, ...defaultComments];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice("");

    const cleanName = name.trim();
    const cleanContent = content.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorNotice("Mohon isi nama kamu (minimal 2 karakter).");
      return;
    }
    if (!cleanContent || cleanContent.length < 3) {
      setErrorNotice("Mohon tulis komentar kamu (minimal 3 karakter).");
      return;
    }

    setIsSubmitting(true);

    const newComment: CommentItem = {
      id: `c-user-${Date.now()}`,
      name: cleanName,
      content: cleanContent,
      createdAt: "Baru saja",
      isLocalUser: true,
    };

    try {
      const updated = [newComment, ...userComments];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      window.dispatchEvent(new Event("tng_comment_added"));
    } catch {
      // Storage error ignored
    }

    setName("");
    setContent("");
    setIsSubmitting(false);
    setSuccessNotice(true);

    setTimeout(() => {
      setSuccessNotice(false);
    }, 4000);
  };

  return (
    <section
      aria-labelledby="comment-section-heading"
      className={cn("my-10 border-t-2 border-line pt-8", className)}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div>
          <div className="flex items-center gap-2">
            <TapePatch tone="lime" tilt="left" size="sm">
              RESPON & KOMENTAR
            </TapePatch>
            <span className="font-display text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
              {allComments.length} Komentar
            </span>
          </div>
          <h2
            id="comment-section-heading"
            className="tng-display mt-2 text-2xl text-foreground sm:text-3xl"
          >
            KOLOM KOMENTAR
          </h2>
        </div>

        <span className="text-[0.6875rem] text-muted">
          Etika redaksi: Komentar dimoderasi demi diskusi yang sehat dan bebas ujaran kebencian.
        </span>
      </div>

      {/* Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="border-2 border-keyline bg-surface p-4 text-foreground shadow-[var(--shadow-hard-sm)] sm:p-6"
      >
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Tulis Tanggapan Kamu
        </h3>
        <p className="mt-1 text-xs text-muted">
          Menanggapi naskah: &ldquo;{articleTitle}&rdquo;
        </p>

        {errorNotice ? (
          <div className="mt-3 border-2 border-danger bg-danger/10 p-2.5 text-xs font-medium text-danger">
            {errorNotice}
          </div>
        ) : null}

        {successNotice ? (
          <div className="mt-3 flex items-center gap-2 border-2 border-ok bg-ok/10 p-2.5 text-xs font-medium text-ok">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Komentar kamu berhasil dikirim dan ditayangkan!</span>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          <div>
            <label
              htmlFor="commenter-name"
              className="block font-display text-[0.6875rem] font-bold uppercase tracking-wider text-muted"
            >
              Nama / Nama Pena <span className="text-lime">*</span>
            </label>
            <input
              id="commenter-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rian Pratama"
              className="mt-1 w-full border-2 border-line bg-surface-strong px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted/60 focus:border-lime focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="commenter-content"
              className="block font-display text-[0.6875rem] font-bold uppercase tracking-wider text-muted"
            >
              Komentar atau Tanggapan <span className="text-lime">*</span>
            </label>
            <textarea
              id="commenter-content"
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis tanggapan, opini, atau cerita tambahan kamu di sini..."
              className="mt-1 w-full border-2 border-line bg-surface-strong px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted/60 focus:border-lime focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[0.6875rem] text-muted">
              Dengan mengirim, kamu menyetujui pedoman komunitas TNG Daily.
            </span>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="gap-2"
            >
              <Send className="size-3.5" />
              <span>{isSubmitting ? "Mengirim..." : "Kirim Komentar"}</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="mt-6 space-y-3">
        {allComments.map((item) => (
          <article
            key={item.id}
            className={cn(
              "border-2 border-line bg-surface p-4 transition-colors",
              item.isLocalUser && "border-lime/60 bg-surface-strong",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center border border-keyline bg-ink text-lime font-display text-xs font-black">
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                    {item.name}
                  </span>
                  {item.isLocalUser ? (
                    <span className="ml-2 inline-flex items-center border border-lime/80 bg-lime/15 px-1 py-0.2 font-display text-[0.5rem] font-extrabold uppercase tracking-wider text-lime">
                      Komentar Kamu
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center border border-line px-1 py-0.2 font-display text-[0.5rem] font-bold uppercase tracking-wider text-muted">
                      Warga
                    </span>
                  )}
                </div>
              </div>

              <time className="text-[0.6875rem] text-muted">
                {item.createdAt}
              </time>
            </div>

            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-foreground/90">
              {item.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
