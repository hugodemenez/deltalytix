import Statistics from "@/components/statistics";
import { StatisticsProps } from "@/lib/types";

export default function StatisticsSection({statistics}:{statistics:StatisticsProps}) {
    return (
        <section id="accomplishments" className="mb-10">
            <Statistics statistics={statistics} />
        </section>
    )
}