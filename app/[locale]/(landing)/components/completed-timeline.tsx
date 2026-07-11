import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  completedDate: string;
  status: "completed" | "in-progress" | "upcoming";
  image?: string;
  youtubeVideoId?: string;
}

export default function CompletedTimeline({
  milestones,
  locale,
}: {
  milestones: TimelineItem[];
  locale: string;
}) {
  const dateLocale = locale === "fr" ? fr : enUS;
  const dateFormat = locale === "fr" ? "d MMMM yyyy" : "MMMM d, yyyy";

  // Filter and sort completed milestones by completedDate, most recent first
  const completedMilestones = milestones
    .filter(
      (milestone) =>
        milestone.status === "completed" && milestone.completedDate,
    )
    .sort(
      (a, b) =>
        new Date(b.completedDate).getTime() -
        new Date(a.completedDate).getTime(),
    );

  return (
    <div>
      {completedMilestones.map((milestone, index) => (
        <article
          key={milestone.id}
          className="border-b border-black/10 dark:border-white/10"
        >
          <Link
            href={`/${locale}/updates/${milestone.id}`}
            className={`group grid gap-6 pt-10 outline-hidden md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] md:pt-14 ${
              (locale === "fr" && milestone.youtubeVideoId) ||
              (milestone.image && !milestone.youtubeVideoId)
                ? "pb-8"
                : "pb-10 md:pb-14"
            }`}
          >
            <div className="flex items-start justify-between gap-4 md:block">
              <time
                dateTime={milestone.completedDate}
                className="text-sm text-black/50 dark:text-white/50"
              >
                {format(new Date(milestone.completedDate), dateFormat, {
                  locale: dateLocale,
                })}
              </time>
              <span className="text-sm text-black/35 dark:text-white/35 md:mt-3 md:block">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-start justify-between gap-6">
              <div className="max-w-3xl">
                <h3 className="text-2xl font-normal leading-tight tracking-[-0.03em] transition-opacity group-hover:opacity-60 sm:text-3xl">
                  {milestone.title}
                </h3>
                <p className="mt-4 max-w-2xl leading-relaxed text-black/60 dark:text-white/60">
                  {milestone.description}
                </p>
              </div>
              <span
                className="mt-1 text-xl transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </div>
          </Link>

          {locale === "fr" && milestone.youtubeVideoId && (
            <div className="grid gap-6 pb-10 md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] md:pb-14">
              <div aria-hidden />
              <div className="overflow-hidden rounded-sm bg-[#c6ddd6] p-2 sm:p-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-black/15 bg-black">
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${milestone.youtubeVideoId}`}
                    title={milestone.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          )}

          {milestone.image && !milestone.youtubeVideoId && (
            <Link
              href={`/${locale}/updates/${milestone.id}`}
              className="grid gap-6 pb-10 outline-hidden md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)] md:pb-14"
              tabIndex={-1}
              aria-hidden
            >
              <div />
              <div className="overflow-hidden rounded-sm bg-black/[0.04] p-2 dark:bg-white/[0.06] sm:p-4">
                <Image
                  src={milestone.image}
                  alt=""
                  width={800}
                  height={400}
                  sizes="(min-width: 1440px) 900px, (min-width: 768px) 65vw, 100vw"
                  className="h-auto w-full rounded-sm border border-black/10 transition-opacity hover:opacity-90 dark:border-white/10"
                />
              </div>
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}