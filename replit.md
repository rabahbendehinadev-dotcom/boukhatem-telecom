# BOUKHATEM TELECOM

Boutique e-commerce professionnelle pour la vente de matériel, outils et pièces détachées de réparation de smartphones en Algérie.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxy at /api)
- `pnpm --filter @workspace/repaire-phone-dz run dev` — run the frontend (managed workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- API: Express 5 + jsonwebtoken + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), drizzle-zod
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle schema (users, products, categories, brands, orders, cart, wishlist, reviews, coupons, banners, settings)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, products, categories, brands, cart, wishlist, orders, reviews, coupons, banners, settings, admin)
- `artifacts/api-server/src/lib/auth.ts` — JWT auth helpers (signToken, requireAuth, requireAdmin, optionalAuth)
- `artifacts/repaire-phone-dz/src/` — React frontend (pages, components)

## Architecture decisions

- JWT auth stored in localStorage on the client; `Authorization: Bearer <token>` header on API calls
- Cart stored in DB per user (not localStorage); synced on login
- All prices stored as numeric strings in PostgreSQL, parsed to float on API responses
- Admin panel at `/admin` — role check on server (`admin` or `staff`), no separate auth
- Mobile-first: bottom navigation bar (5 tabs), mobile header, filter drawer (Sheet from bottom)

## Product

- Homepage: info bar, hero slider, category grid, featured/new/promo products, brands, why-us, reviews, newsletter, footer
- Product listing: filter drawer, sort, pagination — 2 cols mobile / 4 cols desktop
- Product detail: image gallery, add to cart, wishlist, specs, reviews, related products
- Cart: quantity controls, coupon input, order summary
- Checkout: Algerian wilaya picker, address form
- Account: profile, orders, wishlist
- Admin panel: dashboard stats, charts (Recharts), product/category/brand/order/customer/coupon/banner management

## Default admin account

- Email: configured through the development `ADMIN_EMAIL` environment variable
- Password: `password` (bcrypt hash of "password" seeded — change in production)

## User preferences

- Language: French (Algerian market)
- Currency: DZD
- Colors: Primary blue #1a56db, orange #f97316 for CTAs/promotions, dark navy #1e3a5f for headers
- Mobile-first is mandatory — all pages must work perfectly on phones

## Gotchas

- After any schema change in `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking API server
- Orval generates Zod v3 code — use `type: number` (not `type: integer`) in OpenAPI spec to avoid `zod.int()` errors
- The `pnpm-workspace.yaml` catalog pins Zod to `^3.25.76`; do not upgrade to v4 without updating all Zod usage
- Express 5: wildcard routes need names (`/{*splat}`), `req.params.id` is `string | string[]` (always parseInt)
- Cart items stored as JSONB in the `cart` table; couponCode also stored as JSONB (cast to string when reading)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
