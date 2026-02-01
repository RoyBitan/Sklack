---
trigger: always_on
---

# Project Architecture & Coding Standards

## Core Principles

- **Clean Architecture:** Maintain the current feature-based folder structure.
- **Service Layer:** All API and Database calls (including Supabase) MUST go
  through the Service Layer. Never call Supabase directly from UI components.
- **Type Safety:** Use strict TypeScript. No 'any'. Ensure all props and data
  models are fully typed.
- **Mobile-First & PWA:** All UI changes must adhere to PWA standards and
  mobile-first responsiveness.

## Component Constraints

- **Size Limit:** Keep components under 200 lines of code.
- **Modularity:** If a component grows, split it into smaller sub-components or
  extract logic into custom Hooks.
- **Styling:** Use `class-variance-authority` (CVA) for all new components.
  Follow the existing design system patterns.

## Testing & Quality

- **Test-Driven Growth:** New features must include tests.
- **Coverage:** Do not regress on test coverage. Test critical paths for every
  new logic added.
