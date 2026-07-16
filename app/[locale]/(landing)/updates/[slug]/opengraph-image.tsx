import { ImageResponse } from "next/og"
import { getPostMetadata } from "@/lib/mdx"
import type { ReactElement } from "react"
import { enUS, fr } from "date-fns/locale"
import { formatDateOnly } from "@/lib/format-date-only"
import {
  BrandLockup,
  LandingAtmosphere,
  OgCtaButton,
  loadLandingProductPosterSrc,
  ogImageCacheHeaders,
} from "@/lib/og/shared"
import { getUpdatesOgCopy } from "@/lib/og/site-metadata"
import {
  OG_COLORS,
  OG_FONT_FAMILY,
  OG_PADDING,
  OG_TRACKING,
} from "@/lib/og/tokens"

export const alt = "Deltalytix Update"
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
        const post = await getPostMetadata(slug, locale)
        
        if (!post) {
            return new Response("Post not found", { status: 404 })
        }

        const { meta } = post

        const dateLocale = locale === "fr" ? fr : enUS
        const dateFormat = locale === "fr" ? "d MMMM yyyy" : "MMMM d, yyyy"
        const formattedDate = formatDateOnly(meta.date, dateFormat, {
            locale: dateLocale,
        })

        const updatesCopy = getUpdatesOgCopy(locale)
        const productSrc = await loadLandingProductPosterSrc()

        const element = (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    background: OG_COLORS.background,
                    fontFamily: OG_FONT_FAMILY,
                    padding: `${OG_PADDING}px`,
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    position: "relative",
                }}
            >
                <LandingAtmosphere width={340} height={230} productSrc={productSrc} />

                <BrandLockup logoSize={36} fontSize={26} />

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                        maxWidth: "760px",
                        position: "relative",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "52px",
                            fontWeight: 400,
                            color: OG_COLORS.foreground,
                            margin: "0",
                            lineHeight: "1.12",
                            letterSpacing: OG_TRACKING.display,
                        }}
                    >
                        {meta.title}
                    </h1>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                        position: "relative",
                    }}
                >
                    <OgCtaButton label={updatesCopy.cta} />
                    <span
                        style={{
                            fontSize: "20px",
                            fontWeight: 400,
                            color: OG_COLORS.subtle,
                            letterSpacing: OG_TRACKING.wide,
                        }}
                    >
                        {formattedDate}
                    </span>
                </div>
            </div>
        ) as ReactElement

        return new ImageResponse(element, {
            ...size,
            headers: ogImageCacheHeaders,
        })
    } catch (e: unknown) {
        console.log(e instanceof Error ? e.message : "Unknown error")
        return new Response("Failed to generate the image", { status: 500 })
    }
}
