
const YT_QUALITIES = [
  "maxresdefault",
  "sddefault", 
  "hqdefault",
  "mqdefault",
  "default",
] as const;

type YouTubeQuality = (typeof YT_QUALITIES)[number];

function isValidQuality(value: string | undefined): value is YouTubeQuality {
  return !!value && (YT_QUALITIES as readonly string[]).includes(value);
}

function buildYouTubeUrl(videoId: string, quality: YouTubeQuality) {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug: slugFromParams } = await params;
  const slug = slugFromParams || [];
  const [videoId, requestedQuality] = slug;

  if (!videoId) {
    return new Response("Missing video id", { status: 400 });
  }

  const qualitiesToTry: YouTubeQuality[] = isValidQuality(requestedQuality)
    ? [requestedQuality, ...YT_QUALITIES.filter((q) => q !== requestedQuality)]
    : [...YT_QUALITIES];

  let lastErrorMessage: string | null = null;
  for (const quality of qualitiesToTry) {
    const url = buildYouTubeUrl(videoId, quality);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; DeltalytixBot/1.0; +https://deltalytix.app)",
        },
        next: { revalidate: 60 * 60 * 24 },
      });

      if (!res.ok) {
        lastErrorMessage = `Upstream responded ${res.status}`;
        continue;
      }

      const contentType = res.headers.get("content-type") || "image/jpeg";
      const buffer = await res.arrayBuffer();

      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control":
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch (err) {
      lastErrorMessage = err instanceof Error ? err.message : "Failed to fetch thumbnail";
      continue;
    }
  }

  const message = lastErrorMessage || "Failed to fetch thumbnail";
  return new Response(message, { status: 502 });
}


