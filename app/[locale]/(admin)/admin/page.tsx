import { Suspense } from "react"
import { NewsletterEditor } from "@/app/[locale]/(admin)/components/newsletter-editor"
import { SubscriberTable } from "@/app/[locale]/(admin)/components/subscriber-table"
import { NewsletterProvider } from "@/app/[locale]/(admin)/components/newsletter-context"
import { NewsletterPreview } from "@/app/[locale]/(admin)/components/newsletter-preview"

export default function AdminPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Newsletter Administration</h1>
      
      <NewsletterProvider>
        {/* Editor and Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Suspense fallback={<div>Loading editor...</div>}>
            <NewsletterEditor />
          </Suspense>
          
          <Suspense fallback={<div>Loading preview...</div>}>
            <NewsletterPreview />
          </Suspense>
        </div>

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
