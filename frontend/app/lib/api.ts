export function buildApiUrl(path: string) {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window === "undefined") {
    return envBase ? `${envBase}${path}` : path;
  }

  const { protocol, hostname, port } = window.location;
  const backendPort = port === "3000" ? "4000" : port;
  const browserBase = backendPort
    ? `${protocol}//${hostname}:${backendPort}`
    : `${protocol}//${hostname}`;

  if (envBase) {
    try {
      const envHost = new URL(envBase).hostname;
      if (envHost === hostname) {
        return `${envBase}${path}`;
      }
    } catch {
      // fall back to browser base on invalid env value
    }
  }

  return `${browserBase}${path}`;
}
