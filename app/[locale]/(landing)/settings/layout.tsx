import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo-urls";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
