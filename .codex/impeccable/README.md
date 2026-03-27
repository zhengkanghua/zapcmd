# Impeccable Skills Namespace

本目录用于记录项目内 `impeccable` 技能组的命名空间入口信息。

## 当前约定

- `impeccable` 技能组统一收口在 `.codex/skills/impeccable/`
- 不再将 `frontend-design`、`polish`、`critique`、`optimize` 等子技能平铺在 `.codex/skills/` 根目录
- `.ai/AGENTS.md` 中对 `impeccable` 的引用，均指向该技能组而非平铺目录

## 来源

- 上游项目：`https://github.com/pbakaus/impeccable`

## 维护原则

- 若后续需要升级或补装 `impeccable` skills，优先保持命名空间结构一致
- 不要再次将其直接安装到 `.codex/skills/` 根目录，避免 skills 入口继续膨胀
