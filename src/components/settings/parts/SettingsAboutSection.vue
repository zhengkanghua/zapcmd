<script setup lang="ts">
import { computed } from "vue";
import { useI18nText } from "../../../i18n";
import UiButton from "../../shared/ui/UiButton.vue";
import type { SettingsAboutProps } from "../types";

const props = defineProps<SettingsAboutProps>();
const emit = defineEmits<{
  (e: "check-update"): void;
  (e: "download-update"): void;
  (e: "open-homepage"): void;
}>();

const { t } = useI18nText();

const FALLBACK_TEXT = "-";
const UPDATER_PERMISSION_ERROR_PATTERN =
  /updater\.check\s+not\s+allowed|permissions associated with this command/i;

const githubOwner =
  typeof __GITHUB_OWNER__ === "string" && __GITHUB_OWNER__.trim()
    ? __GITHUB_OWNER__.trim()
    : "";
const githubRepo =
  typeof __GITHUB_REPO__ === "string" && __GITHUB_REPO__.trim()
    ? __GITHUB_REPO__.trim()
    : "";

const homepageUrl = githubOwner && githubRepo ? `https://github.com/${githubOwner}/${githubRepo}` : "";
const issuesUrl = homepageUrl ? `${homepageUrl}/issues` : "";

const canCheckUpdate = computed(
  () =>
    props.updateStatus.state !== "checking" &&
    props.updateStatus.state !== "downloading" &&
    props.updateStatus.state !== "installing"
);
const canDownloadUpdate = computed(() => {
  if (props.updateStatus.state === "available") {
    return props.updateStatus.version.trim().length > 0;
  }
  if (props.updateStatus.state === "error") {
    if (props.updateStatus.stage !== "download" && props.updateStatus.stage !== "install") {
      return false;
    }
    return (props.updateStatus.version ?? "").trim().length > 0;
  }
  return false;
});

const checkButtonLabel = computed(() =>
  props.updateStatus.state === "checking" ? t("settings.about.checking") : t("settings.about.checkUpdate")
);

const updateErrorMessage = computed(() => {
  if (props.updateStatus.state !== "error") {
    return "";
  }
  if (props.updateStatus.stage === "download") {
    return t("settings.about.updateFailedDownload", { reason: props.updateStatus.reason });
  }
  if (props.updateStatus.stage === "install") {
    return t("settings.about.updateFailedInstall", { reason: props.updateStatus.reason });
  }
  return t("settings.about.updateFailedCheck", { reason: props.updateStatus.reason });
});

const updateErrorNextStep = computed(() => {
  if (props.updateStatus.state !== "error") {
    return "";
  }
  if (props.updateStatus.stage === "download") {
    return t("settings.about.updateNextStepDownload");
  }
  if (props.updateStatus.stage === "install") {
    return t("settings.about.updateNextStepInstall");
  }
  if (UPDATER_PERMISSION_ERROR_PATTERN.test(props.updateStatus.reason)) {
    return t("settings.about.updateNextStepPermission");
  }
  return t("settings.about.updateNextStepCheck");
});
</script>

<template>
  <section class="settings-group settings-about grid gap-[24px]" aria-label="settings-about">
    <header
      class="about-brand flex items-center gap-[12px] rounded-2xl border border-settings-card-border bg-settings-card px-4 py-3.5"
      data-testid="about-brand"
    >
      <div
        class="about-brand__logo grid h-[60px] w-[60px] flex-shrink-0 place-items-center rounded-panel border border-[rgba(var(--ui-text-rgb),0.12)] bg-[rgba(var(--ui-text-rgb),0.06)] text-[26px] text-ui-text"
        role="img"
        aria-label="ZapCmd logo"
      >
        ⚡
      </div>
      <div class="about-brand__text grid min-w-0 gap-[4px]">
        <p class="about-brand__name m-0 text-[16px] font-[750] text-ui-text">ZapCmd</p>
        <p class="about-brand__meta m-0 flex items-baseline gap-[8px] text-[12px] text-[rgba(var(--ui-text-rgb),0.7)]">
          <span>{{ t("settings.about.version") }}</span>
          <code
            class="about-brand__version relative pl-[10px] text-ui-accent [font-variant-numeric:tabular-nums] before:absolute before:left-0 before:top-1/2 before:h-[5px] before:w-[5px] before:-translate-y-1/2 before:rounded-full before:bg-current before:content-['']"
          >
            {{ props.appVersion || FALLBACK_TEXT }}
          </code>
        </p>
      </div>
    </header>

    <div class="about-cards grid gap-[12px]">
      <div class="about-card about-card--info grid gap-[10px] rounded-panel border border-settings-card-border bg-settings-card p-[14px]" data-testid="about-info-card">
        <h3 class="about-card__title m-0 text-[12px] font-[650] text-ui-text">{{ t("settings.about.infoTitle") }}</h3>
        <dl class="about-grid m-0 grid gap-[10px]">
          <div class="about-row grid grid-cols-[140px_1fr] items-baseline gap-[12px]">
            <dt class="text-[12px] text-[rgba(var(--ui-text-rgb),0.7)]">{{ t("settings.about.version") }}</dt>
            <dd class="m-0 text-[12px] text-[rgba(var(--ui-text-rgb),0.9)]">
              <code>{{ props.appVersion || FALLBACK_TEXT }}</code>
            </dd>
          </div>
          <div class="about-row grid grid-cols-[140px_1fr] items-baseline gap-[12px]">
            <dt class="text-[12px] text-[rgba(var(--ui-text-rgb),0.7)]">{{ t("settings.about.platform") }}</dt>
            <dd class="m-0 text-[12px] text-[rgba(var(--ui-text-rgb),0.9)]">{{ props.runtimePlatform || FALLBACK_TEXT }}</dd>
          </div>
          <div class="about-row grid grid-cols-[140px_1fr] items-baseline gap-[12px]">
            <dt class="text-[12px] text-[rgba(var(--ui-text-rgb),0.7)]">{{ t("settings.about.homepage") }}</dt>
            <dd class="m-0 text-[12px] text-[rgba(var(--ui-text-rgb),0.9)]">
              <code>{{ homepageUrl || FALLBACK_TEXT }}</code>
            </dd>
          </div>
          <div class="about-row grid grid-cols-[140px_1fr] items-baseline gap-[12px]">
            <dt class="text-[12px] text-[rgba(var(--ui-text-rgb),0.7)]">{{ t("settings.about.license") }}</dt>
            <dd class="m-0 text-[12px] text-[rgba(var(--ui-text-rgb),0.9)]">MIT</dd>
          </div>
          <div class="about-row grid grid-cols-[140px_1fr] items-baseline gap-[12px]">
            <dt class="text-[12px] text-[rgba(var(--ui-text-rgb),0.7)]">{{ t("settings.about.feedback") }}</dt>
            <dd class="m-0 text-[12px] text-[rgba(var(--ui-text-rgb),0.9)]">
              <code>{{ issuesUrl || FALLBACK_TEXT }}</code>
            </dd>
          </div>
        </dl>
      </div>

      <div class="about-card about-card--actions grid gap-[10px] rounded-panel border border-settings-card-border bg-settings-card p-[14px]" data-testid="about-actions-card">
        <h3 class="about-card__title m-0 text-[12px] font-[650] text-ui-text">{{ t("settings.about.checkUpdate") }}</h3>
        <div class="about-actions m-0 flex flex-wrap gap-[10px]">
          <UiButton variant="muted" :disabled="!canCheckUpdate" @click="emit('check-update')">
            {{ checkButtonLabel }}
          </UiButton>
          <UiButton
            v-if="canDownloadUpdate"
            variant="primary"
            @click="emit('download-update')"
          >
            {{ t("settings.about.downloadUpdate") }}
          </UiButton>
          <UiButton variant="muted" @click="emit('open-homepage')">
            {{ t("settings.about.openHomepage") }}
          </UiButton>
        </div>

        <div
          v-if="props.updateStatus.state === 'error'"
          class="about-status about-status--error relative mt-3 rounded-surface border border-[rgba(var(--ui-danger-rgb),0.3)] bg-[rgba(var(--ui-danger-rgb),0.08)] px-3 py-2.5 pl-4 text-[12px] text-[rgba(var(--ui-danger-rgb),0.9)] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-full before:bg-ui-danger before:content-['']"
          role="status"
        >
          <p class="about-status__title m-0 mb-[8px] font-semibold">{{ updateErrorMessage }}</p>
          <p class="about-status__next-step m-0">{{ updateErrorNextStep }}</p>
        </div>
        <div
          v-else-if="props.updateStatus.state === 'checking'"
          class="about-status about-status--loading relative mt-3 rounded-surface border border-[rgba(var(--ui-brand-rgb),0.24)] bg-[rgba(var(--ui-brand-rgb),0.08)] px-3 py-2.5 pl-4 text-[12px] text-[rgba(var(--ui-text-rgb),0.85)] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-full before:bg-ui-brand before:content-['']"
          role="status"
        >
          <p class="about-status__title m-0 mb-[8px] font-semibold">{{ t("settings.about.checking") }}</p>
          <p class="about-status__next-step m-0">{{ t("settings.about.checkingHint") }}</p>
        </div>
        <div
          v-else-if="props.updateStatus.state === 'upToDate'"
          class="about-status about-status--success relative mt-3 rounded-surface border border-[rgba(var(--ui-success-rgb),0.28)] bg-[rgba(var(--ui-success-rgb),0.1)] px-3 py-2.5 pl-4 text-[12px] text-[rgba(var(--ui-success-rgb),0.9)] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-full before:bg-ui-success before:content-['']"
          role="status"
        >
          <p class="about-status__title m-0 mb-[8px] font-semibold">{{ t("settings.about.upToDate") }}</p>
        </div>
        <div
          v-else-if="props.updateStatus.state === 'available'"
          class="about-status relative mt-3 rounded-surface border border-[rgba(var(--ui-text-rgb),0.1)] bg-[rgba(var(--ui-text-rgb),0.03)] px-3 py-2.5 pl-4 text-[12px] text-[rgba(var(--ui-text-rgb),0.85)] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-full before:bg-[rgba(var(--ui-text-rgb),0.16)] before:content-['']"
          role="status"
        >
          <p class="about-status__title m-0 mb-[8px] font-semibold">
            {{ t("settings.about.updateAvailable", { version: props.updateStatus.version }) }}
          </p>
          <div v-if="props.updateStatus.body" class="about-status__body">
            <p class="about-status__label m-0 mb-[6px] text-[rgba(var(--ui-text-rgb),0.7)]">{{ t("settings.about.updateBody") }}</p>
            <pre class="about-status__content m-0 whitespace-pre-wrap break-words rounded-surface border border-[rgba(var(--ui-text-rgb),0.12)] bg-[rgba(var(--ui-black-rgb),0.25)] p-2.5">{{ props.updateStatus.body }}</pre>
          </div>
        </div>
        <div
          v-else-if="props.updateStatus.state === 'downloading'"
          class="about-status about-status--loading relative mt-3 rounded-surface border border-[rgba(var(--ui-brand-rgb),0.24)] bg-[rgba(var(--ui-brand-rgb),0.08)] px-3 py-2.5 pl-4 text-[12px] text-[rgba(var(--ui-text-rgb),0.85)] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-full before:bg-ui-brand before:content-['']"
          role="status"
        >
          <p class="about-status__title m-0 mb-[8px] font-semibold">
            {{ t("settings.about.downloading", { progress: props.updateStatus.progressPercent }) }}
          </p>
          <p class="about-status__next-step m-0">{{ t("settings.about.downloadingHint") }}</p>
          <progress
            class="mt-2 h-[8px] w-full accent-[var(--ui-accent)]"
            :value="props.updateStatus.progressPercent"
            max="100"
          ></progress>
        </div>
        <div
          v-else-if="props.updateStatus.state === 'installing'"
          class="about-status about-status--loading relative mt-3 rounded-surface border border-[rgba(var(--ui-brand-rgb),0.24)] bg-[rgba(var(--ui-brand-rgb),0.08)] px-3 py-2.5 pl-4 text-[12px] text-[rgba(var(--ui-text-rgb),0.85)] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[3px] before:rounded-full before:bg-ui-brand before:content-['']"
          role="status"
        >
          <p class="about-status__title m-0 mb-[8px] font-semibold">{{ t("settings.about.installing") }}</p>
          <p class="about-status__next-step m-0">{{ t("settings.about.installingHint") }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
