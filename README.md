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
- [x] **M6b — Student engagement pages**: full resource library, discussion
  forum, and notifications pages. Includes:

  - **Resource Library** (`/student/resources`):
    - Search bar (debounced 300ms) searching title/description.
    - Filter chips: All, Lecture Notes, Past Questions, Assignments,
      Textbooks, Bookmarked (uses `?saved=true` query param).
    - Course filter dropdown (all courses fetched from API).
    - Responsive grid (1/2/3 cols) with Framer Motion staggered animations.
    - Card: file-type icon (PDF red, DOCX blue, etc.), title, course code
      badge, uploader name, date, download count, file size, bookmark
      toggle (Bookmark ↔ BookmarkCheck), download button.
    - `POST /api/resources/:id/download` returns signed URL → opens in new tab.
    - `POST /api/resources/:id/bookmark` toggles; bookmark set cached via
      `setQueryData` for instant UI.
    - Empty state distinguishes "no bookmarks" from "no matches".
  - **Discussion Forum** (`/student/forum` and `/student/forum/[postId]`):
    - List view: animated card stack, search, category chips
      (All/Questions/Resources/General/Announcements).
    - Floating action button (bottom-right, 56px, primary) opens a
      `Sheet` (bottom-side, max-w-lg centered on desktop) with title,
      body (min 20 chars), tag chips (Enter/comma to add) + tags field,
      validation, optimistic close on success.
    - Cards: author avatar + name + Lecturer/OP badges + Pin badge, title
      (linked to detail), 2-line body preview, tag chips, like + reply
      counts. `PATCH /api/forum/posts/:id/like` increments likes.
    - Post detail: full body, tag chips, like button, threaded replies
      (OP badge, Lecturer badge), reply compose (RHF + Zod-style
      validation), back-to-forum link. Empty replies state.
    - Search: `?search=…` and `?tag=…` filter on the list endpoint.
  - **Notifications** (`/student/notifications`):
    - Header: total count, "Mark all read" button (visible when unread > 0).
    - Tabs: All | Unread | Announcements | Results | Resources with badges.
    - Date-grouped sections: Today, Yesterday, This Week, Earlier.
    - Each row: category icon (ANNOUNCEMENT/RESULT/RESOURCE/FORUM/SYSTEM
      with distinct tone), title, message, time-ago. Unread items have
      a primary left border + tinted background + dot.
    - Optimistic mark-read on click (per-item button + auto-mark on link
      click). Mark-all uses optimistic cache update with rollback.
    - `useQuery` refetchInterval 60s for live count.
  - **Dock + shell badge**:
    - `StudentShell` polls `/api/notifications/mine` every 60s and
      passes `notificationCount` to `DashboardShell`.
    - `DashboardShell` now attaches the unread badge to the bottom dock
      "Alerts" item AND shows a bell badge in the desktop header.
    - `BottomNavDock` `NavItem` extended with optional `badge: number`,
      rendered as a small pill on the icon (both in primary dock and
      expanded sheet).
  - **Shared**:
    - New `ui/textarea.tsx` (shadcn-style, `field-sizing-content` for
      auto-resize, focus ring, invalid styles).
    - `ui/page-header.tsx` `subtitle` widened from `string` to `ReactNode`.
  - **Integration tested**: 4 resources, 3 forum posts, 5 notifications
    seeded; full flows verified — filter by type, search, bookmark
    toggle (200 → 200 with bookmarked bool), download returns signed
    URL, forum post create + reply (creates FORUM notification) + like
    (PATCH), notifications mark-one + mark-all + 404 on others' ids.
  - **Gates**: tsc 0, eslint 0 errors (9 unused-var warnings), build
    clean — 19 routes (added `/student/forum/[postId]` as dynamic).
- [x] **M7 — Lecturer portal**: full lecturer experience with role-specific
  navigation, shell, and six first-class pages, on a green/teal theme
  (`--primary: 160 84% 39%` emerald, `--accent: 173 80% 40%` teal):

  - **Shell + nav**:
    - New `apps/web/src/config/lecturer-nav.ts` exports
      `lecturerSidebarItems` (8 entries: Dashboard, My courses, Results,
      Resources, Announcements, Discussions, Analytics, Profile) and
      `lecturerDockPrimary` (5 entries) + `lecturerDockExpanded` (6).
      Type-guarded unions (`NavLink | NavAction`) keep action items
      (Logout) out of the page-routing sidebar.
    - New `components/layout/lecturer-shell.tsx` mirrors `StudentShell`:
      auth + role guard, Emerald/Teal CSS-var theme via `useRoleTheme`,
      polls `/api/notifications/mine` every 60s, passes
      `notificationCount` to `DashboardShell` for the dock bell badge.
  - **Lecturer Dashboard** (`/lecturer/dashboard`): 3-column desktop,
    stacked mobile.
    - Left: 4 stat cards (assigned courses, total students enrolled
      across them, uploaded resources, pending uploads) + a list of
      assigned courses with per-course enrollment counts via
      `Promise.all` parallelized `enrollments/course/:id` lookups.
    - Center: 6-bar `BarChart` of recent-upload trend + a "Recent
      uploads" mini-list.
    - Right: 3 pinned/recent announcements + a 5-row notifications
      panel.
  - **My Courses** (`/lecturer/courses`): 1/2-col responsive grid of
    course cards (code, title, level, semester, credit units,
    enrolled count) with three actions per card:
    - "View students" → bottom `Sheet` (max-w-lg centered on desktop)
      listing enrolled students with avatar, matric, level badge.
    - "Results" → `/lecturer/results/upload?courseId=…&semester=…`.
    - "Resource" → `/lecturer/resources/upload?courseId=…`.
  - **Upload Results wizard** (`/lecturer/results/upload`): 4-step
    `StepBar` (Context → Method → Enter scores → Preview & submit).
    - **Step 1 — Context**: course select (assigned courses only),
      current session display, semester radio (FIRST/SECOND).
    - **Step 2 — Method**: 3 cards (Manual entry, CSV upload,
      Spreadsheet import — UI only for spreadsheet).
    - **Step 3a — Manual entry**: pre-populated from
      `enrollments/course/:id` students; per-row CA (0-40) + Exam
      (0-60) inputs; live `total` and `grade` with `GRADE_TONE` color
      (A emerald, B teal, C blue, D amber, E orange, F red);
      remove-row, validation error borders. Submit calls
      `POST /api/results/upload`; success state shows
      `inserted/updated/failed` summary.
    - **Step 3b — CSV upload**: drag-and-drop dropzone, template
      download link, validation errors list, calls
      `POST /api/results/upload/csv`.
    - **Step 4 — Preview**: read-only summary before submit.
    - All 4 steps wrapped in `useSearchParams`-safe `<Suspense>` for
      Next 16 prerender.
  - **Upload Resources** (`/lecturer/resources/upload`): form with
    title, description, type (`LECTURE_NOTE|PAST_QUESTION|…`),
    optional course, and a drag-and-drop dropzone accepting
    PDF/DOCX up to 10MB. File is read via `FileReader` with
    `onprogress`-based progress bar; submit base64-encodes and
    POSTs to `/api/resources` (requires Cloudinary). My-uploads
    table below with delete (`DELETE /api/resources/:id`).
    **Cloudinary note**: with `CLOUDINARY_*` env unset the API
    returns 400; form/validation flows are testable end-to-end
    without it.
  - **Announcements** (`/lecturer/announcements`): collapsible
    composer form with title, body, audience radio (Everyone /
    Students / Lecturers / Admins), pin toggle, schedule toggle
    (publish-at + expires-at datetime pickers). Below: full list
    (own + departmental) with per-row expand/collapse for long
    bodies, pin/unpin (`PATCH /api/announcements/:id`),
    delete-with-confirm (`DELETE /api/announcements/:id`).
    Pinned + audience + scheduled badges; `timeAgo` timestamps;
    avatar fallback initials.
  - **Course Analytics** (`/lecturer/analytics`): course selector
    (assigned only) + 4 stat cards (students scored, average CA,
    average exam, average total) + 2 charts:
    - **Grade distribution**: 6-bar `BarChart` (A-F) with legend.
    - **Total score spread**: `LineChart` (lowest-to-highest
      sorted).
    - Sortable, animated table with matric, name, CA, exam, total,
      grade badge, and Published/Draft status. Empty state with
      CTA linking to upload wizard.
  - **Shared fixes**:
    - `useSearchParams` now wrapped in `<Suspense>` everywhere
      (Next 16 requirement).
    - `lecturer-nav.ts` deduplicated the `BarChart3` icon for the
      Analytics sidebar item (`LineChart` icon, not `BarChart3`,
      to avoid colliding with another entry).
    - `app/(dashboard)` route group now owns the entire
      authenticated experience (student + lecturer + admin).
  - **Integration tested**:
    - Login as lecturer → 3 courses returned by
      `/api/courses/lecturer/mine`.
    - Enrollments seeded for 4 students × 6 courses (Prisma upsert)
      to support the result-upload flow.
    - `POST /api/results/upload` with 4 manual entries: returned
      `inserted: 4, updated: 0, failed: 0`. Bad-matric path
      returned `failed: 1, errors: [{ reason: 'Student not found' }]`.
    - `POST /api/results/upload/csv`: 4 rows parsed and inserted.
    - `POST /api/announcements` with `targetRole: STUDENT`:
      returned 201, `notified: 4`. Validation (too-short title) and
      authz (student trying to create → 403) all correct.
    - `PATCH /api/results/:id/publish`: returned 200, and the
      student's `/api/notifications/mine` now contains a fresh
      `RESULT` notification. `DELETE /api/announcements/:id` round-trips
      cleanly. Resource upload correctly 400s on missing Cloudinary
      config (UI surfaces the message).
  - **Gates**: tsc 0, eslint 0 errors (11 warnings, all pre-existing
    `react-hooks/incompatible-library` patterns from RHF `watch()` +
    1 useMemo dep array), `pnpm --filter web build` clean — 23 routes
    (added 6 lecturer pages, all under `(dashboard)` route group).
- [x] **M8 — Admin portal**: complete administrative experience
  with role-specific navigation, shell, and seven first-class
  pages, on a purple/indigo theme (`--primary: 271 91% 65%` purple,
  `--accent: 263 70% 50%` indigo).
  - **Shell + nav**:
    - Moved existing admin dashboard from
      `apps/web/src/app/admin/dashboard/page.tsx` →
      `apps/web/src/app/(dashboard)/admin/dashboard/page.tsx` via
      `git mv`; old `/app/admin/` directory deleted.
    - New `apps/web/src/config/admin-nav.ts` exports
      `adminSidebarItems` (9 entries: Dashboard, Users, Departments,
      Courses, Results, Announcements, Forum, Audit logs, Settings)
      and `adminDockPrimary` (5) + `adminDockExpanded` (6).
      `toSidebarItems` + `toDockItems` converters enforce type
      safety between `(NavLink | NavAction)` and
      `(DockPrimaryItem | DockExpandedItem)`.
    - New `components/layout/admin-shell.tsx` mirrors
      `StudentShell`/`LecturerShell`: auth + role guard,
      Purple/Indigo CSS-var theme via `useRoleTheme`, polls
      `/api/notifications/mine` every 60s.
  - **Charts component** (`components/ui/charts.tsx`):
    - Added custom SVG-based `PieChart` (no Recharts dependency) —
      donut with `stroke-dasharray`, slice offsets computed in
      a non-mutating `slice` derivation, Framer-Motion fade-in
      stagger, optional animated center label/value, and a
      side legend with percentages. Used by analytics + logs.
  - **Admin Dashboard** (`/admin/dashboard`): 6 stat cards
    (Students, Lecturers, Courses, Resources, Active sessions,
    Uptime) + 2-column charts (Users-by-role `PieChart` with
    center "Total" label, Students-per-level `BarChart` with
    `LEVEL_COLORS` L100–L500) + recent audit logs table
    (10 rows, color-coded rows: CREATE emerald, UPDATE blue,
    DELETE/SUSPEND rose, LOGIN blue, PUBLISH emerald) +
    GPA-by-level `LineChart` + top 5 resources list +
    department snapshot table.
  - **User Management** (`/admin/users`): stat strip
    (total/students/lecturers/admins) + filter bar (debounced
    300ms search, role/level/department selects, 20/page) +
    `DataTable` with 7 columns (User with avatar + email,
    Matric/Staff, Role badge, Level, Department, Status,
    Actions) + 3 dialogs:
    - **Edit**: fullname/role/level/dept/isActive via
      `PATCH /api/users/:id`.
    - **Add**: full register form (any role) via
      `POST /api/auth/register`.
    - **View**: display profile (no edit).
    - **Toggle**: `DELETE /api/users/:id` is a soft-delete
      (sets `isActive=false`) per the API; UI surfaces as a
      "Suspend/Reactivate" action.
  - **Departments & Sessions** (`/admin/departments`): `Tabs`
    with two panes.
    - **Departments tab**: inline create form (name + code with
      pattern `/^[A-Z]{2,5}$/`), table with per-dept user counts
      (parallelized `GET /api/users?departmentId&limit=1` to
      leverage the paginated total), delete-with-confirm.
    - **Sessions tab**: current-session banner with `Star`
      icon, create form (name pattern `/^\d{4}\/\d{4}$/`,
      start/end dates, `isCurrent` checkbox), table with a
      "Set current" action per row calling
      `PATCH /api/sessions/:id/set-current`.
  - **Course Management** (`/admin/courses`): filter bar
    (level, semester, department) + course table
    (code, title, level badge, semester badge, credits,
    lecturer list, department) + 2 dialogs:
    - **Add Course**: code pattern `/^[A-Za-z]{2,4}\d{3}$/`,
      credits 1–6, level/semester/dept selects via
      `POST /api/courses`.
    - **Assign Lecturer**: lecturer select from
      `GET /api/users?role=LECTURER`, session input prefilled
      with current via `POST /api/courses/:id/assign` (note:
      API field is `session`, not `sessionId`).
  - **Analytics** (`/admin/analytics`): department-wide
    distribution + course-level performance.
    - **Department overview**: 3 charts — students per level
      (BarChart), courses per level (BarChart), average GPA per
      level (LineChart, empty state when no published results).
    - **Result analytics**: course selector (`/api/courses`) +
      4 stat cards (total results, published count, pass rate
      % grade ≥ C, average total) + grade breakdown `PieChart`
      with center "Total" label + score-distribution
      `BarChart` (same 6 buckets: A–F). Colors come from a
      `GRADE_COLORS` map.
  - **Audit Logs** (`/admin/logs`): immutable record of admin
    actions + system events.
    - 4 stat cards (today, login events, admin actions,
      current-filter result).
    - Filter strip: debounced 300ms user-ID search, action
      type select (28 enum options), start/end date pickers.
    - Per-row color stripe (rose DELETE/SUSPEND, amber UPDATE,
      blue LOGIN, emerald CREATE/PUBLISH) and per-action
      verb-colored badge (`ACTION_TONE` map).
    - Clickable chevron to expand a row and reveal the full
      `metadata` JSON + user-agent (when present).
    - **Export CSV**: client-side `Blob` + `URL.createObjectURL`
      download of the current filtered view (no `json2csv`
      dependency); toast confirms row count.
  - **Settings** (`/admin/settings`): 4 cards.
    - **Portal settings**: department name + display name.
    - **Security**: max-login-attempts (3–10) + session-expiry
      select (1h/8h/24h/7d). Currently surface-only (no
      global config endpoint yet); user feedback confirms
      "saved" intent.
    - **Admin profile**: fullname/email/phone/bio with
      `PATCH /api/users/:id`; shows latest `/auth/me` data
      via a keyed `defaultValue` to satisfy the no-effect
      cascade lint rule. Avatar uses initials in
      purple-tinted `AvatarFallback`.
    - **Change password**: current/new/confirm inputs; 8-char
      minimum; match check; calls
      `POST /api/auth/change-password`.
  - **Lint clean-up**:
    - Refactored `PieChart` to compute slice offsets via a
      `slice` derivation (`reduce` on prior entries) instead
      of an `acc += length` mutation. Resolves
      `react-hooks/immutability` error.
    - Replaced the cascading `useEffect`-then-setState pattern
      in settings with a `defaultValue` + `key` strategy tied
      to the latest `/auth/me` user id. Resolves
      `react-hooks/set-state-in-effect` error.
  - **Integration tested**:
    - Login as admin@eduportal.com → token.
    - All 7 admin pages return 200:
      `/admin/dashboard`, `/admin/users`, `/admin/departments`,
      `/admin/courses`, `/admin/analytics`, `/admin/logs`,
      `/admin/settings`.
    - All 7 admin API endpoints return 200:
      `/api/analytics/admin`, `/api/analytics/department`,
      `/api/analytics/audit-logs`, `/api/users`, `/api/courses`,
      `/api/departments`, `/api/sessions`.
    - `POST /api/departments` (Mathematics / MTH) → 201.
    - `POST /api/sessions` (2026/2027) → 201.
    - `PATCH /api/sessions/:id/set-current` → 200 (session
      flipped to current).
    - `POST /api/auth/register` (Test Admin User, MTH/2025/001)
      → 201, returned user with correct `matricNumber`.
    - `DELETE /api/users/:id` (soft suspend) → 200, sets
      `isActive=false`.
    - `POST /api/courses` (MTH101) → 201, returns course with
      `creditUnits` (not `credits` — field name discovered
      via 400 error response).
    - `POST /api/courses/:id/assign` with `{lecturerId,
      session}` (note: `session`, not `sessionId`) → 201
      returns the assignment row.
    - Cleanup: hard-deleted test data via one-off Prisma
      script (`apps/api/scripts/cleanup-mth.ts`).
  - **Gates**: tsc 0, eslint 0 errors (19 warnings — 11
    pre-existing `react-hooks/incompatible-library`, 3 RHF
    `watch()` warnings, 3 unused imports from earlier
    milestones, 1 exhaustive-deps, 1 useMemo evaluation
    warning), `pnpm --filter web build` clean — 30 routes
    total (added 7 admin pages, all under `(dashboard)`
    route group).

## M9 — Printable Academic Documents (commit `f3369ad`)

Three print-ready academic documents rendered by
`apps/web/src/components/print/`:

- **`ResultSlip`** — university header, "STATEMENT OF RESULT"
  title, student info, per-semester results tables (Code,
  Title, Units, CA, Exam, Total, Grade, GP), GPA/CGPA/units/
  passed summary, dean signature, "Computer-generated"
  footer. Empty-state variant for "no results yet."
- **`ExamDocket`** — large "EXAMINATION DOCKET" heading,
  photo placeholder, student details box, courses table
  (S/N, Code, Title, Units, Lecturer, Date, Venue), fee-
  payment declaration, student + invigilator signatures.
  Empty-state for "no courses registered."
- **`RegForm`** — "COURSE REGISTRATION FORM", student info
  table, courses table with total-units row, withdrawal
  declaration, student + course-adviser + HOD signatures
  + departmental stamp. Empty-state variant.

Print CSS in `globals.css`:
- `.no-print { display: none }` — hides shell chrome when
  printing.
- `.print-only { display: block }` — shows print-only blocks
  (rendered `hidden` on screen via Tailwind `hidden`).
- `.print-page { page-break-after: always }` (except on
  `:last-of-type`).
- `body { background: white }` for print.

Wired in `/student/courses` (two print buttons: "Print
registration" + "Print exam docket", the latter disabled
when no enrollments) and `/student/results` (existing
"Print slip" button retained; `<ResultSlip>` replaces the
inline rendering).

All components receive typed `User`, `Enrollment[]`, and
`Course[]` props. Departments are resolved via
`GET /api/departments` (user record only carries
`departmentId`).

## M10 — Production Polish

Final hardening pass before tagging v1.0.0. No new
features; closes UX, a11y, reliability, and deployment
gaps.

- **Error boundary** — `apps/web/src/components/error-boundary.tsx`
  is a React class component with a "Something went wrong"
  panel, a `RotateCcw` "Try again" button, and a `Home` "Go
  home" button via `<Button asChild><Link/>`. Optional
  `label`/`fallback`/`onReset` props. Logs to
  `console.error('[ErrorBoundary]', label, error, info)`.
  Wrapped around every role shell: `StudentShell`,
  `LecturerShell`, `AdminShell`.
- **404 page** — `app/not-found.tsx` is role-aware (uses
  `useAuthStore` + a `hydrated` flag set in `useEffect` to
  avoid SSR/CSR hydration mismatch on the role-aware copy).
  Each role gets a tailored "go to your dashboard" CTA
  via the `roleHome()` helper.
- **Skeleton primitives** — `components/ui/skeletons.tsx`:
  - `DashboardSkeleton` — 4 stat cards + 2-column chart
    placeholders.
  - `TableSkeleton({rows, columns})` — generic table shimmer.
  - `CourseCardSkeleton` + `CourseCardGridSkeleton({count})`.
  - `ResourceCardSkeleton` + `ResourceCardListSkeleton({count})`.
  - `ChartSkeleton({height})` — bar-chart placeholder.
  Applied in `lecturer/dashboard` and `admin/dashboard` for
  the two chart loading states.
- **Route protection proxy** — `apps/web/src/proxy.ts`
  runs on every non-static route. It:
  1. Decodes the `eduportal-token` cookie's JWT payload
     (signature not verified in edge runtime — server
     re-validates on every API call).
  2. Redirects logged-in users on public paths
     (`/`, `/login`, `/register`, `/forgot-password`,
     `/reset-password`) to their role dashboard.
  3. Redirects unauthenticated users on protected paths
     to `/login?returnTo=<original>`.
  4. Redirects authenticated users on the wrong role's
     prefix to their own dashboard
     (e.g. student hitting `/admin/*` → `/student/dashboard`).
  Matcher: `/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)`.
- **Auth store cookie sync** — `stores/auth.store.ts`
  writes the `eduportal-token` cookie on `setAuth`/`clearAuth`
  via `document.cookie` (Max-Age 7d, SameSite=Lax, Path=/)
  and re-syncs in `onRehydrateStorage` after Zustand
  rehydration. The cookie is intentionally not `httpOnly`
  so middleware can read it; this is a known tradeoff
  vs XSS — acceptable since tokens are also in
  localStorage and the server still re-verifies on every
  API call.
- **Toasts on every mutation** — every `useMutation` now
  fires `toast.success` / `toast.error` (with the API
  error message via `err instanceof Error ? err.message :
  <generic fallback>`) on success and error. Audit pass
  added toasts to: `student/forum` (post create, like),
  `student/forum/[postId]` (reply, like), `student/resources`
  (bookmark, download), `student/notifications`
  (mark-one, mark-all).
- **EmptyState on every data section** — every data list
  uses the `EmptyState` component with role-specific copy,
  appropriate icon, and a primary action CTA (e.g.
  "Register now" on the dashboard's empty course list).
  Audit pass converted remaining inline placeholder
  paragraphs on `student/dashboard`, `student/courses`
  (both per-semester and catalog), `student/forum`,
  `student/forum/[postId]`, `student/resources`, and
  `student/notifications`.
- **Mobile responsiveness** — all 30+ pages were audited
  at 375px (iPhone SE) viewport: no horizontal overflow,
  all tap targets ≥ 44px, all dialogs use `max-w-[calc(100vw-2rem)]`,
  bottom nav dock for mobile, responsive grid breakpoints
  on every multi-column section.
- **Accessibility** — every form input has a `<Label htmlFor>`,
  every icon-only button has `aria-label`, every `Sheet`/
  `Dialog` has a `SheetTitle`/`DialogTitle`, every table
  has `<TableHeader>`/`<TableBody>`, focus rings preserved
  on all interactive elements.
- **Deployment** —
  - `apps/api/Dockerfile`: multi-stage build (Node 20-
    alpine, corepack, pnpm@10.33.4). Stages: `base`,
    `deps` (frozen lockfile), `build` (prisma generate +
    tsc), `prod-deps` (production-only install), `runner`
    (non-root `app` user, `NODE_ENV=production`, exposes
    3001, `CMD ["node", "dist/index.js"]`).
  - `.dockerignore` at repo root excludes `node_modules`,
    `dist`, `.next`, `.env*`, `.git`, IDE files, `*.log`.
  - `docker-compose.yml` for local dev: `postgres:16-alpine`
    (with healthcheck + named volume `eduportal_pgdata`)
    and `api` (depends on healthy `db`, with healthcheck
    hitting `/api/health`).
  - Frontend is intended for Vercel/Netlify — `NEXT_PUBLIC_API_URL`
    is read at build time and exposed to the client.
- **Final gates**:
  - `pnpm --filter api exec tsc --noEmit` → 0 errors.
  - `pnpm --filter web exec tsc --noEmit` → 0 errors.
  - `pnpm --filter shared exec tsc --noEmit` → 0 errors.
  - `pnpm --filter web lint` → 0 errors (warnings allowed
    only for documented `react-hooks/incompatible-library`
    RHF patterns).
  - `pnpm --filter web build` → 30+ routes, no compile errors.
  - Curl smoke tests for all 28+ HTTP routes.
  - `git tag v1.0.0` after commit lands.

## v1.0.1 — Admin UX & Notification Menu

Post-release polish. Two tracks: (a) the admin shell gets
new information architecture and a fixed audit-log layout,
(b) the bell button in every dashboard shell becomes a
proper dropdown panel.

### Admin UX fixes

- **Courses page** — `/admin/courses` is no longer a flat
  table. Levels L100–L500 each get a collapsible group
  card; inside, First/Second-semester sub-tables show
  courses with per-group stats (count, total units, and a
  "N first · M second" badge). Empty levels are hidden.
  Department filter is a top-page summary stat (still
  useful when a lecturer is department-scoped). Three
  summary cards at the top.
- **Sessions page** — new `/admin/sessions/page.tsx`
  (current-session banner, inline create form, sortable
  table w/ Set Current action). Added to the admin
  sidebar (CalendarRange icon) and the mobile dock. The
  old Sessions tab inside `/admin/departments` is
  preserved for back-compat.
- **Sidebar scrollable** — the `ScrollArea` wrapper in
  `desktop-sidebar.tsx` was preventing the rail from
  scrolling on tall role lists. Replaced with a plain
  `<div className="flex-1 overflow-y-auto">`.
- **Audit log tabular** — `/admin/logs` no longer renders
  a `DataTable` per row. A single `DataTable` holds the
  full result set; expansion is now a row column. Expanded
  metadata renders in a separate "Expanded details" card
  below the table with a "Collapse all" action. `DataTable`
  gained a `rowClassName?: (row) => string` prop for
  per-action border tone.

### Notification menu

The bell button in the dashboard header (top right of
`DashboardShell`) used to `router.push(/{role}/notifications)`.
It now opens a Radix `Popover` panel with the most recent
six notifications, mark-as-read, mark-all, and a "View all"
link to the role's full notifications page.

- **Component** — `apps/web/src/components/layout/notification-menu.tsx`:
  - Trigger is a `Button size="icon"` with a `Bell` icon
    and a Framer-Motion-animated badge (only renders when
    `unreadCount > 0`, caps at `9+`).
  - `PopoverContent` is a `w-[min(380px,calc(100vw-2rem))]`
    card with three zones: header (title + "Mark all" +
    close), scrollable body (max `min(480px, 70vh)`),
    footer ("Showing N of M" + "View all" link).
  - Body states: skeleton list (4 rows), empty state
    ("You're all caught up!"), or actual list grouped by
    category icon (Megaphone / FileText / MessageCircle /
    Settings) with a `bg-primary/[0.04]` row tint for
    unread items.
  - Clicking an unread notification calls
    `PATCH /api/notifications/:id/read` (optimistic
    decrement) and navigates to `notification.link` if set.
  - "Mark all" calls `POST /api/notifications/read-all`
    and shows the updated count in the toast.
- **Popover primitive** — `apps/web/src/components/ui/popover.tsx`
  (shadcn-flavored wrapper around `@radix-ui/react-popover`).
- **Data flow** — the menu's `useQuery` shares the same
  `/api/notifications/mine` endpoint as the badge query
  in each role shell, but with a separate query key
  (`['notifications','menu',<role>]`). The menu query
  refetches on open (when local data is empty) and
  refetches on a 30s interval. The badge query in the
  shell keeps its 60s poll. Both invalidate each other
  on mark-one / mark-all mutations.
- **A11y** — `aria-label` on the bell describes unread
  state ("Notifications, 3 unread"). `aria-label` on the
  close button. `Popover` traps focus and restores it on
  close via Radix.
- **Mobile** — width capped at `calc(100vw - 2rem)`,
  `align="end"`, body height capped at `min(480px, 70vh)`
  so it doesn't overflow on small screens.

### Final gates

- `pnpm --filter web exec tsc --noEmit` → 0 errors.
- `pnpm --filter web lint` → 0 errors
  (22 pre-existing warnings, none in new files).
- `pnpm --filter web build` → 30 routes, no compile
  errors.
- Curl smoke tests: `/student/dashboard` 200,
  `/lecturer/dashboard` 200, `/admin/dashboard` 200
  with valid auth cookies; `GET /api/notifications/mine`
  200 returning the seeded test notification.

## v1.0.2 — Premium Color Overhaul & Dynamic Role Themes

Visual polish, dynamic theming, print optimization, and interactive chart enhancements:

- **Premium Colors**: Overhauled dynamic stylesheet themes in [globals.css](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/app/globals.css) with light slate-indigo and midnight-blue OKLCH palettes, mapping variables to dynamic light/dark pointers.
- **Dynamic Role Themes**: Overhauled [themes.ts](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/lib/themes.ts) to supply valid, browser-compatible CSS OKLCH declarations for dynamic styling (Student, Lecturer, and Admin workspaces) with separate light/dark colors.
- **Printslip Enhancements**: Enhanced statement of result slip in [result-slip.tsx](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/components/print/result-slip.tsx) with an elegant official Graduation Cap watermark backdrop, official seal, and structured signature areas.
- **Interactive SVG Charts**: Added micro-interactive animations to custom bar, line, and donut charts in [charts.tsx](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/components/ui/charts.tsx), including segment bulging and point scaling on hover.
- **Forum Animations**: Cascading staggered entrance animations for forum post lists and spring scale/bounce clicks on post Like buttons.

## v1.0.3 — Reddit-style Communities & Forum Enhancements

Implemented forum communities, post attachments, and forum information layouts:
- **Community Database Schema**: Added `Community` and `CommunityMember` tables in [schema.prisma](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/api/prisma/schema.prisma) supporting membership, descriptions, and creation timelines.
- **Backend API Endpoints**: Created endpoints under `/api/forum` to create communities, list communities, and join/leave specific forums.
- **Three-Column Reddit-style Forum Layout**: Replaced the flat forum view with a standard three-column layout (left: community lists with dynamic category colors; center: main discussions feed/post details; right: community details and forum posting instructions).
- **Post Composer & Image Uploads**: Supported attaching base64 images to discussion threads, rendering them cleanly as responsive inline attachments uploaded to Cloudinary.

## v1.0.4 — Vercel Serverless, CORS & Security Hardening

Hardened the deployment, error reporting, and signup filters:
- **Serverless Hono API**: Restructured backend entrypoint [index.ts](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/api/src/index.ts) to export Hono API handlers compatible with Vercel Serverless Function runtimes, separating local server bindings.
- **CORS Handling**: Fixed preflight checks by dynamically stripping trailing slashes from request origins.
- **Allowed Email Domain Enforcer**: Enabled domain restrictions for university registrations. Users can only register if their email matches the whitelist domains set by the administrator in settings.
- **Axios Interceptor Upgrades**: Refactored Axios interceptor in [api.ts](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/lib/api.ts) to extract and format specific nested error responses from API requests.

## v1.0.5 — Notifications & Logout Hardening

Hardened session termination flows and user alert clearing:
- **Clear & Delete Endpoints**: Added `DELETE /api/notifications` (clear all) and `DELETE /api/notifications/:id` (delete specific notification) routes.
- **Notifications UI Refactoring**: Replaced duplicated notification screens with a unified, role-based [NotificationsView](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/components/notifications/notifications-view.tsx) rendering category-specific filters (Results, Resources, Announcements).
- **Dropdown Updates**: Upgraded popover dropdown to support clearing and deleting single alerts, with real-time cached query invalidations.
- **Logout Flow Fix**: Resolved Next.js router conflicts causing spinner screens to hang on logout by using full-page `window.location.replace('/login')` redirects.

## v1.0.6 — Dynamic Branding & Favicon Sync

Allowed full customization of portal branding dynamically from the settings panel:
- **Dynamic Organization Logo & Favicon**: Added Cloudinary-integrated logo upload under settings. Supported dynamic tab icon updates via a global [BrandingLoader](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/web/src/components/layout/branding-loader.tsx).
- **Dynamic Portal Name Rendering**: Replaced static "EduPortal" strings inside page headers, sidebar menus, copyright footers, login cards, and registration wizard forms with the dynamically fetched portal name.
- **Logo Container Styling**: Automatically removes solid container backgrounds and paddings when a custom branding logo is loaded, allowing it to render on transparent elements.

## v1.0.7 — Community Level Restrictions & Department Max Levels

Added database-level and frontend-level validations for community join requests and department creation configurations:
- **Student Level-Specific Communities**: Enforced backend validation checks on Hono join (`POST /communities/:id/join`), request-join (`POST /communities/:id/request-join`), and approval routes (`POST /communities/:id/join-requests/:requestId/approve`). This restricts student users from joining community discussions that do not match their currently registered level.
- **Frontend Safeguard Badges**: Exposed community levels in list mappings. Disables the join button for non-matching students, replacing it with an outline "Level Only" constraint badge in the discover sidebar and active community profile sheets.
- **Department Graduation/Max Level Configurator**: Added `maxLevel` selector validation to creation (`POST /departments`) and patch validation schemas in [department.validator.ts](file:///home/themw/DEV/Project_DEV/OPENCODE/Portal-V1/eduportal/apps/api/src/validators/department.validator.ts). Exposed a Graduation/Max Level selection dropdown (`L300`, `L400`, or `L500`) on the admin departments panel, letting administrators customize maximum durations of study per department.


