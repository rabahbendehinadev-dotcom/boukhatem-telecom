---
name: Admin Auth Architecture
description: Two separate auth systems — storefront JWT vs admin HttpOnly cookie session; key decisions and table layout.
---

## Rule
Admin panel auth is entirely separate from storefront auth. Never mix the two systems.

**Storefront auth:** JWT in localStorage, `users` table, `requireAuth` middleware in `src/lib/auth.ts`.  
**Admin auth:** HttpOnly cookie (`admin_sid` → SHA-256 hash stored in `admin_sessions` table), `requireAdminSession` + `requirePermission(perm)` middleware in `src/lib/admin-auth.ts`.

## Tables (in `lib/db/src/schema/`)
- `admin_users` — id, fullName, username, email, passwordHash, role, permissions[], isActive, mustChangePassword, lastLogin, lastLoginIp
- `admin_sessions` — tokenHash (SHA-256), expiresAt, FK→adminUsers
- `admin_login_attempts` — rate-limit by `email:ip`
- `admin_activity_log` — action log with jsonb old/new values

## Routes
- `POST /api/admin/auth/login` — bcrypt verify, rate limit, sets HttpOnly cookie
- `POST /api/admin/auth/logout` — clears cookie
- `GET /api/admin/auth/me` — returns current admin (used by frontend auth guard)
- `POST /api/admin/auth/change-password`
- All `/api/admin/*` CRUD routes require `requireAdminSession` + `requirePermission("manage_X")`

## Super Admin seed
- Email: `superadmin@repairephonedz.com` (or env var `ADMIN_EMAIL`)
- Password: `Admin@RPDz2024!` (or env var `ADMIN_PASSWORD`)
- Already inserted in DB with `role = 'super_admin'`

## Frontend
- `use-admin-auth.tsx` hook — calls `/api/admin/auth/me` with `credentials: 'include'`
- `/admin/login` page is outside the auth guard
- All other `/admin/*` routes are guarded by `AdminAuthContext`

**Why:** Separating admin sessions from storefront tokens prevents privilege escalation via storefront JWT manipulation and allows independent session expiry, audit logging, and role/permission granularity.
