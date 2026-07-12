export function localizeLandingHref(locale: string, path: string): string {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/#")) {
    return `/${locale}${path.slice(1)}`;
  }

  if (path.startsWith("#")) {
    return `/${locale}${path}`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function getHashFromHref(href: string): string | null {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return null;
  }

  return href.slice(hashIndex + 1);
}

export function scrollToLandingHash(hash: string) {
  if (!hash) {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(hash)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}
