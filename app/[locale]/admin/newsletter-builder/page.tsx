import { Suspense } from "react"
import { NewsletterEditor } from "@/app/[locale]/admin/components/newsletter/newsletter-editor"
import { SubscriberTable } from "@/app/[locale]/admin/components/newsletter/subscriber-table"
import { NewsletterProvider } from "@/app/[locale]/admin/components/newsletter/newsletter-context"
import { NewsletterPreview } from "@/app/[locale]/admin/components/newsletter/newsletter-preview"
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable"

export default function AdminPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <NewsletterProvider>
        {/* Editor and Preview */}
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[600px] rounded-lg border"
        >
          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4">
              <Suspense fallback={<div>Loading editor...</div>}>
                <NewsletterEditor />
              </Suspense>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50}>
            <div className="h-full p-4">
              <Suspense fallback={<div>Loading preview...</div>}>
                <NewsletterPreview />
              </Suspense>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Subscribers Table */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Subscribers</h2>
          <Suspense fallback={<div>Loading subscribers...</div>}>
            <SubscriberTable />
          </Suspense>
        </div>
      </NewsletterProvider>
    </div>
  )
}
