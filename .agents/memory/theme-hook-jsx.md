---
name: Theme Hook JSX Extension
description: use-theme hook file must use .tsx extension because it returns JSX from ThemeProvider component.
---

## Rule
`src/hooks/use-theme.tsx` must use the `.tsx` extension (not `.ts`) because `ThemeProvider` returns JSX (`<Context.Provider>`). If generated as `.ts`, Vite/esbuild throws "Expected '>' but found '{'" at the JSX angle bracket.

**Why:** esbuild only parses JSX in `.jsx` / `.tsx` files. A `.ts` file with JSX fails at the transform stage before TypeScript even runs.

**How to apply:** After any subagent creates this file, check the extension. If `.ts`, rename to `.tsx` and restart the frontend workflow to flush Vite's module cache (Vite caches resolved paths by extension and won't pick up the new file without a restart).
