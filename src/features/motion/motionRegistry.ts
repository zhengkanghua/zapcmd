export interface MotionPresetMeta {
  id: string;
}

export const MOTION_PRESET_REGISTRY: ReadonlyArray<MotionPresetMeta> = [
  {
    id: "expressive"
  },
  {
    id: "steady-tool"
  }
];

export const DEFAULT_MOTION_PRESET_ID = "expressive";

const MOTION_PRESET_META_BY_ID = new Map(
  MOTION_PRESET_REGISTRY.map((preset) => [preset.id, preset] as const)
);

export function resolveMotionPresetMeta(id: string): MotionPresetMeta {
  return MOTION_PRESET_META_BY_ID.get(id) ?? MOTION_PRESET_META_BY_ID.get(DEFAULT_MOTION_PRESET_ID)!;
}
