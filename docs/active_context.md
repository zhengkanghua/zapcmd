# 短期记忆（2026-04-02）

- ZapCmd：桌面命令器，链路搜索->参数->执行。
- contract：移除 shell 字段；执行为 exec/script；仅保留 binary/shell/env prerequisite。
- 进展：Task1-9 完成；builtin 真源迁 YAML；产物改 builtin JSON+Markdown；check:all 全绿。
- 新增设计：统一 prerequisite 提示语义，拟增 `displayName/resolutionHint`，前端按 `code+metadata` 输出三段式反馈，并兼容旧 `installHint`。
- 新增计划：先打通 schema/runtime mapper 与 execution formatter；system preflight failure 单独收口，builtin metadata 批量补齐放下一迭代。
