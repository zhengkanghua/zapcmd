import { DEFAULT_MOTION_PRESET, DEFAULT_THEME, SETTINGS_STORAGE_KEY } from "../../stores/settings/defaults";
import {
  normalizeBlurEnabled,
  normalizeMotionPresetId,
  normalizeThemeId
} from "../../stores/settings/normalization";
import { resolveMotionPresetMeta } from "../motion/motionRegistry";
import { resolveThemeMeta, type ThemeColorScheme } from "./themeRegistry";

export interface AppearanceBootstrapState {
  themeId: string;
  blurEnabled: boolean;
  motionPresetId: string;
  colorScheme: ThemeColorScheme;
  frameBackgroundColor: string;
}

interface ResolveAppearanceBootstrapInput {
  themeId?: unknown;
  blurEnabled?: unknown;
  motionPresetId?: unknown;
}

export interface BootstrapAppearanceOptions {
  mode: "launcher" | "settings" | "visual";
  document?: Document;
  storageKey?: string;
  visualThemeId?: string;
  visualBlurEnabled?: boolean;
  visualMotionPresetId?: string;
}

function resolveAppearanceBootstrapState(
  input: ResolveAppearanceBootstrapInput = {}
): AppearanceBootstrapState {
  const theme = resolveThemeMeta(normalizeThemeId(input.themeId));
  const motionPreset = resolveMotionPresetMeta(normalizeMotionPresetId(input.motionPresetId));

  return {
    themeId: theme.id,
    blurEnabled: normalizeBlurEnabled(input.blurEnabled),
    motionPresetId: motionPreset.id,
    colorScheme: theme.colorScheme,
    frameBackgroundColor: theme.frameBackgroundColor
  };
}

function readStoredAppearanceBootstrapState(storageKey = SETTINGS_STORAGE_KEY): AppearanceBootstrapState {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return resolveAppearanceBootstrapState({
        themeId: DEFAULT_THEME,
        blurEnabled: true,
        motionPresetId: DEFAULT_MOTION_PRESET
      });
    }

    const parsed = JSON.parse(raw) as {
      appearance?: {
        theme?: unknown;
        blurEnabled?: unknown;
        motionPreset?: unknown;
      };
    };

    return resolveAppearanceBootstrapState({
      themeId: parsed?.appearance?.theme,
      blurEnabled: parsed?.appearance?.blurEnabled,
      motionPresetId: parsed?.appearance?.motionPreset
    });
  } catch {
    return resolveAppearanceBootstrapState({
      themeId: DEFAULT_THEME,
      blurEnabled: true,
      motionPresetId: DEFAULT_MOTION_PRESET
    });
  }
}

export function applyThemeState(themeId: string, target = document.documentElement): AppearanceBootstrapState {
  const state = resolveAppearanceBootstrapState({ themeId });
  target.dataset.theme = state.themeId;
  target.style.colorScheme = state.colorScheme;
  return state;
}

export function applyBlurState(blurEnabled: boolean, target = document.documentElement): void {
  target.dataset.blur = normalizeBlurEnabled(blurEnabled) ? "on" : "off";
}

export function applyMotionPresetState(
  motionPresetId: string,
  target = document.documentElement
): void {
  target.dataset.motionPreset = resolveMotionPresetMeta(normalizeMotionPresetId(motionPresetId)).id;
}

function upsertFrameGuardStyle(doc: Document, state: AppearanceBootstrapState): void {
  const styleId = "zapcmd-appearance-bootstrap-guard";
  let style = doc.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = styleId;
    (doc.head ?? doc.documentElement).appendChild(style);
  }
  style.textContent =
    `html,body,#app{background:${state.frameBackgroundColor};}` +
    ` html{color-scheme:${state.colorScheme};}`;
}

function applyAppearanceBootstrapState(
  state: AppearanceBootstrapState,
  options: { document?: Document; includeFrameGuard?: boolean } = {}
): AppearanceBootstrapState {
  const doc = options.document ?? document;
  const target = doc.documentElement;

  applyThemeState(state.themeId, target);
  applyBlurState(state.blurEnabled, target);
  applyMotionPresetState(state.motionPresetId, target);

  if (options.includeFrameGuard) {
    target.style.backgroundColor = state.frameBackgroundColor;
    upsertFrameGuardStyle(doc, state);
  } else {
    target.style.backgroundColor = "";
  }

  return state;
}

export function bootstrapAppearanceFromStorage(
  options: BootstrapAppearanceOptions
): AppearanceBootstrapState {
  const state =
    options.mode === "visual"
      ? resolveAppearanceBootstrapState({
          themeId: options.visualThemeId ?? DEFAULT_THEME,
          blurEnabled: options.visualBlurEnabled ?? true,
          motionPresetId: options.visualMotionPresetId ?? DEFAULT_MOTION_PRESET
        })
      : readStoredAppearanceBootstrapState(options.storageKey);

  return applyAppearanceBootstrapState(state, {
    document: options.document,
    includeFrameGuard: options.mode !== "launcher"
  });
}
