import type { ReactNode } from "react";
import { createPublicPageMetadata } from "@/lib/seo-urls";

export const generateMetadata = createPublicPageMetadata("/disclaimers");

export default function DisclaimersLayout({ children }: { children: ReactNode }) {
  return children;
}
