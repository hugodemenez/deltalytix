import { notFound } from "next/navigation"
import { getShared } from "@/server/shared"
import { SharedPageClient } from "./shared-page-client"

interface SharedPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>
}

// Main page component - Server Component
export default async function SharedPage({ params }: SharedPageProps) {
  // Await the params Promise
  const resolvedParams = await params
  // Fetch shared data on the server
  const sharedData = await getShared(resolvedParams.slug)
  
  if (!sharedData) {
    notFound()
  }

  // Pass the resolved params and fetched data to the client component
  return <SharedPageClient params={resolvedParams} initialData={sharedData} />
}