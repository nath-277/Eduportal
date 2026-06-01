# EduPortal

A Web-Based Departmental Student Information and Collaborative Resource Portal.

EduPortal is a production-quality monorepo for a university departmental portal,
built with a Next.js frontend and a Hono backend that share TypeScript types
through a workspace package.

## Repository Structure

```
eduportal/
├── apps/
│   ├── web/                 # Next.js 16 App Router frontend
│   │   ├── src/app/         # Routes and layouts
│   │   ├── src/components/  # UI components
│   │   │   └── ui/          # shadcn/ui components
│   │   └── src/lib/         # Utilities (cn helper)
│   └── api/                 # Hono backend on Node.js
│       └── src/
│           ├── index.ts     # Server entry point
│           └── config.ts    # Environment configuration
├── packages/
│   └── shared/              # Shared TypeScript types
│       └── src/types/       # Domain models
├── pnpm-workspace.yaml
├── package.json             # Root workspace scripts
└── README.md
```

## Tech Stack

### Frontend (apps/web)
- Next.js 16 App Router with Turbopack
- React 19
- TypeScript (strict mode)
- TailwindCSS 4
- shadcn/ui (New York style, Neutral base, CSS variables)
- Zustand for client state
- TanStack Query for server state
- React Hook Form + Zod for forms and validation
- Framer Motion for animations
- Axios for HTTP
- lucide-react for icons

### Backend (apps/api)
- Hono on Node.js
- TypeScript (strict mode)
- Prisma ORM
- PostgreSQL (Neon primary, local secondary)
- JWT authentication
- bcryptjs for password hashing
- Cloudinary for file uploads
- Multer for multipart parsing
- Zod for validation

### Shared (packages/shared)
- Domain types: `User`, `Course`, `Result`, `Resource`, `Announcement`,
  `ForumPost`, `Notification`, `ApiResponse`, `PaginatedResponse`
- Role and level enums: `UserRole`, `Level`, `Semester`

## Quick Start

### Prerequisites
- Node.js >= 20.9
- pnpm >= 9

### Install
```bash
pnpm install
```

### Develop
Run both apps in parallel:
```bash
pnpm dev
```

Or run individually:
```bash
pnpm dev:api     # Hono on http://localhost:3001
pnpm dev:web     # Next.js on http://localhost:3000
```

### Build
```bash
pnpm build
```

### Lint
```bash
pnpm lint
```

### Type-check
```bash
pnpm type-check
```

## Environment Variables

Copy the example files and fill in the values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### apps/api/.env
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PORT` | API port (default 3001) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

### apps/web/.env.local
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Base URL of the API |

## API Endpoints

### Health
- `GET /api/health` — Liveness check returning `{ status, timestamp, uptime }`

## Routes

### Web (Next.js App Router)
- `/` — Landing page (Next.js default scaffold)

## Architecture Notes

### Feature-based architecture
Each domain feature (auth, courses, results, resources, etc.) will live in its
own folder under `apps/web/src/features/` and `apps/api/src/features/`,
sharing types from `@eduportal/shared`.

### Server Components
By default, Next.js pages and layouts are React Server Components. Only
components requiring state, effects, or browser APIs receive a `"use client"`
directive at the top of the file.

### Server Actions
Forms and mutations will use Next.js Server Actions whenever possible, with
TanStack Query reserved for complex client-driven data flows.

### Strict TypeScript
Every package enables `strict: true` plus `noUncheckedIndexedAccess`,
`noImplicitOverride`, and `noFallthroughCasesInSwitch`. The shared package is
the single source of truth for cross-package types.

## Development Standards

- TypeScript everywhere — no JavaScript files
- `any` is forbidden
- Server Components by default
- Server Actions for mutations when possible
- Feature-based folder structure
- pnpm for all package management
- No TODO comments, placeholder components, or mock implementations
- Every milestone must pass lint, type-check, build, and manual browser QA
- Commits are required at every successful milestone

## Scripts Reference

### Root
| Script | Description |
|--------|-------------|
| `pnpm dev` | Run all apps in parallel |
| `pnpm dev:web` | Run web only |
| `pnpm dev:api` | Run api only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm type-check` | TypeScript check all apps |

## Milestones

- [x] **M0 — Scaffold**: monorepo, Next.js frontend, Hono backend, shared
  types, shadcn/ui installed, health check endpoint
