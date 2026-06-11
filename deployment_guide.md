# EduPortal Deployment Guide

This guide details the steps to deploy the EduPortal system (Backend API, Prisma PostgreSQL Database, and Next.js Frontend).

---

## System Architecture Overview

```mermaid
graph TD
    User([User Browser]) -->|Next.js App| Frontend[Frontend Page - Vercel / Netlify]
    User -->|REST Request| API[Backend API - Docker / Vercel Serverless / Railway]
    API -->|Prisma ORM| Database[(PostgreSQL Database)]
    API -->|Image Uploads| Cloudinary[(Cloudinary Service)]
```

---

## 1. Required Environment Variables

Before deploying, collect your production environment secrets.

### Backend API (`apps/api`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | Strong secret key for signing auth tokens | `generate-a-strong-random-key-here` |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | API Port | `3001` |
| `ALLOWED_ORIGINS` | Deployed Frontend URL (comma-separated if multiple) | `https://my-eduportal.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier (Required for uploads) | `my-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary integration key | `1234567890` |
| `CLOUDINARY_API_SECRET` | Cloudinary integration secret | `my-api-secret` |

### Frontend Web (`apps/web`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of your deployed Backend API | `https://my-eduportal-api.vercel.app` |

---

## 2. Deployment Option A: Self-Hosted Docker Compose (Recommended for single VPS/Server)

This builds and runs both the PostgreSQL database and the API backend directly on your server, saving hosting costs.

### Steps:

1. **Install Docker and Docker Compose** on your virtual private server (VPS).
2. **Clone the repository** onto the server.
3. **Configure environment variables**:
   Create a `.env` file at the root of the project with your secrets:
   ```bash
   POSTGRES_USER=my_db_user
   POSTGRES_PASSWORD=my_secure_db_password
   POSTGRES_DB=eduportal
   API_PORT=3001
   JWT_SECRET=super_secret_production_key_change_me
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```
4. **Deploy the backend stack**:
   Run the following command from the root folder:
   ```bash
   docker compose up -d --build
   ```
5. **Run Prisma Migrations**:
   Once the containers are up, migrate your production database schema by running:
   ```bash
   docker compose exec api npx prisma migrate deploy
   ```
   *(Optional)* Seed your database with initial users:
   ```bash
   docker compose exec api npx prisma db seed
   ```

---

## 3. Deployment Option B: Cloud Platform-as-a-Service (PaaS)

Best for scaling, ease of maintenance, and high availability.

### Step 1: Database Setup (Supabase / Neon / Render Postgres)
1. Spin up a managed PostgreSQL database (e.g., [Supabase](https://supabase.com) or [Neon](https://neon.tech)).
2. Copy the connection string. Make sure to append `?sslmode=require` if required by the cloud provider.

### Step 2: Backend API Setup (Option 1: Docker Containers - Render / Railway)
1. Connect your Github repository to the hosting platform (e.g., [Render](https://render.com)).
2. Create a new **Web Service** with the following options:
   - **Runtime**: `Docker`
   - **Docker Context**: `.` (Root of the workspace)
   - **Dockerfile Path**: `apps/api/Dockerfile`
3. Configure the environment variables in the service dashboard settings.
4. **Database migration**: 
   Add a build command or start command to auto-run migrations before launching:
   ```bash
   npx prisma migrate deploy && node dist/index.js
   ```

### Step 2: Backend API Setup (Option 2: Serverless Function - Vercel)
We have added a custom Vercel Serverless Function adapter at `apps/api/api/index.ts` and `apps/api/vercel.json` to enable zero-config serverless hosting for Hono.
1. Create a new project on [Vercel](https://vercel.com) and import your Git repository.
2. Configure the project settings for the **Backend API** service:
   - **Root Directory**: `apps/api`
   - **Framework Preset**: `Other`
   - **Build Command**: `npx prisma generate && tsc`
   - **Install Command**: `pnpm install`
3. Configure your Environment Variables in the project settings.
4. **Database Migration**: Since Vercel serverless environments are read-only at runtime, you cannot run prisma migration on startup inside Vercel. Instead, apply database migrations from your local development environment using the production database URL:
   ```bash
   DATABASE_URL="postgresql://your-prod-neon-database-url" pnpm --filter @eduportal/api exec prisma migrate deploy
   ```

### Step 3: Frontend Setup (Vercel / Netlify)
1. Create a new project on [Vercel](https://vercel.com).
2. Configure project directory settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install`
3. Add the build-time environment variable:
   - `NEXT_PUBLIC_API_URL` set to the deployed backend URL (e.g., `https://my-eduportal-api.vercel.app`).
4. Trigger the deployment.
