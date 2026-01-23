"use client"

import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmailTemplate } from "../../actions/send-email"

interface EmailTemplateSelectorProps {
  selectedTemplate: EmailTemplate | null
  onSelect: (template: EmailTemplate) => void
}

const templates: { value: EmailTemplate; label: string; description: string }[] = [
  { value: "black-friday", label: "Black Friday", description: "Limited-time promotion email" },
  { value: "welcome", label: "Welcome", description: "Welcome new users to Deltalytix" },
  { value: "weekly-recap", label: "Weekly Recap", description: "Weekly trading statistics" },
  { value: "new-feature", label: "New Feature", description: "Announce new product features" },
  { value: "renewal-notice", label: "Renewal Notice", description: "Prop firm renewal reminder" },
  { value: "team-invitation", label: "Team Invitation", description: "Invite to a team workspace" },
  { value: "missing-data", label: "Missing Data", description: "Encourage users to import trades" },
  { value: "support-request", label: "Support Request", description: "Support escalation email" },
  { value: "support-subscription-error", label: "Subscription Error", description: "Subscription support follow-up" },
]

export function EmailTemplateSelector({ selectedTemplate, onSelect }: EmailTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card
          key={template.value}
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            selectedTemplate === template.value && "border-primary ring-2 ring-primary"
          )}
          onClick={() => onSelect(template.value)}
        >
          <div className="p-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{template.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
            </div>
            {selectedTemplate === template.value && <Check className="h-5 w-5 text-primary" />}
          </div>
        </Card>
      ))}
    </div>
  )
}