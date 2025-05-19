interface Window {
  gtag: (
    command: 'consent',
    action: 'update' | 'default',
    settings: {
      [key: string]: 'granted' | 'denied'
    }
  ) => void;
  dataLayer: any[];
} 