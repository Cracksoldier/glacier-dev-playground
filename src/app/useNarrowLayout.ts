import { useEffect, useState } from "react";

export const NARROW_LAYOUT_QUERY = "(max-width: 767.98px)";

/**
 * Tracks the same 768px breakpoint already used decoratively across the
 * panel CSS modules, as a single source of truth for narrow-layout-aware
 * JS behavior (tab switching, focus-shortcut routing).
 */
export function useNarrowLayout(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => window.matchMedia(NARROW_LAYOUT_QUERY).matches,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(NARROW_LAYOUT_QUERY);
    function handleChange(event: MediaQueryListEvent) {
      setIsNarrow(event.matches);
    }

    mediaQueryList.addEventListener("change", handleChange);
    setIsNarrow(mediaQueryList.matches);
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  return isNarrow;
}
