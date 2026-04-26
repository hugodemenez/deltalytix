import { NextResponse, type NextRequest } from "next/server";
import {
  homepageMarkdown,
  linkHeaderValue,
} from "@/lib/agent-discovery/metadata";

function acceptsMarkdown(request: NextRequest) {
  return request.headers
    .get("accept")
    ?.split(",")
    .some((value) => value.trim().toLowerCase().startsWith("text/markdown"));
}

function isHomepage(pathname: string) {
  return pathname === "/" || pathname === "/en" || pathname === "/fr";
}

export function middleware(request: NextRequest) {
  if (!isHomepage(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (acceptsMarkdown(request)) {
    const markdown = homepageMarkdown(request);

    return new NextResponse(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(markdown.split(/\s+/).filter(Boolean).length),
        link: linkHeaderValue(),
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("link", linkHeaderValue());
  return response;
}

export const config = {
  matcher: ["/", "/en", "/fr"],
};
