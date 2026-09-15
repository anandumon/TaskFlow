# TaskFlow Deployment & CI/CD Guide

TaskFlow is a high-performance, modern full-stack project and task management platform built with **Next.js 13 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase PostgreSQL**.

The application self-hosts all REST API endpoints as Next.js Serverless Route Handlers (`apps/web/src/app/api/v1/...`), requiring **zero standalone backend servers, zero Docker containers, and zero Java runtimes**.

---

## 1. Quick Deploy to Vercel (100% Free, Zero Server Maintenance)

1. Go to [Vercel](https://vercel.com) and import your repository: `https://github.com/anandumon/TaskFlow`.
2. Configure Project Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
3. Configure **Environment Variables** in Vercel:

| Variable | Value / Description | Required |
| :--- | :--- | :---: |
| `DATABASE_URL` | PostgreSQL connection pooler string (e.g. `postgresql://postgres.[REF]:[PW]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`) | **Yes** |
| `JWT_SECRET` | 256-bit string for signing authentication JWT tokens | **Yes** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (`https://dxrcfczdfstnymbeicmq.supabase.co`) | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public API key | **Yes** |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Optional |
| `MAIL_USERNAME` | Gmail address for OTP and task due alert dispatches | Optional |
| `MAIL_PASSWORD` | 16-character Gmail App Password | Optional |

4. Click **Deploy**. Vercel will deploy the complete full-stack web application in under 1 minute.

---

## 2. GitHub Actions CI/CD

The automated test and build pipeline is defined in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).
Whenever code is pushed to `main` or a pull request is opened, GitHub Actions:
1. Validates TypeScript types across the entire codebase (`tsc --noEmit`).
2. Compiles an optimized production build of the Next.js application.
3. Generates and stores deployment-ready artifacts.

---

## 3. Google OAuth & Calendar Configuration

To allow Google One-Click Sign-in and Google Calendar sync:
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**:
     - `https://your-domain.vercel.app`
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `https://your-domain.vercel.app/app/calendar/callback`
     - `https://your-domain.vercel.app/callback`
     - `http://localhost:3000/app/calendar/callback` (for local development)
3. Ensure the **Google Calendar API** is enabled under **APIs & Services** → **Library**.
