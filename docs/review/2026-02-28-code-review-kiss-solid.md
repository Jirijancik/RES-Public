# Code Review — KISS & SOLID Best Practices

Date: 2026-02-28  
Scope: currently changed files in workspace

## Summary

The refactor is directionally strong (clearer company-focused flow, better component decomposition, and explicit loading/error/empty states).

Main gaps are concentrated in:
- type-safety bypasses (`as` casts)
- typed-route bypasses
- hardcoded user-facing strings (i18n leakage)
- minor a11y and maintainability cleanup

No blocking compile errors were reported for changed app code during this review pass.

---

## High Impact Findings

### 1) Type safety bypassed via casts
**Why it matters (SOLID/KISS):**
- Violates Interface Segregation / Dependency Inversion intent by silently coupling UI to uncertain data shape.
- Increases hidden runtime risk and makes refactors harder.

**Instances:**
- `src/components/company/detail/activity-card.tsx` — double cast `as unknown as` for `statisticalData`.
- `src/components/company/detail/company-header.tsx` — cast of `company.sources.justice` to `JusticeEntitySummary`.

**Recommendation:**
- Extend/align domain types in `lib/` (single source of truth) and remove UI-layer casts.
- Prefer typed selector helpers in service/parser layer rather than ad-hoc view casts.

---

### 2) Typed routes bypassed
**Why it matters (KISS + correctness):**
- Forced route casts defeat compile-time guarantees from `typedRoutes`.

**Instances:**
- `src/components/company/company-result-card.tsx` — `href={`/company/${company.ico}` as "/"}`
- `src/components/company/shared.tsx` — `href={href as "/"}`

**Recommendation:**
- Use route types directly (or proper `Route` generics) and avoid narrowing everything to `"/"`.

---

## Medium Impact Findings

### 3) Hardcoded user-facing strings in UI
**Why it matters (Single Responsibility + i18n consistency):**
- Presentation components should not own locale literals.
- Hardcoded copy breaks localization completeness and consistency.

**Instances:**
- `src/components/company/source-footer.tsx` — `Zdroj`, `Aktualizováno`
- `src/components/company/detail/management-card.tsx` — `Od`, `Do`, `vymazáno`, `Ostatní`
- `src/components/company/detail/registry-card.tsx` — `Zapsáno`, `Vymazáno`
- `src/components/company/company-result-card.tsx` — `NACE` label

**Recommendation:**
- Move all visible text to translation keys (forms/common namespaces).
- Keep only formatting logic in components.

---

### 4) Decorative icon accessibility inconsistencies
**Why it matters:**
- Decorative icons should explicitly use `aria-hidden="true"` for predictable screen-reader behavior.

**Instances:**
- `src/components/company/detail/company-detail-page.tsx` — `AlertCircleIcon` in not-found alert
- `src/components/company/shared.tsx` — `ArrowLeftIcon` in back link

**Recommendation:**
- Add `aria-hidden="true"` to decorative icons where label text already exists.

---

## Low Impact / Cleanup

### 5) Unused import
- `src/components/company/detail/management-card.tsx` imports `formatJusticeAddress` but does not use it.

### 6) Index-based keys in dynamic lists
**Why it matters:**
- Can lead to unstable reconciliation on reordering.

**Instances:**
- `src/components/company/detail/management-card.tsx` (`PersonEntry key={i}`)
- `src/components/company/detail/registry-card.tsx` (sub-fact and fact mappings)

**Recommendation:**
- Prefer stable identifiers from data (`id`, `documentId`, composite deterministic key) where available.

---

## Positive Notes

- Good decomposition into focused cards and page-level orchestration.
- Loading/empty/error states are consistently handled.
- Route consolidation + redirects improve navigation continuity.
- Shared utility extraction (`shared.tsx`, `source-footer.tsx`) is a good maintainability direction.

---

## Priority Fix Order

1. Remove unsafe casts by fixing domain typing in `lib/`.
2. Remove typed-route bypasses.
3. Move hardcoded strings to i18n dictionaries.
4. Apply a11y icon consistency + cleanup (unused imports, stable keys).
