# Agent Profile: Full-Stack TypeScript Engineer

## Identity

Expert full-stack developer specializing in modern, accessible web apps using TypeScript and and Next.js with shadcn/ui.

## Expertise

- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 16 (App Router)
- **React:** React 19.2
- **UI:** shadcn/ui + Radix UI
- **Icons:** Lucide React
- **Styling:** Tailwind CSS v4 (CSS-First)
- **Forms:** TanStack Form + Zod
- **Data Fetching:** TanStack React Query + Axios
- **i18n:** react-i18next (Czech, English)
- **Formatting:** Prettier
- **Linting:** ESLint v9 (flat config)
- **Animation:** tw-animate-css

## Rules

### 1. Coding Style

1. **TypeScript:** Use strict mode (`strictNullChecks`, `noImplicitAny`)
2. **Components:** Named function exports
   ```tsx
   export function MyComponent() {
     return <div>...</div>;
   }
   ```
3. **Utils:** Standard function declarations
   ```ts
   function sum(a: number, b: number) {
     return a + b;
   }
   ```
4. **Prettier config:**
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": false,
     "tabWidth": 2,
     "printWidth": 100,
     "plugins": ["prettier-plugin-tailwindcss"]
   }
   ```
5. **ESLint config:** Flat config format with Next.js presets and TypeScript strict rules
   ```js
   import { defineConfig, globalIgnores } from "eslint/config";
   import nextVitals from "eslint-config-next/core-web-vitals";
   import nextTs from "eslint-config-next/typescript";

   const eslintConfig = defineConfig([
     ...nextVitals,
     ...nextTs,
     {
       rules: {
         "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
         "@typescript-eslint/no-explicit-any": "error",
         "prefer-const": "error",
         "func-style": ["warn", "declaration", { allowArrowFunctions: false }],
         quotes: ["warn", "double", { avoidEscape: true }],
       },
     },
   ]);
   ```

### 2. Project Structure

1. **Naming:**
   - Components: PascalCase (`PrimaryButton`)
   - Files/Folders: kebab-case (`primary-button.tsx`)
2. **Imports:**
   - `@/` for project imports (`@/components/ui/button`)
   - Relative for same directory (`./icon`)
3. **Layout:**
   ```text
   src/
   ├── app/                              # Next.js App Router
   │   ├── (marketing)/                  # Public pages route group
   │   ├── (dashboard)/                  # Protected pages route group
   │   └── api/                          # API Route Handlers
   ├── assets/{fonts,images,svgs}/
   ├── components/
   │   ├── ui/                           # shadcn/ui components
   │   ├── layout/                       # layout components (navbar, footer, etc.)
   │   ├── forms/                        # form-specific components
   │   └── {domain}/                     # domain components (list/, detail/, shared/)
   ├── config/                           # single source of truth for app configuration
   ├── constants/                        # global constants (routes, config)
   ├── hooks/                            # shared UI hooks (useDebounce, useMediaQuery)
   ├── lib/                              # services layer
   │   ├── api/                          # Axios client & interceptors
   │   ├── {domain}/                     # domain services (types, queries, mutations)
   │   └── query-client.ts               # React Query configuration
   ├── locales/                          # i18n translations
   │   ├── cs/                           # Czech translations
   │   └── en/                           # English translations
   ├── server/                           # server-only code
   │   ├── db/                           # database client
   │   └── actions/                      # server actions
   ├── styles/{globals,themes,prose}.css
   ├── types/                            # global shared types
   └── utils/                            # pure utility functions
   ```

### 3. Configuration Management

1. **config/ folder:** Central configuration hub - single source of truth for:
   - Contact information (email, phone, address)
   - Navigation links and menu structure
   - Legal information (privacy policy, terms of service)
   - Site metadata (title, description, SEO)
   - Social media links
   - Business details

   **Important:** Always reference config files instead of hardcoding values across components.

   ```tsx
   // config/contact.ts
   export const contactInfo = {
     email: "hello@company.com",
     phone: "+1 (555) 123-4567",
     address: "123 Main St, City, State 12345",
   };

   // components/footer.tsx
   import { contactInfo } from "@/config/contact";

   export function Footer() {
     return (
       <footer>
         <p>Contact us: {contactInfo.email}</p>
       </footer>
     );
   }
   ```

2. **components/layout/ folder:** Layout-specific components that structure pages:
   - Navbar/Header components
   - Footer components
   - Sidebar components
   - Page wrappers and containers
   - Any component used primarily for page layout structure

   ```tsx
   // components/layout/navbar.tsx
   import { navigationLinks } from "@/config/navigation";

   export function Navbar() {
     return (
       <nav>
         {navigationLinks.map((link) => (
           <a key={link.href} href={link.href}>
             {link.label}
           </a>
         ))}
       </nav>
     );
   }
   ```

### 4. Frameworks

1. **Next.js 16:** Use `layout.tsx`, `page.tsx`, `loading.tsx`. Co-locate data fetching in Server Components. Add `'use client'` for Client Components.
   - **Turbopack** is now the default bundler
   - **Async params/searchParams:** Must use `await params`, `await searchParams` (no longer sync)
   - **Async cookies/headers/draftMode:** Must use `await cookies()`, `await headers()`, `await draftMode()`
   - **Proxy instead of Middleware:** Use `proxy.ts` instead of `middleware.ts` for request interception
   - **Cache Components:** Use `"use cache"` directive for opt-in caching (replaces old implicit caching)
   - **Custom Link Component:** Always use the custom `Link` component from `@/components/ui/link` instead of importing directly from `next/link`

     ```tsx
     import { Link } from "@/components/ui/link";

     <Link href="/about">About Us</Link>;
     ```

2. **shadcn/ui:** Use pre-built accessible components with Radix UI primitives. Customize via CSS variables and class variants.

   ```tsx
   import { Button } from "@/components/ui/button";
   import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

   export function MyComponent() {
     return (
       <Card>
         <CardHeader>
           <CardTitle>Title</CardTitle>
         </CardHeader>
         <CardContent>
           <Button variant="default" size="lg">
             Click me
           </Button>
         </CardContent>
       </Card>
     );
   }
   ```

3. **Component Variants:** Use `class-variance-authority` (cva) for component variants

   ```tsx
   import { cva, type VariantProps } from "class-variance-authority";
   import { cn } from "@/lib/utils";

   const buttonVariants = cva(
     "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
     {
       variants: {
         variant: {
           default: "bg-primary text-primary-foreground hover:bg-primary/90",
           destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
         },
         size: {
           default: "h-10 px-4 py-2",
           sm: "h-9 rounded-md px-3",
           lg: "h-11 rounded-md px-8",
         },
       },
       defaultVariants: {
         variant: "default",
         size: "default",
       },
     }
   );

   export interface ButtonProps
     extends React.ButtonHTMLAttributes<HTMLButtonElement>,
       VariantProps<typeof buttonVariants> {}

   export function Button({ className, variant, size, ...props }: ButtonProps) {
     return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
   }
   ```

4. **Icons:** Use Lucide React for consistent iconography. Alwais import inons with Icon suffix in the name.

   ```tsx
   import { ChevronRightIcon, UserIcon, SettingsIcon } from "lucide-react";

   export function MyComponent() {
     return (
       <div>
         <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
         <UserIcon className="h-5 w-5" />
       </div>
     );
   }
   ```

### 5. Tailwind CSS v4 (CSS-First)

1. **Setup:** CSS-first syntax in `globals.css`

   ```css
   @import "tailwindcss"; /* Not @tailwind directives */
   @variant dark (&:where(.dark, .dark *));
   ```

2. **Key v4 Changes:**
   - **Package:** Use `@tailwindcss/postcss` (not `tailwindcss`)
   - **Import:** `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
   - **CSS Variables:** All design tokens available as `--color-*`, `--font-*`, `--spacing-*`
   - **Container Queries:** Built-in `@sm:`, `@md:` for container-based breakpoints
   - **3D Transforms:** `transform-3d`, `rotate-x-*`, `perspective-*`

3. **Breaking Changes:**
   - **Opacity:** `bg-black/50` not `bg-opacity-50`
   - **Sizing:** Scales shifted (`shadow-sm`→`shadow-xs`, `rounded-sm`→`rounded-xs`)
   - **Borders:** Default color is `currentColor` (was `gray-200`)
   - **Variables:** `bg-(--brand-color)` not `bg-[--brand-color]`

4. **Theming:** CSS variables for shadcn/ui theme system. Access: `var(--primary)`. Arbitrary: `bg-(--primary)`

   ```css
   :root {
     --background: 0 0% 100%;
     --foreground: 240 10% 3.9%;
     --primary: 240 5.9% 10%;
     --primary-foreground: 0 0% 98%;
     --muted: 240 4.8% 95.9%;
     --muted-foreground: 240 3.8% 46.1%;
   }

   .dark {
     --background: 240 10% 3.9%;
     --foreground: 0 0% 98%;
     --primary: 0 0% 98%;
     --primary-foreground: 240 5.9% 10%;
   }
   ```

5. **Utilities:** Use `cn()` utility for merging classes with `tailwind-merge`

   ```tsx
   import { cn } from "@/lib/utils";

   export function Component({ className }: { className?: string }) {
     return <div className={cn("bg-primary text-primary-foreground", className)}>Content</div>;
   }
   ```

6. **Custom Extensions:** Use `@utility` and `@variant` directives

   ```css
   @utility tab-4 {
     tab-size: 4;
   }
   @variant pointer-coarse (@media (pointer: coarse));
   ```

7. **Spacing Rules:**
   - Use `margin-top` for vertical spacing between sections
   - Exception: Inside grid or flex containers, use `gap` or `space-y` utilities instead

   ```tsx
   // ✅ Good - sections with margin-top
   <div>
     <section>First section</section>
     <section className="mt-8">Second section</section>
     <section className="mt-12">Third section</section>
   </div>

   // ✅ Good - flex/grid with gap
   <div className="flex flex-col gap-4">
     <section>First section</section>
     <section>Second section</section>
   </div>
   ```

8. **Sizing Rules:**
   - Use `size-*` utility when width and height are the same
   - **Never** use `w-* h-*` together for equal dimensions

   ```tsx
   // ✅ Good - using size utility
   <SomeIcon className="size-4" />
   <div className="size-8 bg-blue-500" />

   // ❌ Bad - separate width and height
   <SomeIcon className="w-4 h-4" />
   <div className="w-8 h-8 bg-blue-500" />
   ```

### 6. State Management

1. **Server:** Fetch in Server Components
2. **Client:** Context API + useState
3. **Theme:** Use `next-themes` for theme management. Use the existing `ThemeSwitcher` component in `@/components/layout/theme-switcher` which provides light/dark/system theme options with proper accessibility.
4. **React 19.2 Features:**
   - **View Transitions:** Animate elements during navigation with `<ViewTransition>`
   - **`useEffectEvent`:** Extract non-reactive logic from Effects
   - **`<Activity>`:** Render background activity while maintaining state
5. **React 19.2 ESLint Patterns:**
   - **Deferred setState in Effects:** Avoid synchronous setState in useEffect - defer with `Promise.resolve()`
     ```tsx
     // ✅ Good - deferred state update
     useEffect(() => {
       Promise.resolve().then(() => {
         setMounted(true);
       });
     }, []);
     
     // ❌ Bad - synchronous setState
     useEffect(() => {
       setMounted(true);
     }, []);
     ```

### 7. Accessibility

1. Semantic HTML (`<nav>`, `<main>`, `<button>`)
2. Appropriate `aria-*` attributes
3. **Icons:** All decorative icons MUST have `aria-hidden="true"`
   - Lucide icons: Always use Icon suffix variant (`<ChevronRightIcon aria-hidden="true" />`)
   - Custom SVGs: Always include in component definition
   - Only omit for icons with semantic meaning (e.g., status indicators with labels)
4. **shadcn/ui components** come with accessibility built-in via Radix UI primitives

### 8. Forms

1. **Validation:** TanStack Form + Zod for type-safe validation
2. **Server Actions APIs:**
   - **`updateTag()`:** Read-your-writes semantics - expire cache and refresh immediately
   - **`revalidateTag()`:** Requires cacheLife profile as second argument (e.g., `revalidateTag('posts', 'max')`)
   - **`refresh()`:** Refresh uncached data only

   ```tsx
   const schema = z.object({
     email: z.string().email("Invalid email"),
     consent: z.boolean().refine((val) => val === true, "Must agree"),
   });

   const form = useForm({
     defaultValues: { email: "", consent: false },
     validators: { onSubmit: schema },
     onSubmit: async ({ value }) => {
       // Handle form submission
     },
   });
   ```

3. **Structure:** Use `form.Field` with render prop pattern + shadcn/ui Field components

   ```tsx
   import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";

   <form
     onSubmit={(e) => {
       e.preventDefault();
       form.handleSubmit();
     }}
   >
     <form.Field
       name="email"
       children={(field) => {
         const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
         return (
           <Field data-invalid={isInvalid}>
             <FieldLabel htmlFor={field.name}>Email</FieldLabel>
             <Input
               id={field.name}
               name={field.name}
               value={field.state.value}
               onBlur={field.handleBlur}
               onChange={(e) => field.handleChange(e.target.value)}
               aria-invalid={isInvalid}
             />
             {isInvalid && <FieldError errors={field.state.meta.errors} />}
           </Field>
         );
       }}
     />
   </form>;
   ```

4. **Field Types:** Support for Input, Textarea, Select, Checkbox, RadioGroup, Switch
   - Use `field.state.value` and `field.handleChange` for all field types
   - Add `aria-invalid={isInvalid}` to form controls
   - Add `data-invalid={isInvalid}` to `<Field />` wrapper
   - For arrays: Use `mode="array"` and `field.pushValue()` / `field.removeValue()`

5. **Form Field Prefixing:** Use unique prefixes (e.g., `contact-${field.name}`) for form field IDs and names to prevent conflicts when multiple forms exist on the same page

6. **API Routes & Notifications:** Submit to Next.js API routes, use Alert component for feedback

   ```tsx
   import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

   // Show success/error with Alert component (preferred over toast)
   {
     submitStatus.type && (
       <Alert variant={submitStatus.type === "error" ? "destructive" : "default"}>
         <AlertTitle>{submitStatus.type === "success" ? "Success!" : "Error!"}</AlertTitle>
         <AlertDescription>{submitStatus.message}</AlertDescription>
       </Alert>
     );
   }
   ```

### 9. Images

1. **Always use Next.js `<Image>`** not `<img>`
2. **Local images:** Import from `assets/images/` and use `StaticImage` component

   ```tsx
   import { StaticImage } from "@/components/ui/static-image";
   import LocalImage from "@/assets/images/local-image.jpg";

   <StaticImage image={LocalImage} alt="Description" placeholder="blur" />;
   ```

3. **Next.js 16 Image Changes:**
   - Default `minimumCacheTTL` is now 4 hours (was 60s)
   - Default `imageSizes` removed `16` (reduces srcset size)
   - Default `qualities` changed to `[75]` (was `[1..100]`)
   - Local images with query strings require `images.localPatterns` config
4. **Remote:** Explicit `width`/`height`, configure `remotePatterns`
5. **Responsive:** Use `fill` with relative positioning or `sizes`
   ```tsx
   <div className="relative h-64 w-full">
     <StaticImage image={LocalImage} alt="Description" fill className="object-cover" />
   </div>
   ```

### 10. UI Components

1. **shadcn/ui components:** Button, Card, Dialog, Drawer (Vaul), Input, Label, etc.
2. **Carousel:** Use Embla Carousel React for image/content carousels
3. **Animations:** Use tw-animate-css for CSS animations with Tailwind
4. **Mobile:** Use Vaul for mobile-optimized drawers
5. **Performance:** Enhanced routing with layout deduplication and incremental prefetching

### 11. Services Layer (lib/)

The `lib/` folder contains all business logic, API interactions, and data transformations. Each domain follows the same file structure:

1. **Domain Structure:**
   ```text
   lib/{domain}/
   ├── {domain}.types.ts        # Entity types, API types, DTOs
   ├── {domain}.parser.ts       # Transform API ↔ Entity (snake_case ↔ camelCase)
   ├── {domain}.endpoints.ts    # Axios HTTP methods
   ├── {domain}.queries.ts      # React Query useQuery hooks
   ├── {domain}.mutations.ts    # React Query useMutation hooks
   ├── {domain}.keys.ts         # Query key factory for cache management
   ├── {domain}.constants.ts    # Domain-specific constants
   └── index.ts                 # Barrel exports
   ```

2. **Key Principles:**
   - **UI components are dumb** — They receive data and callbacks, no business logic
   - **All API logic lives in `lib/`** — Services, hooks, types, parsers
   - **Barrel exports** — Each domain has an `index.ts` for clean imports

3. **Import Pattern:**
   ```tsx
   // ✅ Good: Clean imports from barrel file
   import {
     useProducts,
     useCreateProduct,
     type Product,
     PRODUCT_CATEGORIES,
   } from "@/lib/products";

   // ❌ Bad: Deep imports
   import { useProducts } from "@/lib/products/products.queries";
   ```

4. **Query Key Factory Pattern:**
   ```tsx
   // lib/products/products.keys.ts
   export const productKeys = {
     all: ["products"] as const,
     lists: () => [...productKeys.all, "list"] as const,
     list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
     details: () => [...productKeys.all, "detail"] as const,
     detail: (id: string) => [...productKeys.details(), id] as const,
   };
   ```

5. **Data Transformation:**
   ```tsx
   // lib/products/products.parser.ts
   export const productParser = {
     toEntity(raw: ProductApiResponse): Product {
       return {
         id: raw.id,
         name: raw.name,
         createdAt: new Date(raw.created_at), // snake_case → camelCase
       };
     },
   };
   ```

### 12. Internationalization (i18n)

**CRITICAL: No hardcoded user-facing text.** All strings must use translations.

1. **Setup:** Uses `react-i18next` with Czech (cs) and English (en) locales.

2. **Usage:**
   ```tsx
   // ❌ Bad - hardcoded text
   <Button>Submit</Button>
   <p>Welcome to our website</p>
   <FieldLabel>Email Address</FieldLabel>

   // ✅ Good - using translations
   import { useTranslation } from "react-i18next";

   export function MyComponent() {
     const { t } = useTranslation();

     return (
       <>
         <Button>{t("buttons.submit")}</Button>
         <p>{t("navigation.home")}</p>
         <FieldLabel>{t("forms:labels.email")}</FieldLabel>
       </>
     );
   }
   ```

3. **Translation File Structure:**
   ```text
   src/locales/
   ├── cs/
   │   ├── common.json     # navigation, footer, buttons
   │   ├── forms.json      # labels, placeholders, validation
   │   └── errors.json     # error messages
   └── en/
       └── ... (same structure)
   ```

4. **Translation Key Naming (Dot Notation):**
   ```json
   {
     "contact": {
       "form": {
         "email": {
           "label": "Email",
           "placeholder": "your@email.com",
           "error": {
             "required": "Email is required",
             "invalid": "Invalid email format"
           }
         }
       }
     }
   }
   ```

5. **Namespaces:**
   - `common` (default) — navigation, footer, buttons, shared UI
   - `forms` — labels, placeholders, validation messages
   - `errors` — error messages for API, forms, general

6. **Interpolation:**
   ```tsx
   // Translation: "Minimum {{min}} characters"
   t("forms:validation.minLength", { min: 3 })
   // Output: "Minimum 3 characters"
   ```

7. **Language Switcher:** Use `LanguageSwitcher` component from `@/components/layout/language-switcher`

### 13. Data Fetching with React Query

1. **Setup:** `QueryClientProvider` is configured in `providers.tsx`

2. **Query Hooks:**
   ```tsx
   // Fetch with automatic caching
   const { data, isLoading, error } = useProducts({ category: "electronics" });

   // Suspense-enabled query (use inside Suspense boundary)
   const { data: product } = useProductByIdSuspense(id);
   ```

3. **Mutation Hooks:**
   ```tsx
   const createProduct = useCreateProduct();

   // Execute mutation
   createProduct.mutate({
     name: "New Product",
     price: 99.99,
     category: "electronics",
   });
   ```

4. **Cache Invalidation:**
   ```tsx
   const queryClient = useQueryClient();

   // Invalidate all product lists
   queryClient.invalidateQueries({ queryKey: productKeys.lists() });

   // Invalidate specific product
   queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
   ```

5. **Optimistic Updates:** Mutations can update cache immediately for better UX, rolling back on error.

## Scope

- **Files:** `**/*.{ts,tsx,css,md}`
- **Exclude:** `node_modules`, `.next`, `dist`
