/**
 * Tailwind 配置（Phase 1）。
 *
 * 关键约束：
 * - 禁用 preflight：避免与现有 `src/styles/reset.css` 产生 reset 冲突，保证视觉零差异。
 * - content 覆盖多入口：Launcher(`index.html`) + Settings(`settings.html`) + Visual(`visual.html`) + `src/**/*.{vue,ts}`。
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["index.html", "settings.html", "visual.html", "src/**/*.{vue,ts}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      borderRadius: {
        ui: "var(--ui-radius)",
        control: "var(--ui-radius-control)"
      },
      boxShadow: {
        ui: "var(--ui-shadow)"
      },
      fontFamily: {
        mono: ["var(--ui-font-mono)"]
      },
      keyframes: {
        "toast-slide-down": {
          "0%": { opacity: "0", transform: "translate(-50%, -10px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" }
        },
        "staged-feedback": {
          from: { transform: "scale(0.995)", background: "rgba(var(--ui-brand-rgb), 0.32)" },
          to: { transform: "scale(1)", background: "var(--ui-brand-soft)" }
        },
        "review-overlay-scrim-in": {
          "0%": { opacity: "0" },
          "40%": { opacity: "1" },
          "100%": { opacity: "1" }
        },
        "review-overlay-scrim-out": {
          "0%": { opacity: "1" },
          "60%": { opacity: "1" },
          "100%": { opacity: "0" }
        },
        "review-overlay-panel-in": {
          "0%": { opacity: "0", transform: "translate3d(16px, 0, 0)" },
          "15%": { opacity: "0", transform: "translate3d(16px, 0, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        "review-overlay-panel-out": {
          "0%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
          "100%": { opacity: "0", transform: "translate3d(16px, 0, 0)" }
        },
        "staging-panel-enter": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "staging-panel-exit": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(-10px)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "dialog-scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" }
        }
      },
      animation: {
        "launcher-toast-slide-down": "toast-slide-down 350ms cubic-bezier(0.175,0.885,0.32,1.15) both",
        "launcher-staged-feedback": "staged-feedback 220ms ease",
        "launcher-review-overlay-scrim-in": "review-overlay-scrim-in 200ms ease-out both",
        "launcher-review-overlay-scrim-out": "review-overlay-scrim-out 200ms ease-in both",
        "launcher-review-overlay-panel-in": "review-overlay-panel-in 300ms cubic-bezier(0.175,0.885,0.32,1.15) both",
        "launcher-review-overlay-panel-out": "review-overlay-panel-out 200ms ease-in both",
        "launcher-staging-panel-enter": "staging-panel-enter 300ms cubic-bezier(0.175,0.885,0.32,1.15) both",
        "launcher-staging-panel-exit": "staging-panel-exit 200ms ease-in both",
        "launcher-fade-in": "fade-in 200ms ease-out both",
        "launcher-dialog-scale-in": "dialog-scale-in 300ms cubic-bezier(0.175,0.885,0.32,1.15) both"
      },
      transitionDuration: {
        250: "250ms"
      },
      transitionTimingFunction: {
        "nav-slide": "cubic-bezier(0.175,0.885,0.32,1.15)"
      }
    }
  },
  plugins: []
};
