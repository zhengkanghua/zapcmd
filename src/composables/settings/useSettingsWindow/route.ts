import {
  tryResolveRouteFromHash,
  type SettingsWindowState,
  type UseSettingsWindowOptions
} from "./model";
import type { SettingsRoute } from "../../../features/settings/types";

export interface RouteActions {
  navigateSettings: (route: SettingsRoute) => void;
  applySettingsRouteFromHash: (ensureDefault?: boolean) => void;
  onSettingsHashChange: () => void;
}

export function createRouteActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
}): RouteActions {
  const { options, state } = deps;

  function navigateSettings(route: SettingsRoute): void {
    state.settingsRoute.value = route;
    if (!options.isSettingsWindow.value) {
      return;
    }
    const nextHash = `${options.settingsHashPrefix}${route}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function applySettingsRouteFromHash(ensureDefault = false): void {
    const resolved = tryResolveRouteFromHash(options.settingsHashPrefix, window.location.hash);
    if (resolved) {
      state.settingsRoute.value = resolved;
      return;
    }

    state.settingsRoute.value = "hotkeys";
    if (ensureDefault && options.isSettingsWindow.value) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${options.settingsHashPrefix}hotkeys`
      );
    }
  }

  function onSettingsHashChange(): void {
    if (!options.isSettingsWindow.value) {
      return;
    }
    applySettingsRouteFromHash(false);
  }

  return {
    navigateSettings,
    applySettingsRouteFromHash,
    onSettingsHashChange
  };
}
