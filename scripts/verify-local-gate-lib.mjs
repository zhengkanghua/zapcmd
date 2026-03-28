const macOSDesktopE2EExperimentalFlag = "--macos-desktop-e2e-experimental";

function createBlockingStep(command, stepName) {
  return {
    command,
    stepName,
    allowFailure: false
  };
}

function createOptionalVisualStep() {
  return {
    command: "npm run test:visual:ui",
    stepName: "运行截图级 visual compare（non-blocking compare）",
    allowFailure: true,
    artifactHint: ".tmp/e2e/visual-regression/"
  };
}

export function buildLocalGatePlan({
  platform,
  isWsl,
  flags,
  supportsDesktopE2E,
  requireDesktopE2E,
  macOSSkipDesktopSmokeMessage
}) {
  const runE2E = !flags.has("--skip-e2e");
  const e2eOnly = flags.has("--e2e-only");
  const isWindows = platform === "win32";
  const isMacOS = platform === "darwin";
  const desktopE2ESupported =
    typeof supportsDesktopE2E === "boolean"
      ? supportsDesktopE2E
      : isWindows || (isMacOS && flags.has(macOSDesktopE2EExperimentalFlag));

  const notices = [];
  const steps = [];

  if (!e2eOnly) {
    steps.push(createBlockingStep("npm run check:all", "运行全量质量门禁"));
  }

  if (!runE2E) {
    return { notices, steps };
  }

  if (desktopE2ESupported) {
    steps.push(createBlockingStep("npm run e2e:desktop:smoke", "运行桌面 E2E 冒烟"));
  } else {
    const message = isMacOS
      ? macOSSkipDesktopSmokeMessage ?? "macOS 默认跳过 blocking desktop-smoke"
      : `当前平台（${platform}）不支持桌面 E2E 冒烟，已跳过`;

    if (requireDesktopE2E) {
      return {
        notices,
        steps,
        blockingError: `${message}（已开启 --require-desktop-e2e）`
      };
    }

    notices.push(message);
  }

  if (isWindows || isWsl) {
    steps.push(createOptionalVisualStep());
  }

  return { notices, steps };
}
