/**
 * Tailwind 配置（Phase 1）。
 *
 * 关键约束：
 * - 禁用 preflight：避免与现有 `src/styles/reset.css` 产生 reset 冲突，保证视觉零差异。
 * - content 覆盖多入口：Launcher(`index.html`) + Settings(`settings.html`) + `src/**/*.{vue,ts}`。
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["index.html", "settings.html", "src/**/*.{vue,ts}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      borderRadius: {
        ui: "var(--ui-radius)"
      },
      boxShadow: {
        ui: "var(--ui-shadow)"
      },
      fontFamily: {
        mono: ["var(--ui-font-mono)"]
      }
    }
  },
  plugins: []
};
