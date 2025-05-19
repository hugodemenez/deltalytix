'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/locales/client";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const t = useI18n();

  const shortcuts = [
    { key: '⌘ D', description: t('landing.navbar.dashboard') },
    { key: '⌘ B', description: t('dashboard.billing') },
    { key: '⌘ S', description: t('dashboard.data') },
    { key: '⌘ H', description: t('dashboard.support') },
    { key: '⌘ K', description: t('dashboard.keyboardShortcuts') },
    { key: '⇧ ⌘ Q', description: t('dashboard.logOut') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('dashboard.keyboardShortcuts')}</DialogTitle>
          <DialogDescription>
            {t('dashboard.keyboardShortcutsDescription') || 'Keyboard shortcuts to help you navigate faster.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">{shortcut.key}</span>
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 