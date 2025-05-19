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
      content: "Add widgets to your dashboard by clicking here",
      selector: "#widget-canvas",
      side: "bottom" as Side,
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 8,
      nextRoute: "/dashboard"
    },
  ]
}

export const steps = [mainTour] 