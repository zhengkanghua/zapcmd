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
    class="settings-card settings-section rounded-[16px] border border-[color:var(--ui-settings-card-border)] bg-[var(--ui-settings-card-bg)] overflow-visible"
    :aria-labelledby="resolvedHeadingId"
  >
    <h3
      :id="resolvedHeadingId"
      class="settings-card__title m-0 px-[16px] py-[10px] text-[11px] font-semibold uppercase tracking-[0.8px] text-[var(--ui-settings-card-title)] bg-[rgba(var(--ui-text-rgb),0.015)] border-b border-[color:var(--ui-settings-row-border)]"
    >
      {{ props.label }}
    </h3>
    <slot />
  </section>
</template>
