import { watch, type Ref } from "vue";
import {
  MOTION_PRESET_REGISTRY,
  resolveMotionPresetMeta
} from "../../features/motion/motionRegistry";

export interface UseMotionPresetOptions {
  presetId: Ref<string>;
}

function applyMotionPreset(id: string): void {
  document.documentElement.dataset.motionPreset = resolveMotionPresetMeta(id).id;
}

export function useMotionPreset(options: UseMotionPresetOptions) {
  watch(
    () => options.presetId.value,
    (id) => applyMotionPreset(id),
    { immediate: true }
  );

  return {
    motionPresets: MOTION_PRESET_REGISTRY
  };
}
