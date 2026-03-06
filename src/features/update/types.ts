export type UpdateFailureStage = "check" | "download" | "install";

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "upToDate" }
  | { state: "available"; version: string; body?: string }
  | { state: "downloading"; progressPercent: number; version: string }
  | { state: "installing"; version: string }
  | { state: "error"; reason: string; stage: UpdateFailureStage; version?: string };
