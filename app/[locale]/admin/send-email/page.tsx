import { SendEmailPageClient } from "../components/send-email/send-email-page-client"

export default function SendEmailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send Email</h1>
        <p className="text-muted-foreground">
          Choose a template, select recipients, preview the message, and send it.
        </p>
      </div>
      <SendEmailPageClient />
    </div>
  )
}