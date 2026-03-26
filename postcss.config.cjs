/**
 * PostCSS 管线配置（Phase 1）。
 *
 * - 接入 Tailwind + Autoprefixer，但不改变现有 reset/themes/tokens 行为。
 * - Tailwind 的 preflight 在 `tailwind.config.cjs` 中已禁用，避免视觉回归。
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    "./scripts/postcss/ui-color-mix-to-rgba.cjs": {},
    autoprefixer: {}
  }
};
