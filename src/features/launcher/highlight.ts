function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeKeyword(keyword: string): string[] {
  const uniqueTokens = Array.from(
    new Set(
      keyword
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
    )
  );
  return uniqueTokens.sort((left, right) => right.length - left.length);
}

export function splitHighlight(
  text: string,
  keyword: string
): Array<{ text: string; match: boolean }> {
  const tokens = tokenizeKeyword(keyword);
  if (tokens.length === 0) {
    return [{ text, match: false }];
  }

  const tokenSet = new Set(tokens);
  const regex = new RegExp(`(${tokens.map(escapeRegex).join("|")})`, "ig");
  const parts = text.split(regex).filter((part) => part.length > 0);
  return parts.map((part) => ({
    text: part,
    match: tokenSet.has(part.toLowerCase())
  }));
}
