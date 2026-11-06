const MARKER = "/storage/v1/object/public/donation-images/";

/** Storage is private, so route donation images through the public image proxy. */
export function itemImageSrc(url?: string | null): string | null {
  if (!url) return null;
  const idx = url.indexOf(MARKER);
  if (idx === -1) return url;
  const path = url.slice(idx + MARKER.length);
  return `/api/public/item-image/${path.split("/").map(encodeURIComponent).join("/")}`;
}
