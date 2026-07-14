import { Skeleton } from "@/components/ui/skeleton";

export function FeaturesSectionSkeleton() {
  const spans = [
    "lg:col-span-3",
    "lg:col-span-3",
    "lg:col-span-4",
    "lg:col-span-2",
  ];

  return (
    <div className="container mx-auto px-4 py-16" aria-hidden>
      <Skeleton className="h-10 w-64 mx-auto mb-4" />
      <Skeleton className="h-6 w-96 max-w-full mx-auto mb-12" />
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {spans.map((span, index) => (
          <Skeleton key={index} className={`h-[420px] rounded-xl ${span}`} />
        ))}
      </div>
    </div>
  );
}

export function PricingSectionSkeleton() {
  return (
    <div className="container mx-auto px-4 py-16" aria-hidden>
      <Skeleton className="h-10 w-48 mx-auto mb-4" />
      <Skeleton className="h-6 w-80 max-w-full mx-auto mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Skeleton className="h-[480px] rounded-xl" />
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    </div>
  );
}

export function FAQSectionSkeleton() {
  return (
    <section className="py-16" aria-hidden>
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <Skeleton className="mb-16 h-12 w-48 md:h-16 md:w-56" />
        <div className="mx-auto max-w-3xl space-y-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function OpenSourceSectionSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12"
      aria-hidden
    >
      <div className="mb-16 grid gap-5 md:grid-cols-2 md:items-end">
        <Skeleton className="h-12 w-72 md:h-16" />
        <Skeleton className="h-14 w-full max-w-lg md:justify-self-end" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}
