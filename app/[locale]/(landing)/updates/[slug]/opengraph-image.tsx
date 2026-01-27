import { ImageResponse } from "next/og"
import { getPost, getAllPosts } from "@/lib/mdx"
import type { ReactElement } from "react"
import { getStaticParams as getLocaleStaticParams } from '@/locales/server'

export const alt = "Deltalytix Update"
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = "image/png"

// Route segment configuration - these are specialized Route Handlers
export const runtime = 'nodejs'
export const revalidate = 3600 // 1 hour

// Generate static paths for all posts in all locales
export async function generateStaticParams() {
    const locales = getLocaleStaticParams().map((entry) => entry.locale)
    const paths: Array<{ locale: string; slug: string }> = []

    for (const locale of locales) {
        const posts = await getAllPosts(locale)
        paths.push(...posts.map((post) => ({
            locale,
            slug: post.slug,
        })))
    }

    return paths
}

export default async function Image({ 
    params 
}: { 
    params: Promise<{ slug: string; locale: string }> 
}) {
    try {
        const { slug, locale } = await params
        const post = await getPost(slug, locale)
        
        if (!post) {
            return new Response("Post not found", { status: 404 })
        }

        const { meta } = post

        // Format the date
        const date = new Date(meta.date)
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })

        const element = (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    background: "#000000",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    padding: "80px",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                {/* Top section with logo */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}
                >
                    <svg viewBox="0 0 255 255" xmlns="http://www.w3.org/2000/svg" style={{ width: "32px", height: "32px" }}>
                        <path fillRule="evenodd" clipRule="evenodd" d="M159 63L127.5 0V255H255L236.5 218H159V63Z" fill="#FFFFFF" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z" fill="#FFFFFF" />
                    </svg>
                    <span
                        style={{
                            fontSize: "24px",
                            fontWeight: "600",
                            color: "#FFFFFF",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Deltalytix
                    </span>
                </div>

                {/* Middle section with title */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        maxWidth: "900px",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "56px",
                            fontWeight: "700",
                            color: "#FFFFFF",
                            margin: "0",
                            lineHeight: "1.15",
                            letterSpacing: "-0.025em",
                        }}
                    >
                        {meta.title}
                    </h1>
                </div>

                {/* Bottom section with date */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <span
                        style={{
                            fontSize: "18px",
                            fontWeight: "400",
                            color: "#6B7280",
                            letterSpacing: "0.01em",
                        }}
                    >
                        {formattedDate}
                    </span>
                </div>
            </div>
        ) as ReactElement

        return new ImageResponse(element, {
            ...size,
            headers: {
                "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600",
                "CDN-Cache-Control": "public, max-age=3600",
                "Vercel-CDN-Cache-Control": "public, max-age=3600",
            },
        })
    } catch (e: unknown) {
        console.log(e instanceof Error ? e.message : "Unknown error")
        return new Response("Failed to generate the image", { status: 500 })
    }
} 