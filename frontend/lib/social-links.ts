export function instagramProfileUrl(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return "";
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return `https://www.instagram.com/${cleaned.replace(/^@+/, "")}`;
}
