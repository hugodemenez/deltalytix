import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import { COMPARE_COPY } from "../compare-copy";

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#E5E5E5] py-10 dark:border-white/10 md:py-12">
      <h2 className="mb-6 text-xs font-medium tracking-[0.14em] text-black/45 dark:text-white/45">
        <span className="tabular-nums">{n}</span> {title}
      </h2>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">{children}</div>
    </section>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-foreground">{label}</h3>
      <div className="text-pretty text-base leading-relaxed text-black/60 dark:text-white/60 [&_p]:m-0">
        {children}
      </div>
    </div>
  );
}

export function compareMdxComponents(
  journalName: string,
): NonNullable<MDXRemoteProps["components"]> {
  return {
    Section,
    Us: ({ children }: { children?: React.ReactNode }) => (
      <Column label={COMPARE_COPY.oneToOne.usLabel}>{children}</Column>
    ),
    Them: ({ children }: { children?: React.ReactNode }) => (
      <Column label={journalName}>{children}</Column>
    ),
  };
}
