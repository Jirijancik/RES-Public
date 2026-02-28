# Hub-and-Spoke Implementation — Execution Prompt

> **Usage:** Copy everything below the line into a new Claude Code chat window to begin implementation.

---

## Required reading (do this FIRST, before writing any code)

Read these files in full — they contain the complete architecture and step-by-step plan:

1. `docs/plans/2026-02-27-hub-and-spoke-implementation.md` — **THE PLAN** (17 TDD tasks)
2. `docs/plans/2026-02-27-hub-and-spoke-multi-source-design.md` — Architecture design doc (data models, service layer, API contracts)

## Your mission

Execute the implementation plan **task by task**, from Task 1 through Task 17. The plan is organized in two phases:

- **Phase 1 (Tasks 1–11):** Hub-and-Spoke foundation — Company model, FK linking, data migration, 3-tier ARES lookup, service layer, API endpoints, frontend
- **Phase 2 (Tasks 12–17):** Denormalized search fields, multi-parameter search endpoint, search frontend

## TDD workflow (mandatory for every task)

Each task follows **RED → GREEN → REFACTOR**:

1. **RED:** Write the failing test(s) exactly as specified in the plan
2. Run tests — confirm they **fail** for the right reason (import error, missing model, etc.)
3. **GREEN:** Write the minimum implementation to make tests pass
4. Run tests — confirm they **pass**
5. **REFACTOR:** Clean up if needed, ensure linting passes
6. Run migrations if the task added/changed models: `cd backend && python manage.py makemigrations && python manage.py migrate`
7. Move to the next task

## Project context (so you don't waste time exploring)

- **Django project root:** `backend/` — settings at `backend/config/settings/base.py`
- **INSTALLED_APPS:** `core`, `ares`, `justice`, `contacts` — you'll add `company`
- **Test runner:** `pytest` with `pytest-django` — run with `cd backend && python -m pytest <path> -v`
- **Linter:** `ruff` — run with `cd backend && ruff check .`
- **Existing ARES models:** `backend/ares/models.py` — `EconomicSubject` (ico, business_name, raw_data)
- **Existing ARES service:** `backend/ares/services.py` — `AresService` with `search()` and `get_by_ico()`
- **Existing Justice models:** `backend/justice/models.py` — `Entity`, `EntityFact`, `Person`, `Address`, etc.
- **Cache layer:** `backend/core/services/cache.py` — `CacheService` (Redis wrapper)
- **Frontend:** Next.js in `src/` — TypeScript, React Query, Tailwind
- **DB:** PostgreSQL via Docker (`docker-compose.dev.yml`)

## Important rules

1. **Follow the plan exactly.** Each task has specific file paths, test code, and implementation code. Don't improvise the architecture — it was carefully designed.
2. **One task at a time.** Don't batch or skip ahead. Each task builds on the previous one.
3. **Always run tests** after writing them (to see RED) and after implementation (to see GREEN).
4. **Migrations matter.** Any task that modifies models needs `makemigrations` + `migrate`.
5. **Don't modify existing tests** unless the plan explicitly says to.
6. **For Task 6 (AresService rewrite):** This is the largest task. Read the design doc's "Service Layer → AresService" sections carefully before starting. The 3-tier lookup, background refresh, and persistence code are all specified.
7. **Use a todo list** to track progress across all 17 tasks.

## Start

Begin by reading the two plan files listed above, then start with Task 1.
