/**
 * Tailwind 配置（Phase 1）。
 *
 * 关键约束：
 * - 禁用 preflight：避免与现有 `src/styles/reset.css` 产生 reset 冲突，保证视觉零差异。
 * - content 覆盖多入口：Launcher(`index.html`) + Settings(`settings.html`) + Visual(`visual.html`) + src 下所有 .vue/.ts。
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "index.html",
    "settings.html",
    "visual.html",
    "src/**/*.{vue,ts}",
    "!src/**/__tests__/**"
  ],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      borderRadius: {
        ui: "var(--ui-radius)",
        control: "var(--ui-radius-control)",
        surface: "10px",
        panel: "14px"
      },
      boxShadow: {
        ui: "var(--ui-shadow)"
      },
      colors: {
        ui: {
          bg: "var(--ui-bg)",
          "bg-rgb": "rgba(var(--ui-bg-rgb), <alpha-value>)",
          "bg-deep": "var(--ui-bg-deep)",
          "bg-soft": "var(--ui-bg-soft)",
          border: "var(--ui-border)",
          "border-light": "var(--ui-border-light)",
          text: "rgba(var(--ui-text-rgb), <alpha-value>)",
          black: "rgba(var(--ui-black-rgb), <alpha-value>)",
          subtle: "var(--ui-subtle)",
          dim: "var(--ui-dim)",
          brand: "rgba(var(--ui-brand-rgb), <alpha-value>)",
          "brand-dim": "var(--ui-brand-dim)",
          accent: "var(--ui-accent)",
          "search-hl": "rgba(var(--ui-search-hl-rgb), <alpha-value>)",
          success: "rgba(var(--ui-success-rgb), <alpha-value>)",
          danger: "rgba(var(--ui-danger-rgb), <alpha-value>)",
          "danger-soft": "var(--ui-danger-soft)",
          "accent-text": "var(--ui-accent-text)",
          "brand-soft": "var(--ui-brand-soft)",
          glass: "var(--ui-glass-bg)",
          input: "var(--ui-input-bg)",
          kbd: "var(--ui-kbd)",
          hover: "var(--ui-hover)",
          "search-hl-solid": "var(--ui-search-hl)"
        },
        settings: {
          card: "var(--ui-settings-card-bg)",
          "card-border": "var(--ui-settings-card-border)",
          "card-title": "var(--ui-settings-card-title)",
          "row-border": "var(--ui-settings-row-border)",
          "row-hover": "var(--ui-settings-row-hover)",
          "table-row-hover": "var(--ui-settings-table-row-hover)",
          "toolbar-sticky": "var(--ui-settings-toolbar-sticky-bg)",
          dropdown: "var(--ui-settings-dropdown-bg)",
          "dropdown-border": "var(--ui-settings-dropdown-border)",
          "dropdown-hover": "var(--ui-settings-dropdown-hover)",
          badge: "var(--ui-settings-badge-bg)",
          "badge-text": "var(--ui-settings-badge-text)",
          hint: "var(--ui-settings-hint)",
          "segment-tab-active": "var(--ui-settings-segment-tab-active-bg)"
        }
      },
      fontFamily: {
        mono: ["var(--ui-font-mono)"]
      },
      screens: {
        "settings-compact": { max: "520px" },
        "settings-narrow": { max: "760px" }
      },
      zIndex: {
        "settings-topbar": "var(--ui-settings-z-topbar)",
        "settings-toolbar": "var(--ui-settings-z-toolbar)",
        "settings-popover": "var(--ui-settings-z-popover)",
        "settings-overlay": "var(--ui-settings-z-overlay)"
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
        120: "120ms",
        130: "130ms",
        250: "250ms"
      },
      transitionTimingFunction: {
        "nav-slide": "cubic-bezier(0.175,0.885,0.32,1.15)"
      },
      gridTemplateRows: {
        "launcher-panel": "auto minmax(0, 1fr) auto",
        "settings-window": "52px minmax(0, 1fr)"
      }
    }
  },
  plugins: []
};
