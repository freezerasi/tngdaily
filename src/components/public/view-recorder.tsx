"use client";

import * as React from "react";

/**
 * ViewRecorder. Fires the view beacon exactly once per mount and renders
 * nothing.
 *
 * A static article page never executes on a cache hit, so the server cannot
 * count views during render. This component counts them from the browser
 * instead, after paint, with `keepalive` so a quick bounce still registers.
 * A failed beacon is swallowed silently: analytics must never surface as UI.
 */
export function ViewRecorder({ articleId }: { articleId: string }) {
  const sentRef = React.useRef(false);

  React.useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    void fetch("/api/articles/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
      keepalive: true,
    }).catch(() => {
      // Analytics failure is not the reader's problem.
    });
  }, [articleId]);

  return null;
}
