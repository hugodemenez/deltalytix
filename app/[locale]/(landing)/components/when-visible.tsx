"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";

type WhenVisibleProps = {
  children: ReactNode;
  fallback: ReactNode;
  /** How far before the section enters the viewport to start loading. */
  rootMargin?: string;
};

/**
 * Mounts heavy below-fold landing sections only when near the viewport.
 * Prevents Features/Pricing (recharts, stripe) from competing with LCP/TBT.
 */
export default function WhenVisible({
  children,
  fallback,
  rootMargin = "120px 0px",
}: WhenVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const reveal = useEffectEvent(() => {
    setVisible(true);
  });

  useEffect(() => {
    if (visible) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return <div ref={ref}>{visible ? children : fallback}</div>;
}
