/**
 * 将 Tailwind v4 的 `/opacity` 产物（color-mix in oklab）还原为直接 rgba。
 *
 * 背景：Tailwind v4 对 `bg-<color>/<opacity>`、`text-<color>/<opacity>` 等 opacity 修饰默认生成：
 *   color-mix(in oklab, <color> x%, transparent)
 * 这与历史上的 `rgba(..., x)` 在像素级上并不等价（尤其是 oklab vs sRGB），
 * 会导致 Windows visual-regression baseline mismatch。
 *
 * 策略：
 * 1) 将形如：
 *    color-mix(in oklab, rgba(var(--ui-*-rgb), 1) 8%, transparent)
 *    重写为：
 *    rgba(var(--ui-*-rgb), 0.08)
 * 2) 解包 LightningCSS 生成的 `@supports (color:color-mix(in lab,red,red))`，
 *    让重写后的 rgba 在所有环境生效并覆盖不透明 fallback。
 */

const SUPPORTS_COLOR_MIX_RE = /color\s*:\s*color-mix\(in\s+lab\s*,\s*red\s*,\s*red\s*\)/i;

const UI_COLOR_MIX_RE =
  /color-mix\(in\s+oklab\s*,\s*rgba\(var\(--(ui-[a-z0-9-]+-rgb)\)\s*,\s*1\)\s*([0-9]*\.?[0-9]+)%\s*,\s*transparent\s*\)/gi;

function pctToAlphaString(pctRaw) {
  const pct = Number(pctRaw);
  if (!Number.isFinite(pct)) return null;
  return String(pct / 100);
}

module.exports = function uiColorMixToRgba() {
  return {
    postcssPlugin: "zapcmd-ui-color-mix-to-rgba",
    Once(root) {
      root.walkDecls((decl) => {
        if (typeof decl.value !== "string" || !decl.value.includes("color-mix")) {
          return;
        }

        decl.value = decl.value.replace(UI_COLOR_MIX_RE, (match, varName, pct) => {
          const alpha = pctToAlphaString(pct);
          if (alpha === null) return match;
          return `rgba(var(--${varName}), ${alpha})`;
        });
      });

      root.walkAtRules("supports", (atRule) => {
        if (typeof atRule.params !== "string" || !SUPPORTS_COLOR_MIX_RE.test(atRule.params)) {
          return;
        }

        if (!Array.isArray(atRule.nodes) || atRule.nodes.length === 0) {
          atRule.remove();
          return;
        }

        atRule.replaceWith(...atRule.nodes);
      });
    }
  };
};

module.exports.postcss = true;
