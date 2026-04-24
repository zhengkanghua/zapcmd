export type ThemeColorScheme = "dark" | "light";

export interface ThemeMeta {
  id: string;
  colorScheme: ThemeColorScheme;
  frameBackgroundColor: string;
}

export const THEME_REGISTRY: ReadonlyArray<ThemeMeta> = [
  {
    id: "obsidian",
    colorScheme: "dark",
    frameBackgroundColor: "#0b0b0c"
  },
  {
    id: "linen",
    colorScheme: "light",
    frameBackgroundColor: "#ece4d6"
  }
];

export const DEFAULT_THEME_ID = "obsidian";

const THEME_META_BY_ID = new Map(
  THEME_REGISTRY.map((theme) => [theme.id, theme] as const)
);

export function resolveThemeMeta(id: string): ThemeMeta {
  return THEME_META_BY_ID.get(id) ?? THEME_META_BY_ID.get(DEFAULT_THEME_ID)!;
}
