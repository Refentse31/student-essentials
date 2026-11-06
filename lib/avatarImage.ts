const MARKER = "/storage/v1/object/public/avatars/";

/** Avatar storage is private, so route avatars through the public image proxy. */
export function avatarSrc(url?: string | null): string | undefined {
  if (!url) return undefined;
  const idx = url.indexOf(MARKER);
  if (idx === -1) return url;
  const path = url.slice(idx + MARKER.length);
  return `/api/public/avatar/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function initialsOf(first?: string | null, last?: string | null, email?: string | null) {
  const a = (first ?? "").trim()[0] ?? "";
  const b = (last ?? "").trim()[0] ?? "";
  const initials = `${a}${b}`.toUpperCase();
  if (initials) return initials;
  return (email ?? "S").trim()[0]?.toUpperCase() ?? "S";
}
