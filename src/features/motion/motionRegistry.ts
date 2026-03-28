export interface MotionPresetMeta {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export const MOTION_PRESET_REGISTRY: ReadonlyArray<MotionPresetMeta> = [
  {
    id: "expressive",
    name: "Expressive",
    description: "保留当前偏弹性、偏氛围化的默认动效",
    badge: "当前默认"
  },
  {
    id: "steady-tool",
    name: "Steady Tool",
    description: "收紧回弹与位移，更像桌面工具的稳态反馈",
    badge: "更稳"
  }
];

export const DEFAULT_MOTION_PRESET_ID = "expressive";

const MOTION_PRESET_META_BY_ID = new Map(
  MOTION_PRESET_REGISTRY.map((preset) => [preset.id, preset] as const)
);

export function resolveMotionPresetMeta(id: string): MotionPresetMeta {
  return MOTION_PRESET_META_BY_ID.get(id) ?? MOTION_PRESET_META_BY_ID.get(DEFAULT_MOTION_PRESET_ID)!;
}
