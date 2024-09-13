import { StatisticsProps } from "@/lib/types";
import AveragePositionTimeCard from "../statistics/average-position-time-card";
import CumulativePnlCard from "../statistics/cumulative-pnl-card";
import TradePerformanceCard from "../statistics/trade-performance-card";

export default function StatisticsSection({ statistics }: { statistics: StatisticsProps }) {
    return (
        <section id="accomplishments" className="mb-10">
            <div className="grid gap-4 lg:grid-cols-3">
                <AveragePositionTimeCard averagePositionTime={statistics.averagePositionTime} />
                <CumulativePnlCard cumulativePnl={statistics.cumulativePnl} cumulativeFees={statistics.cumulativeFees} />
                <TradePerformanceCard
                    nbWin={statistics.nbWin}
                    nbLoss={statistics.nbLoss}
                    nbBe={statistics.nbBe}
                    nbTrades={statistics.nbTrades}
                />
            </div>
        </section>
    )
}