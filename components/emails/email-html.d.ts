import "react";

/**
 * Ambient HTML attributes used by transactional email markup.
 * Outlook still relies on `bgcolor` on table cells and `border` on images;
 * keep those attributes in JSX without stripping them for CSS-only fallbacks.
 */
declare module "react" {
  interface TdHTMLAttributes<T> {
    bgcolor?: string | undefined;
  }

  interface TableHTMLAttributes<T> {
    bgcolor?: string | undefined;
  }

  interface ImgHTMLAttributes<T> {
    border?: number | string | undefined;
  }
}

export {};
