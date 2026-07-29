import type { Metadata } from "next";
import { headers } from "next/headers";
import { CacheComponentsDynamicMarker } from "@/components/cache-components-dynamic-marker";
import { getAuthRedirectMetadata } from "@/lib/og/auth-redirect-metadata";
import { getRequestOrigin } from "@/lib/site-url";
import AuthenticationPageClient from "./authentication-page-client";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { next } = await searchParams;
  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders);
  const redirectMetadata = getAuthRedirectMetadata(next, origin);

  return redirectMetadata ?? {};
}

export default function AuthenticationPage() {
  return (
    <>
      <CacheComponentsDynamicMarker />
      <AuthenticationPageClient />
    </>
  );
}
