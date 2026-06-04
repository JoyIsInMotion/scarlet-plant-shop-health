# Scarlet — AI Agent Instructions

## Project Overview

Scarlet is a full-stack boutique flower shop application with an embedded plant health tracking feature. It targets Bulgarian users and is fully bilingual (Bulgarian + English). The app allows users to track their personal plant collection, analyze plant health via AI, and shop for flowers.

## Architecture

### Monorepo Structure
- `apps/web` — Next.js 14 App Router: web frontend + REST API backend
- `apps/mobile` — Expo (React Native): mobile client app
- `packages/shared` — shared TypeScript types and Zod validators

### Communication
- **Web → Backend**: Next.js Server Actions (form submissions) + Server Components (data fetching)
- **Mobile → Backend**: RESTful API via Axios client (`apps/mobile/src/api/client.ts`)
- **Authentication**: JWT access tokens (15m) + refresh tokens (7d). Web uses httpOnly cookies. Mobile uses expo-secure-store + Authorization Bearer header.

### Data Layer
- **Database**: Neon serverless PostgreSQL accessed via `@neondatabase/serverless` HTTP driver
- **ORM**: Drizzle ORM — all schema in `apps/web/src/lib/db/schema.ts`
- **Migrations**: `drizzle-kit generate` → commits SQL files → `drizzle-kit migrate`
- **Storage**: Cloudflare R2 (S3-compatible) for all user photos and product images

## Key Concepts

### Two Plant Data Domains
1. **User's Plants** (`plants` table) — personal plant collection owned by a user. Has health score, care stats, photo, and an optional link to the species catalog.
2. **Plant Species Catalog** (`plant_species` table) — global reference database of 500+ species with bilingual names (BG/EN), care guides, and scientific info. Public, admin-managed, AI-enriched.

### AI Plant Analysis
- Route: `POST /api/plants/:id/ai-analysis` (analyzes saved plant) or `POST /api/ai/quick-scan` (ad-hoc photo)
- Provider: Groq `llama-4-scout` via the Groq API (env `GROQ_API_KEY`)
- Returns: species identification (common name, scientific name, family, native region, care difficulty) + health assessment (score 0-100, issues with severity, care recommendations)
- Rate limit: 5 analyses per user per 24 hours (DB-enforced)
- Implementation: `apps/web/src/lib/ai/plant-analyzer.ts`

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Web framework | Next.js 14 (App Router, Server Components, Server Actions) |
| Web styling | Tailwind CSS + class-variance-authority |
| Database | Neon serverless PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Custom JWT (jsonwebtoken + bcryptjs) |
| Storage | Cloudflare R2 via @aws-sdk/client-s3 |
| AI | Groq llama-4-scout (Groq API) |
| i18n (web) | next-intl (BG default, EN secondary) |
| Mobile | React Native + Expo (Expo Router) |
| i18n (mobile) | i18next + react-i18next |
| State (mobile) | Zustand |
| Deployment | Netlify (web) + EAS (mobile) |

## Coding Guidelines

### File Conventions
- All Next.js pages are Server Components by default — add `"use client"` only when needed (event handlers, hooks, browser APIs)
- API routes return `{ success: true, data: T }` or `{ success: false, error: string }` via `src/lib/api/response.ts`
- All text visible to users must use `useTranslations()` (web) or `useTranslation()` (mobile) — no hardcoded strings

### Database
- Never use raw SQL — always use Drizzle query builder
- Use the HTTP-mode Neon driver (`@neondatabase/serverless`) — do NOT use `pg` or connection pooling libraries
- Always run `drizzle-kit generate` after schema changes and commit migration files
- Use batch inserts for seeding (max 500 rows per call)

### Authentication
- Web: read JWT from `access_token` httpOnly cookie
- Mobile: read JWT from Authorization Bearer header
- All protected API routes use `withAuth(handler, options)` wrapper from `src/lib/auth/middleware.ts`
- Never expose `password_hash` in API responses

### i18n
- Bulgarian (`bg`) is the default language
- Translation keys live in `apps/web/messages/bg.json` and `apps/web/messages/en.json`
- Mobile keys mirror web keys in `apps/mobile/src/i18n/bg.json` and `apps/mobile/src/i18n/en.json`
- Use namespace prefixes: `nav.*`, `auth.*`, `plants.*`, `catalog.*`, `shop.*`, `admin.*`, `ai.*`, `common.*`

### Error Handling
- API routes: catch errors, return appropriate HTTP status codes
- Client components: use toast notifications for user-facing errors
- Never show stack traces or internal errors to users

## Sample Credentials

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@scarlet.com | admin123 |
| Demo user | demo@scarlet.com | demo123 |

## Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd scarlet
npm install

# 2. Configure environment
# Create apps/web/.env.local and fill in:
#   DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GROQ_API_KEY,
#   and R2_* credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
#   R2_BUCKET_NAME, R2_PUBLIC_URL)

# 3. Run database migrations
npm run db:migrate

# 4. Seed the database
npm run db:seed

# 5. Start web app
npm run dev:web

# 6. Start mobile app (separate terminal)
npm run dev:mobile
```
