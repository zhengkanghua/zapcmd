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
      minHeight: {
        "ui-top-align": "var(--ui-top-align-offset)"
      },
      inset: {
        "ui-top-align": "var(--ui-top-align-offset)"
      },
      boxShadow: {
        ui: "var(--ui-shadow)",
        "settings-focus": "0 0 0 3px var(--ui-settings-focus-ring)",
        "brand-soft-ring": "0 0 0 2px var(--ui-brand-soft)",
        "danger-soft-ring": "0 0 0 2px var(--ui-danger-soft)",
        "settings-preview-panel": "0 4px 12px var(--tw-shadow-color)",
        "settings-toggle-track": "var(--ui-settings-toggle-track-shadow)",
        "settings-toggle-thumb": "var(--ui-settings-toggle-thumb-shadow)",
        "settings-toolbar": "0 18px 40px var(--tw-shadow-color)",
        "launcher-chip-inset": "inset 0 1px 0 var(--tw-shadow-color)",
        "launcher-search-indicator": "0 0 10px var(--tw-shadow-color)",
        "launcher-side-panel": "-4px 0 24px var(--tw-shadow-color)",
        "launcher-drag-card": "0 14px 28px var(--tw-shadow-color)"
      },
      backgroundImage: {
        "settings-slider-fill":
          "linear-gradient(90deg,var(--ui-brand) 0%,var(--ui-brand) var(--fill-percent),var(--ui-border) var(--fill-percent),var(--ui-border) 100%)",
        "settings-preview-checker": "var(--ui-settings-preview-checker)",
        "settings-window-shell":
          "radial-gradient(circle at top, rgba(var(--ui-text-rgb), 0.035), transparent 48%), linear-gradient(180deg, rgba(var(--ui-text-rgb), 0.02), transparent 28%)",
        "settings-window-topbar":
          "linear-gradient(180deg, rgba(var(--ui-text-rgb), 0.045), rgba(var(--ui-text-rgb), 0.01) 42%, rgba(var(--ui-text-rgb), 0))",
        "launcher-frame-highlight": "linear-gradient(180deg,var(--tw-gradient-from),transparent 60%)",
        "launcher-flow-panel-highlight":
          "linear-gradient(180deg,var(--tw-gradient-from),var(--tw-gradient-via) 52%,transparent)"
      },
      backdropBlur: {
        ui: "var(--ui-blur)",
        "ui-70": "calc(var(--ui-blur) * 0.7)",
        "ui-24": "calc(var(--ui-blur) * 0.24)",
        "launcher-scrim": "8px",
        "launcher-dialog": "20px"
      },
      accentColor: {
        ui: "var(--ui-accent)"
      },
      colors: {
        ui: {
          bg: "var(--ui-bg)",
          "bg-rgb": "rgba(var(--ui-bg-rgb), <alpha-value>)",
          "bg-deep": "var(--ui-bg-deep)",
          "bg-soft": "var(--ui-bg-soft)",
          surface: "var(--ui-surface)",
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
          "search-hl-solid": "var(--ui-search-hl)",
          "control-muted-hover-bg": "var(--ui-control-muted-hover-bg)",
          "control-muted-hover-border": "var(--ui-control-muted-hover-border)"
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
          "segment-tab-active": "var(--ui-settings-segment-tab-active-bg)",
          "segment-tab-text": "var(--ui-settings-segment-tab-text)",
          "segment-tab-text-hover": "var(--ui-settings-segment-tab-text-hover)",
          "segment-tab-text-active": "var(--ui-settings-segment-tab-text-active)",
          "toggle-on": "var(--ui-toggle-on)",
          "toggle-off": "var(--ui-settings-toggle-off)",
          "toggle-thumb": "var(--ui-settings-toggle-thumb)"
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
      transitionProperty: {
        "settings-field": "background-color, border-color, box-shadow",
        "settings-interactive": "background-color, border-color, color, box-shadow",
        "settings-toggle-track": "background-color, box-shadow",
        "settings-toggle-thumb": "transform, background-color",
        "launcher-surface": "background-color, border-color",
        "launcher-pressable": "background-color, transform",
        "launcher-card": "transform, border-color, opacity, box-shadow",
        "launcher-field": "background-color, border-color, box-shadow",
        "launcher-interactive": "background-color, border-color, color, box-shadow, opacity",
        "launcher-emphasis": "opacity, box-shadow",
        "launcher-width": "width"
      },
      transitionTimingFunction: {
        "nav-slide": "cubic-bezier(0.175,0.885,0.32,1.15)",
        "settings-emphasized": "cubic-bezier(0.33,1,0.68,1)",
        "launcher-emphasized": "cubic-bezier(0.175,0.885,0.32,1.15)"
      },
      gridTemplateRows: {
        "launcher-shell": "var(--ui-top-align-offset) auto",
        "launcher-panel": "auto minmax(0, 1fr) auto",
        "settings-window": "52px minmax(0, 1fr)"
      }
    }
  },
  plugins: []
};
