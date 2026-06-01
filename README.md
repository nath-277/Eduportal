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
│           ├── index.ts     # Server entry point (Hono app, error handler, all routers wired)
│           ├── config.ts    # Environment configuration
│           ├── lib/         # Cross-cutting helpers
│           │   ├── prisma.ts        # Prisma client singleton
│           │   ├── jwt.ts           # JWT sign/verify
│           │   ├── password.ts      # bcrypt hash/compare
│           │   ├── reset-token.ts   # crypto-secure token + sha256
│           │   ├── sanitize.ts      # strip sensitive user fields
│           │   ├── response.ts      # ok/created/badRequest/forbidden/notFound/conflict/...
│           │   ├── pagination.ts    # parsePagination + paginated()
│           │   ├── session.ts       # getCurrentSession + requireCurrentSession()
│           │   ├── cloudinary.ts    # uploadBase64 / deleteAsset / signedDownloadUrl
│           │   ├── csv.ts           # parseCsv
│           │   ├── grading.ts       # computeGraded + computeGpa
│           │   └── audit.ts         # writeAudit(c, {...})
│           ├── middleware/
│           │   └── auth.ts          # authenticate + authorize(...roles)
│           ├── validators/          # Zod request schemas
│           │   ├── auth.validator.ts
│           │   ├── user.validator.ts
│           │   ├── course.validator.ts
│           │   ├── enrollment.validator.ts
│           │   ├── result.validator.ts
│           │   ├── resource.validator.ts
│           │   ├── announcement.validator.ts
│           │   ├── forum.validator.ts
│           │   ├── department.validator.ts
│           │   └── analytics.validator.ts
│           ├── routes/
│           │   ├── auth.routes.ts        # /register /login /me /logout /forgot-password /reset-password
│           │   ├── user.routes.ts        # admin user mgmt + self avatar upload
│           │   ├── course.routes.ts      # courses + assignments + lecturer/mine
│           │   ├── enrollment.routes.ts  # student self-service + lecturer roster
│           │   ├── result.routes.ts      # upload (JSON/CSV) + publish + analytics
│           │   ├── resource.routes.ts    # upload + download + bookmarks
│           │   ├── announcement.routes.ts# CRUD + role-targeted fan-out
│           │   ├── forum.routes.ts       # posts, replies, like
│           │   ├── notification.routes.ts# /mine /read /read-all
│           │   ├── analytics.routes.ts   # admin / department / audit-logs
│           │   └── department.routes.ts  # departments + academic sessions
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

### Users (`/api/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/` | ADMIN | Paginated list with `role`, `level`, `departmentId`, `search` filters |
| `GET`  | `/:id` | ADMIN or self | Profile + department + counts (enrollments/results/resources) |
| `PATCH`| `/:id` | ADMIN | Update fullname, level, semester, role, departmentId, isActive, avatarUrl |
| `DELETE`| `/:id` | ADMIN | Soft delete (set `isActive = false`) |
| `PATCH`| `/:id/avatar` | self | Upload base64 image to Cloudinary, store URL |

### Courses (`/api/courses`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/` | — | Filter by `level`, `semester`, `departmentId`; includes assigned lecturers |
| `POST` | `/` | ADMIN | Create a course (code must match `^[A-Z]{2,4}\d{3}$`) |
| `PATCH`| `/:id` | ADMIN | Update course fields |
| `DELETE`| `/:id` | ADMIN | Only if no results linked; cascades assignments + enrollments |
| `POST` | `/:id/assign` | ADMIN | Create `CourseAssignment { lecturerId, session }` |
| `GET`  | `/lecturer/mine` | LECTURER/ADMIN | Courses assigned to the caller in the current session |

### Enrollments (`/api/enrollments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/mine` | STUDENT | Caller's enrollments grouped by semester (current session) |
| `POST` | `/` | STUDENT | Bulk-enroll; max 24 credit units / semester; level + semester must match |
| `DELETE`| `/:courseId` | STUDENT | Drop a course (forbidden if results already published) |
| `GET`  | `/course/:courseId` | LECTURER/ADMIN | Students enrolled in a course (current session) |

### Results (`/api/results`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/mine` | STUDENT | Published results, GPA per semester, CGPA |
| `GET`  | `/course/:courseId` | LECTURER/ADMIN | All students' results for a course |
| `POST` | `/upload` | LECTURER/ADMIN | Bulk JSON upload with validation (enrollment, score range) |
| `POST` | `/upload/csv` | LECTURER/ADMIN | CSV upload (header: `matricNumber,caScore,examScore`) |
| `PATCH`| `/:id/publish` | LECTURER/ADMIN | Mark result published + create student notification |
| `GET`  | `/analytics/student/:studentId` | self / LECTURER / ADMIN | Per-semester GPA trend + CGPA |

Grading: 70+ A (5), 60+ B (4), 50+ C (3), 45+ D (2), 40+ E (1), <40 F (0). GPA = `Σ(gradePoint × creditUnits) / Σ(creditUnits)`.

### Resources (`/api/resources`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/` | — | Filter by `courseId`, `type`, `search`; paginated; includes uploader + course |
| `POST` | `/` | LECTURER/ADMIN | Upload base64 file to Cloudinary; requires Cloudinary env vars |
| `DELETE`| `/:id` | owner or ADMIN | Delete from Cloudinary + DB |
| `POST` | `/:id/download` | Bearer | Increment counter, return signed download URL |
| `POST` | `/:id/bookmark` | STUDENT | Toggle bookmark |
| `GET`  | `/bookmarks/mine` | STUDENT | Caller's bookmarked resources |

### Announcements (`/api/announcements`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/` | Bearer | Filtered by role, scheduled, not expired; sorted pinned DESC then date |
| `POST` | `/` | LECTURER/ADMIN | Create + fan out `Notification` to all targeted users |
| `PATCH`| `/:id` | owner or ADMIN | Update fields |
| `DELETE`| `/:id` | owner or ADMIN | Delete |

### Forum (`/api/forum`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/posts` | — | Filter by `tag`, `search`; includes author, reply count |
| `POST` | `/posts` | Bearer | Create post (tags array) |
| `GET`  | `/posts/:id` | — | Get post + all replies; increments views |
| `POST` | `/posts/:id/replies` | Bearer | Reply; creates notification for post author |
| `PATCH`| `/posts/:id/like` | Bearer | Increment like count |
| `DELETE`| `/posts/:id` | owner / LECTURER / ADMIN | Delete post (cascades replies) |

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/mine` | Bearer | Caller's notifications (unread first) + unread count |
| `PATCH`| `/:id/read` | Bearer | Mark one as read |
| `PATCH`| `/read-all` | Bearer | Mark all of caller's as read |

### Analytics (`/api/analytics`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/admin` | ADMIN | Counts by role, resources, announcements, 20 most recent audit logs |
| `GET`  | `/department` | ADMIN | Per-level student/course counts + average GPA from published results |
| `GET`  | `/audit-logs` | ADMIN | Filter by `userId`, `action`, `startDate`, `endDate`; paginated |

### Departments (`/api/departments`) and Sessions (`/api/sessions`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/departments` | — | List all departments |
| `POST` | `/api/departments` | ADMIN | Create |
| `PATCH`| `/api/departments/:id` | ADMIN | Update |
| `DELETE`| `/api/departments/:id` | ADMIN | Only if no users / courses linked |
| `GET`  | `/api/sessions` | — | List academic sessions |
| `POST` | `/api/sessions` | ADMIN | Create (name `YYYY/YYYY`) |
| `PATCH`| `/api/sessions/:id/set-current` | ADMIN | Atomically unsets previous current + sets this one |

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
- `/` — Marketing landing (hero, animated stats, features, how-it-works, CTA, footer)
- `/login` — Split-screen login (gradient panel + form with identifier, password, remember-me)
- `/register` — 3-step animated multi-step register (account type → personal → password)
- `/forgot-password` — Email-only reset request
- `/reset-password?token=…` — New password (uses `useSearchParams` under Suspense)
- `/student/dashboard` — Placeholder student dashboard (real views in next milestone)
- `/lecturer/dashboard` — Placeholder lecturer dashboard
- `/admin/dashboard` — Placeholder admin dashboard

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
- [x] **M3 — Full REST API**: 10 route modules — users, courses,
  enrollments, results, resources, announcements, forum, notifications,
  analytics, departments/sessions. Zod validation everywhere, RBAC,
  24-unit credit cap, grade computation, CSV upload, Cloudinary file
  storage, role-targeted announcement fan-out, paginated audit logs.
  All 6 spec scenarios (course create, enrollment + credit overflow,
  result upload JSON + CSV + publish + GPA, resource create, announcement
  fan-out, forum post + reply) pass manual curl tests.
- [x] **M4 — Frontend foundation**: API client (Axios + auth interceptor +
  envelope unwrap), Zustand auth store with SSR-safe persist, TanStack Query
  provider, per-role theme system, auth-guard hook, 5 shared UI primitives
  (loading-spinner, page-header, stat-card, empty-state, data-table), and
  layout components (bottom-nav-dock, desktop-sidebar, dashboard-shell).
  tsc, eslint, and build all pass; landing page renders in dev.
- [x] **M5 — Public pages**: full marketing landing (hero, animated stats,
  6-feature grid, 3-step "how it works", CTA, footer), split-screen login,
  3-step animated multi-step register (account type → personal → password
  with strength meter), forgot-password, reset-password (with Suspense +
  useSearchParams), auth route group layout, and placeholder dashboards
  for student/lecturer/admin. All flows end-to-end tested with the running
  API (login by email or matric number, register with L100–L500 level,
  duplicate-email error, forgot-password → API log reset link, reset-password
  with token).
- [x] **M6 — Student portal**: full student experience behind a `(dashboard)`
  route group + role-themable `StudentShell`. Includes:

  - **Backend extensions**:
    - `PATCH /api/users/:id` now allows self-update of `{fullname, avatarUrl}`
      with audit log flagging `self: true`; sensitive fields still require ADMIN.
    - New `POST /api/users/me/change-password` endpoint with zod validation
      (≥8 chars, uppercase, number) and audit log entry.
  - **Config + shell**:
    - `src/config/student-nav.ts` — typed sidebar (7 items) + dock (5 primary
      items with `Menu` icon as expand trigger, 6 expanded items including
      `Logout` action) with type guards and converters.
    - `src/components/layout/student-shell.tsx` — role-themable wrapper
      around `DashboardShell` that handles auth guard + nav conversion +
      logout action.
  - **UI components**:
    - `src/components/ui/charts.tsx` — Framer Motion animated `BarChart`,
      gradient-area SVG `LineChart`, and compact `Sparkline` for GPA trend.
    - Updated `bottom-nav-dock.tsx` and `dashboard-shell.tsx` to support
      full 5-item primary dock (no auto-prepend) and avoid duplicating
      `Logout` in the expanded sheet.
  - **Pages**:
    - `/student/dashboard` — greeting, GPA card w/ sparkline, quick-stats,
      quick-actions, registered-courses horizontal scroll, announcements
      with pin badge, recent resources grid, latest alerts, empty states.
    - `/student/profile` — 96px avatar with hidden file input, level/
      department/matric badges, inline `useForm` edit for fullname,
      `Dialog`-based change-password flow, avatar upload (dataURL → base64).
    - `/student/courses` — session+semester header, unit tracker badge,
      enrolled list with drop, available courses as selectable cards with
      over-limit graying, sticky registration summary sidebar with progress
      bar, confirmation dialog, `window.print()` registration form.
    - `/student/results` — session `Select` + semester tab toggle, summary
      tiles (Semester GPA, CGPA, Total credits), results table with
      grade-color badges, `BarChart` grade distribution, `LineChart` CGPA
      trend from analytics, print result slip.
    - Placeholders: `/student/{resources,forum,notifications,settings}`.
  - **Integration tested with running API**: login → JWT → /me, /results/mine,
    /enrollments/mine, /announcements, /resources, /notifications/mine,
    /results/analytics/student/:id, course drop + re-enroll, fullname
    self-update (success) + role self-update (403) + email self-update (403),
    password change with wrong current (400), weak new (400), success (200),
    and restore. Lecturer side: result upload + publish (creates
    `RESULT` notification) verified end-to-end.
  - **Gates**: tsc 0, eslint 0 errors (12 unused-var warnings remaining),
    `pnpm --filter web build` clean — 18 static routes.
