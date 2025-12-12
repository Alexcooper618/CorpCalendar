export function buildApiUrl(path: string) {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (envBase) {
    return `${envBase}${path}`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const { protocol, hostname, port } = window.location;
    const backendPort = port === "3000" ? "4000" : port;
    const base = backendPort
      ? `${protocol}//${hostname}:${backendPort}`
      : `${protocol}//${hostname}`;

    return `${base}${path}`;
  }

  return path;
}
