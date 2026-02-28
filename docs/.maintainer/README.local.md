# Maintainer Index (Local Only)

> Temporary note (development phase): this folder is currently committed to support multi-machine maintainer sync.
> Before public open-source promotion, move this folder back to local-only storage and remove it from the repository.

## Structure

- requirements/: long-lived product/architecture docs
- work/: release runbooks, debugging notes, testing strategy, day-to-day SOP

## Suggested Files

- requirements/ui_product_contract.md
- requirements/ui_design_spec.md
- requirements/architecture_plan.md
- requirements/m0_m4_task_breakdown.md
- work/MAINTAINER_OPEN_SOURCE_PLAYBOOK.local.md
- work/release_runbook.md
- work/testing_strategy.md
- work/manual_regression_m4_release.md
- work/manual_regression_m0_m0a.md
- work/change_checklist.md
- work/dev_engineering_constraints.md
- work/doc_governance.md

## Rule

- Keep public docs in repo (`README*`, `docs/`, `.github/` templates).
- Treat this folder as maintainer-only content and do not reference it from user-facing docs.
- Open-source cleanup gate: remove `docs/.maintainer/**` from tracked repository content before launch promotion.
