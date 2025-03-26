import { I18nProviderClient } from "@/locales/client";

export default async function RootLayout(props: { params: Promise<{ locale: string }>, children: React.ReactNode }) {
  const params = await props.params;
  const { locale } = params;
  const { children } = props;
  
  return (
    <I18nProviderClient locale={locale}>
      {children}
    </I18nProviderClient>
  );
} 