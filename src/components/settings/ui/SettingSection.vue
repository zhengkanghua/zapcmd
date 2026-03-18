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
  <section class="settings-card settings-section" :aria-labelledby="resolvedHeadingId">
    <h3 :id="resolvedHeadingId" class="settings-card__title">{{ props.label }}</h3>
    <slot />
  </section>
</template>
