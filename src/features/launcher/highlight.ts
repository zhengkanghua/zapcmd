function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface HighlightPattern {
  tokenSet: Set<string>;
  regex: RegExp | null;
}

const HIGHLIGHT_PATTERN_CACHE_LIMIT = 24;
const highlightPatternCache = new Map<string, HighlightPattern>();

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

function getHighlightPattern(keyword: string): HighlightPattern {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const cached = highlightPatternCache.get(normalizedKeyword);
  if (cached) {
    return cached;
  }

  const tokens = tokenizeKeyword(normalizedKeyword);
  const pattern: HighlightPattern = {
    tokenSet: new Set(tokens),
    regex: tokens.length > 0 ? new RegExp(`(${tokens.map(escapeRegex).join("|")})`, "ig") : null
  };

  highlightPatternCache.set(normalizedKeyword, pattern);
  if (highlightPatternCache.size > HIGHLIGHT_PATTERN_CACHE_LIMIT) {
    const oldestKey = highlightPatternCache.keys().next().value;
    if (typeof oldestKey === "string") {
      highlightPatternCache.delete(oldestKey);
    }
  }

  return pattern;
}

export function splitHighlight(
  text: string,
  keyword: string
): Array<{ text: string; match: boolean }> {
  const pattern = getHighlightPattern(keyword);
  if (!pattern.regex) {
    return [{ text, match: false }];
  }

  const parts = text.split(pattern.regex).filter((part) => part.length > 0);
  return parts.map((part) => ({
    text: part,
    match: pattern.tokenSet.has(part.toLowerCase())
  }));
}
