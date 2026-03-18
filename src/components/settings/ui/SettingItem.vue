<script setup lang="ts">
interface SettingItemProps {
  label: string;
  description?: string;
}

const props = defineProps<SettingItemProps>();
</script>

<template>
  <div class="setting-item">
    <div class="setting-item__body">
      <p class="setting-item__label">{{ props.label }}</p>
      <p v-if="props.description" class="setting-item__description">{{ props.description }}</p>
    </div>
    <div class="setting-item__control">
      <slot />
    </div>
  </div>
</template>
