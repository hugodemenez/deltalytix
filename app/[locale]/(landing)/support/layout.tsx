import type { ReactNode } from "react";
import { createPublicPageMetadata } from "@/lib/seo-urls";

export const generateMetadata = createPublicPageMetadata("/support");

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
