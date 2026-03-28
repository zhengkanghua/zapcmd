;(function () {
  var SETTINGS_STORAGE_KEY = "zapcmd.settings";
  var DEFAULT_THEME = "obsidian";
  var DEFAULT_MOTION_PRESET = "expressive";
  var DEFAULT_BLUR_ENABLED = true;
  var THEME_BOOTSTRAP_MAP = {
    "obsidian": { colorScheme: "dark", frameBackgroundColor: "#0b0b0c" },
    "linen": { colorScheme: "light", frameBackgroundColor: "#ece4d6" }
  };
  var MOTION_PRESET_IDS = {
    "expressive": true,
    "steady-tool": true
  };

  function normalizeThemeId(value) {
    if (typeof value !== "string") {
      return DEFAULT_THEME;
    }
    var trimmed = value.trim();
    return THEME_BOOTSTRAP_MAP[trimmed] ? trimmed : DEFAULT_THEME;
  }

  function normalizeBlurEnabled(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      var normalized = value.trim().toLowerCase();
      if (normalized === "false" || normalized === "0" || normalized === "off") {
        return false;
      }
      if (normalized === "true" || normalized === "1" || normalized === "on") {
        return true;
      }
    }
    return DEFAULT_BLUR_ENABLED;
  }

  function normalizeMotionPresetId(value) {
    if (typeof value !== "string") {
      return DEFAULT_MOTION_PRESET;
    }
    var trimmed = value.trim();
    return MOTION_PRESET_IDS[trimmed] ? trimmed : DEFAULT_MOTION_PRESET;
  }

  function resolveAppearanceState(input) {
    return {
      themeId: normalizeThemeId(input.themeId),
      blurEnabled: normalizeBlurEnabled(input.blurEnabled),
      motionPresetId: normalizeMotionPresetId(input.motionPresetId)
    };
  }

  function readStoredAppearanceState(storageKey) {
    try {
      var raw = window.localStorage.getItem(storageKey || SETTINGS_STORAGE_KEY);
      if (!raw) {
        return resolveAppearanceState({
          themeId: DEFAULT_THEME,
          blurEnabled: DEFAULT_BLUR_ENABLED,
          motionPresetId: DEFAULT_MOTION_PRESET
        });
      }

      var parsed = JSON.parse(raw);
      var appearance = parsed && parsed.appearance ? parsed.appearance : {};
      return resolveAppearanceState({
        themeId: appearance.theme,
        blurEnabled: appearance.blurEnabled,
        motionPresetId: appearance.motionPreset
      });
    } catch (_error) {
      return resolveAppearanceState({
        themeId: DEFAULT_THEME,
        blurEnabled: DEFAULT_BLUR_ENABLED,
        motionPresetId: DEFAULT_MOTION_PRESET
      });
    }
  }

  function upsertFrameGuardStyle(theme) {
    var styleId = "zapcmd-appearance-bootstrap-guard";
    var style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent =
      "html,body,#app{background:" +
      theme.frameBackgroundColor +
      ";} html{color-scheme:" +
      theme.colorScheme +
      ";}";
  }

  function applyAppearanceState(state, includeFrameGuard) {
    var theme = THEME_BOOTSTRAP_MAP[state.themeId] || THEME_BOOTSTRAP_MAP[DEFAULT_THEME];
    var root = document.documentElement;

    root.dataset.theme = state.themeId;
    root.dataset.blur = state.blurEnabled ? "on" : "off";
    root.dataset.motionPreset = state.motionPresetId;
    root.style.colorScheme = theme.colorScheme;

    if (includeFrameGuard) {
      root.style.backgroundColor = theme.frameBackgroundColor;
      upsertFrameGuardStyle(theme);
    }
  }

  function bootstrapFromScript(script) {
    if (!script) {
      return;
    }

    var mode = script.getAttribute("data-zapcmd-appearance-mode") || "launcher";
    var state =
      mode === "visual"
        ? resolveAppearanceState({
            themeId: script.getAttribute("data-zapcmd-visual-theme-id"),
            blurEnabled: script.getAttribute("data-zapcmd-visual-blur-enabled"),
            motionPresetId: script.getAttribute("data-zapcmd-visual-motion-preset-id")
          })
        : readStoredAppearanceState(script.getAttribute("data-zapcmd-storage-key"));

    applyAppearanceState(state, mode !== "launcher");
  }

  bootstrapFromScript(document.currentScript);
})();
