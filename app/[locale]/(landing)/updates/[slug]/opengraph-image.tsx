import { ImageResponse } from "next/og"
import { getPost } from "@/lib/mdx"
import type { ReactElement } from "react"

export const alt = "Deltalytix Blog Post"
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = "image/png"

// Route segment configuration - these are specialized Route Handlers
export const runtime = 'nodejs'
export const revalidate = 3600 // 1 hour

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
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                }}
            >
                {/* Main Brand H1 */}
                <h1
                    style={{
                        fontSize: "80px",
                        fontWeight: "900",
                        color: "#FFFFFF",
                        margin: "0 0 40px 0",
                        lineHeight: "1.1",
                        letterSpacing: "-0.02em",
                    }}
                >
                    Deltalytix
                </h1>

                {/* Post Title Subtitle */}
                <h2
                    style={{
                        fontSize: "32px",
                        fontWeight: "400",
                        color: "#FFFFFF",
                        margin: "0",
                        lineHeight: "1.4",
                        maxWidth: "900px",
                    }}
                >
                    {meta.title}
                </h2>
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