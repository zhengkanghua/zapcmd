<script setup lang="ts">
import { computed } from "vue";
import { useI18nText } from "../../../i18n";
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
  <section class="settings-group">
    <h2>{{ t("settings.about.title") }}</h2>
    <p class="about-app-name">ZapCmd</p>

    <dl class="about-grid">
      <div class="about-row">
        <dt>{{ t("settings.about.version") }}</dt>
        <dd>
          <code>{{ props.appVersion || FALLBACK_TEXT }}</code>
        </dd>
      </div>
      <div class="about-row">
        <dt>{{ t("settings.about.platform") }}</dt>
        <dd>{{ props.runtimePlatform || FALLBACK_TEXT }}</dd>
      </div>
      <div class="about-row">
        <dt>{{ t("settings.about.homepage") }}</dt>
        <dd>
          <code>{{ homepageUrl || FALLBACK_TEXT }}</code>
        </dd>
      </div>
      <div class="about-row">
        <dt>{{ t("settings.about.license") }}</dt>
        <dd>MIT</dd>
      </div>
      <div class="about-row">
        <dt>{{ t("settings.about.feedback") }}</dt>
        <dd>
          <code>{{ issuesUrl || FALLBACK_TEXT }}</code>
        </dd>
      </div>
    </dl>

    <div class="about-actions">
      <button type="button" class="btn-muted" :disabled="!canCheckUpdate" @click="emit('check-update')">
        {{ checkButtonLabel }}
      </button>
      <button
        v-if="canDownloadUpdate"
        type="button"
        class="btn-primary"
        @click="emit('download-update')"
      >
        {{ t("settings.about.downloadUpdate") }}
      </button>
      <button type="button" class="btn-muted" @click="emit('open-homepage')">
        {{ t("settings.about.openHomepage") }}
      </button>
    </div>

    <div v-if="props.updateStatus.state === 'error'" class="about-status about-status--error" role="status">
      <p class="about-status__title">{{ updateErrorMessage }}</p>
      <p class="about-status__next-step">{{ updateErrorNextStep }}</p>
    </div>
    <div v-else-if="props.updateStatus.state === 'checking'" class="about-status about-status--loading" role="status">
      <p class="about-status__title">{{ t("settings.about.checking") }}</p>
      <p class="about-status__next-step">{{ t("settings.about.checkingHint") }}</p>
    </div>
    <div
      v-else-if="props.updateStatus.state === 'upToDate'"
      class="about-status about-status--success"
      role="status"
    >
      {{ t("settings.about.upToDate") }}
    </div>
    <div v-else-if="props.updateStatus.state === 'available'" class="about-status" role="status">
      <p class="about-status__title">
        {{ t("settings.about.updateAvailable", { version: props.updateStatus.version }) }}
      </p>
      <div v-if="props.updateStatus.body" class="about-status__body">
        <p class="about-status__label">{{ t("settings.about.updateBody") }}</p>
        <pre class="about-status__content">{{ props.updateStatus.body }}</pre>
      </div>
    </div>
    <div v-else-if="props.updateStatus.state === 'downloading'" class="about-status about-status--loading" role="status">
      <p class="about-status__title">
        {{ t("settings.about.downloading", { progress: props.updateStatus.progressPercent }) }}
      </p>
      <p class="about-status__next-step">{{ t("settings.about.downloadingHint") }}</p>
      <progress :value="props.updateStatus.progressPercent" max="100"></progress>
    </div>
    <div v-else-if="props.updateStatus.state === 'installing'" class="about-status about-status--loading" role="status">
      <p class="about-status__title">{{ t("settings.about.installing") }}</p>
      <p class="about-status__next-step">{{ t("settings.about.installingHint") }}</p>
    </div>
  </section>
</template>

<style scoped>
.about-app-name {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.about-grid {
  display: grid;
  gap: 10px;
  margin: 0 0 12px;
}

.about-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: baseline;
}

.about-row dt {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.about-row dd {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.about-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.about-status {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.about-status--loading {
  border-color: rgba(55, 204, 138, 0.24);
  background: rgba(55, 204, 138, 0.08);
}

.about-status--success {
  border-color: rgba(55, 204, 138, 0.28);
  background: rgba(55, 204, 138, 0.1);
  color: rgba(55, 204, 138, 0.9);
}

.about-status--error {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.08);
  color: rgba(248, 113, 113, 0.9);
}

.about-status__title {
  margin: 0 0 8px;
  font-weight: 600;
}

.about-status__next-step {
  margin: 0;
}

progress {
  width: 100%;
  height: 8px;
  margin-top: 8px;
  accent-color: #37cc8a;
}

.about-status__label {
  margin: 0 0 6px;
  color: rgba(255, 255, 255, 0.7);
}

.about-status__content {
  margin: 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
