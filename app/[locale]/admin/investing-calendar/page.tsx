import { InvestingCalendarUpload } from '@/app/[locale]/admin/components/investing-calendar/investing-calendar-upload'

export default function InvestingCalendarPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Investing.com Calendar Processor</h1>
      <InvestingCalendarUpload />
    </div>
  )
} 