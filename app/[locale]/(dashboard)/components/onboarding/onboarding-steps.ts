type Side = "top" | "bottom" | "right" | "left" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "left-top" | "left-bottom" | "right-top" | "right-bottom";

const mainTour = {
  tour: "main",
  steps: [
    {
      icon: "📊",
      title: "Import Your Trades",
      content: "Start by clicking here to import your trading data",
      selector: "#import-data",
      side: "bottom" as Side,
      showControls: true,
      pointerPadding: 12,
      pointerRadius: 8,
      nextRoute: "/dashboard"
    },
    {
      icon: "🎯",
      title: "Customize Widgets",
      content: "Drag and resize widgets to create your perfect dashboard layout",
      selector: "#widget-canvas",
      side: "right" as Side,
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 8,
      nextRoute: "/dashboard"
    },
    {
      icon: "👋",
      title: "Welcome to the Dashboard",
      content: "This is your personalized trading dashboard where you can analyze your performance",
      selector: "#dashboard-welcome",
      side: "bottom" as Side,
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 8,
      nextRoute: "/dashboard"
    }
  ]
}

export const steps = [mainTour] 