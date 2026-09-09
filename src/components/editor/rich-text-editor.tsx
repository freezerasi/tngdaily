"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import TurndownService from "turndown";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { embedsFromUrl } from "@/components/editor/embed";
import { Iframe } from "@/components/editor/iframe-extension";

/**
 * WYSIWYG article editor.
 *
 * The stored format stays Markdown: HTML from the editor is converted back to
 * Markdown on change, so the public render pipeline and the database schema
 * are untouched. Embeds are preserved as their source URL in a paragraph
 * link plus an iframe that the sanitizer re-creates on render.
 */

const EDITOR_SURFACE_CLASSES = [
  "tng-wysiwyg",
  "min-h-[22rem]",
  "w-full",
  "overflow-y-auto",
  "border-2",
  "border-line",
  "bg-wall-deep",
  "px-3",
  "py-3",
  "text-[0.9375rem]",
  "leading-relaxed",
  "text-foreground",
  "outline-none",
  "transition-colors",
  "hover:border-muted/60",
  "focus:border-lime",
].join(" ");

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Embeds survive the Markdown round trip as bare iframes: turndown keeps them
// in the HTML... instead it would drop them, so we teach it to emit the iframe
// HTML as an inline block. `keep` retains the node as HTML.
turndown.keep(["iframe"]);

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

/** Markdown -> editor-safe HTML. Mirrors the public allowlist plus embeds. */
function markdownToEditorHtml(markdown: string): string {
  if (!markdown) return "";
  const parsed = marked.parse(markdown, { async: false });
  return sanitizeHtml(parsed, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "iframe",
      "figure",
      "figcaption",
      "u",
      "mark",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "del",
      "ins",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      iframe: [
        "src",
        "title",
        "width",
        "height",
        "frameborder",
        "allow",
        "allowfullscreen",
        "loading",
        "scrolling",
        "allowtransparency",
      ],
      img: ["src", "alt", "title", "loading", "decoding", "width", "height"],
      a: ["href", "title", "target", "rel"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) =>
      frame.tag === "iframe" &&
      typeof frame.attribs?.src === "string" &&
      !isEmbedSrc(frame.attribs.src),
  });
}

function isEmbedSrc(src: string): boolean {
  try {
    const { host } = new URL(src);
    return [
      "www.youtube-nocookie.com",
      "www.instagram.com",
      "platform.twitter.com",
      "www.tiktok.com",
      "player.vimeo.com",
      "open.spotify.com",
    ].includes(host);
  } catch {
    return false;
  }
}

export function RichTextEditor({
  value,
  onChange,
  id = "content-markdown",
  label = "Isi artikel",
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  label?: string;
  hint?: string;
}) {
  const [mode, setMode] = React.useState<"visual" | "html">("visual");
  const [htmlDraft, setHtmlDraft] = React.useState("");
  const [wordCount, setWordCount] = React.useState(0);

  // Guards the echo loop: the editor only emits on user edits, and the parent
  // only pushes in when the value was changed from outside.
  const lastEmitted = React.useRef(value);

  const emitMarkdown = (editorHtml: string) => {
    const markdown = htmlToMarkdown(editorHtml);
    lastEmitted.current = markdown;
    onChange(markdown);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The public page owns the only h1; the editor offers H2-H4.
        heading: { levels: [2, 3, 4] },
        // Underline ships inside StarterKit v3; do not add it again.
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: null, target: null },
        },
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Iframe,
    ],
    content: markdownToEditorHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        class: EDITOR_SURFACE_CLASSES,
        spellcheck: "true",
      },
      handlePaste: (view, event) => {
        const pasted = event.clipboardData?.getData("text/plain") ?? "";
        const embed = embedsFromUrl(pasted);
        if (!embed) return false;

        event.preventDefault();
        const srcMatch = /src="([^"]+)"/.exec(embed.html);
        const titleMatch = /title="([^"]+)"/.exec(embed.html);
        if (!srcMatch?.[1]) return false;

        const instance = (
          view as unknown as {
            editor?: {
              chain: () => {
                focus: () => {
                  insertContent: (content: unknown) => { run: () => boolean };
                };
              };
            };
          }
        ).editor;
        if (!instance) return false;

        // Images paste as image nodes; everything else is an embed iframe.
        if (embed.label === "Gambar") {
          instance.chain().focus().insertContent({
            type: "image",
            attrs: { src: srcMatch[1], alt: embed.label },
          }).run();
          return true;
        }

        // Node JSON, not an HTML string: HTML parsing drops iframes with
        // unusual attribute sets, while the node form inserts reliably.
        instance
          .chain()
          .focus()
          .insertContent({
            type: "iframe",
            attrs: {
              src: srcMatch[1],
              title: titleMatch?.[1] ?? embed.label,
            },
          })
          .run();
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      emitMarkdown(instance.getHTML());
      const text = instance.getText();
      setWordCount(text.split(/\s+/).filter(Boolean).length);
    },
  });

  // Push outside changes (different article loaded, form reset) into the
  // editor without triggering an update cycle.
  React.useEffect(() => {
    if (!editor || mode !== "visual") return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(markdownToEditorHtml(value), {
      emitUpdate: false,
    });
    setWordCount(
      editor.getText().split(/\s+/).filter(Boolean).length,
    );
  }, [value, editor, mode]);

  const switchToHtml = () => {
    if (editor) setHtmlDraft(editor.getHTML());
    setMode("html");
  };

  const applyHtmlDraft = () => {
    if (!editor) return;
    const markdown = htmlDraft ? htmlToMarkdown(htmlDraft) : "";
    lastEmitted.current = markdown;
    editor.commands.setContent(htmlDraft || "<p></p>", {
      emitUpdate: false,
    });
    onChange(markdown);
    setWordCount(
      editor.getText().split(/\s+/).filter(Boolean).length,
    );
    setMode("visual");
  };

  if (!editor) {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div
          className={cn(EDITOR_SURFACE_CLASSES, "animate-pulse")}
          aria-busy="true"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="tng-label text-muted tabular-nums">
          {wordCount} kata
        </span>
      </div>

      {mode === "visual" ? (
        <>
          <EditorToolbar editor={editor} onHtmlMode={switchToHtml} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <div className="grid gap-1.5">
          <div
            role="toolbar"
            aria-label="Mode HTML"
            className="flex flex-wrap items-center gap-1.5 border-2 border-line border-b-0 bg-surface-strong p-1.5"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("visual")}
            >
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={applyHtmlDraft}>
              Terapkan HTML
            </Button>
          </div>
          <textarea
            id={`${id}-html`}
            rows={22}
            value={htmlDraft}
            onChange={(event) => setHtmlDraft(event.target.value)}
            spellCheck={false}
            className={cn(
              "w-full resize-y border-2 border-line bg-wall-deep px-3 py-3",
              "font-mono text-[0.8125rem] leading-relaxed text-foreground",
              "outline-none transition-colors hover:border-muted/60 focus:border-lime",
            )}
          />
          <p className="text-[0.75rem] text-muted">
            Edit HTML mentah untuk kontrol penuh. Iframe hanya diterima dari
            penyedia embed yang terdaftar; tag lain akan dibersihkan saat
            artikel dirender publik.
          </p>
        </div>
      )}

      <p className="text-[0.8125rem] leading-snug text-muted">
        {hint ??
          "Format tampil langsung saat menulis. Tempel URL YouTube, Instagram, Twitter/X, TikTok, Spotify, atau URL gambar dan otomatis menjadi embed. Hindari em dash dan emoji. Tandai data yang belum pasti dengan [BUTUH VERIFIKASI: ...]."}
      </p>
    </div>
  );
}

type EditorLike = ReturnType<typeof useEditor> extends infer T
  ? NonNullable<T>
  : never;

function EditorToolbar({
  editor,
  onHtmlMode,
}: {
  editor: EditorLike;
  onHtmlMode: () => void;
}) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      setLinkOpen(false);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
    setLinkUrl("");
    setLinkOpen(false);
  };

  return (
    <div
      role="toolbar"
      aria-label="Format artikel"
      className="flex flex-wrap items-center gap-1.5 border-2 border-line border-b-0 bg-surface-strong p-1.5"
    >
      <ToolbarButton
        label="Tebal (Ctrl+B)"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Miring (Ctrl+I)"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Garis bawah (Ctrl+U)"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Coret"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough aria-hidden="true" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Subjudul H2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Subjudul H3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Subjudul H4"
        active={editor.isActive("heading", { level: 4 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
      >
        <Heading4 aria-hidden="true" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Daftar poin"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Daftar bernomor"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Kutipan"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Baris kode"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Blok kode"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Garis pemisah"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus aria-hidden="true" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Tautan"
        active={editor.isActive("link")}
        onClick={() => setLinkOpen((open) => !open)}
      >
        <Link2 aria-hidden="true" />
      </ToolbarButton>
      {editor.isActive("link") ? (
        <ToolbarButton
          label="Hapus tautan"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Link2Off aria-hidden="true" />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        label="Sisipkan tabel"
        active={editor.isActive("table")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon aria-hidden="true" />
      </ToolbarButton>

      {editor.isActive("table") ? (
        <ToolbarButton
          label="Hapus tabel"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 aria-hidden="true" />
        </ToolbarButton>
      ) : null}
      <ToolbarDivider />
      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 aria-hidden="true" />
      </ToolbarButton>

      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={onHtmlMode}
      >
        Mode HTML
      </Button>

      {linkOpen ? (
        <div className="flex w-full items-center gap-1.5 pt-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://contoh.com"
            aria-label="URL tautan"
            className="flex-1 border-2 border-line bg-wall px-2 py-1.5 text-[0.8125rem] outline-none focus:border-lime"
          />
          <Button variant="primary" size="sm" onClick={applyLink}>
            Tautkan
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[2px] border-2 transition-colors",
        active
          ? "border-keyline bg-surface-strong text-foreground"
          : "border-line bg-surface text-muted hover:border-keyline hover:text-foreground",
        "[&_svg]:size-4",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-0.5 h-6 w-px shrink-0 bg-line"
    />
  );
}
