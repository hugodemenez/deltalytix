import type { ReactNode } from "react";
import { createPublicPageMetadata } from "@/lib/seo-urls";

export const generateMetadata = createPublicPageMetadata("/terms");

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
