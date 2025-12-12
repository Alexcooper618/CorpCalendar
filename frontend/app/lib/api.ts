export function buildApiUrl(path: string) {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (envBase) {
    return `${envBase}${path}`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return path;
}
