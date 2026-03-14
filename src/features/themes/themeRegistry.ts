export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    surface: string;
    accent: string;
    text: string;
  };
}

export const THEME_REGISTRY: ReadonlyArray<ThemeMeta> = [
  {
    id: "obsidian",
    name: "黑曜石",
    description: "温暖深灰 + 琥珀金，长时间使用最舒适",
    preview: {
      bg: "#18181B",
      surface: "#27272A",
      accent: "#FBBF24",
      text: "#FAFAFA",
    },
  },
];

export const DEFAULT_THEME_ID = "obsidian";
