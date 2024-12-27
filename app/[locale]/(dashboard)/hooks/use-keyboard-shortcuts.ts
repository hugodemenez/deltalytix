import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';
import { useRouter } from 'next/navigation';
import { signOut } from '@/server/auth';

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    // Navigation shortcuts
    hotkeys('⌘+d, ctrl+d', (event) => {
      event.preventDefault();
      router.push('/dashboard');
    });

    hotkeys('⌘+b, ctrl+b', (event) => {
      event.preventDefault();
      window.location.href = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL || '';
    });

    hotkeys('⌘+s, ctrl+s', (event) => {
      event.preventDefault();
      router.push('/dashboard/data');
    });

    // Support shortcut
    hotkeys('⌘+h, ctrl+h', (event) => {
      event.preventDefault();
      router.push('/support');
    });

    // Keyboard shortcuts dialog
    hotkeys('⌘+k, ctrl+k', (event) => {
      event.preventDefault();
      // TODO: Implement keyboard shortcuts dialog
    });

    // Logout shortcut
    hotkeys('⇧+⌘+q, shift+ctrl+q', (event) => {
      event.preventDefault();
      signOut();
    });

    return () => {
      // Cleanup shortcuts when component unmounts
      hotkeys.unbind('⌘+d, ctrl+d');
      hotkeys.unbind('⌘+b, ctrl+b');
      hotkeys.unbind('⌘+s, ctrl+s');
      hotkeys.unbind('⌘+h, ctrl+h');
      hotkeys.unbind('⌘+k, ctrl+k');
      hotkeys.unbind('⇧+⌘+q, shift+ctrl+q');
    };
  }, [router]);
} 