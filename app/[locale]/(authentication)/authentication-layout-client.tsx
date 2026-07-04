'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AuthenticationLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Handle hash-based OAuth errors
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.slice(1));

    if (hashParams.get('error')) {
      const errorDescription = hashParams.get('error_description');
      toast.error("Authentication Error", {
        description: errorDescription?.replace(/\+/g, ' ') || "An error occurred during authentication",
      });

      router.replace('/authentication');
    }

    // Handle query-param based auth errors (from callback route)
    const queryParams = new URLSearchParams(window.location.search);
    const authError = queryParams.get('auth_error');
    if (authError) {
      const errorDescription = queryParams.get('error_description');
      const messages: Record<string, string> = {
        exchange_failed: 'Session exchange failed. Please try again.',
        service_unavailable: 'Authentication service is temporarily unavailable. Please try again later.',
        verification_failed: 'Magic link verification failed. The link may have expired or already been used.',
        verification_error: 'An error occurred during verification. Please try again.',
        missing_params: 'Invalid authentication link. Please request a new magic link.',
        session_invalid: 'Your session is invalid or has expired. Please sign in again.',
        unexpected: 'An unexpected error occurred. Please try again.',
      };
      const message = messages[authError] || errorDescription || 'An authentication error occurred.';

      toast.error("Authentication Error", { description: message });

      // Clean URL by removing auth_error params without full page reload
      const cleanParams = new URLSearchParams(queryParams);
      cleanParams.delete('auth_error');
      cleanParams.delete('error_description');
      const cleanSearch = cleanParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      router.replace(cleanUrl);
    }
  }, [router, isClient]);

  return children;
}
