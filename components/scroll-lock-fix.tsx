"use client";

import { useEffect } from "react";

/**
 * Prevents Radix UI Dialog from adding padding-right to body
 * Since we use scrollbar-gutter: stable, we don't need the padding
 */
export function ScrollLockFix() {
  useEffect(() => {
    // Function to remove padding-right and margin-right from body and html
    const removePadding = () => {
      const body = document.body;
      const html = document.documentElement;

      // Check both body and html
      [body, html].forEach((element) => {
        const computedPaddingRight = window.getComputedStyle(element).paddingRight;
        const computedMarginRight = window.getComputedStyle(element).marginRight;
        
        // Always set padding-right to 0 with !important to override CSS
        if (computedPaddingRight !== "0px" && computedPaddingRight !== "0") {
          element.style.setProperty('padding-right', '0', 'important');
        } else {
          element.style.setProperty('padding-right', '0', 'important');
        }
        
        // Always set margin-right to 0 with !important to override CSS
        if (computedMarginRight !== "0px" && computedMarginRight !== "0") {
          element.style.setProperty('margin-right', '0', 'important');
        } else {
          // Always set it even if it's already 0, to prevent it from being set later
          element.style.setProperty('margin-right', '0', 'important');
        }
      });
    };

    // Remove padding immediately
    removePadding();

    // Watch for changes to body and html styles (Radix UI adds padding via inline styles)
    const observer = new MutationObserver(() => {
      removePadding();
    });

    // Observe both body and html for style attribute changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Also check periodically (fallback)
    const interval = setInterval(removePadding, 50);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null;
}
