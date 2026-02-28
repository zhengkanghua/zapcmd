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
const canDownloadUpdate = computed(
  () => props.updateStatus.state === "available" && props.updateStatus.version.trim().length > 0
);

const checkButtonLabel = computed(() =>
  props.updateStatus.state === "checking" ? t("settings.about.checking") : t("settings.about.checkUpdate")
);
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
      {{ t("settings.about.updateFailed", { reason: props.updateStatus.reason }) }}
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
    <div v-else-if="props.updateStatus.state === 'downloading'" class="about-status" role="status">
      <p class="about-status__title">
        {{ t("settings.about.downloading", { progress: props.updateStatus.progressPercent }) }}
      </p>
      <progress :value="props.updateStatus.progressPercent" max="100"></progress>
    </div>
    <div v-else-if="props.updateStatus.state === 'installing'" class="about-status" role="status">
      {{ t("settings.about.installing") }}
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
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.about-status--success {
  color: rgba(55, 204, 138, 0.9);
}

.about-status--error {
  color: rgba(248, 113, 113, 0.9);
}

.about-status__title {
  margin: 0 0 8px;
  font-weight: 600;
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
