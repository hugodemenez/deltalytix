import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import { Toaster } from "@/components/ui/toaster";
import WidgetCanvas from "@/app/[locale]/dashboard/components/widget-canvas";
import Navbar from "@/app/[locale]/dashboard/components/navbar";

export default async function AdminDashboardPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  const {
    slug
  } = params;

  return (
      <ThemeProvider>
          <DataProvider adminView={{ userId: slug }}>
            <div className="min-h-screen flex flex-col bg-background">
              <Toaster />
              <div className="flex-1">
                <WidgetCanvas />
              </div>
            </div>
          </DataProvider>
      </ThemeProvider>
  );
}