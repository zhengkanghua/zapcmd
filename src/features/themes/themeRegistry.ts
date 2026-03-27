export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
}

export const THEME_REGISTRY: ReadonlyArray<ThemeMeta> = [
  {
    id: "obsidian",
    name: "黑曜石",
    description: "温暖深灰 + 琥珀金，长时间使用最舒适"
  },
];

export const DEFAULT_THEME_ID = "obsidian";
