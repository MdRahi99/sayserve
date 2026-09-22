"use client";

import { useState } from "react";

/**
 * A menu picture, or an honest placeholder.
 *
 * Pictures are served from Unsplash's CDN rather than stored in the repo: no
 * files to commit, no build step, and their servers do the resizing. The risk
 * is that a remote image can fail — so a failure falls back to the crossed
 * panel instead of the browser's broken-image icon, which looks like a bug.
 */
export function Photo({ url, alt, className = "" }: {
  url?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover bg-surface ${className}`}
      />
    );
  }

  return (
    <div className={`bg-surface ${className}`} role="img"
      aria-label={`Picture of ${alt} coming soon`}>
      <svg viewBox="0 0 100 100" className="w-full h-full text-line"
        preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
