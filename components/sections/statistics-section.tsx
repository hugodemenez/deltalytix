import Statistics from "@/components/statistics";
import { StatisticsProps } from "@/lib/types";

export default function StatisticsSection({statistics}:{statistics:StatisticsProps}) {
    return (
        <section id="accomplishments" className="mb-10">
            <h2 className="text-2xl font-bold mb-4">Statistics</h2>
            <Statistics statistics={statistics} />
        </section>
    )
}