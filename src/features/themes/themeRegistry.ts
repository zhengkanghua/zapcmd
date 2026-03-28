export type ThemeColorScheme = "dark" | "light";

export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  colorScheme: ThemeColorScheme;
  frameBackgroundColor: string;
}

export const THEME_REGISTRY: ReadonlyArray<ThemeMeta> = [
  {
    id: "obsidian",
    name: "黑曜石",
    description: "温暖深灰 + 琥珀金，长时间使用最舒适",
    colorScheme: "dark",
    frameBackgroundColor: "#0b0b0c"
  },
  {
    id: "linen",
    name: "亚麻纸",
    description: "暖白纸面 + 古铜强调，明亮环境下更利于扫读",
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
