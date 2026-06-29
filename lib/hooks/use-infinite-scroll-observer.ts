import { useEffect, useRef } from "react";

type UseInfiniteScrollObserverOptions = {
  enabled?: boolean;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void | Promise<void>;
  deps?: unknown[];
};

export function useInfiniteScrollObserver({
  enabled = true,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  deps = [],
}: UseInfiniteScrollObserverOptions) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !enabled || loading || loadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps lets callers refresh when list length changes
  }, [enabled, loading, loadingMore, hasMore, onLoadMore, ...deps]);

  return loadMoreRef;
}
