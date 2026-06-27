"use client";

import { useI18n } from "@/locales/client";

export default function FAQ() {
  const t = useI18n();

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">
          {t("faq.heading")}
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <details className="border-b pb-4">
            <summary className="font-semibold cursor-pointer">
              {t("faq.question1")}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("faq.answer1")}
            </p>
          </details>
          <details className="border-b pb-4">
            <summary className="font-semibold cursor-pointer">
              {t("faq.question2")}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("faq.answer2")}
            </p>
          </details>
          <details className="border-b pb-4">
            <summary className="font-semibold cursor-pointer">
              {t("faq.question3")}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("faq.answer3")}
            </p>
          </details>
          <details className="border-b pb-4">
            <summary className="font-semibold cursor-pointer">
              {t("faq.question4")}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("faq.answer4")}
            </p>
          </details>
          <details className="border-b pb-4">
            <summary className="font-semibold cursor-pointer">
              {t("faq.question5")}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("faq.answer5")}
            </p>
          </details>
          <details className="border-b pb-4">
            <summary className="font-semibold cursor-pointer">
              {t("faq.question6")}
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("faq.answer6")}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
