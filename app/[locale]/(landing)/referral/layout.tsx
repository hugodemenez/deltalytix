import type { ReactNode } from "react";
import { createPublicPageMetadata } from "@/lib/seo-urls";

export const generateMetadata = createPublicPageMetadata("/referral");

export default function ReferralLayout({ children }: { children: ReactNode }) {
  return children;
}
