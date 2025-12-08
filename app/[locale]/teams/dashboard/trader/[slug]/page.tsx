import { DataProvider } from "@/context/data-provider";
import WidgetCanvas from "@/app/[locale]/dashboard/components/widget-canvas";
import { Toaster } from "@/components/ui/sonner";
import { TraderInfo } from "../../../components/trader-info";
import { Suspense } from "react";
import { SharedWidgetCanvas } from "@/app/[locale]/shared/[slug]/shared-widget-canvas";

export default async function TraderDashboard(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  const {
    slug
  } = params;

  return (
    <DataProvider adminView={{ userId: slug }}>
      <Suspense fallback={<div>Loading trader info...</div>}>
      <TraderInfo slug={slug}/>
      </Suspense>
      <div className="min-h-screen flex flex-col bg-background">
        <Toaster />
        <div className="flex-1">
          <SharedWidgetCanvas />
        </div>
      </div>
    </DataProvider>
  );
}