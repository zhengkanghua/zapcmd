import {
  createReadFailedIssue
} from "../../../features/commands/runtimeLoader";
import { createCommandCatalogState } from "./state";
import { USER_COMMAND_SOURCE_ID } from "./types";

type CommandCatalogState = ReturnType<typeof createCommandCatalogState>;

export function markCatalogReady(state: CommandCatalogState): void {
  state.catalogStatus.value = "ready";
  state.catalogReady.value = true;
}

export function markCatalogError(state: CommandCatalogState): void {
  state.catalogStatus.value = "error";
  state.catalogReady.value = false;
}

export function setMissingPortsIssue(state: CommandCatalogState): void {
  state.loadIssues.value = [
    createReadFailedIssue(
      USER_COMMAND_SOURCE_ID,
      "user command scan/read ports are not configured."
    )
  ];
}
