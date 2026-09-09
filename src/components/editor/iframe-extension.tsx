"use client";

import { Node, mergeAttributes } from "@tiptap/core";

import { EMBED_HOSTS } from "@/components/editor/embed";

/**
 * Iframe node for editor embeds.
 *
 * Only allowlisted embed hosts can enter the document: the paste handler and
 * the HTML tab both pass through `embedAllowed`, so an arbitrary iframe never
 * reaches the stored markdown. The public sanitizer enforces the same list
 * server-side.
 */
export function embedAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (EMBED_HOSTS as readonly string[]).includes(parsed.hostname);
  } catch {
    return false;
  }
}

export const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,

  addOptions() {
    return {
      allowFullscreen: true,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
      },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "iframe[src]",
        getAttrs: (element) => {
          const src = element.getAttribute("src");
          if (typeof src === "string" && !embedAllowed(src)) return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      { class: "tng-embed", "data-embed": "" },
      [
        "iframe",
        mergeAttributes(HTMLAttributes, {
          loading: "lazy",
          // Keep third-party frames isolated from the admin origin.
          sandbox:
            "allow-scripts allow-same-origin allow-presentation allow-popups",
          allowfullscreen: "true",
        }),
      ],
    ];
  },

  addCommands() {
    return {
      insertEmbed:
        (src: string, title = "Media sematan") =>
        ({ commands }: { commands: { insertContent: (content: unknown) => boolean } }) => {
          if (!embedAllowed(src)) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { src, title },
          });
        },
    } as never;
  },
});
