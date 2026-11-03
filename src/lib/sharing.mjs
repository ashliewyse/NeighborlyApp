const ORIGIN = "https://www.neighborshelpingneighbors.online";
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function shareTarget(kind = "website", id) {
  if (kind === "website")
    return {
      title: "Neighborly",
      text: "Connect with your neighbors on Neighborly.",
      url: `${ORIGIN}/`,
    };
  if (!["post", "group"].includes(kind) || !UUID_PATTERN.test(id || ""))
    throw new Error("This item does not have a shareable link yet.");
  return {
    title: kind === "post" ? "Neighborly post" : "Neighborly group",
    text:
      kind === "post"
        ? "See this post on Neighborly."
        : "Join this group on Neighborly.",
    url: `${ORIGIN}/${kind}s/${id}`,
  };
}

export function shareLinks(data, userAgent = "") {
  const body = encodeURIComponent(`${data.text}\n${data.url}`);
  return {
    email: `mailto:?subject=${encodeURIComponent(data.title)}&body=${body}`,
    sms: `sms:${/iPad|iPhone|iPod/i.test(userAgent) ? "&" : "?"}body=${body}`,
  };
}

export function safeReturnPath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (["/", "/profile", "/settings", "/admin"].includes(value)) return value;
  const match = value.match(/^\/(groups|posts)\/([^/?#]+)$/);
  return match && UUID_PATTERN.test(match[2]) ? value : fallback;
}
