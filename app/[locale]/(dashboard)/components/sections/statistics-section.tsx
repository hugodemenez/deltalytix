'use client'
import AveragePositionTimeCard from "../statistics/average-position-time-card";
import CumulativePnlCard from "../statistics/cumulative-pnl-card";
import TradePerformanceCard from "../statistics/trade-performance-card";
import LongShortPerformanceCard from "../statistics/long-short-card";
import { useTradeStatistics } from "@/components/context/trades-data";

export default function StatisticsSection() {
    const { statistics } = useTradeStatistics()

    return (
        <section id="accomplishments" className="mb-10">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <LongShortPerformanceCard />
                <TradePerformanceCard
                    nbWin={statistics.nbWin}
                    nbLoss={statistics.nbLoss}
                    nbBe={statistics.nbBe}
                    nbTrades={statistics.nbTrades}
                />
                <AveragePositionTimeCard averagePositionTime={statistics.averagePositionTime} />
                <CumulativePnlCard cumulativePnl={statistics.cumulativePnl} cumulativeFees={statistics.cumulativeFees} />
            </div>
        </section>
    )
}