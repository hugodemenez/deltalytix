"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { format, isToday } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { useParams } from "next/navigation"

interface TradingQuestionProps {
  onNext: (hasTradingExperience: boolean) => void
  date: Date
}

export function TradingQuestion({ onNext, date }: TradingQuestionProps) {
  const t = useI18n()
  const { locale } = useParams()
  const dateLocale = locale === 'fr' ? fr : enUS
  const [selected, setSelected] = useState<boolean | null>(null)

  const handleSelect = (value: boolean) => {
    setSelected(value)
    onNext(value)
  }

  const question = isToday(date)
    ? t('mindset.tradingQuestion.questionToday')
    : t('mindset.tradingQuestion.question', { date: format(date, 'MMMM d', { locale: dateLocale }) })

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-6">
      <h2 className="text-2xl font-semibold text-center">
        {question}
      </h2>
      <div className="flex gap-4">
        <Button
          variant={selected === true ? "default" : "outline"}
          size="lg"
          onClick={() => handleSelect(true)}
          className="min-w-[120px]"
        >
          {t('mindset.tradingQuestion.yes')}
        </Button>
        <Button
          variant={selected === false ? "default" : "outline"}
          size="lg"
          onClick={() => handleSelect(false)}
          className="min-w-[120px]"
        >
          {t('mindset.tradingQuestion.no')}
        </Button>
      </div>
    </div>
  )
} 