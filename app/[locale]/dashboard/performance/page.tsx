import type { Metadata } from "next";
import { PerformanceCenterPage } from "../components/performance-center/performance-center-page";

export const metadata: Metadata = {
  title: "Performance Center",
  description: "Deep analytics — win rates, MAE/MFE, drawdown & period comparison",
};

export default function PerformancePage() {
  return <PerformanceCenterPage />;
}
