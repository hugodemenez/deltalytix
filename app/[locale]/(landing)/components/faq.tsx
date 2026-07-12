"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/locales/landing-client";

const FAQ_ITEMS = [1, 2, 3, 4, 5, 6] as const;

function FaqAnswer({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter(Boolean);

  return (
    <div className="space-y-3 text-left">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-base leading-relaxed text-black/55 dark:text-white/55"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export default function FAQ() {
  const t = useI18n();

  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
      <h2 className="mb-8 text-center text-3xl font-bold">
        {t("faq.heading")}
      </h2>
      <Accordion
        type="single"
        collapsible
        className="mx-auto max-w-3xl divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10"
      >
        {FAQ_ITEMS.map((n) => (
          <AccordionItem key={n} value={`item-${n}`} className="border-none">
            <AccordionTrigger className="w-full py-5 text-start text-lg font-semibold hover:no-underline">
              {t(`faq.question${n}`)}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-start [&>div]:text-base">
              <FaqAnswer text={t(`faq.answer${n}`)} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
