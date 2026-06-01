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
│       ├── prisma/          # Prisma schema, migrations, seed
│       └── src/
│           ├── index.ts     # Server entry point (Hono app, error handler)
│           ├── config.ts    # Environment configuration
│           ├── lib/         # Cross-cutting helpers
│           │   ├── prisma.ts        # Prisma client singleton
│           │   ├── jwt.ts           # JWT sign/verify
│           │   ├── password.ts      # bcrypt hash/compare
│           │   ├── reset-token.ts   # crypto-secure token + sha256
│           │   └── sanitize.ts      # strip sensitive user fields
│           ├── middleware/
│           │   └── auth.ts          # authenticate + authorize(...roles)
│           ├── validators/          # Zod request schemas
│           │   └── auth.validator.ts
│           ├── routes/
│           │   └── auth.routes.ts   # /register /login /me /logout /forgot-password /reset-password
│           └── types/
│               └── hono.d.ts        # ContextVariableMap (user, handleZodError)
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
- Domain types: `User`, `Department`, `AcademicSession`, `Course`,
  `CourseAssignment`, `Enrollment`, `Result`, `Resource`,
  `ResourceBookmark`, `Announcement`, `ForumPost`, `ForumReply`,
  `Notification`, `AuditLog`, `ApiResponse`, `PaginatedResponse`
- Enums: `UserRole`, `Level`, `Semester`, `ResourceType`, `NotificationCategory`

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

## Database

The API uses Prisma with PostgreSQL. Two connection targets are supported:
**Neon** (primary, production) and a **local PostgreSQL** (secondary,
development).

### First-time setup

1. Create a database:
   ```bash
   createdb eduportal        # local Postgres
   ```
2. Copy the env template and set `DATABASE_URL`:
   ```bash
   cp apps/api/.env.example apps/api/.env
   # edit DATABASE_URL=postgresql://user:pass@host:5432/eduportal?schema=public
   ```
3. Run the initial migration:
   ```bash
   pnpm --filter @eduportal/api db:migrate
   # this applies migrations/ and runs prisma generate
   ```
4. Seed the database with sample data:
   ```bash
   pnpm --filter @eduportal/api db:seed
   ```

### Schema overview

The Prisma schema defines 14 models with full referential integrity:

- **Identity**: `Department`, `User`, `AcademicSession`
- **Academics**: `Course`, `CourseAssignment`, `Enrollment`, `Result`
- **Resources**: `Resource`, `ResourceBookmark`
- **Communication**: `Announcement`, `ForumPost`, `ForumReply`, `Notification`
- **Ops**: `AuditLog`

Enums: `UserRole`, `Level` (L100–L500), `Semester`, `ResourceType`,
`NotificationCategory`.

### Seeded data

Running `db:seed` creates:

- 1 department: Computer Science (CSC)
- 1 academic session: 2024/2025 (current)
- 3 users with hashed passwords (bcrypt, cost 12):
  - **Admin**: `admin@eduportal.com` / `Admin@1234`
  - **Lecturer**: `lecturer@eduportal.com` / `Lecturer@1234` (staffId STF001)
  - **Student**: `student@eduportal.com` / `Student@1234` (matric CSC/2021/001, L300)
- 6 courses spanning L100–L400 across both semesters (CSC101, CSC102,
  CSC201, CSC301, CSC302, CSC401)

### Database scripts (apps/api)

| Script | Description |
|--------|-------------|
| `pnpm db:migrate` | Apply pending migrations (creates dev migration if needed) |
| `pnpm db:reset` | Drop and recreate the database, re-apply migrations, re-seed |
| `pnpm db:seed` | Run the seed script |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Regenerate the Prisma Client |

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

All responses follow the `ApiResponse<T>` envelope:
```ts
{ success: boolean; data?: T; message?: string; errors?: Record<string, string[]> }
```

### Health
- `GET /api/health` — Liveness check returning `{ status, timestamp, uptime }`

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | — | Create a new student or lecturer account |
| `POST` | `/login` | — | Email-or-matric + password → returns `{ user, token }` |
| `POST` | `/forgot-password` | — | Email → generic 200 (no user enumeration); logs reset link to server console |
| `POST` | `/reset-password` | — | Token (from email) + new password |
| `GET`  | `/me` | Bearer | Returns the authenticated user's profile |
| `POST` | `/logout` | Bearer | Logs the user out and writes an audit entry |

#### Password rules
Minimum 8 characters, must contain at least one uppercase letter and one number.

#### Auth middleware
- `authenticate` — extracts `Authorization: Bearer <jwt>`, validates it, sets `c.get('user') = { userId, role }` on the Hono context.
- `authorize('ADMIN' | 'LECTURER' | 'STUDENT', ...)` — guards routes by role; returns 401 if unauthenticated, 403 if the role is not allowed.

#### Example: register a student
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Jane Doe",
    "email": "jane@example.com",
    "password": "Test@1234",
    "matricNumber": "CSC/2026/001",
    "role": "STUDENT",
    "level": "L100",
    "departmentId": "<departmentId>"
  }'
```

#### Example: authenticated request
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@eduportal.com","password":"Admin@1234"}' \
  | python3 -c "import json,sys;print(json.loads(sys.stdin.read())['data']['token'])")

curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me
```

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
- [x] **M1 — Database**: Prisma schema with 14 models and 5 enums,
  initial migration applied, seed script populating department,
  session, 3 users, and 6 courses, Prisma client singleton with
  dev/prod-aware logging
- [x] **M2 — Auth backend**: 6 endpoints (register, login, /me, logout,
  forgot-password, reset-password) with Zod validation, JWT auth, RBAC
  middleware, password hashing (bcrypt, cost 12), secure reset-token
  storage (sha256, 1h expiry), audit logging, and CORS-configured
  Hono app
