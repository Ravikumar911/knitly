"use client";

import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { ASSISTANT_PATH_EVENT } from "./assistant-url";

/**
 * `usePathname()` plus updates when the chat uses `history.replaceState` to
 * move from `/assistant` to `/assistant/:id` without a Next.js navigation.
 */
export function useResolvedPathname() {
  const nextPath = usePathname();
  const subscribe = useCallback((onChange: () => void) => {
    const handle = () => onChange();
    window.addEventListener("popstate", handle);
    window.addEventListener(ASSISTANT_PATH_EVENT, handle);
    return () => {
      window.removeEventListener("popstate", handle);
      window.removeEventListener(ASSISTANT_PATH_EVENT, handle);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? window.location.pathname : nextPath),
    () => nextPath,
  );
}
