# Frontend Redesign: Unified Company-Centric UI

## Context

The app has 3 disconnected frontend experiences: ARES search/detail (`/`, `/subject/[ico]`), Justice search/detail (`/justice`, `/justice/[ico]`), and a scaffold Company search/detail (`/companies/search`, `/companies/[ico]`). The backend already unifies data via a Company hub model seeded by Justice bulk dumps.

**Goal**: Replace all three with a single company-centric flow:
- `/` — unified search against the Company hub (local DB, fast)
- `/company/[ico]` — detail page with information-domain cards (not source-centric)
- Source attribution as small footnotes, not primary navigation
- Sbírka listin as a separate lazy-fetch source (not stored to DB)
- Re-enable Header/Footer with simplified navigation

## Design Principles

1. **Information-centric, not source-centric**: Cards labeled by what info they show (Address, Management, Documents), not by source (ARES, Justice). Source is a small `text-muted-foreground text-xs` footnote at bottom of each card.
2. **Company hub is the catalog**: Justice bulk dumps seed the Company table (~500k Czech firms). Search operates entirely on the local Company hub — no external API calls.
3. **On-demand enrichment**: Detail page loads hub data instantly. ARES + Justice detail data auto-fetches in parallel (DB-backed, fast ~50-100ms). Sbírka listin (documents) is lazy — user clicks "Načíst dokumenty" to fetch (real-time scrape from or.justice.cz, not stored to DB).
4. **Stackable cards, not tabs**: Detail page has independent collapsible cards for each information domain. Cards are additive — user sees all at once, not tabs that are mutually exclusive.

## Information Cards on Detail Page

| Card | Content | Fetch Source | Stored? |
|------|---------|-------------|---------|
| ❶ Company Header | name, ICO, status, legal form, region, court + file ref | Company Hub | ✅ DB |
| ❷ Adresa a sídlo | full address, map, postal code, region/district | ARES `/subjects/` | ✅ DB |
| ❸ Podrobné údaje | VAT, tax office, dates, registration statuses | ARES `/subjects/` (same fetch as ❷) | ✅ DB |
| ❹ Ekonomická činnost | NACE codes list, employee category | ARES `/subjects/` (same fetch as ❷) | ✅ DB |
| ❺ Vedení společnosti | board, management roles with dates | Justice `/entities/{ico}/persons/` | ✅ DB |
| ❻ Zápisy v rejstříku | grouped facts, collapsible by type | Justice `/entities/?ico=` | ✅ DB |
| ❼ Sbírka listin | documents list with load button | or.justice.cz (separate scrape) | ❌ No |
| ❽ Účetní závěrky | balance sheet + P&L (nested inside ❼) | Parsed from ❼ XML | ❌ No |

Cards ❷❸❹ share one ARES fetch. Cards ❺❻ share one Justice fetch. Card ❼ is a separate lazy fetch. React Query deduplicates — opening card ❸ after ❷ is instant from cache.

---

## Step 0: Shared Primitives

### 0A. Skeleton component
**Create** `src/components/ui/skeleton.tsx`
- Simple `div` with `bg-muted animate-pulse rounded-md` and `data-slot="skeleton"`
- Follows the exact pattern of `src/components/ui/spinner.tsx`

### 0B. Shared detail building blocks
**Create** `src/components/company/shared.tsx`
- Extract `CopyableValue` from `src/components/subject/subject-detail.tsx` (lines 36-50)
- Extract `DetailRow` from `src/components/subject/subject-detail.tsx` (lines 52-58)
- Extract `StatusBadge` — the inline active/terminated badge pattern from `subject-detail.tsx` (lines 129-136)
- Extract `formatCzechDate(dateStr)` from `src/components/justice/justice-detail.tsx` (lines 21-26)
- Extract `formatJusticeAddress(addr)` from `src/components/justice/justice-detail.tsx` (lines 28-35)
- New `BackLink` — extracted from `subject-detail.tsx` (lines 250-258), parameterize href

### 0C. Source footer component
**Create** `src/components/company/source-footer.tsx`
- Props: `source: string`, `updatedAt?: string`, `note?: string`
- Renders: subtle separator line + `text-muted-foreground text-xs` footnote
- Pattern: uses `CardFooter` from `src/components/ui/card.tsx`

### 0D. i18n keys
**Modify** `src/locales/cs/forms.json` — add `"company"` section with keys for search (title, description, placeholder, filters, buttons, results), detail (loading, error, notFound, backToSearch), cards (address, details, activity, management, registry, documents, financials — each with title + source label), and header fields
**Modify** `src/locales/en/forms.json` — corresponding English translations

---

## Step 1: Unified Search Page

### 1A. Search form
**Create** `src/components/company/company-search-form.tsx`
- Follow pattern from `src/components/home/ares-search-form.tsx` (TanStack React-Form + Zod)
- Fields: name (text), ICO (8-digit), region (reuse `src/components/home/region-select.tsx`), status (Select: active/inactive/all)
- Collapsible advanced filters panel: legal form, employee category, NACE, revenue range
- Form state drives `CompanySearchParams` passed to parent
- Uses `Field`, `FieldLabel`, `FieldError`, `FieldGroup` from `@/components/ui/field`

### 1B. Result card
**Create** `src/components/company/company-result-card.tsx`
- Follow pattern from `src/components/home/ares-result-card.tsx`
- Receives `CompanySummary` prop, links to `/company/${ico}`
- Shows: name, ICO (mono), legal form, region, employee category, status badge

### 1C. Search results
**Create** `src/components/company/company-search-results.tsx`
- Follow pattern from `src/components/home/ares-search-results.tsx`
- Shows count, 2-col grid of `CompanyResultCard`, pagination (offset/limit), empty state
- Loading state uses `Skeleton` cards

### 1D. Search page orchestrator
**Create** `src/components/company/company-search-page.tsx`
- Container + Hero section (title + description from i18n)
- `useState<CompanySearchParams>` drives `useCompanySearch(params)`
- Renders `CompanySearchForm` + `CompanySearchResults`
- Search is a query (not mutation) — form updates trigger query refetch via params

### 1E. Wire up route
**Modify** `src/app/page.tsx` — replace `<HomePage />` with `<CompanySearchPage />`
**Modify** `src/components/company/index.ts` — add `CompanySearchPage` export

---

## Step 2: Company Detail Page

### 2A. Company header
**Create** `src/components/company/detail/company-header.tsx`
- Data: `useCompanyByIco(ico)` — hub data, instant
- Renders: h1 name, `StatusBadge`, ICO with `CopyableValue`, legal form + region + court/file reference subtitle
- `BackLink` to `/`

### 2B. Address card
**Create** `src/components/company/detail/address-card.tsx`
- Data: receives ARES `AresBusinessRecord` as prop
- Extract from `src/components/subject/subject-detail.tsx` (lines 204-242): map + HeadquartersDetails + DeliveryAddress
- Reuse `src/components/subject/subject-map.tsx` via dynamic import (SSR disabled)
- `SourceFooter` source="ARES"
- Loading: Skeleton for map (h-62.5) + skeleton lines for address

### 2C. Details card
**Create** `src/components/company/detail/details-card.tsx`
- Data: receives ARES `AresBusinessRecord` as prop
- Extract `BasicInfoSection` from `src/components/subject/subject-detail.tsx` (lines 261-319): VAT, tax office, dates
- Collapsible registration statuses section (lines 178-200)
- `SourceFooter` source="ARES"

### 2D. Activity card
**Create** `src/components/company/detail/activity-card.tsx`
- Data: receives ARES `AresBusinessRecord` as prop
- Extract NACE collapsible from `src/components/subject/subject-detail.tsx` (lines 153-175)
- Add employee category display
- `SourceFooter` source="ARES"

### 2E. Management card
**Create** `src/components/company/detail/management-card.tsx`
- Data: `useJusticePersons(ico)` — auto-fetches on mount
- Extract `PersonInfo` from `src/components/justice/justice-detail.tsx` (lines 63-85)
- Group persons by function type, show roles + dates
- `SourceFooter` source="Veřejný rejstřík"

### 2F. Registry card
**Create** `src/components/company/detail/registry-card.tsx`
- Data: `useJusticeEntityByIco(ico)` — auto-fetches on mount
- Extract `FactGroupRow` + `FactCard` from `src/components/justice/justice-detail.tsx` (lines 105-185)
- Grouped facts as collapsible rows by `factTypeName`
- `SourceFooter` source="Veřejný rejstřík"

### 2G. Documents card
**Create** `src/components/company/detail/documents-card.tsx`
- Data: `useJusticeDocuments(ico, enabled)` — lazy, user clicks "Načíst dokumenty"
- Reuse `src/components/justice/justice-document-card.tsx` and `src/components/justice/justice-financial-table.tsx` directly as imports
- 3 states: idle (button), loading (spinner), loaded (document list)
- `SourceFooter` source="Sbírka listin, or.justice.cz" + note="Data se načítají v reálném čase a nejsou ukládána"

### 2H. Detail page orchestrator
**Create** `src/components/company/detail/company-detail-page.tsx`
- Fetches: `useCompanyByIco(ico)` (hub), `useAresSubjectByIco(ico)` (ARES), `useJusticeEntityByIco(ico)` + `useJusticePersons(ico)` (Justice)
- ARES + Justice auto-fetch in parallel (DB-backed, fast ~50-100ms)
- Passes data as props to each card
- Layout: `Container size="xl"` → vertical stack of cards with `space-y-6`
- Cards handle their own loading/empty/error states via skeletons
- If no ARES data: ARES cards show "Data nejsou k dispozici" (not hidden)

### 2I. Route
**Create** `src/app/company/[ico]/page.tsx`
- Follow pattern from `src/app/subject/[ico]/page.tsx`
- `generateMetadata` with `title: "Firma ${ico}"`
- Render `<CompanyDetailPage ico={ico} />`
- Update `src/components/company/index.ts` barrel exports

---

## Step 3: Navigation and Layout

### 3A. Update navigation
**Modify** `src/config/nav-links.ts`
- Change `home.name` to `"Firmy"` (Czech), keep `href: "/"`
- Remove `justice` entry (Justice is now integrated into company detail)
- Keep `legalLinks` and `contact`

### 3B. Re-enable Header/Footer
**Modify** `src/components/layout/layout-centered.tsx`
- Uncomment Header (line 30) and Footer (line 38)
- Add imports: `Header` from `./header`, `Footer` from `./footer`, `navLinksArray` from `@/config/nav-links`
- Change `pt-12` to `pt-0` in the wrapper div (Header handles its own spacing)

### 3C. Update site config
**Modify** `src/config/site.ts`
- `defaultTitle`: `"Registr firem | GTDN"`
- `defaultDescription`: `"Vyhledávání a přehled českých firem z veřejných rejstříků"`

---

## Step 4: Route Redirects

**Modify** `next.config.ts` — add `async redirects()`:
- `/subject/:ico` → `/company/:ico` (permanent 301)
- `/justice/:ico` → `/company/:ico` (permanent 301)
- `/justice` → `/` (permanent 301)
- `/companies/search` → `/` (permanent 301)
- `/companies/:ico` → `/company/:ico` (permanent 301)

---

## Step 5: Cleanup

**Delete** old route pages (only after full verification):
- `src/app/subject/[ico]/page.tsx`
- `src/app/justice/page.tsx`, `src/app/justice/[ico]/page.tsx`
- `src/app/companies/search/page.tsx`, `src/app/companies/[ico]/page.tsx`

**Delete** dead components:
- `src/components/home/home-page.tsx`, `ares-search-form.tsx`, `ares-search-results.tsx`, `ares-result-card.tsx`
- `src/components/company/company-detail.tsx` (old scaffold), `company-search.tsx` (old scaffold)

**Keep** (still imported by new code):
- `src/components/home/region-select.tsx`, `district-select.tsx` — used by new search form
- `src/components/subject/subject-map.tsx` — used by address card
- `src/components/justice/justice-document-card.tsx`, `justice-financial-table.tsx` — used by documents card
- All `src/lib/*` modules — data layer unchanged

---

## Verification

After each step, verify with the dev server (`preview_start`):

1. **After Step 1**: Visit `/` — search form renders, search returns results from Company hub, result cards link to `/company/[ico]`
2. **After Step 2**: Visit `/company/27082440` (known ICO) — header renders instantly, ARES + Justice cards populate in parallel, Sbírka listin shows "Načíst dokumenty" button, financial tables render on expand
3. **After Step 3**: Header/Footer visible on all pages, navigation works, mobile menu works
4. **After Step 4**: Old URLs redirect correctly (test each one)
5. **After Step 5**: `npm run build` succeeds with no TypeScript errors, no dead imports

Run backend tests to confirm no regressions: `docker exec res-django-1 python -m pytest --tb=short -q`

---

## File Inventory

### New files to CREATE (16):
| File | Purpose |
|------|---------|
| `src/components/ui/skeleton.tsx` | Skeleton shimmer primitive |
| `src/components/company/shared.tsx` | CopyableValue, DetailRow, StatusBadge, formatDate, formatAddress |
| `src/components/company/source-footer.tsx` | Data source attribution footer |
| `src/components/company/company-search-form.tsx` | Unified search form |
| `src/components/company/company-result-card.tsx` | Search result card |
| `src/components/company/company-search-results.tsx` | Search results container |
| `src/components/company/company-search-page.tsx` | Search page orchestrator |
| `src/components/company/detail/company-header.tsx` | Page header with hub data |
| `src/components/company/detail/address-card.tsx` | ARES address + map card |
| `src/components/company/detail/details-card.tsx` | ARES detailed info card |
| `src/components/company/detail/activity-card.tsx` | ARES NACE/economic activity card |
| `src/components/company/detail/management-card.tsx` | Justice persons/management card |
| `src/components/company/detail/registry-card.tsx` | Justice facts/registry card |
| `src/components/company/detail/documents-card.tsx` | Lazy sbírka listin card |
| `src/components/company/detail/company-detail-page.tsx` | Detail page orchestrator |
| `src/app/company/[ico]/page.tsx` | New route page |

### Existing files to MODIFY (8):
| File | Change |
|------|--------|
| `src/locales/cs/forms.json` | Add `company.*` i18n keys |
| `src/locales/en/forms.json` | Add `company.*` i18n keys |
| `src/app/page.tsx` | Switch from HomePage to CompanySearchPage |
| `src/components/company/index.ts` | Update barrel exports |
| `src/config/nav-links.ts` | Remove Justice link, rename Home |
| `src/components/layout/layout-centered.tsx` | Uncomment Header/Footer |
| `src/config/site.ts` | Update title/description |
| `next.config.ts` | Add redirects |

### Files to DELETE in cleanup (8):
| File | Reason |
|------|--------|
| `src/app/subject/[ico]/page.tsx` | Replaced by redirect |
| `src/app/justice/page.tsx` | Replaced by redirect |
| `src/app/justice/[ico]/page.tsx` | Replaced by redirect |
| `src/app/companies/search/page.tsx` | Replaced by redirect |
| `src/app/companies/[ico]/page.tsx` | Replaced by redirect |
| `src/components/home/home-page.tsx` | Replaced by CompanySearchPage |
| `src/components/home/ares-search-form.tsx` | No longer used |
| `src/components/home/ares-search-results.tsx` | No longer used |

### Files to KEEP (reused by new code):
| File | Used by |
|------|---------|
| `src/components/subject/subject-map.tsx` | AddressCard |
| `src/components/home/region-select.tsx` | CompanySearchForm |
| `src/components/home/district-select.tsx` | CompanySearchForm |
| `src/components/justice/justice-document-card.tsx` | DocumentsCard |
| `src/components/justice/justice-financial-table.tsx` | DocumentsCard |
| `src/lib/company/*` | All company queries/endpoints/types |
| `src/lib/ares/*` | Spoke data queries |
| `src/lib/justice/*` | Spoke data queries |
