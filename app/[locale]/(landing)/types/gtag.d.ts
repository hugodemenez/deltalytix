type GtagConsentValue = 'granted' | 'denied';

interface Window {
  // Overloads keep the consent calls type-checked while still allowing the
  // initialisation commands the Google tag loader needs.
  gtag?: {
    (
      command: 'consent',
      action: 'default' | 'update',
      settings: Record<string, GtagConsentValue>,
    ): void;
    (command: 'js', date: Date): void;
    (command: 'config', targetId: string, config?: Record<string, unknown>): void;
    (command: 'event', eventName: string, params?: Record<string, unknown>): void;
  };
  // Present only once the tag (or its queue stub) has initialised it.
  dataLayer?: unknown[];
}
