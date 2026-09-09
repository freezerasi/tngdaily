/**
 * URL paste -> embed resolver for the article editor.
 *
 * Runs in the browser only. Recognised providers produce a privacy-friendly
 * embed (lazy iframe, no tracking scripts). The public render pipeline
 * sanitises these against the same allowlist, so a crafted URL cannot smuggle
 * an arbitrary iframe past the editor.
 */

export interface Embed {
  html: string;
  label: string;
}

const YOUTUBE_RE =
  /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i;
const INSTAGRAM_RE =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel|tv)\/([\w-]+)/i;
const TWITTER_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([\w]+)\/status\/(\d+)/i;
const TIKTOK_RE =
  /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i;
const VIMEO_RE = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i;
const SPOTIFY_RE =
  /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode|show)\/([\w]+)/i;

export const IMAGE_URL_RE =
  /^https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?\S*)?$/i;

/** Domains allowed to appear in an iframe src, both in the editor and in the
 * public sanitizer: the editor can only create what the renderer accepts. */
export const EMBED_HOSTS = [
  "www.youtube-nocookie.com",
  "www.instagram.com",
  "platform.twitter.com",
  "www.tiktok.com",
  "player.vimeo.com",
  "open.spotify.com",
] as const;

function youtubeEmbed(id: string): Embed {
  return {
    html: `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video YouTube" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`,
    label: "Video YouTube",
  };
}

function instagramEmbed(kind: string, id: string): Embed {
  return {
    html: `<iframe src="https://www.instagram.com/${kind}/${id}/embed" title="Postingan Instagram" width="400" height="500" frameborder="0" scrolling="no" allowfullscreen loading="lazy"></iframe>`,
    label: "Postingan Instagram",
  };
}

function twitterEmbed(user: string, id: string): Embed {
  return {
    html: `<iframe src="https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light" title="Tweet dari @${user}" width="550" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>`,
    label: `Tweet dari @${user}`,
  };
}

function tiktokEmbed(user: string, id: string): Embed {
  return {
    html: `<iframe src="https://www.tiktok.com/embed/v2/${id}" title="Video TikTok dari @${user}" width="325" height="600" frameborder="0" allowfullscreen loading="lazy"></iframe>`,
    label: "Video TikTok",
  };
}

function vimeoEmbed(id: string): Embed {
  return {
    html: `<iframe src="https://player.vimeo.com/video/${id}" title="Video Vimeo" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`,
    label: "Video Vimeo",
  };
}

function spotifyEmbed(kind: string, id: string): Embed {
  return {
    html: `<iframe src="https://open.spotify.com/embed/${kind}/${id}" title="Spotify" width="100%" height="232" frameborder="0" allow="encrypted-media" loading="lazy"></iframe>`,
    label: "Spotify",
  };
}

function imageEmbed(url: string): Embed {
  return {
    html: `<img src="${url}" alt="Gambar dari URL" loading="lazy" decoding="async">`,
    label: "Gambar",
  };
}

/**
 * Returns an embed when the pasted text is a bare URL we can render
 * automatically, otherwise null. A bare URL means the whole clipboard payload
 * is exactly one URL with no surrounding prose.
 */
export function embedsFromUrl(text: string): Embed | null {
  const trimmed = text.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;

  const yt = YOUTUBE_RE.exec(trimmed);
  if (yt?.[1]) return youtubeEmbed(yt[1]);

  const ig = INSTAGRAM_RE.exec(trimmed);
  if (ig?.[1] && ig[2]) return instagramEmbed(ig[1], ig[2]);

  const tw = TWITTER_RE.exec(trimmed);
  if (tw?.[1] && tw[2]) return twitterEmbed(tw[1], tw[2]);

  const tt = TIKTOK_RE.exec(trimmed);
  if (tt?.[1] && tt[2]) return tiktokEmbed(tt[1], tt[2]);

  const vm = VIMEO_RE.exec(trimmed);
  if (vm?.[1]) return vimeoEmbed(vm[1]);

  const sp = SPOTIFY_RE.exec(trimmed);
  if (sp?.[1] && sp[2]) return spotifyEmbed(sp[1], sp[2]);

  if (IMAGE_URL_RE.test(trimmed)) return imageEmbed(trimmed);

  return null;
}
