import { useCallback, useEffect, useState } from "react";

/** Minimal History-API router — the app has exactly two routes: `/` and `/c/:id`. */
export function useRouter() {
  const [path, setPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, "", to);
    setPath(to);
  }, []);

  return { path, navigate };
}

export function chatIdFromPath(path: string): string | null {
  const m = path.match(/^\/c\/([A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}
