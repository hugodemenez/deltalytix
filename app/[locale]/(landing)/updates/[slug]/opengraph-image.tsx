import { getPostMetadata } from "@/lib/mdx"
import { enUS, fr } from "date-fns/locale"
import { formatDateOnly } from "@/lib/format-date-only"
import path from "path"

export const alt = "Deltalytix Update"
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = "image/png"

// Route segment configuration - these are specialized Route Handlers
export const runtime = 'nodejs'
export const revalidate = 3600 // 1 hour

const sharpPromise = import("sharp")

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function wrapText(value: string, maxLineLength: number, maxLines: number) {
    const words = value.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let current = ""

    for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (next.length > maxLineLength && current) {
            lines.push(current)
            current = word
        } else {
            current = next
        }

        if (lines.length === maxLines) {
            break
        }
    }

    if (current && lines.length < maxLines) {
        lines.push(current)
    }

    if (words.length > 0 && lines.length === maxLines) {
        const consumed = lines.join(" ").split(/\s+/).length
        if (consumed < words.length) {
            lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S+$/, "")}...`
        }
    }

    return lines
}

async function renderOgPng(title: string, formattedDate: string) {
    const fontConfigDir = path.join(process.cwd(), "config/fontconfig")
    process.env.FONTCONFIG_PATH ??= fontConfigDir
    process.env.FONTCONFIG_FILE ??= path.join(fontConfigDir, "fonts.conf")
    const sharp = (await sharpPromise).default
    const titleLines = wrapText(title, 28, 4)
    const titleSvg = titleLines
        .map((line, index) => (
            `<text x="80" y="${260 + index * 68}" fill="#ffffff" font-size="56" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`
        ))
        .join("")

    const svg = `
<svg width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#000000"/>
  <g transform="translate(80 80)">
    <svg viewBox="0 0 255 255" width="32" height="32">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M159 63L127.5 0V255H255L236.5 218H159V63Z" fill="#FFFFFF"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z" fill="#FFFFFF"/>
    </svg>
    <text x="48" y="25" fill="#ffffff" font-size="24" font-weight="600" font-family="Arial, Helvetica, sans-serif">Deltalytix</text>
  </g>
  ${titleSvg}
  <text x="80" y="552" fill="#6B7280" font-size="18" font-family="Arial, Helvetica, sans-serif">${escapeXml(formattedDate)}</text>
</svg>`

    return sharp(Buffer.from(svg)).png().toBuffer()
}

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

        const image = await renderOgPng(meta.title, formattedDate)

        return new Response(new Uint8Array(image), {
            headers: {
                "Content-Type": contentType,
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
