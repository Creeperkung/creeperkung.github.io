"use client";

import { useEffect } from "react";

/** Sets the page backdrop (--art, see globals.css) to `src` while mounted. Renders nothing. */
export function ArtBackdrop({ src }: { src?: string }) {
  useEffect(() => {
    if (!src) return;
    const root = document.documentElement;
    root.style.setProperty("--art", `url("${src}")`);
    return () => {
      root.style.removeProperty("--art");
    };
  }, [src]);
  return null;
}
