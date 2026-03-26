<script setup lang="ts">
interface SettingSectionProps {
  label: string;
  headingId?: string;
}

const props = defineProps<SettingSectionProps>();

const resolvedHeadingId =
  props.headingId ?? `setting-section-${Math.random().toString(36).slice(2)}`;
</script>

<template>
  <section
    class="settings-card settings-section rounded-2xl border border-settings-card-border bg-settings-card overflow-visible"
    :aria-labelledby="resolvedHeadingId"
  >
    <h3
      :id="resolvedHeadingId"
      class="settings-card__title m-0 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-settings-card-title bg-[rgba(var(--ui-text-rgb),0.015)] border-b border-b-settings-row-border"
    >
      {{ props.label }}
    </h3>
    <slot />
  </section>
</template>
