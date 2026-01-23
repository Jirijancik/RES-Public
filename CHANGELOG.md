# Changelog

## 26-01-12

- Add `<CoppyButton />` component with `useClipboard` hook.
- Changed a `<Header />` layout a bit to more modern with centered navigation
- Update Home page features styling

## 26-01-09

- Updated `<Container />` component implementation (unified sizing with screen breakpoints and default tailwindcss `.container` class)
- Updated `<Hero />` component and created brand new `pattern.tsx` and all the patterns will be now part of this file and not the Hero component
- Updated Packages

## 25-11-27

- Add Newsletter
- EsLint - Enforce ESLint stricter rules and fix violations
- Updated all packages to latest versions
- Add a new `spinner` component
- Add `format` fommand into the `package.json`
- Contact form updates:
  - Add field prefixing to prevent conflicts between multiple forms on the same page
  - Move the feedback alert below the form
  - Fix the text wrapping inside the checkbox label

## 25-11-02

- Add `not-found.tsx` (404 page)
- Turnstile - Add dev mode placeholder when API key is missing
- Contact form - Use standard render props pattern and international date format (as timestamp)
- Add `CHANGELOG.md` (this file)

## 25-10-27

- Add statically typed links (new Next.js 16 feature)
- Create new `contact` page and place the contact form there
- Add cards with described features of this template on the `home` page

## 25-10-26

- Add basic SEO - Implemented basic SEO configuration with automatic generation of OG images.
- Fix the shadcn `textarea` so it can be sized with the `rows` prop

## 25-10-26

- Update `AGENTS.md` - to reflect new Next.js 16 upgrade

## 25-10-23

- Upgrade to Next.js 16 - Enable React compiler, switch to Turbopack

## 25-10-21

- Add Cloudflare Turnstile CAPTCHA (using `@marsidev/react-turnstile`)

## 25-10-20

- Add `@svgr/webpack`
- Update `.env.example` (so we have more clear and unified env names)
- New form system - refactored to use new shadcn `Field` component and switched to `@tanstack/react-form` package (previously `react-hook-form`)

## 25-10-06

- Add `AGENTS.md`

## 25-10-03

- Cookie consent (native) - Implemented system for the whole front-end part of the cookie content solution with all the EU compliance requirements. This includes consent banner, settings dialog, server side cookie management, global app context, mechanism for loading third party scripts and enabling them based on the context, compliance policy text etc.

## 25-10-01

- Layout updates, dynamic links, unified config folder
- Add example contact form

## 25-09-30

- Modified dialogs to support scroll when content is too long to fit within the viewport

## 25-09-XX

- Project init (file structure, layout system, header, footer, basic shadcn components, dark mode & theme switcher etc.)
