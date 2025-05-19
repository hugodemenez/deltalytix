import { WelcomeEmailProvider } from "../components/welcome-email/welcome-email-context"
import { WelcomeEmailPreview } from "../components/welcome-email/welcome-email-preview"



export default function WelcomeEmailPage() {
  return (
    <WelcomeEmailProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Email Preview</h1>
          <p className="text-muted-foreground">
            Preview and customize the welcome email that will be sent to new users.
          </p>
        </div>
      <WelcomeEmailPreview />
      </div>
    </WelcomeEmailProvider>
  )
} 