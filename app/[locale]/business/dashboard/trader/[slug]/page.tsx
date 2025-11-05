import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import WidgetCanvas from "@/app/[locale]/dashboard/components/widget-canvas";
import { Toaster } from "@/components/ui/sonner";
import { BusinessManagement } from "../../../components/business-management";
import { getTraderById } from "../../../actions/user";

export default async function TraderDashboard(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  const {
    slug
  } = params;

  // GET TRADER INFO (email)
const traderInfoResponse = await getTraderById(slug);

  return (
      <ThemeProvider>
          <BusinessManagement />
          <DataProvider adminView={{ userId: slug }}>
            Trader Dashboard {traderInfoResponse?.email}
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